# Specification: Nexus Slate UI Refactor

## Overview

Transform the Software Factory Dashboard from its current dark theme to the "Nexus Slate" light-mode design system based on Stitch mocks (Project ID: 814347126315821845).

## Design System: Nexus Slate ("The Precision Engine")

### Core Principles

1. **No-Line Rule**: Use tonal shifts and subtle shadows instead of hard borders
2. **Ghost Borders**: When borders are needed, use 15% opacity (`rgba(169,180,185,0.15)`)
3. **Gradient Primary**: Buttons use `linear-gradient(145deg, #006781, #005a71)`
4. **Glassmorphism**: Floating elements use 70% opacity with 20px backdrop blur
5. **Minimal Rounding**: Default `0.25rem`, max `0.75rem` for cards

### Color Tokens

| Token | Current (Dark) | Target (Light) |
|-------|----------------|----------------|
| `--color-surface` | `#09090b` | `#f7f9fb` |
| `--color-surface-container` | `#0f0f11` | `#edf1f4` |
| `--color-surface-container-lowest` | `#18181b` | `#ffffff` |
| `--color-on-surface` | `#fafafa` | `#2a3439` |
| `--color-on-surface-variant` | `#71717a` | `#5a6970` |
| `--color-primary` | `#fafafa` | `#006781` |
| `--color-on-primary` | `#09090b` | `#ffffff` |
| `--color-outline-variant` | `rgba(255,255,255,0.06)` | `rgba(169,180,185,0.15)` |

### Status Colors

| Status | Color |
|--------|-------|
| Running | `#0284c7` (sky-600) |
| Done | `#059669` (emerald-600) |
| Waiting | `#d97706` (amber-600) |
| Failed | `#dc2626` (red-600) |

### Typography

- **Font Family**: Inter (already in use)
- **Headlines**: 600 weight
- **Body**: 400 weight
- **Labels**: 500 weight, 11px uppercase tracking

### Shadows

```css
--shadow-lifted: 0 1px 3px rgba(42,52,57,0.04), 0 1px 2px rgba(42,52,57,0.02);
--shadow-elevated: 0 4px 12px rgba(42,52,57,0.08), 0 2px 4px rgba(42,52,57,0.04);
```

---

## Screen Mapping

### 1. Dashboard Home (Stitch: `d90e03cb9a5f4012b8b52bf2b42e64de`)

**Current**: `src/pages/dashboard.tsx`

**Key Changes**:
- Add sidebar navigation (new component)
- Add metric cards row: Active Pipelines, Throughput, Success Rate, Avg Time
- Pipeline list uses tonal hover states instead of borders
- White card backgrounds with subtle shadow

### 2. Pipeline Detail (Stitch: `b0d73418fef743738c3a9dfafdc462ec`)

**Current**: `src/pages/pipeline.tsx`

**Key Changes**:
- Stage stepper uses primary teal for active state
- Gate panel: "Request Rework" button replaces "Reject", green "Approve"
- Activity log in white card with shadow
- Memory viewer follows same card pattern

### 3. Pipeline Management (Stitch: `aba05f2c0b7540ceb7f9cee1ac8bc5d2`)

**Current**: `src/pages/dashboard.tsx` (filter tabs section)

**Key Changes**:
- Filter tabs use pill style with tonal backgrounds
- Active tab has primary color background
- Status badges use tonal backgrounds (not rings)

### 4. Create New Spec (Stitch: `a6f46b494c824b4a9f96c25a1b9a80e2`)

**Current**: `src/pages/new-pipeline.tsx`

**Key Changes**:
- Form inputs have ghost borders
- Primary focus state with teal outline
- Template cards use hover:shadow-elevated
- Submit button uses gradient primary

---

## Component Specifications

### Button (`src/components/ui/button.tsx`)

```tsx
// Primary variant
className="bg-gradient-to-br from-[#006781] to-[#005a71] text-white rounded-lg
           hover:from-[#005a71] hover:to-[#004d61] shadow-lifted"

// Secondary variant
className="bg-surface-container text-on-surface rounded-lg
           hover:bg-surface-container/80"

// Ghost variant
className="text-on-surface-variant hover:bg-surface-container rounded-lg"
```

### Card (`src/components/ui/card.tsx`)

```tsx
className="bg-white rounded-xl shadow-lifted"
// No border - follows No-Line Rule
```

### Badge (`src/components/ui/badge.tsx`)

