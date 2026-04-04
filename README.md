# Nerdy Software Factory

Task in, deployed web app out. The full SDLC — spec, architecture, code, review, tests, deploy — handled by Claude Code agents orchestrated through [OpenClaw](https://openclaw.com). You approve at three human gates via the dashboard.

**TypeScript end-to-end. Hono server, React 19 dashboard, Drizzle + SQLite persistence, WebSocket link to the OpenClaw gateway. 7 agents. 6 skills. 3 MCPs.**

## How It Works

```
Start pipeline via dashboard or API
        |
Create GitHub repo + Netlify site + Supabase project
        |
PM Agent writes spec --> memory file
        |
[GATE 1] Approve spec
        |
Architect Agent writes technical plan + subtasks
        |
[GATE 2] Approve architecture
        |
N x Dev Agents run in parallel (one per subtask, same branch)
        |
Single PR opened with all changes
        |
Review Agent + Test Agent run in parallel
        |
[GATE 3] Approve code quality
        |
Deploy Agent ships to Netlify + Supabase
        |
Done -- deployed app live
```

Each agent is a Claude Code session running inside the OpenClaw gateway. Agents read a shared append-only memory file, follow their skill instructions, and write their output back. No agent-to-agent chatter — the memory file is the only shared state.

## Architecture

```
openclaw-factory/
  server/                      # Hono HTTP + WebSocket server
    index.ts                   # Entry point, marker parsing, SSE bus
    db/schema.ts               # Drizzle ORM schemas (pipelines, events)
    lib/
      gateway-client.ts        # WebSocket client to OpenClaw gateway
      store.ts                 # SQLite persistence (pipelines)
      event-store.ts           # Event persistence + deduplication
      registry.ts              # In-memory pipeline state
      openclaw.ts              # OpenClaw RPC/HTTP API
      memory.ts                # Memory file management
      audit.ts                 # Append-only audit logging
      config.ts                # Config from env vars
      device-token.ts          # Gateway device token
    routes/
      pipeline.ts              # Pipeline CRUD + gate approval
      events.ts                # SSE streaming + event ingest webhook
      health.ts                # Health check
  src/                         # React 19 + Vite frontend
    pages/
      dashboard.tsx            # Pipeline list, filters, pending gates
      pipeline.tsx             # Single pipeline detail + approval
      new-pipeline.tsx         # Start a new pipeline
    hooks/
      use-sse.ts               # SSE with reconnect + deduplication
      use-pipelines.ts         # Real-time pipeline state
    components/                # Gate panel, stage stepper, memory viewer, etc.
  agents/                      # OpenClaw agent workspaces
    factory/                   # Orchestrator agent
    pm/                        # Product Manager
    architect/                 # Technical Architect
    dev/                       # Developer (N parallel)
    reviewer/                  # Code Reviewer
    tester/                    # Test Writer
    deployer/                  # Deploy + Verify
  hooks/
    dashboard-bridge/          # Parses [STAGE:...] markers -> POST /events/ingest
    jira-trigger/              # Jira webhook -> pipeline start
  openclaw-config.json         # Gateway, agent, tool, hook config
  docker-compose.yml           # OpenClaw gateway + dashboard
  package.json                 # Dependencies
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Server | Node.js + [Hono](https://hono.dev) |
| Database | SQLite via [Drizzle ORM](https://orm.drizzle.team) + better-sqlite3 |
| Frontend | React 19 + [Vite](https://vite.dev) + Tailwind CSS 4 |
| Agent orchestration | [OpenClaw](https://openclaw.com) gateway (WebSocket) |
| Real-time | Server-Sent Events (SSE) with Last-Event-ID catchup |
| AI | Claude Code via Anthropic API |
| Deploy targets | GitHub + Netlify + Supabase |

## Try It

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- API keys for [Anthropic](https://console.anthropic.com/), [GitHub](https://github.com/), [Netlify](https://www.netlify.com/), [Supabase](https://supabase.com/)

### 1. Clone and configure

```bash
git clone https://github.com/varsitytutors/nerdy-software-factory-ai-day.git
cd nerdy-software-factory-ai-day
cp .env.example .env
```

Fill in `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
GITHUB_ORG=your-org
NETLIFY_TOKEN=...
NETLIFY_TEAM_SLUG=your-team
SUPABASE_TOKEN=...
OPENCLAW_BASE_URL=http://localhost:18789
OPENCLAW_HOOK_TOKEN=factory-webhook-secret
```

### 2. Start the factory

**With Docker (recommended):**

```bash
cd openclaw-factory
docker compose up --build
```

This starts the OpenClaw gateway (:18789) and the dashboard server (:8000).

**Local development:**

```bash
cd openclaw-factory
npm install
npm run dev
```

The Hono server starts on :3001 and the Vite dev server on :5173 (with proxy to the API).

Verify:

```bash
curl http://localhost:8000/api/health
# {"status":"ok"}
```

### 3. Start a pipeline

```bash
curl -X POST http://localhost:8000/api/pipeline/start \
  -H "Content-Type: application/json" \
  -d '{"task_id": "TASK-1", "title": "Build a todo app"}'
```

Or use the dashboard at **http://localhost:8000** and click "New Pipeline".

### 4. Approve gates

Gates appear in the dashboard with approve/reject buttons. Or use the API:

```bash
# Check pending gates
curl http://localhost:8000/api/gates/pending

# Approve with feedback
curl -X POST http://localhost:8000/api/pipeline/approve/TASK-1/gate_1_spec_review \
  -H "Content-Type: application/json" \
  -d '{"approved": true, "feedback": "Add dark mode support"}'

# Reject
curl -X POST http://localhost:8000/api/pipeline/approve/TASK-1/gate_1_spec_review \
  -H "Content-Type: application/json" \
  -d '{"approved": false, "feedback": "Scope is too large"}'
```

### 5. Monitor progress

The dashboard shows real-time pipeline progress via SSE. Or use the API:

```bash
curl http://localhost:8000/api/pipeline/status/TASK-1
curl http://localhost:8000/api/pipeline/list
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/pipeline/start` | Start a new pipeline |
| GET | `/api/pipeline/status/{task_id}` | Get pipeline status |
| GET | `/api/pipeline/list` | List all pipelines |
| POST | `/api/pipeline/approve/{task_id}/{gate_name}` | Approve or reject a gate |
| GET | `/api/gates/pending` | List gates awaiting approval |
| POST | `/api/pipeline/{task_id}/abort` | Abort a running pipeline |
| POST | `/api/pipeline/{task_id}/retry/{stage}` | Retry from a specific stage |
| GET | `/api/events/stream` | SSE event stream (supports Last-Event-ID) |
| GET | `/api/events/history` | Query event history |
| GET | `/api/gateway/status` | OpenClaw gateway connection status |
| POST | `/api/events/ingest` | Webhook for dashboard-bridge hook |

**Gate names:** `gate_1_spec_review`, `gate_2_arch_review`, `gate_3_qa_review`

## Agents

| Agent | Skill | Role |
|-------|-------|------|
| Factory | `run-pipeline` | Orchestrator — spawns and sequences all other agents |
| PM | `spec-writing` | Writes structured specs from task descriptions |
| Architect | `architecture` | Produces technical plans, decomposes into subtasks |
| Dev | `coding` | Implements code, commits to branch, opens PR (N parallel) |
| Reviewer | `code-review` | Reviews PR for correctness, security, conventions |
| Tester | `test-writing` | Writes and runs tests against the PR |
| Deployer | `deploy-checklist` | Deploys to Netlify + Supabase, verifies health |

## Connection Resilience

The factory is built for reliable event delivery between the OpenClaw gateway and the dashboard:

- **Server-side**: WebSocket client with exponential backoff reconnection (1s to 30s, 10 attempts)
- **Client-side**: SSE with `Last-Event-ID` header for automatic catchup on reconnect
- **Deduplication**: Events keyed by SHA-256 idempotency hash, deduplicated at both server and client
- **Persistence**: All events stored in SQLite for recovery after restarts

## License

MIT
