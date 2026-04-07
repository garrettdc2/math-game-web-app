# Research: Persistent Local Deploy

**Feature**: 005-persistent-local-deploy  
**Date**: 2026-04-07

## Decision 1: Process Supervision Approach

**Decision**: POSIX shell script (`deploy-supervisor.sh`) running as a background process inside the OpenClaw container.

**Rationale**: The container has `cap_drop: ALL` with limited capabilities, which makes installing pm2 or supervisord unreliable (the acpx plugin npm install already fails with EACCES). A shell script has zero dependencies, works with any base image, and is simple enough for managing up to 10 processes. The container's `restart: unless-stopped` policy handles the supervisor's own lifecycle.

**Alternatives considered**:
- **pm2**: More featured (log management, clustering) but requires npm install inside a capability-restricted container. Installation already known to fail.
- **supervisord**: Requires Python or a separate binary. Adds complexity for 10 processes.
- **systemd**: Not available in the container (no init system).
- **Custom Node.js daemon**: Would work but adds another runtime process. Shell is lighter and already available.

## Decision 2: Deployment Configuration Storage

**Decision**: JSON manifest files in a bind-mounted `/root/deploys/` directory.

**Rationale**: The deploy agent has bash access and can trivially write a JSON file. Manifests are human-readable for debugging, persist across container restarts via bind mount, and don't require coordination with the dashboard's SQLite database (which lives in a different container). The supervisor reads manifests to know what to start.

**Alternatives considered**:
- **SQLite in shared volume**: Would require both containers to access the same database — risk of locking issues and adds Drizzle ORM dependency inside the container.
- **Environment variables**: Can't dynamically add new deployments.
- **Memory file annotations**: Already used for agent communication but not structured enough for process management.

## Decision 3: Health Check Architecture

**Decision**: Dashboard-side HTTP polling (every 30 seconds) from the host to `localhost:PORT` for each known deploy.

**Rationale**: The dashboard already tracks deploy URLs and serves the UI. Polling from outside the container gives a true end-to-end health signal (tests the full path: container → port mapping → app response). No additional software needed inside the container.

**Alternatives considered**:
- **In-container health reporter**: Supervisor could POST health to dashboard API. More complex, requires outbound HTTP from container, and doesn't verify port mapping works.
- **Docker HEALTHCHECK directive**: Only reports container health, not individual app health.
- **WebSocket push from supervisor**: Over-engineered for 30-second poll interval on a demo tool.

## Decision 4: Port Allocation Strategy

**Decision**: Deploy agent scans existing manifests in `/root/deploys/` to find the next available port in range 3001-3010.

**Rationale**: Agents run sequentially within a pipeline (one deploy agent at a time per pipeline). The deploy skill already includes port-in-use retry logic. Scanning manifests is a single `ls` + `jq` operation. No centralized lock or database coordination needed.

**Alternatives considered**:
- **Centralized port allocator API**: Adds a new endpoint and cross-container coordination. Overkill for max 10 ports.
- **Fixed port per task_id hash**: Deterministic but collisions possible with only 10 ports.
- **Port file lock (flock)**: POSIX flock would work but adds complexity for a near-zero probability race condition.

## Decision 5: Network Binding

**Decision**: Bind deployed app ports to `127.0.0.1` only (localhost). Docker compose port mapping changes from `3000-3010:3000-3010` to `127.0.0.1:3001-3010:3001-3010`.

**Rationale**: This is a local demo tool. Exposing to the network creates unnecessary attack surface. Port 3000 is excluded entirely per spec requirement FR-011.

**Alternatives considered**:
- **Keep 0.0.0.0 binding**: Allows network access but insecure for a demo tool running unvetted generated code.
- **Configurable via env var**: Adds complexity for a feature nobody has requested.

## Decision 6: Workspace Cleanup Implementation

**Decision**: Dashboard server runs a daily check. Workspaces for pipelines older than 7 days with no active deploy manifest are deleted. Manual cleanup available via dashboard button.

**Rationale**: Automatic cleanup prevents disk exhaustion without operator vigilance. 7-day retention gives operators time to inspect completed pipelines. Manual button provides immediate control. Cleanup checks the manifest directory to avoid deleting workspaces for actively-served apps.

**Alternatives considered**:
- **Immediate cleanup on pipeline completion**: Too aggressive — operator may want to inspect the workspace.
- **Manual only**: Requires operator discipline; disk fills up on neglected instances.
- **LRU eviction when disk is low**: More complex to implement and harder to predict behavior.
