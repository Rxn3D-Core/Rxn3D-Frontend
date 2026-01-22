const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

export interface DashboardWidget {
  id: string
  title: string
  enabled: boolean
  order: number
}

export interface DashboardSettings {
  role: string
  widgets: DashboardWidget[]
}

/**
 * Get dashboard settings for the authenticated user
 */
export async function getDashboardSettings(customerId?: number | null): Promise<DashboardSettings | null> {
  const token = localStorage.getItem("token") || localStorage.getItem("library_token")
  if (!token) {
    throw new Error("Authentication token not found")
  }

  const queryParams = customerId ? `?customer_id=${customerId}` : ""
  const response = await fetch(`${API_BASE_URL}/dashboard-settings${queryParams}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  if (response.status === 401) {
    window.location.href = "/login"
    throw new Error("Unauthorized")
  }

  if (!response.ok) {
    // If 404, return null (no settings found, use defaults)
    if (response.status === 404) {
      return null
    }
    
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to get dashboard settings: ${response.status}`)
  }

  const result = await response.json()
  
  // If data is null, return null (no settings found)
  if (!result.data) {
    return null
  }

  return result.data as DashboardSettings
}

/**
 * Update dashboard settings for the authenticated user
 */
export async function updateDashboardSettings(settings: DashboardSettings, customerId?: number | null): Promise<DashboardSettings> {
  const token = localStorage.getItem("token") || localStorage.getItem("library_token")
  if (!token) {
    throw new Error("Authentication token not found")
  }

  const payload: any = {
    role: settings.role,
    widgets: settings.widgets,
  }

  if (customerId !== null && customerId !== undefined) {
    payload.customer_id = customerId
  }

  const response = await fetch(`${API_BASE_URL}/dashboard-settings`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (response.status === 401) {
    window.location.href = "/login"
    throw new Error("Unauthorized")
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to update dashboard settings: ${response.status}`)
  }

  const result = await response.json()
  return result.data as DashboardSettings
}
