# Direct Paper Slip Print Preview Design

## Goal

From Lab Case Management, opening a paper slip for printing must launch the browser's native print preview without navigating the visible page to `/paper-slip/print`. The behavior applies to both a single slip and a bulk selection.

## Current Behavior

The single and bulk handlers build `/paper-slip/print` URLs and call `router.push`. The destination page fetches printable slip data, waits for its images, renders `PaperSlipPrintDocument`, and calls `window.print()`.

## Chosen Approach

Lab Case Management will load the existing paper-slip print URL in a temporary, off-screen iframe instead of pushing it into the visible router. The iframe keeps the current print page's data fetching, image readiness, document rendering, and print invocation intact. Because `window.print()` runs in the iframe's window, the native print preview uses the iframe document while the parent remains on `/lab-case-management`.

The temporary frame will be owned by a small print-frame utility rather than by the already large page component. That utility will:

1. Accept a validated paper-slip print route.
2. Create an inaccessible, off-screen iframe with a descriptive title.
3. Attach it to the document and load the route.
4. Remove it after the print lifecycle completes, with a bounded timeout as a fallback.
5. Prevent stale frames from accumulating across repeated print actions.

## Data Flow

1. The user selects **Print Paper Slip** for one row or selects multiple rows and chooses bulk print.
2. Existing ID validation determines whether the request uses `slip_ids` or `case_ids`.
3. `buildPaperSlipPrintRoute` constructs the same internal route used today.
4. The print-frame utility loads that route without changing the parent's URL or browser history.
5. `PaperSlipPrintPageShell` reads the authentication token, requests `/slip/paper-slip-print-data`, maps the response, and waits for images.
6. The frame calls its own `window.print()`, opening the browser's native preview.
7. The frame reports completion or failure to the parent and is removed.

## Parent–Frame Communication

The print page will send same-origin `postMessage` events to its parent when embedded:

- `paper-slip-print:ready` after printable content and images are ready, immediately before printing.
- `paper-slip-print:complete` after the print dialog closes when `afterprint` is available.
- `paper-slip-print:error` when data preparation fails.

Messages will use the current origin and include a per-request identifier so the parent only reacts to the frame it created. When the print route is opened directly as a top-level page, its existing behavior remains unchanged.

## Error Handling

- Invalid or empty selections keep the existing destructive toasts.
- API or rendering failures in an embedded print page produce a destructive toast in Lab Case Management and remove the frame.
- Authentication failures retain the existing login handling for a top-level page. In an embedded frame, the failure is reported to the parent instead of navigating the frame to a visible login experience.
- A cleanup timeout removes abandoned frames if browser print lifecycle events are unavailable.
- Repeated print clicks replace or clean up stale print frames so only the active request remains.

## Accessibility and UX

The iframe is not part of the interactive or accessibility tree and does not steal focus before the native dialog appears. Lab Case Management remains visually unchanged. No in-page preview modal, popup window, or visible `/paper-slip/print` navigation is introduced.

## Testing

Tests will be written before implementation and will cover:

- Creating an off-screen iframe for a valid print route without calling router navigation.
- Single-slip and bulk handlers passing the correct route to the frame utility.
- Correlating parent–frame messages by request identifier.
- Cleaning up on completion, error, replacement, and timeout.
- Embedded print-shell success and failure messages.
- Preserving top-level direct-route behavior.

After unit tests pass, the frontend build will verify TypeScript and Next.js integration. Browser verification will confirm that clicking print keeps the visible URL on `/lab-case-management` and opens the native print preview for the selected paper slip.

## Out of Scope

- Redesigning the paper-slip document.
- Replacing the browser-native print preview with an application modal.
- Changing the backend paper-slip API or its response model.
- Altering print flows outside Lab Case Management.
