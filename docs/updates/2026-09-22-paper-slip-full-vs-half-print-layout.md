# Paper slip print — full page vs half page chooser

## Flow

1. User taps **Print paper slip**
2. Dialog asks **Full page** or **Half page** (last choice remembered in `localStorage`)
3. Print HTML is built for that layout, then the browser/AirPrint sheet opens

## Layouts

| Choice | Orientation | Sheet | After print |
| --- | --- | --- | --- |
| **Full page** | Portrait (`@page size: auto`) | 1 slip / Letter sheet, scaled up to fill (clip `8.5×11in`) | Use as-is |
| **Half page** | Landscape Letter | 2 slips side by side (`5.5" × 8.5"` each, scaled) | Cut on dashed center line; each half is a portrait slip |

## iOS one-page rule

AirPrint on iPhone invents blank pages when print CSS uses `transform: scale`, `zoom` (unreliably), or a fixed full-page `height` (e.g. `11in`). Full-page portrait therefore prints the Figma artboard at **mm size only** (`~166 × 235mm`) inside a `max-height: 270mm` sheet.

## Files

- `lib/paper-slip-print-layout.ts` — type, storage, half-page chunking
- `components/paper-slip-print/paper-slip-print-layout-dialog.tsx` — chooser UI
- `components/paper-slip-print/paper-slip-print-v2-document.tsx` — full/half CSS + DOM
- `components/paper-slip-print/paper-slip-print-v2-page-shell.tsx` — `layout` prop
- `hooks/use-paper-slip-in-page-print-v2.tsx` — ask → print
- `app/paper-slip/print-v2` — optional `?layout=half`

## Verify

1. Print from virtual slip → chooser appears **on top** (no “Preparing Paper Slip” overlay yet)
2. Confirm layout → then preparing overlay → print sheet
3. Cancel chooser → no print, page unchanged
4. Preference persists on next print open
