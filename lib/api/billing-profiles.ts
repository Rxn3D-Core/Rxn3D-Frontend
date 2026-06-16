import { apiClient } from "@/lib/api/client"

export type BillingProfileStatus = "active" | "cancelled" | "suspended" | "past_due" | "trialing"

export interface BillingPlan {
  id: number
  name: string
  description?: string
  badge_label?: string
  status?: string
  monthly_fee?: number
  feature_limits?: {
    slip_capacity: number
    capacity_type: string
    included_storage_gb: number
    max_admin_seats: number
    max_user_seats: number
  }
  pricing?: {
    currency: string
    prices: Array<{
      id?: number
      frequency: string
      price: number | string
      currency?: string
      is_default?: boolean
    }>
  }
}

export interface BillingProfile {
  id: number
  customer_id: number
  billing_plan_id: number
  status: BillingProfileStatus
  stripe_customer_id?: string
  stripe_subscription_id?: string
  current_period_start?: string
  current_period_end?: string
  trial_ends_at?: string | null
  cancelled_at?: string | null
  cancel_at_period_end?: boolean
  usage_count?: number
  created_at?: string
  updated_at?: string
  plan?: BillingPlan
  card_last4?: string
  card_exp_month?: number
  card_exp_year?: number
  card_brand?: string
}

export interface CustomerBillingProfileResponse {
  success: boolean
  has_plan: boolean
  message?: string
  data: BillingProfile | null
}

function unwrapProfileList(raw: unknown): BillingProfile[] {
  if (Array.isArray(raw)) return raw as BillingProfile[]
  if (raw && typeof raw === "object" && Array.isArray((raw as { data?: BillingProfile[] }).data)) {
    return (raw as { data: BillingProfile[] }).data
  }
  if (raw && typeof raw === "object" && "billing_plan_id" in raw) {
    return [raw as BillingProfile]
  }
  return []
}

function pickPrimaryProfile(profiles: BillingProfile[]): BillingProfile | null {
  if (!profiles.length) return null
  const active = profiles.find(
    (p) => p.status === "active" || p.status === "trialing" || p.status === "past_due"
  )
  return active ?? profiles[0]
}

/** GET /v1/billing-profiles?customer_id={id} */
export async function listBillingProfiles(customerId: number): Promise<BillingProfile[]> {
  const response = await apiClient.get<unknown>("/billing-profiles", {
    params: { customer_id: customerId },
  })
  return unwrapProfileList(response.data)
}

/**
 * Fetch the billing profile for a customer.
 * Prefers GET /v1/billing-profiles?customer_id={id}, with fallback to
 * GET /v1/billing-profiles/customer/{customerId} when present.
 */
export async function getCustomerBillingProfile(
  customerId: number
): Promise<CustomerBillingProfileResponse> {
  try {
    const response = await apiClient.get<any>(`/billing-profiles/customer/${customerId}`)
    const raw = response.data

    if (raw && typeof raw === "object" && "has_plan" in raw) {
      return {
        success: raw.success ?? true,
        has_plan: raw.has_plan,
        message: raw.message,
        data: raw.data ?? null,
      }
    }

    if (raw && typeof raw === "object" && "billing_plan_id" in raw) {
      return { success: true, has_plan: true, data: raw as BillingProfile }
    }
  } catch (error: any) {
    if (error?.message?.includes("404")) {
      return {
        success: false,
        has_plan: false,
        message: "Customer not found",
        data: null,
      }
    }
    throw error
  }

  return {
    success: true,
    has_plan: false,
    message: "No billing profile found for this customer.",
    data: null,
  }
}

export interface BillingProfilePayload {
  customer_id?: number
  billing_plan_id: number
  status?: BillingProfileStatus
  current_period_start?: string | null
  current_period_end?: string | null
}

/** POST /v1/billing-profiles */
export async function createBillingProfile(payload: BillingProfilePayload): Promise<BillingProfile> {
  const response = await apiClient.post<BillingProfile>("/billing-profiles", payload)
  return response.data
}

