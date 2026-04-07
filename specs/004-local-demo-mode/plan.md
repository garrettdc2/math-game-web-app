# Implementation Plan: Local Demo Mode

**Branch**: `004-local-demo-mode` | **Date**: 2026-04-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-local-demo-mode/spec.md`

## Summary

Make the factory self-contained for demos by detecting missing cloud tokens (GitHub, Netlify, Supabase) at startup and falling back to local alternatives: local git repos, local static file serving, and local SQLite databases. The core change is a service-mode detection layer at startup, conditional MCP server configuration per agent, conditional instructions in agent skill files, and a local deployment manager that builds and serves apps on auto-assigned ports.

## Technical Context

**Language/Version**: TypeScript 5.8 (Node.js)  
**Primary Dependencies**: Hono (HTTP server), Drizzle ORM + better-sqlite3, React 19 + Vite (dashboard), ws (WebSocket client)  
**Storage**: SQLite (existing pipeline state DB, extended with deployment tracking)  
**Testing**: Manual integration testing (existing pattern — no test framework in place)  
**Target Platform**: macOS / Linux (local development)  
**Project Type**: Web service + agent orchestration platform  
**Performance Goals**: Demo-quality — apps should be accessible within 30 seconds of deploy stage  
**Constraints**: Must not break existing cloud mode. Must not require any config file changes to switch modes.  
**Scale/Scope**: 1-3 concurrent local demo apps; single developer

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution file is unpopulated (template placeholders only). No gates to enforce. **PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/004-local-demo-mode/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
openclaw-factory/
├── server/
│   ├── lib/
│   │   ├── config.ts              # MODIFY — add service mode detection
│   │   ├── local-deploy.ts        # NEW — local deployment manager (build, serve, port allocation)
│   │   ├── local-repo.ts          # NEW — local git repo initialization
│   │   └── store.ts               # MODIFY — persist deployment URLs
│   ├── routes/
│   │   └── pipeline.ts            # MODIFY — populate workspace_path and repo info for local mode
│   └── db/
│       └── schema.ts              # MODIFY — add deploy_url and deploy_mode fields
│
├── agents/
│   ├── dev/
│   │   ├── .claude/settings.json           # MODIFY — conditionally exclude GitHub MCP
│   │   └── skills/coding/SKILL.md          # MODIFY — add local-mode instructions
│   ├── deployer/
│   │   ├── .claude/settings.json           # MODIFY — conditionally exclude all MCPs
│   │   └── skills/deploy-checklist/SKILL.md # MODIFY — add local build/serve instructions
│   ├── reviewer/
│   │   ├── .claude/settings.json           # MODIFY — conditionally exclude GitHub MCP
│   │   └── skills/code-review/SKILL.md     # MODIFY — add local-mode review instructions
│   ├── tester/
│   │   ├── .claude/settings.json           # MODIFY — conditionally exclude GitHub MCP
│   │   └── skills/test-writing/SKILL.md    # MODIFY — add local-mode test instructions
│   ├── architect/
│   │   └── skills/architecture/SKILL.md    # MODIFY — note local mode constraints
│   └── factory/
│       └── skills/run-pipeline/SKILL.md    # MODIFY — pass service mode context to agents
│
├── scripts/
│   └── generate-agent-settings.ts  # NEW — generate settings.json per agent based on available tokens
│
└── src/
    ├── pages/
    │   └── pipeline.tsx            # MODIFY — display local URL when in local deploy mode
    └── components/
        └── deploy-status.tsx       # NEW — show local vs cloud deploy status
```

**Structure Decision**: Follows existing project structure. New files are minimal — two server-side modules for local repo/deploy management, one script for dynamic agent settings, and one small UI component. No new directories except `scripts/`.

## Complexity Tracking

No constitution violations to justify.
