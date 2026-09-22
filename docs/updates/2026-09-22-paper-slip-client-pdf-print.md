# Paper slip print — client PDF experiment (reverted)

## Decision

Client-side PDF rasterization (`html2canvas` / `modern-screenshot` / canvas tooth baking) was tried to stabilize Safari/AirPrint page counts. It **could not reliably reproduce tooth-chart images**, which use the same SVG `<pattern>` + `/images/teeth/…` PNGs as the on-screen `VirtualSlipToothChart`.

**Current approach:** print the **same HTML/React slip** the UI renders (full/half layout CSS), via in-place print on Safari/mobile and iframe print on desktop. No PDF rebuild of charts.

## Why PDF failed for charts

- Teeth are SVG pattern fills, not plain `<img>`
- Snapshotting SVG (foreignObject or SVG-as-`<img>`) drops or breaks nested rasters
- Hand-drawing patterns onto canvas still missed overlays / arches

## Files

- `hooks/use-paper-slip-in-page-print-v2.tsx` — HTML print after Full/Half chooser
- `components/paper-slip-print/paper-slip-print-v2-document.tsx` — same components as screen

`lib/paper-slip-print-pdf.ts` and `modern-screenshot` were removed.
