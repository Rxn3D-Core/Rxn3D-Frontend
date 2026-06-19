# Lab Case Management V2 Compact Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/lab-case-management/v2` as the approved compact reference-style case table while preserving every existing listing, bulk, row-action, modal, and mutation workflow.

**Architecture:** Keep `page.tsx` as the route controller and modal orchestrator. Extract v2-only presentation into focused components under `app/lab-case-management/v2/components`, with shared local types and pure UI helpers tested through Node's built-in test runner. Do not modify the production `/lab-case-management` route or its shared visual components.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Radix UI primitives, Node `node:test`, existing RXN3D contexts and service hooks.

---

## File Map

- Create `app/lab-case-management/v2/case-table-types.ts`: v2 row, column, filter, and callback contracts.
- Create `app/lab-case-management/v2/case-table-ui.mjs`: pure status-tab, column-count, pagination, and row-action-class helpers.
- Create `app/lab-case-management/v2/case-table-ui.test.mjs`: deterministic unit coverage for those helpers.
- Create `app/lab-case-management/v2/components/V2CaseIcons.tsx`: reference-style local outline SVGs.
- Create `app/lab-case-management/v2/components/V2CaseControlsMenu.tsx`: search-row overflow menu, filters, columns, and page-size controls.
- Create `app/lab-case-management/v2/components/V2CaseRowActions.tsx`: hover/focus action strip and print/more popovers.
- Create `app/lab-case-management/v2/components/V2CaseTable.tsx`: header, loading, empty state, rows, selection, status, location, and due-date cells.
- Create `app/lab-case-management/v2/components/V2BulkActionBar.tsx`: compact contextual bulk controls.
- Create `app/lab-case-management/v2/components/V2CaseWidget.tsx`: approved full-page widget composition and pagination.
- Modify `app/lab-case-management/v2/page.tsx`: remove old listing markup, assemble component props, retain all data/action/modal logic.

### Task 1: Lock down pure compact-table behavior

**Files:**
- Create: `app/lab-case-management/v2/case-table-ui.test.mjs`
- Create: `app/lab-case-management/v2/case-table-ui.mjs`

- [ ] **Step 1: Write the failing helper tests**

```js
import test from "node:test"
import assert from "node:assert/strict"
import {
  V2_STATUS_TABS,
  countVisibleV2Columns,
  getV2PaginationPages,
  v2RowActionStripClass,
} from "./case-table-ui.mjs"

test("status tabs preserve the API filter values", () => {
  assert.deepEqual(V2_STATUS_TABS, [
    { label: "In Progress", value: "In Progress", icon: "progress" },
    { label: "On Hold", value: "On hold", icon: "hold" },
    { label: "Cancelled", value: "cancelled", icon: "cancelled" },
    { label: "Done", value: "Finished", icon: "done" },
  ])
})

test("visible column count groups patient/slip and pan/product", () => {
  assert.equal(countVisibleV2Columns({
    timestamp: false, office: true, patient: true, slipNumber: true,
    pan: true, product: true, status: true, location: true,
    attachment: false, viewSlip: false, due: true, actions: true,
  }), 8)
})

test("pagination centers a five-page window", () => {
  assert.deepEqual(getV2PaginationPages(5, 12), [3, 4, 5, 6, 7])
  assert.deepEqual(getV2PaginationPages(1, 3), [1, 2, 3])
})

test("row actions are hidden until hover or focus-within", () => {
  assert.match(v2RowActionStripClass(), /group-hover:opacity-100/)
  assert.match(v2RowActionStripClass(), /group-focus-within:opacity-100/)
  assert.match(v2RowActionStripClass(), /pointer-events-none/)
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test app/lab-case-management/v2/case-table-ui.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `case-table-ui.mjs`.

- [ ] **Step 3: Implement the pure helpers**

```js
export const V2_STATUS_TABS = [
  { label: "In Progress", value: "In Progress", icon: "progress" },
  { label: "On Hold", value: "On hold", icon: "hold" },
  { label: "Cancelled", value: "cancelled", icon: "cancelled" },
  { label: "Done", value: "Finished", icon: "done" },
]

export function countVisibleV2Columns(columns) {
  return 1
    + (columns.timestamp ? 1 : 0)
    + (columns.patient || columns.slipNumber ? 1 : 0)
    + (columns.office ? 1 : 0)
    + (columns.pan || columns.product ? 1 : 0)
    + (columns.status ? 1 : 0)
    + (columns.location ? 1 : 0)
    + (columns.due ? 1 : 0)
    + (columns.actions ? 1 : 0)
}

