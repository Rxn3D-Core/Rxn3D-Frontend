import { apiClient } from "@/lib/api/client"

export type FeatureCatalogRow = {
  id: number
  key: string
  name: string
  description?: string | null
  feature_group?: string | null
  value_type: string
  enum_options?: string[] | null
  supports_unlimited?: boolean
  default_value?: string | null
  display_order?: number
}

export type PlanFeatureRow = {
  feature_key: string
  value?: string | number | boolean | null
  is_unlimited?: boolean
  included_in_trial?: boolean
}

export type FeatureOverrideRow = {
  id?: number
  feature_key: string
  value?: string | null
  is_unlimited?: boolean
  expires_at?: string | null
  note?: string | null
}

export type CapacityAddon = {
  id: number
  name: string
  addon_type: "office_connection" | "admin_seat" | "user_seat"
  units: number
  monthly_fee: number | string
  active: boolean
  stripe_price_id?: string | null
}

export type CustomerCapacityAddonRow = CapacityAddon & {
  quantity: number
  customer_capacity_addon_id: number | null
  status: string
}

export type TenantTrialPayload = {
  status?: string
  plan_name?: string
  started_at?: string | null
  ends_at?: string | null
  days_remaining?: number
  features?: Array<{ key: string; value: unknown; source: string }>
} | null

export async function listFeatureCatalog(): Promise<FeatureCatalogRow[]> {
  const response = await apiClient.get<FeatureCatalogRow[]>("/billing-config/feature-catalog")
  return Array.isArray(response.data) ? response.data : []
}

export async function getPlanFeatures(planId: number): Promise<PlanFeatureRow[]> {
  const response = await apiClient.get<PlanFeatureRow[]>(`/billing-config/plans/${planId}/features`)
  return Array.isArray(response.data) ? response.data : []
}

export async function updatePlanFeatures(planId: number, features: PlanFeatureRow[]): Promise<PlanFeatureRow[]> {
  const response = await apiClient.put<PlanFeatureRow[]>(`/billing-config/plans/${planId}/features`, { features })
  return Array.isArray(response.data) ? response.data : []
}

export async function listFeatureOverrides(customerId: number): Promise<FeatureOverrideRow[]> {
  const response = await apiClient.get<FeatureOverrideRow[]>(`/billing-config/customers/${customerId}/feature-overrides`)
  return Array.isArray(response.data) ? response.data : []
}

export async function upsertFeatureOverride(
  customerId: number,
  payload: FeatureOverrideRow,
): Promise<FeatureOverrideRow> {
  const response = await apiClient.put<FeatureOverrideRow>(
    `/billing-config/customers/${customerId}/feature-overrides`,
    payload,
  )
  return response.data
}

export async function deleteFeatureOverride(customerId: number, featureKey: string): Promise<void> {
  await apiClient.delete(`/billing-config/customers/${customerId}/feature-overrides/${encodeURIComponent(featureKey)}`)
}

export async function getCustomerTrial(customerId: number): Promise<TenantTrialPayload> {
  const response = await apiClient.get<TenantTrialPayload>(`/billing-config/customers/${customerId}/trial`)
  return response.data ?? null
}

export async function grantCustomerTrial(customerId: number): Promise<TenantTrialPayload> {
  const response = await apiClient.post<TenantTrialPayload>(`/billing-config/customers/${customerId}/trial`)
  return response.data ?? null
}

export async function resetCustomerTrial(customerId: number): Promise<TenantTrialPayload> {
  const response = await apiClient.post<TenantTrialPayload>(`/billing-config/customers/${customerId}/trial/reset`)
  return response.data ?? null
}

export async function listCapacityAddons(): Promise<CapacityAddon[]> {
  const response = await apiClient.get<CapacityAddon[]>("/billing-config/capacity-addons")
  return Array.isArray(response.data) ? response.data : []
}

export async function createCapacityAddon(payload: Omit<CapacityAddon, "id" | "stripe_price_id">): Promise<CapacityAddon> {
  const response = await apiClient.post<CapacityAddon>("/billing-config/capacity-addons", payload)
  return response.data
}

export async function updateCapacityAddon(
  id: number,
  payload: Partial<Omit<CapacityAddon, "id">>,
): Promise<CapacityAddon> {
  const response = await apiClient.put<CapacityAddon>(`/billing-config/capacity-addons/${id}`, payload)
  return response.data
}

export async function deleteCapacityAddon(id: number): Promise<void> {
  await apiClient.delete(`/billing-config/capacity-addons/${id}`)
}

export async function listCustomerCapacityAddons(customerId: number): Promise<CustomerCapacityAddonRow[]> {
  const response = await apiClient.get<CustomerCapacityAddonRow[]>(
    `/billing-config/customers/${customerId}/capacity-addons`,
  )
  return Array.isArray(response.data) ? response.data : []
}

export async function setCustomerCapacityAddonQuantity(
  customerId: number,
  payload: { billing_capacity_addon_id: number; quantity: number },
): Promise<CustomerCapacityAddonRow[]> {
  const response = await apiClient.put<CustomerCapacityAddonRow[]>(
    `/billing-config/customers/${customerId}/capacity-addons`,
    payload,
  )
  return Array.isArray(response.data) ? response.data : []
}
