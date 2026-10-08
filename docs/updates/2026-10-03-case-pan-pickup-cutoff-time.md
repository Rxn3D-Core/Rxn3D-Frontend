# Case pan pickup cutoff times (frontend)

## Summary

Labs can set an optional pickup cutoff per case pan (create/edit case pan and lab profile Pick up & Delivery). Slip due/pickup estimates and the create-slip cutoff banner use the case pan cutoff when present, otherwise the lab default.

## Changes

- Case tracking create/edit modal: optional “Pick up cut off time” (clear = lab default)
- Case tracking listing: “Pick up cut off” column (shows time or “Lab default”)
- Lab profile Pick up Options: “Default pick up cut off time” plus editable cutoffs for **all** case pans
- `ProductApi.calculateDelivery` accepts optional `casepanId`; response may include `effective_pickup_cutoff_time`
- CDC header banner uses `effectivePickupCutoffTime` from due-date calc, falling back to `case_schedule.default_pickup_time`
- Virtual / paper / edit slips continue to show stored pickup/due dates from create (backend now writes pan-aware values)

## Notes

- Empty pan cutoff means inherit lab default
- Regular/Rush are only example pan names — any pan can have its own cutoff
