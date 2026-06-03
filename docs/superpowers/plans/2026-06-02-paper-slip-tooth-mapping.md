# Paper Slip Tooth Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the portrait v2 paper slip use the same tooth image selection rules and extraction-status visual logic as `/case-design-center` without changing the existing print layout.

**Architecture:** Add a small backend resolver that mirrors the case-design-center extraction rules in PHP, then have `PaperSlipService` pass two maps into the Blade view: one for chart tooth images and one for extraction-status visuals. Keep the current Blade print layout intact and only swap the decision logic that chooses which image/SVG should appear.

**Tech Stack:** Laravel 11, PHPUnit via `php artisan test`, Blade, existing `PaperSlipService`, case-design-center frontend reference logic in TypeScript.

---

## File Structure

**Create**

- `rxn3d_backend/app/Services/PaperSlipToothStateResolver.php`
  - Backend-only resolver that mirrors case-design-center tooth/extraction rules and returns view-ready maps.
- `rxn3d_backend/tests/PaperSlipToothStateResolverTest.php`
  - Focused PHPUnit coverage for TIM/default, missing-teeth, overlay/clasp, and fallback behavior.

**Modify**

- `rxn3d_backend/app/Services/PaperSlipService.php`
  - Replace the direct v2 tooth-map logic with the new resolver and pass both tooth chart and status visual maps into the v2 Blade template.
- `rxn3d_backend/resources/views/paper_slip_new_v2/paper-slip-portrait-v2.blade.php`
  - Update extraction callouts/status visuals to render resolver-provided images instead of a hardcoded `X`.
- `rxn3d_backend/resources/views/paper_slip_new_v2/_tooth-chart-v2.blade.php`
  - Keep layout intact but switch variable usage from `teethImageUrls` to the resolver-backed map name if needed.
- `rxn3d_backend/tests/PaperSlipServiceTest.php`
  - Preserve current coverage and add a shallow integration assertion that the service exposes the resolver-backed maps to the view path.

**Reference Only**

- `Rxn3D-Frontend/components/case-design-center/utils/extractionHelpers.ts`
- `Rxn3D-Frontend/components/case-design-center/utils/removableToothDisplay.ts`
- `Rxn3D-Frontend/components/case-design-center/utils/claspOverlayImage.ts`
- `Rxn3D-Frontend/components/case-design-center/utils/retentionOptionImage.ts`

### Task 1: Add Resolver Tests First

**Files:**
- Create: `rxn3d_backend/tests/PaperSlipToothStateResolverTest.php`
- Reference: `rxn3d_backend/tests/PaperSlipServiceTest.php`
- Reference: `Rxn3D-Frontend/components/case-design-center/utils/extractionHelpers.ts`
- Reference: `Rxn3D-Frontend/components/case-design-center/utils/claspOverlayImage.ts`

- [ ] **Step 1: Write the failing resolver test file**

