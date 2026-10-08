# Case listing: keep mixed-arch hold cases in status filters

**Date:** 2026-10-03

## Summary

Lab and office case list views no longer re-filter rows by `slip.status` alone after the API response. Status filtering is server-side and matches slip **or** product status, so a case with one arch on hold and another in progress can appear under both filters.

## Code

- `app/lab-case-management/page.tsx` — removed client status re-filter
- `app/office-case-management/page.tsx` — removed client status re-filter

## Related backend

- `docs/updates/2026-10-03-listing-status-match-product.md` (rxn3d_backend)
