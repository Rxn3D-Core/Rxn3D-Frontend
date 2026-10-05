# Charge Management: View virtual slip opens in new tab (2026-10-05)

## Change

The **View virtual slip** (eye) action on Charge Management now opens the slip in a **new browser tab** via `window.open(..., "_blank", "noopener,noreferrer")` instead of navigating away with `router.push`.

The Charge Management list stays open in the current tab, so scroll-position save on click is no longer needed for this action.

## Files

- `app/billing/charge-management/page.tsx`
