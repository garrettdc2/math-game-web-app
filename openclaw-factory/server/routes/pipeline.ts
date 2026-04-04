import { Hono } from "hono";
import { existsSync, readFileSync, readdirSync } from "fs";
import { resolve } from "path";
import { registry } from "../lib/registry.js";
import * as openclaw from "../lib/openclaw.js";
import { savePipeline } from "../lib/store.js";
import { auditLog } from "../lib/audit.js";
import { initMemory } from "../lib/memory.js";
import { persistAndPublish } from "./events.js";
import { pipelineToDict, type PipelineState } from "../db/schema.js";
import { MEMORY_DIR, AUDIT_DIR } from "../lib/config.js";

const pipeline = new Hono();

// POST /pipeline/start
pipeline.post("/pipeline/start", async (c) => {
  const { task_id, title, start_from } = await c.req.json<{
    task_id: string;
    title: string;
    start_from?: string;
  }>();

  const state: PipelineState = {
    task_id,
    title,
    stage: (start_from as PipelineState["stage"]) || "spec",
    error: "",
    repo_name: "",
    workspace_path: "",
    subtasks: [],
    feedback: "",
    started_at: Date.now() / 1000,
    has_pending_gate: false,
    openclaw_session_key: "",
  };

  initMemory(task_id, title);
  registry.register(state);
  savePipeline(state);
  auditLog(task_id, "pipeline:created", title);
  persistAndPublish("pipeline:created", pipelineToDict(state));

  try {
    const sessionKey = await openclaw.startPipeline(task_id, title);
    if (sessionKey) {
      registry.updateSessionKey(task_id, sessionKey);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[pipeline] Failed to trigger OpenClaw: ${msg}`);
    registry.updateStage(task_id, "blocked", `OpenClaw error: ${msg}`);
    return c.json({ error: msg, task_id }, 500);
  }

  return c.json({ ok: true, task_id, starting_from: state.stage });
});

// POST /pipeline/approve/:taskId/:gateName
pipeline.post("/pipeline/approve/:taskId/:gateName", async (c) => {
  const { taskId, gateName } = c.req.param();
  const { approved = true, feedback = "" } = await c.req.json<{
    approved?: boolean;
    feedback?: string;
  }>();

  const state = registry.getPipeline(taskId);
  if (!state) return c.json({ error: `Pipeline '${taskId}' not found` }, 404);
  if (!state.openclaw_session_key) {
    return c.json({ error: `No OpenClaw session for '${taskId}'` }, 400);
  }

  try {
    await openclaw.sendApproval(
      state.openclaw_session_key,
      gateName,
      approved,
      feedback
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }

  registry.removePendingGate(taskId, gateName);
  if (feedback) state.feedback = feedback;
  savePipeline(state);

  const action = approved ? "approved" : "rejected";
  auditLog(taskId, `gate:${action}`, `${gateName}: ${feedback}`);
  persistAndPublish("gate:resolved", {
    task_id: taskId,
    gate_name: gateName,
    approved,
  });

  return c.json({ ok: true, task_id: taskId, gate: gateName, action });
});

// GET /pipeline/status/:taskId
pipeline.get("/pipeline/status/:taskId", (c) => {
  const state = registry.getPipeline(c.req.param("taskId"));
  if (!state)
    return c.json({ task_id: c.req.param("taskId"), status: "not_running" });
  return c.json(pipelineToDict(state));
});

// GET /pipeline/list
pipeline.get("/pipeline/list", (c) => {
  return c.json({ pipelines: registry.allPipelines() });
});

// GET /gates/pending
pipeline.get("/gates/pending", (c) => {
  return c.json({ gates: registry.pendingGates() });
});

// POST /pipeline/:taskId/abort
pipeline.post("/pipeline/:taskId/abort", async (c) => {
  const { taskId } = c.req.param();
  const state = registry.getPipeline(taskId);
  if (!state || state.stage === "done" || state.stage === "blocked") {
    return c.json({ error: "Pipeline not running or already finished" }, 400);
  }

  if (state.openclaw_session_key) {
    try {
      await openclaw.sendAbort(state.openclaw_session_key, taskId);
    } catch (err) {
      console.error(`[pipeline] Failed to send abort: ${err}`);
    }
  }

  registry.updateStage(taskId, "blocked", "Aborted by user");
  return c.json({ ok: true });
});

// POST /pipeline/:taskId/retry/:stage
pipeline.post("/pipeline/:taskId/retry/:stage", async (c) => {
  const { taskId, stage } = c.req.param();
  const state = registry.getPipeline(taskId);
  if (!state) return c.json({ error: "Pipeline not found" }, 404);

  state.error = "";
  state.stage = stage as PipelineState["stage"];
  state.has_pending_gate = false;
  savePipeline(state);
  persistAndPublish("pipeline:update", pipelineToDict(state));

  try {
    const sessionKey = await openclaw.startPipeline(taskId, state.title);
    if (sessionKey) registry.updateSessionKey(taskId, sessionKey);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    registry.updateStage(taskId, "blocked", `Retry failed: ${msg}`);
    return c.json({ error: msg }, 500);
  }

  return c.json({ ok: true });
});

// GET /pipeline/:taskId/memory
pipeline.get("/pipeline/:taskId/memory", (c) => {
  const memFile = resolve(MEMORY_DIR, `${c.req.param("taskId")}.md`);
  if (existsSync(memFile)) {
    return c.json({ content: readFileSync(memFile, "utf-8") });
  }
  return c.json({ content: "" });
});

// GET /pipeline/:taskId/logs
pipeline.get("/pipeline/:taskId/logs", (c) => {
  const taskId = c.req.param("taskId");
  const limit = Number(c.req.query("limit") || "100");
  const logs: string[] = [];

  if (existsSync(AUDIT_DIR)) {
    const logFiles = readdirSync(AUDIT_DIR)
      .filter((f) => f.endsWith(".log"))
      .sort()
      .reverse();

    for (const file of logFiles) {
      const lines = readFileSync(resolve(AUDIT_DIR, file), "utf-8")
        .split("\n")
        .filter((l) => l.includes(taskId));
      for (const line of lines.reverse()) {
        logs.push(line);
        if (logs.length >= limit) break;
      }
      if (logs.length >= limit) break;
    }
  }

  logs.reverse();
  return c.json({ logs });
});

export default pipeline;
