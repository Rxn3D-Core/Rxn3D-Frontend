# Lab Case Management V2 Compact Table Design

## Summary

Redesign `/lab-case-management/v2` as a compact full-page case widget that closely matches the supplied neutral gray and cream reference. The redesign preserves the v2 page's existing data flow and functionality while reorganizing secondary controls and row actions into the reference's denser interaction model.

Only the v2 route changes. The existing `/lab-case-management` page, backend APIs, contexts, mutation behavior, and dialogs remain unchanged.

## Goals

- Match the reference's compact density, neutral palette, rounded container, grouped columns, small status pills, and restrained typography.
- Preserve search, status filtering, advanced filters, column controls, page sizing, pagination, row selection, bulk actions, row actions, dialogs, and mutations.
- Show the row action strip only when its row is hovered or contains keyboard focus.
- Replace the existing listing icons on v2 with a small v2-specific outline icon set matching the reference.
- Break the 2,069-line v2 page into focused presentation components without changing its business behavior.

## Non-goals

- Redesigning the existing `/lab-case-management` route.
- Changing API contracts, query parameters, contexts, or backend behavior.
- Reworking existing modal designs or their internal flows.
- Making row actions persistently visible on touch or narrow layouts.
- Introducing a new global design system or refactoring unrelated listing code.

## Visual Structure

The page uses one compact listing surface rather than the current expanded control layout.

1. A small context label appears above the listing surface.
2. A full-width search row sits at the top of the rounded widget. The search input occupies the available width, and a `•••` trigger sits at the right edge.
3. Four compact status pills appear below search: In Progress, On Hold, Cancelled, and Done. The selected pill uses the reference's pale blue treatment.
4. The table header uses a warm gray background and grouped columns:
   - selection checkbox
   - Patient / Slip
   - Office
   - Pan / Product
   - Status
   - Location
   - Due date
5. Rows use tight vertical spacing and subtle separators. Patient name and slip metadata are stacked; pan and product are stacked; status remains a small tinted label.
6. Hovering or keyboard-focusing a row reveals the reference-style floating action strip on the right.
7. A compact helper hint appears below the rows.
8. Entry count and restrained pagination sit below the widget.

The page follows the reference's neutral gray and cream styling rather than applying RXN3D blue broadly. Blue remains limited to selected or informational states.

## Component Architecture

### `app/lab-case-management/v2/page.tsx`

The route remains the controller and modal orchestrator. It owns existing data fetching, filter state, selected rows, pagination, action callbacks, and dialog state. Presentation markup moves into v2-specific components.

### `V2CaseWidget`

Renders the reference-style page shell and composes search, status pills, controls, table, helper text, and pagination. It receives state and callbacks from the route and does not call APIs directly.

### `V2CaseControlsMenu`

Renders the top-right `•••` menu. It contains advanced filters, visible-column controls, page-size selection, and other secondary listing controls currently displayed outside the table. It receives controlled values and change callbacks.

### `V2CaseTable`

Renders table headers, loading skeletons, the empty state, and case rows. It receives already-mapped listing rows, visible-column state, selection state, and callbacks.

### `V2CaseRow`

Renders one compact case row. It handles row navigation boundaries, checkbox event isolation, and hover/focus visibility for the action strip. It delegates all business actions through callbacks.

### `V2CaseRowActions`

Renders the reference's outline actions: view, print, call, attachment, copy, and more. Existing handlers and menus remain the source of behavior. The component uses local v2 SVG icons rather than existing listing icon assets.

### `V2BulkActionBar`

Appears only when one or more rows are selected. It preserves the current bulk actions in a compact contextual bar without permanently consuming page space.

## Data and Interaction Flow

1. The route reads listing data and pagination from `SlipContext` as it does today.
2. Search remains debounced before triggering a fetch.
3. Status pills update the existing status filter and reset pagination as required.
4. Controls in the `•••` menu update the same route-owned filter, column, and page-size state used by the current v2 page.
5. The route maps slips into the existing display-row shape and passes rows into `V2CaseTable`.
6. Clicking a non-interactive part of a row navigates to the case.
7. Checkboxes, action buttons, and menu items stop propagation so they do not trigger row navigation.
8. Row actions call the route's existing handlers, which open the current dialogs or execute the current mutations.
9. Successful mutations refresh the listing through the existing refresh path; failures continue through the current toast/error behavior.

## Row Action Behavior

- The action strip is hidden by default with no pointer interaction.
- The strip becomes visible on row hover and when focus is within the row, allowing keyboard access.
- It overlays the right side of the row like the reference rather than reserving a wide permanent action column.
- The visible actions are view, print, call, attachment, copy, and more.
- Attachment styling indicates whether attachments exist, matching the reference's blue-active hint.
- The more menu retains actions that do not fit in the primary strip, including the existing date, rush, send-back, cancel, archive, and other supported operations.
- On touch-only layouts, the strip remains hover/focus-triggered as explicitly requested; users can expose it through focus where their browser supports focus interaction.

## Responsive and Overflow Behavior

The compact desktop layout is the primary target. On narrower viewports, the widget remains intact and the table scrolls horizontally. Columns are not automatically collapsed because users retain explicit column visibility controls in the `•••` menu. The search row and status pills may wrap without changing their order.

## Loading, Empty, and Error States

- Loading displays compact skeleton rows aligned to the active column structure.
- No matching results display a single empty-state row spanning the visible columns.
- Fetch and mutation failures continue to use the existing toast/error flow.
- Controls disabled by loading, selection count, or missing row data retain the current eligibility rules.
- The table shell stays visible during loading and empty states to avoid layout shifts.

## Accessibility

- Status pills expose selected state and remain keyboard-operable buttons.
- Every icon-only control has an accessible label and tooltip/title.
- Focus within a row reveals its action strip, providing a keyboard equivalent to hover.
- Checkboxes retain explicit labels for selecting one row or all visible rows.
- Existing dialogs keep their current focus management.
- Text and state colors must retain readable contrast against the neutral background.

## Testing and Verification

Focused tests will cover:

- status-pill selection and status filter values;
- debounced search and pagination reset behavior where already testable;
- row navigation versus checkbox and action event isolation;
- selection and select-all behavior;
- opening the controls menu and changing filters, columns, and page size;
- hover/focus visibility classes for row actions;
- loading skeleton and empty-state column spans;
- preservation of key row action callbacks.

Verification will include the relevant focused tests, frontend linting, and a production build. The implemented page will also be checked visually at `/lab-case-management/v2` against the supplied reference, including hover behavior and horizontal overflow.

## Scope Boundaries

Implementation must not overwrite or fold in unrelated uncommitted changes already present in the frontend worktree. New components should stay under the v2 route or a clearly v2-specific component directory so the production listing is unaffected.
