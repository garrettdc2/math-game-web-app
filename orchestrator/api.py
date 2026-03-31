"""FastAPI app — webhook endpoint and health check."""

import json

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, BackgroundTasks
from langsmith import traceable
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from orchestrator.config import DB_PATH, logger
from orchestrator.state import STATE_MAP
from orchestrator.audit import audit_log
from orchestrator.memory import init_memory
from orchestrator.graph import build_graph
from orchestrator import pipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncSqliteSaver.from_conn_string(DB_PATH) as checkpointer:
        builder = build_graph()
        pipeline.graph = builder.compile(checkpointer=checkpointer)
        logger.info("Factory orchestrator started, graph compiled with SQLite checkpointer")
        yield


app = FastAPI(title="Software Factory", lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok"}


@traceable(run_type="chain", name="webhook_jira")
@app.post("/webhook/jira")
async def webhook_jira(request: Request, background_tasks: BackgroundTasks):
    payload = json.loads(await request.body())

    if payload.get("webhookEvent") != "jira:issue_updated":
        return {"ok": True, "skipped": True}

    # Only process status changes
    items = payload.get("changelog", {}).get("items", [])
    status_change = next((i for i in items if i.get("field") == "status"), None)
    if not status_change:
        return {"ok": True, "skipped": True}

    state_name = status_change.get("toString")
    if not state_name or state_name not in STATE_MAP:
        return {"ok": True, "skipped": True, "state": state_name}

    issue = payload.get("issue", {})
    ticket_id = issue.get("key")          # Already "PROJ-123"
    title = issue.get("fields", {}).get("summary", "Untitled")

    audit_log(ticket_id, "webhook_received", state_name)

    # Initialize memory file if this is a new ticket
    init_memory(ticket_id, title)

    # Run the pipeline in the background so the webhook returns immediately
    background_tasks.add_task(pipeline.run_pipeline, ticket_id, title, state_name)

    return {"ok": True, "ticket": ticket_id, "state": state_name}
