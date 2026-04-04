# Research: Nexus Slate UI Refactor

**Feature**: 003-nexus-slate-ui-refactor
**Date**: 2026-04-04

## Overview

This research document captures decisions and patterns for implementing the Nexus Slate design system. Since the design system is fully specified in Stitch, most decisions are pre-made. This document focuses on implementation patterns.

---

## Decision 1: Tailwind CSS 4 Theme Token Strategy

**Decision**: Use CSS custom properties via Tailwind's `@theme` directive for all design tokens

**Rationale**:
- Tailwind CSS 4's `@theme` directive provides first-class support for CSS custom properties
- Current codebase already uses this pattern in `globals.css`
- Allows design tokens to be centralized and referenced consistently
- Supports runtime theming if needed in future

**Alternatives considered**:
- Hardcoded hex values in components: Rejected - poor maintainability
- JavaScript theme object: Rejected - unnecessary complexity for CSS-only changes

---

## Decision 2: No-Line Rule Implementation

**Decision**: Remove all `border-border` classes; replace with tonal background shifts and `shadow-lifted`

**Rationale**:
- Design system explicitly prohibits 1px solid borders for sectioning
- Tonal layering creates hierarchy through surface color progression
- `shadow-lifted` (subtle ambient shadow) provides lift for cards without borders

**Implementation Pattern**:
```css
/* Before (current dark theme) */
.card { border: 1px solid var(--color-border); }

/* After (Nexus Slate) */
.card {
  background: var(--color-surface-container-lowest);
  box-shadow: var(--shadow-lifted);
}
```

---

## Decision 3: Ghost Border Specification

**Decision**: Ghost borders use `rgba(169, 180, 185, 0.15)` - 15% opacity of `outline-variant`

**Rationale**:
- Design system specifies ghost borders at exactly 15% opacity
- Used only when dividers are mandatory for accessibility
- Primary use case: input field default state, data table dividers

**Implementation**:
```css
--color-outline-ghost: rgba(169, 180, 185, 0.15);
```

---

## Decision 4: Gradient Button Implementation

**Decision**: Use CSS linear gradient with 145deg angle from `primary` to `primary-dim`

**Rationale**:
- Design system describes "machined metallic finish" at 145-degree angle
- Hover state shifts gradient endpoints darker
- Maintains teal brand color while adding depth

**Implementation**:
```css
.btn-primary {
  background: linear-gradient(145deg, #006781, #005a71);
}
.btn-primary:hover {
  background: linear-gradient(145deg, #005a71, #004d61);
}
```

---

## Decision 5: Glassmorphism Implementation

**Decision**: 70% opacity + 20px backdrop-blur for floating elements

**Rationale**:
- Design system specifies exact values
- Requires modern browser support (assumption documented in spec)
- Applied to modals, dropdowns, tooltips

**Implementation**:
```css
.glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
```

---

## Decision 6: Typography Scale

**Decision**: Use existing Inter font with specific size/weight combinations from design system

**Rationale**:
- Inter already loaded via Google Fonts
- Design system provides exact specifications for each text role

**Typography Tokens**:
| Role | Size | Weight | Line Height | Use |
|------|------|--------|-------------|-----|
| display-lg | 3.5rem (56px) | 600 | 1.1 | KPI hero numbers |
| headline-sm | 1.5rem (24px) | 600 | 1.2 | Page titles |
| body-md | 0.875rem (14px) | 400 | 1.5 | Functional text |
| label-sm | 0.6875rem (11px) | 500 | 1.4 | Metadata, timestamps |

---

## Decision 7: Transition Timing

**Decision**: 150-200ms duration with ease-out easing for state changes

**Rationale**:
- Clarified during specification phase
- Matches design system's mention of subtle transitions
- Balances responsiveness with smoothness

**Implementation**:
```css
--transition-fast: 150ms ease-out;
--transition-normal: 200ms ease-out;
```

---

## Decision 8: Status Color Adaptation

**Decision**: Use tonal backgrounds (sky-50, emerald-50, amber-50, red-50) with darker text

**Rationale**:
- Light theme requires lighter backgrounds with dark text for contrast
- Tailwind's -50 variants provide appropriate tonal backgrounds
- Text uses -700 variants for WCAG AA compliance

**Status Color Map**:
| Status | Background | Text |
|--------|------------|------|
| Running | sky-50 (#f0f9ff) | sky-700 (#0369a1) |
| Done | emerald-50 (#ecfdf5) | emerald-700 (#047857) |
| Waiting | amber-50 (#fffbeb) | amber-700 (#b45309) |
| Failed | red-50 (#fef2f2) | red-700 (#b91c1c) |

---

## Decision 9: Sidebar Navigation Structure

**Decision**: Fixed 256px (w-64) sidebar with icon + label navigation items

**Rationale**:
- Matches Stitch mock layout
- Standard sidebar width for desktop applications
- Active state uses primary background color

**Navigation Items**:
1. Dashboard (LayoutDashboard icon) → `/`
2. Pipelines (GitBranch icon) → `/pipelines` (if exists, else `/`)
3. New Spec (FilePlus icon) → `/new`
4. Settings (Settings icon) → `/settings` (placeholder)

---

## Decision 10: New Component Placement

**Decision**: Create `sidebar.tsx` and `metric-card.tsx` in `src/components/`

**Rationale**:
- Follows existing project structure
- Not placed in `ui/` as they are feature-specific, not generic primitives
- Sidebar is layout-level; metric-card is domain-specific

---

## No Further Clarifications Required

All NEEDS CLARIFICATION items from Technical Context have been resolved through:
1. Analysis of existing codebase (Tailwind 4, React 19, etc.)
2. Design system specification from Stitch
3. Spec clarification session (transitions)
