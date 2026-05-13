import { apiClient } from "@/lib/api/client"

export interface StorageTier {
  id: number
  name: string
  storage_gb: number | string
  monthly_fee: number | string
  active: boolean
  stripe_price_id: string | null
  created_at?: string
  updated_at?: string
}

export interface StorageTierPayload {
  name: string
  storage_gb: number | string
  monthly_fee: number | string
  active: boolean
}

export async function listStorageTiers(): Promise<StorageTier[]> {
  const response = await apiClient.get<StorageTier[]>("/billing-config/storage-tiers")
  return Array.isArray(response.data) ? response.data : []
}

export async function getStorageTier(id: number): Promise<StorageTier> {
  const response = await apiClient.get<StorageTier>(`/billing-config/storage-tiers/${id}`)
  return response.data
}

export async function createStorageTier(payload: StorageTierPayload): Promise<StorageTier> {
  const response = await apiClient.post<StorageTier>("/billing-config/storage-tiers", payload)
  return response.data
}

export async function updateStorageTier(id: number, payload: StorageTierPayload): Promise<StorageTier> {
  const response = await apiClient.put<StorageTier>(`/billing-config/storage-tiers/${id}`, payload)
  return response.data
}

export async function deleteStorageTier(id: number): Promise<void> {
  await apiClient.delete(`/billing-config/storage-tiers/${id}`)
}
