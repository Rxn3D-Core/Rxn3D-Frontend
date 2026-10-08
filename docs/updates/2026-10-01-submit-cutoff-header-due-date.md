# Submit slip: cut-off banner + header delivery date

**Date:** 2026-10-01

## Behavior

| Element | When (Pacific Time) | Slip header |
| --- | --- | --- |
| **Estimated delivery date** | Always (pre-submit) | Shown whenever available / loading |
| **Cut-off warning banner** | Within **10 minutes before** cut-off | Amber cut-off banner |
| **Cut-off warning banner** | Outside that 10-minute window | Hidden (including after cut-off) |

> **Updated 2026-10-07:** delivery date is no longer gated on the cut-off window.
> See `2026-10-07-always-show-header-due-date.md`.

Cut-off source: `GET /business-settings?customer_id={labId}` →
`case_schedule.default_pickup_time` (lab “Pick up cut off time”). Optional second
cut-off can be passed as `cutoffTime2` (same formats). Comparison uses
`America/Los_Angeles`, not the user’s PC timezone.

Countdown refreshes every 15 seconds.

## Placement

- Delivery date + conditional banner: **slip header** (`PatientHeader`), right of patient fields
- Product accordion headers do not show a delivery/due date
- Footer no longer shows the cut-off banner

## Files

- `components/submit-cutoff-banner.tsx` — 10-min window helper + banner
- `components/case-design-center/components/PatientHeader.tsx` — delivery date + banner
- `components/case-design-center/hooks/useCaseEstimatedDueDate.ts` — latest delivery date
- `components/case-design-center/CaseDesignCenterTest.tsx` — wires header props
