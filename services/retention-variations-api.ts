import { getAuthToken } from "@/lib/auth-utils"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"

export interface RetentionVariation {
  id: number
  retention_id: number
  name: string
  image_url: string | null
  status: "Active" | "Inactive"
  sequence: number
  is_default: "Yes" | "No"
  created_at: string
  deleted_at: string | null
}

export interface RetentionVariationPayload {
  retention_id: number
  name: string
  image: string // Base64 encoded image
  status?: "Active" | "Inactive"
  sequence?: number
  is_default?: "Yes" | "No"
}

export interface RetentionVariationUpdatePayload {
  name?: string
  image?: string
  status?: "Active" | "Inactive"
  is_default?: "Yes" | "No"
}

export interface RetentionVariationsListResponse {
  status: boolean
  message: string
  data: {
    data: RetentionVariation[]
    pagination: {
      total: number
      per_page: number
      current_page: number
      last_page: number
    }
  }
}

export interface RetentionVariationResponse {
  status: boolean
  message: string
  data: RetentionVariation
}

/**
 * Get all retention variations with optional filters
 */
export async function getRetentionVariations(filters: {
  retention_id?: number
  status?: "Active" | "Inactive"
  is_default?: "Yes" | "No"
  per_page?: number
  order_by?: "name" | "sequence" | "created_at"
  sort_by?: "asc" | "desc"
} = {}): Promise<RetentionVariationsListResponse> {
  const token = getAuthToken()
  
  const params = new URLSearchParams()
  if (filters.retention_id) params.append("retention_id", filters.retention_id.toString())
  if (filters.status) params.append("status", filters.status)
  if (filters.is_default) params.append("is_default", filters.is_default)
  if (filters.per_page) params.append("per_page", filters.per_page.toString())
  if (filters.order_by) params.append("order_by", filters.order_by)
  if (filters.sort_by) params.append("sort_by", filters.sort_by)

  const response = await fetch(
    `${API_BASE_URL}/library/retention-variations?${params.toString()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to fetch retention variations: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get a single retention variation by ID
 */
export async function getRetentionVariation(id: number): Promise<RetentionVariationResponse> {
  const token = getAuthToken()

  const response = await fetch(
    `${API_BASE_URL}/library/retention-variations/${id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to fetch retention variation: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Create a new retention variation
 */
export async function createRetentionVariation(
  payload: RetentionVariationPayload
): Promise<RetentionVariationResponse> {
  const token = getAuthToken()

  const response = await fetch(
    `${API_BASE_URL}/library/retention-variations`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to create retention variation: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Update an existing retention variation
 */
export async function updateRetentionVariation(
  id: number,
  payload: RetentionVariationUpdatePayload
): Promise<RetentionVariationResponse> {
  const token = getAuthToken()

  const response = await fetch(
    `${API_BASE_URL}/library/retention-variations/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to update retention variation: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Delete a retention variation
 */
export async function deleteRetentionVariation(id: number): Promise<{ status: boolean; message: string }> {
  const token = getAuthToken()

  const response = await fetch(
    `${API_BASE_URL}/library/retention-variations/${id}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to delete retention variation: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Convert a file to base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      resolve(result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}




