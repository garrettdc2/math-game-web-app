---
name: run-pipeline
description: Orchestrate the full software factory pipeline from task description to deployed app. Use when a new task needs to go through spec, architecture, development, QA, and deployment.
---

# Pipeline Orchestration

When asked to process a task, execute these stages in order using `sessions_spawn`. Each stage runs as an isolated subagent. Wait for the announce back before proceeding to the next stage.

## Structured Event Markers

**IMPORTANT**: Before each stage spawn, gate stop, and pipeline completion, you MUST output the corresponding structured marker on its own line. These markers are parsed by the dashboard-bridge hook to provide real-time updates to the dashboard UI.

- Before spawning a stage: `[STAGE:{task_id}:{stage_name}:start]`
- Before stopping at a gate: `[GATE:{task_id}:{gate_name}:waiting]`
- When pipeline completes successfully: `[PIPELINE:{task_id}:done]`
- When pipeline fails: `[PIPELINE:{task_id}:error:{reason}]`

## Receiving a Task

You will receive a message like: "Process task SFT-123: Build a todo app with authentication"

Extract:
- **task_id**: e.g., `SFT-123`
- **title**: e.g., "Build a todo app with authentication"

## Stage 1: Spec

Output: `[STAGE:{task_id}:spec:start]`

Spawn the PM agent:

```
sessions_spawn({
  agentId: "pm",
  task: "Task {task_id}: {title}\n\nWrite a structured spec for this task. Save output to /root/memory/{task_id}.md under ## Spec.",
  label: "{task_id}:spec",
  runTimeoutSeconds: 600
})
```

Wait for the announce. Then read `/root/memory/{task_id}.md` to see the spec.

### Gate 1: Spec Review

Summarize the spec that was produced. Then output:

`[GATE:{task_id}:gate_1_spec_review:waiting]`

Then say:

> **Awaiting human approval for spec review (gate_1_spec_review)**
> Reply with approval context to continue, or reject to stop the pipeline.

**STOP HERE.** Do not proceed until you receive a follow-up message with the approval.

## Stage 2: Architecture

After approval, output: `[STAGE:{task_id}:architecture:start]`

Spawn the Architect agent:

```
sessions_spawn({
  agentId: "architect",
  task: "Task {task_id}: {title}\n\nMemory:\n{memory_content}\n\nProduce a technical architecture decision. Save output to /root/memory/{task_id}.md under ## Architecture Decision.",
  label: "{task_id}:architecture",
  runTimeoutSeconds: 900
})
```

### Gate 2: Architecture Review

Summarize the architecture decision. Then output:

`[GATE:{task_id}:gate_2_arch_review:waiting]`

Then say:

> **Awaiting human approval for architecture review (gate_2_arch_review)**

**STOP HERE.**

## Stage 3: Development

After approval, output: `[STAGE:{task_id}:development:start]`

Read the architecture decision from memory. If it contains subtasks, spawn one dev agent per subtask in parallel:

```
sessions_spawn({
  agentId: "dev",
  task: "Task {task_id}: {title}\n\nMemory:\n{memory_content}\n\n## Subtask Scope\n{subtask_details}\n\nImplement this subtask. Commit to branch {task_id}/implementation.",
  label: "{task_id}:dev:{subtask_number}",
  runTimeoutSeconds: 1800
})
```

If no subtasks are defined, spawn a single dev agent for the full implementation.

Wait for ALL dev agents to announce back before proceeding.

## Stage 4: QA

Output: `[STAGE:{task_id}:qa:start]`

Spawn the reviewer and tester in parallel:

```
sessions_spawn({
  agentId: "reviewer",
  task: "Task {task_id}: {title}\n\nMemory:\n{memory_content}\n\nReview the PR for correctness and security.",
  label: "{task_id}:review",
  runTimeoutSeconds: 900
})

sessions_spawn({
  agentId: "tester",
  task: "Task {task_id}: {title}\n\nMemory:\n{memory_content}\n\nWrite and run tests for the PR.",
  label: "{task_id}:test",
  runTimeoutSeconds: 900
})
```

Wait for both to announce back.

### Gate 3: QA Review

Summarize the code review verdict and test results. Then output:

`[GATE:{task_id}:gate_3_qa_review:waiting]`

Then say:

> **Awaiting human approval for QA review (gate_3_qa_review)**

**STOP HERE.**

## Stage 5: Deploy

After approval, output: `[STAGE:{task_id}:deploy:start]`

Spawn the deploy agent:

```
sessions_spawn({
  agentId: "deployer",
  task: "Task {task_id}: {title}\n\nMemory:\n{memory_content}\n\nMerge the PR, deploy to Netlify + Supabase, and verify health.",
  label: "{task_id}:deploy",
  runTimeoutSeconds: 900
})
```

Wait for the announce. Then output:

`[PIPELINE:{task_id}:done]`

Then report the final status:

> **Pipeline complete for {task_id}: {title}**
> Production URL: {url from memory}

## Error Handling

If any subagent reports a failure:
1. Output: `[PIPELINE:{task_id}:error:{brief reason}]`
2. Report the failure with details
3. Say: "Pipeline blocked at {stage}. Fix the issue and resume."
4. STOP and wait for instructions.
