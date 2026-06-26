# Direct Paper Slip Print Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the browser-native paper-slip print preview from Lab Case Management without changing the visible `/lab-case-management` URL.

**Architecture:** A small DOM utility creates one temporary hidden iframe for the existing `/paper-slip/print` route and owns its message listener, timeout, and cleanup. The existing print page receives a request ID, sends same-origin lifecycle messages to its parent when embedded, and keeps its current top-level behavior. Lab Case Management replaces `router.push(printRoute)` with the iframe utility for both single and bulk actions.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, browser `postMessage`, native `window.print`, Node test runner.

---

## File Structure

- Create `lib/paper-slip-print-protocol.ts`: lifecycle message constants, types, builders, and runtime validation shared by parent and iframe.
- Create `lib/paper-slip-print-protocol.test.mjs`: protocol validation tests.
- Create `app/lab-case-management/paper-slip-print-frame.ts`: temporary iframe creation, request correlation, lifecycle handling, and cleanup.
- Create `app/lab-case-management/paper-slip-print-frame.test.mjs`: fake-DOM unit tests for URL preservation, messages, replacement, and timeout cleanup.
- Modify `app/paper-slip/print/page-helpers.ts`: parse and return the optional `print_request_id` query parameter.
- Modify `app/paper-slip/print/page-helpers.test.mjs`: request-ID parsing coverage.
- Modify `app/paper-slip/print/page.tsx`: pass the request ID to the client shell.
- Modify `components/paper-slip-print/paper-slip-print-page-shell.tsx`: notify the parent before print, after print, and on errors when embedded.
- Modify `components/paper-slip-print/paper-slip-print-page-shell-state.ts`: expose a pure decision for embedded authentication failures.
- Modify `components/paper-slip-print/paper-slip-print-page-shell-state.test.mjs`: embedded versus top-level authentication behavior.
- Modify `app/lab-case-management/page.tsx`: use the frame utility for single and bulk paper-slip printing while preserving unrelated local edits.

### Task 1: Define the Parent–Frame Message Protocol

**Files:**
- Create: `lib/paper-slip-print-protocol.ts`
- Create: `lib/paper-slip-print-protocol.test.mjs`

- [ ] **Step 1: Write the failing protocol tests**

Create `lib/paper-slip-print-protocol.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  PAPER_SLIP_PRINT_COMPLETE,
  PAPER_SLIP_PRINT_ERROR,
  PAPER_SLIP_PRINT_READY,
  buildPaperSlipPrintMessage,
  isPaperSlipPrintMessage,
} from "./paper-slip-print-protocol.ts";

test("buildPaperSlipPrintMessage creates a correlated ready message", () => {
  assert.deepEqual(buildPaperSlipPrintMessage(PAPER_SLIP_PRINT_READY, "request-1"), {
    type: PAPER_SLIP_PRINT_READY,
    requestId: "request-1",
  });
});

test("buildPaperSlipPrintMessage includes an error description", () => {
  assert.deepEqual(buildPaperSlipPrintMessage(PAPER_SLIP_PRINT_ERROR, "request-2", "Unable to load"), {
    type: PAPER_SLIP_PRINT_ERROR,
    requestId: "request-2",
    message: "Unable to load",
  });
});

test("isPaperSlipPrintMessage accepts supported lifecycle messages", () => {
  assert.equal(isPaperSlipPrintMessage({ type: PAPER_SLIP_PRINT_COMPLETE, requestId: "request-3" }), true);
});

test("isPaperSlipPrintMessage rejects missing ids and unknown types", () => {
  assert.equal(isPaperSlipPrintMessage({ type: PAPER_SLIP_PRINT_READY }), false);
  assert.equal(isPaperSlipPrintMessage({ type: "paper-slip-print:unknown", requestId: "request-4" }), false);
});
```

- [ ] **Step 2: Run the protocol tests and verify RED**

Run: `node --test lib/paper-slip-print-protocol.test.mjs`

