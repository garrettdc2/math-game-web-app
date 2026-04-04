# Contract: Dashboard-Bridge Hook

**Date**: 2026-04-03  
**Feature**: 001-fix-openclaw-connection

## Changes to Hook Handler

### Retry Logic

When POST to `/api/events/ingest` fails, retry up to 3 times with backoff:

| Attempt | Delay Before Retry |
|---------|--------------------|
| 1st retry | 1 second |
| 2nd retry | 2 seconds |
| 3rd retry | 4 seconds |

After 3 failed retries, log the failure and continue (do not block the hook from processing subsequent events).

### Idempotency Key Generation

The hook generates an idempotency key for each event POST:

```
idempotency_key = hash(task_id + event_type + stage_or_gate + timestamp_seconds)
```

Where `timestamp_seconds` is the event timestamp truncated to the nearest second (to handle slight timing differences on retries).

### Request Payload (Updated)

```json
{
  "task_id": "SFT-123",
  "event": "stage:start",
  "stage": "architecture",
  "session_key": "hook:factory:SFT-123",
  "idempotency_key": "sha256:a1b2c3d4e5f6..."
}
```
