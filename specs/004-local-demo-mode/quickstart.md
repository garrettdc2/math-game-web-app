# Quickstart: Local Demo Mode

**Feature**: 004-local-demo-mode  
**Date**: 2026-04-06

## Prerequisites

- Node.js 20+
- Docker (for OpenClaw gateway)
- An Anthropic API key (`ANTHROPIC_API_KEY`)

That's it. No GitHub, Netlify, or Supabase accounts needed.

## Setup

1. Clone the repo and install dependencies:
   ```bash
   git clone <repo-url>
   cd minimum-viable-factory
   npm install
   ```

2. Create a minimal `.env` file:
   ```bash
   cp .env.example .env
   # Edit .env — only ANTHROPIC_API_KEY is required
   # Leave GITHUB_TOKEN, NETLIFY_TOKEN, SUPABASE_TOKEN blank or unset
   ```

3. Start the factory:
   ```bash
   docker compose up
   ```

   On startup, the factory will log:
   ```
   [config] Service modes:
   [config]   git:      local (no GITHUB_TOKEN)
   [config]   deploy:   local (no NETLIFY_TOKEN)
   [config]   database: local (no SUPABASE_TOKEN)
   ```

4. Open the dashboard at `http://localhost:8000`

## Running a Demo Pipeline

1. Click "New Pipeline" in the dashboard
2. Enter a task title and description (e.g., "Build a todo app")
3. Click "Start"
4. Watch the pipeline progress through stages: Spec → Architecture → Development → QA → Deploy
5. Approve gates when prompted (Spec Review, Architecture Review, QA Review)
6. When deploy completes, the dashboard shows a local URL (e.g., `http://localhost:3001`)
7. Open the URL to see the running app

## What Happens in Local Mode

| Stage | Cloud Mode | Local Mode |
| ----- | ---------- | ---------- |
| Development | Dev agent creates GitHub repo, branch, commits, opens PR | Dev agent creates local git repo, commits locally |
| Code Review | Reviewer reads PR diff via GitHub MCP | Reviewer reads workspace files directly |
| Testing | Tester pushes test files to GitHub branch | Tester writes tests in local workspace |
| Deploy | Deployer deploys to Netlify + Supabase | Deployer builds app and serves on local port |

## Switching to Cloud Mode

To use GitHub, Netlify, and Supabase:

1. Add tokens to `.env`:
   ```bash
   GITHUB_TOKEN=ghp_xxxxx
   NETLIFY_TOKEN=xxxxx
   SUPABASE_TOKEN=xxxxx
   ```

2. Restart the factory:
   ```bash
   docker compose down && docker compose up
   ```

3. New pipelines will use cloud services. Existing local pipelines remain in the dashboard.

## Partial Mode

You can mix local and cloud. For example, set only `GITHUB_TOKEN` to use GitHub for repos but deploy locally:

```bash
GITHUB_TOKEN=ghp_xxxxx
# NETLIFY_TOKEN not set — deploy locally
# SUPABASE_TOKEN not set — use local SQLite
```

## Troubleshooting

**App not accessible after deploy**: Check the port shown in the dashboard. Ensure nothing else is listening on that port. The factory assigns ports starting at 3001.

**Pipeline stuck at "blocked"**: Check the factory logs for OpenClaw connection issues. The OpenClaw gateway must be running (`docker compose up openclaw`).

**"ANTHROPIC_API_KEY not set" error**: This key is always required — it powers the AI agents. There is no local fallback for AI.