/** PUT /v1/billing-profiles/{id} */
export async function updateBillingProfile(
  profileId: number,
  payload: Partial<BillingProfilePayload>
): Promise<BillingProfile> {
  const response = await apiClient.put<BillingProfile>(`/billing-profiles/${profileId}`, payload)
  return response.data
}

export interface PlanChangePayload {
  billing_plan_id: number
  proration_behavior?: "create_prorations" | "none" | "always_invoice"
  billing_cycle_anchor?: "now" | "unchanged"
}

/** POST /v1/billing-profiles/{id}/upgrade */
export async function upgradeBillingProfile(
  profileId: number,
  payload: PlanChangePayload
): Promise<any> {
  const response = await apiClient.post(`/billing-profiles/${profileId}/upgrade`, payload)
  return response.data
}

/** POST /v1/billing-profiles/{id}/downgrade */
export async function downgradeBillingProfile(
  profileId: number,
  payload: PlanChangePayload
): Promise<any> {
  const response = await apiClient.post(`/billing-profiles/${profileId}/downgrade`, payload)
  return response.data
}

/**
 * Fetch plan details by plan ID from the billing catalog.
 */
export async function getBillingCatalogPlan(
  planId: number,
  customerId?: number
): Promise<any> {
  const response = await apiClient.get<any>(`/billing-catalog/plans/${planId}`, {
    params: customerId ? { customer_id: customerId } : undefined,
  })
  return response.data
}

/** GET /v1/billing-catalog/plans?customer_id={id} */
export async function listBillingCatalogPlans(customerId?: number): Promise<any[]> {
  const response = await apiClient.get<any[]>("/billing-catalog/plans", {
    params: customerId ? { customer_id: customerId } : undefined,
  })
  if (Array.isArray(response.data)) return response.data
  if (response.data && typeof response.data === "object" && Array.isArray((response.data as any).data)) {
    return (response.data as any).data
  }
  return []
}

export interface BillingCheckoutPayload {
  customer_id: number
  billing_plan_id: number
  frequency?: "monthly" | "quarterly" | "semi_annual" | "annual"
  success_url: string
  cancel_url: string
}

export interface BillingCheckoutResponse {
  success: boolean
  type: string
  url: string
}

type BillingPortalResponse = {
  url?: string
  portal_url?: string
  billing_portal_url?: string
  customer_portal_url?: string
  data?: {
    url?: string
    portal_url?: string
    billing_portal_url?: string
    customer_portal_url?: string
  }
}

/**
 * Initiate a Stripe Checkout session for a billing plan.
 * POST /v1/billing-checkout/plan
 */
export async function createBillingCheckoutSession(
  payload: BillingCheckoutPayload
): Promise<BillingCheckoutResponse> {
  const response = await apiClient.post<BillingCheckoutResponse>(
    "/billing-checkout/plan",
    payload
  )
  return response.data
}

/**
 * Cancel an active billing subscription.
 * POST /v1/billing-profiles/{id}/cancel
 */
export async function cancelSubscription(profileId: number): Promise<any> {
  const response = await apiClient.post(`/billing-profiles/${profileId}/cancel`)
  return response.data
}

function extractPortalUrl(payload: BillingPortalResponse | null | undefined): string | null {
  if (!payload) return null
  return (
    payload.url ||
    payload.portal_url ||
    payload.billing_portal_url ||
    payload.customer_portal_url ||
    payload.data?.url ||
    payload.data?.portal_url ||
    payload.data?.billing_portal_url ||
    payload.data?.customer_portal_url ||
    null
  )
}

export async function createBillingPortalSession(
  options: { profileId?: number | null; customerId?: number | null; returnUrl?: string | null }
): Promise<string | null> {
  const customerId = options.customerId ?? null
  const returnUrl = options.returnUrl ?? null

  if (!customerId) return null

  const response = await apiClient.get<BillingPortalResponse>("/billing/customer-portal", {
    params: { customer_id: customerId, ...(returnUrl ? { return_url: returnUrl } : {}) },
  })

  return extractPortalUrl(response.data)
}
