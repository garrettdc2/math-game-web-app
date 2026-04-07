# Data Model: Persistent Local Deploy

**Feature**: 005-persistent-local-deploy  
**Date**: 2026-04-07

## Entities

### Deploy Manifest (JSON file)

A JSON file written by the deploy agent and read by the supervisor script. One file per deployment, stored at `/root/deploys/{task_id}.json`.

| Field | Type | Description |
|-------|------|-------------|
| `task_id` | string | Pipeline task ID (unique key, matches filename) |
| `workspace` | string | Absolute path to the app workspace inside container |
| `port` | number | Assigned port (3001-3010) |
| `start_cmd` | string | Command to start the server (e.g., `npx next start`) |
| `created_at` | string (ISO 8601) | When the manifest was written |
| `pid` | number \| null | Process ID of the running server (set by supervisor) |
| `status` | string | `pending` \| `running` \| `failed` \| `stopped` |
| `retries` | number | Number of restart attempts (max 3) |
| `last_check` | string (ISO 8601) \| null | Last health check timestamp |

**Lifecycle**:
```
[Agent writes manifest]
        │
        ▼
    pending ──→ running ──→ (health check fails) ──→ running (retry 1)
                   │                                       │
                   │                                       ▼
                   │                               running (retry 2)
                   │                                       │
                   │                                       ▼
                   │                               running (retry 3)
                   │                                       │
                   │                                       ▼
                   │                                    failed
                   │
                   ▼
              stopped (via abort or cleanup)
```

**Identity**: `task_id` is unique. One manifest per task. Writing a new manifest for the same `task_id` replaces the previous one.

**Deletion**: Removing the manifest file signals the supervisor to stop the process and free the port.

### Pipeline State (existing — SQLite)

Extended with deploy health tracking. No schema changes needed — `deploy_url` and `deploy_mode` already exist.

The dashboard server maintains an in-memory `deploy_health` map alongside the existing registry:

| Field | Type | Description |
|-------|------|-------------|
| `task_id` | string | Pipeline task ID (foreign key to pipeline) |
| `health` | string | `live` \| `offline` \| `starting` \| `unknown` |
| `last_checked` | number | Unix timestamp of last health poll |
| `consecutive_failures` | number | Number of consecutive failed health checks |

This is ephemeral (in-memory only) — rebuilt on dashboard server startup by polling all known deploy URLs.

### Port Allocation (derived)

Not a separate entity. Port allocation is derived by scanning manifest files:

```
occupied_ports = set of .port values from all /root/deploys/*.json
next_port = first port in [3001..3010] not in occupied_ports
```

## Relationships

```
Pipeline (SQLite)
  │
  ├── 1:0..1 ── Deploy Manifest (JSON file, inside container)
  │               Written when deploy agent completes.
  │               Absent if pipeline hasn't reached deploy stage.
  │
  └── 1:0..1 ── Deploy Health (in-memory, dashboard server)
                  Present when deploy_url is set.
                  Rebuilt on dashboard restart.
```

## Validation Rules

- `port` must be in range 3001-3010 (never 3000)
- `task_id` must match an existing pipeline in the registry
- `workspace` must be an absolute path starting with `/root/workspace/`
- `start_cmd` must not be empty
- Only one manifest per `task_id` (filename enforces this)
- Maximum 10 simultaneous manifests (one per port)
