# Virtual slip — desktop canvas, responsive modals

**Date:** 2026-09-20  
**Route:** `/virtual-slip/{caseId}/{slipId}` only

## Goal

- **Main slip layout** stays the desktop design on phone (scaled to fit).
- **Modals / dialogs** stay responsive to the real phone width.

## Approach

1. Keep root viewport as `device-width` (do **not** force `width=1280` on this route).
2. Wrap only the slip page content in `VirtualSlipDesktopViewport`: a fixed **1280px** canvas scaled down with `transform: scale(...)` when the screen is narrower.
3. Portaled modals (Radix Dialog, fixed overlays) render against the real device viewport, so `sm:` / `md:` / `vw` classes work.

## Modal tweaks

- `SlipNotesModal` — phone-friendly width; compose + history stack on small screens.
- `SlipAttachmentBrowserDialog` — **full-screen on phone** with **Upload / Files** tabs; file preview opens as a full overlay with Back; preview controls stack horizontally; file cards use a 2-column grid.
- `CaseActionModal`, `SendCaseBackToOfficeModal` — full-width-with-margin on phone.

## Files

- `app/virtual-slip/[caseId]/[slipId]/layout.tsx`
- `components/virtual-slip/VirtualSlipDesktopViewport.tsx`
- `lib/virtual-slip-desktop-width.ts`
- `components/virtual-slip/SlipNotesModal.tsx`
- `components/slip-attachment-browser-dialog.tsx`
- `components/CaseActionModal.tsx`
- `components/send-case-back-to-office-modal.tsx`
