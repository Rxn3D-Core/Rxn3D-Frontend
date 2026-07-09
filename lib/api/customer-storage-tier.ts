import { apiClient } from "@/lib/api/client"

function unwrapData<T>(raw: unknown): T | null {
  if (raw && typeof raw === "object" && "data" in raw) {
    return ((raw as { data?: T }).data ?? null) as T | null
  }
  return (raw as T) ?? null
}

export interface CustomerStorageTierRecord {
  id: number
  customer_id: number
  billing_storage_tier_id: number
  status?: string | null
  stripe_subscription_id?: string | null
  current_period_start?: string | null
  current_period_end?: string | null
  storageTier?: {
    id: number
    name: string
    storage_gb: number | string
    monthly_fee: number | string
    active?: boolean
  } | null
}

export interface StorageTierCheckoutPayload {
  customer_id: number
  billing_storage_tier_id: number
  success_url: string
  cancel_url: string
}

function unwrapList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === "object" && Array.isArray((raw as { data?: T[] }).data)) {
    return (raw as { data: T[] }).data
  }
  return []
}

export interface CatalogStorageTier {
  id: number
  name: string
  storage_gb: number | string
  monthly_fee: number | string
  active?: boolean
}

/** GET /v1/billing-catalog/storage-tiers?customer_id={id} */
export async function listBillingCatalogStorageTiers(customerId: number): Promise<CatalogStorageTier[]> {
  const response = await apiClient.get<unknown>("/billing-catalog/storage-tiers", {
    params: { customer_id: customerId },
  })
  return unwrapList<CatalogStorageTier>(response.data)
}

/** GET /v1/customer-storage-tier?customer_id={id} */
export async function getCustomerStorageTier(
  customerId: number
): Promise<CustomerStorageTierRecord | null> {
  const response = await apiClient.get<unknown>("/customer-storage-tier", {
    params: { customer_id: customerId },
  })
  return unwrapData<CustomerStorageTierRecord>(response.data)
}

/** POST /v1/customer-storage-tier/{id}/cancel */
export async function cancelCustomerStorageTier(
  customerStorageTierId: number
): Promise<CustomerStorageTierRecord | null> {
  const response = await apiClient.post<unknown>(`/customer-storage-tier/${customerStorageTierId}/cancel`)
  return unwrapData<CustomerStorageTierRecord>(response.data)
}

/** POST /v1/billing-checkout/storage-tier */
export async function createStorageTierCheckoutSession(
  payload: StorageTierCheckoutPayload
): Promise<{ success?: boolean; type?: string; url?: string; message?: string }> {
  const response = await apiClient.post<{
    success?: boolean
    type?: string
    url?: string
    message?: string
  }>("/billing-checkout/storage-tier", payload)
  return response.data
}
