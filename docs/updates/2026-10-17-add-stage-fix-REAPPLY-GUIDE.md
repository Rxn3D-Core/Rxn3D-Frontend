# Add-new-stage removable card fixes — re-apply guide (2026-10-17)

Everything done in the Claude session for these two bugs, written so it can be re-applied after
the working tree is cleared. **Nothing here was committed.** Branch: `krupesh_mac`.

Related earlier (user-side, uncommitted) work: `2026-10-17-add-stage-removable-shade-after-grade.md`.
The fixes below were built **on top of** that earlier work — see "Prerequisites".

Companion file: `2026-10-17-add-stage-impression-fix.patch` — `git apply` it to re-create the two
files that are 100% my changes (see step 5 / step 6). Root-cause write-up:
`2026-10-17-add-stage-impression-hides-removable-fields.md`.

---

## The two bugs

1. **Only Grade left after choosing the impression** (add-new-stage, Immediate Full Denture).
   After the impression modal, Stage / Teeth shade / Gum shade / Impression disappeared; Grade
   stayed green.
2. **"No Impression" left the Impression box empty** (should show the label "No Impression").

### Root cause (both)

Field progress was read from **one tooth** (`firstToothNumber` / `repTn`) while the data lives on
**different teeth of the same card**.

- A full denture binds the whole arch (17–32) to the card (`applyAddedProductDefaultExtractions`
  in `useCaseDesignState.ts` + `runMissingTeethAutoSelect`). The slip preloads
  grade/stage/shade only on its own teeth (e.g. 18–27).
- The impression is saved on the lowest tooth bound to the card (17), via
  `applyArchWideImpressionCompletion` → `getRepToothForRemovableCard` → `applyImpressionCompletion`
  in `CaseDesignCenter.tsx`.
- `resolveRemovableProgressTooth` returned the lowest tooth with *any* progress → flipped 18 → 17
  once 17 had an impression. The chain (`getVisibleStepCount` in `useToothFieldProgress.ts`,
  consecutive completed steps from `grade`) was then evaluated on 17 → count 1 → only Grade.
- Grade still looked done because the Grade box reads across all card teeth.
- "No Impression" is stored as text `"No Impression"` on tooth 17; the box read tooth 18 → empty.

Added-product removable cards (the add-new-stage path) render through `SelectionProductFields` in
`RemovableRestorationFields.tsx` — **not** the card-0 branch in the panels, which the earlier
fix covered.

---

## Prerequisites (from the earlier uncommitted work — re-create if cleared)

In `components/case-design-center/utils/resolveAddedCardProduct.ts`. Steps 2–4 below call these.

```ts
// top of file (imports + type alias)
import type { Arch, ProductApiData } from "../types";
import type { FieldStep } from "../hooks/useToothFieldProgress";
import {
  archHasImpressionSelections,
  type SlipImpressionSelections,
} from "./impressionStorage.ts";          // NOTE the .ts extension — see step 1

type IsFieldCompleted = (arch: Arch, toothNumber: number, step: FieldStep) => boolean;
```

