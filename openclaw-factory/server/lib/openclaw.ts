import { randomUUID } from "crypto";
import { OPENCLAW_BASE_URL, OPENCLAW_HOOK_TOKEN } from "./config.js";

/**
 * POST to /hooks/agent with a stable session key per task.
 * allowRequestSessionKey must be true in openclaw-config.json.
 * Kept as HTTP fallback when the GatewayClient WebSocket is unavailable.
 */
async function postHook(body: Record<string, string>): Promise<unknown> {
  const resp = await fetch(`${OPENCLAW_BASE_URL}/hooks/agent`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENCLAW_HOOK_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(`OpenClaw error ${resp.status}: ${await resp.text()}`);
  }
  return resp.json();
}

export function sessionKeyFor(taskId: string): string {
  return `hook:factory:${taskId}`;
}

export async function startPipeline(
  taskId: string,
  title: string
): Promise<string> {
  const sessionKey = sessionKeyFor(taskId);
  try {
    const { gatewayClient } = await import("../index.js");
    if (gatewayClient.status === "connected") {
      await gatewayClient.rpc("chat.send", {
        sessionKey,
        message: `Process task ${taskId}: ${title}`,
        idempotencyKey: randomUUID(),
      });
      console.log(
        `[openclaw] Pipeline started via RPC: ${taskId}, session=${sessionKey}`
      );
      return sessionKey;
    }
  } catch (err) {
    console.warn(
      `[openclaw] RPC startPipeline failed, falling back to HTTP:`,
      err
    );
  }
  // HTTP fallback
  const data = (await postHook({
    message: `Process task ${taskId}: ${title}`,
    agentId: "factory",
    sessionKey,
  })) as { runId?: string };
  console.log(
    `[openclaw] Pipeline started via HTTP: ${taskId}, session=${sessionKey}, run=${data.runId || "?"}`
  );
  return sessionKey;
}

export async function sendApproval(
  sessionKey: string,
  gateName: string,
  approved: boolean,
  feedback: string = ""
): Promise<void> {
  let message: string;
  if (approved) {
    message = `Approved: ${gateName}. Continue the pipeline.`;
    if (feedback) message += `\n\nFeedback: ${feedback}`;
  } else {
    message = `Rejected: ${gateName}.`;
    if (feedback) message += `\n\nFeedback: ${feedback}`;
  }

  try {
    const { gatewayClient } = await import("../index.js");
    if (gatewayClient.status === "connected") {
      await gatewayClient.rpc("chat.send", {
        sessionKey,
        message,
        idempotencyKey: randomUUID(),
      });
      console.log(
        `[openclaw] Approval sent via RPC: ${gateName} (${approved ? "approved" : "rejected"})`
      );
      return;
    }
  } catch (err) {
    console.warn(
      `[openclaw] RPC sendApproval failed, falling back to HTTP:`,
      err
    );
  }
  // HTTP fallback
  await postHook({ message, agentId: "factory", sessionKey });
  console.log(
    `[openclaw] Approval sent via HTTP: ${gateName} (${approved ? "approved" : "rejected"})`
  );
}

export async function sendAbort(
  sessionKey: string,
  taskId: string
): Promise<void> {
  try {
    const { gatewayClient } = await import("../index.js");
    if (gatewayClient.status === "connected") {
      await gatewayClient.rpc("chat.abort", { sessionKey });
      console.log(`[openclaw] Abort sent via RPC for ${taskId}`);
      return;
    }
  } catch (err) {
    console.warn(
      `[openclaw] RPC sendAbort failed, falling back to HTTP:`,
      err
    );
  }
  // HTTP fallback
  await postHook({
    message: `Abort the pipeline for task ${taskId}. Stop all work immediately.`,
    agentId: "factory",
    sessionKey,
  });
  console.log(`[openclaw] Abort sent via HTTP for ${taskId}`);
}

/**
 * Fetch the chat history for a session via the gateway WebSocket RPC.
 * Returns an empty array if the gateway is not connected or the RPC fails.
 */
export async function getChatHistory(
  sessionKey: string
): Promise<Array<{ role: string; content: string }>> {
  try {
    const { gatewayClient } = await import("../index.js");
    if (gatewayClient.status === "connected") {
      const result = (await gatewayClient.rpc("chat.history", {
        sessionKey,
      })) as { messages?: Array<{ role: string; content: string }> };
      return result?.messages || [];
    }
  } catch (err) {
    console.warn(`[openclaw] RPC getChatHistory failed:`, err);
  }
  return [];
}
