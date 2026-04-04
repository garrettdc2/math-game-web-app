# Research: Reliable OpenClaw Dashboard Connection

**Date**: 2026-04-03  
**Feature**: 002-openclaw-reliable-connection

## Current Architecture Analysis

### Event Flow (End-to-End)

```
OpenClaw Agent → [structured markers in output] → dashboard-bridge hook
  → POST /api/events/ingest (fire-and-forget) → in-memory EventBus
  → SSE /api/events/stream → Frontend EventSource
```

### Identified Root Causes

1. **Fire-and-forget hook delivery**: The dashboard-bridge hook POSTs to `/api/events/ingest` with no retry. If the POST fails, the event is permanently lost.
2. **No event persistence**: EventBus is purely in-memory pub/sub — events exist only for the instant they're published. No replay, no catchup.
3. **Per-connection SSE IDs**: SSE assigns `id: String(id++)` per connection — meaningless across reconnections.
4. **No WebSocket connection to Gateway**: The server only communicates with OpenClaw via HTTP hook POSTs. It never connects to the Gateway's WebSocket protocol, missing native `seq` fields, device tokens, session replay, and RPC methods.
5. **Naive reconnection**: Frontend retries every 3 seconds with no backoff, no state recovery, no catchup.
6. **Placeholder chat history**: `openclaw.ts` has `getChatHistory()` that returns `[]` — intended for WebSocket RPC but never implemented.

---

## OpenClaw Gateway WebSocket Protocol (from docs.openclaw.ai)

### Connection & Handshake

- **URL**: `ws://127.0.0.1:18789` (or `ws://openclaw:18789` in Docker)
- **Handshake sequence** (10-second timeout):
  1. Server sends `connect.challenge` event with `{nonce, ts}`
  2. Client responds with connect request: protocol version (3), client metadata, role (`"operator"`), scopes, device identity (keypair fingerprint, publicKey, signature over nonce), auth (token or `authDeviceToken`)
  3. Server responds with `hello-ok`: `connId`, `features.methods[]`, `features.events[]`, `auth.deviceToken`
- **Auth precedence**: explicit token > env var `OPENCLAW_GATEWAY_TOKEN` > device token

### Message Frames

| Frame | Shape | Direction |
|-------|-------|-----------|
| Request | `{type:"req", id, method, params}` | client → server |
| Response | `{type:"res", id, ok, payload\|error}` | server → client |
| Event | `{type:"event", event, payload, seq?, stateVersion?}` | server → client |

- Max frame: 25 MB. Buffer cap: 50 MB per connection (slow-consumer protection).

### `seq` — Global Sequence Numbers

- **Monotonically increasing**, maintained by `createGatewayBroadcaster()`
- **Global** (not per-session) — all events across all sessions share one counter
- Purpose: detect dropped frames. If received seq jumps, events were lost.
- Example: "expected seq 617, got 618" = 1 dropped event

### Device Tokens

- Issued on successful pairing in `hello-ok.auth.deviceToken`
- Scoped to connection role + scopes
- Pass as `authDeviceToken` in future connects for token-less reconnection
- Management: `device.token.rotate`, `device.token.revoke`

### Built-in Keepalive