Expected: FAIL because `lib/paper-slip-print-protocol.ts` does not exist.

- [ ] **Step 3: Implement the minimal protocol**

Create `lib/paper-slip-print-protocol.ts`:

```ts
export const PAPER_SLIP_PRINT_READY = "paper-slip-print:ready" as const;
export const PAPER_SLIP_PRINT_COMPLETE = "paper-slip-print:complete" as const;
export const PAPER_SLIP_PRINT_ERROR = "paper-slip-print:error" as const;

export type PaperSlipPrintMessageType =
  | typeof PAPER_SLIP_PRINT_READY
  | typeof PAPER_SLIP_PRINT_COMPLETE
  | typeof PAPER_SLIP_PRINT_ERROR;

export interface PaperSlipPrintMessage {
  type: PaperSlipPrintMessageType;
  requestId: string;
  message?: string;
}

const supportedTypes = new Set<string>([
  PAPER_SLIP_PRINT_READY,
  PAPER_SLIP_PRINT_COMPLETE,
  PAPER_SLIP_PRINT_ERROR,
]);

export function buildPaperSlipPrintMessage(
  type: PaperSlipPrintMessageType,
  requestId: string,
  message?: string,
): PaperSlipPrintMessage {
  return { type, requestId, ...(message ? { message } : {}) };
}

export function isPaperSlipPrintMessage(value: unknown): value is PaperSlipPrintMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<PaperSlipPrintMessage>;
  return typeof message.type === "string"
    && supportedTypes.has(message.type)
    && typeof message.requestId === "string"
    && message.requestId.length > 0;
}
```

- [ ] **Step 4: Run the protocol tests and verify GREEN**

Run: `node --test lib/paper-slip-print-protocol.test.mjs`

Expected: 4 tests pass.

- [ ] **Step 5: Commit the protocol**

```bash
git add lib/paper-slip-print-protocol.ts lib/paper-slip-print-protocol.test.mjs
git commit -m "test: define paper slip print protocol"
```

### Task 2: Build the Temporary Print-Frame Lifecycle

**Files:**
- Create: `app/lab-case-management/paper-slip-print-frame.ts`
- Create: `app/lab-case-management/paper-slip-print-frame.test.mjs`

- [ ] **Step 1: Write failing frame lifecycle tests**

Create `app/lab-case-management/paper-slip-print-frame.test.mjs` with lightweight fake browser objects:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { openPaperSlipPrintFrame } from "./paper-slip-print-frame.ts";
import { PAPER_SLIP_PRINT_COMPLETE, PAPER_SLIP_PRINT_ERROR } from "../../lib/paper-slip-print-protocol.ts";

function createEnvironment() {
  const listeners = new Map();
  const timers = new Map();
  const frames = [];
  let timerId = 0;

  const body = {
    appendChild(frame) { frame.parentNode = body; frames.push(frame); },
    removeChild(frame) {
      const index = frames.indexOf(frame);
      if (index >= 0) frames.splice(index, 1);
      frame.parentNode = null;
    },
  };
  const documentRef = {
    body,
    createElement(tag) {
      assert.equal(tag, "iframe");
      const attributes = new Map();
      const frame = {
        style: {},
        dataset: {},
        contentWindow: {},
        parentNode: null,
        setAttribute(name, value) { attributes.set(name, value); },
        getAttribute(name) { return attributes.get(name) ?? null; },
        remove() { frame.parentNode?.removeChild(frame); },
      };
      return frame;
    },
    querySelectorAll() { return [...frames]; },
  };
  const windowRef = {
    location: { origin: "http://localhost:3000" },
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    setTimeout(callback) { timerId += 1; timers.set(timerId, callback); return timerId; },
    clearTimeout(id) { timers.delete(id); },
  };

  return {
    documentRef,
    frames,
    listeners,
    timers,
    windowRef,
    dispatchMessage(event) { listeners.get("message")?.(event); },
    fireTimeout() { [...timers.values()][0]?.(); },
  };
}

