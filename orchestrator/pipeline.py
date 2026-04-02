"""Pipeline runner — starts or resumes the LangGraph pipeline for a ticket."""

import asyncio
import re
import time

from langsmith import traceable
from langgraph.types import Command

from orchestrator.config import AGENT_TIMEOUT, GITHUB_ORG, NETLIFY_TEAM_SLUG, WORKSPACE_DIR, logger
from orchestrator.state import FactoryState, STATE_MAP
from orchestrator.audit import audit_log
from orchestrator.memory import append_memory
from orchestrator.slack import post_slack
from orchestrator.jira import (
    update_issue_state,
    ensure_stage_sub_issues,
    get_issue_id,
    comment_on_issue,
)

# Track threads with an active pipeline run to prevent concurrent updates
_active_threads: set[str] = set()

# Map ticket_id -> current LangGraph thread_id (changes on rework)
_thread_ids: dict[str, str] = {}

# The compiled graph — set by api.py during lifespan startup
graph = None

# Ordered pipeline stages — used to detect backward moves
STAGE_ORDER = ["In Spec", "In Arch", "In Dev", "In QA", "In Deploy"]

# Which status each gate expects to proceed
GATE_EXPECTS: dict[str, str] = {
    "gate_1": "In Arch",
    "gate_2": "In Dev",
    "gate_3": "In Deploy",
}


def _get_thread_id(ticket_id: str) -> str:
    return _thread_ids.get(ticket_id, ticket_id)


def _slugify(title: str) -> str:
    """Turn a ticket title into a valid GitHub repo name."""
    slug = title.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug[:60] or "app"


@traceable(run_type="chain", name="create_app_infra")
async def create_app_infra(ticket_id: str, title: str) -> tuple[str, str]:
    """Create a GitHub repo, Netlify site, and Supabase project for the app.

    Returns (repo_full_name, workspace_path).
    """
    repo_name = _slugify(title)
    repo_full = f"{GITHUB_ORG}/{repo_name}"
    workspace = WORKSPACE_DIR / ticket_id
    workspace.mkdir(parents=True, exist_ok=True)

    try:
        from claude_agent_sdk import query as claude_query, ClaudeAgentOptions

        options = ClaudeAgentOptions(
            cwd=str(workspace),
            permission_mode="bypassPermissions",
            allowed_tools=["Bash", "mcp__github__*", "mcp__netlify__*", "mcp__supabase__*"],
        )
        prompt = (
            f"Set up the infrastructure for a new app. Do these steps in order:\n\n"
            f"## 1. Create GitHub repo\n\n"
            f"Use the GitHub MCP to create a new repository:\n"
            f"- Owner: `{GITHUB_ORG}`\n"
            f"- Name: `{repo_name}`\n"
            f"- Description: `{title} (built by software factory from {ticket_id})`\n"
            f"- Private: false\n"
            f"- Auto-init: true (so it has a default branch)\n\n"
            f"Then clone it: `git clone https://github.com/{repo_full}.git .`\n\n"
            f"If the repo already exists, just clone it.\n\n"
            f"## 2. Create Netlify site\n\n"
            f"Use the Netlify MCP to create a new site:\n"
            f"- Name: `{repo_name}`\n"
            f"- Account/team slug: `{NETLIFY_TEAM_SLUG}`\n"
            f"- Link it to the GitHub repo `{repo_full}`\n"
            f"- Framework: Next.js\n\n"
            f"IMPORTANT: The site MUST be created under the `{NETLIFY_TEAM_SLUG}` team, "
            f"not a personal account.\n\n"
            f"If the site already exists, skip this step.\n\n"
            f"## 3. Provision Supabase\n\n"
            f"Use the Supabase MCP to create a new project:\n"
            f"- Name: `{repo_name}`\n"
            f"- Get the project URL, anon key, and database connection string.\n\n"
            f"If a Supabase project already exists for this app, skip creation.\n\n"
            f"## 4. Set env vars\n\n"
            f"Set the Supabase env vars on the Netlify site using the Netlify MCP "
            f"or `netlify env:set`:\n"
            f"- `NEXT_PUBLIC_SUPABASE_URL`\n"
            f"- `NEXT_PUBLIC_SUPABASE_ANON_KEY`\n"
            f"- `SUPABASE_SERVICE_ROLE_KEY`\n"
            f"- `POSTGRES_URL` (database connection string)\n\n"
            f"Also write a `.env.local` file in the workspace with the same vars "
            f"so agents can use them during development.\n\n"
            f"Confirm everything is ready with `git status`."
        )
        async for _ in claude_query(prompt=prompt, options=options):
            pass
    except ImportError:
        logger.warning("claude-agent-sdk not available, stubbing infra creation")
        workspace.mkdir(parents=True, exist_ok=True)

    # Post infra creation to Jira
    issue_info = await get_issue_id(ticket_id)
    if issue_info:
        await comment_on_issue(
            issue_info["id"],
            f"⚪ **Infrastructure provisioned:**\n\n"
            f"- GitHub repo: [`{repo_full}`](https://github.com/{repo_full})\n"
            f"- Netlify site: `{repo_name}` (linked to repo)\n"
            f"- Supabase: standalone project provisioned (env vars set in Netlify)",
        )

    audit_log(ticket_id, "infra_created", repo_full)
    return repo_full, str(workspace)


