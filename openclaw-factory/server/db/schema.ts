import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

export const pipelines = sqliteTable("pipelines", {
  task_id: text("task_id").primaryKey(),
  title: text("title").notNull(),
  stage: text("stage").notNull().default("spec"),
  error: text("error").notNull().default(""),
  repo_name: text("repo_name").notNull().default(""),
  workspace_path: text("workspace_path").notNull().default(""),
  subtasks: text("subtasks").notNull().default("[]"),
  feedback: text("feedback").notNull().default(""),
  started_at: real("started_at").notNull().default(0),
  has_pending_gate: integer("has_pending_gate", { mode: "boolean" })
    .notNull()
    .default(false),
  openclaw_session_key: text("openclaw_session_key").notNull().default(""),
  deploy_url: text("deploy_url").notNull().default(""),
  deploy_mode: text("deploy_mode").notNull().default(""),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export type PipelineRecord = typeof pipelines.$inferSelect;

export const events = sqliteTable("events", {
  seq: integer("seq").primaryKey({ autoIncrement: true }),
  gateway_seq: integer("gateway_seq"),
  idempotency_key: text("idempotency_key").notNull().unique(),
  task_id: text("task_id").notNull(),
  event_type: text("event_type").notNull(),
  source: text("source").notNull(), // "websocket" or "hook"
  data: text("data").notNull(), // JSON string
  created_at: text("created_at").notNull(),
});

export type EventRecord = typeof events.$inferSelect;

// Stage constants
export const STAGES = [
  "spec",
  "architecture",
  "development",
  "qa",
  "deploy",
] as const;
export type ActiveStage = (typeof STAGES)[number];
export type Stage = ActiveStage | "done" | "blocked";

export const STAGE_LABELS: Record<string, string> = {
  spec: "Spec",
  architecture: "Architecture",
  development: "Development",
  qa: "QA",
  deploy: "Deploy",
  done: "Done",
  blocked: "Blocked",
};

export interface PipelineState {
  task_id: string;
  title: string;
  stage: Stage;
  error: string;
  repo_name: string;
  workspace_path: string;
  subtasks: unknown[];
  feedback: string;
  started_at: number;
  has_pending_gate: boolean;
  openclaw_session_key: string;
  deploy_url: string;
  deploy_mode: string;
}

export function stageIndex(stage: string): number {
  const idx = (STAGES as readonly string[]).indexOf(stage);
  if (idx >= 0) return idx;
  return stage === "done" ? STAGES.length : -1;
}

export function elapsedDisplay(startedAt: number): string {
  const s = Math.floor((Date.now() / 1000 - startedAt));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

export function pipelineToDict(state: PipelineState) {
  const elapsed = Math.floor(Date.now() / 1000 - state.started_at);
  return {
    ...state,
    elapsed,
    elapsed_display: elapsedDisplay(state.started_at),
    stage_index: stageIndex(state.stage),
  };
}
