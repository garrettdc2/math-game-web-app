import { createHash } from "crypto";

/**
 * Dashboard bridge hook — intercepts messages from the factory orchestrator
 * and forwards structured events to the dashboard's /events/ingest endpoint.
 *
 * The factory agent emits structured markers like [STAGE:SFT-123:spec:start]
 * that this hook parses and POSTs to the dashboard API.
 *
 * OpenClaw hook event structure:
 *   type: "message"
 *   action: "received"
 *   sessionKey: string (on the event root, NOT in context)
 *   context: { content, from, channelId, ... }
 */

interface HookEvent {
  type: string;
  action: string;
  sessionKey: string;
  context: {
    content: string;
    from?: string;
    channelId?: string;
    metadata?: Record<string, unknown>;
  };
  timestamp: Date;
  messages: string[];
}

const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://host.docker.internal:8000";

function generateIdempotencyKey(taskId: string, eventType: string, detail: string): string {
  const ts = Math.floor(Date.now() / 1000);
  return createHash("sha256")
    .update(`${taskId}:${eventType}:${detail}:${ts}`)
    .digest("hex");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RETRY_DELAYS = [1000, 2000, 4000];

async function postEvent(payload: Record<string, string>): Promise<void> {
  const url = `${DASHBOARD_URL}/api/events/ingest`;

  // Generate idempotency key (T024)
  const idempotencyKey = generateIdempotencyKey(
    payload.task_id || "",
    payload.event || "",
    payload.stage || payload.gate_name || payload.detail || ""
  );
  const body = JSON.stringify({ ...payload, idempotency_key: idempotencyKey });

  console.log(`[dashboard-bridge] POST ${url}`, body);

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      console.log(`[dashboard-bridge] Response: ${res.status} ${res.statusText}`);
      return; // success
    } catch (err) {
      if (attempt < RETRY_DELAYS.length) {
        const delay = RETRY_DELAYS[attempt];
        console.warn(`[dashboard-bridge] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, err);
        await sleep(delay);
      } else {
        console.error(`[dashboard-bridge] All ${RETRY_DELAYS.length + 1} attempts failed:`, err);
      }
    }
  }
}

const handler = async (event: HookEvent): Promise<void> => {
  // Accept both message:received (inbound) and message:sent (agent responses)
  // The structured markers appear in agent responses (message:sent)
  if (event.type !== "message") return;
  if (event.action !== "received" && event.action !== "sent") return;

  const content = event.context?.content || "";
  const sessionKey = event.sessionKey || "";

  console.log(`[dashboard-bridge] Processing message (${content.length} chars, session=${sessionKey})`);

  if (!content) return;

  // Detect structured stage markers: [STAGE:SFT-123:spec:start]
  const stageMatches = content.matchAll(/\[STAGE:([\w-]+):([\w]+):start\]/g);
  for (const match of stageMatches) {
    const [, taskId, stage] = match;
    await postEvent({
      task_id: taskId,
      event: "stage:start",
      stage,
      session_key: sessionKey,
    });
  }

  // Detect structured gate markers: [GATE:SFT-123:gate_1_spec_review:waiting]
  const gateMatches = content.matchAll(/\[GATE:([\w-]+):([\w]+):waiting\]/g);
  for (const match of gateMatches) {
    const [, taskId, gateName] = match;
    await postEvent({
      task_id: taskId,
      event: "gate:waiting",
      gate_name: gateName,
      session_key: sessionKey,
    });
  }

  // Detect structured pipeline done: [PIPELINE:SFT-123:done]
  const doneMatches = content.matchAll(/\[PIPELINE:([\w-]+):done\]/g);
  for (const match of doneMatches) {
    const [, taskId] = match;
    await postEvent({
      task_id: taskId,
      event: "pipeline:done",
      session_key: sessionKey,
    });
  }

  // Detect structured error: [PIPELINE:SFT-123:error:message]
  const errorMatches = content.matchAll(/\[PIPELINE:([\w-]+):error:(.+)\]/g);
  for (const match of errorMatches) {
    const [, taskId, detail] = match;
    await postEvent({
      task_id: taskId,
      event: "pipeline:error",
      detail,
      session_key: sessionKey,
    });
  }

  // Fallback: detect natural language patterns from factory agent
  const nlGateMatch = content.match(
    /Awaiting human approval for .+ \((gate_\d+_\w+)\)/
  );
  if (nlGateMatch) {
    const taskMatch = content.match(/(SFT-\d+|TST-\d+)/);
    if (taskMatch) {
      await postEvent({
        task_id: taskMatch[1],
        event: "gate:waiting",
        gate_name: nlGateMatch[1],
        session_key: sessionKey,
      });
    }
  }

  // Fallback: pipeline complete
  const nlDoneMatch = content.match(/Pipeline complete for (SFT-\d+|TST-\d+)/);
  if (nlDoneMatch) {
    await postEvent({
      task_id: nlDoneMatch[1],
      event: "pipeline:done",
      session_key: sessionKey,
    });
  }
};

export default handler;
