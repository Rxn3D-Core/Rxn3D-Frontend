# Dynamic Paper Slip V2 for Extraction and Retention Modes

## Summary

The existing `paper_slip_new_v2` portrait paper slip should remain the single rendering path for printable slips. Instead of adding a second paper-slip template, we will extend the current backend-to-Blade presentation model so the same slip can render correctly for:

- extraction-driven products
- products with no extraction but with retention-option tooth visuals
- default products with neither extraction nor retention-option tooth visuals

The goal is to maximize the existing V2 layout while making the tooth chart, callout area, and detail rows respond dynamically to the product data already present on the slip.

## Problem

The current V2 paper slip is biased toward extraction-driven rendering:

- per-tooth chart visuals are primarily derived from extraction state
- callout boxes are built from product replacement text plus grouped extractions
- detail rows are rendered as a generic summary even when the product is really an implant or retention-driven case

This causes two gaps:

1. Products where `product.has_extraction = "No"` and `extractions` are empty do not get a richer visual mode even if the product includes `retention_options.selected_tooth_image_url`.
2. Retention-driven slips, such as implant/prep cases, should still show meaningful tooth visuals and more appropriate product details without introducing a separate paper-slip template.

## Goals

- Keep `paper_slip_new_v2` as the only portrait V2 template family.
- Reuse the existing chart/callout/detail layout instead of replacing it.
- Support retention-option tooth visuals when there is no extraction for an arch.
- Preserve current extraction behavior as the highest-priority visual mode.
- Keep full-arch missing and denture-like cases working in the existing layout.
- Make the detail rows more context-aware for retention-driven products.

## Non-Goals

- No new standalone paper-slip template.
- No full redesign of the page structure.
- No dependency on React components at PDF render time.
- No attempt to solve unrelated PDF engine issues in this change.

## Current Relevant Structure

### Backend

- `rxn3d_backend/app/Services/PaperSlipService.php`
  - builds the V2 tooth visual state
  - prepares Blade data for `paper_slip_new_v2.paper-slip-portrait-v2`
- `rxn3d_backend/app/Services/PaperSlipToothStateResolver.php`
  - resolves extraction-backed per-tooth chart images and status visuals

### Blade

- `rxn3d_backend/resources/views/paper_slip_new_v2/paper-slip-portrait-v2.blade.php`
  - orchestrates arch grouping, callouts, detail rows, and layout
- `rxn3d_backend/resources/views/paper_slip_new_v2/_tooth-chart-v2.blade.php`
  - renders the SVG tooth chart using per-tooth image URLs
- `rxn3d_backend/resources/views/paper_slip_new_v2/_callouts-v2.blade.php`
  - renders the callout boxes for one arch

## Data Signals

The dynamic mode for an arch will be decided from product data already available on the slip payload:

- Extraction mode signals:
  - `product.extractions`
  - `product.product_extractions`
  - extraction metadata resolved into per-tooth visuals

- Retention mode signals:
  - `product.product.has_extraction === "No"` or no active extraction visuals for that arch
  - `product.retention_options`
  - `retention_options[].selected_tooth_image_url`
  - implant and abutment detail collections when present

- Default mode signals:
  - neither extraction visuals nor retention-option tooth images are available for the arch

## Design Overview

### 1. Extend the Existing Arch Presentation Model

The backend will continue to prepare one view model for the V2 paper slip, but it will be expanded with arch-aware presentation state.

For each arch, the prepared state should answer:

- `mode`: `extraction`, `retention`, or `default`
- `toothImageUrls`: final per-tooth chart images for that arch
- `statusVisuals`: optional per-tooth overlays or status visuals
- `callouts`: boxes to render under the chart
- `allMissing`: whether the arch should collapse into the single missing-teeth box
- `detailVariant`: which detail-row pattern to show for the arch or page

This keeps the layout logic in Blade simple and moves most decision-making into the backend service layer.

### 2. Mode Priority Rules

Priority is determined per arch:

1. `extraction`
   - used when the arch has active extraction visuals
   - current extraction rendering remains authoritative

2. `retention`
   - used only when the arch has no extraction visuals
   - requires at least one relevant retention option with a non-empty `selected_tooth_image_url`

3. `default`
   - used when neither extraction nor retention visuals are available

This rule prevents retention visuals from overriding a real extraction state on the same arch.

### 3. Tooth Chart Behavior

The existing SVG chart in `_tooth-chart-v2.blade.php` remains in place.

The chart will continue to consume a final per-tooth image map, but that map will now be built from a merged priority order:

1. extraction visual for the tooth
2. retention-option `selected_tooth_image_url` for the tooth
3. default tooth image for the arch

This allows the chart to stay structurally unchanged while the source of each tooth image becomes more expressive.

### 4. Callout Behavior

The current callout area remains in the same location and continues using `_callouts-v2.blade.php`, but the meaning of the boxes becomes dynamic:

- In `extraction` mode:
  - keep today’s extraction-style behavior
  - show product replacement callouts and extraction callouts as appropriate

- In `retention` mode:
  - do not fabricate extraction-style boxes
  - show the product callout only, such as `Single Crown 1 tooth` plus teeth list
  - keep the box visually consistent with the existing layout

- In `default` mode:
  - keep the current product callout behavior

- For full-arch missing scenarios:
  - continue using the single “All teeth missing” style pattern
  - allow dentures/removable cases to preserve the current simplified visual treatment

### 5. Detail Row Behavior

The layout below the chart should remain in the existing page region, but the content becomes mode-aware.

For `retention` mode, the rows should prefer retention-specific details already present on the slip, such as:

- implant brand
- implant platform
- implant size
- abutment type
- abutment option
- retention type

For `extraction` and `default` modes, keep the existing generic summary rows unless specific retention-driven details are the primary value for that arch.

Implementation should aim to reuse the current detail row markup and swap data sources rather than introducing a new section layout.

### 6. Mixed-Arch Cases

The system should support one arch in extraction mode and the other in retention or default mode on the same slip.

That means:

- chart visuals are decided per arch
- callouts are decided per arch
- all-missing logic is decided per arch

The page-level detail area can remain shared, but the presentation logic must not assume both arches are in the same mode.

## Backend Changes

### PaperSlipService

`PaperSlipService` should be expanded to build a richer V2 presentation state instead of passing only:

- `toothImageUrls`
- `toothStatusVisuals`

It should also prepare:

- arch mode metadata
- arch-specific callout box data
- arch-specific “all missing” flags
- a normalized retention-option tooth image lookup
- a normalized retention-detail summary for use in Blade

### Resolver Strategy

The existing `PaperSlipToothStateResolver` should remain responsible for extraction-backed tooth state. Retention support should be layered on top of that result rather than replacing it.

Recommended pattern:

1. resolve extraction-backed tooth state
2. normalize retention-option tooth image selections from slip products
3. fill only teeth that are not already claimed by extraction visuals
4. backfill any remaining teeth with the default image set

This preserves the tested extraction path while adding the retention path incrementally.

## Blade Changes

### `paper-slip-portrait-v2.blade.php`

- Replace implicit extraction-only assumptions with mode-aware arch state.
- Reuse existing rendering blocks and classes where possible.
- Derive detail rows from the prepared backend state instead of inferring them ad hoc in the view.

### `_callouts-v2.blade.php`

- Continue rendering the existing callout container.
- Support product-only retention callouts without extraction icon logic.
- Preserve extraction icon rendering only for extraction boxes.

### `_tooth-chart-v2.blade.php`

- Keep the current SVG structure.
- Continue consuming the final per-tooth image map without needing to know whether a tooth image came from extraction, retention, or default fallback.

## Error Handling and Fallbacks

- Missing or empty `selected_tooth_image_url` must not break rendering.
- Retention mode should only activate when at least one valid image-backed retention option exists for the arch.
- If retention details exist but images do not, fall back to `default` chart mode and still allow relevant detail rows to render.
- Unknown or partial implant/abutment data should render only the fields that have meaningful values.

## Testing Strategy

Given the current local PHPUnit runtime mismatch, implementation should still add or extend backend tests where practical, even if execution remains blocked in this environment.

Test coverage should focus on:

- arch mode selection priority
- extraction winning over retention for the same arch
- retention mode activation only when valid `selected_tooth_image_url` values exist
- default fallback when neither extraction nor retention visuals are present
- full-arch missing behavior remaining intact
- mixed-arch cases with different modes on each side

## Risks

- Blade complexity could grow if too much mode logic stays in the template.
- Products with partial or inconsistent retention data may accidentally enter the wrong mode unless normalization is strict.
- Shared detail rows may need careful aggregation when maxillary and mandibular products are in different modes.

## Recommended Implementation Shape

Keep the current V2 slip and maximize it by introducing a richer backend-prepared presentation model. Do not fork the layout. Let the service determine the mode for each arch and feed the existing tooth chart and callout partials with better data.

This gives the paper slip dynamic behavior for:

- extraction-based slips
- no-extraction slips with retention-option tooth visuals
- removable or missing-teeth cases

without creating a second paper-slip family.