```php
<?php

namespace Tests;

use App\Services\PaperSlipToothStateResolver;

class PaperSlipToothStateResolverTest extends TestCase
{
    /** @test */
    public function unmapped_teeth_fall_back_to_tim_when_tim_extraction_exists(): void
    {
        $resolver = new PaperSlipToothStateResolver();

        $result = $resolver->resolve([
            'products' => [[
                'extractions' => [
                    [
                        'code' => 'TIM1',
                        'name' => 'Teeth in mouth',
                        'is_tim' => 'Yes',
                        'is_default' => 'Yes',
                        'overlay' => 'No',
                        'visibility_type' => 'Image',
                        'images' => [],
                    ],
                ],
                'product_extractions' => [],
            ]],
            'defaultToothImageUrls' => [
                8 => 'https://example.com/default-8.png',
            ],
        ]);

        $this->assertSame('https://example.com/default-8.png', $result['toothImageUrls']['8.png']);
    }

    /** @test */
    public function mapped_missing_teeth_overrides_tim_for_chart_image(): void
    {
        $resolver = new PaperSlipToothStateResolver();

        $result = $resolver->resolve([
            'products' => [[
                'extractions' => [
                    [
                        'code' => 'TIM1',
                        'name' => 'Teeth in mouth',
                        'is_tim' => 'Yes',
                        'is_default' => 'Yes',
                        'overlay' => 'No',
                        'visibility_type' => 'Image',
                        'images' => [],
                    ],
                    [
                        'code' => 'MT_L1_G2',
                        'name' => 'Missing teeth',
                        'is_tim' => 'No',
                        'is_default' => 'No',
                        'overlay' => 'No',
                        'visibility_type' => 'Image',
                        'images' => [
                            ['tooth_number' => 8, 'image_url' => 'https://example.com/missing-8.png'],
                        ],
                    ],
                ],
                'product_extractions' => [
                    [
                        'teeth_numbers' => [8],
                        'extraction' => ['code' => 'MT_L1_G2'],
                    ],
                ],
            ]],
            'defaultToothImageUrls' => [
                8 => 'https://example.com/default-8.png',
            ],
        ]);

        $this->assertSame('https://example.com/missing-8.png', $result['toothImageUrls']['8.png']);
    }

    /** @test */
    public function clasp_overlay_keeps_base_image_but_returns_status_visual(): void
    {
        $resolver = new PaperSlipToothStateResolver();

        $result = $resolver->resolve([
            'products' => [[
                'extractions' => [
                    [
                        'code' => 'TIM1',
                        'name' => 'Teeth in mouth',
                        'is_tim' => 'Yes',
                        'is_default' => 'Yes',
                        'overlay' => 'No',
                        'visibility_type' => 'Image',
                        'images' => [],
                    ],
                    [
                        'code' => 'CLASP_L1_G6',
                        'name' => 'Clasps',
                        'is_tim' => 'No',
                        'is_default' => 'No',
                        'overlay' => 'Yes',
                        'visibility_type' => 'Image',
                        'images' => [
                            ['tooth_number' => 12, 'image_url' => 'https://example.com/clasp-12.png'],
                        ],
                    ],
                ],
                'product_extractions' => [],
                'clasp_teeth' => [12],
            ]],
            'defaultToothImageUrls' => [
                12 => 'https://example.com/default-12.png',
            ],
        ]);

        $this->assertSame('https://example.com/default-12.png', $result['toothImageUrls']['12.png']);
        $this->assertSame('https://example.com/clasp-12.png', $result['toothStatusVisuals'][12]['url']);
        $this->assertTrue($result['toothStatusVisuals'][12]['overlay']);
    }
}
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```bash
cd /Users/gilberttuazon/Documents/Projects/RXN3D/rx\ be\ fe/rxn3d_backend
php artisan test --filter PaperSlipToothStateResolverTest
```

Expected:

- FAIL because `App\Services\PaperSlipToothStateResolver` does not exist yet.

- [ ] **Step 3: Commit the failing test**

```bash
cd /Users/gilberttuazon/Documents/Projects/RXN3D/rx\ be\ fe/rxn3d_backend
git add tests/PaperSlipToothStateResolverTest.php
git commit -m "test: add paper slip tooth state resolver coverage"
```

### Task 2: Implement the Backend Resolver

**Files:**
- Create: `rxn3d_backend/app/Services/PaperSlipToothStateResolver.php`
- Reference: `Rxn3D-Frontend/components/case-design-center/utils/extractionHelpers.ts`
- Reference: `Rxn3D-Frontend/components/case-design-center/utils/claspOverlayImage.ts`
- Test: `rxn3d_backend/tests/PaperSlipToothStateResolverTest.php`

- [ ] **Step 1: Add the resolver class skeleton**

```php
<?php

namespace App\Services;

class PaperSlipToothStateResolver
{
    public function resolve(array $context): array
    {
        return [
            'toothImageUrls' => [],
            'toothStatusVisuals' => [],
        ];
    }
}
```

- [ ] **Step 2: Implement minimal TIM/default image fallback first**

```php
public function resolve(array $context): array
{
    $defaultToothImageUrls = $context['defaultToothImageUrls'] ?? [];
    $toothImageUrls = [];

    for ($tooth = 1; $tooth <= 32; $tooth++) {
        $toothImageUrls[$tooth . '.png'] = $defaultToothImageUrls[$tooth] ?? null;
    }

    return [
        'toothImageUrls' => $toothImageUrls,
        'toothStatusVisuals' => [],
    ];
}
```

- [ ] **Step 3: Extend the resolver with exclusive extraction mapping and overlay status visuals**

```php
private function resolveBaseExtractionCode(int $toothNumber, array $products): ?string
{
    foreach ($products as $product) {
        foreach (($product['product_extractions'] ?? []) as $productExtraction) {
            $teeth = $productExtraction['teeth_numbers'] ?? [];
            if (in_array($toothNumber, $teeth, true)) {
                $code = $productExtraction['extraction']['code'] ?? null;
                if ($code && !$this->isOverlayExtractionCode($code, $product['extractions'] ?? [])) {
                    return $code;
                }
            }
        }
    }

    return null;
}

