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
}

export interface CustomerBillingProfileResponse {
  success: boolean
  has_plan: boolean
  message?: string
  data: BillingProfile | null
}

/**
 * Fetch the billing profile for a given customer using the dedicated endpoint.
 * GET /v1/billing-profiles/customer/{customerId}
 *
 * Returns the full API response including the `has_plan` boolean
 * so the caller can easily determine the customer's subscription state.
 */
export async function getCustomerBillingProfile(
  customerId: number
): Promise<CustomerBillingProfileResponse> {
  try {
    const response = await apiClient.get<any>(
      `/billing-profiles/customer/${customerId}`
    )

    // The apiClient does `result.data || result`, so we may get:
    //   - The unwrapped `data` field (when data is truthy), OR
    //   - The full response object (when data is null/falsy)
    // We need to normalise to our expected shape.
    let raw = response.data

    // If apiClient returned the full wrapper (has `success` + `has_plan` keys)
    if (raw && typeof raw === "object" && "has_plan" in raw) {
      return {
        success: raw.success ?? true,
        has_plan: raw.has_plan,
        message: raw.message,
        data: raw.data ?? null,
      }
    }

    // If apiClient already unwrapped and gave us the profile object directly
    // (i.e. data was truthy so apiClient returned it)
    if (raw && typeof raw === "object" && "billing_plan_id" in raw) {
      return {
        success: true,
        has_plan: true,
        data: raw as BillingProfile,
      }
    }

    // Fallback: treat as no plan
    return {
      success: true,
      has_plan: false,
      message: "No billing profile found for this customer.",
      data: null,
    }
  } catch (error: any) {
    // 404 = customer not found or no profile
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
}

/**
 * Fetch plan details by plan ID from the billing catalog.
 */
export async function getBillingCatalogPlan(planId: number): Promise<any> {
  const response = await apiClient.get<any>(`/billing-catalog/plans/${planId}`)
  return response.data
}

/**
 * Fetch all available billing catalog plans for display.
 */
export async function listBillingCatalogPlans(): Promise<any[]> {
  const response = await apiClient.get<any[]>("/billing-catalog/plans")
  return Array.isArray(response.data) ? response.data : []
}

export interface BillingCheckoutPayload {
  customer_id: number
  billing_plan_id: number
  frequency: "monthly" | "quarterly" | "semi_annual" | "annual"
  success_url: string
  cancel_url: string
}

export interface BillingCheckoutResponse {
  success: boolean
  type: string
  url: string
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
