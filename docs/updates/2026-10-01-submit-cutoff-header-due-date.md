# Submit slip: cut-off banner + header delivery date

**Date:** 2026-10-01

## Behavior

| When (Pacific Time) | Slip header |
| --- | --- |
| Within **10 minutes before** cut-off | **Estimated delivery date** + amber cut-off banner |
| Outside that 10-minute window | Nothing (no date, no banner) — including after cut-off |

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