```ts
/**
 * Whether a removable card step is done — checks rep tooth, virtual slot, any card tooth,
 * selectedStages, and arch impression selections. Add-new-stage writes stage/impression
 * onto one tooth while the chart rep tooth can differ after Done.
 */
export function isRemovableCardStepComplete(params: {
  arch: Arch;
  cardId: number;
  cardTeeth: readonly number[];
  repTooth: number;
  step: FieldStep;
  isFieldCompleted: IsFieldCompleted;
  getFieldValue: GetFieldValue;
  selectedStages?: Record<string, string>;
  selectedImpressions?: SlipImpressionSelections;
}): boolean {
  const {
    arch, cardId, cardTeeth, repTooth, step,
    isFieldCompleted, getFieldValue, selectedStages, selectedImpressions,
  } = params;

  const virtualTooth = cardId === 0 ? -0 : -cardId;
  if (isFieldCompleted(arch, repTooth, step)) return true;
  if (isFieldCompleted(arch, virtualTooth, step)) return true;
  if (cardTeeth.some((tn) => isFieldCompleted(arch, tn, step))) return true;

  if (step === "stage" && selectedStages) {
    if (selectedStages[`${arch}_prep_${repTooth}`]?.trim()) return true;
    if (selectedStages[`${arch}_prep_${virtualTooth}`]?.trim()) return true;
    if (cardTeeth.some((tn) => selectedStages[`${arch}_prep_${tn}`]?.trim())) return true;
  }

  if (step === "impression" && selectedImpressions && archHasImpressionSelections(selectedImpressions, arch)) {
    return true;
  }

  const raw = resolveCardFieldValue(arch, cardId, cardTeeth, repTooth, step, getFieldValue);
  return !!raw.trim();
}

/**
 * Progressive visibility for a removable card chain. Steps that already have a value
 * stay visible even when an earlier empty step would otherwise hide them.
 */
export function isRemovableCardFieldVisible(params: {
  step: string;
  chain: readonly string[];
  isStepComplete: (step: FieldStep) => boolean;
  stepHasValue?: boolean;
}): boolean {
  const { step, chain, isStepComplete, stepHasValue } = params;
  const stepIndex = chain.indexOf(step);
  if (stepIndex === -1) return false;
  if (stepHasValue) return true;

  let count = 0;
  for (const s of chain) {
    if (isStepComplete(s as FieldStep)) count++;
    else break;
  }
  return stepIndex < Math.min(count + 1, chain.length);
}
```

`resolveCardFieldValue` (already in HEAD) is also used. Note: `SelectionProductFields` does **not**
pass `stepHasValue` on purpose — auto-filled values (e.g. lab-preferred teeth shade) must not reveal
fields before grade/stage are done.

---

## Re-apply steps (in order)

### 1. `.ts` extension on the runtime import (`resolveAddedCardProduct.ts`)

`from "./impressionStorage"` → `from "./impressionStorage.ts"`.
Without it `node --test components/case-design-center/utils/resolveAddedCardProduct.test.mjs`
fails to load (`ERR_MODULE_NOT_FOUND`). Matches the convention in sibling utils
(`./categoryHelpers.ts`, …).

### 2. Chain-weighted `resolveRemovableProgressTooth` (`resolveAddedCardProduct.ts`)

Replace `REMOVABLE_PROGRESS_STEPS` and `resolveRemovableProgressTooth`:

```ts
/**
 * Removable steps whose progress should keep the field tooth stable when the chart changes.
 * Ordered like the progressive field chain (grade → stage → shades → impression → add-ons) —
 * earlier steps weigh more when ranking teeth in {@link resolveRemovableProgressTooth}.
 */
const REMOVABLE_PROGRESS_STEPS: FieldStep[] = [
  "grade",
  "stage",
  "teeth_shade",
  "gum_shade",
  "impression",
  "addons",
];

/**
 * Stable tooth for removable stage/grade/impression fields.
 * Keeps the tooth that already has progress when a lower-numbered tooth joins the card
 * (add-new-stage / edit-slip tooth-chart edits must not orphan saved stage).
 *
 * Teeth are ranked by how far along the field chain they are (earlier steps weigh more),
 * lowest tooth number on ties. A full-denture card binds the whole arch while the slip only
 * preloads grade/stage/shade on its own teeth; the impression then lands on the lowest bound
 * tooth. That tooth must not win just because it sorts first — the chain is evaluated on the
 * returned tooth, so picking it would hide every field after Grade.
 */
export function resolveRemovableProgressTooth(
  cardTeeth: readonly number[],
  arch: Arch,
  cardId: number,
  isFieldCompleted: (arch: Arch, toothNumber: number, step: FieldStep) => boolean,
  getFieldValue: (arch: Arch, toothNumber: number, step: FieldStep) => string,
  selectedStages?: Record<string, string>
): number {
  const sorted = [...cardTeeth].sort((a, b) => a - b);
  if (sorted.length === 0) return -cardId;
  const lastIndex = REMOVABLE_PROGRESS_STEPS.length - 1;
  const progressScore = (tn: number): number =>
    REMOVABLE_PROGRESS_STEPS.reduce((score, step, i) => {
      const hasProgress =
        isFieldCompleted(arch, tn, step) ||
        !!getFieldValue(arch, tn, step)?.trim() ||
        (step === "stage" && !!selectedStages?.[`${arch}_prep_${tn}`]?.trim());
      return hasProgress ? score + 2 ** (lastIndex - i) : score;
    }, 0);

  let best = sorted[0];
  let bestScore = 0;
  for (const tn of sorted) {
    const score = progressScore(tn);
    if (score > bestScore) {
      best = tn;
      bestScore = score;
    }
  }
  return best;
}
```

