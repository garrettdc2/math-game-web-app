"""Jira REST API helpers and sub-task lifecycle management."""

import base64
import httpx
from langsmith import traceable

from orchestrator.config import (
    JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_SUBTASK_ISSUETYPE, logger,
)
from orchestrator.audit import audit_log

# All bot-generated comments start with this prefix so they can be filtered out
# when collecting human feedback.
BOT_PREFIX = "🤖 [Factory] "

# Base URL for Jira REST API v3
_JIRA_BASE = f"https://{JIRA_DOMAIN}.atlassian.net/rest/api/3"

# Basic auth header — base64(email:token)
_JIRA_AUTH = "Basic " + base64.b64encode(
    f"{JIRA_EMAIL}:{JIRA_API_TOKEN}".encode()
).decode()

# Agent stages — one Jira sub-task is created per stage
AGENT_STAGES = [
    ("Spec", "PM Agent writes a structured spec from the raw ticket"),
    ("Architecture", "Architect Agent produces a technical design and subtask breakdown"),
    ("Implementation", "Dev Agent writes code and opens a PR"),
    ("Code Review", "Review Agent checks correctness, security, and conventions"),
    ("Tests", "Test Agent writes and runs Jest tests"),
    ("Deploy", "Deploy Agent ships to Netlify and verifies health"),
]


# ---------------------------------------------------------------------------
# Low-level HTTP helper
# ---------------------------------------------------------------------------


async def _jira(method: str, path: str, json: dict | None = None) -> dict:
    """Issue a Jira REST API request. Returns parsed JSON or {} on failure."""
    url = f"{_JIRA_BASE}/{path}"
    headers = {
        "Authorization": _JIRA_AUTH,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.request(method, url, json=json, headers=headers)
    if resp.status_code >= 400:
        logger.warning("Jira %s %s → %d: %s", method, path, resp.status_code, resp.text[:200])
        return {}
    return resp.json() if resp.content else {}


# ---------------------------------------------------------------------------
# ADF (Atlassian Document Format) helpers
# ---------------------------------------------------------------------------


def _adf(text: str) -> dict:
    """Wrap a plain-text string in the minimal ADF doc structure."""
    return {
        "type": "doc",
        "version": 1,
        "content": [
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": text}],
            }
        ],
    }


def _adf_multiline(text: str) -> dict:
    """Convert a multi-line string to ADF, handling paragraphs and bullet lists."""
    content = []
    for block in text.split("\n\n"):
        block = block.strip()
        if not block:
            continue
        lines = block.splitlines()
        # Check if all non-empty lines are bullet items
        bullet_lines = [l for l in lines if l.strip().startswith("- ")]
        if bullet_lines and len(bullet_lines) == len([l for l in lines if l.strip()]):
            items = []
            for line in lines:
                line = line.strip()
                if not line.startswith("- "):
                    continue
                item_text = line[2:].strip()
                items.append({
                    "type": "listItem",
                    "content": [{
                        "type": "paragraph",
                        "content": [{"type": "text", "text": item_text}],
                    }],
                })
            content.append({"type": "bulletList", "content": items})
        else:
            # Emit as a paragraph, stripping markdown bold markers
            plain = block.replace("**", "")
            content.append({
                "type": "paragraph",
                "content": [{"type": "text", "text": plain}],
            })
    if not content:
        content = [{"type": "paragraph", "content": [{"type": "text", "text": text}]}]
    return {"type": "doc", "version": 1, "content": content}


# ---------------------------------------------------------------------------
# Issue helpers
# ---------------------------------------------------------------------------


@traceable(run_type="tool", name="jira_get_issue")
async def get_issue_id(ticket_id: str) -> dict | None:
    """Confirm a Jira issue exists and return {id: key, project: {key}}.

    ticket_id is already a Jira key like "PROJ-123" — no number-stripping needed.
    """
    data = await _jira("GET", f"issue/{ticket_id}?fields=summary,project")
    if not data:
        return None
    key = data.get("key", ticket_id)
    project_key = data.get("fields", {}).get("project", {}).get("key", ticket_id.split("-")[0])
    return {"id": key, "project": {"key": project_key}}


@traceable(run_type="tool", name="jira_update_state")
async def update_issue_state(ticket_id: str, state_name: str) -> None:
    """Transition a Jira issue to the named status.

    Fetches available transitions, matches by name (case-insensitive), then posts.
    Transition IDs are per-issue context — never hard-coded.
    """
    data = await _jira("GET", f"issue/{ticket_id}/transitions")
    transitions = data.get("transitions", [])
    match = next(
        (t for t in transitions if t.get("name", "").lower() == state_name.lower()),
        None,
    )
    if not match:
        audit_log(ticket_id, "jira_transition_not_found", f"'{state_name}' not in {[t.get('name') for t in transitions]}")
        return
    await _jira("POST", f"issue/{ticket_id}/transitions", json={"transition": {"id": match["id"]}})
    audit_log(ticket_id, "jira_state_update", state_name)


