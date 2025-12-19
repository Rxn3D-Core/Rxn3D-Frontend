import { getAuthToken } from "@/lib/auth-utils"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"

export interface RetentionOption {
  id: number
  name: string
  image_url: string | null
  status: "Active" | "Inactive"
  is_default: "Yes" | "No"
  sequence: number
  customer_id: number | null
  is_custom: "Yes" | "No"
  price: number | null
  tooth_chart_type: string | null
  selector_shape: string | null
  retentions: any[]
  retentions_count: number
  created_at: string
  updated_at: string
}

export interface RetentionOptionPayload {
  name: string
  image?: string // Base64 encoded image
  image_url?: string // URL to image (alternative to image)
  status?: "Active" | "Inactive"
  is_default?: "Yes" | "No"
  sequence?: number
  customer_id?: number | null
  is_custom?: "Yes" | "No"
  price?: number | null
  tooth_chart_type?: "Implant" | "Prep" | "Pontic" | null
  selector_shape?: string | null
  retentions?: number[] // Array of retention IDs to link
}

export interface RetentionOptionUpdatePayload {
  name?: string
  image?: string
  image_url?: string
  status?: "Active" | "Inactive"
  is_default?: "Yes" | "No"
  sequence?: number
  customer_id?: number | null
  price?: number | null
  tooth_chart_type?: "Implant" | "Prep" | "Pontic" | null
  selector_shape?: string | null
  retentions?: number[]
}

export interface RetentionOptionsListResponse {
  status: boolean
  message: string
  data: {
    data: RetentionOption[]
    pagination: {
      total: number
      per_page: number
      current_page: number
      last_page: number
    }
  }
}

export interface RetentionOptionResponse {
  status: boolean
  message: string
  data: RetentionOption
}

/**
 * Get all retention options with optional filters
 */
export async function getRetentionOptions(filters: {
  q?: string
  status?: "Active" | "Inactive"
  is_custom?: "Yes" | "No"
  customer_id?: number
  per_page?: number
  page?: number
  order_by?: string
  sort_by?: "asc" | "desc"
} = {}): Promise<RetentionOptionsListResponse> {
  const token = getAuthToken()
  
  const params = new URLSearchParams()
  if (filters.q) params.append("q", filters.q)
  if (filters.status) params.append("status", filters.status)
  if (filters.is_custom) params.append("is_custom", filters.is_custom)
  if (filters.customer_id) params.append("customer_id", filters.customer_id.toString())
  if (filters.per_page) params.append("per_page", filters.per_page.toString())
  if (filters.page) params.append("page", filters.page.toString())
  if (filters.order_by) params.append("order_by", filters.order_by)
  if (filters.sort_by) params.append("sort_by", filters.sort_by)

  const response = await fetch(
    `${API_BASE_URL}/library/retention-options?${params.toString()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
    throw new Error("Unauthorized - Redirecting to login")
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to fetch retention options: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get a single retention option by ID
 */
export async function getRetentionOption(id: number): Promise<RetentionOptionResponse> {
  const token = getAuthToken()

  const response = await fetch(
    `${API_BASE_URL}/library/retention-options/${id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
    throw new Error("Unauthorized - Redirecting to login")
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to fetch retention option: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Create a new retention option
 */
export async function createRetentionOption(
  payload: RetentionOptionPayload
): Promise<RetentionOptionResponse> {
  const token = getAuthToken()

  const response = await fetch(
    `${API_BASE_URL}/library/retention-options`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  )

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
    throw new Error("Unauthorized - Redirecting to login")
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to create retention option: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Update an existing retention option
 */
export async function updateRetentionOption(
  id: number,
  payload: RetentionOptionUpdatePayload
): Promise<RetentionOptionResponse> {
  const token = getAuthToken()

  const response = await fetch(
    `${API_BASE_URL}/library/retention-options/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  )

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
    throw new Error("Unauthorized - Redirecting to login")
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to update retention option: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Delete a retention option
 */
export async function deleteRetentionOption(id: number): Promise<{ status: boolean; message: string }> {
  const token = getAuthToken()

  const response = await fetch(
    `${API_BASE_URL}/library/retention-options/${id}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
    throw new Error("Unauthorized - Redirecting to login")
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to delete retention option: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Update retention option status
 */
export async function updateRetentionOptionStatus(
  id: number,
  status: "Active" | "Inactive"
): Promise<RetentionOptionResponse> {
  const token = getAuthToken()

  const response = await fetch(
    `${API_BASE_URL}/library/retention-options/${id}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    }
  )

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
    throw new Error("Unauthorized - Redirecting to login")
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to update retention option status: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get retention options with linked retentions
 */
export async function getRetentionOptionsWithRetentions(filters: {
  q?: string
  status?: "Active" | "Inactive"
  customer_id?: number
  per_page?: number
  page?: number
} = {}): Promise<RetentionOptionsListResponse> {
  const token = getAuthToken()
  
  const params = new URLSearchParams()
  if (filters.q) params.append("q", filters.q)
  if (filters.status) params.append("status", filters.status)
  if (filters.customer_id) params.append("customer_id", filters.customer_id.toString())
  if (filters.per_page) params.append("per_page", filters.per_page.toString())
  if (filters.page) params.append("page", filters.page.toString())

  const response = await fetch(
    `${API_BASE_URL}/library/retention-options/with-retentions?${params.toString()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
    throw new Error("Unauthorized - Redirecting to login")
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to fetch retention options with retentions: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Link retention options with retentions
 */
export async function linkRetentionOptionsWithRetentions(payload: {
  customer_id?: number | null
  retention_options: Array<{
    id: number
    retentions: Array<{
      retention_id: number
      status?: "Active" | "Inactive"
      sequence?: number
    }>
  }>
}): Promise<{ status: boolean; message: string }> {
  const token = getAuthToken()

  const response = await fetch(
    `${API_BASE_URL}/library/retention-options/link-retentions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  )

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
    throw new Error("Unauthorized - Redirecting to login")
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to link retention options with retentions: ${response.statusText}`)
  }

  return response.json()
}

