# Header RXN3D Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display the waffle launcher first and the existing RXN3D logo second in the shared header's left section.

**Architecture:** Keep the change inside the existing shared `Header` component and use Next.js image optimization. Add a dependency-free source contract test because this repository has test files but no configured unit-test runner or Testing Library dependencies.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Node.js test runner

---

### Task 1: Render the RXN3D logo in the shared header

**Files:**
- Modify: `scripts/tests/header-logo.test.mjs`
- Modify: `components/header.tsx:1-2,854-856`

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const headerSource = await readFile(new URL("../../components/header.tsx", import.meta.url), "utf8")

test("renders the waffle launcher before the RXN3D logo", () => {
  assert.match(headerSource, /import Image from ["']next\/image["']/)

  const logoPosition = headerSource.indexOf('src="/images/rxn3d-latest.png"')
  const launcherPosition = headerSource.indexOf("<HeaderWaffleLauncher />")

  assert.notEqual(logoPosition, -1)
  assert.ok(launcherPosition < logoPosition)
  assert.match(headerSource, /alt="RXN3D"/)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test scripts/tests/header-logo.test.mjs`

Expected: FAIL because the current markup renders the logo before the waffle launcher.

- [ ] **Step 3: Add the minimal header implementation**

Add the import:

```tsx
import Image from "next/image"
```

Render `<HeaderWaffleLauncher />` before this image:

```tsx
<Image
  src="/images/rxn3d-latest.png"
  alt="RXN3D"
  width={195}
  height={76}
  priority
  className="h-8 sm:h-9 md:h-10 w-auto object-contain flex-shrink-0"
/>
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test scripts/tests/header-logo.test.mjs`

Expected: PASS with one passing test.

- [ ] **Step 5: Run static verification (blocked by pre-existing syntax errors outside this change)**

Run: `npx tsc --noEmit`

Expected: exit code 0 with no TypeScript errors introduced by the change.

- [ ] **Step 6: Commit the implementation**

```bash
git add components/header.tsx scripts/tests/header-logo.test.mjs public/images/rxn3d-latest.png docs/superpowers/plans/2026-06-19-header-rxn3d-logo.md
git commit -m "feat: add rxn3d logo to header"
```
