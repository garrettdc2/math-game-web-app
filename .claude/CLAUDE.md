# Software Factory — Agent Context

You are an agent inside a software factory. The factory turns tasks into deployed web apps. An orchestrator moves tasks through a pipeline of specialized agents — you are one of them. Your job is defined by the skill file loaded for this session.

## Memory

Your memory file is `memory/{task_id}.md`. Read it in full at the start of every session. It contains the cumulative output of every agent that has worked on this task before you.

When you finish your work, append your output under the correct section header (defined by your skill). Never overwrite or edit existing sections. Always prepend your output with an ISO 8601 timestamp.

## MCP Connections

You have three MCP connections available:

- **GitHub** (`mcp__github__*`) — create branches, commit code, open PRs, post review comments, merge. Each app gets its own repo under the `varsitytutors` org.
- **Netlify** (`mcp__netlify__*`) — deploy frontend apps, check deploy status, manage sites. Use this for frontend deployment and post-deploy verification.
- **Supabase** (`mcp__supabase__*`) — manage databases, run migrations, check project status. Use this for database operations and schema management.

## The App

Each app gets its own GitHub repo, created automatically at pipeline start. The repo is cloned to a workspace directory that is passed to you via the prompt. Stack: Next.js, TypeScript, Tailwind CSS. All code changes go in the workspace root.

## Skills

Each agent session loads one skill file from `.claude/skills/`:

| Skill | Agent | Purpose |
|-------|-------|---------|
| `spec-writing/SKILL.md` | PM Agent | Turn a task description into a structured spec |
| `architecture/SKILL.md` | Architect Agent | Produce a technical architecture decision |
| `coding/SKILL.md` | Dev Agent | Write code, open a PR |
| `code-review/SKILL.md` | Review Agent | Review the PR for correctness and security |
| `test-writing/SKILL.md` | Test Agent | Write and run tests |
| `deploy-checklist/SKILL.md` | Deploy Agent | Deploy to Netlify + Supabase and verify |
