# minimum-viable-factory Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-07

## Active Technologies
- TypeScript (Node.js) + Hono (HTTP), React 19 + Vite (frontend), Drizzle ORM + better-sqlite3 (database), `ws` (WebSocket client — new) (002-openclaw-reliable-connection)
- SQLite (existing for pipeline state, extended with events table) (002-openclaw-reliable-connection)
- TypeScript 5.8, React 19.1 + Vite 6.3, Tailwind CSS 4.1, Radix UI, Lucide React, class-variance-authority (003-nexus-slate-ui-refactor)
- N/A (visual-only refactor) (003-nexus-slate-ui-refactor)
- TypeScript 5.8 (Node.js) + Hono (HTTP server), Drizzle ORM + better-sqlite3, React 19 + Vite (dashboard), ws (WebSocket client) (004-local-demo-mode)
- SQLite (existing pipeline state DB, extended with deployment tracking) (004-local-demo-mode)
- TypeScript 5.8 (Node.js 20) — dashboard server + frontend; Shell (POSIX sh) — container supervisor scrip + Hono (HTTP), React 19 + Vite (frontend), Drizzle ORM + better-sqlite3 (DB), ws (WebSocket) (005-persistent-local-deploy)
- SQLite (existing `pipelines.db` in named volume `dashboard-data`); JSON manifest files (new, on bind-mounted volume) (005-persistent-local-deploy)

- (001-fix-openclaw-connection)

## Project Structure

```text
src/
tests/
```

## Commands

# Add commands for 

## Code Style

: Follow standard conventions

## Recent Changes
- 005-persistent-local-deploy: Added TypeScript 5.8 (Node.js 20) — dashboard server + frontend; Shell (POSIX sh) — container supervisor scrip + Hono (HTTP), React 19 + Vite (frontend), Drizzle ORM + better-sqlite3 (DB), ws (WebSocket)
- 004-local-demo-mode: Added TypeScript 5.8 (Node.js) + Hono (HTTP server), Drizzle ORM + better-sqlite3, React 19 + Vite (dashboard), ws (WebSocket client)
- 003-nexus-slate-ui-refactor: Added TypeScript 5.8, React 19.1 + Vite 6.3, Tailwind CSS 4.1, Radix UI, Lucide React, class-variance-authority


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