test("openPaperSlipPrintFrame appends a hidden correlated frame without navigation", () => {
  const env = createEnvironment();
  openPaperSlipPrintFrame({
    route: "/paper-slip/print?slip_ids=88",
    requestId: "request-88",
    documentRef: env.documentRef,
    windowRef: env.windowRef,
  });

  assert.equal(env.frames.length, 1);
  assert.equal(env.frames[0].src, "/paper-slip/print?slip_ids=88&print_request_id=request-88");
  assert.equal(env.frames[0].title, "Paper slip print document");
  assert.equal(env.frames[0].getAttribute?.("aria-hidden"), "true");
});

test("complete from the matching same-origin frame cleans up", () => {
  const env = createEnvironment();
  openPaperSlipPrintFrame({ route: "/paper-slip/print?slip_ids=88", requestId: "request-88", documentRef: env.documentRef, windowRef: env.windowRef });
  const frame = env.frames[0];
  env.dispatchMessage({ origin: "http://localhost:3000", source: frame.contentWindow, data: { type: PAPER_SLIP_PRINT_COMPLETE, requestId: "request-88" } });
  assert.equal(env.frames.length, 0);
});

test("foreign or stale messages do not clean up the active frame", () => {
  const env = createEnvironment();
  openPaperSlipPrintFrame({ route: "/paper-slip/print?slip_ids=88", requestId: "request-88", documentRef: env.documentRef, windowRef: env.windowRef });
  const frame = env.frames[0];
  env.dispatchMessage({ origin: "https://example.com", source: frame.contentWindow, data: { type: PAPER_SLIP_PRINT_COMPLETE, requestId: "request-88" } });
  env.dispatchMessage({ origin: "http://localhost:3000", source: frame.contentWindow, data: { type: PAPER_SLIP_PRINT_COMPLETE, requestId: "stale" } });
  assert.equal(env.frames.length, 1);
});

test("error reports the message and cleans up", () => {
  const env = createEnvironment();
  const errors = [];
  openPaperSlipPrintFrame({ route: "/paper-slip/print?slip_ids=88", requestId: "request-88", documentRef: env.documentRef, windowRef: env.windowRef, onError: (message) => errors.push(message) });
  const frame = env.frames[0];
  env.dispatchMessage({ origin: "http://localhost:3000", source: frame.contentWindow, data: { type: PAPER_SLIP_PRINT_ERROR, requestId: "request-88", message: "Unable to load" } });
  assert.deepEqual(errors, ["Unable to load"]);
  assert.equal(env.frames.length, 0);
});

test("a new request removes stale frames and timeout removes an abandoned frame", () => {
  const env = createEnvironment();
  openPaperSlipPrintFrame({ route: "/paper-slip/print?slip_ids=87", requestId: "request-87", documentRef: env.documentRef, windowRef: env.windowRef });
  openPaperSlipPrintFrame({ route: "/paper-slip/print?slip_ids=88", requestId: "request-88", documentRef: env.documentRef, windowRef: env.windowRef });
  assert.equal(env.frames.length, 1);
  assert.match(env.frames[0].src, /slip_ids=88/);
  env.fireTimeout();
  assert.equal(env.frames.length, 0);
});
```

The implementation may add a tiny `setAttribute` method to the test fake so the accessibility assertion exercises the real call.

- [ ] **Step 2: Run the frame tests and verify RED**

Run: `node --test app/lab-case-management/paper-slip-print-frame.test.mjs`

Expected: FAIL because `paper-slip-print-frame.ts` does not exist.

- [ ] **Step 3: Implement the frame manager**

Create `app/lab-case-management/paper-slip-print-frame.ts`:

```ts
import {
  PAPER_SLIP_PRINT_COMPLETE,
  PAPER_SLIP_PRINT_ERROR,
  isPaperSlipPrintMessage,
} from "../../lib/paper-slip-print-protocol.ts";