- `tick` events every **30 seconds** (application-level, not RFC 6455 ping/pong)
- `health` broadcasts every **60 seconds**
- No native WebSocket ping/pong frames (Issue #17926)

### Key RPC Methods

| Method | Purpose |
|--------|---------|
| `chat.send` | Send message to agent session |
| `chat.history` | Retrieve conversation history |
| `chat.abort` | Abort running agent |
| `sessions.list` | List available sessions |
| `sessions.preview` | Preview session content |
| `exec.approval.resolve` | Resolve approval gate (requires `operator.approvals` scope) |
| `device.token.rotate` | Get new device token |
| `agents.list` | List available agents |

### No Official Node.js Client SDK

The `openclaw` npm package is the full CLI application, not a client library. Must implement protocol with raw `ws` package.

---

## Decision 1: WebSocket Gateway Client

**Decision**: Build a server-side WebSocket client for the OpenClaw Gateway protocol using the `ws` npm package. Implement the full handshake (challenge-response with device keypair signing), device token persistence, `seq` tracking, and RPC request/response correlation.

**Rationale**: The spec requires native `seq` fields, device tokens, and session replay — all only available via the WebSocket protocol. The current HTTP hook-only integration cannot provide these. No official client SDK exists, so a custom implementation is required.

**Alternatives considered**:
- ACPX as library: CLI-only, no documented public API for programmatic import
- Importing from openclaw source: Not designed as importable library, 300k+ LOC
- HTTP-only with enhanced hooks: Cannot access `seq`, device tokens, or RPC methods

---

## Decision 2: Hybrid Event Ingestion (WebSocket Primary, Hook Fallback)

**Decision**: The server's WebSocket connection to the Gateway is the primary event source. The existing dashboard-bridge hook is retained as a fallback that feeds into the same event processing pipeline. Events from both sources are deduplicated by content hash before persistence.

**Rationale**: The WebSocket connection provides native `seq` ordering and session replay. The hook provides structured marker parsing (stage transitions, gates) that may carry domain-specific context not present in raw WebSocket events. Keeping both creates defense in depth.

**Alternatives considered**:
- WebSocket only, remove hooks: Loses structured marker parsing and domain event extraction
- Hooks only, enhanced: Cannot access native `seq`, device tokens, or session replay

---

## Decision 3: Server-Side Event Persistence (SQLite)

**Decision**: Add an `events` table in the existing SQLite database. Every event (from WebSocket or hook) gets a server-assigned auto-incrementing `seq` plus the Gateway's original `gateway_seq` (if available). Events are immutable once written.

**Rationale**: FR-013 requires server-side persistence as a safety net for Gateway restart data loss (Issue #50288). SQLite is already in use. The server's own `seq` provides a stable ordering independent of Gateway restarts that reset the global counter.

**Alternatives considered**:
- Gateway session replay only: Insufficient — session data can be orphaned on restart (Issue #50288)
- Redis: Adds infrastructure for a single-operator dashboard
- In-memory ring buffer: Loses events on server restart

---

## Decision 4: SSE Enhancement with Last-Event-ID

**Decision**: Use the server-assigned `seq` as the SSE `id` field. Support `Last-Event-ID` header for automatic browser-driven catchup on reconnect. Add `GET /api/events/history` REST endpoint for initial page load.

**Rationale**: Standard SSE reconnection protocol — browsers handle it natively. Combined with the REST endpoint, covers both reconnection and fresh page load scenarios.

**Alternatives considered**:
- WebSocket to frontend: Bidirectional not needed, SSE sufficient
- Custom REST polling: Higher latency, more traffic

---

## Decision 5: Frontend Reconnection with Gateway-Aligned Backoff

**Decision**: Replace fixed 3s retry with exponential backoff matching OpenClaw's pattern: initial 1s, multiplier 2x, max interval 30s (aligned with Gateway's channel backoff), max 10 attempts. On reconnect success, refetch pipeline state via REST.

**Rationale**: Aligns with Gateway's own backoff (1s, 2s, 4s... 30s cap). 10 attempts covers ~5 minutes, long enough for transient issues. SSE Last-Event-ID handles event catchup; REST refetch ensures current state.

**Alternatives considered**:
- Control UI pattern (800ms initial, 1.7x, 15s cap): More aggressive, designed for local-only connections
- Fixed interval: No backoff = potential rate limiting

---

## Decision 6: Device Token Persistence & Rotation

**Decision**: The server persists the device token received from `hello-ok.auth.deviceToken` to a local file (`.openclaw-device-token` in the server's data directory). On reconnect, pass as `authDeviceToken`. Rotate via `device.token.rotate` RPC every 24 hours. Handle invalidation by falling back to token-based auth.

**Rationale**: Device tokens enable seamless reconnection (FR-002). File persistence survives server restarts. Rotation prevents expiry. Fallback handles Gateway restarts that invalidate tokens (Issue #28997).

**Alternatives considered**:
- Token in SQLite: Adds schema for a single value; file is simpler
- No rotation: Risk of silent expiry
- Re-auth every time: Defeats the purpose of device tokens

---

## Decision 7: Gap Detection and Recovery Strategy

**Decision**: Track the Gateway's `seq` on every event. On gap detection (received seq > expected seq + 1):
- Small gap (<=3 events): Log warning, fetch state via `chat.history` RPC, reset seq counter
- Large gap (>3 events): Full reconnect and session reload
- All gaps: Query local event store to check if the hook fallback already captured the missing events

**Rationale**: Matches the recommendation from Issue #25722. Small gaps are common during load and shouldn't trigger disruptive full reconnects. The local event store (Decision 3) provides a secondary recovery path.

**Alternatives considered**:
- Treat all gaps as fatal: Too disruptive for common transient gaps
- Ignore gaps: Violates FR-005 and SC-001

---

## Decision 8: Application-Level Keepalive

**Decision**: The server's WebSocket client sends a WebSocket ping frame every 30 seconds. It also monitors for Gateway `tick` events (emitted every 30s). If no `tick` received within 90 seconds (3 missed ticks), consider the connection dead and initiate reconnection.

**Rationale**: Compensates for OpenClaw's missing RFC 6455 ping/pong (Issue #17926). 30-second ping interval is within typical proxy timeout windows. 90-second dead detection allows for one missed tick before declaring failure.

**Alternatives considered**:
- Application-level JSON ping: Extra parsing; WebSocket native ping is simpler
- 15-second interval: Too aggressive, more traffic than needed
- 60-second interval: Risk of proxy timeout (typically 60-120s)

---

## Technology Stack (Confirmed)

| Layer | Technology |
|-------|-----------|
| Server runtime | Node.js + TypeScript |
| HTTP framework | Hono |
| WebSocket client (new) | `ws` npm package |
| Database | SQLite via better-sqlite3 + Drizzle ORM |
| Frontend framework | React 19 + Vite |
| Frontend styling | Tailwind CSS 4 |
| SSE streaming | Hono `streamSSE` |
| OpenClaw Gateway | Docker container on port 18789 |
| OpenClaw protocol | Version 3, WebSocket + HTTP |
