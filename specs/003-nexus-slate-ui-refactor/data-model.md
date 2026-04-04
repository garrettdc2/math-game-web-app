# Data Model: Nexus Slate UI Refactor

**Feature**: 003-nexus-slate-ui-refactor
**Date**: 2026-04-04

## Overview

This is a visual-only refactor. No database schema changes required. This document captures the UI component "entities" that will be created or modified.

---

## New Components

### Sidebar

**Purpose**: Persistent left navigation for all pages

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| className | string | No | Additional CSS classes |

**Internal State**: None (stateless, uses react-router for active state)

**Structure**:
```typescript
interface NavItem {
  icon: LucideIcon;
  label: string;
  to: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/" },
  { icon: GitBranch, label: "Pipelines", to: "/" },
  { icon: FilePlus, label: "New Spec", to: "/new" },
  { icon: Settings, label: "Settings", to: "/settings" },
];
```

---

### MetricCard

**Purpose**: Display KPI metrics on dashboard

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Metric name (e.g., "Active Pipelines") |
| value | string \| number | Yes | Metric value |
| icon | LucideIcon | No | Optional icon |
| trend | { value: number; direction: 'up' \| 'down' } | No | Optional trend indicator |

**Usage**:
```tsx
<MetricCard
  label="Active Pipelines"
  value={counts.active}
  icon={Activity}
/>
```

---

## Modified Components

### Badge (ui/badge.tsx)

**Changes**:
- Remove ring/border styling
- Add tonal background variants for statuses
- Update text colors for light theme contrast

**New Variants**:
```typescript
const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        running: "bg-sky-50 text-sky-700",
        done: "bg-emerald-50 text-emerald-700",
        waiting: "bg-amber-50 text-amber-700",
        failed: "bg-red-50 text-red-700",
        default: "bg-surface-container text-on-surface",
      },
    },
  }
);
```

---

### Button (ui/button.tsx)

**Changes**:
- Primary variant uses gradient background
- Secondary uses ghost border
- Add transition timing

**New Variants**:
```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-150",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-br from-primary to-primary-dim text-on-primary hover:from-primary-dim hover:to-[#004d61]",
        secondary: "bg-transparent text-primary border border-outline-ghost hover:bg-surface-container",
        ghost: "text-on-surface-variant hover:bg-surface-container",
      },
    },
  }
);
```

---

### Card (ui/card.tsx)

**Changes**:
- Remove border
- Add shadow-lifted
- White background

**New Base**:
```typescript
const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-surface-container-lowest rounded-xl shadow-lifted",
        className
      )}
      {...props}
    />
  )
);
```

---

### Input (ui/input.tsx)

**Changes**:
- Ghost border default state
- Primary border on focus
- surface-container-low background

**New Styling**:
```typescript
className={cn(
  "bg-surface-container-low border border-outline-ghost rounded-lg px-3 py-2",
  "focus:border-primary focus:ring-1 focus:ring-primary/20",
  "placeholder:text-on-surface-variant/50",
  "transition-colors duration-150"
)}
```

---

## Theme Tokens

### globals.css Changes

**Remove** (dark theme):
```css
--color-page: #09090b;
--color-card: #0f0f11;
--color-elevated: #18181b;
--color-text-primary: #fafafa;
--color-accent: #fafafa;
```

**Add** (Nexus Slate):
```css
--color-surface: #f7f9fb;
--color-surface-container: #e8eff3;
--color-surface-container-low: #f0f4f7;
--color-surface-container-lowest: #ffffff;
--color-on-surface: #2a3439;
--color-on-surface-variant: #566166;
--color-primary: #006781;
--color-primary-dim: #005a71;
--color-on-primary: #eff9ff;
--color-outline-variant: #a9b4b9;
--color-outline-ghost: rgba(169, 180, 185, 0.15);
--color-error: #9f403d;
--shadow-lifted: 0 1px 3px rgba(42, 52, 57, 0.04), 0 1px 2px rgba(42, 52, 57, 0.02);
--shadow-elevated: 0 4px 12px rgba(42, 52, 57, 0.08), 0 2px 4px rgba(42, 52, 57, 0.04);
--transition-fast: 150ms ease-out;
--transition-normal: 200ms ease-out;
```

---

## No Database Changes

This refactor does not affect:
- API contracts
- Database schema
- Data flow or state management
- Business logic
