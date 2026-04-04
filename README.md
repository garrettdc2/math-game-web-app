# Minimum Viable Factory

Task in, deployed web app out. The full SDLC — spec, architecture, code, review, tests, deploy — handled by Claude Code agents running in parallel. You approve at three gates via the OpenClaw dashboard.

**~500 lines of Python across 12 modules. 6 skills. 3 MCPs. You can read every file in one sitting.**

Right now this factory greenfields web apps from idea to production. You describe what you want, agents build and deploy it from scratch. Each app gets its own GitHub repo. Large tasks are automatically decomposed into subtasks and built in parallel.

## How It Works

```
Start pipeline via dashboard or API
        |
Create GitHub repo + Netlify site + Supabase project
        |
PM Agent writes spec --> memory file
        |
[GATE 1] 🟡 Approve in OpenClaw dashboard
        |   🟢 Approved (with optional feedback)
        |
Architect Agent writes technical plan + subtasks
        |
[GATE 2] 🟡 Approve in OpenClaw dashboard
        |   🟢 Approved (with optional feedback)
        |
Decompose: parse subtasks from architecture
        |
N × Dev Agents run in parallel (one per subtask, same branch)
        |
Single PR opened with all changes
        |
Review Agent + Test Agent run in parallel
        |
[GATE 3] 🟡 Approve in OpenClaw dashboard
        |   🟢 Approved (with optional feedback)
        |
Deploy Agent ships to Netlify + Supabase
        |
🟢 Done — deployed app live
```

Each agent is a Claude Code session. It reads the full memory file, follows its skill instructions, appends its output, and moves on. No agent-to-agent chatter. The memory file is the only shared state.

## Try It

### What you need

- [Docker](https://docs.docker.com/get-docker/) (or Python 3.12+ and Node.js 22.16+)
- API keys for [Anthropic](https://console.anthropic.com/), [GitHub](https://github.com/), [Netlify](https://www.netlify.com/), [Supabase](https://supabase.com/)
- [LangSmith](https://smith.langchain.com/) (optional, for tracing)

### 1. Clone and add your keys

```bash
git clone https://github.com/varsitytutors/nerdy-software-factory.git
cd nerdy-software-factory
cp .env.example .env
```

Fill in `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
GITHUB_ORG=your-org-or-username
NETLIFY_TOKEN=...
NETLIFY_TEAM_SLUG=your-netlify-team
SUPABASE_TOKEN=...
LANGCHAIN_API_KEY=lsv2_...          # optional
LANGCHAIN_PROJECT=your-project-name  # optional
LANGCHAIN_TRACING_V2=true            # optional
```

### 2. Start the factory

**With Docker (recommended):**

```bash
docker compose up --build
```

This starts both the factory server (:8000) and the OpenClaw gateway + dashboard (:18789).

**Local development:**

```bash
pip install -r requirements.txt
npm install -g openclaw@latest
make start
```

Verify:

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

Open the OpenClaw dashboard at **http://localhost:18789**.

### 3. Start a pipeline

```bash
curl -X POST http://localhost:8000/pipeline/start \
  -H "Content-Type: application/json" \
  -d '{"task_id": "TASK-1", "title": "Build a todo app"}'
```

The factory creates a GitHub repo, Netlify site, and Supabase project, then the PM Agent writes a spec.

### 4. Approve gates

Check pending gates:

```bash
curl http://localhost:8000/gates/pending
```

Approve with optional feedback:

```bash
curl -X POST http://localhost:8000/pipeline/approve/TASK-1/gate_1_spec_review \
  -H "Content-Type: application/json" \
  -d '{"approved": true, "feedback": "Looks good, but add dark mode support"}'
```

Or reject:

```bash
curl -X POST http://localhost:8000/pipeline/approve/TASK-1/gate_1_spec_review \
  -H "Content-Type: application/json" \
  -d '{"approved": false, "feedback": "Scope is too large, simplify"}'
```

### 5. Monitor progress

```bash
# Check pipeline status
curl http://localhost:8000/pipeline/status/TASK-1

# List all active pipelines
curl http://localhost:8000/pipeline/list
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/pipeline/start` | Start a new pipeline |
| GET | `/pipeline/status/{task_id}` | Get pipeline status |
| GET | `/pipeline/list` | List all active pipelines |
| POST | `/pipeline/approve/{task_id}/{gate_name}` | Approve or reject a gate |
| GET | `/gates/pending` | List gates waiting for approval |

**Gate names:** `gate_1_spec_review`, `gate_2_arch_review`, `gate_3_qa_review`

## What's Inside

```
orchestrator/
  __init__.py                # Exports FastAPI app
  config.py                  # Env vars, paths, constants
  state.py                   # Pipeline state dataclass
  audit.py                   # Append-only audit logging
  memory.py                  # Memory file init, read, append
  gates.py                   # asyncio.Event-based approval gates
  agent_runner.py            # Core agent runner (claude-agent-sdk)
  pipeline.py                # Sequential pipeline runner
  api.py                     # FastAPI REST endpoints
  nodes/
    __init__.py              # Re-exports all node functions
    agents.py                # PM, Architect, Review, Test, Deploy nodes
    dev.py                   # Decompose + parallel dev execution
    terminal.py              # Done and blocked handlers
memory/
  _template.md               # Bootstrapped for each new task
  {task-id}.md               # One file per task, append-only
.claude/
  CLAUDE.md                  # Master context for all agent sessions
  settings.json              # MCP server configuration (GitHub, Netlify, Supabase)
  skills/
    spec-writing/SKILL.md    # How to write a spec
    architecture/SKILL.md    # How to plan implementation
    coding/SKILL.md          # How to write code and open a PR
    code-review/SKILL.md     # How to review a PR
    test-writing/SKILL.md    # How to write and run tests
    deploy-checklist/SKILL.md # How to deploy and verify
audit/
  YYYY-MM-DD.log             # Every factory event, append-only
workspace/
  {task-id}/                 # Cloned app repo per task (gitignored)
Dockerfile
docker-compose.yml
Makefile
```

## License

MIT
