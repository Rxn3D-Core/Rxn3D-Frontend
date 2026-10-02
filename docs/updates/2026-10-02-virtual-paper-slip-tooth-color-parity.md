# Virtual / paper slip: Color teeth without a photo match create slip

**Date:** 2026-10-02

## Problem

On create slip, a tooth with a Color extraction (for example "Fix or Repair") and no per-tooth photo shows the extraction color. On the virtual slip and paper slip v5, the same tooth showed the extraction's status-box icon instead of the color.

## Cause

The extraction's `image_url` (status-box icon) was used as a fallback tooth image:

- Backend: `slip_product_teeth_selections[].selected_tooth_image_url` and `tooth_chart_preload.teeth[].image_url` fell back to it, and reported `visibility_type: Image`.
- Frontend: `imageUrlForToothFromCatalogRow` fell back to catalog `image_url`.

## Fix

- Backend (`SlipProductTeethSelectionResource`, `SlipProductToothChartPreloadResolver`): extractions only return per-tooth images; otherwise `null` + `Color`.
- Frontend (`lib/virtual-slip-extraction-display.ts`): chart images come from per-tooth `images[]` only.
- Paper slip v5 (`lib/paper-slip-v5-html.ts`): Color teeth without a photo get the same tint filter the teeth SVG uses.

Verified against slips 491/492 (FIX on teeth 8, 9–10): teeth now render `#A0F69A`; slips with real tooth photos are unchanged.
