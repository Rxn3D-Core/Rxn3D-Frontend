# Cancelled cases: hide ready to send on listing

**Date:** 2026-10-08

## Change

Cancelled cases cannot be marked ready to send from the lab case listing (or virtual slip).

## UI

- Listing location click (V2 / V3) no longer opens Ready to Send when status is cancelled.
- Row action visibility hides `readyToSend` for cancelled cases.
- Virtual slip location action hides Ready to Send when the slip is cancelled.

## Related backend

`POST /v1/slip/action/{slipId}/ready-to-send` and invoice generation also reject cancelled slips/cases.
