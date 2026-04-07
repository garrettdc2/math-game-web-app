/**
 * Local deployment health manager.
 * Polls localhost:PORT for each known local deployment every 30 seconds.
 * Tracks live/offline/starting/unknown health status.
 */

import { registry } from "./registry.js";

export type DeployHealthStatus = "live" | "offline" | "starting" | "unknown";

export interface DeployHealth {
  task_id: string;
  port: number;
  url: string;
  health: DeployHealthStatus;
  last_checked: number; // Unix timestamp seconds
  consecutive_failures: number;
}

const healthMap = new Map<string, DeployHealth>();
let pollTimer: ReturnType<typeof setInterval> | null = null;

const POLL_INTERVAL = 30_000; // 30 seconds
const HEALTH_TIMEOUT = 5_000; // 5 second HTTP timeout

async function checkUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT);
    const resp = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    return resp.status >= 200 && resp.status < 400;
  } catch {
    return false;
  }
}

async function pollAll(): Promise<void> {
  const allPipelines = Object.values(registry.allPipelines());
  const localDeploys = allPipelines.filter(
    (p) => p.deploy_mode === "local" && p.deploy_url,
  );

  for (const pipeline of localDeploys) {
    const existing = healthMap.get(pipeline.task_id);
    const portMatch = pipeline.deploy_url.match(/:(\d+)/);
    const port = portMatch ? parseInt(portMatch[1], 10) : 0;

    const isUp = await checkUrl(pipeline.deploy_url);
    const now = Date.now() / 1000;

    if (isUp) {
      healthMap.set(pipeline.task_id, {
        task_id: pipeline.task_id,
        port,
        url: pipeline.deploy_url,
        health: "live",
        last_checked: now,
        consecutive_failures: 0,
      });
    } else {
      const failures = (existing?.consecutive_failures ?? 0) + 1;
      // If we've never seen it live and it's < 60s old, mark as "starting"
      const age = now - pipeline.started_at;
      const neverLive = !existing || existing.health !== "live";
      const health: DeployHealthStatus =
        neverLive && age < 120 ? "starting" : "offline";

      healthMap.set(pipeline.task_id, {
        task_id: pipeline.task_id,
        port,
        url: pipeline.deploy_url,
        health,
        last_checked: now,
        consecutive_failures: failures,
      });
    }
  }

  // Remove entries for pipelines that no longer have local deploys
  for (const taskId of healthMap.keys()) {
    if (!localDeploys.some((p) => p.task_id === taskId)) {
      healthMap.delete(taskId);
    }
  }
}

export function getHealth(taskId: string): DeployHealth | undefined {
  return healthMap.get(taskId);
}

export function getAllHealth(): DeployHealth[] {
  return [...healthMap.values()];
}

export function startPolling(): void {
  if (pollTimer) return;
  // Run initial poll after a short delay (let registry hydrate first)
  setTimeout(() => {
    pollAll().catch((e) => console.error("[deploy-health] Poll error:", e));
  }, 5_000);
  pollTimer = setInterval(() => {
    pollAll().catch((e) => console.error("[deploy-health] Poll error:", e));
  }, POLL_INTERVAL);
  console.log("[deploy-health] Health polling started (every 30s)");
}

export function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
