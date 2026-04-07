import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { pipelines, type PipelineState } from "../db/schema.js";
import { PIPELINE_DB_PATH } from "./config.js";
import { setDb, initEventsTable } from "./event-store.js";

let db: ReturnType<typeof drizzle>;

export function initDb() {
  const sqlite = new Database(PIPELINE_DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");

  db = drizzle(sqlite);

  // Share raw sqlite instance with event store
  setDb(sqlite);

  // Create table if not exists
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS pipelines (
      task_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT 'spec',
      error TEXT NOT NULL DEFAULT '',
      repo_name TEXT NOT NULL DEFAULT '',
      workspace_path TEXT NOT NULL DEFAULT '',
      subtasks TEXT NOT NULL DEFAULT '[]',
      feedback TEXT NOT NULL DEFAULT '',
      started_at REAL NOT NULL DEFAULT 0,
      has_pending_gate INTEGER NOT NULL DEFAULT 0,
      openclaw_session_key TEXT NOT NULL DEFAULT '',
      deploy_url TEXT NOT NULL DEFAULT '',
      deploy_mode TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Add deploy columns if missing (migration for existing DBs)
  try {
    sqlite.exec(`ALTER TABLE pipelines ADD COLUMN deploy_url TEXT NOT NULL DEFAULT ''`);
  } catch { /* column already exists */ }
  try {
    sqlite.exec(`ALTER TABLE pipelines ADD COLUMN deploy_mode TEXT NOT NULL DEFAULT ''`);
  } catch { /* column already exists */ }

  // Initialize events table for event persistence
  initEventsTable();
}

export function savePipeline(state: PipelineState): void {
  const now = new Date().toISOString();
  const existing = db
    .select()
    .from(pipelines)
    .where(eq(pipelines.task_id, state.task_id))
    .get();

  if (existing) {
    db.update(pipelines)
      .set({
        title: state.title,
        stage: state.stage,
        error: state.error,
        repo_name: state.repo_name,
        workspace_path: state.workspace_path,
        subtasks: JSON.stringify(state.subtasks),
        feedback: state.feedback,
        started_at: state.started_at,
        has_pending_gate: state.has_pending_gate,
        openclaw_session_key: state.openclaw_session_key,
        deploy_url: state.deploy_url,
        deploy_mode: state.deploy_mode,
        updated_at: now,
      })
      .where(eq(pipelines.task_id, state.task_id))
      .run();
  } else {
    db.insert(pipelines)
      .values({
        task_id: state.task_id,
        title: state.title,
        stage: state.stage,
        error: state.error,
        repo_name: state.repo_name,
        workspace_path: state.workspace_path,
        subtasks: JSON.stringify(state.subtasks),
        feedback: state.feedback,
        started_at: state.started_at,
        has_pending_gate: state.has_pending_gate,
        openclaw_session_key: state.openclaw_session_key,
        deploy_url: state.deploy_url,
        deploy_mode: state.deploy_mode,
        created_at: now,
        updated_at: now,
      })
      .run();
  }
}

export function loadAllPipelines(): PipelineState[] {
  const rows = db.select().from(pipelines).all();
  return rows.map((r) => ({
    task_id: r.task_id,
    title: r.title,
    stage: r.stage as PipelineState["stage"],
    error: r.error,
    repo_name: r.repo_name,
    workspace_path: r.workspace_path,
    subtasks: JSON.parse(r.subtasks),
    feedback: r.feedback,
    started_at: r.started_at,
    has_pending_gate: r.has_pending_gate,
    openclaw_session_key: r.openclaw_session_key,
    deploy_url: r.deploy_url,
    deploy_mode: r.deploy_mode,
  }));
}

export function deletePipeline(taskId: string): boolean {
  const result = db
    .delete(pipelines)
    .where(eq(pipelines.task_id, taskId))
    .run();
  return result.changes > 0;
}
