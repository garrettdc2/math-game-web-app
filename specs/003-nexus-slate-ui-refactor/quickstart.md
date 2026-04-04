# Quickstart: Nexus Slate UI Refactor

**Feature**: 003-nexus-slate-ui-refactor
**Date**: 2026-04-04

## Overview

This guide provides a quick reference for implementing the Nexus Slate design system in the Software Factory Dashboard.

---

## Prerequisites

- Node.js installed
- Project dependencies installed (`npm install` in `openclaw-factory/`)
- Access to Stitch mocks (Project ID: 814347126315821845)

---

## Development Server

```bash
cd openclaw-factory
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:8000

---

## Implementation Order

### Phase 1: Foundation (globals.css)

1. Replace all theme tokens in `src/styles/globals.css`
2. Verify body background changes to `#f7f9fb`
3. Confirm text colors update to `#2a3439`

### Phase 2: UI Primitives

Order of implementation:
1. `button.tsx` - Gradient primary, ghost secondary
2. `card.tsx` - Remove border, add shadow-lifted
3. `badge.tsx` - Tonal backgrounds for statuses
4. `input.tsx` & `textarea.tsx` - Ghost borders, focus states
5. `tabs.tsx` - Tonal active states

### Phase 3: Layout

1. Create `sidebar.tsx` - New navigation component
2. Update `App.tsx` - Wrap content in sidebar layout
3. Remove/update `topbar.tsx` - Adapt for new layout

### Phase 4: Feature Components

1. `pipeline-card.tsx` - Status badges, tonal hover
2. `stage-stepper.tsx` - Primary teal active state
3. `gate-panel.tsx` - Gradient approve, "Request Rework"
4. `filter-tabs.tsx` - New tab styling
5. `empty-state.tsx` - Tonal background
6. `error-panel.tsx` - Error styling
7. `memory-viewer.tsx` - Card styling
8. `connection-status.tsx` - Badge updates

### Phase 5: Pages

1. `dashboard.tsx` - Add metric cards, update layout
2. `pipeline.tsx` - Apply component updates
3. `new-pipeline.tsx` - Form styling

### Phase 6: New Components

1. Create `metric-card.tsx` - KPI display
2. Integrate into `dashboard.tsx`

---

## Key CSS Classes Reference

### Backgrounds
- Page canvas: `bg-surface`
- Section panels: `bg-surface-container`
- Cards: `bg-surface-container-lowest` (white)
- Input fields: `bg-surface-container-low`

### Text Colors
- Primary text: `text-on-surface`
- Secondary text: `text-on-surface-variant`
- Primary accent: `text-primary`

### Borders (use sparingly)
- Ghost border: `border border-outline-ghost`
- Focus state: `focus:border-primary`

### Shadows
- Cards: `shadow-lifted`
- Modals: `shadow-elevated`

### Buttons
- Primary: `bg-gradient-to-br from-primary to-primary-dim`
- Secondary: `border border-outline-ghost text-primary`
- Ghost: `hover:bg-surface-container`

### Status Badges
- Running: `bg-sky-50 text-sky-700`
- Done: `bg-emerald-50 text-emerald-700`
- Waiting: `bg-amber-50 text-amber-700`
- Failed: `bg-red-50 text-red-700`

---

## Verification Checklist

After each phase, verify:

- [ ] Background colors match Stitch mocks
- [ ] Text is readable (dark on light)
- [ ] Buttons have correct gradient/styling
- [ ] Cards have no borders, subtle shadow
- [ ] Interactive states work (hover, focus)
- [ ] Transitions are smooth (150-200ms)
- [ ] No TypeScript errors
- [ ] No CSS warnings

---

## Stitch Mock References

Open these screens in Stitch for visual comparison:

1. **Dashboard Home**: `e6569fddc1a8478399d78d5b67418ea8`
2. **Pipeline Detail**: `8674435b2cc74a4ab6a5746bea1c8288`
3. **Pipeline Management**: `b4b74c38365a42dfbf429d0c0b4afd35`
4. **Create New Spec**: `ab3cfcdbcb7241fcb19b5eb36acdec96`

---

## Common Issues

### Tailwind classes not applying
- Ensure `@theme` tokens are defined in globals.css
- Check that class names match token names exactly

### Ghost borders not visible
- Use `rgba(169, 180, 185, 0.15)` for 15% opacity
- May need to increase to 20% for very subtle backgrounds

### Gradient not showing
- Use `bg-gradient-to-br` (bottom-right direction)
- Ensure both `from-` and `to-` colors are specified

### Glassmorphism not working
- Requires browser support for `backdrop-filter`
- Add webkit prefix: `-webkit-backdrop-filter: blur(20px)`
