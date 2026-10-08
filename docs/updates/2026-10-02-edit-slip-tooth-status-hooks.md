# Edit slip: fix hooks crash after back-to-products swap

**Date:** 2026-10-02

## Problem

On edit slip, using the back-to-products arrow and selecting a different product crashed with:

`Rendered fewer hooks than expected. This may be caused by an accidental early return statement.`

## Cause

`ToothStatusBoxes` called `useRef` / `useEffect` for required-validation **after** `if (activeExtractions.length === 0) return null`. Swapping to a product with no active extractions skipped those hooks on the next render.

## Fix

Run the validation hooks unconditionally, then return `null` when there are no active extractions.

## Files

- `components/case-design-center/components/ToothStatusBoxes.tsx`
