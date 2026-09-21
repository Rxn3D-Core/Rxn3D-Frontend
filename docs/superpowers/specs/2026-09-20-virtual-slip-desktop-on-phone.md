# Virtual slip — desktop layout on phone

**Date:** 2026-09-20  
**Route:** `/virtual-slip/{caseId}/{slipId}` only

## Goal

Open the virtual slip on a phone with the **same layout as web** (two arches, header columns, action row) so the design does not collapse on a narrow viewport.

## Approach

1. **Route viewport** — this layout exports `viewport: { width: 1280 }` so full loads (QR / deep link) use a desktop layout width instead of `device-width`.
2. **Client lock** — `VirtualSlipDesktopViewport` sets/restores the viewport meta on enter/leave for in-app navigations, and wraps content in `min-width: 1280px` as a backstop.

Other app routes keep the root `width=device-width` viewport.

## Files

- `app/virtual-slip/[caseId]/[slipId]/layout.tsx`
- `components/virtual-slip/VirtualSlipDesktopViewport.tsx`
- `lib/virtual-slip-desktop-width.ts`