export function getV2PaginationPages(currentPage, maxPage) {
  const size = Math.min(5, Math.max(1, maxPage))
  const start = maxPage <= 5
    ? 1
    : Math.min(Math.max(1, currentPage - 2), maxPage - 4)
  return Array.from({ length: size }, (_, index) => start + index)
}

export function v2RowActionStripClass() {
  return "pointer-events-none absolute right-2 top-1/2 z-10 -translate-y-1/2 opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
}
```

- [ ] **Step 4: Run the helper tests and verify they pass**

Run: `node --test app/lab-case-management/v2/case-table-ui.test.mjs`

Expected: 4 tests pass, 0 fail.

- [ ] **Step 5: Commit the helper contract**

```bash
git add app/lab-case-management/v2/case-table-ui.mjs app/lab-case-management/v2/case-table-ui.test.mjs
git commit -m "test: define compact case table behavior"
```

### Task 2: Define v2 presentation contracts and reference icons

**Files:**
- Create: `app/lab-case-management/v2/case-table-types.ts`
- Create: `app/lab-case-management/v2/components/V2CaseIcons.tsx`

- [ ] **Step 1: Add the v2 data contracts**

Define and export `V2CaseRowData`, `V2VisibleColumns`, `V2DateRange`, `V2FilterOptions`, and `V2RowActions`. `V2CaseRowData` must include the current row fields used by v2: `id`, `createdAt`, optional `caseId`, `caseNumber`, `billingId`, `slipNumber`, `pan`, optional `panColorStyle`, `officeCode`, `patient`, `product`, `status`, `rush`, `location`, optional `locationId`, `attachment`, `dueDate`, optional `doctor`, `user`, and `productType`.

```ts
import type { CSSProperties } from "react"

export type V2CaseRowData = {
  id: number
  createdAt: string
  caseId?: number
  caseNumber?: string
  billingId?: number
  slipNumber?: string
  pan: string
  panColorStyle?: CSSProperties
  officeCode: string
  patient: string
  product: string
  status: string
  rush: boolean
  location: string
  locationId?: number
  attachment: boolean
  dueDate: string
  doctor?: string
  user?: string
  productType?: string
}

export type V2VisibleColumns = {
  timestamp: boolean; office: boolean; patient: boolean; slipNumber: boolean
  pan: boolean; product: boolean; status: boolean; location: boolean
  attachment: boolean; viewSlip: boolean; due: boolean; actions: boolean
}

export type V2DateRange = { start?: Date; end?: Date }

export type V2FilterOptions = {
  offices: string[]
  products: string[]
  doctors: string[]
  users: string[]
}

export type V2FilterValues = {
  office: string
  location: string
  productType: string
  doctor: string
  user: string
  dateRange: V2DateRange
  attachmentsOnly: boolean
}

