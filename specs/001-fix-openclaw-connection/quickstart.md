# Quickstart: Fix OpenClaw Connection Reliability

**Date**: 2026-04-03  
**Feature**: 001-fix-openclaw-connection

## What This Feature Changes

This feature makes the dashboard's connection to OpenClaw reliable. Currently, events are lost when the connection drops, and the dashboard shows stale state. After this feature:

- Every pipeline event is persisted server-side with a sequence ID
- The SSE stream supports automatic catchup on reconnect (via Last-Event-ID)
- The frontend reconnects with exponential backoff and shows connection status
- The dashboard-bridge hook retries failed event deliveries

## Files to Modify

### Server (openclaw-factory/server/)

| File | Change |
|------|--------|
| `db/schema.ts` | Add `events` table schema |
| `lib/store.ts` | Add event persistence functions (insert, query by seq) |
| `routes/events.ts` | Persist events on ingest, add `/events/history` endpoint, add Last-Event-ID support to SSE stream |

### Hook (openclaw-factory/hooks/)

| File | Change |
|------|--------|
| `dashboard-bridge/handler.ts` | Add retry logic (3 attempts, backoff), generate idempotency keys |

### Frontend (openclaw-factory/src/)

| File | Change |
|------|--------|
| `hooks/use-sse.ts` | Exponential backoff (1s-60s, 10 retries), connection state tracking, expose lastEventSeq |
| `hooks/use-pipelines.ts` | Refetch state on reconnect (not just on events) |
| `components/connection-status.tsx` | New component: connection indicator (Connected/Reconnecting/Disconnected) |
| `App.tsx` or layout | Mount connection status indicator |

### OpenClaw Config

| File | Change |
|------|--------|
| `openclaw-config.json` | Adjust hook timeout to match agent timeout if needed |

## Development Order

1. **Events table + persistence** (server) — foundation everything else depends on
2. **Event history endpoint** (server) — enables testing catchup
3. **SSE Last-Event-ID support** (server) — standard reconnect protocol
4. **Hook retry + idempotency** (hook) — at-least-once delivery
5. **Frontend reconnection** (frontend) — exponential backoff + state recovery
6. **Connection status indicator** (frontend) — user-visible health

## Testing Strategy

- Unit: Event store insert/query, idempotency dedup, sequence ordering
- Integration: Hook → ingest → persist → SSE replay flow
- E2E: Start pipeline, kill SSE connection, verify catchup on reconnect
- Manual: Open dashboard, run pipeline, observe zero missed events through full lifecycle
