# Implementation Plan: Persistent Local Deploy

**Branch**: `005-persistent-local-deploy` | **Date**: 2026-04-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-persistent-local-deploy/spec.md`

## Summary

Locally deployed apps die when the deploy agent session ends because the server process is backgrounded with `&` inside the agent's shell — orphaned when the session exits. This plan introduces a **deploy supervisor** shell script inside the OpenClaw container that manages app server processes based on persistent JSON manifest files. The deploy agent writes a manifest instead of backgrounding a server; the supervisor starts, monitors, and restarts app processes. The dashboard adds health-check polling and accurate live/offline status display.

## Technical Context

**Language/Version**: TypeScript 5.8 (Node.js 20) — dashboard server + frontend; Shell (POSIX sh) — container supervisor script  
**Primary Dependencies**: Hono (HTTP), React 19 + Vite (frontend), Drizzle ORM + better-sqlite3 (DB), ws (WebSocket)  
**Storage**: SQLite (existing `pipelines.db` in named volume `dashboard-data`); JSON manifest files (new, on bind-mounted volume)  
**Testing**: Manual integration testing (existing approach — no test framework configured)  
**Target Platform**: macOS host + Docker container (OpenClaw image: `ghcr.io/openclaw/openclaw:2026.4.2`)  
**Project Type**: Web service (orchestration dashboard + agent container)  
**Performance Goals**: Apps restart within 60 seconds of container restart; health status updates within 30 seconds  
**Constraints**: Max 10 concurrent local deploys (ports 3001-3010); container has `cap_drop: ALL` with only CHOWN/SETUID/SETGID capabilities  
**Scale/Scope**: Single developer machine, 1-10 simultaneous app deployments

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution file is a blank template — no project-specific gates defined. Gate passes trivially.

**Post-Phase 1 re-check**: No violations. Architecture uses simple shell scripts and JSON files — no unnecessary abstractions, no new frameworks introduced.

## Project Structure

### Documentation (this feature)

```text
specs/005-persistent-local-deploy/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── deploy-health-api.md
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
openclaw-factory/
├── server/
│   ├── lib/
│   │   └── local-deploy.ts          # MODIFY: expand from tracker to full deployment manager
│   └── routes/
│       └── pipeline.ts              # MODIFY: add health-check + cleanup endpoints
├── src/
│   └── components/
│       └── deploy-status.tsx         # MODIFY: show live/offline badge with health state
├── agents/
│   └── deployer/
│       └── skills/
│           └── deploy-checklist/
│               └── SKILL.md          # MODIFY: write manifest instead of backgrounding
├── scripts/
│   └── deploy-supervisor.sh          # NEW: process supervisor for container
├── deploys/                          # NEW: bind-mounted manifest + log directory
│   └── .gitkeep
└── docker-compose.yml                # MODIFY: add deploys volume, update entrypoint, localhost binding
```

**Structure Decision**: Minimal additions — one new shell script, one new shared volume directory, modifications to existing files. No new services or frameworks.

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────┐
│  OpenClaw Container                                      │
│                                                          │
│  ┌──────────────┐   writes    ┌──────────────────────┐  │
│  │ Deploy Agent  │──────────→ │ /root/deploys/       │  │
│  │ (session)     │  manifest  │   {task_id}.json     │  │
│  └──────────────┘             └──────────┬───────────┘  │
│                                          │ watches       │
│                               ┌──────────▼───────────┐  │
│                               │ deploy-supervisor.sh  │  │
│                               │ (runs at startup)     │  │
│                               │ - starts app servers  │  │
│                               │ - health checks       │  │
│                               │ - auto-restart (3x)   │  │
│                               └──────────┬───────────┘  │
│                                          │ serves        │
│                               ┌──────────▼───────────┐  │
│                               │ App servers           │  │
│                               │ :3001, :3002, ...     │  │
│                               └──────────────────────┘  │
│                                                          │
├──────────────────────────── ports ────────────────────────┤
│  127.0.0.1:3001-3010, 18789                              │
└─────────────────────────────────────────────────────────┘
         ▲                              ▲
         │ WebSocket                    │ HTTP (health poll)
         │                              │
┌────────┴──────────────────────────────┴─────────────────┐
│  Dashboard Server (:8001)                                │
│                                                          │
│  local-deploy.ts                                         │
│  - polls localhost:3001-3010 health                      │
│  - updates deploy_status in registry                     │
│  - serves status to frontend via SSE                     │
└─────────────────────────────────────────────────────────┘
         ▲
         │ SSE + REST
┌────────┴─────────────────────────────────────────────────┐
│  Dashboard Frontend (:8000)                               │
│  deploy-status.tsx — live/offline/starting badge          │
└──────────────────────────────────────────────────────────┘
```

