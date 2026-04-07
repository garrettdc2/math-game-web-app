# Feature Specification: Persistent Local Deploy

**Feature Branch**: `005-persistent-local-deploy`  
**Created**: 2026-04-07  
**Status**: Draft  
**Input**: User description: "Plan to get local deploy mode working. Deployed apps should persist after agent sessions end, server process must survive inside the OpenClaw container, ports should be properly exposed, and the dashboard should reflect accurate deploy status. Also fix other gaps: port conflict management, stale URL detection, workspace cleanup."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deployed App Stays Alive After Pipeline Completes (Priority: P1)

An operator kicks off a pipeline in local demo mode. The factory agents build the app and deploy it inside the OpenClaw container. After the deploy agent session ends and the pipeline reaches "done", the operator clicks the deploy URL on the dashboard and sees the running application in their browser.

**Why this priority**: This is the core value proposition of local demo mode. Without it, every deployed app is a dead link — the feature is completely broken.

**Independent Test**: Start a pipeline, wait for it to reach "done", then open the deploy URL in a browser. The app should load. Wait 10 minutes and try again — it should still load.

**Acceptance Scenarios**:

1. **Given** a pipeline has completed with a local deploy, **When** the operator clicks the deploy URL on the dashboard, **Then** the application loads in their browser.
2. **Given** a locally deployed app is running, **When** the OpenClaw container restarts (e.g., `docker compose restart openclaw`), **Then** the deployed app automatically starts serving again on its assigned port.
3. **Given** a locally deployed app is running, **When** the operator waits 24 hours without interaction, **Then** the app is still accessible at its deploy URL.

---

### User Story 2 - Dashboard Shows Accurate Deploy Status (Priority: P2)

An operator views the dashboard and sees deploy status indicators that reflect reality. If a deployed app is actually running, the status shows "Live". If the process has died or was never started, the status shows "Offline" — not a stale link that goes nowhere.

**Why this priority**: Without truthful status indicators, operators lose trust in the system and waste time clicking dead links.

**Independent Test**: Deploy an app locally, confirm dashboard shows "Live". Then manually stop the app process inside the container, reload the dashboard, and confirm it shows "Offline".

**Acceptance Scenarios**:

1. **Given** a locally deployed app is running on its assigned port, **When** the operator views the pipeline on the dashboard, **Then** the deploy status shows the app is live with a clickable URL.
2. **Given** a locally deployed app's process has crashed or been stopped, **When** the operator views the pipeline on the dashboard, **Then** the deploy status indicates the app is offline.
3. **Given** a pipeline has completed but the deploy step was skipped or failed, **When** the operator views the pipeline, **Then** no deploy URL is shown and the status says "Deploy pending" or "Deploy failed".

---

### User Story 3 - Multiple Apps Run Simultaneously Without Port Conflicts (Priority: P2)

An operator runs three pipelines in parallel. Each pipeline deploys its app on a different port. All three apps are accessible simultaneously without one clobbering another.

**Why this priority**: The factory's value is running multiple pipelines. If parallel deploys conflict, only one app works at a time — defeating the purpose of the factory.

**Independent Test**: Start three pipelines that each deploy locally. Confirm all three have different port numbers and all three URLs load in the browser.

**Acceptance Scenarios**:

1. **Given** two pipelines are deploying concurrently, **When** both deploy agents request a port, **Then** each gets a unique port and neither conflicts.
2. **Given** ports 3001 and 3002 are occupied by previous deploys, **When** a new deploy starts, **Then** it is assigned port 3003 (the next available port).
3. **Given** the maximum number of deploy slots (10) are occupied, **When** a new deploy is attempted, **Then** the system reports an error indicating no ports are available rather than silently failing.

---

### User Story 4 - One-Command Startup (Priority: P3)

A developer clones the repo and runs a single command to start the entire local factory: the OpenClaw gateway container, the dashboard dev server, and any supporting infrastructure. No manual Docker commands, no separate terminal tabs.

**Why this priority**: Developer experience — reducing the getting-started friction from multiple commands to one.

**Independent Test**: From a clean state (no running containers or servers), run the single start command. Confirm the dashboard loads at localhost:8000 and the gateway is connected.

**Acceptance Scenarios**:

1. **Given** no services are running, **When** the operator runs the start command, **Then** the Docker container starts, the dev servers start, and the dashboard is accessible within 30 seconds.
2. **Given** the Docker container is already running, **When** the operator runs the start command again, **Then** it does not create duplicate containers or error out.

---

### User Story 5 - Workspace Cleanup for Completed Pipelines (Priority: P3)

Over time, completed pipelines accumulate workspace directories inside the container. The system provides a way to clean up old workspaces to prevent disk space exhaustion, while preserving workspaces for any app that is still being served.

