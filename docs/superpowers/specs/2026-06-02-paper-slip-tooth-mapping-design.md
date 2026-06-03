# Paper Slip Tooth Mapping Design

Date: 2026-06-02

## Goal

Improve paper slip print output so the tooth images and extraction-status visuals follow the same decision logic used in `/case-design-center`, while keeping the existing paper slip layout and overall Blade template structure.

This design does not attempt to port the React UI or redesign the PDF layout. It only aligns:

- Per-tooth image selection
- Default TIM behavior
- Non-default extraction mapping
- Overlay extraction handling where a status SVG/image should be shown
- Extraction status icon box image selection

## Current Problem

The portrait v2 paper slip currently uses backend logic in `PaperSlipService::getV2TeethImageUrls()` to choose a single image per tooth, then renders those images through the Blade chart partial.

That logic is simpler than the one used in `/case-design-center`:

- It does not fully model the same tooth-to-extraction assignment semantics
- It does not mirror overlay extraction behavior such as clasps
- It does not expose a parallel status-visual mapping for the extraction status icon boxes
- It can produce print output that does not match the design-center representation of the same case

## Non-Goals

- Rebuilding the paper slip using React
- Reusing frontend components directly in Blade/PHP
- Changing the overall paper slip card/layout structure
- Solving all print sharpness issues in this design
  - Sharpness may improve indirectly if better per-tooth assets are selected, but rendering quality itself is a separate concern

## Source of Truth to Mirror

The paper slip should mirror the selection logic already used by `/case-design-center`, especially these concepts:

- Teeth not explicitly mapped into a non-default extraction should be treated as TIM when the product supports TIM
- Non-default extractions are keyed by `toothExtractionMap`
- Overlay extractions should not replace base tooth-state semantics the same way as exclusive extractions
- Per-tooth image URLs should prefer extraction-specific per-tooth image mappings when available
- Status visuals shown in extraction icon/status boxes should use the same extraction image selection rules as the design center

Relevant frontend references:

- `components/case-design-center/utils/extractionHelpers.ts`
- `components/case-design-center/utils/removableToothDisplay.ts`
- `components/case-design-center/utils/claspOverlayImage.ts`
- `components/case-design-center/utils/retentionOptionImage.ts`
- Panel logic in `components/case-design-center/components/MaxillaryPanel.tsx` and `MandibularPanel.tsx`

## Proposed Approach

### 1. Add a backend tooth-state resolver

Create a backend helper dedicated to paper slip tooth visualization. Its job is to compute the same conceptual state the design center derives on the frontend, but in PHP.

Recommended location:

- `rxn3d_backend/app/Services/PaperSlipToothStateResolver.php`

Responsibilities:

- Build a normalized per-tooth assignment map for teeth `1..32`
- Determine whether each tooth is:
  - Default TIM
  - Assigned to a non-default extraction
  - Affected by an overlay extraction
- Resolve the preferred per-tooth image URL
- Resolve the preferred extraction status visual for status/icon box display

This helper should return plain arrays that Blade can consume directly.

### 2. Mirror case-design-center extraction semantics

The backend resolver should explicitly copy these behaviors from the design center:

- Unmapped teeth count as TIM when a TIM extraction exists for the active product context
- Explicit non-default mappings override TIM for the base tooth image
- Overlay extractions are additive and should be represented separately from base tooth image selection
- Missing-teeth style states should be resolvable both at tooth-chart level and status-box level

The backend implementation should not use the exact frontend file structure, but it should preserve the same behavior.

### 3. Split output into two visual maps

Instead of returning only `teethImageUrls`, the backend should return two independent structures:

- `toothImageUrls`
  - The image each tooth slot in the chart should render
- `toothStatusVisuals`
  - The image/SVG/icon metadata used by extraction status boxes/callouts

Example response shape:

```php
[
    'toothImageUrls' => [
        '1.png' => 'https://...',
        '2.png' => 'https://...',
    ],
    'toothStatusVisuals' => [
        8 => [
            'type' => 'image',
            'url' => 'https://...',
            'extraction_code' => 'MT_L1_G2',
        ],
        12 => [
            'type' => 'image',
            'url' => 'https://...',
            'extraction_code' => 'CLASP_L1_G6',
            'overlay' => true,
        ],
    ],
]
```