```tsx
// Running
className="bg-sky-50 text-sky-700 rounded-md"

// Done
className="bg-emerald-50 text-emerald-700 rounded-md"

// Waiting
className="bg-amber-50 text-amber-700 rounded-md"

// Failed
className="bg-red-50 text-red-700 rounded-md"
```

### Input (`src/components/ui/input.tsx`)

```tsx
className="bg-white border border-outline-variant rounded-lg px-3 py-2
           focus:border-primary focus:ring-1 focus:ring-primary/20
           placeholder:text-on-surface-variant/50"
```

### Tabs (`src/components/ui/tabs.tsx`)

```tsx
// TabsList
className="inline-flex gap-1 p-1 bg-surface-container rounded-lg"

// TabsTrigger
className="px-4 py-2 rounded-md text-on-surface-variant
           data-[state=active]:bg-primary data-[state=active]:text-white"
```

---

## New Components

### Sidebar (`src/components/sidebar.tsx`)

```tsx
interface SidebarProps {
  className?: string;
}

// Structure
<aside className="w-64 bg-surface-container-lowest border-r border-outline-variant">
  <div className="p-4">
    <Logo />
  </div>
  <nav className="px-2">
    <NavItem icon={LayoutDashboard} label="Dashboard" to="/" />
    <NavItem icon={GitBranch} label="Pipelines" to="/pipelines" />
    <NavItem icon={FilePlus} label="New Spec" to="/new" />
    <NavItem icon={Settings} label="Settings" to="/settings" />
  </nav>
</aside>
```

### MetricCard (`src/components/metric-card.tsx`)

```tsx
interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  icon?: LucideIcon;
}

// Structure
<div className="bg-white rounded-xl shadow-lifted p-5">
  <div className="flex items-center gap-3">
    {icon && <div className="p-2 bg-primary/10 rounded-lg"><Icon className="h-5 w-5 text-primary" /></div>}
    <div>
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="text-2xl font-semibold text-on-surface">{value}</p>
    </div>
  </div>
  {trend && <TrendIndicator {...trend} />}
</div>
```

---

## Layout Changes

### App.tsx

Update root layout from single-column to sidebar + main:

```tsx
<div className="min-h-screen flex bg-surface">
  <Sidebar />
  <div className="flex-1 flex flex-col">
    <Topbar />
    <main className="flex-1 overflow-auto">
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/new" element={<NewPipelinePage />} />
        <Route path="/pipeline/:taskId" element={<PipelinePage />} />
      </Routes>
    </main>
  </div>
</div>
```

---

## Files to Modify

### Phase 1: Foundation
- `src/styles/globals.css` — Replace all theme tokens

### Phase 2: UI Primitives
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/tabs.tsx`

### Phase 3: Feature Components
- `src/components/topbar.tsx`
- `src/components/pipeline-card.tsx`
- `src/components/stage-stepper.tsx`
- `src/components/gate-panel.tsx`
- `src/components/filter-tabs.tsx`
- `src/components/error-panel.tsx`
- `src/components/empty-state.tsx`
- `src/components/memory-viewer.tsx`
- `src/components/connection-status.tsx`

### Phase 4: Pages
- `src/pages/dashboard.tsx`
- `src/pages/pipeline.tsx`
- `src/pages/new-pipeline.tsx`

### Phase 5: Layout & New Components
- `src/App.tsx` — Add sidebar layout wrapper
- `src/components/sidebar.tsx` — **NEW**
- `src/components/metric-card.tsx` — **NEW**

---

## Acceptance Criteria

1. All pages render with light theme (#f7f9fb background)
2. Primary actions use teal gradient buttons
3. Cards have no borders, use shadow-lifted
4. Status badges use tonal backgrounds
5. Sidebar navigation is functional
6. Dashboard displays 4 metric cards
7. Text contrast meets WCAG AA (4.5:1 minimum)
8. No TypeScript or build errors
9. Responsive on desktop (1024px+) and tablet (768px+)

---

## Source References

- **Stitch Project**: 814347126315821845
- **Design System**: Nexus Slate (asset ID: 15996705518239280238)
- **Key Screens**:
  - Dashboard Home: `d90e03cb9a5f4012b8b52bf2b42e64de`
  - Pipeline Detail: `b0d73418fef743738c3a9dfafdc462ec`
  - Pipeline Management: `aba05f2c0b7540ceb7f9cee1ac8bc5d2`
  - Create New Spec: `a6f46b494c824b4a9f96c25a1b9a80e2`
