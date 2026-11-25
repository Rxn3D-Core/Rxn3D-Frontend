import { apiClient } from "@/lib/api/client"
import type { ChargeNowPayload, ProductInvoice } from "@/types/product-invoicing"

/**
 * RXN-127: POST /v1/billing/product-invoices/charge-now (lab admin, product invoicing mode).
 * 201 `{ data: ProductInvoice }` with `is_partial_charge = true`; the arch is marked finished.
 * 422 `{ message }` when the arch is already invoiced or finished, or the lab is not in product mode;
 * the thrown Error carries that message plus `status` and `body` (see `apiClient`).
 */
export async function chargeNow(payload: ChargeNowPayload): Promise<ProductInvoice> {
  const response = await apiClient.post<ProductInvoice>("/billing/product-invoices/charge-now", payload)
  return response.data
}
