import { apiClient } from "@/lib/api/client"

export type StripeMode = "test" | "live"

export interface StripeSettings {
  mode: StripeMode
  publishable_key: string
  secret_key?: string
  webhook_secret?: string
  default_currency: string
  statement_descriptor?: string
  is_active?: boolean
  metadata?: Record<string, unknown>
}

export async function getStripeSettings(mode?: StripeMode): Promise<StripeSettings> {
  const response = await apiClient.get<StripeSettings>("/stripe-settings", {
    params: mode ? { mode } : undefined,
  })
  return response.data
}

export async function upsertStripeSettings(payload: StripeSettings): Promise<StripeSettings> {
  const response = await apiClient.put<StripeSettings>("/stripe-settings", payload)
  return response.data
}

