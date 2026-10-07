# Case Design Center: estimated delivery date from delivery-date API

**Date:** 2026-10-01

The **slip header** always shows **Estimated delivery date** when available
(pre-submit). The cut-off **warning banner** still shows only within
**10 minutes before** the lab pick-up cut-off.
Product accordion headers do not show a delivery/due date.

> **Updated 2026-10-07:** see `2026-10-07-always-show-header-due-date.md`.

## Display

```
Estimated delivery date: Oct 5, 2026
```

Source: `GET /v1/slip/lab/{labId}/delivery-date` via `useCaseEstimatedDueDate`
(latest across case products). While loading: `Estimating delivery date…`.

## Files

| File | Change |
| --- | --- |
| `components/case-design-center/hooks/useProductEstimatedDueDate.ts` | Query wrapper around `ProductApi.calculateDelivery` |
| `components/case-design-center/hooks/useCaseEstimatedDueDate.ts` | Latest delivery date across product ids |
| `components/submit-cutoff-banner.tsx` | 10-min window helper + banner |
| `components/case-design-center/components/PatientHeader.tsx` | Always-on delivery date + conditional banner |
