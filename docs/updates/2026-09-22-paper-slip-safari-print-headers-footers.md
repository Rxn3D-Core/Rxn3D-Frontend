# Paper slip print — Safari headers & footers

## Goal

Reduce iPhone Safari / AirPrint **page** headers & footers (site title, URL, date, page number) on paper slip prints.

## What we can control

Web pages **cannot** turn off Safari’s “Headers & Footers” checkbox via JavaScript. We only mitigate:

1. `@page { margin: 0 }` in in-place + iframe print CSS — Safari often skips chrome headers when margins are zero
2. Blank `document.title` (space) during print so the title line is empty; restored on `afterprint`

## If they still appear

In the iOS print sheet → Options → turn off **Headers & Footers**.

## iPhone print sheet never opens

Safari on iPhone ignores `window.print()` after the Full/Half tap, because slip data loads asynchronously and the user gesture has ended. Confirm now opens a print tab **in that same tap**. When the slip HTML is ready it is written into that tab, which calls `print()` on load and closes after print/cancel.

## File

- `hooks/use-paper-slip-in-page-print-v2.tsx`
- `components/paper-slip-print/paper-slip-print-v2-page-shell.tsx`

