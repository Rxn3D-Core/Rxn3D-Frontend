# Charge Management pagination (2026-09-23)

## Change

- Charge Management list / advanced search default `per_page` remains **100**.
- UI page-size selector: **100, 200, 300, 500, 1000**.
- Preference is persisted with other Charge Management filters (`perPage` in `lib/charge-management-preferences.ts`).
- Backend validation raised to `per_page` max **1000** on:
  - `ListBillingRequest` (`GET /billing`)
  - `AdvancedBillingRequest` (`POST /billing/advanced-search`)

## Files

- Frontend: `app/billing/charge-management/page.tsx`, `lib/charge-management-preferences.ts`, `docs/billing-lab-charge-management-apis.md`
- Backend: `app/Http/Requests/Billing/ListBillingRequest.php`, `app/Http/Requests/Billing/AdvancedBillingRequest.php`
