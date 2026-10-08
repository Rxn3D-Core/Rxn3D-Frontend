# Charge Management column sorting (2026-09-23)

## Change

Charge Management table headers are sortable for:

- Office Code → `office_code`
- Patient → `patient_name`
- Product → `product_name`
- Grade → `grade_name`
- Stage → `stage_name`
- Due Date → `due_date` (invoice `created_at`; matches the Due Date column)

Default: **`due_date` descending** (same ordering as the previous hard-coded `created_at` desc).

Sort is sent on `GET /billing` and `POST /billing/advanced-search`, and persisted with other Charge Management prefs.

Product/grade/stage sorts use `MIN(...)` over `slip_billing_products` so multi-line invoices stay one row in the list.

## Files

### Frontend
- `app/billing/charge-management/page.tsx`
- `lib/charge-management-preferences.ts`
- `docs/billing-lab-charge-management-apis.md`

### Backend
- `app/Repositories/BillingRepository.php`
- `app/Http/Requests/Billing/ListBillingRequest.php`
- `app/Http/Requests/Billing/AdvancedBillingRequest.php`
