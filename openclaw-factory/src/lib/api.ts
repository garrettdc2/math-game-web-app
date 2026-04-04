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

// Analytics types
export interface AnalyticsSummary {
  total: number;
  completed: number;
  failed: number;
  active: number;
  avgCycleHours: number;
  failureRate: number;
}

export interface ThroughputDay {
  date: string;
  label: string;
  started: number;
  completed: number;
}

export interface StageDuration {
  stage: string;
  avgHours: number;
  count: number;
}

export interface FailureCategory {
  name: string;
  count: number;
  pct: number;
}

export interface EventRecord {
  seq: number;
  task_id: string;
  event_type: string;
  source: string;
  data: Record<string, unknown>;
  created_at: string;
}

export function getAnalyticsSummary() {
  return request<AnalyticsSummary>("/analytics/summary");
}

export function getAnalyticsThroughput() {
  return request<{ throughput: ThroughputDay[] }>("/analytics/throughput");
}

export function getStageDurations() {
  return request<{ durations: StageDuration[] }>("/analytics/stage-durations");
}

export function getFailureAnalysis() {
  return request<{ failures: FailureCategory[]; totalFailed: number }>("/analytics/failures");
}

export function getEventHistory(after: number = 0, limit: number = 50) {
  return request<{ events: EventRecord[]; has_more: boolean }>(`/events/history?after=${after}&limit=${limit}`);
}

export function getGatewayStatus() {
  return request<{ status: string; url: string; attemptCount: number; lastError?: string }>("/gateway/status");
}
