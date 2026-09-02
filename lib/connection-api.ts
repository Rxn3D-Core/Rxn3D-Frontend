const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

/** Active lab/office customer id from localStorage (matches set-customer-id / profile switch). */
export function getActiveCustomerId(): number | null {
  if (typeof window === "undefined") return null

  const stored = localStorage.getItem("customerId")
  if (stored) {
    const parsed = Number(stored)
    if (!Number.isNaN(parsed) && parsed > 0) return parsed
  }

  try {
    const selectedLocation = JSON.parse(localStorage.getItem("selectedLocation") || "null")
    const id = selectedLocation?.id
    if (id != null && Number(id) > 0) return Number(id)
  } catch {
    // ignore malformed selectedLocation
  }

  return null
}

export function buildConnectionsUrl(userId?: number): string {
  const params = new URLSearchParams()
  const customerId = getActiveCustomerId()

  if (customerId) {
    params.append("customer_id", customerId.toString())
  }
  if (userId) {
    params.append("user_id", userId.toString())
  }

  const query = params.toString()
  return `${API_BASE_URL}/connections${query ? `?${query}` : ""}`
}
