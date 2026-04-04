# Feature Specification: Nexus Slate UI Refactor

**Feature Branch**: `003-nexus-slate-ui-refactor`
**Created**: 2026-04-04
**Status**: Draft
**Input**: User description: "Refactor UI to match Stitch mocks using Nexus Slate design system"

## Implementation Directive

**1:1 Stitch Fidelity**: The UI MUST match the Stitch mocks exactly. Every visual element—spacing, colors, typography, component layout, and interactions—should be pixel-perfect to the mocks. Only push back on a design element when it is technically infeasible to implement.

## Design System Reference

**Stitch Project**: 814347126315821845 (Software Factory Dashboard)
**Design System**: "The Industrial Architect" / "The Precision Engine"

### Core Design Principles

1. **No-Line Rule**: Boundaries through tonal shifts, not 1px borders
2. **Tonal Layering**: Surface hierarchy creates depth without shadows
3. **Ghost Borders**: When borders are needed, use 15% opacity
4. **Gradient Buttons**: Primary buttons use machined metallic gradient
5. **Precision Corners**: 0.25rem default, max 0.75rem (no excessive roundness)

### Color Tokens (from Stitch Design System)

| Token                      | Value     | Purpose                     |
|----------------------------|-----------|-----------------------------|
| `surface`                  | `#f7f9fb` | Global canvas               |
| `surface-container`        | `#e8eff3` | Section backgrounds         |
| `surface-container-lowest` | `#ffffff` | Cards (lifted)              |
| `on-surface`               | `#2a3439` | Primary text                |
| `on-surface-variant`       | `#566166` | Secondary text              |
| `primary`                  | `#006781` | Accent/interactive          |
| `primary-dim`              | `#005a71` | Gradient end                |
| `outline-variant`          | `#a9b4b9` | Ghost borders (15%)         |
| `error`                    | `#9f403d` | Critical failures           |

### Typography

- **Font**: Inter
- **KPI Heroics**: 3.5rem for key metrics
- **Editorial Headers**: 1.5rem with -0.02em letter-spacing
- **Micro-Data**: 0.6875rem in on-surface-variant
- **Functional Text**: 0.875rem for interactive elements

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Dashboard with Light Theme (Priority: P1)

A factory operator opens the dashboard and sees the new light-themed interface with proper visual hierarchy, readable text, and clear status indicators.

**Why this priority**: The dashboard is the primary entry point. All users will see this first, and it establishes the new visual identity.

