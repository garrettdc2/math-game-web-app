# Feature Specification: Reliable OpenClaw Dashboard Connection

**Feature Branch**: `002-openclaw-reliable-connection`  
**Created**: 2026-04-03  
**Status**: Draft  
**Input**: User description: "This current project has problem with maintaining connection to OpenClaw in our custom dashboard. Events are missed, we have errors with continuity, etc. Research OpenClaw's API, SDK, and other documentation to come up with the best connection implementation and implement it. You should be researching OpenClaw documentation online and be building a solution that leverages what OpenClaw provides and recommends as much as possible"

## Research Summary

Web research confirms OpenClaw is a self-hosted AI assistant platform with extensive public documentation (docs.openclaw.ai), an active GitHub (github.com/openclaw/openclaw), and multiple SDKs. Key findings that inform this spec:

- **Gateway protocol** uses WebSocket as the control plane with `seq` and `stateVersion` fields on events for ordering
- **Device tokens** enable reconnection without re-pairing
- **Session load replay** re-emits historical events on reconnection with duplicate suppression
- **Known platform gaps**: HTTP client has no transport-layer retry (Issue #31104), WebSocket reconnect can lose auth tokens (Issue #28997), no built-in ping/pong keepalive causes proxy timeouts (Issue #17926), event gap recovery is incomplete (Issue #25722), session continuity across restarts is a requested feature (Issue #50288)
- **ACPX** (headless CLI client) provides auto-reconnect, NDJSON event streaming with `seq` fields, and prompt queueing
- **Hooks system** supports 13 event categories including message:received, message:sent, session events, and gateway startup events
- **Built-in exponential backoff** exists in Gateway for channel reconnections (1s, 2s, 4s... max 30s)

The solution should leverage OpenClaw's native capabilities (device tokens, seq fields, session replay, Gateway backoff) while building compensating mechanisms for the documented gaps.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable Event Delivery Using OpenClaw's Native Capabilities (Priority: P1)

As a factory operator monitoring a running pipeline in the dashboard, I need to see every stage transition, approval gate, and agent status update in real time without missing any events. The solution should use OpenClaw's built-in event sequencing (`seq` fields), session replay on reconnection, and device token persistence rather than building custom event infrastructure from scratch.

**Why this priority**: Missed events are the core problem reported. Leveraging OpenClaw's native `seq` ordering and session replay means less custom code to maintain and better alignment with platform upgrades.

**Independent Test**: Start a pipeline, observe the dashboard through the full lifecycle. Every stage transition and gate prompt must appear in the dashboard within 5 seconds of occurring, with zero missed events. Verify that events use OpenClaw-assigned sequence numbers for ordering.

**Acceptance Scenarios**:

1. **Given** a pipeline is running and the dashboard is open, **When** an agent completes a stage and transitions to the next, **Then** the dashboard reflects the new stage within 5 seconds using the event's `seq` field for ordering.
2. **Given** the connection between dashboard and OpenClaw is temporarily lost, **When** the connection is restored, **Then** session replay delivers any events that occurred during the interruption in correct `seq` order.
3. **Given** the dashboard is opened after a pipeline has already started, **When** it connects, **Then** it loads the session and replays historical events to reconstruct current pipeline state.

---

### User Story 2 - Automatic Connection Recovery with Device Tokens (Priority: P1)

As a factory operator, I need the dashboard to automatically reconnect to OpenClaw when the connection drops, using device tokens so that re-authentication is not required. The current system's connection stays dead until someone manually refreshes. OpenClaw's Gateway protocol supports device token reconnection and exponential backoff (1s-30s) — the dashboard should use these built-in mechanisms.

**Why this priority**: Without automatic recovery, every network hiccup requires manual intervention. OpenClaw already provides device tokens and backoff patterns — using them avoids reinventing reconnection logic and works around known issues like auth token loss on WebSocket reconnect (Issue #28997).

**Independent Test**: Simulate a network interruption for 30 seconds, then restore it. The dashboard should reconnect automatically using the stored device token and resume showing live events without any user action or re-authentication prompt.

**Acceptance Scenarios**:

1. **Given** the event stream connection is lost, **When** the system detects the disconnection, **Then** it automatically attempts to reconnect using the stored device token within the Gateway's backoff schedule (starting at 1 second).
2. **Given** a reconnection attempt fails, **When** subsequent retries are made, **Then** the system follows OpenClaw's exponential backoff pattern (1s, 2s, 4s... up to 30s max).
3. **Given** the device token has expired or been invalidated, **When** reconnection with the device token fails, **Then** the system falls back to full re-authentication and notifies the operator.

---

### User Story 3 - Event Continuity and Gap Detection (Priority: P2)

As a factory operator, I need the system to detect and recover from gaps in the event stream. OpenClaw's Gateway events include `seq` and `stateVersion` fields — the dashboard should use these to detect missed events and trigger recovery rather than silently showing incomplete state. This addresses the known platform limitation where small WebSocket event gaps show errors instead of auto-recovering (Issue #25722).

**Why this priority**: Even with reconnection, events can be missed during brief connection gaps. Using OpenClaw's sequence numbers for gap detection and triggering session reload is the platform-recommended recovery path.

**Independent Test**: Run a pipeline while forcing 3 brief connection interruptions at different stages. After each recovery, verify the event timeline is complete with no gaps in sequence numbers and no duplicate events.

**Acceptance Scenarios**:

1. **Given** the dashboard detects a gap in `seq` values (e.g., received seq 5 then seq 8), **When** the gap is detected, **Then** it triggers a session reload to recover the missing events (seq 6, 7).
2. **Given** session replay delivers events already displayed, **When** duplicates are received, **Then** they are silently deduplicated using their `seq` value — each `seq` is shown at most once.
3. **Given** event gap recovery is triggered, **When** recovery completes, **Then** events are displayed in correct `seq` order with the gap filled.

---

### User Story 4 - Connection Health Monitoring (Priority: P3)

As a factory operator, I want to see the health status of the OpenClaw connection at a glance, so I can proactively identify issues before they impact my ability to monitor pipelines. The indicator should reflect the actual Gateway connection state, not just whether the dashboard's internal event bus is working.

**Why this priority**: Provides transparency and builds trust. Even with automatic recovery, operators want to know when the system is degraded. Surfacing the Gateway's actual connection state (which OpenClaw tracks internally) gives accurate feedback.

**Independent Test**: View the dashboard under normal conditions (healthy indicator), then simulate degraded connectivity and verify the indicator changes to reflect the degraded state and shows recovery progress.

**Acceptance Scenarios**:

1. **Given** the Gateway connection is healthy and events are flowing, **When** the operator views the dashboard, **Then** a connection status indicator shows "Connected" state.
2. **Given** the connection is in a reconnecting state, **When** the operator views the dashboard, **Then** the indicator shows "Reconnecting" with the current backoff interval and retry count.
3. **Given** the connection has failed after exhausting retries, **When** the operator views the dashboard, **Then** the indicator shows "Disconnected" with an option to manually retry.

---

### Edge Cases

- What happens when the OpenClaw Gateway itself is down or unreachable at startup? The dashboard should show a clear "Cannot connect to OpenClaw Gateway" message rather than silently failing.
- What happens when a large number of events need to be replayed on session load (e.g., operator opens dashboard after a long pipeline run)? The system should handle bulk replay without freezing the interface, processing replayed events incrementally.
- What happens when the device token is invalidated mid-session (e.g., Gateway restart per Issue #50288)? The system should detect the invalid token, fall back to full re-authentication, and recover gracefully.
- What happens when multiple pipelines are running simultaneously and the connection drops? All pipeline sessions should be recoverable on reconnection.
- What happens when a network proxy closes the idle WebSocket connection (Issue #17926)? The system should implement application-level keepalive to prevent proxy timeouts, compensating for OpenClaw's lack of built-in ping/pong.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST use OpenClaw's Gateway event `seq` fields as the canonical sequence for event ordering, gap detection, and deduplication — rather than inventing a custom sequence system.
- **FR-002**: System MUST use OpenClaw's device token mechanism for reconnection to avoid re-authentication on transient connection loss.
- **FR-003**: System MUST follow OpenClaw's built-in exponential backoff schedule (1s, 2s, 4s... max 30s) for reconnection attempts, extended to a maximum of 10 total attempts (~5 minutes) before transitioning to Disconnected state.
- **FR-004**: System MUST use OpenClaw's session replay mechanism to recover missed events after reconnection, rather than building a separate event replay service.
- **FR-005**: System MUST detect gaps in `seq` values and trigger session reload to recover missing events.
- **FR-006**: System MUST deduplicate events using their `seq` value so that the same event is never displayed more than once, even during session replay catchup.
- **FR-007**: System MUST display a visible connection status indicator showing one of: Connected, Reconnecting, or Disconnected.
- **FR-008**: System MUST implement application-level keepalive messages at 30-second intervals to prevent proxy/load balancer timeout of idle connections, compensating for OpenClaw's missing built-in ping/pong (Issue #17926).
- **FR-009**: System MUST persist device tokens across page reloads so that reconnection after a browser refresh does not require full re-authentication.
- **FR-010**: System MUST provide a manual retry option when automatic reconnection has been exhausted.
- **FR-011**: System MUST gracefully handle device token invalidation by falling back to full re-authentication and notifying the operator.
- **FR-012**: System MUST handle concurrent pipeline sessions — connection recovery applies to all active pipeline sessions, not just one.
- **FR-013**: System MUST persist events to a server-side store as a secondary safety net, so that dashboard state can be reconstructed even if OpenClaw's session replay is unavailable (e.g., after a Gateway restart).

### Key Entities

- **Gateway Event**: A message from the OpenClaw Gateway carrying `seq` (sequence number), `stateVersion`, event type, and payload. The `seq` is the canonical identity used for ordering, dedup, and gap detection.
- **Device Token**: A credential issued by the OpenClaw Gateway that enables reconnection without re-pairing. Persisted locally and used for automatic reconnection.
- **Session**: An OpenClaw session identified by `sessionKey` (format: `hook:factory:{taskId}`). Supports load-and-replay of historical events.
- **Connection State**: The current status of the Gateway connection (Connected, Reconnecting, Disconnected) including metadata like retry count, current backoff interval, and last received `seq`.
- **Pipeline State Snapshot**: A derived view of a pipeline's current stage, pending approvals, and event history — reconstructed from Gateway session events.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of pipeline events are delivered to and displayed in the dashboard — zero missed events under normal operation and after any connection recovery.
- **SC-002**: After a connection interruption, automatic reconnection using device tokens succeeds within 30 seconds (assuming the Gateway is available), with no re-authentication prompt to the operator.
- **SC-003**: Operators can monitor a full pipeline lifecycle (all stages, all gates) without needing to manually refresh the page, even if 3+ connection interruptions occur during the run.
- **SC-004**: Events are displayed in correct sequence order 100% of the time, using OpenClaw's native `seq` values, with zero duplicates visible to the operator.
- **SC-005**: Connection status is visible and accurate at all times — operators always know whether the dashboard is live, reconnecting, or disconnected.
- **SC-006**: The solution uses OpenClaw's documented platform capabilities (device tokens, seq fields, session replay, Gateway backoff) for at least 80% of the connection reliability logic, minimizing custom infrastructure.

## Clarifications

### Session 2026-04-03

- Q: Should the server connect to OpenClaw via WebSocket (for native seq/device tokens) or continue using HTTP hooks only? → A: Hybrid — server establishes a WebSocket connection to the Gateway for real-time events with native seq/device tokens/session replay, while keeping the existing dashboard-bridge hook as a fallback channel.
- Q: Should the server persist events to its own store as a safety net beyond OpenClaw's session replay? → A: Yes, hybrid persistence — server persists events to SQLite as a secondary store alongside OpenClaw session replay, protecting against Gateway restart data loss.
- Q: What interval for application-level keepalive messages? → A: 30 seconds — within typical proxy timeout windows, frequent enough to detect dead connections quickly.

## Assumptions

- The OpenClaw Gateway is running and accessible from the dashboard server (same Docker network or localhost).
- The dashboard server connects to the OpenClaw Gateway via WebSocket (the native protocol) to receive events with `seq` and `stateVersion` fields. The existing dashboard-bridge hook is retained as a fallback channel but is not the primary event source.
- Device tokens issued by the Gateway remain valid across transient disconnections (seconds to minutes). Gateway restarts may invalidate tokens, which is handled by the fallback to full re-authentication.
- OpenClaw's session replay mechanism (re-emitting historical events on session load) provides sufficient event history to recover dashboard state after disconnection.
- The dashboard is a web-based interface running in a modern browser (Chrome, Firefox, Safari, Edge — latest 2 versions).
- This feature addresses the connection and event delivery layer only. It does not change what events are produced, how pipelines run, or how approvals work.
- Known OpenClaw platform limitations (Issues #17926, #25722, #28997, #31104, #50288) are addressed through compensating mechanisms rather than waiting for upstream fixes.
