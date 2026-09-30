# Submit slip: cut-off time banner

**Date:** 2026-09-30  
**Updated:** 2026-10-01 — see `2026-10-01-submit-cutoff-header-due-date.md`

Superseded: banner now lives on the slip header and only appears within
**10 minutes before** cut-off. Outside that window, only the estimated due date
shows (no banner).

## Source of the cut-off time

`GET /business-settings?customer_id={labId}` → `case_schedule.default_pickup_time`
(the "Pick up cut off time" on the lab profile). No new API; the page already
loads this for rush settings. When the lab has no cut-off time, no banner shows.

## Files

- `components/submit-cutoff-banner.tsx`
- `components/case-design-center/components/PatientHeader.tsx`
- `components/case-design-center/CaseDesignCenterTest.tsx`
