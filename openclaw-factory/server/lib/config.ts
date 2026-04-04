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