**Independent Test**: Can be fully tested by loading the dashboard and verifying the background is light (#f7f9fb), text is dark (#2a3439), and cards appear lifted on the surface.

**Acceptance Scenarios**:

1. **Given** the application loads, **When** the user views the dashboard, **Then** the background displays in surface color (#f7f9fb) instead of dark (#09090b)
2. **Given** the dashboard displays, **When** viewing text content, **Then** primary text appears in on-surface color (#2a3439) with proper contrast
3. **Given** pipeline cards exist, **When** viewing the card list, **Then** cards appear white (#ffffff) with subtle shadows against the surface background

---

### User Story 2 - Navigate via Sidebar (Priority: P1)

Users navigate between dashboard sections using a persistent left sidebar instead of top navigation.

**Why this priority**: Navigation is fundamental to all user workflows. The sidebar layout matches the Stitch mocks and establishes the new structure.

**Independent Test**: Can be tested by clicking each sidebar item and verifying correct page routing.

**Acceptance Scenarios**:

1. **Given** the application loads, **When** viewing any page, **Then** a left sidebar displays with navigation items
2. **Given** the sidebar displays, **When** clicking "Pipelines", **Then** the user navigates to the pipeline list view
3. **Given** the sidebar displays, **When** clicking "New Spec", **Then** the user navigates to the create pipeline form

---

### User Story 3 - View Pipeline Status with Updated Styling (Priority: P2)

Users view a pipeline detail page with the updated stepper, gate panels, and activity log in the new design system.

**Why this priority**: Pipeline detail is the second most-visited screen after dashboard. It contains critical workflow controls.

**Independent Test**: Can be tested by opening a pipeline detail page and verifying visual styling matches mocks.

**Acceptance Scenarios**:

1. **Given** a pipeline exists, **When** viewing pipeline detail, **Then** the stage stepper shows active stage in primary teal (#006781)
2. **Given** a pipeline has a pending gate, **When** viewing the gate panel, **Then** approve button appears with gradient styling and "Request Rework" label appears for reject action
3. **Given** a pipeline has activity logs, **When** viewing the log panel, **Then** logs appear in a white card with proper typography hierarchy

---

### User Story 4 - Create New Pipeline with Updated Form (Priority: P2)

Users create a new pipeline using forms that follow the new input styling with ghost borders and proper focus states.

**Why this priority**: Creating pipelines is a core action but less frequent than viewing. Form styling should be consistent.

**Independent Test**: Can be tested by completing the create pipeline form and verifying visual styling.

**Acceptance Scenarios**:

1. **Given** the new pipeline form displays, **When** viewing input fields, **Then** inputs have surface-container-low background with ghost border
2. **Given** an input field exists, **When** focusing the field, **Then** the border becomes solid primary color (#006781)
3. **Given** the form is complete, **When** clicking submit, **Then** the button displays with gradient styling from primary to primary-dim

---

### User Story 5 - View Dashboard Metrics (Priority: P3)

Users see KPI metric cards on the dashboard displaying active pipelines, throughput, success rate, and average time.

**Why this priority**: Metrics provide value but are not required for core functionality. They enhance the dashboard experience.

**Independent Test**: Can be tested by loading dashboard and verifying metric cards display with proper styling.

**Acceptance Scenarios**:

1. **Given** pipelines exist, **When** viewing the dashboard, **Then** a row of metric cards displays above the pipeline list
2. **Given** metric cards display, **When** viewing a metric value, **Then** the number appears in display-lg size (3.5rem) as hero element
3. **Given** metric cards display, **When** viewing metric labels, **Then** labels appear in label-sm size in on-surface-variant color

---

### Edge Cases

- What happens when sidebar collapses on smaller viewports? Sidebar remains visible on screens 768px and wider; behavior below 768px is out of scope.
- How does system handle empty dashboard state? Empty state component follows new tonal styling with surface-container background.
- What happens when a very long pipeline title displays? Title truncates with ellipsis per current behavior.
- How do status colors adapt to light theme? Status colors use tonal backgrounds (sky-50, emerald-50, amber-50, red-50) instead of dark-themed variants.

## Requirements *(mandatory)*

### Design Fidelity Requirements

- **DFR-001**: UI MUST match Stitch mocks 1:1 in visual appearance
- **DFR-002**: All spacing, margins, and padding MUST match mock values exactly
- **DFR-003**: All color values MUST match the Stitch design system tokens precisely
- **DFR-004**: Typography (font sizes, weights, line heights) MUST match mocks exactly
- **DFR-005**: Component dimensions and proportions MUST match mocks
- **DFR-006**: Only deviate from mocks when a feature is technically infeasible; document any deviations with justification

### Functional Requirements

- **FR-001**: System MUST render all pages with light surface background (#f7f9fb)
- **FR-002**: System MUST display text in on-surface colors (#2a3439 primary, #566166 variant)
- **FR-003**: System MUST render cards without visible borders, using white background with subtle shadow
- **FR-004**: System MUST display primary buttons with gradient from #006781 to #005a71
- **FR-005**: System MUST include a left sidebar navigation with icons for Dashboard, Pipelines, New Spec, and Settings
- **FR-006**: System MUST render input fields with ghost borders that become solid primary on focus
- **FR-007**: System MUST display status badges with tonal backgrounds (not bordered/ring style)
- **FR-008**: System MUST render the stage stepper with primary teal for active state
- **FR-009**: System MUST use 0.25rem border-radius as default for components
- **FR-010**: Dashboard MUST display metric cards showing Active Pipelines, Throughput, Success Rate, and Avg Time
- **FR-011**: Gate panel MUST display "Request Rework" label for the reject action
- **FR-012**: System MUST apply glassmorphism (70% opacity, 20px blur) to floating elements like modals
- **FR-013**: System MUST apply subtle transitions (150-200ms duration) for hover, focus, and state changes on interactive elements

### Key Entities

- **Pipeline Card**: Visual representation of a pipeline with status badge, title, elapsed time, and stage indicator
- **Metric Card**: KPI display with label, hero value, optional trend indicator, and icon
- **Sidebar**: Navigation component with logo, nav items, and active state indication
- **Gate Panel**: Review interface with approve (gradient) and rework (secondary) actions

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: UI matches Stitch mocks with 1:1 visual fidelity when compared side-by-side
- **SC-002**: All pages render with correct surface color (#f7f9fb) as measured by visual inspection
- **SC-003**: Text contrast ratios meet WCAG AA standard (4.5:1 minimum for normal text)
- **SC-004**: Users can navigate to all sections via sidebar within 1 click
- **SC-005**: Build completes without TypeScript or CSS errors
- **SC-006**: Application remains responsive on screens 768px and wider
- **SC-007**: All interactive elements (buttons, inputs, links) have visible focus states
- **SC-008**: Any deviations from mocks are documented with technical justification

## Clarifications

### Session 2026-04-04

- Q: How should elements animate between states (hover, focus, state changes)? → A: Subtle transitions (150-200ms) for hover, focus, and state changes

## Assumptions

- Users have modern browsers (Chrome, Firefox, Safari, Edge) that support CSS backdrop-filter for glassmorphism
- Mobile (< 768px) support is out of scope for this refactor; focus on desktop/tablet
- Existing component logic and API interactions remain unchanged; this is a visual-only refactor
- Inter font is already loaded via Google Fonts in the application
- The design system is fully defined in Stitch and does not require additional design decisions
- Existing component structure (Card, Button, Badge, Input, etc.) will be modified in place rather than replaced