@traceable(run_type="tool", name="jira_comment")
async def comment_on_issue(issue_id: str, body: str) -> None:
    """Post a comment on a Jira issue (issue_id may be a key like PROJ-123)."""
    await _jira("POST", f"issue/{issue_id}/comment", json={"body": _adf_multiline(BOT_PREFIX + body)})



@traceable(run_type="tool", name="jira_get_comments_since")
async def get_comments_since(ticket_id: str, since_iso: str) -> str:
    """Fetch all comments on a Jira issue created after *since_iso*.

    Returns a single string with each comment attributed to its author,
    separated by blank lines.  Returns "" if there are no matching comments.

    *since_iso* must be an ISO 8601 timestamp (e.g. "2026-04-01T12:00:00Z").
    """
    since_dt = datetime.fromisoformat(since_iso.replace("Z", "+00:00"))

    data = await _jira("GET", f"issue/{ticket_id}/comment")
    if not data:
        return ""

    comments = data.get("comments", [])
    parts: list[str] = []

    for comment in comments:
        created_raw = comment.get("created", "")
        if not created_raw:
            continue
        # Jira timestamps look like "2026-04-01T14:23:45.123+0000"
        created_dt = datetime.fromisoformat(
            created_raw.replace("+0000", "+00:00").replace("Z", "+00:00")
        )
        if created_dt <= since_dt:
            continue

        author = (
            comment.get("author", {}).get("displayName")
            or comment.get("author", {}).get("emailAddress", "Unknown")
        )
        body_adf = comment.get("body", {})
        body_text = _extract_adf_text(body_adf) if body_adf else ""
        if body_text and not body_text.startswith("🤖 [Factory]"):
            parts.append(f"[{author}]: {body_text}")

    return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# Sub-task-per-agent lifecycle
# ---------------------------------------------------------------------------


@traceable(run_type="chain", name="ensure_stage_sub_issues")
async def ensure_stage_sub_issues(ticket_id: str) -> dict[str, str]:
    """Create one sub-task per agent stage. Returns {stage_name: sub_task_key}.

    Idempotent — if sub-tasks already exist (checked by summary prefix), skips creation.
    """
    issue_info = await get_issue_id(ticket_id)
    if not issue_info:
        logger.warning("Could not resolve %s to create stage sub-tasks", ticket_id)
        return {}

    project_key = issue_info["project"]["key"]

    # Fetch existing sub-tasks to make this idempotent
    data = await _jira("GET", f"issue/{ticket_id}?fields=subtasks")
    existing = data.get("fields", {}).get("subtasks", [])
    existing_by_summary = {
        node.get("fields", {}).get("summary", ""): node.get("key", "")
        for node in existing
    }

    mapping: dict[str, str] = {}
    for stage_name, stage_desc in AGENT_STAGES:
        sub_title = f"[{stage_name}] {ticket_id}"
        if sub_title in existing_by_summary:
            mapping[stage_name] = existing_by_summary[sub_title]
            continue
        result = await _jira("POST", "issue", json={
            "fields": {
                "project": {"key": project_key},
                "summary": sub_title,
                "description": _adf(stage_desc),
                "issuetype": {"name": JIRA_SUBTASK_ISSUETYPE},
                "parent": {"key": ticket_id},
            }
        })
        sub_key = result.get("key")
        if sub_key:
            mapping[stage_name] = sub_key
            audit_log(ticket_id, "stage_sub_task_created", f"{stage_name} -> {sub_key}")

    # Post a summary comment on the parent
    if mapping:
        lines = [
            "Pipeline started.",
            "",
            "This ticket will be built automatically through 6 stages, "
            "with 3 human approval gates. Each stage has its own sub-task "
            "for detailed tracking.",
            "",
            "Stages:",
        ]
        for stage_name, sub_key in mapping.items():
            lines.append(f"- {stage_name} ({sub_key})")
        await comment_on_issue(ticket_id, "\n".join(lines))

    audit_log(ticket_id, "stage_sub_tasks_ready", f"{len(mapping)} stages")
    return mapping


@traceable(run_type="tool", name="complete_stage_sub_issue")
async def complete_stage_sub_issue(ticket_id: str, stage_name: str, sub_issue_id: str) -> None:
    """Mark a stage sub-task as Done. sub_issue_id is already a Jira key."""
    await update_issue_state(sub_issue_id, "Done")
    audit_log(ticket_id, "stage_complete", f"{stage_name} ({sub_issue_id})")


@traceable(run_type="tool", name="update_stage_progress")
async def update_stage_progress(
    ticket_id: str, stage_name: str, sub_issue_id: str, message: str
) -> None:
    """Post a progress update as a comment on a stage sub-task."""
    await comment_on_issue(sub_issue_id, message)
    audit_log(ticket_id, f"stage_progress:{stage_name}", message[:100])
