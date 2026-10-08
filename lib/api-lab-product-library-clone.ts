const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ""

export interface LabProductLibraryCloneStatus {
  id: number
  onboarding_completed?: boolean
  product_library_clone_completed: boolean
  product_library_clone_status: "pending" | "in_progress" | "completed" | "failed" | string
  product_library_clone_started_at?: string | null
  product_library_clone_completed_at?: string | null
  product_library_clone_completed_by?: number | null
  product_library_clone_failed_at?: string | null
  product_library_clone_error?: string | null
}

export interface LabProductLibraryCloneResponse {
  message: string
  data: {
    customer: LabProductLibraryCloneStatus
  }
}

function getBearerToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token") || localStorage.getItem("library_token")
}

export async function postLabCloneProductLibrary(customerId: number): Promise<LabProductLibraryCloneResponse> {
  const token = getBearerToken()
  if (!token) throw new Error("No authentication token found")

  const response = await fetch(`${API_BASE}/labs/clone-product-library`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ customer_id: customerId }),
  })

  const json = await response.json().catch(() => ({}))

  if (!response.ok && response.status !== 202) {
    const msg =
      (typeof json?.error === "string" && json.error) ||
      (typeof json?.message === "string" && json.message) ||
      `HTTP ${response.status}`
    throw new Error(msg)
  }

  return json as LabProductLibraryCloneResponse
}

export async function getLabProductLibraryCloneStatus(
  customerId: number,
): Promise<LabProductLibraryCloneStatus> {
  const token = getBearerToken()
  if (!token) throw new Error("No authentication token found")

  const response = await fetch(`${API_BASE}/labs/product-library-clone-status/${customerId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  })

  const json = await response.json().catch(() => ({}))

  if (!response.ok) {
    const msg =
      (typeof json?.error === "string" && json.error) ||
      (typeof json?.message === "string" && json.message) ||
      `HTTP ${response.status}`
    throw new Error(msg)
  }

  return json.data as LabProductLibraryCloneStatus
}
