# Paper slip v2 — iPhone print shows 3 pages

## Problem

Printing a single paper-slip v2 from iPhone (AirPrint → Brother / US Letter) showed **Pages 1–3**. Page 1 held the full slip; pages 2–3 were mostly blank.

## Cause

1. `@page { size: 628px 890px }` is ignored on iOS AirPrint; the sheet forces **US Letter**.
2. Tooth-chart `transform: scale(1.12)` ink overflow was not reliably clipped in WebKit print, so Safari invented extra Letter pages.

## Fix

- `@page` → `size: letter portrait; margin: 0`
- Wrap each slip in `.paper-slip-v2-sheet` (`8.5in × 11in`, `overflow: hidden`, one sheet per page)
- Clip `.paper-slip-v2-arch-chart` overflow
- Tighten mobile in-place print CSS (`hooks/use-paper-slip-in-page-print-v2.tsx`)

## Files

- `components/paper-slip-print/paper-slip-print-v2-document.tsx`
- `hooks/use-paper-slip-in-page-print-v2.tsx`
- `docs/superpowers/specs/2026-09-18-paper-slip-v2-layout-spacing.md`

## Verify

On iPhone: print one paper slip → Range should read **Pages 1–1** (or 1–N only when printing N slips) at US Letter, 100% scale.
