# Paper Slip Print Frame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `router.push` in lab case management print handlers with a hidden iframe approach so the native print dialog opens without navigating away from `/lab-case-management`.

**Architecture:** A new protocol module defines shared postMessage constants. A frame utility injects a hidden `<iframe>`, listens for signals from the shell, and drives `window.print()` from the parent. The print shell detects embedding and suppresses auto-print, instead signalling the parent when ready.

**Tech Stack:** Next.js 14, React, TypeScript, Node built-in `node:test` (no Jest/Vitest)

## Global Constraints

- Test runner: `node --test <file>.test.mjs` — no Jest, no Vitest, no test frameworks
- All test files use `.mjs` extension with `import assert from "node:assert/strict"` and `import test from "node:test"`
- No new npm dependencies
- `useRouter` must remain in `page.tsx` (used by `handleEditCase` and keyboard search handler)
- Shell direct-URL behaviour (auto-print) must remain unchanged
- 401 inside iframe → `window.location.href = "/login"` in parent; other errors → toast in parent

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `lib/paper-slip-print-protocol.ts` | Shared postMessage type constants |
| Create | `lib/paper-slip-print-protocol.test.mjs` | Protocol constant correctness |
| Create | `app/lab-case-management/paper-slip-print-frame.ts` | iframe injection + message listener |
| Create | `app/lab-case-management/paper-slip-print-frame.test.mjs` | Source-level wiring assertion |
| Modify | `components/paper-slip-print/paper-slip-print-page-shell.tsx` | Embed detection + postMessage signals |
| Modify | `app/lab-case-management/page.tsx` | Replace `router.push` with `openPaperSlipPrintFrame` |

---

### Task 1: Protocol constants

**Files:**
- Create: `lib/paper-slip-print-protocol.ts`
- Create: `lib/paper-slip-print-protocol.test.mjs`

**Interfaces:**
- Produces:
  ```ts
  export const PAPER_SLIP_PRINT_READY: string    // "paper-slip-print:ready"
  export const PAPER_SLIP_PRINT_COMPLETE: string // "paper-slip-print:complete"
  export const PAPER_SLIP_PRINT_ERROR: string    // "paper-slip-print:error"
  ```

- [ ] **Step 1: Write the failing test**

Create `lib/paper-slip-print-protocol.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

// Node ESM cannot import .ts directly — test the compiled output shape
// by importing the .js extension that tsc will emit, OR test via source assertions.
// We test the source file exists and exports the right names via dynamic import workaround:
// Since these are constants, we test them with a simple source-text scan.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const src = await readFile(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "paper-slip-print-protocol.ts"),
  "utf8"
);

test("PAPER_SLIP_PRINT_READY is exported and non-empty", () => {
  assert.match(src, /export const PAPER_SLIP_PRINT_READY\s*=/);
  assert.match(src, /"paper-slip-print:ready"/);
});

test("PAPER_SLIP_PRINT_COMPLETE is exported and non-empty", () => {
  assert.match(src, /export const PAPER_SLIP_PRINT_COMPLETE\s*=/);
  assert.match(src, /"paper-slip-print:complete"/);
});

test("PAPER_SLIP_PRINT_ERROR is exported and non-empty", () => {
  assert.match(src, /export const PAPER_SLIP_PRINT_ERROR\s*=/);
  assert.match(src, /"paper-slip-print:error"/);
});

test("all three constants are distinct strings", () => {
  const matches = src.match(/"paper-slip-print:[^"]+"/g) ?? [];
  const unique = new Set(matches);
  assert.ok(unique.size >= 3, `Expected 3 distinct constants, got ${unique.size}`);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "Rxn3D-Frontend" && node --test lib/paper-slip-print-protocol.test.mjs
```

Expected: FAIL — file not found or missing exports.

- [ ] **Step 3: Create the protocol file**

Create `lib/paper-slip-print-protocol.ts`:

