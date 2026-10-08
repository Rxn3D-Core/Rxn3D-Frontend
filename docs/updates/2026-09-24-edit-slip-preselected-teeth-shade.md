# Edit slip: preselected teeth shade no longer re-prompted

**Date:** 2026-09-24

## Problem

On edit slip, the UI could still open the teeth shade picker (and show the wrong shade guide) even when the slip already had a shade saved — including removaables Stayplate/Flipper with IPS A2.

## Causes

1. **Fixed footer readiness** treated empty named `shade_guide` advance fields as blocking when classic `has_teeth_shade` was already filled.
2. **Removable `AutoOpenShade`** in `RemovableRestorationFields` ignored `suppressFieldAutoOpen`, so it opened the picker on mount before preload hydration (often against a virtual `-cardId` product key), leaving an empty “Tooth Shade — selecting” over a green filled field.
3. **Shade guide** was not preloaded from `teeth_shade_brand.system_name`, so labels defaulted to Vita Classical for a shared code like A2.

## Fix

- `getMissingFixedShadeFieldLabel` matches fixed-card gating for classic teeth/gum.
- Removable auto-open helpers honor `useAutoOpenSuppressed`.
- Preload stores removable `teeth_shade` / `gum_shade` as JSON with brand ids, writes shade keys for every product tooth, and hydrates `selectedShadeGuide` from the slip brand system name.

## Files

- `components/case-design-center/utils/fixedShadeCompleteness.ts`
- `components/case-design-center/components/CaseDesignCenter.tsx`
- `components/case-design-center/components/RemovableRestorationFields.tsx`
- `components/case-design-center/hooks/useCaseDesignState.ts`
- `lib/virtual-slip-transformer.ts`
