# Case Design Center: estimated delivery date from delivery-date API

**Date:** 2026-10-01

The **slip header** shows **Estimated delivery date** only when within
**10 minutes before** the lab pick-up cut-off (same window as the cut-off
banner). Outside that window, neither the date nor the banner is shown.
Product accordion headers do not show a delivery/due date.

## Display

```
Estimated delivery date: Oct 5, 2026
```

Source: `GET /v1/slip/lab/{labId}/delivery-date` via `useCaseEstimatedDueDate`
(latest across case products). While loading in-window: `Estimating delivery date…`.

## Files

| File | Change |
| --- | --- |
| `components/case-design-center/hooks/useProductEstimatedDueDate.ts` | Query wrapper around `ProductApi.calculateDelivery` |
| `components/case-design-center/hooks/useCaseEstimatedDueDate.ts` | Latest delivery date across product ids |
| `components/submit-cutoff-banner.tsx` | 10-min window helper + banner |
| `components/case-design-center/components/PatientHeader.tsx` | In-window delivery date + banner |
