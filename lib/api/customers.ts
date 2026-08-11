import { apiClient } from "@/lib/api/client"

/** Address fields returned by `GET /customers/{id}` (office or lab). */
export interface CustomerAddressProfile {
  id: number
  name?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  postal_code?: string | null
  state?: string | { id?: number; name?: string | null } | null
  country?: string | { id?: number; name?: string | null } | null
}

/**
 * GET /customers/{customerId} — office or lab customer profile.
 * Statement payloads often omit city/state; this is the source of truth for address parts.
 */
export async function getCustomerProfile(customerId: number): Promise<CustomerAddressProfile> {
  const { data } = await apiClient.get<CustomerAddressProfile>(`/customers/${customerId}`)
  if (!data?.id) {
    throw new Error(`Customer ${customerId} not found`)
  }
  return data
}
