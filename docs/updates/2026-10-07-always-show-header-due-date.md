# Case Design Center: always show estimated delivery date in header

**Date:** 2026-10-07

## Behavior

| Element | When shown |
| --- | --- |
| **Estimated delivery date** | Always (pre-submit), whenever a date is available or loading |
| **Cut-off warning banner** | Only within **10 minutes before** lab pick-up cut-off (Pacific) |

Previously both were gated on the 10-minute cut-off window.

## Files

- `components/case-design-center/components/PatientHeader.tsx` — due date no longer requires `showCutoffWarning`
- `components/submit-cutoff-banner.tsx` — comment clarified (banner only)
- `docs/updates/2026-10-01-submit-cutoff-header-due-date.md` — behavior table updated
- `docs/updates/2026-10-01-cdc-estimated-due-date-api.md` — display rules updated
