# Paper slip print — full page vs half page chooser

## Flow

1. User taps **Print paper slip**
2. Dialog asks **Full page** or **Half page** (last choice remembered in `localStorage`)
3. The same v2 React slip (including `VirtualSlipToothChart` + tooth PNGs) is rendered, then printed as HTML (Safari/mobile: in-place; desktop: iframe)

## Layouts

| Choice | Orientation | Sheet | After print |
| --- | --- | --- | --- |
| **Full page** | Portrait (`@page size: auto`) | 1 slip / Letter sheet | Use as-is |
| **Half page** | Landscape Letter | 2 slips side by side (`5.5" × 8.5"` each) | Cut on dashed center line |

## Tooth charts

Printed with the **same components and image logic as on screen** — no client PDF rebuild of charts (that path dropped tooth images).

## Files

- `lib/paper-slip-print-layout.ts` — type, storage, half-page chunking
- `components/paper-slip-print/paper-slip-print-layout-dialog.tsx` — chooser UI
- `components/paper-slip-print/paper-slip-print-v2-document.tsx` — full/half CSS + DOM
- `components/paper-slip-print/paper-slip-print-v2-page-shell.tsx` — `layout` prop
- `hooks/use-paper-slip-in-page-print-v2.tsx` — ask → HTML print
- `app/paper-slip/print-v2` — optional `?layout=half`

## Verify

1. Print from virtual slip → chooser on top
2. Confirm layout → preparing → print sheet with full tooth images (maxillary + mandibular)
3. Cancel chooser → no print
4. Preference persists on next open
