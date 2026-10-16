import { apiClient } from "@/lib/api/client"

/** `ga` is shown as Live in the UI. */
export type BetaRolloutStatus = "beta" | "ga"

export interface BetaFeatureRow {
  id: number
  key: string
  name: string
  description: string | null
  rollout_status: BetaRolloutStatus
  is_live?: boolean
  created_at?: string
  updated_at?: string
}

export interface BetaFeaturesIndex {
  features: BetaFeatureRow[]
  beta_users_count: number
}

export interface BetaFeatureUser {
  id: number
  first_name: string
  last_name: string
  email: string
}

export async function listBetaFeatures(): Promise<BetaFeaturesIndex> {
  const { data } = await apiClient.get<BetaFeaturesIndex | BetaFeatureRow[]>("/beta-features")
  // Support both new envelope and legacy array during rollout
  if (Array.isArray(data)) {
    return { features: data, beta_users_count: 0 }
  }
  return {
    features: Array.isArray(data?.features) ? data.features : [],
    beta_users_count: Number(data?.beta_users_count ?? 0),
  }
}

export async function updateBetaFeatureStatus(
  key: string,
  rollout_status: BetaRolloutStatus
): Promise<BetaFeatureRow> {
  const { data } = await apiClient.patch<BetaFeatureRow>(`/beta-features/${encodeURIComponent(key)}`, {
    rollout_status,
  })
  return data
}

export async function listGlobalBetaUsers(): Promise<{ users: BetaFeatureUser[]; count: number }> {
  const { data } = await apiClient.get<{ users: BetaFeatureUser[]; count: number }>(
    "/beta-features/users"
  )
  return {
    users: Array.isArray(data?.users) ? data.users : [],
    count: Number(data?.count ?? 0),
  }
}

export async function syncGlobalBetaUsers(
  userIds: number[]
): Promise<{ users: BetaFeatureUser[]; count: number }> {
  const { data } = await apiClient.put<{ users: BetaFeatureUser[]; count: number }>(
    "/beta-features/users",
    { user_ids: userIds }
  )
  return {
    users: Array.isArray(data?.users) ? data.users : [],
    count: Number(data?.count ?? 0),
  }
}

export interface BetaUserSearchResult {
  id: number
  first_name: string
  last_name: string
  full_name: string
  email: string
  status?: string
}

export async function searchBetaUsers(q: string, perPage = 20): Promise<BetaUserSearchResult[]> {
  const { data } = await apiClient.get<BetaUserSearchResult[]>("/beta-features/users/search", {
    params: { q: q.trim(), per_page: perPage },
  })
  return Array.isArray(data) ? data : []
}

export const BETA_FEATURE_KEYS = {
  rushPolicyOverride: "rush_policy_override",
} as const