export type V2RowActions = {
  onOpen: (row: V2CaseRowData) => void
  onPrintPaperSlip: (row: V2CaseRowData) => void | Promise<void>
  onPrintDriverLabel: (row: V2CaseRowData) => void | Promise<void>
  onPrintStatement: (row: V2CaseRowData) => void | Promise<void>
  onCallLog: (row: V2CaseRowData) => void
  onAttachment: (row: V2CaseRowData) => void
  onCopy: (row: V2CaseRowData) => void
  onEdit: (row: V2CaseRowData) => void
  onChangeDueDate: (row: V2CaseRowData) => void
  onDriverHistory: (row: V2CaseRowData) => void
  onReadyToSend: (row: V2CaseRowData) => void
  onSendBack: (row: V2CaseRowData) => void
  onRush: (row: V2CaseRowData) => void
  onCancel: (row: V2CaseRowData) => void
}
```

- [ ] **Step 2: Add local outline SVG components**

Create 16-by-16, `fill="none"`, `stroke="currentColor"` icons named `ProgressIcon`, `HoldIcon`, `CancelledIcon`, `DoneIcon`, `ViewIcon`, `PrintIcon`, `PhoneIcon`, `PaperclipIcon`, `CopyIcon`, `MoreIcon`, `CalendarIcon`, and `LabLocationIcon`. Each accepts `{ className?: string }`, sets `aria-hidden="true"`, and uses rounded strokes matching the reference. Do not import `lucide-react` or existing slip-listing image assets in this file.

- [ ] **Step 3: Run TypeScript verification**

Run: `npx tsc --noEmit --pretty false`

Expected: no errors from the two new files. Existing unrelated errors, if present, must be recorded before continuing and the new files must be checked independently.

- [ ] **Step 4: Commit the contracts and icons**

```bash
git add app/lab-case-management/v2/case-table-types.ts app/lab-case-management/v2/components/V2CaseIcons.tsx
git commit -m "feat: add v2 case table presentation contracts"
```

### Task 3: Build the compact controls menu and bulk bar

**Files:**
- Create: `app/lab-case-management/v2/components/V2CaseControlsMenu.tsx`
- Create: `app/lab-case-management/v2/components/V2BulkActionBar.tsx`

- [ ] **Step 1: Implement `V2CaseControlsMenu` as a controlled component**

Use the existing `Popover`, `Select`, `Checkbox`, `Button`, and calendar primitives. The trigger is a 36px `•••` button at the right edge of the search row. The popover contains office, location, date range, product, doctor, user, attachment-only, column visibility, and page-size controls. It also contains one `Clear all filters` button. Required columns are `office`, `patient`, `pan`, and `actions` and remain disabled in column controls.

The component must receive values and callbacks; it must not fetch data or own duplicate filter state. Use the existing `SLIP_LOCATION_FILTER_OPTIONS` and filter trigger classes.

- [ ] **Step 2: Implement `V2BulkActionBar`**

Render nothing when `selectedCount === 0`. Otherwise render a compact warm-gray contextual bar with Pick up, Print Driver label, Print Paper slip, Print Statement, Send back to office, Rush case, and Archive case controls. Preserve the current Print Statement eligibility rule supplied as `canPrintStatement`.

- [ ] **Step 3: Run lint for component feedback**

Run: `npm run lint`

Expected: no new lint errors in `V2CaseControlsMenu.tsx` or `V2BulkActionBar.tsx`.

- [ ] **Step 4: Commit the controls**

```bash
git add app/lab-case-management/v2/components/V2CaseControlsMenu.tsx app/lab-case-management/v2/components/V2BulkActionBar.tsx
git commit -m "feat: add compact v2 case controls"
```

### Task 4: Build row actions and the compact table

**Files:**
- Create: `app/lab-case-management/v2/components/V2CaseRowActions.tsx`
- Create: `app/lab-case-management/v2/components/V2CaseTable.tsx`
- Modify: `app/lab-case-management/v2/case-table-ui.test.mjs`

- [ ] **Step 1: Extend the pure tests for empty-state spans and action visibility**

Add assertions for all-off columns and a one-page pagination window:

```js
test("column count never drops the selection column", () => {
  assert.equal(countVisibleV2Columns({
    timestamp: false, office: false, patient: false, slipNumber: false,
    pan: false, product: false, status: false, location: false,
    attachment: false, viewSlip: false, due: false, actions: false,
  }), 1)
})

