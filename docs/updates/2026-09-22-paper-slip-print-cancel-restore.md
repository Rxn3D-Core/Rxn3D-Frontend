# Paper slip print — restore listing after cancel

## Issue

After canceling the browser print dialog, the paper slip stayed on screen over
`/lab-case-management` (looked like a stuck print page).

## Cause

Desktop iframe print set `iframe.style.visibility = "visible"` before
`print()`. On cancel, if cleanup lagged, the full-size iframe covered the listing.

## Fix

- Keep the print iframe at `width/height: 0` and never unhide it
- Remove the iframe on `afterprint` (cancel or complete)
- For in-place print (non-iOS), remove the injected slip on `afterprint` too

## File

- `hooks/use-paper-slip-in-page-print-v2.tsx`

## Verify

1. Print from listing → print dialog opens
2. Cancel → listing (or virtual slip) is visible again; no slip overlay
3. Print → complete → same restore
