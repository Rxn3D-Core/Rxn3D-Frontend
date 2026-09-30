# Paper slip: QR / case pan stub inset

**Date:** 2026-10-01

On the v5 half-page print (rotated 90°), the QR + case pan stub sits on the
left of the sheet. That block needed to sit lower (further from the top of the
left strip).

## Change

| Renderer | Adjustment |
| --- | --- |
| **v5 HTML print** | `.ps-stub { padding-left: 50px }` — after `rotate(90deg)`, local left maps to downward on the printed half |
| Paper slip print React | QR + pan row `ml-[50px]` |
| Paper slip print v2 React | QR + pan row `ml-[50px]` |

## Files

- `lib/paper-slip-v5-css.ts` — primary path for case-management / virtual-slip print
- `components/paper-slip-print/paper-slip-print-document.tsx`
- `components/paper-slip-print/paper-slip-print-v2-document.tsx`

## Note

An earlier attempt used `.ps-detach { padding-bottom: 90px }` (wrong axis for
“move down” on the rotated sheet) and was reverted to `padding: 0 0 10px`.
