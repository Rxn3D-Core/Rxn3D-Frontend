# Waffle Launcher — Design Spec

**Date:** 2026-06-17  
**Status:** Approved

---

## Overview

Replace the persistent left-rail sidebar with a Google-style app launcher (waffle/grid icon) in the header. Clicking the icon opens a floating Radix Popover panel showing all role-based nav items as a 3-column icon+label grid.

---

## Architecture

### 1. Hide DashboardSidebar

Add `return null` at the top of `DashboardSidebar` (before any other logic), guarded by a comment so it can be reverted in one line. No layout files change.

**File:** `components/dashboard/dashboard-sidebar.tsx`

```tsx
// ponytail: sidebar hidden for waffle launcher — remove this line to re-enable
return null
```

### 2. New Component: `HeaderWaffleLauncher`

**File:** `components/header-waffle-launcher.tsx`

Self-contained Radix Popover component. No Zustand store — open state is local `useState`.

**Props:** none (reads from `useAuth()` context internally)

**Data pipeline (same as sidebar):**
```
useAuth() → user.roles + user.permissions
  → getMenuForProfile(role, customerType)
  → filterMenuByPermissions(menu, permissions)
  → flattenToNavigableItems(menu)  // inline helper, ~10 lines
```

`flattenToNavigableItems`: iterates menu, skips parent-only items (no `path`), flattens children into a single array. Items with a `path` are included; parent wrapper items (only `children`, no `path`) are dropped but their children are promoted.

**Tile render:**
- Each tile: `Link href={item.path}` wrapping a `div` with icon (top) + label (bottom)
- Grid: `grid grid-cols-3 gap-1`
- Active tile (pathname starts with `item.path`): blue ring `ring-2 ring-[#1162a8]`
- Dark mode: `dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200`
- Hover: `hover:bg-gray-100 dark:hover:bg-gray-700`
- Tile size: `w-20 h-20 flex flex-col items-center justify-center gap-1 rounded-lg text-xs text-center`

**Popover panel:**
- `PopoverContent` with `align="start"`, `sideOffset={8}`
- Max height `max-h-[70vh] overflow-y-auto`
- Width `w-[280px]`
- Header: "Navigation" label in small gray text
- Shadow + border consistent with existing Radix dropdowns in the app

**Trigger button:**
- `LayoutGrid` icon from lucide-react (24px)
- Same ghost button style as the ThemeToggle / Settings buttons in the header right section
- `aria-label="Open navigation"`

### 3. Modify `components/header.tsx`

Insert `<HeaderWaffleLauncher />` as the **first child** of the Left Section div (line ~853), before the "New Slip" button.

```tsx
<div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 flex-shrink-0">
  <HeaderWaffleLauncher />   {/* ← insert here */}
  {!isSuperAdmin && canCreateSlip && ( ... )}
  ...
```

---

## Component Boundaries

| Unit | Responsibility |
|------|---------------|
| `DashboardSidebar` | Unchanged, just returns null |
| `HeaderWaffleLauncher` | Trigger + popover + grid rendering |
| `header.tsx` | Mounts `HeaderWaffleLauncher` in left section |
| `config/sidebar-menu.tsx` | No changes — data source reused as-is |
| `lib/menu-permissions.ts` | No changes — filter reused as-is |

---

## Behavior

- Click trigger → open popover
- Click tile → navigate to route, popover closes (Radix closes on focus loss / outside click)
- Keyboard: Radix Popover handles focus trap and Esc to close
- Active route: tile has blue ring highlight
- Role-based: only tiles the user has permission to see are shown (same as sidebar)

---

## Out of Scope

- Animation/transition on popover (Radix defaults are fine)
- Search within the launcher
- Pinning/reordering tiles
- Re-enabling the sidebar (one-line revert when needed)

---

## Files Changed

1. `components/dashboard/dashboard-sidebar.tsx` — add `return null` (1 line)
2. `components/header-waffle-launcher.tsx` — new file (~80 lines)
3. `components/header.tsx` — add `<HeaderWaffleLauncher />` import + usage (~3 lines)
