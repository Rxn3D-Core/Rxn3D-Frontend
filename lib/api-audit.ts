const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

export interface AuditUser {
  id: number | null
  name: string
  email: string | null
}

export interface AuditAuditable {
  type: string
  type_label: string
  id: number
}

export interface AuditChange {
  field: string
  old: string | null
  new: string | null
}

export interface AuditEntry {
  id: number
  event: string
  event_label: string
  user: AuditUser
  auditable: AuditAuditable
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  changes: AuditChange[]
  url: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string | null
  created_at_human: string | null
  updated_at: string | null
}

export interface AuditPagination {
  total: number
  per_page: number
  current_page: number
  last_page: number
  from: number | null
  to: number | null
}

export interface AuditListResponse {
  data: AuditEntry[]
  meta: AuditPagination
  links: {
    first: string
    last: string
    prev: string | null
    next: string | null
  }
}

export interface AuditFilters {
  per_page?: number
  page?: number
  search?: string
  user_id?: number
  event?: "created" | "updated" | "deleted" | "restored"
  auditable_type?: string
  auditable_id?: number
  date_from?: string
  date_to?: string
  order_by?: "created_at" | "updated_at" | "id" | "event"
  sort_by?: "asc" | "desc"
}

function getToken(): string {
  const token = localStorage.getItem("token") || localStorage.getItem("library_token")
  if (!token) throw new Error("Authentication token not found")
  return token
}

export async function getAudits(filters: AuditFilters = {}): Promise<AuditListResponse> {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value))
    }
  })

  const response = await fetch(`${API_BASE_URL}/audits?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
  })

  if (response.status === 401) {
    window.location.href = "/login"
    throw new Error("Unauthorized")
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to fetch audits: ${response.status}`)
  }

  return response.json()
}

export async function getCustomerAudits(
  customerId: number,
  filters: Omit<AuditFilters, "auditable_type" | "auditable_id"> = {}
): Promise<AuditListResponse> {
  return getAudits({
    ...filters,
    auditable_type: "Customer",
    auditable_id: customerId,
  })
}
