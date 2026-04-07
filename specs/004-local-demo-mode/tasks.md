# Tasks: Local Demo Mode

**Input**: Design documents from `/specs/004-local-demo-mode/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested in spec. Manual integration testing is the existing pattern.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `openclaw-factory/server/`
- **Frontend**: `openclaw-factory/src/`
- **Agents**: `openclaw-factory/agents/`
- **Scripts**: `openclaw-factory/scripts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create new directories and baseline configuration

- [x] T001 Create `openclaw-factory/scripts/` directory and `openclaw-factory/workspaces/` directory (with .gitkeep files)
- [x] T002 [P] Update `openclaw-factory/.env.example` to document that `GITHUB_TOKEN`, `NETLIFY_TOKEN`, and `SUPABASE_TOKEN` are optional with comments explaining local fallback behavior

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Add ServiceMode type and `detectServiceModes()` function to `openclaw-factory/server/lib/config.ts` — read `GITHUB_TOKEN`, `NETLIFY_TOKEN`, `SUPABASE_TOKEN` from env, return `{ git: "local"|"cloud", deploy: "local"|"cloud", database: "local"|"cloud" }`, and log each mode to console at startup
- [x] T004 [P] Extend pipeline schema in `openclaw-factory/server/db/schema.ts` — add `deploy_url` (text, default ""), `deploy_mode` (text, default "") columns to the `pipelines` table; update the `PipelineState` interface to include these fields
- [x] T005 [P] Add `GET /api/service-modes` route in `openclaw-factory/server/routes/pipeline.ts` (or a new `service-modes.ts` route file) that returns the result of `detectServiceModes()` as JSON
- [x] T006 [P] Create `openclaw-factory/scripts/generate-agent-settings.ts` — reads env tokens, writes `.claude/settings.json` for each agent (dev, deployer, reviewer, tester, architect) including only the MCP servers whose tokens are present; always includes base permissions (Read, Write, Edit, Bash, Glob, Grep); must be idempotent
- [x] T007 Update Docker entrypoint or `package.json` startup script to run `generate-agent-settings.ts` before the OpenClaw gateway starts (e.g., add a `prestart` script in `openclaw-factory/package.json` or update `openclaw-factory/docker-compose.yml` entrypoint)

**Checkpoint**: Service mode detection works, schema is migrated, settings generation produces correct output. User story implementation can begin.

---

## Phase 3: User Story 1 - Run the Factory Without Any Cloud Secrets (Priority: P1) MVP

**Goal**: Complete pipeline execution with only `ANTHROPIC_API_KEY` set — local git repos, local deploy, local SQLite database.

**Independent Test**: Start the factory with no cloud tokens, submit a task, observe the full pipeline complete with a locally served website.

### Implementation for User Story 1

