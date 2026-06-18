# Waffle Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the persistent left-rail sidebar with a Google-style waffle/grid icon launcher in the header that shows role-based nav items in a floating 3-column popup.

**Architecture:** Hide `DashboardSidebar` via a single `return null` guard (easy to revert), create a new self-contained `HeaderWaffleLauncher` component using Radix Popover with local `useState`, and mount it as the first child of the Header's left section. Menu data comes from the same pipeline already used by the sidebar (`getMenuForProfile` → `filterMenuByPermissions`).

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Radix UI Popover (already installed via shadcn), lucide-react, Tailwind CSS, react-i18next

## Global Constraints

- No new npm dependencies — Radix Popover, lucide-react, Tailwind are already installed
- TypeScript strict — no `any`, no implicit types on exported functions
- Immutable patterns — no object mutation
- Dark mode support via Tailwind `dark:` classes throughout
- i18n via `t("menu.<id>")` pattern (matches existing sidebar translations)
- Files stay under 200 lines

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `components/dashboard/dashboard-sidebar.tsx` | Add `return null` to hide sidebar |
| Create | `components/header-waffle-launcher.tsx` | Waffle trigger + Popover + nav grid |
| Modify | `components/header.tsx` | Import and mount `HeaderWaffleLauncher` |

---

### Task 1: Hide the sidebar

**Files:**
- Modify: `components/dashboard/dashboard-sidebar.tsx` (line 29, inside `DashboardSidebar` function, before any hooks)

**Interfaces:**
- Produces: nothing new — just a null render so all ~45 layout files that use `<DashboardSidebar />` stop rendering the sidebar without any layout file changes

> **IMPORTANT:** `return null` must go AFTER all hook calls because React hooks cannot be called conditionally. Place it after all the `useState`, `useEffect`, `useMemo` calls — right before the final `return (` JSX block.

- [ ] **Step 1: Find the final return statement**

Open `components/dashboard/dashboard-sidebar.tsx` and locate the main JSX return (around line 840+ based on the file). It starts with `return (` and renders the sidebar HTML.

- [ ] **Step 2: Add the null guard just before the JSX return**

In `components/dashboard/dashboard-sidebar.tsx`, find the line that reads `return (` for the main JSX output (the one that renders `<div className="hidden md:flex ...`). Insert these two lines immediately above it:

```tsx
  // ponytail: sidebar hidden for waffle launcher — remove these 2 lines to re-enable
  if (true) return null
```

The `if (true)` wrapper makes it a single-line revert (delete the line) without needing to restructure hook ordering.

- [ ] **Step 3: Verify the app still renders**

```bash
cd "Rxn3D-Frontend" && npm run build 2>&1 | tail -20
```

Expected: build succeeds with no TypeScript errors. The sidebar simply won't render.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/dashboard-sidebar.tsx
git commit -m "feat: hide sidebar for waffle launcher migration"
```

---

### Task 2: Create HeaderWaffleLauncher component

**Files:**
- Create: `components/header-waffle-launcher.tsx`

**Interfaces:**
- Consumes:
  - `useAuth()` from `@/contexts/auth-context` → `{ user, profilePermissions, isSuperadmin }`
  - `getPrimaryRole(user)` from `@/lib/get-primary-role` → `string`
  - `PROFILE_SCOPED_ROLES` from `@/lib/permissions` → `readonly string[]`
  - `getMenuForProfile(role: string, customerType?: string | null)` from `@/config/sidebar-menu` → `MenuItem[]`
  - `filterMenuByPermissions(items: MenuItem[], permissions: string[], isSuperadmin: boolean)` from `@/lib/menu-permissions` → `MenuItem[]`
  - `MenuItem` interface from `@/config/sidebar-menu` → `{ id: string, title: string, icon?: ReactNode, path?: string, children?: MenuItem[], permission?: string[] }`
  - `useTranslation()` from `react-i18next` → `{ t }`
  - `usePathname()` from `next/navigation` → `string`
  - `Popover, PopoverContent, PopoverTrigger` from `@/components/ui/popover`
  - `LayoutGrid` from `lucide-react`
  - `Link` from `next/link`
  - `Button` from `@/components/ui/button`
- Produces: `export function HeaderWaffleLauncher(): JSX.Element` — a self-contained button+popover with no props

- [ ] **Step 1: Write the test file**

Create `components/__tests__/header-waffle-launcher.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HeaderWaffleLauncher } from "@/components/header-waffle-launcher"

