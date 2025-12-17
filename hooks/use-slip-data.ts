import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/**
 * Query Keys for slip creation cache management
 */
export const slipDataKeys = {
  all: ['slip-data'] as const,
  connectedOffices: () => [...slipDataKeys.all, 'connected-offices'] as const,
  connectedLabs: () => [...slipDataKeys.all, 'connected-labs'] as const,
  officeDoctors: (officeId: number) => [...slipDataKeys.all, 'office-doctors', officeId] as const,
  labProducts: (labId: number, params?: Record<string, any>) => [...slipDataKeys.all, 'lab-products', labId, params] as const,
  teethShades: () => [...slipDataKeys.all, 'teeth-shades'] as const,
  gumShades: () => [...slipDataKeys.all, 'gum-shades'] as const,
  productImpressions: (productId: number) => [...slipDataKeys.all, 'product-impressions', productId] as const,
  productAddons: (productId: number) => [...slipDataKeys.all, 'product-addons', productId] as const,
}

/**
 * Fetch connected offices or labs based on user role
 */
async function fetchConnectedOfficesOrLabs(params?: { search?: string; sort_by?: string; sort_order?: string }) {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role') || ''

  const endpoint = role === 'lab_admin' ? '/v1/slip/connected-offices' : '/v1/slip/connected-labs'
  const url = new URL(endpoint, API_BASE_URL)

  if (params) {
    Object.entries(params).forEach(([k, v]) => v && url.searchParams.append(k, v))
  }

  const response = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (response.status === 401) {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    throw new Error('Failed to fetch connected offices/labs')
  }

  const json = await response.json()
  return json.data || []
}

/**
 * Fetch office doctors
 */
async function fetchOfficeDoctors(officeId: number) {
  const token = localStorage.getItem('token')
  const url = new URL(`/v1/slip/office/${officeId}/doctors`, API_BASE_URL)

  const response = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (response.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    throw new Error('Failed to fetch office doctors')
  }

  const json = await response.json()
  return json.data || []
}

/**
 * Fetch lab products
 */
async function fetchLabProducts(labId: number, params?: Record<string, any>) {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  let customerId = null
  let effectiveLabId = labId

  if (role === 'office_admin' || role === 'doctor') {
    const storedLabId = localStorage.getItem('selectedLabId')
    if (storedLabId) {
      effectiveLabId = Number(storedLabId)
      customerId = effectiveLabId
    }
  } else if (role === 'lab_admin' || role === 'superadmin') {
    const storedCustomerId = localStorage.getItem('customerId')
    if (storedCustomerId) {
      customerId = parseInt(storedCustomerId, 10)
    }
  }

  const url = new URL('/v1/library/products', API_BASE_URL)

  if (customerId) {
    url.searchParams.append('customer_id', customerId.toString())
  }

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') {
        if (k === 'sort_by') {
          url.searchParams.append('order_by', String(v))
        } else if (k === 'sort_order') {
          url.searchParams.append('sort_by', String(v))
        } else {
          url.searchParams.append(k, String(v))
        }
      }
    })
  }

  const response = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (response.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    throw new Error('Failed to fetch lab products')
  }

  const json = await response.json()
  return json.data?.data || json.data || []
}

/**
 * Fetch teeth shades
 */
async function fetchTeethShades() {
  const token = localStorage.getItem('token')
  const url = new URL('/teeth-shades', API_BASE_URL)

  const response = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    throw new Error('Failed to fetch teeth shades')
  }

  const json = await response.json()
  return json.data || []
}

/**
 * Fetch gum shades
 */
async function fetchGumShades() {
  const token = localStorage.getItem('token')
  const url = new URL('/gum-shades', API_BASE_URL)

  const response = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    throw new Error('Failed to fetch gum shades')
  }

  const json = await response.json()
  return json.data || []
}

/**
 * Hook to fetch and cache connected offices/labs
 *
 * Features:
 * - Automatic caching with 10-minute stale time
 * - Persists to localStorage
 * - Based on user role (lab_admin vs others)
 */
export function useConnectedOfficesOrLabs(params?: { search?: string; sort_by?: string; sort_order?: string }) {
  return useQuery({
    queryKey: params ? slipDataKeys.connectedOffices() : slipDataKeys.connectedLabs(),
    queryFn: () => fetchConnectedOfficesOrLabs(params),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  })
}

/**
 * Hook to fetch and cache office doctors
 *
 * Only fetches when officeId is provided
 */
export function useOfficeDoctors(officeId?: number) {
  return useQuery({
    queryKey: officeId ? slipDataKeys.officeDoctors(officeId) : ['office-doctors-disabled'],
    queryFn: () => fetchOfficeDoctors(officeId!),
    enabled: !!officeId, // Only fetch if officeId exists
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  })
}

/**
 * Hook to fetch and cache lab products
 */
export function useLabProducts(labId?: number, params?: Record<string, any>) {
  return useQuery({
    queryKey: labId ? slipDataKeys.labProducts(labId, params) : ['lab-products-disabled'],
    queryFn: () => fetchLabProducts(labId!, params),
    enabled: !!labId, // Only fetch if labId exists
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  })
}

/**
 * Hook to fetch and cache teeth shades
 *
 * LAZY LOADING: Only fetches when explicitly enabled
 * Use this when user reaches the shade selection step
 */
export function useTeethShades(enabled: boolean = false) {
  return useQuery({
    queryKey: slipDataKeys.teethShades(),
    queryFn: fetchTeethShades,
    enabled, // Only fetch when enabled=true
    staleTime: 1000 * 60 * 30, // 30 minutes (rarely changes)
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  })
}

/**
 * Hook to fetch and cache gum shades
 *
 * LAZY LOADING: Only fetches when explicitly enabled
 * Use this when user reaches the shade selection step
 */
export function useGumShades(enabled: boolean = false) {
  return useQuery({
    queryKey: slipDataKeys.gumShades(),
    queryFn: fetchGumShades,
    enabled, // Only fetch when enabled=true
    staleTime: 1000 * 60 * 30, // 30 minutes (rarely changes)
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  })
}

/**
 * Hook to prefetch shades in the background
 *
 * Call this when modal opens to preload shades before user needs them
 */
export function usePrefetchShades() {
  const queryClient = useQueryClient()

  return () => {
    // Prefetch both shades in parallel
    queryClient.prefetchQuery({
      queryKey: slipDataKeys.teethShades(),
      queryFn: fetchTeethShades,
      staleTime: 1000 * 60 * 30,
    })
    queryClient.prefetchQuery({
      queryKey: slipDataKeys.gumShades(),
      queryFn: fetchGumShades,
      staleTime: 1000 * 60 * 30,
    })
  }
}
