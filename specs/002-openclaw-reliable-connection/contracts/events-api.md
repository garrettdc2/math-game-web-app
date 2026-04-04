# API Contract: Events

**Date**: 2026-04-03  
**Feature**: 002-openclaw-reliable-connection

## Modified: POST /api/events/ingest

Receives events from the dashboard-bridge hook (fallback channel). Now persists to SQLite with dedup.

### Request

```json
{
  "task_id": "SFT-123",
  "event": "stage:start",
  "stage": "architecture",
  "gate_name": null,
  "session_key": "hook:factory:SFT-123",
  "detail": null,
  "idempotency_key": "sha256:abc123"
}
```

**New field**: `idempotency_key` (string, optional). If omitted, server generates from payload hash.

### Response

```json
{
  "ok": true,
  "seq": 42,
  "duplicate": false
}
```

**New fields**: `seq` (server-assigned sequence ID), `duplicate` (true if idempotency_key already existed).

---

## New: GET /api/events/history

Returns persisted events for initial page load and REST-based catchup.

### Request

```
GET /api/events/history?after=0&task_id=SFT-123&limit=500
```

| Param   | Type    | Required | Default | Description                          |
|---------|---------|----------|---------|--------------------------------------|
| after   | integer | No       | 0       | Return events with seq > after       |
| task_id | string  | No       | (all)   | Filter to a specific pipeline        |
| limit   | integer | No       | 500     | Max events to return                 |

### Response

```json
{
  "events": [
    {
      "seq": 41,
      "gateway_seq": 615,
      "task_id": "SFT-123",
      "event_type": "pipeline:update",
      "source": "websocket",
      "data": { "task_id": "SFT-123", "stage": "spec", "error": "" },
      "created_at": "2026-04-03T10:15:30.000Z"
    }
  ],
  "has_more": false
}
```

---

## Modified: GET /api/events/stream (SSE)

Now uses persistent server `seq` as SSE `id`. Supports Last-Event-ID catchup.

### Connection

```
GET /api/events/stream?task_id=SFT-123
Last-Event-ID: 41
```

### Behavior

1. If `Last-Event-ID` is present and numeric: replay all events with `seq > Last-Event-ID` from store, then switch to live.
2. If absent: stream only live events.
3. Each SSE message uses server `seq` as `id` field.
4. Keepalive ping every 15 seconds (unchanged).

### SSE Message Format

```
id: 42
event: pipeline:update
data: {"seq":42,"gateway_seq":616,"task_id":"SFT-123","stage":"architecture"}
```

---

## New: GET /api/gateway/status

Returns the server's WebSocket connection status to the OpenClaw Gateway.

### Response

```json
{
  "status": "connected",
  "connId": "abc-123",
  "lastGatewaySeq": 618,
  "lastTickAt": "2026-04-03T10:16:00.000Z",
  "retryCount": 0,
  "upSince": "2026-04-03T08:00:00.000Z"
}
```

Status values: `"connected"`, `"reconnecting"`, `"disconnected"`
