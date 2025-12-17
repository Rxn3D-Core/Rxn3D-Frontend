"use client"
import { useQuery, useMutation } from '@tanstack/react-query'

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchProductTeethShadesApi(productId?: number) {
  if (!productId) return []
  // Get the correct lab ID based on user role
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null
  const labId = role === 'office_admin' 
    ? (typeof window !== 'undefined' ? localStorage.getItem('selectedLabId') : null)
    : (typeof window !== 'undefined' ? localStorage.getItem('customerId') : null)
  
    const url = new URL(`/slip/lab/${labId}/products/${productId}/teeth-shades`, process.env.NEXT_PUBLIC_API_BASE_URL)
  const res = await fetch(url.toString(), { headers: { ...getAuthHeaders() } })
  if (res.status === 401) throw new Error('Unauthorized access.')
  if (!res.ok) throw await res.json()
  const json = await res.json()
  return json.data || []
}

export async function fetchProductGumShadesApi(productId?: number) {
  if (!productId) return []
  // Get the correct lab ID based on user role
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null
  const labId = role === 'office_admin' 
    ? (typeof window !== 'undefined' ? localStorage.getItem('selectedLabId') : null)
    : (typeof window !== 'undefined' ? localStorage.getItem('customerId') : null)
  
  // Validate labId before making the request
  if (!labId || labId === 'null' || labId === 'undefined') {
    console.warn('fetchProductGumShadesApi - labId is missing or invalid:', labId)
    return []
  }
  
  const url = new URL(`/slip/lab/${labId}/products/${productId}/gum-shades`, process.env.NEXT_PUBLIC_API_BASE_URL)
  const res = await fetch(url.toString(), { headers: { ...getAuthHeaders() } })
  if (res.status === 401) throw new Error('Unauthorized access.')
  if (!res.ok) throw await res.json()
  const json = await res.json()
  return json.data || []
}

export async function fetchProductImpressionsApi(productId?: number) {
  if (!productId) return []
  // Get the correct lab ID based on user role
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null
  const labId = role === 'office_admin' 
    ? (typeof window !== 'undefined' ? localStorage.getItem('selectedLabId') : null)
    : (typeof window !== 'undefined' ? localStorage.getItem('customerId') : null)
  const url = new URL(`/slip/lab/${labId}/products/${productId}/impressions`, process.env.NEXT_PUBLIC_API_BASE_URL)
  const res = await fetch(url.toString(), { headers: { ...getAuthHeaders() } })
  if (res.status === 401) throw new Error('Unauthorized access.')
  if (!res.ok) throw await res.json()
  const json = await res.json()
  return json.data || []
}

export function useProductTeethShades(productId?: number) {
  return useQuery({
    queryKey: ['productTeethShades', productId],
    queryFn: () => fetchProductTeethShadesApi(productId),
    enabled: !!productId,
  })
}

export function useProductGumShades(productId?: number) {
  return useQuery({
    queryKey: ['productGumShades', productId],
    queryFn: () => fetchProductGumShadesApi(productId),
    enabled: !!productId,
  })
}

export function useProductImpressions(productId?: number) {
  return useQuery({
    queryKey: ['productImpressions', productId],
    queryFn: () => fetchProductImpressionsApi(productId),
    enabled: !!productId,
  })
}

export function useCreateSlip() {
  return useMutation({
    mutationFn: async (payload: any) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/slip/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (res.status === 401) throw new Error('Unauthorized access.')
      if (!res.ok) throw json
      return json
    }
  })
}