const FRAME_SELECTOR = 'iframe[data-paper-slip-print-frame="true"]';
const DEFAULT_TIMEOUT_MS = 120_000;
let activeCleanup: (() => void) | null = null;

interface PrintFrameOptions {
  route: string;
  requestId?: string;
  onError?: (message: string) => void;
  timeoutMs?: number;
  documentRef?: Document;
  windowRef?: Window;
}

export function openPaperSlipPrintFrame({
  route,
  requestId = crypto.randomUUID(),
  onError,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  documentRef = document,
  windowRef = window,
}: PrintFrameOptions): () => void {
  activeCleanup?.();
  documentRef.querySelectorAll(FRAME_SELECTOR).forEach((frame) => frame.remove());

  const separator = route.includes("?") ? "&" : "?";
  const frame = documentRef.createElement("iframe");
  frame.src = `${route}${separator}print_request_id=${encodeURIComponent(requestId)}`;
  frame.title = "Paper slip print document";
  frame.dataset.paperSlipPrintFrame = "true";
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  Object.assign(frame.style, {
    position: "fixed",
    width: "1px",
    height: "1px",
    border: "0",
    clip: "rect(0 0 0 0)",
    overflow: "hidden",
  });

  let timer: ReturnType<typeof setTimeout>;
  const cleanup = () => {
    windowRef.removeEventListener("message", handleMessage);
    windowRef.clearTimeout(timer);
    frame.remove();
    if (activeCleanup === cleanup) activeCleanup = null;
  };
  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== windowRef.location.origin || event.source !== frame.contentWindow) return;
    if (!isPaperSlipPrintMessage(event.data) || event.data.requestId !== requestId) return;
    if (event.data.type === PAPER_SLIP_PRINT_ERROR) {
      onError?.(event.data.message || "Could not prepare the paper slip for printing.");
      cleanup();
    } else if (event.data.type === PAPER_SLIP_PRINT_COMPLETE) {
      cleanup();
    }
  };

  windowRef.addEventListener("message", handleMessage);
  documentRef.body.appendChild(frame);
  timer = windowRef.setTimeout(cleanup, timeoutMs);
  activeCleanup = cleanup;
  return cleanup;
}
```

- [ ] **Step 4: Run frame and protocol tests and verify GREEN**

Run: `node --test lib/paper-slip-print-protocol.test.mjs app/lab-case-management/paper-slip-print-frame.test.mjs`

Expected: 9 tests pass.

- [ ] **Step 5: Commit the frame lifecycle**

```bash
git add app/lab-case-management/paper-slip-print-frame.ts app/lab-case-management/paper-slip-print-frame.test.mjs
git commit -m "feat: add paper slip print frame lifecycle"
```

### Task 3: Make the Existing Print Page Frame-Aware

**Files:**
- Modify: `app/paper-slip/print/page-helpers.ts`
- Modify: `app/paper-slip/print/page-helpers.test.mjs`
- Modify: `app/paper-slip/print/page.tsx`
- Modify: `components/paper-slip-print/paper-slip-print-page-shell.tsx`
- Modify: `components/paper-slip-print/paper-slip-print-page-shell-state.ts`
- Modify: `components/paper-slip-print/paper-slip-print-page-shell-state.test.mjs`

- [ ] **Step 1: Add failing request-ID and auth-decision tests**

Add to `app/paper-slip/print/page-helpers.test.mjs`:

```js
test("resolvePaperSlipPrintRequest returns a trimmed embedded request id", () => {
  const request = resolvePaperSlipPrintRequest({ slip_ids: "88", print_request_id: " request-88 " });
  assert.equal(request.printRequestId, "request-88");
});

test("resolvePaperSlipPrintRequest ignores an empty embedded request id", () => {
  const request = resolvePaperSlipPrintRequest({ slip_ids: "88", print_request_id: "   " });
  assert.equal(request.printRequestId, null);
});
```

Add to `components/paper-slip-print/paper-slip-print-page-shell-state.test.mjs` and update its import:

```js
import { buildPaperSlipPrintActionState, shouldRedirectPaperSlipAuthFailure } from "./paper-slip-print-page-shell-state.ts";