- [x] T008 [P] [US1] Create `openclaw-factory/server/lib/local-repo.ts` — export `initLocalRepo(taskId: string): { workspacePath: string }` that creates `workspaces/{taskId}/` directory, runs `git init`, creates initial commit with README, and returns the absolute workspace path
- [x] T009 [P] [US1] Create `openclaw-factory/server/lib/local-deploy.ts` — export `LocalDeployManager` class with methods: `deploy(taskId, workspacePath): { url, port }` (runs `npm run build` then spawns `npx serve out/ -l {port}` as child process), `findAvailablePort(basePort: number): number` (TCP connect test starting at 3001), `stop(taskId): void` (kills child process), `listActive(): LocalDeployment[]`; track deployments in an in-memory Map
- [x] T010 [US1] Modify `POST /api/pipeline/start` in `openclaw-factory/server/routes/pipeline.ts` — when `detectServiceModes().git === "local"`, call `initLocalRepo(task_id)` and set `workspace_path` and `repo_name` on the pipeline state before saving
- [x] T011 [US1] Update factory agent skill file `openclaw-factory/agents/factory/skills/run-pipeline/SKILL.md` — add instructions to write a `## Service Modes` block (git, deploy, database, workspace path) to the memory file at pipeline start, and include service modes context in every `sessions_spawn()` task prompt sent to downstream agents
- [x] T012 [P] [US1] Update dev agent skill file `openclaw-factory/agents/dev/skills/coding/SKILL.md` — add a conditional section: "If `## Service Modes` shows `git: local`, use `git` CLI commands directly in the workspace directory (git checkout -b, git add, git commit) instead of GitHub MCP tools. Do NOT attempt to create a PR or push to a remote."
- [x] T013 [P] [US1] Update reviewer agent skill file `openclaw-factory/agents/reviewer/skills/code-review/SKILL.md` — add a conditional section: "If `## Service Modes` shows `git: local`, read code directly from the workspace directory and use `git diff main...HEAD` for the diff. Write review comments to the memory file under `## Code Review` instead of posting to a GitHub PR. Still output APPROVE or REQUEST_CHANGES verdict."
- [x] T014 [P] [US1] Update tester agent skill file `openclaw-factory/agents/tester/skills/test-writing/SKILL.md` — add a conditional section: "If `## Service Modes` shows `git: local`, write test files directly to the workspace directory and commit with `git add` + `git commit`. Do NOT push to a remote or reference a GitHub branch."
- [x] T015 [P] [US1] Update architect agent skill file `openclaw-factory/agents/architect/skills/architecture/SKILL.md` — add a note: "If `## Service Modes` shows `deploy: local` or `database: local`, architecture decisions should account for local constraints: apps will be served via a local static file server (not Netlify), and database will be SQLite (not Supabase/PostgreSQL). Avoid Postgres-specific features like JSONB or array columns."
- [x] T016 [US1] Update deployer agent skill file `openclaw-factory/agents/deployer/skills/deploy-checklist/SKILL.md` — add a conditional section: "If `## Service Modes` shows `deploy: local`, skip Netlify steps entirely. Instead: (1) run `npm install && npm run build` in the workspace, (2) emit a `[DEPLOY:local:{port}]` marker so the factory server can start serving. If `database: local`, skip Supabase provisioning; the app should use SQLite via `DATABASE_URL=file:./data.db`."
- [x] T017 [US1] Handle deploy events in `openclaw-factory/server/routes/events.ts` — add handlers for `deploy:local` and `deploy:cloud` event types that parse the detail JSON and call `registry.updateDeployUrl(taskId, url, mode)` to set `deploy_url` and `deploy_mode` on the pipeline state
- [x] T018 [US1] Add `updateDeployUrl(taskId, url, mode)` method to `openclaw-factory/server/lib/registry.ts` that sets `deploy_url` and `deploy_mode` on the pipeline state, persists to SQLite via `savePipeline()`, and publishes an SSE event

**Checkpoint**: Full pipeline completes in local-only mode. App is served on a local port. Dashboard shows pipeline as "done" with deploy_url populated.

---

## Phase 4: User Story 2 - View the Deployed App Locally (Priority: P2)

**Goal**: After pipeline completes in local mode, user sees the local URL in the dashboard and can click through to the running app.

**Independent Test**: Complete a pipeline in local mode, see the URL in the dashboard, click it, verify the app loads in the browser.

### Implementation for User Story 2

- [x] T019 [P] [US2] Create `openclaw-factory/src/components/deploy-status.tsx` — component that displays deployment info: shows "Local" badge with port number and clickable `http://localhost:{port}` link when `deploy_mode === "local"`, or "Cloud" badge with Netlify URL when `deploy_mode === "cloud"`, or "Pending" when neither is set
- [x] T020 [US2] Update `openclaw-factory/src/pages/pipeline.tsx` — integrate the `deploy-status` component in the pipeline detail view; fetch `deploy_url` and `deploy_mode` from the pipeline state and pass to the component
- [x] T021 [US2] Add a service modes banner to the dashboard — fetch `GET /api/service-modes` on app load in `openclaw-factory/src/pages/dashboard.tsx` and display a small indicator showing which services are local vs cloud (e.g., "Local Mode: git, deploy, database" or "Cloud Mode: all services")
- [x] T022 [US2] Wire up `LocalDeployManager.deploy()` call in the event handler — when a `deploy:local` event is received (or when the factory detects a `[DEPLOY:local:{port}]` marker from the deployer agent), call `localDeployManager.deploy(taskId, workspacePath)` in `openclaw-factory/server/index.ts` or the marker parser to actually start the local server process

**Checkpoint**: Dashboard shows local deployment URLs. Clicking the link opens the running app. Multiple local apps can run simultaneously on different ports.

---

## Phase 5: User Story 3 - Seamless Local-to-Cloud Transition (Priority: P3)

**Goal**: Adding cloud tokens and restarting switches new pipelines to cloud mode without affecting existing local pipelines.

**Independent Test**: Run a pipeline in local mode, add tokens, restart, run a new pipeline, verify it uses cloud services while the old one still shows in the dashboard.

### Implementation for User Story 3

