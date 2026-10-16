# Paper slip notes: measure wrap before print

## Summary

Printed paper-slip notes (v5/v6) are limited to about **3 wrapped lines**. Long notes are truncated by **measuring real text wrap** in the browser (off-screen probe matching `.ps-notes`), then ending the last line with plain text:

`... (view full notes on virtual slip)`

No badge or button. Short notes that fit three lines are unchanged. Without `document` (Node tests), a conservative char-budget fallback is used.

## Changes

- `lib/paper-slip-notes-display.ts` — `measureTruncatePaperSlipNotes`, `truncatePaperSlipNotesByHeight`, `formatPaperSlipNotesForPrint`
- `lib/paper-slip-v5-html.ts` / `lib/paper-slip-v6-html.ts` — format notes with `document` when printing
- `lib/paper-slip-v5-css.ts` / `lib/paper-slip-v6-css.ts` — 3-line `max-height` safety net (no badge styles)

## Verify

```bash
node --test lib/paper-slip-notes-display.test.mjs
```

Print a slip with a long stage note and confirm the notes box shows ~3 lines ending in `... (view full notes on virtual slip)` with no clipping.
