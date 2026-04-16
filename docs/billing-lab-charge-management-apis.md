# Lab Charge Management — Billing API inventory

Base path: `{NEXT_PUBLIC_API_BASE_URL}/billing` (e.g. `https://api.example.com/v1/billing`).

All routes require `Authorization: Bearer <token>` unless noted.

| # | Method | Path | Purpose |
|---|--------|------|---------|
| 1 | GET | `/billing` | List invoices (filters: `lab_id`, `office_id`, `status`, dates, amounts, sort, pagination) |
| 2 | GET | `/billing/statistics` | Aggregated stats for scoped user |
| 3 | POST | `/billing/advanced-search` | Search with `item_status`, case/product names, `date_range`, etc. |
| 4 | GET | `/billing/{id}` | Single invoice (full detail) |
| 5 | PUT | `/billing/{id}/status` | Update **invoice** status (`pending`, `paid`, `overdue`, `cancelled`) |
| 6 | DELETE | `/billing/{id}` | Soft-delete invoice |
| 7 | POST | `/billing/bulk-action` | Bulk: `mark_checked`, `mark_billed`, `mark_refund`, `refresh_charges`, `send_statement` |
| 8 | GET | `/billing/email-templates` | Email template list |
| 9 | `POST` | `/billing/{id}/generate-pdf` | **Generate** invoice PDF; `data.invoice_pdf` is base64 PDF bytes (decode with `atob` → `Uint8Array` → `Blob`, same pattern as paper slip HTML); optional `data.pdf_url`, `data.download_url` |
| 10 | `GET` | `/billing/download-pdf/{id}` | **Download** PDF bytes (`blob`); `id` is billing invoice id. Use for file download or opening in a new tab via blob URL |
| 11 | POST | `/billing/virtual-statement` | Virtual / HTML statement |
| 12 | POST | `/billing/{id}/send-statement-email` | Send statement email |
| 13 | PUT | `/billing/items/{id}/status` | **Line item** status (`unbilled`, `checked`, `billed`, `paid`, `refund`, `dispute`) |
| 14 | PUT | `/billing/items/{id}/price` | Legacy item price update |
| 15 | PUT | `/billing/products/{id}` | Update billing product (recalc) |
| 16 | PUT | `/billing/{id}/pricing` | **Full invoice pricing** (single transaction); body `products[]`, optional `edit_reason`, `notes` — see backend `FRONTEND_INVOICE_DETAIL_AND_PRICING_API.md` |
| 17 | PUT | `/billing/products/{id}/pricing` | Single line pricing (same field rules as invoice PUT per line) |
| 18 | PUT | `/billing/addons/{id}/price` | Addon price |
| 19 | PUT | `/billing/retentions/{id}/price` | Retention price |
| 20 | PUT | `/billing/advance-fields/{id}/price` | Advance field price |
| 21 | POST | `/billing/items/{id}/notes` | Add notes to item |
| 22 | POST | `/billing/items/{id}/addon` | Add addon to item |
| 23 | GET | `/billing/items/{id}/slip` | Slip details for billing item |

### Where to update prices

| Use case | Endpoint |
|----------|----------|
| Line item amount | `PUT /billing/items/{id}/price` |
| **Whole invoice (preferred in UI)** | `PUT /billing/{id}/pricing` |
| Single product line | `PUT /billing/products/{id}/pricing` |
| Product record (recalc) | `PUT /billing/products/{id}` |
| Addon line | `PUT /billing/addons/{id}/price` |
| Retention line | `PUT /billing/retentions/{id}/price` |
| Advance field line | `PUT /billing/advance-fields/{id}/price` |

### Regenerate invoice (Charge Management UI)

**Slip module** — `POST /slip/{slipId}/regenerate-invoice` (no body). Replaces the current billing row with a newly generated invoice from the slip; manual edits are **not** preserved. See `rxn3d_backend/docs/slip/INVOICE_REGENERATION_API_DOCUMENTATION.md`. Frontend: `useRegenerateSlipInvoiceMutation` in [`lib/redux/api/billingApi.ts`](../lib/redux/api/billingApi.ts), row action (rotate icon) on [`app/billing/charge-management/page.tsx`](../app/billing/charge-management/page.tsx).

