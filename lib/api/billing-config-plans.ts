import { apiClient } from "@/lib/api/client"

export type PlanStatus = "active" | "inactive" | "draft" | "pending"
export type CapacityType = "reset_each_cycle" | "carry_over_unused"
export type PriceFrequency = "monthly" | "quarterly" | "semi_annual" | "annual"
export type TrialAccessMode = "full_access" | "feature_limited"
export type OverageBillingMethod = "end_of_cycle" | "real_time"
export type SlipLimitEnforcement = "block_new_case_creation" | "allow_overage_standard_rate" | "warning_only"
export type StorageLimitEnforcement = "block_new_file_upload" | "allow_with_overage_charges" | "warning_only"

export interface BillingConfigPlanPayload {
  name: string
  description?: string
  badge_label?: string
  display_order?: number
  preview_bg_color?: string
  status: PlanStatus
  feature_limits: {
    slip_capacity: number
    capacity_type: CapacityType
    included_storage_gb: number
    max_admin_seats: number
    max_user_seats: number
  }
  pricing: {
    currency: string
    prices: Array<{
      id?: number
      frequency: PriceFrequency
      interval?: string
      interval_count?: number
      price: number | string
      currency?: string
      is_default?: boolean
      stripe_price_id?: string
    }>
  }
  trial?: {
    enabled: boolean
    trial_days?: number
    access_mode?: TrialAccessMode
    requires_payment_method?: boolean
  }
  overage_policy?: {
    enabled: boolean
    standard_rate?: number
    discounted_continuous_rate?: number
    billing_method?: OverageBillingMethod
  }
  module_ids?: number[]
  enforcement?: {
    at_slip_limit?: SlipLimitEnforcement
    at_storage_limit?: StorageLimitEnforcement
    grace_period_days?: number
  }
}

export interface BillingConfigPlan {
  id: number
  name: string
  status: PlanStatus
  description?: string
  badge_label?: string
  display_order?: number
  preview_bg_color?: string
  active_labs_count?: number
  feature_limits?: BillingConfigPlanPayload["feature_limits"]
  pricing?: BillingConfigPlanPayload["pricing"]
  trial?: BillingConfigPlanPayload["trial"]
  overage_policy?: BillingConfigPlanPayload["overage_policy"]
  module_ids?: number[]
  enforcement?: BillingConfigPlanPayload["enforcement"]
}

export interface PlanSubscriber {
  id: number
  name: string
  email: string
  status: string
  subscription_status: string
  current_period_end: string | null
}

export async function listBillingConfigPlans(): Promise<BillingConfigPlan[]> {
  const response = await apiClient.get<BillingConfigPlan[]>("/billing-config/plans")
  return Array.isArray(response.data) ? response.data : []
}

export async function createBillingConfigPlan(payload: BillingConfigPlanPayload): Promise<BillingConfigPlan> {
  const response = await apiClient.post<BillingConfigPlan>("/billing-config/plans", payload)
  return response.data
}

export async function updateBillingConfigPlan(id: number, payload: BillingConfigPlanPayload): Promise<BillingConfigPlan> {
  const response = await apiClient.put<BillingConfigPlan>(`/billing-config/plans/${id}`, payload)
  return response.data
}

export async function deleteBillingConfigPlan(id: number): Promise<void> {
  await apiClient.delete(`/billing-config/plans/${id}`)
}

export async function listPlanSubscribers(planId: number): Promise<PlanSubscriber[]> {
  const response = await apiClient.get<PlanSubscriber[]>(`/billing-config/plans/${planId}/subscribers`)
  return Array.isArray(response.data) ? response.data : []
}

