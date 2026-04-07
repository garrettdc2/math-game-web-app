# Quickstart: Persistent Local Deploy

**Feature**: 005-persistent-local-deploy

## Prerequisites

- Docker Desktop running
- Node.js 20+
- No services on ports 3001-3010, 8000, 8001, 18789

## Start the Factory

```bash
cd openclaw-factory
npm run start:dev
```

This single command:
1. Starts the OpenClaw container (gateway + deploy supervisor)
2. Starts the dashboard dev server (Vite + Hono)

Dashboard: http://localhost:8000  
Gateway: ws://localhost:18789

## Run a Pipeline

1. Open http://localhost:8000
2. Click "New Pipeline"
3. Enter a task ID and title
4. Watch the pipeline progress through stages

When the pipeline reaches the deploy stage, the deploy agent:
- Builds the app inside the container
- Writes a manifest to `/root/deploys/{task_id}.json`
- The supervisor starts the app on the next available port (3001-3010)
- Dashboard shows a "Live" badge with a clickable URL

## Verify a Local Deploy

```bash
# Check what's deployed
curl http://localhost:8001/api/deploys/health

# Open the app directly
open http://localhost:3001
```

## Stop a Deployed App

From the dashboard: click the stop button on the pipeline's deploy status.

Or via API:
```bash
curl -X POST http://localhost:8001/api/deploys/{task_id}/stop
```

## Container Restart Recovery

```bash
docker compose restart openclaw
# Wait ~60 seconds
# All previously deployed apps are back up
curl http://localhost:8001/api/deploys/health
```

## Cleanup Old Workspaces

From the dashboard: click "Clean up" on completed pipelines.

Or via API:
```bash
# Auto-clean pipelines older than 7 days
curl -X POST http://localhost:8001/api/deploys/cleanup

# Clean specific pipelines
curl -X POST http://localhost:8001/api/deploys/cleanup \
  -H "Content-Type: application/json" \
  -d '{"task_ids": ["PF-2026-001"]}'
```

## Shut Down

```bash
cd openclaw-factory
npm run docker:down  # Stops the container (deployed apps stop)
# Ctrl+C to stop the dev server
```

Deployed apps will automatically restart next time you run `npm run start:dev`.
