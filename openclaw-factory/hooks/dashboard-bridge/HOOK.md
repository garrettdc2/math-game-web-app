---
name: dashboard-bridge
description: Bridge OpenClaw agent events to the custom dashboard API for real-time updates
metadata: {"openclaw": {"events": ["message:received", "message:sent"]}}
---

# Dashboard Bridge Hook

Intercepts messages from the factory orchestrator agent and POSTs structured
events to the dashboard's `/events/ingest` endpoint. This enables the HTMX
dashboard to show real-time stage transitions, gate approvals, and pipeline
completion without polling.

## Detected Patterns

- `[STAGE:{task_id}:{stage}:start]` → stage transition event
- `[GATE:{task_id}:{gate_name}:waiting]` → gate waiting event
- `[PIPELINE:{task_id}:done]` → pipeline complete event
