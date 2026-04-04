# Contract: Dashboard-Bridge Hook (Fallback Channel)

**Date**: 2026-04-03  
**Feature**: 002-openclaw-reliable-connection

## Role Change

The dashboard-bridge hook transitions from **primary event source** to **fallback channel**. The server's WebSocket connection to the Gateway is now the primary event source. The hook continues to run and deliver events, providing defense in depth.

## Changes

### Retry Logic (New)

When POST to `/api/events/ingest` fails, retry up to 3 times with backoff:

| Attempt   | Delay |
|-----------|-------|
| 1st retry | 1s    |
| 2nd retry | 2s    |
| 3rd retry | 4s    |

After 3 failed retries, log the failure and continue.

### Idempotency Key (New)

Each event POST now includes an `idempotency_key`:

```
idempotency_key = sha256(task_id + event_type + stage_or_gate + timestamp_seconds)
```

This ensures the server can deduplicate events that arrive via both WebSocket and hook.

### Request Payload (Updated)

```json
{
  "task_id": "SFT-123",
  "event": "stage:start",
  "stage": "architecture",
  "session_key": "hook:factory:SFT-123",
  "idempotency_key": "sha256:a1b2c3d4e5f6"
}
```

### No Other Changes

Marker parsing logic (structured markers and natural language fallbacks) remains unchanged. The hook continues to parse agent output for `[STAGE:...]`, `[GATE:...]`, `[PIPELINE:...]` markers.
