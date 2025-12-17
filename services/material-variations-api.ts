import { getAuthToken } from "@/lib/auth-utils"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"

export interface MaterialVariation {
  id: number
  material_id: number
  name: string
  image_url: string | null
  status: "Active" | "Inactive"
  sequence: number
  is_default: "Yes" | "No"
  created_at: string
  deleted_at: string | null
}

export interface MaterialVariationPayload {
  material_id: number
  name: string
  image: string // Base64 encoded image
  status?: "Active" | "Inactive"
  sequence?: number
  is_default?: "Yes" | "No"
}

export interface MaterialVariationUpdatePayload {
  name?: string
  image?: string
  status?: "Active" | "Inactive"
  is_default?: "Yes" | "No"
}

export interface MaterialVariationsListResponse {
  status: boolean
  message: string
  data: {
    data: MaterialVariation[]
    pagination: {
      total: number
      per_page: number
      current_page: number
      last_page: number
    }
  }
}

export interface MaterialVariationResponse {
  status: boolean
  message: string
  data: MaterialVariation
}

/**
 * Get all material variations with optional filters
 */
export async function getMaterialVariations(filters: {
  material_id?: number
  status?: "Active" | "Inactive"
  is_default?: "Yes" | "No"
  per_page?: number
  order_by?: "name" | "sequence" | "created_at"
  sort_by?: "asc" | "desc"
} = {}): Promise<MaterialVariationsListResponse> {
  const token = getAuthToken()
  
  const params = new URLSearchParams()
  if (filters.material_id) params.append("material_id", filters.material_id.toString())
  if (filters.status) params.append("status", filters.status)
  if (filters.is_default) params.append("is_default", filters.is_default)
  if (filters.per_page) params.append("per_page", filters.per_page.toString())
  if (filters.order_by) params.append("order_by", filters.order_by)
  if (filters.sort_by) params.append("sort_by", filters.sort_by)

  const response = await fetch(
    `${API_BASE_URL}/library/material-variations?${params.toString()}`,
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
    throw new Error(errorData.message || `Failed to fetch material variations: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get a single material variation by ID
 */
export async function getMaterialVariation(id: number): Promise<MaterialVariationResponse> {
  const token = getAuthToken()

  const response = await fetch(
    `${API_BASE_URL}/library/material-variations/${id}`,
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
    throw new Error(errorData.message || `Failed to fetch material variation: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Create a new material variation
 */
export async function createMaterialVariation(
  payload: MaterialVariationPayload
): Promise<MaterialVariationResponse> {
  const token = getAuthToken()

  const response = await fetch(
    `${API_BASE_URL}/library/material-variations`,
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
    throw new Error(errorData.message || `Failed to create material variation: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Update an existing material variation
 */
export async function updateMaterialVariation(
  id: number,
  payload: MaterialVariationUpdatePayload
): Promise<MaterialVariationResponse> {
  const token = getAuthToken()

  const response = await fetch(
    `${API_BASE_URL}/library/material-variations/${id}`,
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
    throw new Error(errorData.message || `Failed to update material variation: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Delete a material variation
 */
export async function deleteMaterialVariation(id: number): Promise<{ status: boolean; message: string }> {
  const token = getAuthToken()

  const response = await fetch(
    `${API_BASE_URL}/library/material-variations/${id}`,
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
    throw new Error(errorData.message || `Failed to delete material variation: ${response.statusText}`)
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




