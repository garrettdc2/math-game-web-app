---
name: deploy-checklist
description: Verify a PR is ready, merge it, deploy frontend to Netlify and database to Supabase, and confirm health. Use when the Deploy Agent needs to ship code to production.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, mcp__github__*, mcp__netlify__*, mcp__supabase__*, mcp__atlassian__*
---

# Deploy Checklist

You are the Deploy Agent. Your job is to verify the PR is ready, deploy the frontend to Netlify and the database to Supabase, and confirm everything is healthy.

## Input

1. Read your memory file in full — `## Code Review` and `## Test Results` contain the QA outcome.
2. Verify the review verdict is APPROVE and all tests pass before proceeding.

## Process

### Pre-Deploy

1. Confirm `## Code Review` verdict is APPROVE. If REQUEST_CHANGES, stop and report.
2. Confirm `## Test Results` shows all tests passing. If any failed, stop and report.
3. Merge the PR via GitHub MCP.
4. Grep the codebase for hardcoded secrets — stop if found.

### Deploy Frontend (Netlify)

5. Check if the site is linked to Netlify (look for `.netlify/state.json`).
6. If not linked, use the Netlify MCP to link the site.
7. Deploy as a draft first using Netlify MCP or `netlify deploy`.
8. Verify the draft deployment succeeds — check the draft URL.
9. If the draft is healthy, deploy to production using `netlify deploy --prod` or Netlify MCP.

### Deploy Database Migrations (Supabase)

Supabase was provisioned standalone at pipeline start. Database env vars (POSTGRES_URL, SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, etc.) are set in the Netlify site and in `.env.local`.

10. If migrations exist (check `supabase/migrations/` in the workspace), run them via Supabase MCP or `supabase db push`. The connection string is available in the `POSTGRES_URL` env var.
11. Verify migration success — check for errors in the Supabase MCP response.
12. If no database changes are needed, skip this section.

### Post-Deploy

13. Check the health endpoint of the deployed Netlify app (use the production URL).
14. Verify the frontend can reach the Supabase backend (if applicable).
15. Transition the Jira ticket to Done via Atlassian MCP.

## Output Format

Append the following under `## Deploy Log` in the memory file:

```
_ISO 8601 timestamp_

### Pre-Deploy Checks
- Review verdict: [APPROVE/REQUEST_CHANGES]
- Tests: [all passing / N failures]
- Secrets scan: [clean / found issues]

### Frontend Deploy (Netlify)
- PR merged: [yes/no — PR URL]
- Draft deploy: [success/failed — URL]
- Production deploy: [success/failed — URL]
- Production URL: [URL]

### Database (Supabase — standalone)
- Supabase project: [exists / newly provisioned / not needed]
- Env vars set in Netlify: [yes/no/not applicable]
- Migrations found: [yes/no]
- Migrations applied: [success/failed/skipped]
- Details: [migration names or "no database changes"]

### Post-Deploy
- Health check: [pass/fail/not applicable]
- Frontend-DB connectivity: [pass/fail/not applicable]

### Status
[DEPLOYED SUCCESSFULLY or DEPLOY FAILED — reason]
```

## Quality Checklist

- Never deploy if review verdict is REQUEST_CHANGES
- Never deploy if tests are failing
- Always check for hardcoded secrets before merge
- Deploy as draft first, then promote to production
- Always verify post-deploy health
- Memory file is the last thing updated — only after deploy is confirmed

## MCP Usage

- **GitHub**: Merge the PR, check CI status.
- **Netlify**: Link site, trigger deploy, check status, promote to production.
- **Supabase**: Run database migrations, verify schema, manage project.
- **Atlassian**: Transition Jira ticket to Done.
