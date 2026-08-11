import { apiClient } from "@/lib/api/client"

function unwrapList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === "object" && Array.isArray((raw as { data?: T[] }).data)) {
    return (raw as { data: T[] }).data
  }
  return []
}

export interface CatalogCreditBook {
  id: number
  name: string
  price: number | string
  slip_amount: number | string
  active?: boolean
  stripe_price_id?: string | null
}

export interface CreditBookCheckoutPayload {
  customer_id: number
  billing_credit_book_id: number
  quantity?: number
  success_url: string
  cancel_url: string
}

export interface CreditBookPurchase {
  id: number
  customer_id: number
  billing_credit_book_id: number
  quantity?: number | null
  amount_paid?: number | string | null
  status?: string | null
  created_at?: string | null
  creditBook?: CatalogCreditBook | null
}

/** GET /v1/billing-catalog/credit-books?customer_id={id} */
export async function listBillingCatalogCreditBooks(
  customerId: number
): Promise<CatalogCreditBook[]> {
  const response = await apiClient.get<unknown>("/billing-catalog/credit-books", {
    params: { customer_id: customerId },
  })
  return unwrapList<CatalogCreditBook>(response.data)
}

/** GET /v1/credit-book-purchases?customer_id={id} */
export async function listCreditBookPurchases(
  customerId: number
): Promise<CreditBookPurchase[]> {
  const response = await apiClient.get<unknown>("/credit-book-purchases", {
    params: { customer_id: customerId },
  })
  return unwrapList<CreditBookPurchase>(response.data)
}

/** POST /v1/billing-checkout/credit-book */
export async function createCreditBookCheckoutSession(
  payload: CreditBookCheckoutPayload
): Promise<{ success?: boolean; type?: string; url?: string; message?: string }> {
  const response = await apiClient.post<{
    success?: boolean
    type?: string
    url?: string
    message?: string
  }>("/billing-checkout/credit-book", payload)
  return response.data
}
