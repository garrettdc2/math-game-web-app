# Feature Specification: Local Demo Mode

**Feature Branch**: `004-local-demo-mode`  
**Created**: 2026-04-06  
**Status**: Draft  
**Input**: User description: "Make the factory self-contained for demos by falling back to local repo creation and local serving when secrets (GitHub, Netlify, Supabase) are not provided in env"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run the Factory Without Any Cloud Secrets (Priority: P1)

A developer clones the factory repo and wants to demo the full pipeline without configuring GitHub, Netlify, or Supabase tokens. They set up the factory with only an Anthropic API key (required for AI agents) and an OpenClaw gateway (already runs locally). When they start a pipeline, the factory detects missing cloud tokens and automatically uses local alternatives: a local git repository instead of GitHub, a local static file server instead of Netlify, and a local SQLite database instead of Supabase.

**Why this priority**: This is the core value proposition. Without this, the demo requires provisioning three separate cloud accounts and tokens before anything works. This single story makes the factory demo-ready out of the box.

**Independent Test**: Can be fully tested by starting the factory with only `ANTHROPIC_API_KEY` set, submitting a task, and observing the pipeline complete end-to-end with a locally served website.

**Acceptance Scenarios**:

1. **Given** the factory is started with no `GITHUB_TOKEN`, `NETLIFY_TOKEN`, or `SUPABASE_TOKEN` in the environment, **When** a user starts a new pipeline, **Then** the factory creates a local git repository for the app instead of a GitHub repo.
2. **Given** the factory is running in local mode, **When** the Dev Agent needs to commit code, **Then** it commits to the local git repository using standard git CLI commands (no GitHub MCP required).
3. **Given** the factory is running in local mode, **When** the Deploy Agent deploys the app, **Then** the app is built and served locally on an available port, and the URL is reported back in the pipeline state.
4. **Given** the factory is running in local mode, **When** the Deploy Agent needs a database, **Then** it uses a local SQLite database file instead of provisioning a Supabase project.

---

### User Story 2 - View the Deployed App Locally (Priority: P2)

After the pipeline completes in local mode, the user can open a browser and access the deployed app at a local URL (e.g., `http://localhost:3001`). The app is fully functional with its local database, just as it would be if deployed to Netlify + Supabase.

**Why this priority**: Seeing the running app is the payoff of the demo. Without this, the pipeline completes but there is nothing tangible to show.

**Independent Test**: Can be tested by completing a pipeline in local mode, navigating to the reported local URL, and verifying the app loads and functions correctly.

**Acceptance Scenarios**:

1. **Given** a pipeline has completed in local mode, **When** the user opens the reported local URL in a browser, **Then** the app renders and is interactive.
2. **Given** multiple pipelines have completed in local mode, **When** the user views the dashboard, **Then** each app is served on a unique port and all are accessible simultaneously.
3. **Given** a locally served app is running, **When** the factory server is stopped and restarted, **Then** the locally served apps do not automatically restart (they are ephemeral for demo purposes).

---

### User Story 3 - Seamless Transition Between Local and Cloud Modes (Priority: P3)

A developer who has been running in local mode decides to add cloud tokens to their environment. When they restart the factory with `GITHUB_TOKEN`, `NETLIFY_TOKEN`, and `SUPABASE_TOKEN` set, new pipelines automatically use the cloud services. Existing local-mode pipelines remain accessible.

**Why this priority**: This ensures local mode is not a dead end. Users can graduate from demo to production without re-configuring the factory or losing prior work.

**Independent Test**: Can be tested by running a pipeline in local mode, then adding cloud tokens, restarting, and confirming the next pipeline uses GitHub/Netlify/Supabase.

**Acceptance Scenarios**:

1. **Given** cloud tokens are added to the environment after running in local mode, **When** a new pipeline is started, **Then** it uses GitHub, Netlify, and Supabase as normal.
2. **Given** a pipeline was completed in local mode, **When** the factory restarts with cloud tokens, **Then** the existing local pipeline state is still visible in the dashboard.

