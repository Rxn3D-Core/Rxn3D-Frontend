# Edit slip: add-product hang + both arch tooth charts visible

**Date:** 2026-09-30

## Problem

On some slips (e.g. a mandibular "Minimum Acrylic Repair"), adding a product on either arch hung the page with no console error. The opposite arch also showed no tooth chart in edit mode.

## Causes

1. **Refetch loop for "light" products.** The added-products effect in `useCaseDesignState` treated a product as loaded only if `isHydratedProductApiData` was true (has `advance_fields` or `teeth_shades`). Products with neither (simple repair products, no extractions/fields) never passed, so every effect run refetched the product and called `setToothProduct` again. That changed `getToothProduct`, which re-ran the effect — an endless fetch/re-render cycle.
2. **Opposite arch hidden in edit mode.** `showMaxillary` / `showMandibular` were initialized from `initialArch` only, so the empty arch had no chart until an inline add temporarily forced it visible.

## Fix

- Use `cachedProductRef` whenever an entry exists (it only stores full detail responses) instead of requiring the hydration heuristic.
- Skip `setToothProduct` for the virtual card slot / card teeth when the same product object is already stored.
- When `preloadInitialSlipState` is set (Edit Slip, Add New Stage), both arches start visible, same as the read-only virtual slip.

## Files

- `components/case-design-center/hooks/useCaseDesignState.ts`
