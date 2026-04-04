---
name: jira-trigger
description: Trigger factory pipeline when a Jira webhook fires for new tickets
metadata: {"openclaw": {"events": ["message:received"]}}
---

# Jira Trigger Hook

This hook listens for inbound webhook messages that contain Jira ticket data
and triggers the factory orchestrator agent to process the ticket.
