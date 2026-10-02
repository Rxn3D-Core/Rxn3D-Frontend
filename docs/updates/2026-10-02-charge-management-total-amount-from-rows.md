# Charge Management Total amount from table rows (2026-10-02)

## Change

When the full filtered result set fits on the current page, **Total amount** and **Average invoice** are derived from the same charge rows shown in the table (sum of Gross, including refund sign), instead of only trusting `GET /billing/statistics`.

If the page is incomplete (pagination), the cards still use the statistics API.

## Why

With multiple line items, invoice-level statistics could disagree with the Gross column (product `total_price`). Single-item views looked correct because both paths returned the same one amount.

## Files

- `app/billing/charge-management/page.tsx`
- `docs/billing-lab-charge-management-apis.md`
