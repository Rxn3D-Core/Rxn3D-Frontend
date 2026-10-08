# Paper slip — Safari (Mac) print sheet never opens

## Problem

After choosing Full/Half layout in **Mac Safari**, preparing finished but the print window never opened.

## Cause

Desktop path used a hidden iframe + `iframe.contentWindow.print()`:

1. `onload` was assigned **after** `document.write`/`close` — Safari often never fires it
2. The iframe was removed on the next tick — Safari cancels the print sheet

## Fix

- Route **desktop Safari** through the same in-place `window.print()` path as iPhone
- For Chrome iframe path: set `onload` before write, keep iframe until `afterprint`, timeout fonts wait, fall back to in-place print

## File

- `hooks/use-paper-slip-in-page-print-v2.tsx`
