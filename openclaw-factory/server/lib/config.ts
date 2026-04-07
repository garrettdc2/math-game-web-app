import "dotenv/config";
import { resolve } from "path";

export const MEMORY_DIR = resolve(process.env.MEMORY_DIR || "memory");
export const AUDIT_DIR = resolve(process.env.AUDIT_DIR || "audit");
export const TEMPLATE_PATH = resolve(MEMORY_DIR, "_template.md");
export const PIPELINE_DB_PATH = resolve(
  process.env.PIPELINE_DB_PATH || "pipelines.db"
);
export const DEVICE_TOKEN_PATH = resolve(
  process.env.DEVICE_TOKEN_PATH || ".openclaw-device-token"
);

export const OPENCLAW_BASE_URL =
  process.env.OPENCLAW_BASE_URL || "http://localhost:18789";
export const OPENCLAW_HOOK_TOKEN =
  process.env.OPENCLAW_HOOK_TOKEN || "factory-webhook-secret";
export const OPENCLAW_API_TOKEN =
  process.env.OPENCLAW_API_TOKEN || "factory-local-dev";

export const GITHUB_ORG = process.env.GITHUB_ORG || "varsitytutors";
export const AGENT_TIMEOUT = 1800;

// ---------------------------------------------------------------------------
// Service Mode Detection — local fallback when cloud tokens are missing
// ---------------------------------------------------------------------------

export interface ServiceModes {
  git: "local" | "cloud";
  deploy: "local" | "cloud";
  database: "local" | "cloud";
}

export function detectServiceModes(): ServiceModes {
  const modes: ServiceModes = {
    git: process.env.GITHUB_TOKEN ? "cloud" : "local",
    deploy: process.env.NETLIFY_TOKEN ? "cloud" : "local",
    database: process.env.SUPABASE_TOKEN ? "cloud" : "local",
  };
  return modes;
}

export function logServiceModes(): void {
  const modes = detectServiceModes();
  console.log(`[config] Service modes:`);
  console.log(`[config]   git:      ${modes.git}${modes.git === "local" ? " (no GITHUB_TOKEN)" : ""}`);
  console.log(`[config]   deploy:   ${modes.deploy}${modes.deploy === "local" ? " (no NETLIFY_TOKEN)" : ""}`);
  console.log(`[config]   database: ${modes.database}${modes.database === "local" ? " (no SUPABASE_TOKEN)" : ""}`);
}
