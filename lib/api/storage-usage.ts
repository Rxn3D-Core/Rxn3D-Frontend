import { apiClient } from "@/lib/api/client"

function unwrapData<T>(raw: unknown): T | null {
  if (raw && typeof raw === "object" && "data" in raw) {
    return ((raw as { data?: T }).data ?? null) as T | null
  }
  return (raw as T) ?? null
}

export interface StorageUsageStatus {
  used_bytes?: number
  limit_bytes?: number
  used_gb?: number
  limit_gb?: number
  percent_used?: number
  at_warning?: boolean
  at_block?: boolean
  can_upload?: boolean
  grace_days?: number
}

/** GET /v1/storage-usage?customer_id={id} */
export async function getStorageUsageStatus(
  customerId: number
): Promise<StorageUsageStatus | null> {
  const response = await apiClient.get<unknown>("/storage-usage", {
    params: { customer_id: customerId },
  })
  return unwrapData<StorageUsageStatus>(response.data)
}
