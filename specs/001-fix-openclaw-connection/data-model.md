# Data Model: Fix OpenClaw Connection Reliability

**Date**: 2026-04-03  
**Feature**: 001-fix-openclaw-connection

## New Entity: Event

Persisted record of every pipeline event, used for catchup, ordering, and deduplication.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| seq | Integer | Primary key, auto-increment | Monotonically increasing sequence ID. Canonical identity for ordering, dedup, and gap detection. |
| idempotency_key | Text | Unique, not null | Hash of (task_id + event_type + stage + timestamp). Prevents duplicate inserts from hook retries. |
| task_id | Text | Not null, indexed | Pipeline this event belongs to. Foreign key to pipelines.task_id. |
| event_type | Text | Not null | One of: `pipeline:created`, `pipeline:update`, `pipeline:done`, `gate:waiting`, `gate:resolved`, `stage:log` |
| data | Text (JSON) | Not null | Full event payload as JSON string. Contains stage, gate_name, error, detail, etc. |
| created_at | Text (ISO 8601) | Not null | Timestamp when event was persisted. |

### Indexes

- `idx_events_task_id` on `task_id` — filter by pipeline
- `idx_events_idempotency_key` (unique) on `idempotency_key` — dedup on insert
- `idx_events_seq_task` on `(task_id, seq)` — efficient range queries for catchup

### Lifecycle

1. **Created**: When `/api/events/ingest` receives an event from the dashboard-bridge hook, it inserts into the events table (dedup via idempotency_key).
2. **Read**: On SSE reconnect (Last-Event-ID) or REST history fetch, events are queried by `seq > ?` with optional `task_id` filter.
3. **Never updated**: Events are immutable once written.
4. **Pruned**: Events older than 7 days may be pruned (configurable). Pipeline completion triggers no immediate cleanup — events remain queryable for the retention period.

---

## Modified Entity: Pipeline State

No schema changes to the `pipelines` table. The existing fields are sufficient:

| Existing Field | Relevance |
|----------------|-----------|
| task_id | Join key to events table |
| stage | Current stage (used for state recovery on reconnect) |
| has_pending_gate | Gate status (used for state recovery on reconnect) |
| openclaw_session_key | Used to correlate OpenClaw sessions |

---

## Entity: Connection State (Frontend Only, Not Persisted)

Managed in React state. Not stored in database.

| Field | Type | Description |
|-------|------|-------------|
| status | Enum | `connected`, `reconnecting`, `disconnected` |
| retryCount | Integer | Current retry attempt (0-10) |
| lastEventSeq | Integer | Sequence ID of last received event (for catchup) |
| lastConnectedAt | Date | Timestamp of last successful connection |

### State Transitions

```
[Initial] → connected        (on SSE open)
connected → reconnecting     (on SSE error/close)
reconnecting → connected     (on SSE open, resets retryCount)
reconnecting → disconnected  (after 10 failed retries)
disconnected → reconnecting  (on manual retry click)
```