### Key Design Decisions

**1. Shell supervisor over pm2/supervisord**
- The OpenClaw container has `cap_drop: ALL` which limits what can be installed
- pm2 requires npm install inside the container (failed for acpx already)
- A POSIX sh script has zero dependencies, runs on any container
- Trade-off: less featured, but 10 apps max makes it manageable

**2. JSON manifests over database**
- Manifests live on a bind-mounted volume (readable from host and container)
- The deploy agent already has bash access — writing a JSON file is trivial
- No need to coordinate with the dashboard's SQLite (different container)
- Manifests are human-readable for debugging

**3. Dashboard-side health polling over in-container reporting**
- The dashboard already tracks deploy URLs and serves the frontend
- Polling from the dashboard (curl to localhost:PORT) is simpler than adding a reporting mechanism inside the container
- 30-second poll interval is sufficient for a demo tool

**4. Port allocation via manifest scanning**
- The deploy agent scans existing manifests in `/root/deploys/` to find the next free port
- No centralized lock needed — agents run sequentially within a pipeline, and the SKILL.md already handles port-in-use fallback
- Race condition window is tiny (two deploy agents at exact same time) and handled by the SKILL.md retry logic

### Supervisor Script Behavior

The `deploy-supervisor.sh` script:

1. **On startup**: Scans `/root/deploys/*.json` for manifests. For each, starts the app server using the recorded start command. Writes PID to the manifest.
2. **Health loop** (every 30s): For each manifest, checks if the PID is alive and the port responds to HTTP. If unhealthy:
   - Increment retry counter (stored in manifest)
   - If retries < 3: kill old process, restart
   - If retries >= 3: mark as `failed` in manifest, stop retrying
3. **Watch for new manifests**: Uses polling (every 10s) to detect new `.json` files added by deploy agents. Starts any unstarted apps.
4. **On SIGTERM**: Gracefully kills all managed app processes.

### Deploy Agent Changes

The deploy agent SKILL.md is updated so that instead of:
```bash
PORT=3001 npx next start &
```
The agent writes a manifest and the supervisor handles the process:
```bash
cat > /root/deploys/{task_id}.json << 'EOF'
{
  "task_id": "{task_id}",
  "workspace": "/root/workspace/{task_id}",
  "port": 3001,
  "start_cmd": "npx next start",
  "created_at": "2026-04-07T12:00:00Z"
}
EOF
```
The supervisor picks it up within 10 seconds and starts serving.

### Docker Compose Changes

1. **New bind mount**: `./deploys:/root/deploys` — shared manifest directory
2. **Entrypoint update**: Start `deploy-supervisor.sh` as a background process before `exec openclaw gateway`
3. **Port binding**: Change `3000-3010:3000-3010` to `127.0.0.1:3001-3010:3001-3010` (localhost only, skip 3000)

### Dashboard Changes

1. **local-deploy.ts**: Add health polling — every 30 seconds, HTTP GET to each known deploy URL. Update a `deploy_health` field: `"live"`, `"offline"`, or `"starting"`.
2. **pipeline.ts routes**: Add `GET /api/deploys/health` endpoint returning health status for all local deploys. Add `POST /api/deploys/:taskId/stop` to remove a manifest (triggering supervisor to stop the app). Add `POST /api/deploys/cleanup` for manual workspace cleanup.
3. **deploy-status.tsx**: Show colored badge (green=live, red=offline, yellow=starting) next to the deploy URL.
4. **pipeline.ts abort handler**: When aborting a pipeline with a local deploy, also call the stop endpoint to remove the manifest and free the port.

### Workspace Cleanup

- **Automatic**: Dashboard server runs a daily check. Pipelines in "done" or "blocked" state with no active deploy manifest and `started_at` older than 7 days get their workspace deleted (via `docker exec` or a cleanup manifest signal).
- **Manual**: Dashboard button calls `POST /api/deploys/cleanup` which removes specified workspaces and their manifests.

## Complexity Tracking

No constitution violations to justify — architecture uses only shell scripts and JSON files with minimal changes to existing code.