// Mock auth context
jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { roles: ["lab_admin"] },
    profilePermissions: [],
    isSuperadmin: false,
  }),
}))

// Mock menu config
jest.mock("@/config/sidebar-menu", () => ({
  getMenuForProfile: () => [
    { id: "dashboard", title: "Dashboard", path: "/dashboard", icon: null, permission: [] },
    {
      id: "cases",
      title: "Cases",
      icon: null,
      children: [
        { id: "all-cases", title: "All Cases", path: "/cases/all", icon: null, permission: [] },
      ],
    },
  ],
}))

jest.mock("@/lib/menu-permissions", () => ({
  filterMenuByPermissions: (_items: any, _perms: any, isSuperadmin: boolean) =>
    isSuperadmin ? _items : _items,
}))

jest.mock("@/lib/get-primary-role", () => ({ getPrimaryRole: () => "lab_admin" }))
jest.mock("@/lib/permissions", () => ({ PROFILE_SCOPED_ROLES: ["lab_admin"] }))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }))

describe("HeaderWaffleLauncher", () => {
  it("renders the grid trigger button", () => {
    render(<HeaderWaffleLauncher />)
    expect(screen.getByRole("button", { name: /open navigation/i })).toBeInTheDocument()
  })

  it("opens popover on click and shows nav tiles", async () => {
    render(<HeaderWaffleLauncher />)
    await userEvent.click(screen.getByRole("button", { name: /open navigation/i }))
    expect(screen.getByText("menu.dashboard")).toBeInTheDocument()
    expect(screen.getByText("menu.all-cases")).toBeInTheDocument()
  })

  it("does NOT render parent-only items without a path", async () => {
    render(<HeaderWaffleLauncher />)
    await userEvent.click(screen.getByRole("button", { name: /open navigation/i }))
    // "cases" has no path — only its child "all-cases" should appear
    expect(screen.queryByText("menu.cases")).not.toBeInTheDocument()
  })

  it("highlights the active tile", async () => {
    render(<HeaderWaffleLauncher />)
    await userEvent.click(screen.getByRole("button", { name: /open navigation/i }))
    const dashboardLink = screen.getByRole("link", { name: /menu.dashboard/i })
    expect(dashboardLink.closest("div")).toHaveClass("ring-2")
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd "Rxn3D-Frontend" && npx jest components/__tests__/header-waffle-launcher.test.tsx --no-coverage 2>&1 | tail -20
```

Expected: `Cannot find module '@/components/header-waffle-launcher'`

- [ ] **Step 3: Create the component**

Create `components/header-waffle-launcher.tsx`:

```tsx
"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { getPrimaryRole } from "@/lib/get-primary-role"
import { filterMenuByPermissions } from "@/lib/menu-permissions"
import { PROFILE_SCOPED_ROLES } from "@/lib/permissions"
import { type MenuItem, getMenuForProfile } from "@/config/sidebar-menu"

function flattenToNavigableItems(items: MenuItem[]): MenuItem[] {
  return items.flatMap((item) => {
    if (item.children && item.children.length > 0) {
      return flattenToNavigableItems(item.children)
    }
    return item.path ? [item] : []
  })
}

export function HeaderWaffleLauncher() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname() || ""
  const { t } = useTranslation()
  const { user, profilePermissions, isSuperadmin } = useAuth()

  const navItems = useMemo(() => {
    const userRole = getPrimaryRole(user)
    const customerType =
      typeof window !== "undefined" ? localStorage.getItem("customerType") : null
    const baseMenu = getMenuForProfile(userRole || "", customerType)
    const usesProfilePermissions = PROFILE_SCOPED_ROLES.includes(
      userRole as (typeof PROFILE_SCOPED_ROLES)[number],
    )
    const filtered = usesProfilePermissions
      ? filterMenuByPermissions(baseMenu, profilePermissions, isSuperadmin)
      : baseMenu
    return flattenToNavigableItems(filtered)
  }, [user, profilePermissions, isSuperadmin])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Open navigation"
          className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <LayoutGrid className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[280px] max-h-[70vh] overflow-y-auto p-3"
      >
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 px-1">Navigation</p>
        <div className="grid grid-cols-3 gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.path!)
            return (
              <Link
                key={item.id}
                href={item.path!}
                onClick={() => setOpen(false)}
              >
                <div
                  className={[
                    "w-full h-20 flex flex-col items-center justify-center gap-1 rounded-lg text-xs text-center cursor-pointer transition-colors",
                    "hover:bg-gray-100 dark:hover:bg-gray-700",
                    "text-gray-700 dark:text-gray-200",
                    isActive ? "ring-2 ring-[#1162a8] bg-blue-50 dark:bg-blue-950" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="text-gray-500 dark:text-gray-400">{item.icon}</span>
                  <span className="leading-tight px-1">{t(`menu.${item.id}`)}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd "Rxn3D-Frontend" && npx jest components/__tests__/header-waffle-launcher.test.tsx --no-coverage 2>&1 | tail -20
```

Expected: all 4 tests PASS

- [ ] **Step 5: Type-check**

```bash
cd "Rxn3D-Frontend" && npx tsc --noEmit 2>&1 | grep "header-waffle"
```

Expected: no output (no errors)

- [ ] **Step 6: Commit**

```bash
git add components/header-waffle-launcher.tsx components/__tests__/header-waffle-launcher.test.tsx
git commit -m "feat: add HeaderWaffleLauncher component"
```

---

### Task 3: Mount launcher in Header

**Files:**
- Modify: `components/header.tsx` (line ~853, left section div)

**Interfaces:**
- Consumes: `HeaderWaffleLauncher` exported from `@/components/header-waffle-launcher`
- Produces: waffle icon visible in top-left of header for all users

- [ ] **Step 1: Add the import**

In `components/header.tsx`, find the existing import block (around line 1-55). Add after the last import:

```tsx
import { HeaderWaffleLauncher } from "@/components/header-waffle-launcher"
```

- [ ] **Step 2: Mount in the left section**

In `components/header.tsx`, find the left section div (around line 853):

```tsx
{/* Left Section - Action Buttons */}
<div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 flex-shrink-0">
  {!isSuperAdmin && canCreateSlip && (
```

Insert `<HeaderWaffleLauncher />` as the first child:

```tsx
{/* Left Section - Action Buttons */}
<div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 flex-shrink-0">
  <HeaderWaffleLauncher />
  {!isSuperAdmin && canCreateSlip && (
```

- [ ] **Step 3: Build check**

```bash
cd "Rxn3D-Frontend" && npm run build 2>&1 | tail -20
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add components/header.tsx
git commit -m "feat: mount HeaderWaffleLauncher in header left section"
```

---

## Self-Review

**Spec coverage:**
- ✅ Hide sidebar (Task 1)
- ✅ Waffle trigger in header left section (Task 3)
- ✅ Radix Popover (Task 2)
- ✅ 3-column grid of icon+label tiles (Task 2, `grid grid-cols-3`)
- ✅ Role-based items via `getMenuForProfile` + `filterMenuByPermissions` (Task 2)
- ✅ Active tile highlight with blue ring (Task 2, `ring-2 ring-[#1162a8]`)
- ✅ Dark mode (Task 2, `dark:` classes throughout)
- ✅ Click-outside closes via Radix `onOpenChange` (Task 2)
- ✅ Flat tiles — parent-only items dropped, children promoted (Task 2, `flattenToNavigableItems`)
- ✅ i18n via `t("menu.<id>")` (Task 2)

**Type consistency:** `flattenToNavigableItems` defined and used only in `header-waffle-launcher.tsx` — no cross-task naming drift.

**Placeholder scan:** No TBDs, no vague steps, all code shown in full.