**Why this priority**: Without cleanup, the container's storage grows unboundedly. Less urgent than fixing the core deploy, but necessary for sustained use.

**Independent Test**: Run 5 pipelines to completion. Trigger workspace cleanup. Confirm that workspaces for pipelines that are no longer being served are removed, while active deploys keep their workspaces.

**Acceptance Scenarios**:

1. **Given** 5 completed pipelines with local deploys, 2 of which are still being served, **When** workspace cleanup runs, **Then** the 3 workspaces not being served are removed and the 2 active ones are preserved.
2. **Given** a workspace cleanup is triggered, **When** an active deploy depends on files in its workspace, **Then** the workspace is not removed and the app continues to function.

---

### Edge Cases

- What happens when the OpenClaw container runs out of disk space mid-build?
- What happens when a deploy agent tries to start a server but `npm run build` fails?
- What happens when the container restarts while an agent session is actively building/deploying?
- What happens if two deploy agents try to claim the same port at the exact same moment?
- When a pipeline is aborted, the system stops the served app and frees the port.

## Clarifications

### Session 2026-04-07

- Q: What happens when an operator aborts a pipeline that has a locally served app? → A: Abort stops the served app and frees the port.
- Q: What should happen when a health check detects a deployed app is not responding? → A: Attempt automatic restart (up to 3 retries), then mark as offline if it keeps failing.
- Q: Should deployed apps be accessible from the local network or only from the host machine? → A: Localhost only (bind to 127.0.0.1).
- Q: How should workspace cleanup be triggered? → A: Automatic after 7 days for non-served pipelines, plus a manual dashboard button.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST keep locally deployed application servers running after the deploy agent session ends.
- **FR-002**: The system MUST automatically restart locally deployed application servers when the OpenClaw container restarts.
- **FR-003**: The system MUST assign unique ports to each local deployment, starting from port 3001 up to port 3010.
- **FR-004**: The system MUST maintain a registry of active local deployments including task ID, port, and process status.
- **FR-005**: The system MUST periodically verify that locally deployed servers are still responding. On failure, the system MUST attempt up to 3 automatic restarts before marking the deployment as offline on the dashboard.
- **FR-006**: The system MUST stop the locally deployed server and free its port when a pipeline is aborted, and when a workspace is cleaned up.
- **FR-007**: The system MUST persist deployment configuration so that apps can be restarted after a container restart without re-running the agent.
- **FR-008**: The system MUST expose locally deployed apps to the host machine through Docker port mappings (ports 3001-3010), bound to `127.0.0.1` only (not accessible from the network).
- **FR-009**: The system MUST provide a single command to start the full local development stack (Docker container + dashboard dev servers).
- **FR-010**: The system MUST automatically clean up workspaces for non-served pipelines after 7 days, and MUST provide a manual "Clean up" action on the dashboard for immediate removal.
- **FR-011**: The system MUST NOT use port 3000 for deployed apps (reserved for other uses).
- **FR-012**: The dashboard MUST display whether a locally deployed app is actually reachable, not just whether a URL was saved.

### Key Entities

- **Local Deployment**: Represents a running application server inside the container — includes task ID, assigned port, process ID, workspace path, startup command, and health status (live/offline/starting).
- **Deployment Manifest**: A persistent configuration file for each deployment that contains everything needed to restart the app server without re-running the agent — workspace path, build command, start command, assigned port.
- **Port Allocation Table**: Tracks which ports (3001-3010) are assigned to which deployments, preventing conflicts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A locally deployed app remains accessible for at least 72 hours after the pipeline completes, without manual intervention.
- **SC-002**: After an OpenClaw container restart, all previously deployed apps are serving again within 60 seconds.
- **SC-003**: The dashboard accurately reflects the live/offline status of every local deployment within 30 seconds of a status change.
- **SC-004**: 10 simultaneous local deployments can run without port conflicts.
- **SC-005**: A new developer can start the full local stack with a single command in under 60 seconds (excluding Docker image pull).
- **SC-006**: Workspace cleanup reclaims disk space from completed, non-served pipelines without affecting active deployments.

## Assumptions

- The OpenClaw Docker container has sufficient resources (CPU, memory, disk) to run up to 10 small web applications simultaneously.
- The OpenClaw container image includes Node.js and common build tools (npm, npx) needed to build and serve apps.
- Port range 3001-3010 is available on the host machine and not used by other services.
- The `restart: unless-stopped` Docker policy ensures the container itself stays alive, so the process supervision only needs to manage app servers *within* the container.
- Apps built by the factory are standard Node.js web applications (Next.js, Vite, or static) that can be served with `next start`, `vite preview`, or `serve`.
- The deploy agent already successfully builds the app before attempting to serve it — build failure handling is out of scope for this feature.