private function isOverlayExtractionCode(string $code, array $extractions): bool
{
    foreach ($extractions as $extraction) {
        if (($extraction['code'] ?? null) === $code) {
            return strtolower((string) ($extraction['overlay'] ?? 'No')) === 'yes';
        }
    }

    return false;
}
```

Implementation notes:

- Use unmapped teeth as TIM when any active TIM extraction exists for the product context.
- Prefer extraction per-tooth image URLs over generic/default tooth image URLs.
- For clasp-like overlay status visuals, keep the base chart image unchanged and populate `toothStatusVisuals[$tooth]`.

- [ ] **Step 4: Run resolver tests until they pass**

Run:

```bash
cd /Users/gilberttuazon/Documents/Projects/RXN3D/rx\ be\ fe/rxn3d_backend
php artisan test --filter PaperSlipToothStateResolverTest
```

Expected:

- PASS with 3 tests green.

- [ ] **Step 5: Commit the resolver**

```bash
cd /Users/gilberttuazon/Documents/Projects/RXN3D/rx\ be\ fe/rxn3d_backend
git add app/Services/PaperSlipToothStateResolver.php tests/PaperSlipToothStateResolverTest.php
git commit -m "feat: add paper slip tooth state resolver"
```

### Task 3: Wire the Resolver Into PaperSlipService

**Files:**
- Modify: `rxn3d_backend/app/Services/PaperSlipService.php`
- Modify: `rxn3d_backend/tests/PaperSlipServiceTest.php`
- Test: `rxn3d_backend/tests/PaperSlipToothStateResolverTest.php`

- [ ] **Step 1: Add a shallow service test that proves the resolver-backed v2 map is exposed**

```php
/** @test */
public function v2_tooth_image_map_uses_numeric_template_keys(): void
{
    $service = new class extends \App\Services\PaperSlipService {
        public function exposeV2TeethImageUrls($slip): array
        {
            return $this->getV2TeethImageUrls($slip);
        }
    };

    $slip = new class {
        public $products = [];
    };

    $urls = $service->exposeV2TeethImageUrls($slip);

    $this->assertArrayHasKey('8.png', $urls);
    $this->assertStringContainsString('/images/Teeth-in-mouth/8.png', $urls['8.png']);
}
```

- [ ] **Step 2: Run the PaperSlipService test to verify the new assertion matches current behavior**

Run:

```bash
cd /Users/gilberttuazon/Documents/Projects/RXN3D/rx\ be\ fe/rxn3d_backend
php artisan test --filter PaperSlipServiceTest
```

Expected:

- PASS before wiring changes, proving the wrapper behavior is pinned.

- [ ] **Step 3: Inject and use the resolver inside PaperSlipService**

```php
protected function buildV2ToothVisualState(Slip $slip): array
{
    $defaultToothImageUrls = [];

    for ($tooth = 1; $tooth <= 32; $tooth++) {
        $defaultToothImageUrls[$tooth] = asset('images/Teeth-in-mouth/' . $tooth . '.png');
    }

    return app(PaperSlipToothStateResolver::class)->resolve([
        'products' => $this->normalizeSlipProductsForToothResolver($slip),
        'defaultToothImageUrls' => $defaultToothImageUrls,
    ]);
}
```

Then in `generatePortraitV2PaperSlip()`:

```php
$toothVisualState = $this->buildV2ToothVisualState($slip);

$htmlContent = View::make('paper_slip_new_v2.paper-slip-portrait-v2', [
    'slip' => $slip,
    'case' => $slip->case,
    'lab' => $slip->case->lab,
    'office' => $slip->case->office,
    'doctor' => $slip->case->doctor_details,
    'toothImageUrls' => $toothVisualState['toothImageUrls'],
    'toothStatusVisuals' => $toothVisualState['toothStatusVisuals'],
    'qrCode' => $qrCode,
    'labLogo' => $labLogo,
    'lastPageBreak' => $lastPageBreak,
])->render();
```

Also keep `getV2TeethImageUrls()` as a temporary wrapper:

```php
protected function getV2TeethImageUrls(Slip $slip): array
{
    return $this->buildV2ToothVisualState($slip)['toothImageUrls'];
}
```

- [ ] **Step 4: Run the backend service tests**

Run:

```bash
cd /Users/gilberttuazon/Documents/Projects/RXN3D/rx\ be\ fe/rxn3d_backend
php artisan test --filter PaperSlipServiceTest
php artisan test --filter PaperSlipToothStateResolverTest
```

Expected:

- PASS for both test classes.

- [ ] **Step 5: Commit the service wiring**

```bash
cd /Users/gilberttuazon/Documents/Projects/RXN3D/rx\ be\ fe/rxn3d_backend
git add app/Services/PaperSlipService.php tests/PaperSlipServiceTest.php tests/PaperSlipToothStateResolverTest.php
git commit -m "feat: wire paper slip resolver into v2 service"
```

### Task 4: Update the Blade View for Extraction Status Visuals

**Files:**
- Modify: `rxn3d_backend/resources/views/paper_slip_new_v2/paper-slip-portrait-v2.blade.php`
- Modify: `rxn3d_backend/resources/views/paper_slip_new_v2/_tooth-chart-v2.blade.php`

- [ ] **Step 1: Update the chart partial to read the resolver-backed chart map**

Replace the image lookup:

```php
<image href="{{ $toothImageUrls[$i . '.png'] ?? '' }}" width="1" height="1" preserveAspectRatio="none" />
```

and update the include call site:

```php
@include('paper_slip_new_v2._tooth-chart-v2', [
    'type' => 'maxillary',
    'toothImageUrls' => $toothImageUrls,
])
```

- [ ] **Step 2: Replace the hardcoded extraction `X` callout with resolver-driven status visuals**

Use a pattern like:

```php
@php
    $firstTooth = collect($box['teeth'] ?? [])->map(fn($t) => (int) $t)->first();
    $statusVisual = $firstTooth ? ($toothStatusVisuals[$firstTooth] ?? null) : null;
