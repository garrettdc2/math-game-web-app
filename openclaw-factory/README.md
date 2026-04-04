# OpenClaw Factory — Experimental

Software factory pipeline built on OpenClaw. This is an experimental branch exploring whether OpenClaw can replace the custom Python orchestrator + dashboard.

## Quick Start

```bash
cd openclaw-factory
make start
# Dashboard: http://localhost:18789
# Token: factory-local-dev
```

## Trigger a Pipeline

Via webhook:
```bash
curl -X POST http://localhost:18789/hooks/agent \
  -H 'Authorization: Bearer factory-webhook-secret' \
  -H 'Content-Type: application/json' \
  -d '{"message": "Process task SFT-100: Build a todo app with authentication", "agentId": "factory"}'
```

Via dashboard: Open http://localhost:18789, select the `factory` agent, and type:
```
Process task SFT-100: Build a todo app with authentication
```

## Architecture

```
Jira webhook → POST /hooks/agent → OpenClaw Gateway → Factory Orchestrator
  → sessions_spawn → PM Agent (spec)
  → gate 1 (webhook resume)
  → sessions_spawn → Architect Agent
  → gate 2 (webhook resume)
  → sessions_spawn → Dev Agent(s) (parallel subtasks)
  → sessions_spawn → Reviewer + Tester (parallel)
  → gate 3 (webhook resume)
  → sessions_spawn → Deploy Agent
```

## Agents

| Agent | ID | Role |
|-------|----|------|
| Factory | `factory` | Pipeline orchestrator — spawns and coordinates all other agents |
| PM | `pm` | Writes structured specs from task descriptions |
| Architect | `architect` | Produces architecture decisions from specs |
| Dev | `dev` | Implements code, commits to branches, opens PRs |
| Reviewer | `reviewer` | Reviews PRs for correctness and security |
| Tester | `tester` | Writes and runs tests |
| Deployer | `deployer` | Merges PRs, deploys to Netlify + Supabase |

## Approval Gates

The pipeline pauses at 3 gates (after spec, architecture, and QA). To resume:

```bash
curl -X POST http://localhost:18789/hooks/agent \
  -H 'Authorization: Bearer factory-webhook-secret' \
  -H 'Content-Type: application/json' \
  -d '{"message": "Approved. Continue the pipeline.", "agentId": "factory"}'
```

## Memory

Shared memory files live in `memory/{task_id}.md`. Each agent appends its output under a specific section header. The orchestrator passes memory content to subagents so they have full context.
