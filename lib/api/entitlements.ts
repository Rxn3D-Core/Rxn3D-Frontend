import { apiClient } from "@/lib/api/client"
import type { EntitlementsPayload } from "@/lib/entitlements"

export async function getEntitlements(labId?: number | null): Promise<EntitlementsPayload> {
  const params = labId ? { lab_id: labId } : undefined
  const response = await apiClient.get<EntitlementsPayload>("/entitlements", { params })
  return response.data
}

export async function updateContinuousCharging(
  profileId: number,
  enabled: boolean,
): Promise<unknown> {
  const response = await apiClient.put(`/billing-profiles/${profileId}/continuous-charging`, {
    continuous_charging_enabled: enabled,
  })
  return response.data
}

export async function checkoutCapacityAddon(payload: {
  customer_id: number
  billing_capacity_addon_id: number
  quantity?: number
  success_url: string
  cancel_url: string
}): Promise<{ url?: string; type?: string }> {
  const response = await apiClient.post<{ url?: string; type?: string }>(
    "/billing-checkout/capacity-addons",
    payload,
  )
  return response.data
}
