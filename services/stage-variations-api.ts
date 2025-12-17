import { getAuthToken } from "@/lib/auth-utils"
import type { StageVariation, StageVariationPayload, StageVariationUpdatePayload } from "@/contexts/product-stages-context"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"

export interface StageVariationsListResponse {
  status: boolean
  message: string
  data: {
    data: StageVariation[]
    pagination: {
      total: number
      per_page: number
      current_page: number
      last_page: number
    }
  }
}

export interface StageVariationResponse {
  status: boolean
  message: string
  data: StageVariation
}

/**
 * Get all stage variations with optional filters
 */
export async function getStageVariations(filters: {
  stage_id?: number
  status?: "Active" | "Inactive"
  is_default?: "Yes" | "No"
  per_page?: number
  order_by?: "name" | "sequence" | "created_at"
  sort_by?: "asc" | "desc"
} = {}): Promise<StageVariationsListResponse> {
  const token = getAuthToken()
  
  const params = new URLSearchParams()
  if (filters.stage_id) params.append("stage_id", filters.stage_id.toString())
  if (filters.status) params.append("status", filters.status)
  if (filters.is_default) params.append("is_default", filters.is_default)
  if (filters.per_page) params.append("per_page", filters.per_page.toString())
  if (filters.order_by) params.append("order_by", filters.order_by)
  if (filters.sort_by) params.append("sort_by", filters.sort_by)

  const response = await fetch(
    `${API_BASE_URL}/library/stage-variations?${params.toString()}`,
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
    throw new Error(errorData.message || `Failed to fetch stage variations: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get a single stage variation by ID
 */
export async function getStageVariation(id: number): Promise<StageVariationResponse> {
  const token = getAuthToken()

  const response = await fetch(
    `${API_BASE_URL}/library/stage-variations/${id}`,
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
    throw new Error(errorData.message || `Failed to fetch stage variation: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Create a new stage variation
 */
export async function createStageVariation(
  payload: StageVariationPayload
): Promise<StageVariationResponse> {
  const token = getAuthToken()

  const response = await fetch(
    `${API_BASE_URL}/library/stage-variations`,
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
    throw new Error(errorData.message || `Failed to create stage variation: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Update an existing stage variation
 */
export async function updateStageVariation(
  id: number,
  payload: StageVariationUpdatePayload
): Promise<StageVariationResponse> {
  const token = getAuthToken()

  const response = await fetch(
    `${API_BASE_URL}/library/stage-variations/${id}`,
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
    throw new Error(errorData.message || `Failed to update stage variation: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Delete a stage variation
 */
export async function deleteStageVariation(id: number): Promise<{ status: boolean; message: string }> {
  const token = getAuthToken()

  const response = await fetch(
    `${API_BASE_URL}/library/stage-variations/${id}`,
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
    throw new Error(errorData.message || `Failed to delete stage variation: ${response.statusText}`)
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

