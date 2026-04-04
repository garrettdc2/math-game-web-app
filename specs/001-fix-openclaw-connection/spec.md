# Feature Specification: Fix OpenClaw Connection Reliability

**Feature Branch**: `001-fix-openclaw-connection`  
**Created**: 2026-04-03  
**Status**: Draft  
**Input**: User description: "This current project has problem with maintaining connection to OpenClaw in our custom dashboard. Events are missed, we have errors with continuity, etc. Research OpenClaw's API, SDK, and other documentation to come up with the best connection implementation and implement it"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable Event Delivery from Pipeline to Dashboard (Priority: P1)

As a factory operator monitoring a running pipeline in the dashboard, I need to see every stage transition, approval gate, and agent status update in real time without missing any events. Currently, events are silently dropped when the connection between the dashboard and OpenClaw is interrupted — the dashboard shows stale or incomplete state, and operators lose trust in the system.

**Why this priority**: Missed events are the core problem. If the dashboard cannot reliably reflect what the pipeline is doing, operators cannot make informed approval/rejection decisions, which blocks the entire factory workflow.

**Independent Test**: Start a pipeline, observe the dashboard through the full lifecycle (spec, architecture, code, review, test, deploy). Every stage transition and gate prompt must appear in the dashboard within 5 seconds of occurring, with zero missed events.

**Acceptance Scenarios**:

1. **Given** a pipeline is running and the dashboard is open, **When** an agent completes a stage and transitions to the next, **Then** the dashboard reflects the new stage within 5 seconds.
2. **Given** the connection between dashboard and OpenClaw is temporarily lost (e.g., network blip), **When** the connection is restored, **Then** any events that occurred during the interruption are delivered and displayed in correct order.
3. **Given** the dashboard is opened after a pipeline has already started, **When** it connects, **Then** it displays the current pipeline state and all prior events — not just future ones.

---

### User Story 2 - Automatic Connection Recovery (Priority: P1)

As a factory operator, I need the dashboard to automatically reconnect to the event stream when the connection drops, without requiring me to manually refresh the page or restart the application. Today, a dropped connection stays dead until someone notices and refreshes.

**Why this priority**: Without automatic recovery, every network hiccup requires manual intervention, which makes the system fragile and unusable for unattended operation.

**Independent Test**: Simulate a network interruption (kill the event stream connection for 30 seconds), then restore it. The dashboard should reconnect automatically and resume showing live events without any user action.

**Acceptance Scenarios**:

1. **Given** the event stream connection is lost, **When** 5 seconds have passed, **Then** the system automatically attempts to reconnect.
2. **Given** the reconnection attempt fails, **When** subsequent retry attempts are made, **Then** the system uses progressive backoff (increasing intervals between retries) up to a maximum interval.
3. **Given** the connection has been lost, **When** the dashboard is in reconnecting state, **Then** a visible indicator shows the user that the connection is interrupted and recovery is in progress.

---

### User Story 3 - Event Ordering and Continuity Guarantee (Priority: P2)

As a factory operator, I need events to always appear in the correct chronological order, even after a reconnection. Currently, events sometimes arrive out of order or are duplicated after a reconnection, leading to a confusing and unreliable dashboard view.

**Why this priority**: Even if all events are delivered, out-of-order or duplicated events create a misleading picture of pipeline state and can cause operators to approve or reject based on stale information.

**Independent Test**: Run a pipeline while forcing 3 connection drops at different stages. After each recovery, verify that the event timeline in the dashboard is strictly chronological with no duplicates and no gaps.

**Acceptance Scenarios**:

1. **Given** events arrived out of order due to reconnection, **When** the dashboard processes them, **Then** they are displayed in correct chronological order.
2. **Given** the same event is delivered twice (once live, once on reconnection catchup), **When** the dashboard receives the duplicate, **Then** it is silently deduplicated and only shown once.
3. **Given** a gap is detected in the event sequence, **When** the dashboard identifies the gap, **Then** it requests the missing events to fill the gap before resuming live display.

---

### User Story 4 - Connection Health Monitoring (Priority: P3)

As a factory operator, I want to see the health status of the connection to OpenClaw at a glance, so I can proactively identify issues before they impact my ability to monitor pipelines.

**Why this priority**: Provides transparency and builds trust. Even with automatic recovery, operators want to know when the system is degraded.

**Independent Test**: View the dashboard under normal conditions (green/healthy indicator), then simulate degraded connectivity and verify the indicator changes to reflect the degraded state.

**Acceptance Scenarios**:

1. **Given** the connection is healthy and events are flowing, **When** the operator views the dashboard, **Then** a connection status indicator shows "Connected" state.
2. **Given** the connection is in a reconnecting state, **When** the operator views the dashboard, **Then** the indicator shows "Reconnecting" with retry count.
3. **Given** the connection has failed after exhausting retries, **When** the operator views the dashboard, **Then** the indicator shows "Disconnected" with an option to manually retry.

