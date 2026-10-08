import { apiClient } from "@/lib/api/client"

export type TenantBillingSettings = {
  auto_renew: boolean
  email_notifications_enabled: boolean
  slip_usage_alerts_enabled: boolean
  internal_notes: string | null
}

const DEFAULT_SETTINGS: TenantBillingSettings = {
  auto_renew: true,
  email_notifications_enabled: true,
  slip_usage_alerts_enabled: true,
  internal_notes: null,
}

function normalizeSettings(raw: Partial<TenantBillingSettings> | null | undefined): TenantBillingSettings {
  return {
    auto_renew: raw?.auto_renew ?? DEFAULT_SETTINGS.auto_renew,
    email_notifications_enabled: raw?.email_notifications_enabled ?? DEFAULT_SETTINGS.email_notifications_enabled,
    slip_usage_alerts_enabled: raw?.slip_usage_alerts_enabled ?? DEFAULT_SETTINGS.slip_usage_alerts_enabled,
    internal_notes: raw?.internal_notes ?? null,
  }
}

export async function getCustomerBillingSettings(customerId: number): Promise<TenantBillingSettings> {
  const response = await apiClient.get<TenantBillingSettings>(`/billing-config/customers/${customerId}/billing-settings`)
  return normalizeSettings(response.data)
}

export async function updateCustomerBillingSettings(
  customerId: number,
  payload: Partial<TenantBillingSettings>,
): Promise<TenantBillingSettings> {
  const response = await apiClient.put<TenantBillingSettings>(
    `/billing-config/customers/${customerId}/billing-settings`,
    payload,
  )
  return normalizeSettings(response.data)
}
