# Tasks: Reliable OpenClaw Dashboard Connection

**Input**: Design documents from `/specs/002-openclaw-reliable-connection/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Install new dependency and add configuration

- [x] T001 Add `ws` and `@types/ws` packages to openclaw-factory/package.json
- [x] T002 Add `DEVICE_TOKEN_PATH` config constant (default: `.openclaw-device-token`) in openclaw-factory/server/lib/config.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Event persistence and Gateway client — MUST complete before any user story work

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Add `events` table definition to openclaw-factory/server/db/schema.ts per data-model.md (seq auto-increment PK, gateway_seq nullable, idempotency_key unique, task_id indexed, event_type, source, data JSON, created_at)
- [x] T004 Create openclaw-factory/server/lib/event-store.ts — `initEventsTable()` to create table with indexes (idx_events_task_id, idx_events_idempotency_key unique, idx_events_seq_task, idx_events_gateway_seq), `insertEvent()` with INSERT OR IGNORE on idempotency_key returning {seq, duplicate}, `queryEvents(after, taskId?, limit?)` returning ordered events array with has_more flag
- [x] T005 Call `initEventsTable()` from `initDb()` in openclaw-factory/server/lib/store.ts
- [x] T006 Create openclaw-factory/server/lib/device-token.ts — `loadDeviceToken()` reads JSON from DEVICE_TOKEN_PATH, `saveDeviceToken(token)` writes JSON with token + issuedAt + rotatedAt, `clearDeviceToken()` deletes file. Handle file-not-found gracefully (return null).
- [x] T007 Create openclaw-factory/server/lib/gateway-client.ts — GatewayClient class with: WebSocket connection to OPENCLAW_BASE_URL (ws:// protocol), challenge-response handshake per contracts/gateway-client.md, device keypair generation (crypto.generateKeyPairSync ed25519), nonce signing, connect request with role:"operator" scopes:["operator.read","operator.approvals"], device token handling (load on start, save on hello-ok, use authDeviceToken on reconnect, fallback to OPENCLAW_API_TOKEN), seq tracking (lastGatewaySeq, gap detection), exponential backoff reconnection (1s-30s, 10 attempts), 30s WebSocket ping keepalive, tick event monitoring (90s dead threshold), event callback for received events, RPC request/response with id correlation and timeout, connection state (connected/reconnecting/disconnected) exposed as getter
- [x] T008 Wire GatewayClient into server startup in openclaw-factory/server/index.ts — instantiate after initDb()/hydrate(), pass event callback that: extracts pipeline events from Gateway frames, generates idempotency_key (sha256 of task_id+event_type+stage+timestamp), calls insertEvent() from event-store, publishes to EventBus for SSE broadcast. Start connection. Export gateway client instance for routes.

**Checkpoint**: Foundation ready — event store persists, Gateway WebSocket connects and receives events, events flow into store and SSE bus

---

## Phase 3: User Story 1 — Reliable Event Delivery (Priority: P1) MVP

**Goal**: Every pipeline event reaches the dashboard with zero loss, using OpenClaw's native `seq` fields for ordering. Events persist server-side. SSE supports catchup.

**Independent Test**: Start a pipeline, observe dashboard through full lifecycle. Every stage transition and gate appears within 5 seconds. Open dashboard after pipeline started — see full history.

### Implementation for User Story 1

- [x] T009 [US1] Modify POST /api/events/ingest in openclaw-factory/server/routes/events.ts — accept optional `idempotency_key` field, generate one from payload hash if absent, call insertEvent() from event-store (dedup), return {ok, seq, duplicate} in response. Continue to update registry and publish to EventBus only if not duplicate.
- [x] T010 [US1] Add GET /api/events/history endpoint in openclaw-factory/server/routes/events.ts — accept query params: after (int, default 0), task_id (string, optional), limit (int, default 500). Call queryEvents() from event-store. Return {events, has_more}.
- [x] T011 [US1] Modify GET /api/events/stream SSE endpoint in openclaw-factory/server/routes/events.ts — on connection, check `Last-Event-ID` header. If present and numeric, query event store for events with seq > Last-Event-ID, replay them as SSE messages before switching to live. Use server seq (from events table) as SSE `id` field instead of per-connection counter.
- [x] T012 [US1] Update EventBus publish in openclaw-factory/server/routes/events.ts — include `seq` (from event store) and `gateway_seq` (if available) in every SSE data payload so frontend can track sequence.

**Checkpoint**: Events persist to SQLite. SSE catchup works via Last-Event-ID. History endpoint serves full event log. Zero events lost even with SSE reconnection.

---

## Phase 4: User Story 2 — Automatic Connection Recovery with Device Tokens (Priority: P1)

**Goal**: Dashboard reconnects automatically when connection drops. Device tokens prevent re-auth. Exponential backoff aligned with Gateway pattern.

**Independent Test**: Kill SSE connection for 30 seconds, restore. Dashboard reconnects automatically, catches up on missed events, no manual refresh needed.

### Implementation for User Story 2

- [x] T013 [US2] Rewrite SSE connection logic in openclaw-factory/src/hooks/use-sse.ts — replace fixed 3s retry with exponential backoff: initial 1s, multiplier 2x, max 30s, max 10 attempts. Track lastEventSeq from received SSE `id` fields. On reconnect, EventSource automatically sends Last-Event-ID header. Track connection state: connected (onopen), reconnecting (onerror with retries remaining), disconnected (retries exhausted). Expose connectionState and retryCount via context.
- [x] T014 [US2] Modify usePipelines hook in openclaw-factory/src/hooks/use-pipelines.ts — watch for SSE reconnection (connected state after reconnecting). On reconnect, trigger full fetchData() to refresh pipeline state from REST API in addition to SSE catchup.
- [x] T015 [US2] Add GET /api/gateway/status endpoint in openclaw-factory/server/routes/events.ts — return GatewayClient connection state: {status, connId, lastGatewaySeq, lastTickAt, retryCount, upSince}. Frontend will use this for accurate connection indicator.
- [x] T016 [US2] Add device token rotation schedule in openclaw-factory/server/lib/gateway-client.ts — when connected, call `device.token.rotate` RPC every 24 hours. Save new token via saveDeviceToken(). Handle rotation failure gracefully (log warning, keep existing token).

**Checkpoint**: Dashboard reconnects automatically with backoff. Server reconnects to Gateway using device tokens. No manual refresh needed across multiple connection drops.

---

## Phase 5: User Story 3 — Event Continuity and Gap Detection (Priority: P2)

**Goal**: Gaps in event sequence are detected and recovered. Duplicates are suppressed. Events always display in correct order.

**Independent Test**: Force 3 connection drops during pipeline run. After each recovery, event timeline is complete — no gaps, no duplicates, correct seq order.

### Implementation for User Story 3

- [x] T017 [US3] Add gap detection to GatewayClient event processing in openclaw-factory/server/lib/gateway-client.ts — compare each received event's `seq` against lastGatewaySeq+1. On small gap (<=3): log warning, call chat.history RPC for active sessions, check local event store for hook-delivered events filling gap, reset lastGatewaySeq. On large gap (>3): log error, close and reconnect, fetch full state via sessions.list + chat.history on reconnect.
- [x] T018 [US3] Add frontend dedup logic in openclaw-factory/src/hooks/use-sse.ts — maintain a Set of seen `seq` values (bounded to last 1000). On each SSE message, check if seq already seen; if so, skip the event handler. This handles duplicates from SSE replay + live overlap.
- [x] T019 [US3] Ensure frontend event ordering in openclaw-factory/src/hooks/use-pipelines.ts — if events arrive out of order (seq < lastProcessedSeq), buffer and re-sort before applying. For the dashboard list view this is handled by refetch; for the detail timeline view, insert events in seq order.

**Checkpoint**: Gap detection works at Gateway level (server) and dedup works at SSE level (frontend). Events always in order, no duplicates, no gaps after recovery.

---

## Phase 6: User Story 4 — Connection Health Monitoring (Priority: P3)

**Goal**: Operator always sees the connection status at a glance — Connected, Reconnecting, or Disconnected.

**Independent Test**: View dashboard normally (green Connected). Simulate degraded connectivity (shows Reconnecting with retry count). Exhaust retries (shows Disconnected with manual retry button).

### Implementation for User Story 4

- [x] T020 [US4] Create connection status component in openclaw-factory/src/components/connection-status.tsx — render a small indicator badge: green dot + "Connected", yellow dot + "Reconnecting (attempt N)" with current backoff interval, red dot + "Disconnected" with "Retry" button. Use connectionState and retryCount from SSE context. Fetch /api/gateway/status on click for detailed server-side status. Style with Tailwind (compact, top-right corner or header bar).
- [x] T021 [US4] Mount connection status in openclaw-factory/src/App.tsx — add ConnectionStatus component to the layout so it appears on all pages. Wire manual retry button to reset SSE connection state and trigger reconnect.
- [x] T022 [US4] Add SSE event for gateway status changes in openclaw-factory/server/lib/gateway-client.ts — when GatewayClient state changes (connected→reconnecting, reconnecting→connected, etc.), publish a `gateway:status` event via EventBus with {status, retryCount, lastGatewaySeq}. Add `gateway:status` to the SSE event types in use-sse.ts listener list.

**Checkpoint**: Connection indicator visible and accurate. Shows all three states correctly. Manual retry works from Disconnected state.

---

## Phase 7: Hook Enhancement (Fallback Channel)

**Purpose**: Make the existing dashboard-bridge hook reliable as a fallback

- [x] T023 [P] Add retry logic to openclaw-factory/hooks/dashboard-bridge/handler.ts — wrap the POST to /api/events/ingest in a retry loop: 3 attempts with delays 1s, 2s, 4s. On each attempt, catch network/HTTP errors and retry. After 3 failures, log error and continue (don't block subsequent events).
- [x] T024 [P] Add idempotency key generation to openclaw-factory/hooks/dashboard-bridge/handler.ts — for each event POST, compute sha256(task_id + event_type + stage_or_gate + Math.floor(Date.now()/1000)). Include as `idempotency_key` field in the POST body. This ensures server dedup against WebSocket-delivered events.

**Checkpoint**: Hook retries on failure. Events from hook are deduplicated against WebSocket events in the event store.

---

## Phase 8: OpenClaw RPC Migration

**Purpose**: Use Gateway WebSocket RPC for pipeline operations instead of HTTP-only

- [x] T025 Refactor openclaw-factory/server/lib/openclaw.ts — modify startPipeline() to use GatewayClient.rpc("chat.send", {sessionKey, message}) with fallback to existing postHook() on failure. Modify sendApproval() to use GatewayClient.rpc("exec.approval.resolve", {...}) with fallback to postHook(). Modify sendAbort() to use GatewayClient.rpc("chat.abort", {sessionKey}) with fallback to postHook(). Implement getChatHistory() using GatewayClient.rpc("chat.history", {sessionKey}) instead of returning [].

**Checkpoint**: Pipeline operations route through WebSocket RPC when available, HTTP hooks as fallback. getChatHistory() functional.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup and hardening

- [x] T026 [P] Add event pruning to openclaw-factory/server/lib/event-store.ts — `pruneEvents(olderThanDays)` deletes events older than retention period (default 7 days). Call on server startup and daily via setInterval.
- [x] T027 [P] Add structured logging for connection lifecycle in openclaw-factory/server/lib/gateway-client.ts — log connection state changes, gap detections, device token rotations, and RPC errors with timestamps and context for debugging.
- [x] T028 Update openclaw-factory/docker-compose.yml if needed — ensure WebSocket port (18789) is accessible from dashboard container, verify volume mounts for device token persistence.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — MVP milestone
- **User Story 2 (Phase 4)**: Depends on Foundational — can parallelize with US1 (different files)
- **User Story 3 (Phase 5)**: Depends on US1 (needs event store seq) and US2 (needs reconnection logic)
- **User Story 4 (Phase 6)**: Depends on US2 (needs connection state from SSE context)
- **Hook Enhancement (Phase 7)**: Depends on Foundational only — can parallelize with US1-US4
- **RPC Migration (Phase 8)**: Depends on Foundational (needs GatewayClient)
- **Polish (Phase 9)**: Depends on all prior phases

### User Story Dependencies

- **US1 (P1)**: After Foundational — independent, no cross-story deps
- **US2 (P1)**: After Foundational — independent, no cross-story deps
- **US3 (P2)**: After US1 + US2 — uses event store seq (US1) and reconnection logic (US2)
- **US4 (P3)**: After US2 — uses connection state exposed by US2

### Parallel Opportunities

- T001 and T002 (Setup) can run in parallel
- T003, T004, T006 (Foundational) can start in parallel after Setup
- US1 (T009-T012) and US2 (T013-T016) can run in parallel — they modify different files
- Hook Enhancement (T023-T024) can run in parallel with any user story phase
- RPC Migration (T025) can run in parallel with US3 and US4
- T026, T027, T028 (Polish) can all run in parallel

---

## Parallel Example: Foundational Phase

```bash
# After Setup, launch in parallel:
Task: T003 "Add events table definition to schema.ts"
Task: T004 "Create event-store.ts"
Task: T006 "Create device-token.ts"

