import { apiClient } from "@/lib/api/client"

export type PlanStatus = "active" | "inactive" | "draft" | "pending"
export type CapacityType = "reset_each_cycle" | "carry_over_unused"
export type LibraryCloneScope = "half" | "full"
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
  library_clone_scope?: LibraryCloneScope
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
  library_clone_scope?: LibraryCloneScope
  feature_limits?: BillingConfigPlanPayload["feature_limits"]
  pricing?: BillingConfigPlanPayload["pricing"]
  trial?: BillingConfigPlanPayload["trial"]
  overage_policy?: BillingConfigPlanPayload["overage_policy"]
  module_ids?: number[]
  enforcement?: BillingConfigPlanPayload["enforcement"]
  updated_at?: string
  pending_version?: PendingVersionSummary | null
  last_publish_notification?: NotificationStats | null
}

// ---- RXN-116 Contract v2: plan versions (staged draft / schedule / publish) ----

export type PlanListStatus = "active" | "draft" | "inactive" | "pending" | "all"
export type SaveMode = "draft" | "publish_now" | "schedule"
export type VersionState = "draft" | "scheduled" | "publishing" | "failed" | "published" | "discarded"
export type FeatureValueType = "boolean" | "integer" | "enum"
export type FeatureValue = boolean | number | string | null

export interface PendingVersionSummary {
  id: number
  state: VersionState
  scheduled_publish_at: string | null
  schedule_timezone: string | null
  last_error: string | null
  updated_at: string
}

export interface NotificationStats {
  state: "skipped_disabled" | "skipped_no_changes" | "sending" | "done"
  labs: number
  addresses: number
  skipped_invalid: number
  sent: number
  failed: number
  queued: number
  failed_addresses?: Array<{ email: string; last_error: string | null }>
}

export interface PlanFeaturePayloadRow {
  feature_key: string
  value: FeatureValue
  is_unlimited: boolean
  included_in_trial: boolean
}

/** Body of plan saves and the stored version payload (Contract v2 "PlanPayload"). Never contains -1. */
export interface PlanPayload {
  name: string
  description?: string | null
  badge_label?: string | null
  display_order?: number | null
  preview_bg_color?: string | null
  capacity_type?: CapacityType
  pricing: BillingConfigPlanPayload["pricing"]
  trial?: {
    enabled: boolean
    trial_days?: number | null
    access_mode?: TrialAccessMode | null
    requires_payment_method?: boolean
  }
  overage_policy?: {
    enabled: boolean
    standard_rate?: number | string | null
    discounted_continuous_rate?: number | string | null
    billing_method?: OverageBillingMethod | null
  }
  enforcement?: BillingConfigPlanPayload["enforcement"]
  features: PlanFeaturePayloadRow[]
}

export interface PlanVersion {
  id: number
  billing_plan_id: number
  state: VersionState
  scheduled_publish_at: string | null
  schedule_timezone: string | null
  publish_attempts: number
  last_error: string | null
  published_at: string | null
  live_changed_since_draft: boolean
  notify_labs: boolean
  notification_stats: NotificationStats | null
  payload: PlanPayload
  updated_at: string
  updated_by?: { id: number; name: string } | null
}

export interface PlanVersionEnvelope {
  live: PlanPayload
  live_status: PlanStatus
  version: PlanVersion | null
}

export interface CatalogFeature {
  key: string
  name: string
  description: string | null
  value_type: FeatureValueType
  enum_options: string[] | null
  supports_unlimited: boolean
  default_value: string | null
  value: FeatureValue
  is_unlimited: boolean
  included_in_trial: boolean
  source: "plan" | "draft" | "default"
  linked_to: string | null
  drift: { column: string; column_value: number | string | null } | null
}

export interface FeatureGroup {
  key: string
  display_order: number
  features: CatalogFeature[]
}

export interface PlanFeatureGroups {
  plan_id: number | null
  total_features: number
  groups: FeatureGroup[]
}

export interface ChangeSummaryItem {
  label: string
  from: string | null
  to: string | null
}

export interface PlanVersionPreview {
  has_customer_visible_changes: boolean
  change_summary: {
    groups: Array<{ key: string; label: string; items: ChangeSummaryItem[] }>
    internal_only: ChangeSummaryItem[]
  }
  recipients: {
    labs: number
    addresses: number
    skipped_invalid: number
    lab_emails?: number
    lab_admins?: number
    duplicates_merged?: number
  }
  email_preview: { subject: string; html: string } | null
}

export interface SaveOptions {
  save_mode: SaveMode
  scheduled_publish_at?: string
  schedule_timezone?: string
  notify_labs?: boolean
  expected_version_updated_at?: string
}

export interface PlanFeatureGroupsQuery {
  plan_id?: number
  source?: "live" | "draft"
  copy_from_plan_id?: number
}

export interface PlanSubscriber {
  id: number
  name: string
  email: string
  status: string
  subscription_status: string
  current_period_end: string | null
}

export async function listBillingConfigPlans(status?: PlanListStatus): Promise<BillingConfigPlan[]> {
  const response = await apiClient.get<BillingConfigPlan[]>(
    "/billing-config/plans",
    status ? { params: { status } } : undefined,
  )
  return Array.isArray(response.data) ? response.data : []
}

export async function getPlanFeatureGroups(query: PlanFeatureGroupsQuery = {}): Promise<PlanFeatureGroups> {
  const response = await apiClient.get<PlanFeatureGroups>("/billing-config/plan-feature-groups", { params: query })
  return response.data
}

export async function getPlanVersion(planId: number): Promise<PlanVersionEnvelope> {
  const response = await apiClient.get<PlanVersionEnvelope>(`/billing-config/plans/${planId}/version`)
  return response.data
}

/** POST /plans with save_mode (Contract v2 §3). */
export async function createPlanWithMode(
  payload: PlanPayload,
  options: SaveOptions,
): Promise<{ plan: BillingConfigPlan; version: PlanVersion | null }> {
  const response = await apiClient.post<{ plan: BillingConfigPlan; version: PlanVersion | null }>(
    "/billing-config/plans",
    { ...payload, ...options },
  )
  return response.data
}

/** PUT /plans/{id}/version: stage, schedule or publish now (Contract v2 §5). */
export async function savePlanVersion(
  planId: number,
  payload: PlanPayload,
  options: SaveOptions,
): Promise<{ plan?: BillingConfigPlan; version: PlanVersion }> {
  const response = await apiClient.put<{ plan?: BillingConfigPlan; version: PlanVersion }>(
    `/billing-config/plans/${planId}/version`,
    { ...payload, ...options },
  )
  return response.data
}

/** POST /plans/{id}/version/preview: writes nothing (Contract v2 §6). */
export async function previewPlanVersion(planId: number, payload: PlanPayload): Promise<PlanVersionPreview> {
  const response = await apiClient.post<PlanVersionPreview>(`/billing-config/plans/${planId}/version/preview`, payload)
  return response.data
}

export async function cancelPlanSchedule(planId: number): Promise<{ version: PlanVersion }> {
  const response = await apiClient.delete<{ version: PlanVersion }>(`/billing-config/plans/${planId}/version/schedule`)
  return response.data
}

export async function discardPlanVersion(planId: number): Promise<{ version: PlanVersion }> {
  const response = await apiClient.delete<{ version: PlanVersion }>(`/billing-config/plans/${planId}/version`)
  return response.data
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

