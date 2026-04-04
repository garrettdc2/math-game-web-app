import { mkdirSync, appendFileSync } from "fs";
import { resolve } from "path";
import { AUDIT_DIR } from "./config.js";
import { persistAndPublish } from "../routes/events.js";

export function auditLog(
  taskId: string,
  event: string,
  detail: string = ""
): void {
  mkdirSync(AUDIT_DIR, { recursive: true });
  const today = new Date().toISOString().split("T")[0];
  const ts = new Date().toISOString();
  const line = `[${ts}] ${taskId} | ${event} | ${detail}\n`;
  appendFileSync(resolve(AUDIT_DIR, `${today}.log`), line);

  persistAndPublish("stage:log", {
    task_id: taskId,
    event,
    detail,
    timestamp: ts,
  });
}
