# Charge Management: restore scroll + filters on browser Back (2026-10-02)

## Problem

Lab opens Charge Management, sets e.g. Custom date (Sep 1 – Oct 1) + Office, opens a slip (eye icon), then uses the browser Back button:

- The list always came back at the top. The page scrolls inside the billing layout's `overflow-auto` container, which the browser does not restore (it only restores window scroll).
- The list could appear unfiltered. On a fresh mount several advanced searches can fire (before connected offices load → no `office_name`; again when the customer profile loads). Responses were applied in arrival order, so an older, broader result could overwrite the correct one.

## Change

- Clicking **View virtual slip** previously saved the list scroll offset to `sessionStorage` (`rxn3d.charge-management.scroll.<customerId>`, per tab) before same-tab navigation.
- On return, the offset is read once and re-applied whenever rows finish rendering, until the user scrolls / clicks / types.
- Advanced search waits for the connected-offices list when an office is selected, so the first request already includes `office_name`.
- Only the latest advanced search response is applied; stale responses (and their error toasts) are ignored.

**Update (2026-10-05):** View virtual slip opens in a new tab, so scroll is no longer saved on that click. Restore-on-return still works if a scroll offset is present in `sessionStorage` from an older session.

No API changes.

## Files

- `app/billing/charge-management/page.tsx`
- `lib/charge-management-preferences.ts`