This keeps chart rendering and status-box rendering decoupled.

### 4. Update the portrait v2 service path

Modify `PaperSlipService::generatePortraitV2PaperSlip()` so it no longer directly calls the simpler `getV2TeethImageUrls()` as its only chart source.

Instead:

- Build tooth visualization state through the new resolver
- Pass both `toothImageUrls` and `toothStatusVisuals` into the Blade view

`getV2TeethImageUrls()` can either:

- be retired entirely, or
- become a compatibility wrapper over the new resolver’s `toothImageUrls`

Preferred option: keep a thin wrapper temporarily to reduce change risk, then consolidate later.

### 5. Update Blade status/icon box rendering

The current paper slip callout/status area should be updated to consume `toothStatusVisuals` rather than inferring its own simplified display.

Expected behavior:

- If a status visual exists for the relevant tooth/extraction, render that image
- If the extraction is overlay-only, render the overlay visual without replacing the base chart tooth image
- If no extraction-specific visual exists, fall back to current static behavior

This keeps the existing paper-slip card layout while making the icon/status visuals match the design-center source logic.

## Data Flow

1. `generatePortraitV2PaperSlip()` loads the slip and its product/extraction relationships.
2. `PaperSlipToothStateResolver` inspects:
   - slip products
   - extraction assignments
   - extraction metadata
   - extraction image collections
3. Resolver returns:
   - per-tooth chart image URLs
   - per-tooth status/icon visuals
4. Blade renders:
   - chart using `toothImageUrls`
   - extraction status icon boxes using `toothStatusVisuals`

## Rendering Constraints

To keep scope controlled, this design preserves the existing Blade/SVG chart structure. That means:

- The paper slip will still render through Blade
- The chart layout coordinates remain in the print template
- Only the mapping and visual source-selection logic changes

If print sharpness remains unacceptable after the mapping fix, the next design should address rendering strategy separately:

- larger image assets
- direct `<image>` rendering instead of pattern fills
- or vectorized status assets

## Error Handling

The resolver should fail soft:

- Missing extraction image for a tooth should fall back to the default TIM tooth image
- Missing overlay visual should not block slip generation
- Unknown extraction code should be ignored and logged at debug/warn level

Paper slip generation must still succeed even when one or more extraction visuals are incomplete.

## Testing Strategy

Add focused backend tests for the new resolver and keep them independent of the full print template where possible.

Recommended test cases:

1. Unmapped tooth with TIM extraction resolves to TIM image
2. Tooth explicitly mapped to missing-teeth extraction resolves to missing image
3. Overlay extraction does not replace base tooth image selection
4. Overlay extraction still resolves a status visual for the icon/status box
5. Per-tooth extraction image is preferred over generic extraction image
6. Missing extraction image falls back safely
7. Full-arch missing-teeth case returns consistent chart + status mappings

## Risks

### Logic drift

If the backend manually reimplements frontend rules and the frontend later changes, they can drift again.

Mitigation:

- Mirror the behavior intentionally and document the frontend reference files in code comments
- Keep the resolver small and rule-focused
- Add tests that encode the expected behaviors

### Print template coupling

The more view-specific logic stays inside Blade, the harder it will be to verify.

Mitigation:

- Keep decision logic in the backend resolver
- Pass view-ready arrays into Blade

## Implementation Summary

Recommended implementation sequence:

1. Add backend resolver class for tooth/state visual mapping
2. Port the case-design-center decision rules into backend tests
3. Wire resolver into `generatePortraitV2PaperSlip()`
4. Update Blade chart/status sections to consume the new maps
5. Verify printed slips for:
   - default TIM teeth
   - full missing-teeth arches
   - mixed extractions
   - overlay extraction cases such as clasps

## Success Criteria

This work is successful when:

- The printed paper slip uses the same per-tooth image-selection logic as `/case-design-center`
- Extraction status icon boxes use the same extraction visual logic as `/case-design-center`
- Existing paper slip layout remains intact
- The output no longer diverges from the design center for the same slip/extraction assignments