```ts
export const PAPER_SLIP_PRINT_READY = "paper-slip-print:ready";
export const PAPER_SLIP_PRINT_COMPLETE = "paper-slip-print:complete";
export const PAPER_SLIP_PRINT_ERROR = "paper-slip-print:error";
```

- [ ] **Step 4: Run test to verify it passes**

```bash
node --test lib/paper-slip-print-protocol.test.mjs
```

Expected: 4 passing tests.

- [ ] **Step 5: Commit**

```bash
git add lib/paper-slip-print-protocol.ts lib/paper-slip-print-protocol.test.mjs
git commit -m "feat: add paper slip print protocol constants"
```

---

### Task 2: Frame utility

**Files:**
- Create: `app/lab-case-management/paper-slip-print-frame.ts`
- Create: `app/lab-case-management/paper-slip-print-frame.test.mjs`

**Interfaces:**
- Consumes:
  ```ts
  import { PAPER_SLIP_PRINT_READY, PAPER_SLIP_PRINT_ERROR } from "@/lib/paper-slip-print-protocol"
  // PAPER_SLIP_PRINT_READY = "paper-slip-print:ready"
  // PAPER_SLIP_PRINT_ERROR = "paper-slip-print:error"
  ```
- Produces:
  ```ts
  export function openPaperSlipPrintFrame(options: {
    route: string;
    onError: (message: string) => void;
  }): void
  ```

- [ ] **Step 1: Write the failing source-level test**

Create `app/lab-case-management/paper-slip-print-frame.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));

test("paper-slip-print-frame exports openPaperSlipPrintFrame", async () => {
  const src = await readFile(path.join(dir, "paper-slip-print-frame.ts"), "utf8");
  assert.match(src, /export function openPaperSlipPrintFrame/);
});

test("paper-slip-print-frame imports protocol constants", async () => {
  const src = await readFile(path.join(dir, "paper-slip-print-frame.ts"), "utf8");
  assert.match(src, /PAPER_SLIP_PRINT_READY/);
  assert.match(src, /PAPER_SLIP_PRINT_ERROR/);
});

test("paper-slip-print-frame handles 401 sentinel", async () => {
  const src = await readFile(path.join(dir, "paper-slip-print-frame.ts"), "utf8");
  assert.match(src, /"401"/);
  assert.match(src, /\/login/);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test app/lab-case-management/paper-slip-print-frame.test.mjs
```

Expected: FAIL — file not found.

- [ ] **Step 3: Create the frame utility**

Create `app/lab-case-management/paper-slip-print-frame.ts`:

```ts
import {
  PAPER_SLIP_PRINT_ERROR,
  PAPER_SLIP_PRINT_READY,
} from "@/lib/paper-slip-print-protocol";

export function openPaperSlipPrintFrame({
  route,
  onError,
}: {
  route: string;
  onError: (message: string) => void;
}): void {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:absolute;left:-9999px;width:0;height:0;border:none;";
  document.body.appendChild(iframe);

  function cleanup() {
    window.removeEventListener("message", onMessage);
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }

  function onMessage(event: MessageEvent) {
    // Only handle messages from this iframe
    if (event.source !== iframe.contentWindow) return;

    const data = event.data as { type?: string; message?: string } | string;
    const type = typeof data === "string" ? data : data?.type;
    const message = typeof data === "object" ? (data?.message ?? "") : "";

    if (type === PAPER_SLIP_PRINT_READY) {
      window.print();
      window.addEventListener(
        "afterprint",
        () => {
          cleanup();
        },
        { once: true },
      );
      return;
    }

    if (type === PAPER_SLIP_PRINT_ERROR) {
      cleanup();
      if (message === "401") {
        window.location.href = "/login";
      } else {
        onError(message || "Failed to load paper slip.");
      }
    }
  }

  window.addEventListener("message", onMessage);
  iframe.src = route;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
node --test app/lab-case-management/paper-slip-print-frame.test.mjs
```

Expected: 3 passing tests.

- [ ] **Step 5: Commit**