---

### Edge Cases

- What happens when OpenClaw itself is down or unreachable at startup? The dashboard should show a clear "Cannot connect to orchestration service" message rather than silently failing.
- What happens when the event backlog is very large (e.g., hundreds of events missed during a prolonged outage)? The system should handle bulk catchup without freezing the interface or overwhelming the browser.
- What happens when multiple pipelines are running simultaneously and the connection drops? All pipeline states should be recovered on reconnection, not just the most recent one.
- What happens when the dashboard is open in multiple browser tabs? Each tab should maintain its own connection without interfering with others.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST deliver all pipeline events (stage transitions, gate prompts, agent status, errors) to the dashboard without loss.
- **FR-002**: System MUST automatically reconnect when the event stream connection is interrupted, using exponential backoff starting at 1 second up to a maximum interval of 60 seconds, for up to 10 retry attempts (~5 minutes total). After exhausting retries, the system transitions to Disconnected state.
- **FR-003**: System MUST catch up on missed events after reconnection, delivering them in chronological order before resuming live event streaming.
- **FR-004**: System MUST deduplicate events so that the same event is never displayed more than once in the dashboard, even after reconnection catchup.
- **FR-005**: System MUST display a visible connection status indicator showing one of: Connected, Reconnecting, or Disconnected.
- **FR-006**: System MUST maintain event ordering guarantees — events are always presented in the order they occurred, regardless of delivery order.
- **FR-007**: System MUST recover full pipeline state on initial connection or reconnection, including current stage, pending gates, and event history. State is always fetched from the server (server-authoritative); no browser-side caching of events.
- **FR-008**: System MUST handle concurrent pipelines — connection recovery applies to all active pipelines, not just one.
- **FR-009**: System MUST provide a manual retry option when automatic reconnection has been exhausted.
- **FR-010**: System MUST show a clear, user-friendly error when the orchestration service is completely unreachable.

### Key Entities

- **Event**: A discrete occurrence in the pipeline lifecycle (stage transition, gate prompt, agent message, error). Has a server-assigned monotonically increasing sequence ID, timestamp, pipeline reference, and payload. The sequence ID is the canonical identity used for deduplication, ordering, and gap detection.
- **Event Stream**: The persistent channel through which events flow from the orchestration service to the dashboard in real time.
- **Connection State**: The current status of the event stream (Connected, Reconnecting, Disconnected) including metadata like retry count, last successful event, and time since last event.
- **Pipeline State Snapshot**: A point-in-time view of a pipeline's current stage, pending approvals, and accumulated event history — used to reconstruct dashboard state on connection or reconnection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of pipeline events are delivered to and displayed in the dashboard — zero missed events under normal operation and after any connection recovery.
- **SC-002**: After a connection interruption, automatic reconnection succeeds within 30 seconds (assuming the orchestration service is available).
- **SC-003**: Operators can monitor a full pipeline lifecycle (all stages, all gates) without needing to manually refresh the page, even if 3+ connection interruptions occur during the run.
- **SC-004**: Events are displayed in correct chronological order 100% of the time, with zero duplicates visible to the operator.
- **SC-005**: Dashboard catches up on missed events within 10 seconds of reconnection, regardless of backlog size (up to 500 events).
- **SC-006**: Connection status is visible and accurate at all times — operators always know whether the dashboard is live, reconnecting, or disconnected.

## Clarifications

### Session 2026-04-03

- Q: Are changes scoped to frontend only, frontend + backend, or full stack including OpenClaw config? → A: Full stack including OpenClaw configuration — dashboard frontend, server backend, and OpenClaw gateway/hook configuration are all in scope.
- Q: How are events uniquely identified for deduplication and ordering? → A: Assign our own monotonically increasing sequential event IDs at the server layer, independent of OpenClaw's internal identifiers.
- Q: How many automatic reconnection attempts before showing Disconnected? → A: 10 retries with exponential backoff (1s, 2s, 4s, 8s, 16s, 32s, 60s, 60s, 60s, 60s) — approximately 5 minutes total before transitioning to Disconnected state.
- Q: Should events be cached in the browser or fetched from server on page load? → A: Server-authoritative only — always fetch full state from the server on page load or refresh. No browser-side event caching.

## Assumptions

- Changes span the full stack: dashboard frontend, server backend, and OpenClaw gateway/hook configuration. All three layers may be modified to achieve reliable event delivery.
- The dashboard is a web-based interface running in a modern browser (Chrome, Firefox, Safari, Edge — latest 2 versions).
- Network interruptions are transient (seconds to a few minutes). Prolonged outages of the orchestration service itself are outside the scope of this feature — the dashboard should report the issue but is not expected to function without the service.
- The existing pipeline event model already includes timestamps and unique identifiers that can be used for ordering and deduplication.
- This feature addresses the connection layer only. It does not change what events are produced, how pipelines run, or how approvals work — only how reliably events are delivered to and displayed in the dashboard.
