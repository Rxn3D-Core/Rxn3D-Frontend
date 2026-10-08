# Paper slip mobile print — hide leftover preview after cancel

## Problem

On iPhone, after opening print for a paper slip and **canceling**, the injected paper-slip HTML stayed visible under the virtual slip / listing (large white gap + slip preview at the bottom).

## Cause

Mobile print mounts the slip on the current page (`#paper-slip-v2-mobile-print-root`) because iframe print is unreliable on iOS. That node was only styled under `@media print`, so on screen it remained fully visible. Cleanup on `afterprint` was avoided earlier because iOS fires that event mid-sheet (e.g. paper-size change).

## Fix

- Screen CSS: zero-size / clipped / `visibility: hidden` on the print root so cancel restores the normal page
- `@media print`: reveal the root and hide all other `body` children
- Leave the node in the DOM until the next print (iOS `afterprint` fires mid-sheet; removing then breaks the preview)

## Files

- `hooks/use-paper-slip-in-page-print-v2.tsx`
- `hooks/use-paper-slip-in-page-print.tsx` (same pattern)

## Verify

1. Mobile: Print paper slip → cancel → virtual slip / listing looks normal (no slip preview, no white gap).
2. Mobile: Print paper slip → complete print → same.
3. Changing paper size in the iOS sheet still prints the slip (not the app UI).