async def handle_timeout(ticket_id: str) -> None:
    minutes = AGENT_TIMEOUT // 60
    error_msg = f"Agent timed out after {minutes} minutes"
    append_memory(ticket_id, "Error", error_msg)
    await update_issue_state(ticket_id, "Blocked")

    issue_info = await get_issue_id(ticket_id)
    if issue_info:
        await comment_on_issue(
            issue_info["id"],
            f"🔴 **Pipeline timed out** after {minutes} minutes.\n\n"
            f"The ticket has been moved to **Blocked**. "
            f"Check the memory file and audit log for details on where the agent stalled.",
        )

    await post_slack(
        f":warning: `{ticket_id}` — agent timed out after {minutes} minutes. Ticket moved to Blocked."
    )
    audit_log(ticket_id, "timeout", f"{minutes} minute limit exceeded")


async def handle_error(ticket_id: str, error: str) -> None:
    append_memory(ticket_id, "Error", f"Pipeline error: {error}")
    await update_issue_state(ticket_id, "Blocked")

    issue_info = await get_issue_id(ticket_id)
    if issue_info:
        await comment_on_issue(
            issue_info["id"],
            f"🔴 **Pipeline error** — ticket moved to **Blocked**.\n\n"
            f"```\n{error[:500]}\n```",
        )

    await post_slack(f":x: `{ticket_id}` — pipeline error: {error}")
    audit_log(ticket_id, "error", error)


def _is_rework(incoming: str, paused_at: str) -> bool:
    """Return True if incoming status is not the expected forward move for the paused gate."""
    if not paused_at or paused_at not in GATE_EXPECTS:
        return False
    return incoming != GATE_EXPECTS[paused_at] and incoming != "Blocked"


@traceable(run_type="chain", name="run_pipeline")
async def run_pipeline(ticket_id: str, title: str, state_name: str) -> None:
    if ticket_id in _active_threads:
        audit_log(ticket_id, "pipeline_skip", f"already running, ignoring {state_name}")
        return
    _active_threads.add(ticket_id)

    thread_id = _get_thread_id(ticket_id)
    config = {"configurable": {"thread_id": thread_id}}

    try:
        existing = await graph.aget_state(config)

        if existing and existing.values and existing.tasks:
            # Pipeline is paused at an interrupt — check if this is rework
            paused_at = existing.tasks[0].name if existing.tasks else ""

            if _is_rework(state_name, paused_at):
                # Rework: start a fresh graph run from the target stage
                await _start_rework(ticket_id, title, state_name, existing.values)
            else:
                # Normal resume (forward move or blocked)
                audit_log(ticket_id, "pipeline_resume", state_name)
                await asyncio.wait_for(
                    graph.ainvoke(Command(resume=state_name), config),
                    timeout=AGENT_TIMEOUT,
                )
        else:
            # New ticket — create infra, stage sub-issues, then start pipeline
            repo_full, workspace_path = await create_app_infra(ticket_id, title)
            stage_subs = await ensure_stage_sub_issues(ticket_id)

            initial: FactoryState = {
                "ticket_id": ticket_id,
                "title": title,
                "current_state": state_name,
                "error": "",
                "parent_issue_id": "",
                "subtasks": [],
                "stage_sub_issues": stage_subs,
                "repo_name": repo_full,
                "workspace_path": workspace_path,
            }
            audit_log(ticket_id, "pipeline_start", f"{state_name} repo={repo_full}")
            await asyncio.wait_for(
                graph.ainvoke(initial, config),
                timeout=AGENT_TIMEOUT,
            )

        audit_log(ticket_id, "pipeline_step_complete", state_name)
    except asyncio.TimeoutError:
        await handle_timeout(ticket_id)
    except Exception as e:
        await handle_error(ticket_id, str(e))
    finally:
        _active_threads.discard(ticket_id)


async def _start_rework(
    ticket_id: str, title: str, target_state: str, prev_values: dict
) -> None:
    """Abandon the current graph run and start fresh from a different stage."""
    # New thread so the old checkpoint is not reused
    new_thread = f"{ticket_id}_r{int(time.time())}"
    _thread_ids[ticket_id] = new_thread
    new_config = {"configurable": {"thread_id": new_thread}}

    audit_log(ticket_id, "pipeline_rework", f"→ {target_state} (thread={new_thread})")

    # Notify via Jira + Slack
    issue_info = await get_issue_id(ticket_id)
    if issue_info:
        await comment_on_issue(
            issue_info["id"],
            f"🔄 **Rework requested** — restarting pipeline from **{target_state}**.\n\n"
            f"The agent will read the full memory file and Jira comments for context.",
        )
    await post_slack(
        f":arrows_counterclockwise: `{ticket_id}` rework → *{target_state}*"
    )

    # Build initial state from existing values + rework target
    rework_initial: FactoryState = {
        "ticket_id": ticket_id,
        "title": title,
        "current_state": target_state,
        "error": "",
        "parent_issue_id": prev_values.get("parent_issue_id", ""),
        "subtasks": prev_values.get("subtasks", []),
        "stage_sub_issues": prev_values.get("stage_sub_issues", {}),
        "repo_name": prev_values.get("repo_name", ""),
        "workspace_path": prev_values.get("workspace_path", ""),
        "feedback": (
            f"This is a rework iteration. The ticket was moved back to "
            f"'{target_state}' from a later stage. Read the memory file for all "
            f"prior work and check Jira comments for feedback."
        ),
        "blocked_at": "",
        "previous_state": "",
    }

    await asyncio.wait_for(
        graph.ainvoke(rework_initial, new_config),
        timeout=AGENT_TIMEOUT,
    )