@endphp

<div class="callout {{ $box['type'] }}">
    @if($box['type'] === 'extraction' && !empty($statusVisual['url']))
        <img src="{{ $statusVisual['url'] }}" alt="{{ $box['title'] }}" class="callout-status-image" />
    @elseif($box['type'] === 'extraction')
        <span class="x">&#10005;</span>
    @endif
    <span>{{ $box['title'] }} {{ $box['teeth'] }}</span>
</div>
```

- [ ] **Step 3: Add minimal print-safe CSS for the status image**

```css
.callout-status-image {
    width: 24px;
    height: 24px;
    object-fit: contain;
    flex: 0 0 auto;
}
```

- [ ] **Step 4: Run a syntax pass and targeted tests**

Run:

```bash
cd /Users/gilberttuazon/Documents/Projects/RXN3D/rx\ be\ fe/rxn3d_backend
php artisan test --filter PaperSlipServiceTest
php artisan test --filter PaperSlipToothStateResolverTest
```

Expected:

- PASS.

- [ ] **Step 5: Commit the Blade wiring**

```bash
cd /Users/gilberttuazon/Documents/Projects/RXN3D/rx\ be\ fe/rxn3d_backend
git add resources/views/paper_slip_new_v2/paper-slip-portrait-v2.blade.php resources/views/paper_slip_new_v2/_tooth-chart-v2.blade.php
git commit -m "feat: render resolver-backed paper slip status visuals"
```

### Task 5: End-to-End Verification

**Files:**
- Verify: `rxn3d_backend/app/Services/PaperSlipService.php`
- Verify: `rxn3d_backend/resources/views/paper_slip_new_v2/paper-slip-portrait-v2.blade.php`
- Verify: `/case-design-center` behavior against generated paper slip output

- [ ] **Step 1: Run the full targeted backend suite**

Run:

```bash
cd /Users/gilberttuazon/Documents/Projects/RXN3D/rx\ be\ fe/rxn3d_backend
php artisan test --filter PaperSlipToothStateResolverTest
php artisan test --filter PaperSlipServiceTest
```

Expected:

- PASS for all targeted paper-slip tests.

- [ ] **Step 2: Manually verify four data scenarios**

Check generated paper slips for:

```text
1. Default TIM teeth render the same base tooth images as case-design-center
2. Full-arch missing teeth uses missing-teeth visuals consistently
3. Mixed TIM + missing teeth preserves per-tooth overrides
4. Clasp/overlay cases keep base tooth image and show overlay status visual in the callout
```

- [ ] **Step 3: If manual verification passes, capture final git state and commit**

```bash
cd /Users/gilberttuazon/Documents/Projects/RXN3D/rx\ be\ fe/rxn3d_backend
git status --short
git add app/Services/PaperSlipToothStateResolver.php app/Services/PaperSlipService.php resources/views/paper_slip_new_v2/_tooth-chart-v2.blade.php resources/views/paper_slip_new_v2/paper-slip-portrait-v2.blade.php tests/PaperSlipToothStateResolverTest.php tests/PaperSlipServiceTest.php
git commit -m "feat: align paper slip tooth mapping with case design center"
```

## Self-Review

### Spec Coverage

- Reuse only tooth image logic from case-design-center: covered in Tasks 1–3
- Reuse extraction status SVG/image logic: covered in Tasks 1, 2, and 4
- Keep existing paper-slip layout: covered in Tasks 3–4
- Verify overlay extraction behavior such as clasps: covered in Tasks 1, 2, and 5

### Placeholder Scan

- No `TODO` or `TBD` placeholders remain
- Every test task includes concrete commands
- Every code-changing task includes a starter code block or exact replacement target

### Type Consistency

- Resolver output keys stay consistent: `toothImageUrls`, `toothStatusVisuals`
- Blade view consumes the same keys introduced in service wiring
- Test names align with the resolver behavior described in the approved spec
