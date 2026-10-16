# Edit slip / add-new-stage: preserve stage/grade/impression when editing tooth chart

**Date:** 2026-10-16

## Problem

On edit slip and add-new-stage, changing the tooth chart (especially adding a lower-numbered tooth or changing retention on the first tooth) cleared stage (red empty field), while grade sometimes remained. Stage was re-prompted.

## Causes

1. **Fixed:** Select-time “min tooth” migration treated a retention change on the existing min tooth as a new min join, orphaning sibling ownership and stage keys.
2. **Removable (add-new-stage):** Stage was stored only on `teeth[0]`. Adding a lower tooth (e.g. #20 into `#25, 27, 28`) switched the representative tooth to the new min, so stage looked empty. Grade survived because it was written to all teeth.

## Fix

1. Stop select-time fixed stage/field migration; keep progress-stable fixed stage tooth.
2. **`resolveRemovableProgressTooth`** — keep the tooth that already has stage/grade when the chart changes.
3. **Copy sibling removable progress** onto newly assigned teeth (same card).
4. **Add-stage preload** writes the chosen stage onto every product tooth / stage key.
5. Removable stage UI scans all card teeth so a chart edit cannot look like a reset.
6. **Done gates fields again**: clearing/reselecting teeth must not auto-open stage/grade —
   progressive fields stay hidden until tooth-chart Done is clicked. Clearing the last
   tooth on a card resets Done. Clearing a tooth stashes stage/grade onto the card
   virtual slot (`-cardId`) so Done can restore them without re-prompting.

## Files

- `components/case-design-center/hooks/useCaseDesignState.ts`
- `components/case-design-center/hooks/useExtractionsAcknowledged.ts`
- `components/case-design-center/hooks/useToothFieldProgress.ts`
- `components/case-design-center/utils/fixedCardGating.ts`
- `components/case-design-center/utils/resolveAddedCardProduct.ts`
- `components/case-design-center/components/MaxillaryPanel.tsx`
- `components/case-design-center/components/MandibularPanel.tsx`
- `components/case-design-center/components/RemovableRestorationFields.tsx`
- `lib/add-stage/preload-state.ts`
