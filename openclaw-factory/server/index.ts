import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

import { initDb } from "./lib/store.js";
import { registry } from "./lib/registry.js";
import { savePipeline } from "./lib/store.js";
import { GatewayClient } from "./lib/gateway-client.js";
import { insertEvent, generateIdempotencyKey, pruneEvents } from "./lib/event-store.js";
import { eventBus, persistAndPublish } from "./routes/events.js";
import pipelineRoutes from "./routes/pipeline.js";
import eventRoutes from "./routes/events.js";
import healthRoutes from "./routes/health.js";
import analyticsRoutes from "./routes/analytics.js";

/**
 * Extract taskId from an OpenClaw sessionKey.
 * Format: "hook:factory:{taskId}" → "{taskId}"
 */
function taskIdFromSessionKey(sessionKey: string): string {
  const prefix = "hook:factory:";
  if (sessionKey.startsWith(prefix)) return sessionKey.slice(prefix.length);
  return "";
}

/**
 * Parse structured markers from agent output text and route to registry.
 * Same markers the dashboard-bridge hook was supposed to parse.
 */
function processAgentOutput(content: string, sessionKey: string): void {
  if (!content) return;

  // [STAGE:task-id:stageName:start]
  for (const match of content.matchAll(/\[STAGE:([\w-]+):([\w]+):start\]/g)) {
    const [, taskId, stage] = match;
    console.log(`[gateway] Detected stage marker: ${taskId} → ${stage}`);
    const state = registry.getPipeline(taskId);
    if (state) {
      if (sessionKey && !state.openclaw_session_key) {
        registry.updateSessionKey(taskId, sessionKey);
      }
      registry.updateStage(taskId, stage);
    }
  }

  // [GATE:task-id:gate_name:waiting]
  for (const match of content.matchAll(/\[GATE:([\w-]+):([\w]+):waiting\]/g)) {
    const [, taskId, gateName] = match;
    console.log(`[gateway] Detected gate marker: ${taskId} → ${gateName}`);
    const state = registry.getPipeline(taskId);
    if (state) {
      registry.addPendingGate(taskId, gateName);
      savePipeline(state);
    }
  }

  // [PIPELINE:task-id:done]
  for (const match of content.matchAll(/\[PIPELINE:([\w-]+):done\]/g)) {
    const [, taskId] = match;
    console.log(`[gateway] Detected pipeline done marker: ${taskId}`);
    registry.updateStage(taskId, "done");
  }

  // [PIPELINE:task-id:error:detail]
  for (const match of content.matchAll(/\[PIPELINE:([\w-]+):error:(.+)\]/g)) {
    const [, taskId, detail] = match;
    console.log(`[gateway] Detected pipeline error marker: ${taskId}`);
    registry.updateStage(taskId, "blocked", detail);
  }
}

const app = new Hono();

// API routes
app.route("/api", pipelineRoutes);
app.route("/api", eventRoutes);
app.route("/api", healthRoutes);
app.route("/api", analyticsRoutes);

// Serve built SPA in production
const clientDir = resolve("dist/client");
if (existsSync(clientDir)) {
  app.use("/*", serveStatic({ root: "./dist/client" }));

  // SPA fallback — serve index.html for all non-API, non-static routes
  app.get("/*", (c) => {
    const indexPath = resolve(clientDir, "index.html");
    if (existsSync(indexPath)) {
      const html = readFileSync(indexPath, "utf-8");
      return c.html(html);
    }
    return c.text("Not found", 404);
  });
}

// Initialize and start
initDb();
registry.hydrate();

// Initialize Gateway WebSocket client
export const gatewayClient = new GatewayClient({
  onEvent: (event, payload, seq) => {
    // Handle chat events — parse agent output for structured markers
    if (event === "chat") {
      const sessionKey = (payload.sessionKey as string) || "";
      const state = payload.state as string;
      const message = payload.message as Record<string, unknown> | undefined;

      // Only process final or delta states that have content
      if (message && (state === "final" || state === "delta")) {
        const contentArr = message.content as Array<{ type: string; text?: string }> | undefined;
        const text = contentArr
          ?.filter((c) => c.type === "text" && c.text)
          .map((c) => c.text)
          .join("") || (message.content as string) || "";

        if (text) {
          processAgentOutput(text, sessionKey);
        }
      }
      return;
    }

    // For non-chat events: extract task_id from payload or sessionKey
    const taskId =
      (payload.task_id as string) ||
      (payload.taskId as string) ||
      taskIdFromSessionKey((payload.sessionKey as string) || "");

    if (!taskId) {
      console.debug(`[gateway] Dropping event without task_id: ${event}`);
      return;
    }

    const eventType = event;
    const idempotencyKey = generateIdempotencyKey(
      taskId,
      eventType,
      (payload.stage as string) || (payload.gate_name as string) || ""
    );

    // Persist to event store (dedup with hook-delivered events)
    const result = insertEvent({
      gateway_seq: seq ?? null,
      idempotency_key: idempotencyKey,
      task_id: taskId,
      event_type: eventType,
      source: "websocket",
      data: payload,
    });

    // Publish to SSE EventBus only if not duplicate
    if (!result.duplicate) {
      eventBus.publish(eventType, { ...payload, seq: result.seq, gateway_seq: seq });
    }
  },
  onStatusChange: (status) => {
    eventBus.publish("gateway:status", { status });
  },
});

// Prune old events on startup and daily
pruneEvents();
setInterval(() => pruneEvents(), 24 * 60 * 60 * 1000);

gatewayClient.start().catch((err) => {
  console.error(`[factory] Gateway client start error:`, err);
});

const port = Number(process.env.PORT || 8000);
console.log(`[factory] Dashboard server starting on :${port}`);

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" });
