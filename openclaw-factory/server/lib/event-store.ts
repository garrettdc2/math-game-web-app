import type Database from "better-sqlite3";
import { createHash } from "crypto";

let sqlite: Database.Database;

export function setDb(db: Database.Database): void {
  sqlite = db;
}

export function initEventsTable(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS events (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      gateway_seq INTEGER,
      idempotency_key TEXT NOT NULL UNIQUE,
      task_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      source TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_events_task_id ON events(task_id)`);
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_events_seq_task ON events(task_id, seq)`);
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_events_gateway_seq ON events(gateway_seq)`);
  // unique index on idempotency_key is enforced by the UNIQUE constraint
}

interface InsertEventParams {
  gateway_seq?: number | null;
  idempotency_key: string;
  task_id: string;
  event_type: string;
  source: string;
  data: Record<string, unknown>;
}

interface InsertResult {
  seq: number;
  duplicate: boolean;
}

const insertStmtCache = new WeakMap<Database.Database, Database.Statement>();

function getInsertStmt(): Database.Statement {
  let stmt = insertStmtCache.get(sqlite);
  if (!stmt) {
    stmt = sqlite.prepare(`
      INSERT OR IGNORE INTO events (gateway_seq, idempotency_key, task_id, event_type, source, data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertStmtCache.set(sqlite, stmt);
  }
  return stmt;
}

export function insertEvent(params: InsertEventParams): InsertResult {
  const now = new Date().toISOString();
  const stmt = getInsertStmt();
  const result = stmt.run(
    params.gateway_seq ?? null,
    params.idempotency_key,
    params.task_id,
    params.event_type,
    params.source,
    JSON.stringify(params.data),
    now
  );

  if (result.changes === 0) {
    // Duplicate — look up existing seq
    const existing = sqlite
      .prepare("SELECT seq FROM events WHERE idempotency_key = ?")
      .get(params.idempotency_key) as { seq: number } | undefined;
    return { seq: existing?.seq ?? 0, duplicate: true };
  }

  return { seq: Number(result.lastInsertRowid), duplicate: false };
}

export interface StoredEvent {
  seq: number;
  gateway_seq: number | null;
  idempotency_key: string;
  task_id: string;
  event_type: string;
  source: string;
  data: Record<string, unknown>;
  created_at: string;
}

export function queryEvents(
  after: number = 0,
  taskId?: string,
  limit: number = 500
): { events: StoredEvent[]; has_more: boolean } {
  const fetchLimit = limit + 1; // fetch one extra to detect has_more
  let rows: Array<Record<string, unknown>>;

  if (taskId) {
    rows = sqlite
      .prepare("SELECT * FROM events WHERE seq > ? AND task_id = ? ORDER BY seq ASC LIMIT ?")
      .all(after, taskId, fetchLimit) as Array<Record<string, unknown>>;
  } else {
    rows = sqlite
      .prepare("SELECT * FROM events WHERE seq > ? ORDER BY seq ASC LIMIT ?")
      .all(after, fetchLimit) as Array<Record<string, unknown>>;
  }

  const has_more = rows.length > limit;
  if (has_more) rows.pop();

  const events: StoredEvent[] = rows.map((r) => ({
    seq: r.seq as number,
    gateway_seq: r.gateway_seq as number | null,
    idempotency_key: r.idempotency_key as string,
    task_id: r.task_id as string,
    event_type: r.event_type as string,
    source: r.source as string,
    data: JSON.parse(r.data as string),
    created_at: r.created_at as string,
  }));

  return { events, has_more };
}

/** Generate an idempotency key from event fields */
export function generateIdempotencyKey(
  taskId: string,
  eventType: string,
  detail: string,
  timestampSec?: number
): string {
  const ts = timestampSec ?? Math.floor(Date.now() / 1000);
  return createHash("sha256")
    .update(`${taskId}:${eventType}:${detail}:${ts}`)
    .digest("hex");
}

/** Delete events older than the given number of days */
export function pruneEvents(olderThanDays: number = 7): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);
  const cutoffIso = cutoff.toISOString();
  const result = sqlite.prepare("DELETE FROM events WHERE created_at < ?").run(cutoffIso);
  if (result.changes > 0) {
    console.log(`[event-store] Pruned ${result.changes} events older than ${olderThanDays} days`);
  }
  return result.changes;
}
