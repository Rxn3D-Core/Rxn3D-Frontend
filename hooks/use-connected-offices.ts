import { useQuery } from "@tanstack/react-query"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

/* ------------------------------------------------------------------ */
/*  API response types (match https://api.rxn3d.com/v1/slip/connected-offices) */
/* ------------------------------------------------------------------ */
export interface ConnectedOfficeApiOffice {
  id: number
  name: string
  email: string
  logo_url: string | null
  city: string
  state: string
  country: string
  address: string
  website: string | null
  postal_code: string
}

export interface ConnectedOfficeApiItem {
  id: number
  connected_since: string
  status: string
  office: ConnectedOfficeApiOffice
}

export interface ConnectedOfficesPagination {
  total: number
  per_page: number
  current_page: number
  last_page: number
  from: number
  to: number
}

export interface ConnectedOfficesApiResponse {
  success: boolean
  message: string
  data: ConnectedOfficeApiItem[]
  pagination: ConnectedOfficesPagination
}

/* ------------------------------------------------------------------ */
/*  UI-friendly shape for lab/office cards (id, name, logo, location) */
/* ------------------------------------------------------------------ */
export interface ConnectedOfficeLabShape {
  /** Office id (used for selection and API calls; matches choose-lab) */
  id: number
  name: string
  logo: string | null
  location: string
}

export const connectedOfficesQueryKey = ["connected-offices"] as const

/** Query key for role-based connected list (offices for lab_admin, labs for office_admin) */
export const connectedOfficesOrLabsQueryKey = (role: string | null) =>
  ["connected-offices-or-labs", role] as const

async function fetchConnectedOffices(): Promise<ConnectedOfficesApiResponse> {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("No authentication token found")
  }

  const url = new URL("/v1/slip/connected-offices", API_BASE_URL)
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  if (res.status === 401) {
    window.location.href = "/login"
    throw new Error("Unauthorized")
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch connected offices: ${res.status}`)
  }

  const json = await res.json()
  if (!json.success || !Array.isArray(json.data)) {
    throw new Error(json.message || "Invalid response from connected offices API")
  }
  return json as ConnectedOfficesApiResponse
}

/** Fetch connected labs (for office_admin). Same shape as choose-lab page. */
async function fetchConnectedLabs(): Promise<ConnectedOfficeLabShape[]> {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("No authentication token found")
  }

  const url = new URL("/v1/slip/connected-labs", API_BASE_URL)
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  if (res.status === 401) {
    window.location.href = "/login"
    throw new Error("Unauthorized")
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch connected labs: ${res.status}`)
  }

  const data = await res.json()
  const list = data.data ?? data ?? []
  return list.map((item: Record<string, unknown>) => {
    const lab = (item.lab || item.office || item) as Record<string, unknown>
    const location =
      [lab.city, lab.state, lab.country].filter(Boolean).join(", ") ||
      (lab.location as string) ||
      (item.location as string) ||
      "—"
    return {
      id: (lab.id ?? item.id) as number,
      name: (lab.name ?? item.name ?? "") as string,
      logo: (lab.logo_url ?? lab.logo ?? item.logo ?? lab.image ?? item.image ?? null) as string | null,
      location,
    }
  })
}

function mapToLabShape(item: ConnectedOfficeApiItem): ConnectedOfficeLabShape {
  const { office } = item
  const location = [office.city, office.state, office.country].filter(Boolean).join(", ") || "—"
  return {
    id: office.id,
    name: office.name,
    logo: office.logo_url || null,
    location,
  }
}

/**
 * Fetches connected offices (or labs) from the API for the current user.
 * Uses React Query for caching, retries, and loading/error state.
 *
 * Returns:
 * - data: full API response
 * - officesAsLabs: array shaped for UI (id, name, logo, location) e.g. for wizard lab picker
 */
export function useConnectedOffices(options?: { enabled?: boolean }) {
  const enabled =
    options?.enabled ??
    (typeof window !== "undefined" && !!localStorage.getItem("token"))

  const query = useQuery({
    queryKey: connectedOfficesQueryKey,
    queryFn: fetchConnectedOffices,
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const officesAsLabs: ConnectedOfficeLabShape[] =
    query.data?.data?.map(mapToLabShape) ?? []

  return {
    ...query,
    data: query.data,
    officesAsLabs,
    pagination: query.data?.pagination,
  }
}

/**
 * Fetches connected list based on role (same logic as choose-lab page):
 * - lab_admin → GET /v1/slip/connected-offices (list of offices)
 * - office_admin (and others) → GET /v1/slip/connected-labs (list of labs)
 * Returns a unified shape (id, name, logo, location) for the wizard step.
 */
export function useConnectedOfficesOrLabs(role: string | null, options?: { enabled?: boolean }) {
  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("token")
  const enabled = (options?.enabled ?? true) && hasToken && role != null

  const query = useQuery({
    queryKey: connectedOfficesOrLabsQueryKey(role),
    queryFn: async () => {
      if (role === "lab_admin") {
        const res = await fetchConnectedOffices()
        return res.data.map(mapToLabShape)
      }
      return fetchConnectedLabs()
    },
    enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const officesAsLabs: ConnectedOfficeLabShape[] = query.data ?? []

  return {
    ...query,
    data: query.data,
    officesAsLabs,
  }
}
