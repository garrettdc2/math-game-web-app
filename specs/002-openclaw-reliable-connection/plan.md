# Implementation Plan: Reliable OpenClaw Dashboard Connection

**Branch**: `002-openclaw-reliable-connection` | **Date**: 2026-04-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-openclaw-reliable-connection/spec.md`

## Summary

The dashboard's connection to OpenClaw drops events silently, shows stale state, and requires manual refreshes. Root cause: events flow through a fire-and-forget in-memory pub/sub with no persistence, no reconnection, and no use of OpenClaw's native reliability features. This plan adds a server-side WebSocket client to the OpenClaw Gateway (leveraging native `seq` ordering, device tokens, and session replay), server-side event persistence in SQLite as a safety net, SSE Last-Event-ID catchup, hook-level retry with idempotency as a fallback channel, and frontend exponential backoff with a connection status indicator.

## Technical Context

**Language/Version**: TypeScript (Node.js)  
**Primary Dependencies**: Hono (HTTP), React 19 + Vite (frontend), Drizzle ORM + better-sqlite3 (database), `ws` (WebSocket client — new)  
**Storage**: SQLite (existing for pipeline state, extended with events table)  
**Testing**: Manual + integration (no test framework currently configured)  
**Target Platform**: Docker (server), Modern browsers (frontend)  
**Project Type**: Web application (full stack)  
**Performance Goals**: Event delivery within 5 seconds, catchup within 10 seconds for up to 500 events  
**Constraints**: Single-operator dashboard, SQLite sufficient for scale  
**Scale/Scope**: ~1-5 concurrent pipelines, ~50-200 events per pipeline lifecycle

**OpenClaw Gateway Protocol** (from docs.openclaw.ai):
- WebSocket on port 18789, protocol version 3
- Challenge-response handshake with device keypair signing
- Frame types: req/res/event with global monotonic `seq` and `stateVersion`
- Device tokens for seamless reconnection
- RPC methods: `chat.send`, `chat.history`, `sessions.list`, `exec.approval.resolve`, `device.token.rotate`
- Built-in `tick` events every 30s, `health` every 60s (no RFC 6455 ping/pong)
- No official Node.js client SDK — must implement with `ws` package

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution file contains only placeholder template — no principles defined. No gates to enforce. **PASS** (vacuously).

Post-Phase 1 re-check: Design adds one new dependency (`ws`), one new SQLite table, and one new server module. Uses existing stack patterns. No constitution violations. **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/002-openclaw-reliable-connection/
├── plan.md                           # This file
├── spec.md                           # Feature specification
├── research.md                       # Phase 0: architecture research & decisions
├── data-model.md                     # Phase 1: events table, connection state, device token models
├── quickstart.md                     # Phase 1: development guide & file change map
├── contracts/                        # Phase 1: API and protocol contracts
│   ├── gateway-client.md             # WebSocket Gateway client protocol
│   ├── events-api.md                 # Modified ingest/SSE, new history & status endpoints
│   └── dashboard-bridge-hook.md      # Hook retry & idempotency (fallback channel)
└── tasks.md                          # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
openclaw-factory/
├── server/
│   ├── db/
│   │   └── schema.ts                 # + events table definition
│   ├── lib/
│   │   ├── gateway-client.ts         # NEW: WebSocket client (handshake, seq, device tokens, RPC, keepalive)
│   │   ├── device-token.ts           # NEW: Device token file persistence & rotation
│   │   ├── event-store.ts            # NEW: Event persistence (insert/dedup, query by seq)
│   │   ├── openclaw.ts               # MODIFIED: Refactor to use Gateway RPC with HTTP fallback
│   │   ├── config.ts                 # MODIFIED: + DEVICE_TOKEN_PATH
│   │   ├── store.ts                  # MODIFIED: + event store init in initDb()
│   │   └── registry.ts               # UNCHANGED
│   ├── routes/
│   │   └── events.ts                 # MODIFIED: + persist on ingest, + /events/history, + Last-Event-ID, + /gateway/status
│   └── index.ts                      # MODIFIED: + gateway client init on startup
├── hooks/
│   └── dashboard-bridge/
│       └── handler.ts                # MODIFIED: + retry (3 attempts), + idempotency keys
├── src/
│   ├── hooks/
│   │   ├── use-sse.ts                # MODIFIED: + exponential backoff, + connection state, + lastEventSeq
│   │   └── use-pipelines.ts          # MODIFIED: + refetch on reconnect
│   ├── components/
│   │   └── connection-status.tsx      # NEW: connection health indicator
│   └── App.tsx                        # MODIFIED: + mount connection status
├── package.json                       # MODIFIED: + ws dependency
└── openclaw-config.json               # UNCHANGED (hook config stays as-is)
```

**Structure Decision**: Existing openclaw-factory structure maintained. Three new server modules (`gateway-client.ts`, `device-token.ts`, `event-store.ts`), one new frontend component. All other changes are modifications to existing files.

## Complexity Tracking

No constitution violations to justify.
