import { buildApiUrl } from "@/lib/api/client"

export interface TenantBillingPlan {
  id: number
  name: string
  status: string
  monthly_fee: number | null
  slip_capacity: number
  storage_included_gb: number
}

export interface TenantBillingProfile {
  id: number
  status: string
  current_period_start: string | null
  current_period_end: string | null
  plan: TenantBillingPlan | null
}

export interface TenantBillingUsage {
  slip_count: number
  slip_capacity: number
  remaining_slips: number | null
  credit_used: number
  overage_count: number
  period_start: string | null
  period_end: string | null
}

export interface TenantBillingStorage {
  limit_gb: number
  tier_status: string | null
  tier_period_end: string | null
}

export interface TenantBillingOverviewEntry {
  billing_profile: TenantBillingProfile | null
  usage: TenantBillingUsage | null
  storage: TenantBillingStorage
}

export type TenantBillingOverviewMap = Record<number, TenantBillingOverviewEntry>

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") {
    return { "Content-Type": "application/json", Accept: "application/json" }
  }
  const token = localStorage.getItem("token") || localStorage.getItem("library_token")
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function getBatchTenantBillingOverview(
  customerIds: number[],
): Promise<TenantBillingOverviewMap> {
  if (customerIds.length === 0) return {}

  const params = new URLSearchParams()
  customerIds.forEach((id) => params.append("customer_ids[]", String(id)))

  const response = await fetch(buildApiUrl(`/billing-config/tenant-billing-overview?${params.toString()}`), {
    method: "GET",
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login"
    }
    throw new Error(`Batch billing overview failed: ${response.status}`)
  }

  const json = await response.json()
  const raw = (json?.data ?? {}) as Record<string, TenantBillingOverviewEntry>

  // Normalise string keys (JSON) back to number keys
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [Number(k), v]),
  ) as TenantBillingOverviewMap
}