test("top-level authentication failures redirect to login", () => {
  assert.equal(shouldRedirectPaperSlipAuthFailure(null), true);
});

test("embedded authentication failures report to the parent", () => {
  assert.equal(shouldRedirectPaperSlipAuthFailure("request-88"), false);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test app/paper-slip/print/page-helpers.test.mjs components/paper-slip-print/paper-slip-print-page-shell-state.test.mjs`

Expected: FAIL because `printRequestId` and `shouldRedirectPaperSlipAuthFailure` do not exist.

- [ ] **Step 3: Parse and pass the request ID**

In `app/paper-slip/print/page-helpers.ts`, add `printRequestId: string | null` to `PaperSlipPrintRequest`, derive it once inside `resolvePaperSlipPrintRequest`, and include it in every return:

```ts
const rawPrintRequestId = searchParams.print_request_id;
const printRequestValue = Array.isArray(rawPrintRequestId) ? rawPrintRequestId[0] : rawPrintRequestId;
const printRequestId = printRequestValue?.trim() || null;
```

In `app/paper-slip/print/page.tsx`, pass the value:

```tsx
<PaperSlipPrintPageShell
  error={request.error}
  caseIds={request.caseIds}
  initialSlips={request.initialSlips}
  printRequestId={request.printRequestId}
  slipIds={request.slipIds}
/>
```

In `components/paper-slip-print/paper-slip-print-page-shell-state.ts`, add:

```ts
export function shouldRedirectPaperSlipAuthFailure(printRequestId: string | null): boolean {
  return !printRequestId;
}
```

- [ ] **Step 4: Add embedded lifecycle signaling to the shell**

Add `printRequestId: string | null` to `PaperSlipPrintPageShell` props. Import the protocol constants/builders and `shouldRedirectPaperSlipAuthFailure`. Add a stable notifier:

```tsx
const notifyParent = useCallback((type: PaperSlipPrintMessageType, message?: string) => {
  if (!printRequestId || window.parent === window) return;
  window.parent.postMessage(
    buildPaperSlipPrintMessage(type, printRequestId, message),
    window.location.origin,
  );
}, [printRequestId]);
```

For a missing token, set the existing error and loading state; the error effect below reports it. For a 401 response, preserve top-level redirect but throw an embedded error:

```ts
if (response.status === 401) {
  if (shouldRedirectPaperSlipAuthFailure(printRequestId)) {
    window.location.href = "/login";
    return null;
  }
  throw new Error("Your session expired. Please sign in and try printing again.");
}
```

Add an effect that reports embedded failures exactly once per error value:

```tsx
useEffect(() => {
  if (fetchError) notifyParent(PAPER_SLIP_PRINT_ERROR, fetchError);
}, [fetchError, notifyParent]);
```

Immediately after images are ready and before `window.print()`, wire lifecycle completion:

```tsx
notifyParent(PAPER_SLIP_PRINT_READY);
const handleAfterPrint = () => notifyParent(PAPER_SLIP_PRINT_COMPLETE);
window.addEventListener("afterprint", handleAfterPrint, { once: true });
window.print();
setPrinted(true);
```

Ensure the effect cleanup removes `handleAfterPrint` if the component unmounts before it fires. Keep `handlePrint` for direct top-level retries; when embedded, use the same ready/complete helper so both automatic and manual invocations have identical signaling.

- [ ] **Step 5: Run focused print-page tests and verify GREEN**

Run: `node --test app/paper-slip/print/page-helpers.test.mjs components/paper-slip-print/paper-slip-print-page-shell-state.test.mjs lib/paper-slip-print-protocol.test.mjs`

Expected: all focused tests pass.

- [ ] **Step 6: Commit frame-aware print-page behavior**

```bash
git add app/paper-slip/print/page-helpers.ts app/paper-slip/print/page-helpers.test.mjs app/paper-slip/print/page.tsx components/paper-slip-print/paper-slip-print-page-shell.tsx components/paper-slip-print/paper-slip-print-page-shell-state.ts components/paper-slip-print/paper-slip-print-page-shell-state.test.mjs
git commit -m "feat: signal embedded paper slip print lifecycle"
```

### Task 4: Wire Lab Case Management and Verify End to End

**Files:**
- Modify: `app/lab-case-management/page.tsx`
- Test: `app/lab-case-management/paper-slip-print-frame.test.mjs`
- Test: `app/lab-case-management/paper-slip-print-route.test.mjs`

- [ ] **Step 1: Add a failing source-level wiring assertion**

Add to `app/lab-case-management/paper-slip-print-frame.test.mjs`:

```js
import { readFile } from "node:fs/promises";

test("lab case management uses the print frame instead of routing to the print page", async () => {
  const source = await readFile(new URL("./page.tsx", import.meta.url), "utf8");
  assert.match(source, /openPaperSlipPrintFrame\(\{/);
  assert.doesNotMatch(source, /router\.push\(printRoute\)/);
});
```

- [ ] **Step 2: Run the wiring test and verify RED**

Run: `node --test app/lab-case-management/paper-slip-print-frame.test.mjs`

Expected: FAIL because `page.tsx` still calls `router.push(printRoute)`.

- [ ] **Step 3: Replace navigation in both handlers**

Import the utility in `app/lab-case-management/page.tsx`:

```ts
import { openPaperSlipPrintFrame } from "./paper-slip-print-frame";
```

In both `handlePrintPaperSlip` and `handleBulkPrintPaperSlip`, replace `router.push(printRoute)` with:

```ts
openPaperSlipPrintFrame({
  route: printRoute,
  onError: (message) => {
    toast({
      title: "Failed to open paper slip",
      description: message,
      variant: "destructive",
    });
  },
});
```

Use the plural title `Failed to open paper slips` in the bulk handler. Do not alter the page's table/filter changes or remove `useRouter`, which is used by other actions.

- [ ] **Step 4: Run all paper-slip unit tests**

Run:

```bash
node --test \
  lib/paper-slip-print-protocol.test.mjs \
  lib/paper-slip-image-readiness.test.mjs \
  lib/paper-slip-print-view-model.test.mjs \
  app/paper-slip/print/page-helpers.test.mjs \
  components/paper-slip-print/paper-slip-print-page-shell-state.test.mjs \
  app/lab-case-management/paper-slip-print-route.test.mjs \
  app/lab-case-management/paper-slip-print-frame.test.mjs
```

Expected: all tests pass with zero failures.

- [ ] **Step 5: Run frontend integration verification**

Run: `npm run build`

Expected: Next.js production build exits 0. If the repository's existing unrelated dirty changes cause a failure, record the exact failure and run `npx tsc --noEmit` plus the focused tests to isolate whether this feature introduced an error.

- [ ] **Step 6: Verify the live browser behavior**

With an authenticated Lab Case Management session:

1. Open `/lab-case-management` and record the visible URL.
2. Print one slip (slip 88 when available).
3. Confirm the browser-native print preview opens with the paper-slip document.
4. Cancel the preview and confirm the visible URL remains `/lab-case-management`.
5. Select two slips, invoke bulk print, and confirm one multi-page native preview opens.
6. Cancel and repeat once to confirm no stale frame blocks subsequent printing.

- [ ] **Step 7: Commit the integration**

Stage only the print-related hunks from the already-dirty page, then commit:

```bash
git add app/lab-case-management/paper-slip-print-frame.test.mjs
git add -p app/lab-case-management/page.tsx
git diff --cached --check
git commit -m "feat: print paper slips without page navigation"
```

Do not stage the user's unrelated Lab Case Management table/filter edits.