```bash
git add app/lab-case-management/paper-slip-print-frame.ts app/lab-case-management/paper-slip-print-frame.test.mjs
git commit -m "feat: add paper slip print frame utility"
```

---

### Task 3: Shell embed detection and signalling

**Files:**
- Modify: `components/paper-slip-print/paper-slip-print-page-shell.tsx`

**Interfaces:**
- Consumes:
  ```ts
  import {
    PAPER_SLIP_PRINT_READY,
    PAPER_SLIP_PRINT_ERROR,
  } from "@/lib/paper-slip-print-protocol"
  // PAPER_SLIP_PRINT_READY = "paper-slip-print:ready"
  // PAPER_SLIP_PRINT_ERROR = "paper-slip-print:error"
  ```
- Produces: No new exports. Shell behaviour changes when `window !== window.top`.

**Behaviour summary:**
- `isEmbedded`: computed once at component mount via `useRef` (avoids SSR mismatch).
- When embedded: `schedulePrint` effect is a no-op. After images ready, `window.parent.postMessage({ type: PAPER_SLIP_PRINT_READY }, window.location.origin)`.
- On 401 in fetch: `window.parent.postMessage({ type: PAPER_SLIP_PRINT_ERROR, message: "401" }, window.location.origin)` then `return null` (do not redirect inside iframe).
- On other fetch errors: `window.parent.postMessage({ type: PAPER_SLIP_PRINT_ERROR, message: errorMessage }, window.location.origin)`.
- When not embedded: all existing behaviour unchanged.

- [ ] **Step 1: Add embed detection and update schedulePrint effect**

Open `components/paper-slip-print/paper-slip-print-page-shell.tsx`.

Add the import at the top with the other imports:

```ts
import {
  PAPER_SLIP_PRINT_ERROR,
  PAPER_SLIP_PRINT_READY,
} from "@/lib/paper-slip-print-protocol";
```

Inside `PaperSlipPrintPageShell`, after the existing `useRef` declarations, add:

```ts
const isEmbeddedRef = useRef(
  typeof window !== "undefined" && window !== window.top
);
```

- [ ] **Step 2: Update the schedulePrint effect**

Replace the existing `schedulePrint` effect (the second `useEffect` — the one that calls `window.print()`):

```ts
useEffect(() => {
  if (printed || loading || slips.length === 0) return;
  let cancelled = false;

  const schedulePrint = async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 150));
    if (cancelled) return;

    const root = printRootRef.current;
    const images = root ? Array.from(root.querySelectorAll("img")) : [];
    await waitForImageLikes(images, 5000);

    if (cancelled) return;

    if (isEmbeddedRef.current) {
      // Signal parent — parent owns window.print()
      window.parent.postMessage(
        { type: PAPER_SLIP_PRINT_READY },
        window.location.origin,
      );
    } else {
      window.print();
    }
    setPrinted(true);
  };

  void schedulePrint();
  return () => {
    cancelled = true;
  };
}, [loading, printed, slips.length]);
```

- [ ] **Step 3: Update the fetch effect — 401 and error signalling**

Inside the `.then(async (response) => { ... })` block of the fetch effect, replace the 401 branch:

```ts
if (response.status === 401) {
  if (isEmbeddedRef.current) {
    window.parent.postMessage(
      { type: PAPER_SLIP_PRINT_ERROR, message: "401" },
      window.location.origin,
    );
    return null;
  }
  window.location.href = "/login";
  return null;
}
```

And update the `.catch` block:

```ts
.catch((fetchFailure) => {
  const message =
    fetchFailure instanceof Error
      ? fetchFailure.message
      : "Failed to load paper slip print data.";

  if (isEmbeddedRef.current) {
    window.parent.postMessage(
      { type: PAPER_SLIP_PRINT_ERROR, message },
      window.location.origin,
    );
  }
  setFetchError(message);
})
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd "Rxn3D-Frontend" && npx tsc --noEmit
```

Expected: zero errors related to the shell changes. (Ignore pre-existing unrelated errors if any.)

