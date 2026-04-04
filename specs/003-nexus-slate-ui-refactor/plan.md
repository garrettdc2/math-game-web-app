# Implementation Plan: Nexus Slate UI Refactor

**Branch**: `003-nexus-slate-ui-refactor` | **Date**: 2026-04-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-nexus-slate-ui-refactor/spec.md`

## Summary

Transform the Software Factory Dashboard from dark theme to the "Nexus Slate" light-mode design system. This is a visual-only refactor with 1:1 fidelity to Stitch mocks. Key changes include: light surface backgrounds, tonal layering instead of borders, gradient primary buttons, new sidebar navigation, and dashboard metric cards.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19.1
**Primary Dependencies**: Vite 6.3, Tailwind CSS 4.1, Radix UI, Lucide React, class-variance-authority
**Storage**: N/A (visual-only refactor)
**Testing**: Manual visual inspection against Stitch mocks (no automated visual regression tests in project)
**Target Platform**: Web (desktop/tablet, 768px+ viewports)
**Project Type**: Frontend web application (React SPA)
**Performance Goals**: Maintain current performance; subtle 150-200ms transitions
**Constraints**: Must support CSS backdrop-filter for glassmorphism; Inter font required
**Scale/Scope**: ~25 source files to modify, 3 pages, ~15 components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution is not yet configured (template placeholder). No specific gates to enforce. Proceeding with standard best practices:

- [x] Visual-only changes preserve existing functionality
- [x] No new dependencies required
- [x] Existing component structure maintained
- [x] Changes are additive to CSS/styling, not architectural

## Project Structure

### Documentation (this feature)

```text
specs/003-nexus-slate-ui-refactor/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal for visual refactor)
├── quickstart.md        # Phase 1 output
├── contracts/           # N/A - no API contracts for visual refactor
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
openclaw-factory/
├── src/
│   ├── styles/
│   │   └── globals.css          # Theme tokens (PRIMARY CHANGE)
│   ├── components/
│   │   ├── ui/
│   │   │   ├── badge.tsx        # Status badge styling
│   │   │   ├── button.tsx       # Gradient primary, variants
│   │   │   ├── card.tsx         # Borderless, shadow-lifted
│   │   │   ├── input.tsx        # Ghost border, focus states
│   │   │   ├── tabs.tsx         # Tonal active states
│   │   │   └── textarea.tsx     # Ghost border, focus states
│   │   ├── connection-status.tsx
│   │   ├── empty-state.tsx
│   │   ├── error-panel.tsx
│   │   ├── filter-tabs.tsx
│   │   ├── gate-panel.tsx       # Approve/Rework buttons
│   │   ├── memory-viewer.tsx
│   │   ├── pipeline-card.tsx    # Status badges, tonal hover
│   │   ├── stage-stepper.tsx    # Primary teal active state
│   │   ├── topbar.tsx
│   │   ├── sidebar.tsx          # NEW COMPONENT
│   │   └── metric-card.tsx      # NEW COMPONENT
│   ├── pages/
│   │   ├── dashboard.tsx        # Metric cards, layout
│   │   ├── pipeline.tsx         # Updated styling
│   │   └── new-pipeline.tsx     # Form styling
│   └── App.tsx                  # Sidebar layout wrapper
└── package.json
```

**Structure Decision**: Existing single-app structure maintained. Two new components added (sidebar.tsx, metric-card.tsx). All other changes are in-place modifications to existing files.

## Complexity Tracking

No constitution violations to justify. This is a straightforward visual refactor with:
- No new architectural patterns
- No new dependencies
- Existing component structure preserved
- Scope limited to CSS/styling changes
