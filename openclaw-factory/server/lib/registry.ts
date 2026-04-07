import {
  type PipelineState,
  type Stage,
  pipelineToDict,
} from "../db/schema.js";
import { savePipeline, loadAllPipelines } from "./store.js";
import { auditLog } from "./audit.js";
import { persistAndPublish } from "../routes/events.js";

const _pipelines = new Map<string, PipelineState>();
const _pendingGates = new Map<
  string,
  { task_id: string; gate_name: string }
>();

function hydrate(): void {
  const states = loadAllPipelines();
  for (const state of states) {
    _pipelines.set(state.task_id, state);
  }
  console.log(`[registry] Hydrated: ${_pipelines.size} pipelines`);
}

function getPipeline(taskId: string): PipelineState | undefined {
  return _pipelines.get(taskId);
}

function allPipelines(): Record<string, ReturnType<typeof pipelineToDict>> {
  const result: Record<string, ReturnType<typeof pipelineToDict>> = {};
  for (const [tid, state] of _pipelines) {
    result[tid] = pipelineToDict(state);
  }
  return result;
}

function register(state: PipelineState): void {
  _pipelines.set(state.task_id, state);
}

function updateStage(
  taskId: string,
  stage: string,
  error: string = ""
): void {
  const state = _pipelines.get(taskId);
  if (!state) {
    console.warn(`[registry] updateStage: unknown task_id ${taskId}`);
    return;
  }

  state.stage = stage as Stage;
  state.error = error;
  if (stage === "done" || stage === "blocked") {
    state.has_pending_gate = false;
  }
  savePipeline(state);

  auditLog(taskId, `stage:${stage}`, error || "");
  persistAndPublish("pipeline:update", pipelineToDict(state));

  if (stage === "done") {
    persistAndPublish("pipeline:done", pipelineToDict(state));
  }
}

function updateSessionKey(taskId: string, sessionKey: string): void {
  const state = _pipelines.get(taskId);
  if (!state) return;
  state.openclaw_session_key = sessionKey;
  savePipeline(state);
}

function addPendingGate(taskId: string, gateName: string): void {
  const key = `${taskId}:${gateName}`;
  _pendingGates.set(key, { task_id: taskId, gate_name: gateName });
  const state = _pipelines.get(taskId);
  if (state) state.has_pending_gate = true;
  persistAndPublish("gate:waiting", { task_id: taskId, gate_name: gateName });
}

function removePendingGate(taskId: string, gateName: string): void {
  const key = `${taskId}:${gateName}`;
  _pendingGates.delete(key);
  const state = _pipelines.get(taskId);
  if (state) state.has_pending_gate = false;
}

function pendingGates(): Array<{ task_id: string; gate_name: string }> {
  return [..._pendingGates.values()];
}

function updateDeployUrl(
  taskId: string,
  url: string,
  mode: string
): void {
  const state = _pipelines.get(taskId);
  if (!state) {
    console.warn(`[registry] updateDeployUrl: unknown task_id ${taskId}`);
    return;
  }
  state.deploy_url = url;
  state.deploy_mode = mode;
  savePipeline(state);
  persistAndPublish("pipeline:update", pipelineToDict(state));
  console.log(`[registry] ${taskId} deploy: ${mode} → ${url}`);
}

export const registry = {
  hydrate,
  getPipeline,
  allPipelines,
  register,
  updateStage,
  updateSessionKey,
  addPendingGate,
  removePendingGate,
  pendingGates,
  updateDeployUrl,
};