---

### Edge Cases

- What happens when only some cloud tokens are provided (e.g., `GITHUB_TOKEN` set but not `NETLIFY_TOKEN`)? The factory should fall back to local mode for the missing services individually -- partial local mode is supported.
- What happens when the local port assigned to a deployed app is already in use? The factory should detect the conflict and try the next available port.
- What happens when the filesystem runs out of space for local repos? The factory should report a clear error rather than failing silently.
- What happens when a pipeline in local mode tries to create a PR for code review? The Review Agent should review code from the local repo directly, skipping the GitHub PR workflow.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The factory MUST detect whether each cloud service token (`GITHUB_TOKEN`, `NETLIFY_TOKEN`, `SUPABASE_TOKEN`) is present in the environment at startup and determine per-service mode (local or cloud).
- **FR-002**: When `GITHUB_TOKEN` is absent, the factory MUST create a local git repository for each new pipeline instead of creating a GitHub repository.
- **FR-003**: When `NETLIFY_TOKEN` is absent, the factory MUST build the app and serve it locally on an available port instead of deploying to Netlify.
- **FR-004**: When `SUPABASE_TOKEN` is absent, the factory MUST provision a local SQLite database file for the app instead of creating a Supabase project.
- **FR-005**: The factory MUST expose each locally-served app on a unique, auto-assigned port and report the URL in the pipeline state.
- **FR-006**: The factory MUST support partial local mode, where some services use cloud and others use local fallbacks, based on which tokens are present.
- **FR-007**: Agent skill files MUST adapt their instructions based on the mode -- the Dev Agent should use git CLI in local mode, and the Deploy Agent should use local build/serve commands instead of Netlify/Supabase MCPs.
- **FR-008**: The dashboard MUST display the correct deployment URL whether the app is deployed to Netlify or served locally.
- **FR-009**: The factory MUST log which mode (local or cloud) each service is running in at startup.
- **FR-010**: The Review Agent MUST be able to review code from a local git repository when GitHub is not available, by reading files directly from the workspace instead of via GitHub PR.

### Key Entities

- **ServiceMode**: Represents whether a given service (git hosting, deployment, database) is operating in local or cloud mode. Determined at startup from environment variables.
- **LocalDeployment**: Represents a locally-served app instance, including its port, process handle, workspace path, and build output directory.
- **LocalRepository**: Represents a local git repository created for a pipeline, including its filesystem path and branch state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can start the factory and complete a full pipeline with only an Anthropic API key -- no other cloud credentials required.
- **SC-002**: The locally deployed app is accessible in a browser within 30 seconds of the deploy stage completing.
- **SC-003**: The factory correctly detects and reports its operating mode (local vs. cloud) for each service at startup.
- **SC-004**: At least 3 locally-deployed apps can run simultaneously on different ports without conflicts.
- **SC-005**: Switching from local to cloud mode requires only adding environment variables and restarting -- no code or configuration file changes.

## Assumptions

- The Anthropic API key (`ANTHROPIC_API_KEY`) is always required -- there is no local fallback for AI reasoning.
- The OpenClaw gateway is always available locally (it already runs as a local Docker container) -- this feature does not replace OpenClaw.
- Local mode is intended for demos and development, not production use. Durability and persistence of local deployments is not guaranteed across factory restarts.
- The app stack generated by the factory (Next.js, TypeScript, Tailwind) can be built and served locally using standard Node.js tooling.
- Local git repositories are stored in a configurable directory (defaulting to a `repos/` subdirectory within the factory workspace).
- Port assignment for locally-served apps starts at a configurable base port (e.g., 3001) and increments for each new deployment.
- The code review step in local mode is simplified -- the Review Agent reads the workspace directly rather than reviewing a GitHub PR.
