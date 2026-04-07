# Data Model: Local Demo Mode

**Feature**: 004-local-demo-mode  
**Date**: 2026-04-06

## Entities

### ServiceMode (runtime, not persisted)

Determined at factory startup by checking environment variables. Passed to agents via task prompt and memory file.

| Field | Type | Description |
| ----- | ---- | ----------- |
| git | "local" \| "cloud" | Local git repo vs GitHub MCP |
| deploy | "local" \| "cloud" | Local static server vs Netlify MCP |
| database | "local" \| "cloud" | Local SQLite vs Supabase MCP |

**Detection logic**:
- `git`: "cloud" if `GITHUB_TOKEN` is set and non-empty, else "local"
- `deploy`: "cloud" if `NETLIFY_TOKEN` is set and non-empty, else "local"
- `database`: "cloud" if `SUPABASE_TOKEN` is set and non-empty, else "local"

### PipelineState (extended — persisted in SQLite)

Existing fields unchanged. New fields added:

| Field | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| deploy_url | text | "" | URL where the deployed app is accessible (Netlify URL or localhost URL) |
| deploy_mode | text | "" | "local" or "cloud" — records how this pipeline was deployed |
| workspace_path | text | "" | Filesystem path to the app workspace (already exists, now populated in local mode) |

**Note**: `repo_name` and `workspace_path` already exist in the schema but are never populated. Local mode will populate `workspace_path`. `repo_name` will be set to the local directory name (e.g., `task-123`) or the GitHub repo name in cloud mode.

### LocalDeployment (runtime, tracked in memory)

Managed by the local deployment manager (`local-deploy.ts`). Not persisted to SQLite — deployments are ephemeral.

| Field | Type | Description |
| ----- | ---- | ----------- |
| task_id | string | Pipeline task ID |
| port | number | Assigned port (e.g., 3001) |
| pid | number | Process ID of the serving process |
| workspace_path | string | Path to the app workspace |
| started_at | number | Unix timestamp when serving started |

## State Transitions

### ServiceMode Lifecycle

```
Factory Start
    │
    ├── Check GITHUB_TOKEN  → git: "local" | "cloud"
    ├── Check NETLIFY_TOKEN → deploy: "local" | "cloud"
    └── Check SUPABASE_TOKEN → database: "local" | "cloud"
    │
    ▼
Log service modes to console
    │
    ▼
Generate agent settings.json files (include/exclude MCPs)
    │
    ▼
Start OpenClaw gateway
    │
    ▼
Service modes are immutable for the lifetime of the factory process
```

### Local Pipeline Lifecycle

```
Pipeline Start (POST /api/pipeline/start)
    │
    ├── [local git mode] Create workspace dir + git init
    ├── [cloud git mode] (no change — agents create GitHub repo)
    │
    ▼
Spec → Architecture → Development
    │
    ├── [local git mode] Dev agent uses git CLI in workspace
    ├── [cloud git mode] Dev agent uses GitHub MCP
    │
    ▼
QA (Review + Test)
    │
    ├── [local git mode] Reviewer reads workspace files, writes to memory
    ├── [cloud git mode] Reviewer uses GitHub PR MCP
    │
    ▼
Deploy
    │
    ├── [local deploy mode] Build app, spawn server on port, record URL
    ├── [cloud deploy mode] Deploy to Netlify via MCP
    │
    ├── [local db mode] Set DATABASE_URL to SQLite file
    ├── [cloud db mode] Provision Supabase project via MCP
    │
    ▼
Done → deploy_url and deploy_mode written to pipeline state
```

## Relationships

- **ServiceMode → PipelineState**: ServiceMode determines which fields get populated and how.
- **PipelineState → LocalDeployment**: One-to-one. A pipeline in local deploy mode has a corresponding LocalDeployment tracked in memory.
- **LocalDeployment → OS process**: One-to-one. Each local deployment is backed by a child process (e.g., `npx serve`).

## Validation Rules

- `deploy_url` must be a valid URL (either `https://*.netlify.app` or `http://localhost:{port}`).
- `deploy_mode` must be either "local" or "cloud" (or empty string for pipelines that haven't reached deploy stage).
- Port numbers for local deployments must be in range 3001-3999.
- `workspace_path` must point to an existing directory when in local mode.
