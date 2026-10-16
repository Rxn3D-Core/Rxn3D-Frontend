# Add-new-stage: only Grade left after choosing impression (2026-10-17)

## Bug

On add-new-stage for a full-denture removable (e.g. Immediate Full Denture), the card showed
Stage / Teeth shade / Gum shade / Impression until the impression modal was confirmed. Right
after, every field disappeared except Grade (still green with its value), although the other
fields still held values.

## Cause

Progressive field visibility counts consecutive completed steps from the start of the chain
(`grade → stage → teeth_shade → gum_shade → impression → addons`) **on one tooth**
(`firstToothNumber`, from `resolveRemovableProgressTooth`).

- A full denture binds the whole arch (17–32) to the card (`applyAddedProductDefaultExtractions`),
  but the slip preloads grade / stage / shade only on its own teeth (e.g. 18–27).
- The impression is written to the lowest tooth bound to the card (17) — a tooth with no
  grade/stage.
- `resolveRemovableProgressTooth` returned the lowest tooth with *any* progress, so it flipped
  from 18 to 17 the moment 17 got its impression. The chain was then evaluated on 17
  (`{impression}` only → grade not complete → count 1) and only the first step (Grade) rendered.
- The Grade box still looked complete because it reads grade across all card teeth, while
  visibility read a single tooth.

## Fix

1. `resolveRemovableProgressTooth` ranks teeth by how far along the field chain they are
   (earlier steps weigh more), lowest tooth on ties — a tooth that only has an impression no
   longer wins over the tooth holding grade/stage/shade.
2. `SelectionProductFields` (renderer for added-product removable cards, both arches) now
   evaluates chain visibility, shade completion and shade values across the whole card
   (`isRemovableCardStepComplete` / `isRemovableCardFieldVisible` / `resolveCardFieldValue`),
   matching how its Grade and Stage boxes already worked.
3. `resolveAddedCardProduct.ts` imports `impressionStorage.ts` with the `.ts` extension like
   the rest of the testable utils — the extensionless import stopped
   `resolveAddedCardProduct.test.mjs` from loading.

4. Impression box stayed empty after choosing **No Impression**. "No Impression" is saved as the
   impression text on the card tooth that received it (17), while the box read the text from the
   field tooth (18). New `resolveCardImpressionText` reads it from whichever card tooth has a
   *completed* impression (un-completed teeth keep stale text, so they are ignored). Used by
   `SelectionProductFields` and the card-0 branches of both panels.

Tests: `resolveAddedCardProduct.test.mjs` (full-arch card where impression lands on tooth 17;
No Impression text read from a sibling tooth; stale text ignored).

Touched: `resolveAddedCardProduct.ts`, `RemovableRestorationFields.tsx`, `MandibularPanel.tsx`,
`MaxillaryPanel.tsx`.