(HEAD's version returned the first sorted tooth with *any* progress; the old step order was
`stage, grade, impression, teeth_shade, gum_shade, addons`.)

### 3. New helper `resolveCardImpressionText` (`resolveAddedCardProduct.ts`)

Add after `resolveCardFieldValue`:

```ts
/**
 * Impression text ("No Impression" / "1x PVS, …") for a removable card.
 * The impression is saved on one tooth of the card, which is not always the field tooth
 * (full dentures bind the whole arch). Only teeth whose impression step is completed count —
 * un-completing a tooth keeps its old text, which must not resurface.
 */
export function resolveCardImpressionText(
  arch: Arch,
  cardId: number,
  cardTeeth: readonly number[],
  repTooth: number,
  isFieldCompleted: IsFieldCompleted,
  getFieldValue: GetFieldValue
): string {
  const virtualTooth = cardId === 0 ? -0 : -cardId;
  for (const tn of [repTooth, virtualTooth, ...cardTeeth]) {
    if (!isFieldCompleted(arch, tn, "impression")) continue;
    const val = getFieldValue(arch, tn, "impression")?.trim();
    if (val) return val;
  }
  return "";
}
```

### 4. Tests (`resolveAddedCardProduct.test.mjs`)

Included in the patch (step 5). 6 new tests: progress tooth stays on 18 when 17 only has an
impression; lowest tooth on ties; `resolveCardImpressionText` ×3 (reads "No Impression" from a
sibling tooth; ignores stale un-completed text; empty when none). Import list gains
`resolveCardImpressionText`.

### 5. Apply the patch (covers `RemovableRestorationFields.tsx` + the test file)

```bash
git apply docs/updates/2026-10-17-add-stage-impression-fix.patch
```

Both files are 100% my changes vs `main` (neither was touched by the earlier work), so the patch
applies on a clean tree. **Do steps 1–3 first** — the component imports
`isRemovableCardFieldVisible`, `isRemovableCardStepComplete`, `resolveCardFieldValue`,
`resolveCardImpressionText` from `../utils/resolveAddedCardProduct`.

What the patch does to `RemovableRestorationFields.tsx` (`SelectionProductFields`):

- imports the four helpers above;
- drops `isFieldVisible: isFieldVisibleFn` from the destructured props (the prop stays in the
  interface; `MandibularPanel`/`MaxillaryPanel` still pass it);
- computes `cardImpressionText = resolveCardImpressionText(arch, productCardId, toothNumbers,
  firstToothNumber, isFieldCompletedFn, getFieldValueFn)`;
  `impressionDisplay = getImpressionDisplayText?.(ARCH_IMPRESSION_PRODUCT_ID, arch) || cardImpressionText`;
  `impressionComplete` additionally true when `!!cardImpressionText`;
- after the `if (!showProgressiveFields) return null;` defines card-level
  `isStepComplete` (→ `isRemovableCardStepComplete`), `cardFieldValue` (→ `resolveCardFieldValue`),
  `isVisible = (step) => isRemovableCardFieldVisible({ step, chain: removableChain, isStepComplete })`
  (no `stepHasValue`), and `teethShadeComplete` / `gumShadeComplete` / `addonsComplete`;
