# Paper Slip Print — Hidden iframe Lifecycle Design

**Date:** 2026-06-19  
**Scope:** `/lab-case-management` page + paper slip print shell  
**Goal:** Print paper slips without navigating away from `/lab-case-management`. The URL stays stable; the native print dialog opens via a hidden iframe.

---

## Problem

`handlePrintPaperSlip` and `handleBulkPrintPaperSlip` currently call `router.push(printRoute)`, which navigates the user away from the lab case management listing. The user must press Back to return. There is also no lifecycle feedback (ready, complete, error) from the print page back to the listing.

---

## Approach: Hidden iframe with postMessage

A hidden `<iframe>` is injected into the listing page. It loads the existing `/paper-slip/print` route. The shell inside the iframe signals the parent when it is ready to print, and the parent drives `window.print()`. After printing, the iframe is removed. The listing URL never changes.

---

## New Files

### `lib/paper-slip-print-protocol.ts`

Protocol constants shared between the frame utility and the shell. No magic strings anywhere else.

```ts
export const PAPER_SLIP_PRINT_READY = "paper-slip-print:ready";
export const PAPER_SLIP_PRINT_COMPLETE = "paper-slip-print:complete";
export const PAPER_SLIP_PRINT_ERROR = "paper-slip-print:error";
```

`PAPER_SLIP_PRINT_ERROR` messages carry a `{ message: string }` payload. A message of `"401"` signals an authentication failure.

---

### `app/lab-case-management/paper-slip-print-frame.ts`

```ts
openPaperSlipPrintFrame({ route, onError }: {
  route: string;
  onError: (message: string) => void;
}): void
```

**Behaviour:**

1. Creates a `display:none` `<iframe>` and appends it to `document.body`.
2. Adds a `message` listener on `window` scoped to messages from that iframe's `contentWindow`.
3. On `PAPER_SLIP_PRINT_READY`:
   - Calls `window.print()`.
   - Registers a one-shot `afterprint` listener that removes the iframe and its `message` listener.
4. On `PAPER_SLIP_PRINT_ERROR`:
   - Removes the iframe and its `message` listener.
   - If `message === "401"`: `window.location.href = "/login"`.
   - Otherwise: calls `onError(message)`.
5. Sets `iframe.src = route` after the listener is wired (no race).
6. Ignores messages from other origins or other iframes.

---

## Modified Files

### `components/paper-slip-print/paper-slip-print-page-shell.tsx`

Shell detects embedding: `const isEmbedded = typeof window !== "undefined" && window !== window.top`.

**When embedded:**

- The `schedulePrint` effect (auto-print) is skipped entirely.
- After data is fetched and images are ready, posts to parent:
  ```ts
  window.parent.postMessage(PAPER_SLIP_PRINT_READY, window.location.origin);
  ```
- On 401 fetch response (instead of `window.location.href = "/login"`):
  ```ts
  window.parent.postMessage({ type: PAPER_SLIP_PRINT_ERROR, message: "401" }, window.location.origin);
  return null;
  ```
- On other fetch errors:
  ```ts
  window.parent.postMessage({ type: PAPER_SLIP_PRINT_ERROR, message: errorMessage }, window.location.origin);
  ```

**`afterprint` is owned by the parent frame**, not the shell. The parent's `openPaperSlipPrintFrame` registers a one-shot `afterprint` on its own `window` after calling `window.print()`. `window.print()` in the parent prints the iframe content; `afterprint` reliably fires in the parent context. The shell does not need its own `afterprint` listener.

**When not embedded (direct URL):**

Behaviour is unchanged — data fetches, images load, `window.print()` fires automatically.

---

### `app/lab-case-management/page.tsx`

Import `openPaperSlipPrintFrame` from `./paper-slip-print-frame`.

Replace `router.push(printRoute)` in **both** handlers:

```ts
// Single slip
openPaperSlipPrintFrame({
  route: printRoute,
  onError: (message) => toast({
    title: "Failed to open paper slip",
    description: message,
    variant: "destructive",
  }),
});

// Bulk
openPaperSlipPrintFrame({
  route: printRoute,
  onError: (message) => toast({
    title: "Failed to open paper slips",
    description: message,
    variant: "destructive",
  }),
});
```

`useRouter` is retained — it is used by `handleEditCase` and the search `onKeyDown` handler.

---

## Error Handling

| Signal | Cause | Action |
|--------|-------|--------|
| `PAPER_SLIP_PRINT_ERROR` + `"401"` | Session expired inside iframe | Remove iframe, redirect to `/login` |
| `PAPER_SLIP_PRINT_ERROR` + other message | Fetch failure, bad data | Remove iframe, show destructive toast |
| No signal (iframe hangs) | Network timeout, JS crash | No automatic cleanup — ponytail: acceptable for v1, add a timeout if it becomes a reported issue |

---

## Tests

Each new unit gets one focused test file using Node's built-in `node:test` runner (no frameworks):

- `lib/paper-slip-print-protocol.test.mjs` — constants are strings, non-empty, distinct
- `app/lab-case-management/paper-slip-print-frame.test.mjs` — source-level assertion: `page.tsx` calls `openPaperSlipPrintFrame` and does not call `router.push(printRoute)`
- `app/lab-case-management/paper-slip-print-route.test.mjs` — already exists, no changes needed
- `components/paper-slip-print/paper-slip-print-page-shell-state.test.mjs` — already exists, no changes needed

---

## Out of Scope

- Timeout/abort if the iframe never signals (add post-launch if reported)
- Multiple simultaneous print frames (sequential use assumed)
- Bulk print as separate per-slip frames (single multi-page document is sufficient)
