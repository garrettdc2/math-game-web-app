# API Contract: Events

**Date**: 2026-04-03  
**Feature**: 001-fix-openclaw-connection

## Modified: POST /api/events/ingest

Receives events from the dashboard-bridge hook. Now persists to SQLite and assigns sequence IDs.

### Request (unchanged)

```json
{
  "task_id": "SFT-123",
  "event": "stage:start",
  "stage": "architecture",
  "gate_name": null,
  "session_key": "hook:factory:SFT-123",
  "detail": null,
  "idempotency_key": "abc123def456"
}
```

**New field**: `idempotency_key` (string, optional). Hash of task_id + event + stage/gate + timestamp. If omitted, server generates one from the payload. Used to prevent duplicate inserts on hook retries.

### Response

```json
{
  "ok": true,
  "seq": 42
}
```

**New field**: `seq` (integer). The assigned sequence ID for this event.

---

## New: GET /api/events/history

Returns persisted events after a given sequence ID. Used for initial page load and REST-based catchup.

### Request

```
GET /api/events/history?after=0&task_id=SFT-123&limit=500
```

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| after | integer | No | 0 | Return events with seq > after |
| task_id | string | No | (all) | Filter to a specific pipeline |
| limit | integer | No | 500 | Max events to return |

### Response

```json
{
  "events": [
    {
      "seq": 41,
      "task_id": "SFT-123",
      "event_type": "pipeline:update",
      "data": { "task_id": "SFT-123", "stage": "spec", "error": "" },
      "created_at": "2026-04-03T10:15:30.000Z"
    },
    {
      "seq": 42,
      "task_id": "SFT-123",
      "event_type": "stage:start",
      "data": { "task_id": "SFT-123", "stage": "architecture" },
      "created_at": "2026-04-03T10:16:00.000Z"
    }
  ],
  "has_more": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| events | array | Events ordered by seq ascending |
| has_more | boolean | True if more events exist beyond limit |

---

## Modified: GET /api/events/stream (SSE)

Now uses persistent sequence IDs and supports Last-Event-ID catchup.

### Connection

```
GET /api/events/stream?task_id=SFT-123
Last-Event-ID: 41
```

| Header/Param | Type | Required | Description |
|--------------|------|----------|-------------|
| task_id | query param | No | Filter to a specific pipeline |
| Last-Event-ID | header | No | Resume from this sequence ID (browser sends automatically on reconnect) |

### Behavior

1. If `Last-Event-ID` is present and numeric, replay all events with `seq > Last-Event-ID` from the store, then switch to live streaming.
2. If `Last-Event-ID` is absent, stream only live events (no replay).
3. Each SSE message uses the persistent `seq` as the `id` field.
4. Keepalive ping every 15 seconds (unchanged).

### SSE Message Format

```
id: 42
event: stage:start
data: {"seq":42,"task_id":"SFT-123","stage":"architecture"}

id: 43
event: pipeline:update
data: {"seq":43,"task_id":"SFT-123","stage":"architecture","error":""}
```

### Event Types (unchanged)

- `pipeline:created`
- `pipeline:update`
- `pipeline:done`
- `gate:waiting`
- `gate:resolved`
- `stage:log`
- `ping` (keepalive, no `id`)
