# Research: Fix OpenClaw Connection Reliability

**Date**: 2026-04-03  
**Feature**: 001-fix-openclaw-connection

## Current Architecture Analysis

### Event Flow (End-to-End)

```
OpenClaw Agent → [structured markers in output] → dashboard-bridge hook
  → POST /api/events/ingest → in-memory EventBus → SSE /api/events/stream → Frontend EventSource
```

### Identified Root Causes

1. **Fire-and-forget event delivery**: The dashboard-bridge hook POSTs events to `/api/events/ingest` with no retry logic. If the server is momentarily unavailable, the event is silently lost.

2. **No event persistence**: The EventBus (`server/routes/events.ts`) is a pure in-memory pub/sub — events exist only for the instant they're published. Late-connecting or reconnecting clients miss everything.

3. **Per-connection SSE IDs**: The SSE endpoint assigns `id: String(id++)` where `id` is a local counter initialized to 0 for each connection. These IDs are meaningless across reconnections and cannot be used for `Last-Event-ID` catchup.

4. **No event history endpoint**: There is no API to retrieve past events. The only "history" is audit logs (flat files), which aren't structured for client consumption.

5. **Naive reconnection**: Frontend `use-sse.ts` reconnects with a fixed 3-second delay, no backoff, no state recovery. On reconnect, it gets a fresh SSE stream but misses everything that happened while disconnected.

6. **Refetch-on-event pattern**: Frontend components (`use-pipelines.ts`, `pipeline.tsx`) do a full API refetch on every SSE event. This means they get *current state* correctly after reconnect IF they also refetch on reconnect — but they lose the *event timeline* (which events occurred, in what order).

---

## Decision 1: Event Persistence Layer

**Decision**: Add an `events` table in SQLite to persist every event with a server-assigned auto-incrementing sequence ID.

**Rationale**: The spec requires zero missed events (SC-001), catchup after reconnection (FR-003), and deduplication (FR-004). All of these require a durable, ordered event log. SQLite is already in use (better-sqlite3 + Drizzle ORM) for pipeline state, so adding a table is zero new infrastructure.

**Alternatives considered**:
- Redis Streams: Adds infrastructure dependency for a single-operator dashboard — overkill.
- Flat file event log: Audit logs already exist but aren't queryable by sequence ID or parseable for catchup.
- In-memory ring buffer: Loses events on server restart; doesn't satisfy durability requirement.

---

## Decision 2: Event History API Endpoint

**Decision**: Add `GET /api/events/history?after={sequenceId}&task_id={optional}` endpoint that returns events after a given sequence ID.

**Rationale**: The frontend needs to catch up on missed events after reconnection. Using `after` parameter with the last-seen sequence ID gives exactly the missing events in order. This also serves initial page load (after=0 gives full history).

**Alternatives considered**:
- SSE `Last-Event-ID` header: Browser sends this automatically on reconnect, but our SSE endpoint would need to replay from the event store. We'll support this in the SSE endpoint AND provide a REST endpoint for initial load.
- Polling: Higher latency, more traffic — SSE with catchup is better.

---

## Decision 3: SSE Last-Event-ID Support

**Decision**: Use the server-assigned sequence ID as the SSE `id` field. On reconnect, the browser automatically sends `Last-Event-ID` header. The SSE endpoint replays missed events from the store before switching to live streaming.

**Rationale**: This is the standard SSE reconnection protocol. Browsers handle it natively — no custom frontend catchup code needed for the SSE layer. Combined with the REST history endpoint for initial page loads, this covers all scenarios.

**Alternatives considered**:
- Custom catchup via REST only: Would work but requires more frontend code and doesn't leverage built-in browser SSE reconnection.
- WebSocket upgrade: More complex, bidirectional not needed, SSE with Last-Event-ID is sufficient.

---

## Decision 4: Dashboard-Bridge Hook Reliability

**Decision**: Add retry logic (3 attempts, 1s/2s/4s backoff) to the dashboard-bridge hook's POST to `/api/events/ingest`. Include an idempotency key (hash of task_id + event + stage + timestamp) so the server can deduplicate retried deliveries.

**Rationale**: The hook is the single ingestion point. If its POST fails, the event is lost forever. Retries with idempotency ensure at-least-once delivery without duplicates in the event store.

**Alternatives considered**:
- Write events to a local queue file in the hook, process async: More complex, Docker volume mount issues.
- Accept event loss at hook level, rely on periodic state sync: Violates SC-001 (zero missed events).

---

## Decision 5: Frontend Reconnection Strategy

**Decision**: Replace fixed 3s retry with exponential backoff (1s→2s→4s→8s→16s→32s→60s, cap at 60s, max 10 attempts). On reconnect success, refetch current pipeline state via REST API. Display connection status indicator.

**Rationale**: Matches FR-002 (exponential backoff, 10 retries), FR-005 (status indicator), and FR-007 (state recovery on reconnect). The SSE Last-Event-ID handles event catchup automatically; the REST refetch ensures pipeline state is current.

**Alternatives considered**:
- Reconnect + full event replay only: Slower for large backlogs; REST state fetch is faster for current state.
- No REST refetch, rely only on SSE catchup: Risk of stale derived state if event processing has edge cases.

---

## Decision 6: OpenClaw Configuration Changes

**Decision**: Add keepalive/heartbeat configuration to the OpenClaw hook settings to ensure the dashboard-bridge hook fires regularly even during idle periods. Configure hook timeout to match agent timeout (1800s).

**Rationale**: Long-running agent sessions (up to 30 min) may have quiet periods where no markers are emitted. The SSE keepalive (15s ping) only covers server→frontend. We also need OpenClaw→hook liveness.

**Alternatives considered**:
- Application-level heartbeat from server to OpenClaw: OpenClaw doesn't expose a subscription API — hooks are push-only.
- Accept quiet periods: Risk of connection timeout at network/proxy layer.

---

## OpenClaw API Capabilities (Confirmed)

| Capability | Available | Notes |
|------------|-----------|-------|
| Hook event interception | Yes | `message:received`, `message:sent` events |
| Session persistence | Yes | Via `sessionKey` → memory files |
| Session key in hooks | Yes | `allowRequestSessionKey: true` in config |
| Chat history API | No | Not exposed over HTTP |
| Event replay API | No | Must build our own |
| SSE streaming (chat) | Yes | `/v1/chat/completions` with `stream: true` |
| WebSocket | No | Not available |
| Hook retry/reliability | No | Must implement in hook handler |

## Technology Stack (Confirmed from Codebase)

- **Runtime**: Node.js + TypeScript
- **Server**: Hono (HTTP framework)
- **Database**: SQLite via better-sqlite3 + Drizzle ORM
- **Frontend**: React + Vite + Tailwind CSS
- **Streaming**: Server-Sent Events (SSE) via Hono `streamSSE`
- **OpenClaw**: Docker container on port 18789, hook-based integration
