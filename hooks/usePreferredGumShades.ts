import { useState, useEffect, useCallback, useRef } from 'react'
import { shadeApiService, PreferredGumShadesResponse, PreferredGumShadeBrand, PreferredGumShade } from '@/services/shade-api-service'

interface UsePreferredGumShadesProps {
  customerId: number
  enabled?: boolean
}

interface UsePreferredGumShadesReturn {
  data: PreferredGumShadesResponse | null
  brand: PreferredGumShadeBrand | null
  shades: PreferredGumShade[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateBrand: (brandId: number) => Promise<void>
}

export function usePreferredGumShades({ 
  customerId, 
  enabled = true 
}: UsePreferredGumShadesProps): UsePreferredGumShadesReturn {
  const [data, setData] = useState<PreferredGumShadesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isFetchingRef = useRef(false)
  const lastCustomerIdRef = useRef<number | null>(null)

  const dataRef = useRef<PreferredGumShadesResponse | null>(null)
  
  // Keep ref in sync with state
  useEffect(() => {
    dataRef.current = data
  }, [data])

  const fetchPreferredGumShades = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current && customerId === lastCustomerIdRef.current) {
      return
    }
    
    if (!enabled || !customerId) return

    // Skip if customerId hasn't changed and we already have data (use ref to avoid dependency cycle)
    if (customerId === lastCustomerIdRef.current && dataRef.current !== null) {
      return
    }

    isFetchingRef.current = true
    lastCustomerIdRef.current = customerId
    setLoading(true)
    setError(null)

    try {
      const response = await shadeApiService.getPreferredGumShades({ customer_id: customerId })
      setData(response)
      dataRef.current = response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch preferred gum shades'
      setError(errorMessage)
      console.error('Error fetching preferred gum shades:', err)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [customerId, enabled])

  const updateBrand = useCallback(async (brandId: number) => {
    if (!customerId) return

    try {
      await shadeApiService.updatePreferredGumShadeBrand({
        customer_id: customerId,
        preferred_gum_shade_brand_id: brandId
      })
      
      // Refetch data after updating brand
      await fetchPreferredGumShades()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferred brand'
      setError(errorMessage)
      console.error('Error updating preferred brand:', err)
    }
  }, [customerId, fetchPreferredGumShades])

  useEffect(() => {
    fetchPreferredGumShades()
  }, [customerId, enabled, fetchPreferredGumShades])

  return {
    data,
    brand: data?.data.preferred_brand || null,
    shades: data?.data.shades || [],
    loading,
    error,
    refetch: fetchPreferredGumShades,
    updateBrand
  }
}

