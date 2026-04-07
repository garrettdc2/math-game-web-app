# Tasks: Persistent Local Deploy

**Input**: Design documents from `/specs/005-persistent-local-deploy/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create the shared directory structure and prepare the bind mount for deploy manifests.

- [x] T001 Create `openclaw-factory/deploys/` directory with `.gitkeep` for deploy manifest storage
- [x] T002 Add `deploys/` to `.gitignore` so manifests (except `.gitkeep`) are not committed in `openclaw-factory/.gitignore`

---

## Phase 2: Foundational (Docker Infrastructure)

**Purpose**: Docker compose changes that ALL user stories depend on. These change how the container is configured but don't add new application logic.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Update port mapping in `openclaw-factory/docker-compose.yml` — change `3000-3010:3000-3010` to `127.0.0.1:3001-3010:3001-3010` (localhost only, exclude port 3000)
- [x] T004 Add deploys bind mount in `openclaw-factory/docker-compose.yml` — add `./deploys:/root/deploys` volume to the `openclaw` service
- [x] T005 Update entrypoint in `openclaw-factory/docker-compose.yml` — start `deploy-supervisor.sh` as a background process before `exec openclaw gateway` (the script will be created in Phase 3)

**Checkpoint**: Docker compose ready for supervisor integration. Container can start but supervisor script doesn't exist yet.

---

## Phase 3: User Story 1 - Deployed App Stays Alive After Pipeline Completes (Priority: P1) MVP

**Goal**: Apps deployed by the factory persist after the agent session ends and survive container restarts.

**Independent Test**: Start a pipeline, wait for "done", click the deploy URL — the app loads. Restart the container with `docker compose restart openclaw`, wait 60 seconds, click the URL again — still works.

### Implementation for User Story 1

- [x] T006 [US1] Create the deploy supervisor script at `openclaw-factory/scripts/deploy-supervisor.sh` — POSIX shell script that: (1) on startup, scans `/root/deploys/*.json` for manifests with status `pending` or `running` and starts each app server using the recorded `start_cmd` on the recorded `port`; (2) writes PID and sets status to `running` in the manifest; (3) runs a health loop every 30 seconds checking if PID is alive and port responds to HTTP; (4) on health failure, increments `retries` (max 3) and restarts, or sets status to `failed`; (5) polls for new manifest files every 10 seconds; (6) on SIGTERM, gracefully kills all managed processes. Mark script as executable.

- [x] T007 [US1] Update the deploy agent skill at `openclaw-factory/agents/deployer/skills/deploy-checklist/SKILL.md` — replace the "Step 2: Start a local server" section. Instead of backgrounding a process with `&`, the agent must: (1) scan `/root/deploys/*.json` to find the next available port in 3001-3010; (2) write a manifest JSON file to `/root/deploys/{task_id}.json` with fields: `task_id`, `workspace`, `port`, `start_cmd`, `created_at`; (3) wait up to 30 seconds for the supervisor to start the process (check port with curl); (4) emit `[DEPLOY:local:PORT]` marker. Update "Step 3: Verify" to check the supervisor-started server. Remove the `&` backgrounding approach entirely.

- [x] T008 [US1] Verify the entrypoint in `openclaw-factory/docker-compose.yml` correctly starts the supervisor — test by running `docker compose up -d openclaw` and confirming the supervisor process is running inside the container with `docker exec openclaw-factory-openclaw-1 ps aux | grep supervisor`

**Checkpoint**: At this point, a pipeline can deploy an app that persists after the agent session ends and survives container restarts.

---

## Phase 4: User Story 2 - Dashboard Shows Accurate Deploy Status (Priority: P2)

**Goal**: Dashboard displays live/offline/starting status for each local deploy based on real health checks.

**Independent Test**: Deploy an app locally, confirm dashboard shows "Live" badge. Stop the process inside the container, reload dashboard — shows "Offline".

### Implementation for User Story 2

- [x] T009 [US2] Expand `openclaw-factory/server/lib/local-deploy.ts` — replace the minimal in-memory tracker with a health polling manager. Add: (1) an in-memory `Map<string, DeployHealth>` tracking `task_id`, `health` (live/offline/starting/unknown), `last_checked`, `consecutive_failures`; (2) a `startPolling()` function that runs every 30 seconds, iterates all pipelines with `deploy_mode === "local"` and `deploy_url` set, performs HTTP GET to the URL (with 5-second timeout), and updates health status; (3) a `getHealth(taskId)` function; (4) a `getAllHealth()` function returning the full map. Start polling on module import.

- [x] T010 [US2] Add deploy health API routes in `openclaw-factory/server/routes/pipeline.ts` — add `GET /api/deploys/health` endpoint that calls `getAllHealth()` from local-deploy.ts and returns the response per the contract in `contracts/deploy-health-api.md`. Wire the new routes into the Hono app in `server/index.ts`.

- [x] T011 [US2] Add `deploy_health` field to pipeline list response — in `openclaw-factory/server/routes/pipeline.ts`, modify `GET /pipeline/list` to enrich each pipeline dict with a `deploy_health` field from the health polling manager. Return `null` when deploy mode is not `"local"`.

- [x] T012 [US2] Update `openclaw-factory/src/components/deploy-status.tsx` — add a health status badge (green dot + "Live" for `live`, red dot + "Offline" for `offline`, yellow dot + "Starting" for `starting`). Fetch health from the new API endpoint or receive it via the pipeline list enrichment. Show the badge next to the deploy URL.

- [x] T013 [US2] Update `openclaw-factory/src/lib/api.ts` — add `deploy_health` to the `PipelineDict` interface (type: `string | null`). Add `getDeployHealth()` function calling `GET /api/deploys/health`.

**Checkpoint**: Dashboard shows real-time live/offline status for all local deploys.

---

## Phase 5: User Story 3 - Multiple Apps Without Port Conflicts (Priority: P2)

**Goal**: Parallel pipelines each get unique ports; no collisions.

**Independent Test**: Start three pipelines that deploy locally. All three get different ports and all three URLs work.

### Implementation for User Story 3

- [x] T014 [US3] Port allocation is already handled by the SKILL.md changes in T007 (scan manifests for next free port). Verify the logic works by placing two dummy manifest files in `openclaw-factory/deploys/` with ports 3001 and 3002, starting a pipeline, and confirming the deploy agent picks port 3003.

- [x] T015 [US3] Add a "no ports available" error path to `openclaw-factory/agents/deployer/skills/deploy-checklist/SKILL.md` — if all ports 3001-3010 are occupied in manifests, the deploy agent should emit `[PIPELINE:{task_id}:error:No deploy ports available (3001-3010 all occupied)]` and stop.

**Checkpoint**: Parallel deploys get unique ports; max 10 slots enforced with clear error.

---

## Phase 6: User Story 4 - One-Command Startup (Priority: P3)

**Goal**: `npm run start:dev` starts Docker + dev servers in one command.

**Independent Test**: From clean state, run command. Dashboard at localhost:8000 loads, gateway connected.

### Implementation for User Story 4

- [x] T016 [US4] Verify `npm run start:dev` in `openclaw-factory/package.json` works end-to-end — the `docker:up`, `docker:down`, and `start:dev` scripts were added earlier this session. Test that: (1) from clean state, `npm run start:dev` brings up the container and dev servers; (2) running it again when already running does not duplicate containers; (3) `npm run docker:down` cleanly stops everything.

**Checkpoint**: Single command startup confirmed working.

---

## Phase 7: User Story 5 - Workspace Cleanup (Priority: P3)

**Goal**: Old workspaces are cleaned up automatically after 7 days and manually on demand. Aborting a pipeline stops its deploy.

**Independent Test**: Complete 5 pipelines. Trigger cleanup. Non-served workspaces removed; active ones preserved.

### Implementation for User Story 5

- [x] T017 [P] [US5] Add `POST /api/deploys/:taskId/stop` endpoint in `openclaw-factory/server/routes/pipeline.ts` — removes the deploy manifest file from the container (via `docker exec rm /root/deploys/{taskId}.json` or by writing to the bind-mounted `deploys/` directory on the host). Returns `{ ok: true }` or 404 per contract.

- [x] T018 [P] [US5] Add `POST /api/deploys/cleanup` endpoint in `openclaw-factory/server/routes/pipeline.ts` — accepts optional `{ task_ids }` body. If no task_ids, applies 7-day auto-cleanup rule: finds pipelines in "done" or "blocked" state with `started_at` older than 7 days and no running deploy (check manifest status). For each, removes workspace directory (via bind mount or docker exec) and manifest file. Returns cleaned/skipped lists per contract.

- [x] T019 [US5] Integrate abort with deploy stop — in the existing `POST /pipeline/:taskId/abort` handler in `openclaw-factory/server/routes/pipeline.ts`, add logic: if the pipeline has `deploy_mode === "local"` and a deploy manifest exists, remove the manifest (same as the stop endpoint) to free the port.

- [x] T020 [US5] Add daily auto-cleanup timer in `openclaw-factory/server/index.ts` — on server startup, schedule a `setInterval` that runs every 24 hours and calls the same cleanup logic as `POST /api/deploys/cleanup` with no task_ids (7-day auto rule). Log results.

- [x] T021 [US5] Add cleanup button to dashboard — in `openclaw-factory/src/pages/dashboard.tsx` or a relevant component, add a "Clean up old workspaces" button (visible when there are completed pipelines older than 7 days). On click, call `POST /api/deploys/cleanup` and show a toast with results.

**Checkpoint**: Workspaces are cleaned up automatically and on demand. Aborting a pipeline stops its deploy.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup across all stories.

- [x] T022 Verify stale pipeline data — clean up the 7 old test pipelines (TST-1 through TST-6, PF-2026-634) from the SQLite database that were created during earlier development, either via cleanup endpoint or by resetting the DB
- [x] T023 Remove hardcoded mock values from `openclaw-factory/src/pages/dashboard.tsx` — replace the mock throughput calculation (line 617), hardcoded `"4.5"` avg time (line 619), fake "15 total slots" (line 718), and "of maximum capacity 30%" (line 725) with real computed values from the pipeline registry
- [x] T024 Run `quickstart.md` validation — follow the quickstart guide end-to-end on a clean checkout to verify all steps work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (needs deploys/ directory to exist)
- **US1 (Phase 3)**: Depends on Phase 2 — this IS the core feature
- **US2 (Phase 4)**: Depends on Phase 3 (needs working deploys to health-check)
- **US3 (Phase 5)**: Depends on Phase 3 (port allocation is part of the manifest/SKILL.md system)
- **US4 (Phase 6)**: Depends on Phase 2 only (startup command is independent of deploy logic)
- **US5 (Phase 7)**: Depends on Phase 3 (cleanup requires manifests and stop logic)
- **Polish (Phase 8)**: Depends on all desired phases being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational — no other story dependencies. **This is the MVP.**
- **US2 (P2)**: Depends on US1 (needs running deploys to poll health)
- **US3 (P2)**: Depends on US1 (port allocation uses the manifest system from US1)
- **US4 (P3)**: Independent of other stories — depends only on Foundational
- **US5 (P3)**: Depends on US1 (cleanup and abort integration need manifests)

### Within Each User Story

- Infrastructure before application logic
- Server-side before client-side
- API endpoints before frontend components

### Parallel Opportunities

- T003, T004 can run in parallel (both modify docker-compose.yml but different sections)
- T009, T013 can run in parallel (server vs client, different files)
- T017, T018 can run in parallel (different endpoints, same file but additive)
- US4 can run in parallel with US2, US3, US5 (independent)

---

## Parallel Example: User Story 2

```
# Launch server + client changes in parallel:
Task T009: "Expand local-deploy.ts with health polling" (server/lib/local-deploy.ts)
Task T013: "Add deploy_health to PipelineDict and API client" (src/lib/api.ts)

# Then sequentially:
Task T010: "Add /api/deploys/health endpoint" (server/routes/pipeline.ts)
Task T011: "Enrich pipeline list with deploy_health" (server/routes/pipeline.ts)
Task T012: "Update deploy-status.tsx badge component" (src/components/deploy-status.tsx)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational Docker changes (T003-T005)
3. Complete Phase 3: User Story 1 — supervisor + SKILL.md (T006-T008)
4. **STOP and VALIDATE**: Run a pipeline, verify app persists after agent exits, verify container restart recovery
5. This alone fixes the core bug — deployed apps no longer die

### Incremental Delivery

1. Setup + Foundational → Docker infra ready
2. US1 → Apps persist (core fix, MVP)
3. US2 → Dashboard shows live/offline (trust)
4. US3 → Parallel deploys work (scale)
5. US4 → One-command startup (DX)
6. US5 → Cleanup + abort integration (hygiene)
7. Each story adds value without breaking previous stories

---

## Notes

- No test framework is configured in this project — all validation is manual integration testing
- The supervisor script must be POSIX sh compatible (not bash) due to container constraints
- The deploy agent SKILL.md changes are the most nuanced task — the agent must write correct JSON and wait for the supervisor, not background the process itself
- Port 3000 must never be used (FR-011) — all references use 3001-3010
- The `cap_drop: ALL` constraint in Docker means no package installation inside the container
