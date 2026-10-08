# Paper slip v2 — iPhone print shows 3 pages

## Problem

Printing a single paper-slip v2 from iPhone (AirPrint → Brother / US Letter) showed **Pages 1–3**. Page 1 held the full slip; pages 2–3 were mostly blank.

## Cause

1. `@page { size: 628px 890px }` is ignored on iOS AirPrint; the sheet forces **US Letter**.
2. Tooth-chart `transform: scale(1.12)` ink overflow was not reliably clipped in WebKit print, so Safari invented extra Letter pages.
3. **Main cause of the persistent 3-page bug:** iOS AirPrint scales printed content to fit the paper **width**. The slip prints at its natural width (~166mm), which is narrower/taller than Letter portrait, so AirPrint scales it up and the single slip's height spills onto pages 2–3. Mac Safari and Chrome honor the physical mm size and stay on one page.

## Fix

- `@page` → `size: auto; margin: 0` (honors iOS Letter or A4 picker)
- Slip print size in **mm** (not px) so WebKit doesn’t treat `890px` as ~12in
- **iOS only:** each `.paper-slip-v2-sheet` is given the **Letter-portrait aspect ratio** (`width = height × 8.5/11`, class `paper-slip-v2-print-ios`) with the slip centered inside. AirPrint's fit-to-width (and contain) then map one slip to exactly one page. `IOS_SHEET_W_MM` derives from `SLIP_H_IN × 8.5/11`.
- Page breaks only between slips (`.sheet + .sheet`), never after the last
- Clip `.paper-slip-v2-arch-chart` overflow; tooth-chart transform flattened in print
- Mobile in-place print CSS keeps siblings hidden; per-slip sizing lives on `.paper-slip-v2-sheet`
- Desktop/Mac Safari unchanged (`paper-slip-v2-print-fill` zoom-to-fill)

## Files

- `components/paper-slip-print/paper-slip-print-v2-document.tsx`
- `hooks/use-paper-slip-in-page-print-v2.tsx`
- `docs/superpowers/specs/2026-09-18-paper-slip-v2-layout-spacing.md`

## Verify

On iPhone: print one paper slip → Range should read **Pages 1–1** (or 1–N only when printing N slips) at US Letter, 100% scale.
