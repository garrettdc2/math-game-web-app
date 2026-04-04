# Data Model: Reliable OpenClaw Dashboard Connection

**Date**: 2026-04-03  
**Feature**: 002-openclaw-reliable-connection

## New Entity: Persisted Event

Server-side event store for catchup, ordering, dedup, and Gateway restart resilience.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| seq | Integer | Primary key, auto-increment | Server-assigned monotonic sequence ID. Used as SSE `id` for Last-Event-ID catchup. |
| gateway_seq | Integer | Nullable | OpenClaw Gateway's global sequence number (if event came via WebSocket). Null for hook-only events. |
| idempotency_key | Text | Unique, not null | Content hash for dedup across WebSocket and hook sources. Prevents duplicate inserts. |
| task_id | Text | Not null, indexed | Pipeline this event belongs to. |
| event_type | Text | Not null | One of: `pipeline:created`, `pipeline:update`, `pipeline:done`, `gate:waiting`, `gate:resolved`, `stage:log` |
| source | Text | Not null | `"websocket"` or `"hook"` — which channel delivered this event. |
| data | Text (JSON) | Not null | Full event payload as JSON. |
| created_at | Text (ISO 8601) | Not null | When the event was persisted. |

### Indexes

- `idx_events_task_id` on `task_id` — filter events by pipeline
- `idx_events_idempotency_key` (unique) on `idempotency_key` — dedup on insert
- `idx_events_seq_task` on `(task_id, seq)` — range queries for SSE catchup
- `idx_events_gateway_seq` on `gateway_seq` — correlate with Gateway sequence

### Lifecycle

1. **Created**: On event receipt from either WebSocket or hook ingest. Deduplicated by idempotency_key (INSERT OR IGNORE).
2. **Read**: On SSE reconnect (Last-Event-ID), REST history fetch, or gap recovery.
3. **Never updated**: Events are immutable.
4. **Pruned**: Events older than 7 days may be pruned (configurable). Retention covers typical pipeline lifecycles.

---

## New Entity: Gateway Connection State (Server-Side, In-Memory)

Tracks the server's WebSocket connection to the OpenClaw Gateway. Not persisted to database — reconstructed on startup.

| Field | Type | Description |
|-------|------|-------------|
| status | Enum | `connected`, `reconnecting`, `disconnected` |
| connId | String | Gateway-assigned connection ID from `hello-ok` |
| lastGatewaySeq | Integer | Last received Gateway `seq` — for gap detection |
| lastTickAt | Date | Timestamp of last received `tick` event — for dead connection detection |
| retryCount | Integer | Current reconnect attempt (0-10) |
| currentBackoffMs | Integer | Current backoff interval in ms |

### State Transitions

```
[Startup] → connecting         (initial WebSocket open)
connecting → connected         (on hello-ok response)
connected → reconnecting       (on WebSocket close/error, or 90s tick timeout)
reconnecting → connected       (on successful hello-ok with device token)
reconnecting → disconnected    (after 10 failed attempts)
disconnected → reconnecting    (on manual retry or server restart)
```

---

## New Entity: Device Token (Server-Side, File-Persisted)

| Field | Type | Description |
|-------|------|-------------|
| token | String | The device token from `hello-ok.auth.deviceToken` |
| issuedAt | Date | When the token was received |
| rotatedAt | Date | When the token was last rotated via `device.token.rotate` |

### Storage

Persisted to `.openclaw-device-token` JSON file in the server's data directory. Read on startup, updated on new token issuance or rotation.

### Lifecycle

1. **Issued**: On first successful Gateway handshake.
2. **Used**: Passed as `authDeviceToken` on every reconnect attempt.
3. **Rotated**: Via `device.token.rotate` RPC every 24 hours while connected.
4. **Invalidated**: Detected when Gateway rejects `authDeviceToken`. Fallback to `OPENCLAW_API_TOKEN` and re-pair.

---

## Modified Entity: Pipeline State (Existing)

No schema changes to the `pipelines` table. Existing fields used:

| Field | Relevance |
|-------|-----------|
| task_id | Join key to events table |
| stage | Current stage (state recovery on reconnect) |
| has_pending_gate | Gate status (state recovery) |
| openclaw_session_key | Maps to Gateway session for RPC calls |

---

## New Entity: Frontend Connection State (Client-Side, React State)

| Field | Type | Description |
|-------|------|-------------|
| status | Enum | `connected`, `reconnecting`, `disconnected` |
| retryCount | Integer | Current SSE retry attempt (0-10) |
| lastEventSeq | Integer | Server `seq` of last received SSE event |
| lastConnectedAt | Date | Timestamp of last successful SSE connection |
| backoffMs | Integer | Current backoff interval |

### State Transitions

```
[Initial] → connected        (on SSE onopen)
connected → reconnecting     (on SSE onerror/close)
reconnecting → connected     (on SSE onopen, resets retryCount)
reconnecting → disconnected  (after 10 failed retries)
disconnected → reconnecting  (on manual retry button click)
```
