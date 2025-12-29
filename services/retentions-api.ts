import { getAuthToken } from "@/lib/auth-utils"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"

export interface Retention {
  id: number
  name: string
  code: string
  status: "Active" | "Inactive"
  sequence: number
  customer_id: number | null
  is_custom: "Yes" | "No"
  retention_options?: Array<{
    id: number
    name: string
    image_url: string | null
    status: "Active" | "Inactive"
    sequence: number
    link_id: number | null
    is_lab_specific: boolean
  }>
  retention_options_count?: number
  created_at: string
  updated_at: string
}

export interface RetentionsListResponse {
  status: boolean
  message: string
  data: {
    data: Retention[]
    pagination: {
      total: number
      per_page: number
      current_page: number
      last_page: number
    }
  }
}

/**
 * Get retentions with linked retention options
 */
export async function getRetentionsWithRetentionOptions(filters: {
  q?: string
  status?: "Active" | "Inactive"
  customer_id?: number
  per_page?: number
  page?: number
} = {}): Promise<RetentionsListResponse> {
  const token = getAuthToken()
  
  const params = new URLSearchParams()
  if (filters.q) params.append("q", filters.q)
  if (filters.status) params.append("status", filters.status)
  if (filters.customer_id) params.append("customer_id", filters.customer_id.toString())
  if (filters.per_page) params.append("per_page", filters.per_page.toString())
  if (filters.page) params.append("page", filters.page.toString())

  const response = await fetch(
    `${API_BASE_URL}/library/retentions/with-retention-options?${params.toString()}`,
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
    throw new Error(errorData.message || `Failed to fetch retentions with retention options: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Link retentions with retention options
 */
export async function linkRetentionsWithRetentionOptions(payload: {
  customer_id?: number | null
  retentions: Array<{
    id: number
    retention_options: Array<{
      retention_option_id: number
      status?: "Active" | "Inactive"
      sequence?: number
    }>
  }>
}): Promise<{ status: boolean; message: string }> {
  const token = getAuthToken()

  const response = await fetch(
    `${API_BASE_URL}/library/retentions/link-retention-options`,
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
    throw new Error(errorData.message || `Failed to link retentions with retention options: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get all retentions with optional filters
 */
export async function getRetentions(filters: {
  q?: string
  status?: "Active" | "Inactive"
  customer_id?: number
  per_page?: number
  page?: number
  order_by?: string
  sort_by?: "asc" | "desc"
} = {}): Promise<RetentionsListResponse> {
  const token = getAuthToken()
  
  const params = new URLSearchParams()
  if (filters.q) params.append("q", filters.q)
  if (filters.status) params.append("status", filters.status)
  if (filters.customer_id) params.append("customer_id", filters.customer_id.toString())
  if (filters.per_page) params.append("per_page", filters.per_page.toString())
  if (filters.page) params.append("page", filters.page.toString())
  if (filters.order_by) params.append("order_by", filters.order_by)
  if (filters.sort_by) params.append("sort_by", filters.sort_by)

  const response = await fetch(
    `${API_BASE_URL}/library/retentions?${params.toString()}`,
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
    throw new Error(errorData.message || `Failed to fetch retentions: ${response.statusText}`)
  }

  return response.json()
}





















