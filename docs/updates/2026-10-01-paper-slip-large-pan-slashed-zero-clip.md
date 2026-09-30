# Paper slip: large pan slashed zero was clipped

**Date:** 2026-10-01

## Bug

On the v5 half-page stub, pan numbers that contain `0` (e.g. `R0C`) printed the
giant pan with a tiny speck between the letters instead of a full-size slashed
zero. Header `Pan #` was fine.

## Cause

`.ps-pan` uses a fixed `121px` height and `overflow: hidden`. Wrapping `0` in
`.ps-zero` (`display: inline-block; line-height: 1`) grew the line box past that
height, so most of the digit was clipped.

## Fix

| File | Change |
| --- | --- |
| `lib/paper-slip-v5-css.ts` | `.ps-pan` → `display: flex; align-items: center`; `.ps-zero` → `flex-shrink: 0` |

React print paths (`SlashedZeroText`) were already fine — no fixed clip box on
the large pan text.