### Edit invoice pricing (Charge Management UI)

**Modal** (`EditBillingInvoiceDialog`) loads **`GET /billing/{id}`** (BillingResource). **Save** sends **`PUT /billing/{id}/pricing`** once with `UpdateBillingInvoicePricingBody` (`products` required, min 1 line; optional root `edit_reason` max 500, `notes` max 1000). Each `products[]` line uses **`slip_billing_products.id`** from `data.products[].id`, with optional `base_price`, `material_price`, `teeth_count`, `rush_percentage`, and nested `addons` / `retentions` / `advance_fields` (ids from GET). Server recalculates totals in **one DB transaction**. Canonical contract: `rxn3d_backend/docs/billing/FRONTEND_INVOICE_DETAIL_AND_PRICING_API.md`.

**Estimated line total** (UI hint): subtotal = base + material + sum(addon price×qty) + retentions + advance (price×qty); rush = subtotal × (rush%/100); line total = subtotal + rush.

Optional **`PUT /billing/products/{id}/pricing`** remains in RTK for single-line tools; legacy **`PUT /billing/items/{id}/price`** uses billing **item** ids, not product ids.

### Invoice PDF: view vs download (Charge Management UI)

| Action | API | Frontend behavior |
|--------|-----|-------------------|
| **View** (eye icon) | Same PDF resolution as download (`fetchInvoicePdfBlob`: generate-pdf `invoice_pdf` → blob, else URLs, else `GET /billing/download-pdf/{id}`). PDF is shown in a **modal** with an `<iframe>` (blob URL), not a new tab. **Print** uses the iframe’s `contentWindow.print()`. | `handleViewInvoicePdf`, `lib/open-pdf-from-base64.ts` (`pdfBlobFromBase64`) |
| **Download** (down icon) | Same `fetchInvoicePdfBlob` as view. Save as `{patient}-{invoiceNumber}-{officeName}.pdf` (sanitized). | `handleDownloadPdf` |

**Frontend integration status**

| # | API | RTK / UI |
|---|-----|----------|
| 1 | List `GET /billing` | `useListBillingInvoicesQuery` — main table (standard list) |
| 2 | Statistics `GET /billing/statistics` | `useGetBillingStatisticsQuery` — summary cards |
| 3 | Advanced search `POST /billing/advanced-search` | `useAdvancedBillingSearchMutation` — Advance Filter |
| 4 | Detail `GET /billing/{id}` | `useGetBillingInvoiceByIdQuery` — **Edit invoice pricing** modal (pencil) + any other flows |
| 5 | Bulk `POST /billing/bulk-action` | `useBulkBillingActionMutation` — Mark Checked / Billed / Refund |
| 6 | Generate PDF `POST /billing/{id}/generate-pdf` | `useGenerateBillingPdfMutation` — PDF view (preferred) |
| 7 | Download PDF `GET /billing/download-pdf/{id}` | `useLazyDownloadBillingPdfQuery` — row download + PDF view fallback |
| 8 | Send email `POST /billing/{id}/send-statement-email` | `useSendStatementEmailMutation` — first selected “Send to Office” |
| 9 | Invoice pricing `PUT /billing/{id}/pricing` | `useUpdateBillingInvoicePricingMutation` — **Edit invoice** modal (single save) |
| 10 | Product pricing `PUT /billing/products/{id}/pricing` | `useUpdateBillingProductPricingMutation` — optional single-line updates |
| 11+ | Other price / item mutations | `updateBillingAddonPrice`, etc. — optional fallbacks |

Code: `lib/redux/api/billingApi.ts`, `lib/open-pdf-from-base64.ts`, `components/billing/edit-billing-invoice-dialog.tsx`, `components/ui/dialog.tsx`, page: `app/billing/charge-management/page.tsx`.

**Backend:** Routes under `POST /billing/{id}/generate-pdf`, `POST /billing/{id}/virtual-statement`, `POST /billing/{id}/send-statement-email` match controller `int $id` parameters (updated in `rxn3d_backend/routes/v1/billing.php`).
