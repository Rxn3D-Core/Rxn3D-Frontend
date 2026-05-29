import { apiClient } from "@/lib/api/client"

function unwrapList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === "object" && Array.isArray((raw as { data?: T[] }).data)) {
    return (raw as { data: T[] }).data
  }
  return []
}

function unwrapData<T>(raw: unknown): T | null {
  if (raw && typeof raw === "object" && "data" in raw) {
    return ((raw as { data?: T }).data ?? null) as T | null
  }
  return (raw as T) ?? null
}

export interface BillingUsage {
  slip_count?: number
  slip_capacity?: number
  credit_used?: number
  overage_count?: number
  period_start?: string
  period_end?: string
  remaining_slips?: number
}

export interface BillingCreditBalance {
  balance?: number
  available_credits?: number
}

export interface SubscriptionInvoice {
  id: number
  invoice_number?: string | null
  amount?: number | string | null
  currency?: string | null
  status?: string | null
  hosted_invoice_url?: string | null
  invoice_pdf?: string | null
  created_at?: string | null
  paid_at?: string | null
}

export interface CatalogAddOn {
  id: number
  name: string
  description?: string
  monthly_fee?: number | string
  active?: boolean
}

export interface CustomerAddOn {
  id: number
  customer_id: number
  billing_add_on_id: number
  status?: string
  add_on?: CatalogAddOn
}

/** GET /v1/billing-usage?customer_id={id} */
export async function getBillingUsage(customerId: number): Promise<BillingUsage | null> {
  const response = await apiClient.get<unknown>("/billing-usage", {
    params: { customer_id: customerId },
  })
  return unwrapData<BillingUsage>(response.data)
}

/** GET /v1/billing-credit-balance?customer_id={id} */
export async function getBillingCreditBalance(
  customerId: number
): Promise<BillingCreditBalance | null> {
  const response = await apiClient.get<unknown>("/billing-credit-balance", {
    params: { customer_id: customerId },
  })
  return unwrapData<BillingCreditBalance>(response.data)
}

/** GET /v1/billing-invoices?customer_id={id} */
export async function listSubscriptionInvoices(
  customerId: number
): Promise<SubscriptionInvoice[]> {
  const response = await apiClient.get<unknown>("/billing-invoices", {
    params: { customer_id: customerId },
  })
  return unwrapList<SubscriptionInvoice>(response.data)
}

/** GET /v1/billing-catalog/add-ons?customer_id={id} */
export async function listBillingCatalogAddOns(
  customerId: number
): Promise<CatalogAddOn[]> {
  const response = await apiClient.get<unknown>("/billing-catalog/add-ons", {
    params: { customer_id: customerId },
  })
  return unwrapList<CatalogAddOn>(response.data)
}

/** GET /v1/customer-add-ons?customer_id={id} */
export async function listCustomerAddOns(customerId: number): Promise<CustomerAddOn[]> {
  const response = await apiClient.get<unknown>("/customer-add-ons", {
    params: { customer_id: customerId },
  })
  return unwrapList<CustomerAddOn>(response.data)
}

export interface AddOnCheckoutPayload {
  customer_id: number
  billing_add_on_id: number
  success_url: string
  cancel_url: string
}

/** POST /v1/billing-checkout/add-on */
export async function createAddOnCheckoutSession(
  payload: AddOnCheckoutPayload
): Promise<{ success?: boolean; url?: string; message?: string }> {
  const response = await apiClient.post<{ success?: boolean; url?: string; message?: string }>(
    "/billing-checkout/add-on",
    payload
  )
  return response.data
}
