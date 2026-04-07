# API Contract: Deploy Health & Management

**Feature**: 005-persistent-local-deploy  
**Date**: 2026-04-07

## New Endpoints

All endpoints are served by the dashboard server on `/api/`.

### GET /api/deploys/health

Returns health status for all local deployments.

**Response** (200):
```json
{
  "deploys": [
    {
      "task_id": "PF-2026-293",
      "port": 3001,
      "url": "http://localhost:3001",
      "health": "live",
      "last_checked": 1775576431
    },
    {
      "task_id": "PF-2026-634",
      "port": 3002,
      "url": "http://localhost:3002",
      "health": "offline",
      "last_checked": 1775576431
    }
  ]
}
```

`health` values: `"live"` | `"offline"` | `"starting"` | `"unknown"`

### POST /api/deploys/:taskId/stop

Stops a locally deployed app and frees its port. Removes the deploy manifest from the container.

**Response** (200):
```json
{ "ok": true, "task_id": "PF-2026-293" }
```

**Response** (404):
```json
{ "error": "No active deployment for PF-2026-293" }
```

### POST /api/deploys/cleanup

Removes workspaces and deploy manifests for pipelines that are:
- In "done" or "blocked" state
- Older than 7 days (by `started_at`)
- Not currently being served (no active manifest or manifest status is `failed`/`stopped`)

**Request body** (optional):
```json
{ "task_ids": ["PF-2026-001", "PF-2026-002"] }
```
If `task_ids` is provided, only clean up those specific pipelines (still respects the "not currently served" guard). If omitted, applies the 7-day automatic rule.

**Response** (200):
```json
{
  "ok": true,
  "cleaned": ["PF-2026-001", "PF-2026-002"],
  "skipped": ["PF-2026-003"],
  "reason_skipped": { "PF-2026-003": "active deployment" }
}
```

## Modified Endpoints

### GET /api/pipeline/list

**Existing behavior**: Returns all pipelines as a dict.

**Addition**: Each pipeline dict now includes a `deploy_health` field:
```json
{
  "pipelines": {
    "PF-2026-293": {
      "task_id": "PF-2026-293",
      "deploy_url": "http://localhost:3001",
      "deploy_mode": "local",
      "deploy_health": "live",
      ...
    }
  }
}
```

`deploy_health` is `null` when no deploy URL exists or deploy mode is `"cloud"`.

### POST /api/pipeline/:taskId/abort

**Existing behavior**: Marks pipeline as blocked, sends abort to OpenClaw.

**Addition**: If the pipeline has `deploy_mode: "local"` and an active deployment, also stops the deployed app (equivalent to calling `POST /api/deploys/:taskId/stop`).

## Deploy Manifest Format (Container-side)

Not an API endpoint — this is the JSON file format the deploy agent writes inside the container at `/root/deploys/{task_id}.json`:

```json
{
  "task_id": "PF-2026-293",
  "workspace": "/root/workspace/PF-2026-293",
  "port": 3001,
  "start_cmd": "npx next start",
  "created_at": "2026-04-07T12:00:00Z"
}
```

The supervisor script adds runtime fields (`pid`, `status`, `retries`, `last_check`) after starting the process.