# Then sequentially:
Task: T005 "Wire initEventsTable into initDb" (depends on T003, T004)
Task: T007 "Create gateway-client.ts" (depends on T006)
Task: T008 "Wire GatewayClient into server startup" (depends on T004, T007)
```

## Parallel Example: US1 + US2 in Parallel

```bash
# After Foundational, launch both stories simultaneously:

# Developer A (server-side, US1):
Task: T009 "Modify POST /api/events/ingest"
Task: T010 "Add GET /api/events/history"
Task: T011 "Modify SSE with Last-Event-ID"
Task: T012 "Update EventBus publish with seq"

# Developer B (frontend + server endpoint, US2):
Task: T013 "Rewrite SSE connection logic in use-sse.ts"
Task: T014 "Modify usePipelines reconnect behavior"
Task: T015 "Add GET /api/gateway/status endpoint"
Task: T016 "Add device token rotation"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (reliable event delivery + persistence + catchup)
4. **STOP and VALIDATE**: Start pipeline, verify events persist, test SSE Last-Event-ID catchup
5. Deploy if ready — events are now reliable even without reconnection automation

### Incremental Delivery

1. Setup + Foundational → Gateway connected, events persisting
2. Add US1 → Event persistence + SSE catchup (MVP!)
3. Add US2 → Automatic reconnection + device tokens
4. Add US3 → Gap detection + dedup (hardening)
5. Add US4 → Connection indicator (UX polish)
6. Add Hook Enhancement → Fallback channel reliable
7. Add RPC Migration → Full Gateway integration
8. Polish → Pruning, logging, Docker config

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No test tasks generated — no test framework configured in the project
- The GatewayClient (T007) is the most complex single task — consider breaking it into sub-PRs if needed
- Device keypair generation uses Node.js crypto.generateKeyPairSync — no external dependency needed
- Events table uses INSERT OR IGNORE for idempotency — no explicit UPSERT needed
