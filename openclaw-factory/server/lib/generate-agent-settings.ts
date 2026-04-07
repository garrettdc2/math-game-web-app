/**
 * Generate per-agent .claude/settings.json files based on available tokens.
 * Idempotent — safe to call on every startup.
 */
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";

interface McpServer {
  command: string;
  args: string[];
  env: Record<string, string>;
}

interface AgentSettings {
  permissions: { allow: string[] };
  mcpServers: Record<string, McpServer>;
}

const BASE_PERMISSIONS = ["Read", "Write", "Edit", "Bash", "Glob", "Grep"];

const GITHUB_MCP: McpServer = {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-github"],
  env: { GITHUB_PERSONAL_ACCESS_TOKEN: "${GITHUB_TOKEN}" },
};

const NETLIFY_MCP: McpServer = {
  command: "npx",
  args: ["-y", "@netlify/mcp"],
  env: { NETLIFY_AUTH_TOKEN: "${NETLIFY_TOKEN}" },
};

const SUPABASE_MCP: McpServer = {
  command: "npx",
  args: ["-y", "@supabase/mcp-server-supabase"],
  env: { SUPABASE_ACCESS_TOKEN: "${SUPABASE_TOKEN}" },
};

const AGENTS = [
  { name: "dev", needsGithub: true, needsNetlify: false, needsSupabase: false },
  { name: "reviewer", needsGithub: true, needsNetlify: false, needsSupabase: false },
  { name: "tester", needsGithub: true, needsNetlify: false, needsSupabase: false },
  { name: "architect", needsGithub: true, needsNetlify: false, needsSupabase: false },
  { name: "deployer", needsGithub: true, needsNetlify: true, needsSupabase: true },
];

export function generateAgentSettings(agentsDir: string): void {
  if (!existsSync(agentsDir)) {
    console.log(`[settings-gen] Agents dir not found: ${agentsDir} — skipping`);
    return;
  }

  const hasGithub = !!process.env.GITHUB_TOKEN;
  const hasNetlify = !!process.env.NETLIFY_TOKEN;
  const hasSupabase = !!process.env.SUPABASE_TOKEN;

  console.log("[settings-gen] Token detection:");
  console.log(`[settings-gen]   GITHUB_TOKEN:   ${hasGithub ? "present" : "absent"}`);
  console.log(`[settings-gen]   NETLIFY_TOKEN:  ${hasNetlify ? "present" : "absent"}`);
  console.log(`[settings-gen]   SUPABASE_TOKEN: ${hasSupabase ? "present" : "absent"}`);

  for (const agent of AGENTS) {
    const agentDir = resolve(agentsDir, agent.name);
    if (!existsSync(agentDir)) continue;

    const permissions = [...BASE_PERMISSIONS];
    const mcpServers: Record<string, McpServer> = {};

    if (agent.needsGithub && hasGithub) {
      permissions.push("mcp__github__*");
      mcpServers.github = GITHUB_MCP;
    }
    if (agent.needsNetlify && hasNetlify) {
      permissions.push("mcp__netlify__*");
      mcpServers.netlify = NETLIFY_MCP;
    }
    if (agent.needsSupabase && hasSupabase) {
      permissions.push("mcp__supabase__*");
      mcpServers.supabase = SUPABASE_MCP;
    }

    const settings: AgentSettings = {
      permissions: { allow: permissions },
      mcpServers,
    };

    const settingsDir = resolve(agentDir, ".claude");
    mkdirSync(settingsDir, { recursive: true });

    const settingsPath = resolve(settingsDir, "settings.json");
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");

    const mcpNames = Object.keys(mcpServers);
    console.log(
      `[settings-gen] ${agent.name}: ${mcpNames.length > 0 ? mcpNames.join(", ") : "no MCPs (local mode)"}`
    );
  }

  console.log("[settings-gen] Done.");
}
