# Implementation Plan: Fix OpenClaw Connection Reliability

**Branch**: `001-fix-openclaw-connection` | **Date**: 2026-04-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-fix-openclaw-connection/spec.md`

## Summary

The dashboard's connection to OpenClaw drops events silently, shows stale state, and requires manual page refreshes. The root cause is that events flow through a fire-and-forget in-memory pub/sub with no persistence, no catchup, and no reliable reconnection. This plan adds server-side event persistence with sequence IDs, SSE Last-Event-ID catchup, hook-level retry with idempotency, and frontend exponential backoff with a connection status indicator.

## Technical Context

**Language/Version**: TypeScript (Node.js)  
**Primary Dependencies**: Hono (HTTP), React + Vite (frontend), Drizzle ORM + better-sqlite3 (database)  
**Storage**: SQLite (existing for pipeline state, extended with events table)  
**Testing**: Manual + integration (no test framework currently configured in openclaw-factory)  
**Target Platform**: Docker (server), Modern browsers (frontend)  
**Project Type**: Web application (full stack)  
**Performance Goals**: Event delivery within 5 seconds, catchup within 10 seconds for up to 500 events  
**Constraints**: Single-operator dashboard, SQLite sufficient for scale  
**Scale/Scope**: ~1-5 concurrent pipelines, ~50-200 events per pipeline lifecycle

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution file contains only placeholder template — no principles defined. No gates to enforce. **PASS** (vacuously).

Post-Phase 1 re-check: No constitution violations. Design uses existing stack (SQLite, Hono SSE, React), adds no new infrastructure. **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/001-fix-openclaw-connection/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: architecture research & decisions
├── data-model.md        # Phase 1: events table schema & state model
├── quickstart.md        # Phase 1: development guide
├── contracts/           # Phase 1: API contracts
│   ├── events-api.md    # Modified ingest, new history, modified SSE stream
│   └── dashboard-bridge-hook.md  # Hook retry & idempotency contract
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
openclaw-factory/
├── server/
│   ├── db/
│   │   └── schema.ts           # + events table definition
│   ├── lib/
│   │   └── store.ts            # + event persistence functions
│   └── routes/
│       └── events.ts           # + persist on ingest, + /events/history, + Last-Event-ID in SSE
├── hooks/
│   └── dashboard-bridge/
│       └── handler.ts          # + retry logic, + idempotency key generation
├── src/
│   ├── hooks/
│   │   ├── use-sse.ts          # + exponential backoff, + connection state, + lastEventSeq
│   │   └── use-pipelines.ts    # + refetch on reconnect
│   └── components/
│       └── connection-status.tsx  # NEW: connection health indicator
└── openclaw-config.json        # Hook timeout alignment (if needed)
```

**Structure Decision**: Existing openclaw-factory structure is maintained. Changes are modifications to existing files plus one new component. No new directories or architectural changes.

## Complexity Tracking

No constitution violations to justify.