test("single page pagination stays stable", () => {
  assert.deepEqual(getV2PaginationPages(1, 1), [1])
})
```

- [ ] **Step 2: Run the tests and confirm they pass against the existing helper**

Run: `node --test app/lab-case-management/v2/case-table-ui.test.mjs`

Expected: 6 tests pass, 0 fail.

- [ ] **Step 3: Implement `V2CaseRowActions`**

Use the six local icons in this order: view, print, call, attachment, copy, more. Apply `v2RowActionStripClass()` to an absolutely positioned rounded action surface. Every button calls `event.stopPropagation()`. The print popover exposes Paper Slip, Driver Label, and Statement when eligible. The more popover uses `buildLabCaseDropdownActions` and closes after selecting an enabled action. Attachment is blue only when `row.attachment` is true.

Copy must write the first available identifier from `row.slipNumber`, `row.caseNumber`, or `String(row.id)` through the route-provided callback; it must not access the clipboard directly inside the table component.

- [ ] **Step 4: Implement `V2CaseTable`**

Render the approved grouped columns. Use `countVisibleV2Columns(columns)` for empty-state `colSpan`. Loading renders compact skeleton rows. Every data row has `group relative`, neutral alternating/hover treatments, `tabIndex={0}`, and opens through `actions.onOpen(row)` when clicked or when Enter is pressed. Checkbox and nested action events stop propagation.

Reuse existing status predicates and badges, but style them with the compact reference dimensions. Reuse current location eligibility and callbacks while rendering `LabLocationIcon` instead of existing image assets. Render the local `CalendarIcon` for due-date changes. Do not reserve a permanent wide action column; overlay the action surface over the row's right side.

- [ ] **Step 5: Run helper tests and lint**

Run: `node --test app/lab-case-management/v2/case-table-ui.test.mjs && npm run lint`

Expected: 6 tests pass and no new lint errors in the v2 table files.

- [ ] **Step 6: Commit the table**

```bash
git add app/lab-case-management/v2/case-table-ui.test.mjs app/lab-case-management/v2/components/V2CaseRowActions.tsx app/lab-case-management/v2/components/V2CaseTable.tsx
git commit -m "feat: build compact v2 case table"
```

### Task 5: Compose the widget and integrate the route

**Files:**
- Create: `app/lab-case-management/v2/components/V2CaseWidget.tsx`
- Modify: `app/lab-case-management/v2/page.tsx`

- [ ] **Step 1: Implement `V2CaseWidget`**

Compose the context label, rounded cream widget, search input, `V2CaseControlsMenu`, local status pills driven by `V2_STATUS_TABS`, `V2BulkActionBar`, `V2CaseTable`, helper hint, result count, and pagination from `getV2PaginationPages`.

Use these visual contracts:

```ts
const shellClass = "rounded-[10px] border border-[#DDDCD5] bg-[#FBFBF9] overflow-hidden"
const searchClass = "h-12 border-0 border-b border-[#DDDCD5] rounded-none bg-white px-3 text-[15px] shadow-none focus-visible:ring-0"
const headerClass = "bg-[#F1F0E9] border-b border-[#C9C7BD] text-[11px] font-semibold text-[#494943]"
const helperClass = "border-t border-[#DDDCD5] px-3 py-2 text-[11px] text-[#66665F]"
```

Selecting an already-active status pill resets status to `All`. Pressing Enter in search opens the only matching row through `onOpenRow`.

- [ ] **Step 2: Replace only the old v2 listing surface in `page.tsx`**

Keep all state, effects, derived data, fetch calls, mutation handlers, and modal JSX. Remove the current HIPAA/banner-through-pagination listing markup and replace it with `V2CaseWidget`. Build one `rowActions` object with `useMemo` or stable callbacks that maps each component callback to the current route handler.

Use `navigator.clipboard.writeText` in the route's `handleCopyCaseIdentifier` callback and show a success or error toast. Do not add clipboard behavior to shared files.

Pass `slipsPage`, `loading`, `visibleColumns`, selection state, filters/options, pagination values, and all current handlers into the widget. Remove imports no longer used by the route only after integration compiles.

- [ ] **Step 3: Run focused tests**

Run: `node --test app/lab-case-management/v2/case-table-ui.test.mjs app/lab-case-management/dropdown-actions.test.mjs app/lab-case-management/attachment-state.test.mjs`

Expected: all tests pass.

- [ ] **Step 4: Run lint and production build**

Run: `npm run lint`

Expected: no new lint errors.

Run: `npm run build`

Expected: Next.js production build completes successfully. If the repository has pre-existing failures, capture their exact output and verify no error points to the v2 files.

- [ ] **Step 5: Commit route integration**

```bash
git add app/lab-case-management/v2/page.tsx app/lab-case-management/v2/components/V2CaseWidget.tsx
git commit -m "feat: integrate compact lab case management v2"
```

### Task 6: Browser verification against the approved reference

**Files:**
- Modify only the v2 files above if visual defects are found.

- [ ] **Step 1: Start the frontend**

Run: `npm run dev`

Expected: Next.js serves `http://localhost:3000` without a v2 compile error.

- [ ] **Step 2: Verify the compact structure at `/lab-case-management/v2`**

Check at a desktop viewport that search and `•••` share one row, four status pills appear below, grouped columns match the reference, rows are compact, the neutral palette is used, and pagination sits below the rounded widget.

- [ ] **Step 3: Verify interactions**

Confirm search, each status pill, controls menu, advanced filters, column toggles, page-size changes, pagination, select-all, bulk actions, row navigation, view, print, call, attachment, copy, and more actions reach their existing handlers or dialogs.

- [ ] **Step 4: Verify hover, focus, loading, empty, and overflow states**

Confirm row actions are invisible before hover, appear on hover, remain keyboard-accessible through row focus, loading skeletons align with headers, empty state spans active columns, and a narrow viewport scrolls the table horizontally without breaking the widget.

- [ ] **Step 5: Run final verification and commit any polish**

Run: `node --test app/lab-case-management/v2/case-table-ui.test.mjs && npm run lint && npm run build`

Expected: focused tests pass, lint reports no new v2 errors, and the production build succeeds.

If browser verification required code changes:

```bash
git add app/lab-case-management/v2
git commit -m "fix: polish compact v2 case listing"
```
