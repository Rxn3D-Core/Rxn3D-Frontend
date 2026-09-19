# Virtual slip URL route

**Date:** 2026-09-19

## Canonical route

```
/virtual-slip/{caseId}/{slipId}
```

Example: `/virtual-slip/99/42`

Built via `buildVirtualSlipPath(caseId, slipId)` in `lib/virtual-slip-routes.ts`.

## Legacy routes

These still work and redirect once the case id is resolved from slip details:

| Old URL | Behavior |
| --- | --- |
| `/virtual-slip/{slipId}` | Client redirect → canonical |
| `/virtual-slip-v2/{slipId}` | Client redirect → canonical |

When `caseId` is unknown at link time, `buildVirtualSlipPath` falls back to `/virtual-slip-v2/{slipId}` so the legacy page can resolve and replace the URL.
