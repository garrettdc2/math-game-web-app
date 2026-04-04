const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return resp.json() as Promise<T>;
}

export interface PipelineDict {
  task_id: string;
  title: string;
  stage: string;
  error: string;
  repo_name: string;
  workspace_path: string;
  subtasks: unknown[];
  feedback: string;
  started_at: number;
  has_pending_gate: boolean;
  openclaw_session_key: string;
  elapsed: number;
  elapsed_display: string;
  stage_index: number;
}

export interface PendingGate {
  task_id: string;
  gate_name: string;
}

export function startPipeline(taskId: string, title: string, startFrom?: string) {
  return request<{ ok?: boolean; error?: string; task_id: string }>(
    "/pipeline/start",
    { method: "POST", body: JSON.stringify({ task_id: taskId, title, start_from: startFrom }) }
  );
}

export function approvePipeline(taskId: string, gateName: string, approved: boolean, feedback: string) {
  return request<{ ok?: boolean; error?: string }>(
    `/pipeline/approve/${taskId}/${gateName}`,
    { method: "POST", body: JSON.stringify({ approved, feedback }) }
  );
}

export function getPipelineStatus(taskId: string) {
  return request<PipelineDict>(`/pipeline/status/${taskId}`);
}

export function listPipelines() {
  return request<{ pipelines: Record<string, PipelineDict> }>("/pipeline/list");
}

export function getPendingGates() {
  return request<{ gates: PendingGate[] }>("/gates/pending");
}

export function abortPipeline(taskId: string) {
  return request<{ ok?: boolean }>(`/pipeline/${taskId}/abort`, { method: "POST" });
}

export function retryPipeline(taskId: string, stage: string) {
  return request<{ ok?: boolean }>(`/pipeline/${taskId}/retry/${stage}`, { method: "POST" });
}

export function getPipelineMemory(taskId: string) {
  return request<{ content: string }>(`/pipeline/${taskId}/memory`);
}

export function getPipelineLogs(taskId: string) {
  return request<{ logs: string[] }>(`/pipeline/${taskId}/logs`);
}
