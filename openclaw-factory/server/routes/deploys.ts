import { Hono } from "hono";
import { existsSync, unlinkSync, rmSync } from "fs";
import { resolve } from "path";
import { getAllHealth, getHealth } from "../lib/local-deploy.js";
import { registry } from "../lib/registry.js";

const DEPLOYS_DIR = resolve("deploys");

const deploys = new Hono();

// GET /deploys/health — health status for all local deployments
deploys.get("/deploys/health", (c) => {
  return c.json({ deploys: getAllHealth() });
});

// POST /deploys/:taskId/stop — stop a local deploy and remove its manifest
deploys.post("/deploys/:taskId/stop", (c) => {
  const { taskId } = c.req.param();
  const manifestPath = resolve(DEPLOYS_DIR, `${taskId}.json`);

  if (!existsSync(manifestPath)) {
    return c.json({ error: `No active deployment for ${taskId}` }, 404);
  }

  try {
    unlinkSync(manifestPath);
    console.log(`[deploys] Stopped deploy for ${taskId} (manifest removed)`);
  } catch (err) {
    console.error(`[deploys] Failed to remove manifest for ${taskId}:`, err);
    return c.json({ error: "Failed to stop deployment" }, 500);
  }

  return c.json({ ok: true, task_id: taskId });
});

// POST /deploys/cleanup — clean up old workspaces and manifests
deploys.post("/deploys/cleanup", async (c) => {
  const body = await c.req.json<{ task_ids?: string[] }>().catch(() => ({}));
  const allPipelines = Object.values(registry.allPipelines());
  const now = Date.now() / 1000;
  const sevenDays = 7 * 24 * 60 * 60;

  // Determine which pipelines to consider
  let candidates: typeof allPipelines;
  if (body.task_ids && body.task_ids.length > 0) {
    candidates = allPipelines.filter((p) => body.task_ids!.includes(p.task_id));
  } else {
    // Auto rule: done/blocked, older than 7 days
    candidates = allPipelines.filter(
      (p) =>
        (p.stage === "done" || p.stage === "blocked") &&
        p.started_at > 0 &&
        now - p.started_at > sevenDays,
    );
  }

  const cleaned: string[] = [];
  const skipped: string[] = [];
  const reasonSkipped: Record<string, string> = {};

  for (const pipeline of candidates) {
    const manifestPath = resolve(DEPLOYS_DIR, `${pipeline.task_id}.json`);
    const health = getHealth(pipeline.task_id);

    // Skip if actively running
    if (health && health.health === "live") {
      skipped.push(pipeline.task_id);
      reasonSkipped[pipeline.task_id] = "active deployment";
      continue;
    }

    // Remove manifest if exists
    if (existsSync(manifestPath)) {
      try {
        unlinkSync(manifestPath);
      } catch {
        /* ignore */
      }
    }

    // Remove workspace if exists (bind-mounted at workspaces/)
    const workspacePath = resolve("workspaces", pipeline.task_id);
    if (existsSync(workspacePath)) {
      try {
        rmSync(workspacePath, { recursive: true, force: true });
        console.log(`[deploys] Cleaned workspace: ${workspacePath}`);
      } catch (err) {
        console.error(`[deploys] Failed to clean workspace ${workspacePath}:`, err);
      }
    }

    cleaned.push(pipeline.task_id);
  }

  console.log(
    `[deploys] Cleanup: ${cleaned.length} cleaned, ${skipped.length} skipped`,
  );
  return c.json({ ok: true, cleaned, skipped, reason_skipped: reasonSkipped });
});

export default deploys;
