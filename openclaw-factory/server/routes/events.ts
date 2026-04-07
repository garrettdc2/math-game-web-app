import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { insertEvent, generateIdempotencyKey, queryEvents } from "../lib/event-store.js";

// ---------------------------------------------------------------------------
// Event Bus — in-memory pub/sub for SSE
// ---------------------------------------------------------------------------

type Listener = (event: string, data: Record<string, unknown>) => void;

class EventBus {
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publish(event: string, data: Record<string, unknown>): void {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch {
        // ignore listener errors
      }
    }
  }
}

export const eventBus = new EventBus();

/**
 * Persist an event to SQLite, then publish to the SSE EventBus.
 * If the event is a duplicate, it is NOT re-published.
 */
export function persistAndPublish(
  eventType: string,
  data: Record<string, unknown>,
  source: string = "dashboard"
): { seq: number; duplicate: boolean } {
  const taskId = (data.task_id as string) || "";
  const detail =
    (data.stage as string) ||
    (data.gate_name as string) ||
    (data.event as string) ||
    (data.title as string) ||
    "";

  const idempotencyKey = generateIdempotencyKey(taskId, eventType, detail);

  const result = insertEvent({
    idempotency_key: idempotencyKey,
    task_id: taskId,
    event_type: eventType,
    source,
    data,
  });

  if (!result.duplicate) {
    eventBus.publish(eventType, { ...data, seq: result.seq });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const events = new Hono();

// SSE stream endpoint with Last-Event-ID catchup
events.get("/events/stream", (c) => {
  const taskId = c.req.query("task_id");
  const lastEventId = c.req.header("Last-Event-ID");

  return streamSSE(c, async (stream) => {
    // Replay missed events if Last-Event-ID is provided
    if (lastEventId && !isNaN(Number(lastEventId))) {
      const afterSeq = Number(lastEventId);
      const { events: missed } = queryEvents(afterSeq, taskId || undefined, 500);
      for (const evt of missed) {
        await stream.writeSSE({
          id: String(evt.seq),
          event: evt.event_type,
          data: JSON.stringify({ ...evt.data, seq: evt.seq, gateway_seq: evt.gateway_seq }),
        });
      }
    }

    // Subscribe to live events
    const unsubscribe = eventBus.subscribe((event, data) => {
      if (taskId && data.task_id !== taskId) return;
      const sseId = data.seq ? String(data.seq) : undefined;
      stream
        .writeSSE({
          id: sseId,
          event,
          data: JSON.stringify(data),
        })
        .catch(() => {}); // connection closed
    });

    // Immediate ping so the browser EventSource fires onopen
    await stream.writeSSE({ event: "ping", data: "{}" });

    // Keep connection alive
    const keepAlive = setInterval(() => {
      stream.writeSSE({ event: "ping", data: "{}" }).catch(() => {});
    }, 15_000);

    stream.onAbort(() => {
      unsubscribe();
      clearInterval(keepAlive);
    });

    // Block until stream closes
    await new Promise(() => {});
  });
});

// Event history endpoint for initial page load and REST catchup
events.get("/events/history", (c) => {
  const after = Number(c.req.query("after") || "0");
  const taskId = c.req.query("task_id") || undefined;
  const limit = Number(c.req.query("limit") || "500");

  const result = queryEvents(after, taskId, limit);
  return c.json(result);
});

// Gateway connection status
events.get("/gateway/status", async (c) => {
  const { gatewayClient } = await import("../index.js");
  return c.json(gatewayClient.getStatus());
});

// Event ingest — webhook from OpenClaw dashboard-bridge hook
events.post("/events/ingest", async (c) => {
  const { registry } = await import("../lib/registry.js");
  const { savePipeline } = await import("../lib/store.js");

  const body = await c.req.json<{
    task_id: string;
    event: string;
    stage?: string;
    gate_name?: string;
    session_key?: string;
    detail?: string;
    idempotency_key?: string;
  }>();

  // Generate idempotency key if not provided
  const idempotencyKey =
    body.idempotency_key ||
    generateIdempotencyKey(
      body.task_id,
      body.event,
      body.stage || body.gate_name || body.detail || ""
    );

  // Persist event with dedup
  const result = insertEvent({
    idempotency_key: idempotencyKey,
    task_id: body.task_id,
    event_type: body.event,
    source: "hook",
    data: {
      task_id: body.task_id,
      event: body.event,
      stage: body.stage,
      gate_name: body.gate_name,
      detail: body.detail,
      session_key: body.session_key,
    },
  });

  // Only update state and publish if not a duplicate
  if (!result.duplicate) {
    const state = registry.getPipeline(body.task_id);

    // Store session key if provided
    if (body.session_key && state && !state.openclaw_session_key) {
      registry.updateSessionKey(body.task_id, body.session_key);
    }

    if (body.event === "stage:start" && body.stage) {
      registry.updateStage(body.task_id, body.stage);
    } else if (body.event === "gate:waiting" && body.gate_name) {
      registry.addPendingGate(body.task_id, body.gate_name);
      if (state) savePipeline(state);
    } else if (body.event === "pipeline:done") {
      registry.updateStage(body.task_id, "done");
    } else if (body.event === "pipeline:error") {
      registry.updateStage(body.task_id, "blocked", body.detail || "Unknown error");
    } else if (body.event === "deploy:local" || body.event === "deploy:cloud") {
      try {
        const detail = body.detail ? JSON.parse(body.detail) : {};
        const url = detail.url || "";
        const mode = detail.mode || (body.event === "deploy:local" ? "local" : "cloud");
        registry.updateDeployUrl(body.task_id, url, mode);
      } catch {
        console.warn(`[events] Failed to parse deploy detail for ${body.task_id}`);
      }
    } else {
      const { auditLog } = await import("../lib/audit.js");
      auditLog(body.task_id, body.event, body.detail || "");
    }
  }

  return c.json({ ok: true, seq: result.seq, duplicate: result.duplicate });
});

export default events;
