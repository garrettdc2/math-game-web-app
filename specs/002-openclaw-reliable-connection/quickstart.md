# Quickstart: Reliable OpenClaw Dashboard Connection

**Date**: 2026-04-03  
**Feature**: 002-openclaw-reliable-connection

## What This Feature Changes

The dashboard currently connects to OpenClaw only through HTTP hooks (fire-and-forget), causing missed events, no reconnection, and stale state. This feature adds:

1. A server-side **WebSocket client** to the OpenClaw Gateway — getting native `seq` ordering, device tokens, session replay, and RPC access
2. **Server-side event persistence** in SQLite — safety net for Gateway restart data loss
3. **SSE Last-Event-ID** support — browser-native catchup on reconnect
4. **Hook retry + idempotency** — making the fallback channel reliable too
5. **Frontend exponential backoff** — aligned with Gateway's own backoff pattern
6. **Connection status indicator** — operator always knows the connection state

## Files to Create

### Server (openclaw-factory/server/)

| File | Purpose |
|------|---------|
| `lib/gateway-client.ts` | **NEW** — WebSocket client for OpenClaw Gateway protocol (handshake, device tokens, seq tracking, RPC, keepalive, reconnection) |
| `lib/device-token.ts` | **NEW** — Device token file persistence and rotation |
| `lib/event-store.ts` | **NEW** — Event persistence functions (insert with dedup, query by seq range) |

### Frontend (openclaw-factory/src/)

| File | Purpose |
|------|---------|
| `components/connection-status.tsx` | **NEW** — Connection health indicator (Connected/Reconnecting/Disconnected) |

## Files to Modify

### Server (openclaw-factory/server/)

| File | Change |
|------|--------|
| `db/schema.ts` | Add `events` table definition |
| `lib/store.ts` | Add event store initialization in `initDb()` |
| `routes/events.ts` | Persist events on ingest with dedup, add `/events/history` endpoint, add `Last-Event-ID` support to SSE, add `/gateway/status` endpoint |
| `lib/openclaw.ts` | Refactor to use Gateway WebSocket RPC for `startPipeline`, `sendApproval`, `sendAbort` (alongside existing HTTP hook fallback) |
| `lib/config.ts` | Add `DEVICE_TOKEN_PATH` config |
| `index.ts` | Initialize gateway client on startup, wire into event pipeline |

### Hook (openclaw-factory/hooks/)

| File | Change |
|------|--------|
| `dashboard-bridge/handler.ts` | Add retry logic (3 attempts, backoff), generate idempotency keys |

### Frontend (openclaw-factory/src/)

| File | Change |
|------|--------|
| `hooks/use-sse.ts` | Exponential backoff (1s-30s, 10 retries), track connection state and lastEventSeq, expose gateway status |
| `hooks/use-pipelines.ts` | Refetch state on reconnect, not just on events |
| `App.tsx` or layout | Mount connection status indicator |

### Dependencies

| File | Change |
|------|--------|
| `package.json` | Add `ws` package for WebSocket client |

## Development Order

### Phase 1: Server-Side Foundation
1. **Events table + store** — schema, persistence, dedup, query functions
2. **Gateway WebSocket client** — handshake, device tokens, `seq` tracking, keepalive
3. **Event pipeline integration** — WebSocket events → event store → EventBus → SSE

### Phase 2: API Enhancements
4. **Event history endpoint** — `GET /api/events/history`
5. **SSE Last-Event-ID** — replay from store on reconnect
6. **Gateway status endpoint** — `GET /api/gateway/status`

### Phase 3: Hook Enhancement
7. **Hook retry + idempotency** — dashboard-bridge handler

### Phase 4: OpenClaw RPC Migration
8. **Refactor openclaw.ts** — use WebSocket RPC for pipeline operations (with HTTP fallback)

### Phase 5: Frontend
9. **SSE reconnection** — exponential backoff, state tracking
10. **Connection status indicator** — new component
11. **Pipeline state recovery** — refetch on reconnect

## Testing Strategy

- **Unit**: Event store dedup, seq gap detection, backoff calculation, device token persistence
- **Integration**: WebSocket handshake → event receipt → persist → SSE relay flow
- **Integration**: Hook → ingest → dedup against WebSocket events → no duplicates in store
- **E2E**: Start pipeline, kill WebSocket, verify catchup on reconnect via Last-Event-ID
- **E2E**: Gateway restart → device token invalidation → fallback to token auth → recovery
- **Manual**: Full pipeline lifecycle with 3+ forced connection drops, zero missed events
