import { apiClient } from "@/lib/api/client"

export interface Addon {
  id: number
  name: string
  monthly_fee: number | string
  config: Record<string, any>
  active: boolean
  stripe_price_id: string | null
  created_at?: string
  updated_at?: string
}

export interface AddonPayload {
  name: string
  monthly_fee: number | string
  config: Record<string, any>
  active: boolean
}

export async function listAddons(): Promise<Addon[]> {
  const response = await apiClient.get<Addon[]>("/billing-config/add-ons")
  return Array.isArray(response.data) ? response.data : []
}

export async function getAddon(id: number): Promise<Addon> {
  const response = await apiClient.get<Addon>(`/billing-config/add-ons/${id}`)
  return response.data
}

export async function createAddon(payload: AddonPayload): Promise<Addon> {
  const response = await apiClient.post<Addon>("/billing-config/add-ons", payload)
  return response.data
}

export async function updateAddon(id: number, payload: AddonPayload): Promise<Addon> {
  const response = await apiClient.put<Addon>(`/billing-config/add-ons/${id}`, payload)
  return response.data
}

export async function deleteAddon(id: number): Promise<void> {
  await apiClient.delete(`/billing-config/add-ons/${id}`)
}
