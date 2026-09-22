# Paper slip print — Safari headers & footers

## Goal

Reduce iPhone Safari / AirPrint **page** headers & footers (site title, URL, date, page number) on paper slip prints.

## What we can control

Web pages **cannot** turn off Safari’s “Headers & Footers” checkbox via JavaScript. We only mitigate:

1. `@page { margin: 0 }` in in-place + iframe print CSS — Safari often skips chrome headers when margins are zero
2. Blank `document.title` (space) during print so the title line is empty; restored on `afterprint`

## If they still appear

In the iOS print sheet → Options → turn off **Headers & Footers**.

## File

- `hooks/use-paper-slip-in-page-print-v2.tsx`
