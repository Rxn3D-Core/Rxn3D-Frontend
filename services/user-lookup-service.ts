const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

export interface UserLookupResult {
  id: number
  uuid: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  image?: string | null
  status: string
  already_linked: boolean
  /** linked = already a member; pending = invite sent; offboarded = soft-removed, can re-invite; none = can invite */
  invitation_status?: "none" | "pending" | "linked" | "offboarded"
}

export interface UserLookupResponse {
  data: UserLookupResult[]
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface CreateUserPrefill {
  first_name?: string
  last_name?: string
  email?: string
}

/** Map invite-search input into create-form fields (email vs name). */
export function parseSearchTermPrefill(term: string): CreateUserPrefill {
  const q = term.trim()
  if (!q) return {}

  // Email-ish (contains @) → fill email only
  if (q.includes("@")) {
    return { email: q }
  }

  const parts = q.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return { first_name: parts[0] }
  }

  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(" "),
  }
}

export async function lookupUsersForInvite(params: {
  q: string
  customerId: number | string
  perPage?: number
}): Promise<UserLookupResult[]> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  if (!token) {
    throw new Error("No authentication token found")
  }

  const searchParams = new URLSearchParams({
    q: params.q.trim(),
    customer_id: String(params.customerId),
    per_page: String(params.perPage ?? 20),
  })

  const response = await fetch(`${API_BASE_URL}/users/lookup?${searchParams.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    let message = "Failed to search users"
    try {
      const errorBody = await response.json()
      message = errorBody?.message || errorBody?.error || message
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }

  const json = (await response.json()) as UserLookupResponse
  return Array.isArray(json?.data) ? json.data : []
}

/** True when an exact email match already exists in the user directory. */
export async function isEmailAlreadyRegistered(
  email: string,
  customerId: number | string,
): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  if (!normalized || !normalized.includes("@")) return false

  const users = await lookupUsersForInvite({
    q: normalized,
    customerId,
    perPage: 20,
  })

  return users.some((user) => user.email?.toLowerCase() === normalized)
}
