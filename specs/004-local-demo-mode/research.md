# Research: Local Demo Mode

**Feature**: 004-local-demo-mode  
**Date**: 2026-04-06

## R1: How to Conditionally Configure MCP Servers Per Agent

**Decision**: Generate `.claude/settings.json` files at factory startup via a script that checks for available tokens and includes/excludes MCP server entries accordingly.

**Rationale**: The OpenClaw gateway reads agent settings from static `.claude/settings.json` files. These files use `${ENV_VAR}` placeholders that are resolved at MCP server startup. If a token is missing, the MCP server process will crash on launch, which blocks the agent. The cleanest solution is to generate these files before the gateway starts, including only the MCP servers whose tokens are present.

**Alternatives considered**:
- **Runtime detection in skill files**: Agents could try MCP tools and fall back if they fail. Rejected because: MCP server crash is noisy, agents waste time on retries, and the error messages confuse the AI.
- **Separate "local" agent definitions**: Duplicate agent configs without MCPs. Rejected because: doubles maintenance burden for 5+ agents and their skill files.
- **Wrapper MCP that silently no-ops**: Build a mock MCP server that returns empty results. Rejected because: over-engineered for demo use case, and agents would still try to use MCP tools that semantically don't apply (e.g., "create GitHub PR" when there's no GitHub).

## R2: How Agents Detect They Are in Local Mode

**Decision**: The factory orchestrator passes a `SERVICE_MODES` block in the task prompt when spawning each agent. This block is also written to the shared memory file (`/root/memory/{task_id}.md`) so all agents can read it.

**Rationale**: Agents already receive context via their task prompt and the shared memory file. Adding a structured block like:

```
## Service Modes
- git: local (workspace: /workspaces/{task_id})
- deploy: local (serve on available port)
- database: local (SQLite at /workspaces/{task_id}/data.db)
```

...is the simplest integration. Agents read this to adjust their behavior. No new infrastructure needed.

**Alternatives considered**:
- **Environment variables per agent**: Set `LOCAL_MODE=true` in agent env. Rejected because: Claude Code agents read instructions from prompts/files, not env vars. The env vars would only affect MCP servers, not agent behavior.
- **Separate skill files for local mode**: Create `SKILL-local.md` variants. Rejected because: duplicates skill maintenance and requires changes to `openclaw-config.json` agent definitions.

## R3: How to Serve Apps Locally

**Decision**: Use `npx serve` (static) or `npx next start` (Next.js) spawned as child processes by the factory server, with port auto-assignment starting at port 3001.

**Rationale**: The factory server (Hono on port 8000) already runs as a long-lived Node.js process. It can spawn child processes for each deployed app. `npx serve` is zero-config for static exports, `npx next start` handles SSR apps. Port allocation is tracked in the pipeline state DB.

**Alternatives considered**:
- **Reverse proxy via factory server**: Route all apps through port 8000 with path-based routing. Rejected because: Next.js apps expect to be at root path, path rewriting breaks asset loading.
- **Docker containers per app**: Spin up containers for each deployed app. Rejected because: adds Docker dependency beyond OpenClaw, heavy for demo use case.
- **Single shared static server**: Serve all apps from one directory. Rejected because: apps have conflicting routes and asset paths.

## R4: Port Allocation Strategy

**Decision**: Start at configurable base port (default 3001), check if port is available using a TCP connect test, increment until an open port is found. Store the assigned port in the pipeline state.

**Rationale**: Simple, predictable, and handles port conflicts gracefully. The factory server tracks all active deployments and their ports. On startup, it can reclaim ports from dead processes.

**Alternatives considered**:
- **OS-assigned ports (port 0)**: Let the OS pick. Rejected because: ports are unpredictable, harder to communicate to user, and don't persist across restarts.
- **Fixed port per task_id hash**: Deterministic but collision-prone. Rejected because: harder to debug conflicts.

## R5: Local Git Repository Strategy

**Decision**: Initialize a standard (non-bare) git repository in a workspace directory (`workspaces/{task_id}/`) for each pipeline. The dev agent works directly in this directory using git CLI commands.

**Rationale**: The dev agent already writes code to a workspace directory. In cloud mode, this workspace is a clone of a GitHub repo. In local mode, it's simply a local git repo initialized in place. The agent uses `git init`, `git add`, `git commit` instead of GitHub MCP tools. No PRs are created — the reviewer reads files directly from the workspace.

**Alternatives considered**:
- **Bare repos + clone**: Init a bare repo and clone it to a workspace. Rejected because: adds unnecessary indirection for demo use case where there's only one "developer."
- **No git at all**: Just write files to a directory without version control. Rejected because: git history is useful for code review agent and provides audit trail.

## R6: Code Review Without GitHub PRs

**Decision**: In local mode, the reviewer agent reads the workspace directory directly and diffs against the initial commit (or main branch). Review comments are written to the memory file instead of GitHub PR comments.

**Rationale**: The review agent's core job is to evaluate code quality and security. It doesn't need a PR to do this — it needs access to the code and a diff. In local mode, `git diff main...HEAD` in the workspace provides the same diff a PR would. Review findings go to the memory file, which the factory orchestrator already reads to determine gate outcomes.

**Alternatives considered**:
- **Skip code review entirely in local mode**: Rejected because: code review is a key demo feature.
- **Local Gitea instance for PR emulation**: Rejected because: heavy dependency for demo mode.

## R7: Database Fallback Strategy

**Decision**: In local mode, apps use SQLite via the `better-sqlite3` package (already a project dependency) instead of Supabase/PostgreSQL. The database file is stored in the workspace directory.

**Rationale**: SQLite is already used for pipeline state. For demo apps, SQLite is sufficient and requires no additional services. The deployer agent sets `DATABASE_URL=file:./data.db` instead of a Supabase connection string.

**Alternatives considered**:
- **Local PostgreSQL in Docker**: More compatible with Supabase-targeted apps. Rejected because: adds Docker dependency beyond OpenClaw, and demo apps don't need Postgres-specific features.
- **In-memory database**: Rejected because: data doesn't persist across app restarts, even within a demo session.

## R8: Dynamic Agent Settings Generation

**Decision**: A TypeScript script (`scripts/generate-agent-settings.ts`) runs at startup (before OpenClaw gateway), reads available tokens from environment, and writes the appropriate `.claude/settings.json` for each agent. The script is idempotent and can be re-run.

**Rationale**: OpenClaw reads agent settings from static files. These files must exist before the gateway starts. A generation script is the right point to inject environment-dependent configuration. The script runs as part of the Docker entrypoint or `npm run dev` startup sequence.

**Alternatives considered**:
- **Template files with conditional sections**: Use a templating language in settings.json. Rejected because: JSON doesn't support conditionals, and OpenClaw expects plain JSON.
- **Modify OpenClaw to support optional MCPs**: Rejected because: that's an upstream change to OpenClaw, not within our control.
