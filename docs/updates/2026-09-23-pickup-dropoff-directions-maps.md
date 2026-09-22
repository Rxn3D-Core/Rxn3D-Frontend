# Pick up / Drop off: Directions → Google Maps

**Date:** 2026-09-23

## Summary

The Directions icon in the driver Pick up / Drop off modal opens Google Maps using the **destination** lab or office address (where the slip is going), not the current stop.

## Behavior

| Slip location | Maps address |
|---------------|--------------|
| In office ready to pickup | Lab address |
| On route to the lab | Lab address |
| In lab ready to pickup | Office address |
| On route to the office | Office address |

- Uses `lab_address` / `office_address` from scan-qr / pickup-delivery-slips (or virtual slip detail address fields).
- Link format: `https://www.google.com/maps/search/?api=1&query=…`
- If the destination address is missing, the icon stays visible but disabled (no link).

## Files

- `lib/slip-location.ts` — destination + Maps URL helpers
- `lib/virtual-slip-pickup-entry.ts` — carry addresses on delivery rows
- `services/slip.ts` — QR response types
- `components/driver-history-modal.tsx` — Directions link (table + mobile cards)