- [x] T023 [US3] Ensure `deploy_mode` is stored per-pipeline (not global) in `openclaw-factory/server/lib/registry.ts` — verify that each pipeline's `deploy_mode` is set at deploy time based on the service mode that was active when that pipeline ran, not the current global service mode
- [x] T024 [US3] Update `openclaw-factory/src/pages/dashboard.tsx` — verify the pipeline list correctly shows mixed deploy modes (some "Local", some "Cloud") by reading each pipeline's individual `deploy_mode` field rather than the global service mode
- [x] T025 [US3] Verify `generate-agent-settings.ts` handles partial mode correctly — when only some tokens are present (e.g., `GITHUB_TOKEN` set but `NETLIFY_TOKEN` absent), the script should include GitHub MCP for relevant agents while excluding Netlify MCP from the deployer; add explicit handling and logging for each partial combination

**Checkpoint**: Dashboard shows both local and cloud pipelines. New pipelines respect current token configuration. No data loss on restart.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, documentation, and robustness improvements

- [x] T026 [P] Add port conflict handling to `openclaw-factory/server/lib/local-deploy.ts` — if assigned port is in use, auto-increment and retry up to 10 times before failing with a clear error message
- [x] T027 [P] Add cleanup logic to `LocalDeployManager` in `openclaw-factory/server/lib/local-deploy.ts` — on factory server shutdown (SIGTERM/SIGINT), kill all child processes for locally-served apps
- [x] T028 [P] Update `.env.example` at project root with clear documentation of required vs optional env vars and local fallback behavior
- [x] T029 Add startup logging to `openclaw-factory/server/index.ts` — on server start, log all three service modes using the format from quickstart.md: `[config] Service modes: git: local/cloud, deploy: local/cloud, database: local/cloud`
- [x] T030 Run quickstart.md validation — follow the quickstart guide end-to-end with no cloud tokens set, verify all steps work as documented

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — this is the MVP
- **User Story 2 (Phase 4)**: Depends on US1 (needs deploy_url populated by T017/T018)
- **User Story 3 (Phase 5)**: Depends on US1 and US2 (needs both local and cloud pipelines visible)
- **Polish (Phase 6)**: Can start after US1, but ideally after all stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 producing `deploy_url` and `deploy_mode` data — cannot be tested independently without US1
- **User Story 3 (P3)**: Depends on US1 and US2 — validates the transition between modes

### Within Each User Story

- Server-side modules (local-repo.ts, local-deploy.ts) before route handlers that use them
- Route/registry changes before agent skill file updates
- Agent skill files can be updated in parallel (different files, no conflicts)
- Dashboard changes after corresponding API/data changes

### Parallel Opportunities

- T001 and T002 can run in parallel (Setup)
- T004, T005, T006 can run in parallel (Foundational — different files)
- T008 and T009 can run in parallel (new server modules)
- T012, T013, T014, T015 can run in parallel (different agent skill files)
- T019 can run in parallel with US1 tasks (different directory — frontend vs backend)
- T026, T027, T028 can run in parallel (Polish — different files)

---

## Parallel Example: User Story 1

```bash
# After T010 (pipeline.ts) completes, launch all agent skill updates together:
Task: "T012 [P] [US1] Update dev agent SKILL.md"
Task: "T013 [P] [US1] Update reviewer agent SKILL.md"
Task: "T014 [P] [US1] Update tester agent SKILL.md"
Task: "T015 [P] [US1] Update architect agent SKILL.md"

# These two server modules have no dependencies on each other:
Task: "T008 [P] [US1] Create local-repo.ts"
Task: "T009 [P] [US1] Create local-deploy.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Start factory with no cloud tokens, run a full pipeline, verify app is served locally
5. Demo-ready with just US1

### Incremental Delivery

1. Setup + Foundational → Service mode detection works, settings generated correctly
2. Add User Story 1 → Full pipeline in local mode → Demo-ready (MVP!)
3. Add User Story 2 → Dashboard shows local URLs, clickable → Better demo experience
4. Add User Story 3 → Mixed mode support → Production-transition ready
5. Polish → Edge cases, docs, cleanup → Robust

### Single Developer Strategy

Execute phases sequentially in priority order:

1. Setup + Foundational (T001–T007)
2. US1 core: T008, T009, T010, T011 sequentially
3. US1 agent skills: T012–T016 in parallel
4. US1 wiring: T017, T018 sequentially
5. US2: T019–T022
6. US3: T023–T025
7. Polish: T026–T030

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No test tasks included — manual integration testing per existing pattern
- Agent skill file updates (T012–T016) are the highest-risk tasks — they change AI agent instructions and require careful wording to ensure agents behave correctly in both local and cloud modes
- The settings generation script (T006) is the linchpin of the architecture — if it doesn't work, agents will crash when MCP servers fail to start
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
