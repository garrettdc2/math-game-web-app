# Tasks: Nexus Slate UI Refactor

**Input**: Design documents from `/specs/003-nexus-slate-ui-refactor/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: No automated tests requested - this is a visual refactor verified by manual inspection against Stitch mocks.

**Organization**: Tasks are grouped by user story to enable independent implementation and visual verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)
- File paths relative to `openclaw-factory/`

---

## Phase 1: Setup (Foundation)

**Purpose**: Replace CSS theme tokens - ALL subsequent styling depends on this

- [X] T001 Replace dark theme tokens with Nexus Slate light theme in `src/styles/globals.css`
  - Remove: `--color-page`, `--color-card`, `--color-elevated`, `--color-text-primary`, `--color-accent`
  - Add: `--color-surface`, `--color-surface-container`, `--color-surface-container-low`, `--color-surface-container-lowest`
  - Add: `--color-on-surface`, `--color-on-surface-variant`, `--color-primary`, `--color-primary-dim`, `--color-on-primary`
  - Add: `--color-outline-variant`, `--color-outline-ghost`, `--color-error`
  - Add: `--shadow-lifted`, `--shadow-elevated`, `--transition-fast`, `--transition-normal`

**Checkpoint**: Body background should change to #f7f9fb, text to #2a3439

---

## Phase 2: Foundational (UI Primitives)

**Purpose**: Update base UI components that ALL feature components depend on

**CRITICAL**: These must be complete before user story work begins

- [X] T002 [P] Update Button component with gradient primary, ghost secondary in `src/components/ui/button.tsx`
  - Primary: `bg-gradient-to-br from-primary to-primary-dim`
  - Secondary: ghost border, `text-primary`
  - Ghost: `hover:bg-surface-container`
  - Add `transition-all duration-150`

- [X] T003 [P] Update Card component to borderless with shadow in `src/components/ui/card.tsx`
  - Remove: `border-border` class
  - Add: `bg-surface-container-lowest`, `shadow-lifted`, `rounded-xl`

- [X] T004 [P] Update Badge component with tonal status variants in `src/components/ui/badge.tsx`
  - Remove: ring/border styling
  - Add variants: running (sky-50/sky-700), done (emerald-50/emerald-700), waiting (amber-50/amber-700), failed (red-50/red-700)

- [X] T005 [P] Update Input component with ghost borders in `src/components/ui/input.tsx`
  - Background: `bg-surface-container-low`
  - Border: `border-outline-ghost`, focus: `border-primary`
  - Add: `transition-colors duration-150`

- [X] T006 [P] Update Textarea component with ghost borders in `src/components/ui/textarea.tsx`
  - Same styling as Input (T005)

- [X] T007 [P] Update Tabs component with tonal active state in `src/components/ui/tabs.tsx`
  - Active: `bg-primary text-on-primary`
  - Inactive: `text-on-surface-variant hover:bg-surface-container`

**Checkpoint**: All primitives updated - verify buttons gradient, cards shadowless, inputs have ghost borders

---

## Phase 3: User Story 1 - Dashboard with Light Theme (Priority: P1)

**Goal**: Factory operator sees light-themed dashboard with proper visual hierarchy

**Independent Test**: Load dashboard, verify background is #f7f9fb, text is #2a3439, cards are white with shadows

### Implementation for User Story 1

- [X] T008 [P] [US1] Update PipelineCard with tonal hover in `src/components/pipeline-card.tsx`
  - Apply new Badge status variants
  - Add: `hover:bg-surface-container` tonal effect
  - Ensure text colors use `text-on-surface` and `text-on-surface-variant`

- [X] T009 [P] [US1] Update FilterTabs with new styling in `src/components/filter-tabs.tsx`
  - Apply updated Tabs styling (tonal active state)
  - Use `text-on-surface-variant` for inactive

- [X] T010 [P] [US1] Update EmptyState with tonal background in `src/components/empty-state.tsx`
  - Background: `bg-surface-container`
  - Text: `text-on-surface-variant`

- [X] T011 [P] [US1] Update ErrorPanel styling in `src/components/error-panel.tsx`
  - Use `--color-error` token
  - Apply tonal error background

- [X] T012 [P] [US1] Update ConnectionStatus with badge updates in `src/components/connection-status.tsx`
  - Apply new Badge variants for status indicators

- [X] T013 [US1] Update Dashboard page layout in `src/pages/dashboard.tsx`
  - Apply surface background to page
  - Verify PipelineCard, FilterTabs render correctly
  - Adjust any hardcoded colors to use theme tokens

**Checkpoint**: Dashboard fully renders in light theme with proper contrast

---

## Phase 4: User Story 2 - Sidebar Navigation (Priority: P1)

**Goal**: Users navigate via persistent left sidebar instead of top navigation

**Independent Test**: Click each sidebar item, verify correct page routing

### Implementation for User Story 2

- [X] T014 [US2] Create Sidebar component in `src/components/sidebar.tsx`
  - Fixed width: `w-64` (256px)
  - Background: `bg-surface-container`
  - Nav items: Dashboard (LayoutDashboard), Pipelines (GitBranch), New Spec (FilePlus), Settings (Settings)
  - Active state: `bg-primary text-on-primary`
  - Use react-router NavLink for active detection

- [X] T015 [US2] Update App layout to include sidebar in `src/App.tsx`
  - Wrap content: `<div className="min-h-screen flex">`
  - Add `<Sidebar />` before main content
  - Main content: `<main className="flex-1 bg-surface">`

- [X] T016 [US2] Update/adapt Topbar for new layout in `src/components/topbar.tsx`
  - Remove redundant navigation (now in sidebar)
  - Apply glassmorphism: `bg-white/70 backdrop-blur-xl`
  - Adjust to work within new main content area

**Checkpoint**: Sidebar visible on all pages, navigation works, no duplicate nav elements

---

## Phase 5: User Story 3 - Pipeline Detail Styling (Priority: P2)

**Goal**: Pipeline detail page displays with updated stepper, gate panels, activity log

**Independent Test**: Open pipeline detail, verify stage stepper shows active in teal, gate panel has gradient approve button

### Implementation for User Story 3

- [X] T017 [P] [US3] Update StageStepper with primary active state in `src/components/stage-stepper.tsx`
  - Active stage: `bg-primary text-on-primary`
  - Completed: checkmark icon, `text-primary`
  - Upcoming: `text-on-surface-variant`

- [X] T018 [P] [US3] Update GatePanel with gradient approve in `src/components/gate-panel.tsx`
  - Approve button: gradient primary (from Button component)
  - Reject: Change label to "Request Rework", secondary styling
  - Card styling: white background, shadow-lifted

- [X] T019 [P] [US3] Update MemoryViewer card styling in `src/components/memory-viewer.tsx`
  - Apply Card component styling (white, shadow-lifted)
  - Text hierarchy with on-surface colors

- [X] T020 [US3] Update Pipeline page in `src/pages/pipeline.tsx`
  - Apply surface background
  - Verify all child components render with new styling
  - Typography hierarchy for headers/metadata

**Checkpoint**: Pipeline detail fully styled, stepper/gate panel match Stitch mocks

---

## Phase 6: User Story 4 - New Pipeline Form Styling (Priority: P2)

**Goal**: Create pipeline form follows new input styling with ghost borders and focus states

**Independent Test**: Complete create form, verify inputs have ghost borders, focus shows primary color, submit has gradient

### Implementation for User Story 4

- [X] T021 [US4] Update NewPipeline page form styling in `src/pages/new-pipeline.tsx`
  - Apply updated Input/Textarea components
  - Submit button: gradient primary
  - Form container: Card styling (white, shadow)
  - Labels: `text-on-surface-variant`, `text-sm`

**Checkpoint**: Form inputs show ghost borders, focus states work, submit button has gradient

---

## Phase 7: User Story 5 - Dashboard Metrics (Priority: P3)

**Goal**: Dashboard displays KPI metric cards (Active Pipelines, Throughput, Success Rate, Avg Time)

**Independent Test**: Load dashboard with pipelines, verify metric cards display with hero numbers

### Implementation for User Story 5

- [X] T022 [US5] Create MetricCard component in `src/components/metric-card.tsx`
  - Props: `label`, `value`, `icon?`, `trend?`
  - Value styling: `text-5xl font-semibold` (3.5rem hero)
  - Label: `text-sm text-on-surface-variant`
  - Card styling: white background, shadow-lifted
  - Optional trend indicator (up/down arrow with color)

- [X] T023 [US5] Integrate MetricCards into Dashboard in `src/pages/dashboard.tsx`
  - Add metric card row above pipeline list
  - Calculate metrics from pipeline data:
    - Active Pipelines: `counts.active`
    - Throughput: pipelines completed per day
    - Success Rate: % completed vs total
    - Avg Time: mean elapsed time
  - Use Lucide icons: Activity, TrendingUp, CheckCircle, Clock

**Checkpoint**: Dashboard shows 4 metric cards with proper styling and calculated values

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and cleanup

- [X] T024 [P] Verify all pages render with correct surface background
- [X] T025 [P] Verify text contrast meets WCAG AA (4.5:1)
- [X] T026 [P] Verify all interactive elements have visible focus states
- [X] T027 [P] Test transitions are smooth (150-200ms)
- [X] T028 Visual comparison against Stitch mocks (all 4 screens)
- [X] T029 Remove any unused dark theme CSS/classes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - MUST complete first
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Phase 2 completion
  - US1 and US2 are both P1, can run in parallel
  - US3 and US4 are both P2, can run in parallel (after P1 or concurrent)
  - US5 is P3, can start after Phase 2
- **Phase 8 (Polish)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 - No story dependencies
- **US2 (P1)**: Can start after Phase 2 - No story dependencies (but affects layout for all)
- **US3 (P2)**: Can start after Phase 2 - Independent of other stories
- **US4 (P2)**: Can start after Phase 2 - Independent of other stories
- **US5 (P3)**: Can start after Phase 2 - Requires Dashboard (US1) complete for integration

### Recommended Sequence

1. T001 (globals.css) - Foundation
2. T002-T007 in parallel (UI primitives)
3. T014-T016 (Sidebar/Layout - affects all pages)
4. T008-T013 in parallel (Dashboard components)
5. T017-T020 in parallel (Pipeline detail)
6. T021 (New pipeline form)
7. T022-T023 (Metric cards)
8. T024-T029 (Polish)

### Parallel Opportunities

- **Phase 2**: All 6 primitive tasks (T002-T007) can run in parallel
- **US1**: Tasks T008-T012 can run in parallel
- **US3**: Tasks T017-T019 can run in parallel
- **US1+US3+US4**: These stories affect different files and can run in parallel after layout (US2)

---

## Stitch Mock Verification

After each phase, compare against Stitch screens:

| Screen | ID | Verifies |
|--------|-----|----------|
| Dashboard Home | `e6569fddc1a8478399d78d5b67418ea8` | US1, US5 |
| Pipeline Detail | `8674435b2cc74a4ab6a5746bea1c8288` | US3 |
| Pipeline Management | `b4b74c38365a42dfbf429d0c0b4afd35` | US1, US2 |
| Create New Spec | `ab3cfcdbcb7241fcb19b5eb36acdec96` | US4 |

---

## Notes

- All file paths relative to `openclaw-factory/`
- Visual refactor only - no API or data flow changes
- Verify with `npm run dev` in openclaw-factory/
- [P] tasks = different files, safe to parallelize
- Commit after each phase or logical task group

## Implementation Status

**Completed**: 2026-04-04
**All 29 tasks completed** using parallel agent execution.
