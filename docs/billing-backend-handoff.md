# Billing / Charge Management — backend handoff (frontend team)

This document lists **backend** items to verify or implement. The frontend does not ship Laravel changes from this repo.

## Routes & contracts

1. **`GET /billing/statistics`** — Response shape should match what the UI expects (`total_invoices`, `total_amount`, `average_invoice_amount`, `status_breakdown`, etc.). If fields differ, update the frontend types in `lib/redux/api/billingApi.ts` or adjust the API.

2. **`GET /billing/download-pdf/{id}`** — Must return a PDF binary with correct `Content-Type` for blob download. CORS and auth headers must allow the browser to fetch the file with the Bearer token.

3. **`POST /billing/{id}/send-statement-email`** — Body: `email`, optional `template`, `message`, `include_pdf`. Confirm the route uses `{id}` in the path (not only a body field).

4. **`POST /billing/advanced-search`** — Confirm `lab_name` / scoping matches your security model when the frontend passes `lab_name` from the customer profile.

5. **`POST /billing/bulk-action`** — Actions: `mark_checked`, `mark_billed`, `mark_refund`, `refresh_charges`, `send_statement`. Confirm IDs are `slip_billings.id` (billing invoice ids) as documented.

6. **List vs advanced search** — Invoice-level `status` on `GET /billing` vs item-level `item_status` on advanced search: ensure product resources expose whatever the UI must show for line items.

## Optional

- Rate limiting / pagination caps for heavy searches.
- Consistent error JSON: `{ success, message, errors? }` for toasts.