- replaces every single-tooth `isFieldCompletedFn(arch, firstToothNumber, "teeth_shade" | "gum_shade" | "addons")`
  and `getFieldValueFn(arch, firstToothNumber, "teeth_shade" | "gum_shade")` in the shade and add-on
  blocks with those card-level values.

### 6. Card-0 branches in both panels (`MandibularPanel.tsx`, `MaxillaryPanel.tsx`)

a) Add `resolveCardImpressionText,` to the existing import from `"../utils/resolveAddedCardProduct"`
(next to `resolveRemovableProgressTooth,`).

b) In the "Impression" row (Row 3 in Mandibular, "Row 4: Impression" in Maxillary) replace
`fVal("impression")` in `impressionDisplay`:

```tsx
const impressionDisplay =
  getImpressionDisplayText(impressionModalProductId, "mandibular", repTn) ||
  resolveCardImpressionText(
    "mandibular",     // "maxillary" in MaxillaryPanel
    0,
    cardTeeth,
    repTn,
    isFieldCompleted,
    getFieldValue
  );
```

`cardTeeth`, `repTn`, `isFieldCompleted`, `getFieldValue` are already in scope there at HEAD.
This step only depends on step 3, not on the earlier card-0 wiring.

---

## Verify after re-applying

```bash
# unit tests for the helpers (expect 11 pass in this file)
node --test components/case-design-center/utils/resolveAddedCardProduct.test.mjs

# wider suite: expect the SAME 17 pre-existing failures as clean main (path-alias / module
# resolution issues, unrelated); total tests 231, pass 214 with these fixes
node --test components/case-design-center/utils/*.test.mjs components/case-design-center/hooks/*.test.mjs
```

Manual (add-new-stage on the S71 / Immediate Full Denture slip): pick stage → pick impression →
Stage, Teeth shade, Gum Shade, Impression stay visible. Choose **No Impression** → the Impression
box shows "No Impression" with a green check. Choose **New Impression** → selected impressions
show as before.

## Caveats / what was NOT verified

- Not run end-to-end in the app (no authenticated slip data in the session). The one inferred
  link: the impression lands on tooth 17 (lowest tooth bound to the card) — derived from reading
  `applyArchWideImpressionCompletion` / `getRepToothForRemovableCard`, not observed at runtime.
  The user's follow-up screenshot (all fields visible after the fix, Impression box empty on
  "No Impression") is consistent with that.
- Whole-project `tsc` is blocked by an unrelated syntax error in `components/product-configuration-form.tsx`
  (untouched). Checked the changed files alone with a scratch tsconfig: the panels show the same
  59 type errors as clean `main`; no new ones.
- Known not-changed neighbour: `OpposingRemovableAccordion.tsx` reads impression text at its own
  `fieldRepTn` (sentinel tooth) — not affected by this bug, left as is.

## File list

| File | Change |
| --- | --- |
| `components/case-design-center/utils/resolveAddedCardProduct.ts` | `.ts` import; chain-weighted `resolveRemovableProgressTooth`; new `resolveCardImpressionText` |
| `components/case-design-center/components/RemovableRestorationFields.tsx` | card-level visibility / shade / add-on / impression reads (patch) |
| `components/case-design-center/components/MandibularPanel.tsx` | import + `resolveCardImpressionText` in card-0 impression row |
| `components/case-design-center/components/MaxillaryPanel.tsx` | same as Mandibular |
| `components/case-design-center/utils/resolveAddedCardProduct.test.mjs` | +6 tests (patch) |
| `docs/updates/2026-10-17-add-stage-impression-hides-removable-fields.md` | root-cause write-up |
| `docs/updates/2026-10-17-add-stage-impression-fix.patch` | patch for the two wholly-mine files |
| `docs/updates/2026-10-17-add-stage-fix-REAPPLY-GUIDE.md` | this file |
