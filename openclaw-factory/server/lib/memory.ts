import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { MEMORY_DIR, TEMPLATE_PATH } from "./config.js";
import { auditLog } from "./audit.js";

export function initMemory(taskId: string, title: string): string {
  const path = resolve(MEMORY_DIR, `${taskId}.md`);
  if (existsSync(path)) return path;

  mkdirSync(MEMORY_DIR, { recursive: true });
  let template = "";
  if (existsSync(TEMPLATE_PATH)) {
    template = readFileSync(TEMPLATE_PATH, "utf-8");
  }
  const content = template
    .replace("{{TICKET_ID}}", taskId)
    .replace("{{TICKET_TITLE}}", title);
  writeFileSync(path, content);
  auditLog(taskId, "memory_init", path);
  return path;
}

export function readMemory(taskId: string): string {
  const path = resolve(MEMORY_DIR, `${taskId}.md`);
  if (existsSync(path)) return readFileSync(path, "utf-8");
  return "";
}

export function appendMemory(
  taskId: string,
  section: string,
  content: string
): void {
  const path = resolve(MEMORY_DIR, `${taskId}.md`);
  const ts = new Date().toISOString();
  let text = readFileSync(path, "utf-8");
  const marker = `## ${section}`;

  if (text.includes(marker)) {
    text = text.replace(
      `${marker}\n_pending_`,
      `${marker}\n_${ts}_\n\n${content}`
    );
    writeFileSync(path, text);
  } else {
    appendFileSync(path, `\n${marker}\n_${ts}_\n\n${content}\n`);
  }
  auditLog(taskId, `memory_append:${section}`, `${content.length} chars`);
}