- [ ] **Step 5: Commit**

```bash
git add components/paper-slip-print/paper-slip-print-page-shell.tsx
git commit -m "feat: signal parent when paper slip shell is embedded in iframe"
```

---

### Task 4: Wire lab case management page

**Files:**
- Modify: `app/lab-case-management/page.tsx`
- Create: `app/lab-case-management/paper-slip-print-frame-wiring.test.mjs`

**Interfaces:**
- Consumes:
  ```ts
  import { openPaperSlipPrintFrame } from "./paper-slip-print-frame"
  // openPaperSlipPrintFrame({ route: string, onError: (msg: string) => void }): void
  ```

- [ ] **Step 1: Write the failing wiring test**

Create `app/lab-case-management/paper-slip-print-frame-wiring.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const src = await readFile(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "page.tsx"),
  "utf8"
);

test("page.tsx imports openPaperSlipPrintFrame", () => {
  assert.match(src, /openPaperSlipPrintFrame/);
});

test("page.tsx does not call router.push for print routes", () => {
  // router.push is fine for other things; assert it's not used with buildPaperSlipPrintRoute result
  assert.doesNotMatch(src, /router\.push\(printRoute\)/);
});

test("page.tsx calls openPaperSlipPrintFrame with route and onError", () => {
  assert.match(src, /openPaperSlipPrintFrame\(\{/);
  assert.match(src, /onError:/);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test app/lab-case-management/paper-slip-print-frame-wiring.test.mjs
```

Expected: FAIL — `router.push(printRoute)` still present, `openPaperSlipPrintFrame` not imported.

- [ ] **Step 3: Add the import to page.tsx**

In `app/lab-case-management/page.tsx`, add next to the other local imports (near `buildPaperSlipPrintRoute`):

```ts
import { openPaperSlipPrintFrame } from "./paper-slip-print-frame";
```

- [ ] **Step 4: Replace router.push in handlePrintPaperSlip**

Find the single-slip handler (around line 611). Replace:

```ts
router.push(printRoute);
```

With:

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

- [ ] **Step 5: Replace router.push in handleBulkPrintPaperSlip**

Find the bulk handler (around line 657). Replace:

```ts
router.push(printRoute);
```

With:

```ts
openPaperSlipPrintFrame({
  route: printRoute,
  onError: (message) => {
    toast({
      title: "Failed to open paper slips",
      description: message,
      variant: "destructive",
    });
  },
});
```

- [ ] **Step 6: Run wiring test to verify it passes**

```bash
node --test app/lab-case-management/paper-slip-print-frame-wiring.test.mjs
```

Expected: 3 passing tests.

- [ ] **Step 7: Run all paper slip tests**

```bash
node --test \
  lib/paper-slip-print-protocol.test.mjs \
  lib/paper-slip-image-readiness.test.mjs \
  lib/paper-slip-print-view-model.test.mjs \
  app/lab-case-management/paper-slip-print-route.test.mjs \
  app/lab-case-management/paper-slip-print-frame.test.mjs \
  app/lab-case-management/paper-slip-print-frame-wiring.test.mjs
```

Expected: all tests pass, zero failures.

- [ ] **Step 8: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero new errors.

- [ ] **Step 9: Commit**

```bash
git add app/lab-case-management/page.tsx app/lab-case-management/paper-slip-print-frame-wiring.test.mjs
git commit -m "feat: open paper slip in hidden iframe instead of navigating away"
```

---

## Browser Verification

After all tasks are committed:

1. Start dev server: `npm run dev` from `Rxn3D-Frontend/`
2. Navigate to `/lab-case-management` and note the URL.
3. Click Print Paper Slip on any row.
4. Confirm: native print preview opens with the paper slip document.
5. Cancel preview — confirm URL is still `/lab-case-management`.
6. Select two rows → Bulk actions → Print Paper slip.
7. Confirm: one print preview opens with both slips.
8. Cancel and repeat once — confirm no stale iframe blocks subsequent prints.
