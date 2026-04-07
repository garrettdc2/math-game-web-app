---
name: deploy-checklist
description: Verify a PR is ready, merge it, deploy frontend to Netlify and database to Supabase, and confirm health. Use when the Deploy Agent needs to ship code to production.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, mcp__github__*, mcp__netlify__*, mcp__supabase__*
---

# Deploy Checklist

You are the Deploy Agent. Your job is to verify the PR is ready, deploy the frontend to Netlify and the database to Supabase, and confirm everything is healthy.

## Input

1. Read your memory file in full — `## Code Review` and `## Test Results` contain the QA outcome.
2. Verify the review verdict is APPROVE and all tests pass before proceeding.

## Local Mode

If the memory file contains `## Service Modes` with any service set to `local`, follow these rules. They **override** the cloud Process section below.

### git: local

- Do NOT merge a PR or check CI — there is no GitHub remote.
- Still grep the workspace for hardcoded secrets.

### database: local

- Do NOT use Supabase. The app uses SQLite with `DATABASE_URL=file:./data.db`.
- Skip all Supabase migration steps.

### deploy: local — MANDATORY STEPS (do ALL of these in order)

Skip ALL Netlify steps. Instead, do exactly this:

**Step 1 — Build the app:**
```bash
cd /root/workspace/{task_id}
npm install && npm run build
```

**Step 2 — Find the next available port:**

Scan existing deploy manifests to find the next free port:
```bash
USED_PORTS=$(cat /root/deploys/*.json 2>/dev/null | grep '"port"' | sed 's/[^0-9]//g' | sort -n)
PORT=3001
while echo "$USED_PORTS" | grep -q "^${PORT}$"; do
  PORT=$((PORT + 1))
done
if [ "$PORT" -gt 3010 ]; then
  echo "[PIPELINE:{task_id}:error:No deploy ports available (3001-3010 all occupied)]"
  exit 1
fi
echo "Using port $PORT"
```

NEVER use port 3000 or 4173.

**Step 3 — Determine the start command:**

Pick ONE based on project type:
```bash
# If .next/ directory exists after build (Next.js):
START_CMD="npx next start"

# If vite.config.ts exists (Vite):
START_CMD="npx vite preview --host 0.0.0.0"

# Otherwise (static build in out/ or dist/ or build/):
START_CMD="npx serve out -l \$PORT -s"
# (replace "out" with whichever directory has index.html)
```

**Step 4 — Write the deploy manifest:**

This is the critical step. Write a JSON manifest file — the deploy supervisor will start the app automatically.

```bash
cat > /root/deploys/{task_id}.json << EOF
{
  "task_id": "{task_id}",
  "workspace": "/root/workspace/{task_id}",
  "port": $PORT,
  "start_cmd": "$START_CMD",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "pending"
}
EOF
```

Do NOT start the server yourself with `&`. The supervisor handles process management.

**Step 5 — Wait for the supervisor to start the app:**

The supervisor polls for new manifests every 10 seconds. Wait up to 30 seconds:
```bash
for i in 1 2 3 4 5 6; do
  sleep 5
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT 2>/dev/null)
  if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 400 ]; then
    echo "App is live on port $PORT (HTTP $HTTP_CODE)"
    break
  fi
  echo "Waiting for supervisor to start app... (attempt $i)"
done
```

**Step 6 — Emit the deploy marker:**

This is the most important step. You MUST output this exact text on its own line in your response:

[DEPLOY:local:PORT]

Replace PORT with the actual port number (e.g., 3001). This marker tells the dashboard where the app is. Without it, the user cannot access the app. Do NOT skip this step. Do NOT put it only in the memory file — it MUST be in your chat response text.

**Step 7 — Write to memory:**

Also record the URL in the memory file under `## Deploy`:
```
- **URL**: http://localhost:{PORT}
- **Mode**: local
- **Manifest**: /root/deploys/{task_id}.json
```

If all modes are "cloud", ignore this section and follow the standard cloud process below.

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
