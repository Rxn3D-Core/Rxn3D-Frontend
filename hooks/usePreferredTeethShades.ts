import { useState, useEffect, useCallback, useRef } from 'react'
import { shadeApiService, PreferredTeethShadesResponse, PreferredTeethShadeBrand, PreferredTeethShade } from '@/services/shade-api-service'
import { usePreferredShadeGuideStore } from '@/stores/preferred-shade-guide-store'

interface UsePreferredTeethShadesProps {
  customerId: number
  enabled?: boolean
}

interface UsePreferredTeethShadesReturn {
  data: PreferredTeethShadesResponse | null
  brand: PreferredTeethShadeBrand | null
  shades: PreferredTeethShade[]
  /** True when customer has saved a preferred brand; false when only API fallback applies; undefined before first load */
  hasExplicitPreference: boolean | undefined
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateBrand: (brandId: number) => Promise<void>
}

export function usePreferredTeethShades({ 
  customerId, 
  enabled = true 
}: UsePreferredTeethShadesProps): UsePreferredTeethShadesReturn {
  const [data, setData] = useState<PreferredTeethShadesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isFetchingRef = useRef(false)
  const lastCustomerIdRef = useRef<number | null>(null)

  const dataRef = useRef<PreferredTeethShadesResponse | null>(null)
  
  // Keep ref in sync with state
  useEffect(() => {
    dataRef.current = data
  }, [data])

  const fetchPreferredTeethShades = useCallback(async (options?: { force?: boolean }) => {
    if (isFetchingRef.current && !options?.force) {
      return
    }

    if (!enabled || !customerId) {
      return
    }

    if (
      !options?.force &&
      customerId === lastCustomerIdRef.current &&
      dataRef.current !== null
    ) {
      return
    }

    isFetchingRef.current = true
    lastCustomerIdRef.current = customerId
    setLoading(true)
    setError(null)

    try {
      const response = await shadeApiService.getPreferredTeethShades({ customer_id: customerId })
      setData(response)
      dataRef.current = response
      const explicit = response.data?.has_explicit_preference
      if (typeof explicit === 'boolean') {
        usePreferredShadeGuideStore.getState().setTeethExplicit(explicit)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch preferred teeth shades'
      setError(errorMessage)
      console.error('Error fetching preferred teeth shades:', err)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [customerId, enabled])

  const updateBrand = useCallback(async (brandId: number) => {
    if (!customerId) return

    try {
      await shadeApiService.updatePreferredTeethShadeBrand({
        customer_id: customerId,
        preferred_teeth_shade_brand_id: brandId
      })

      await fetchPreferredTeethShades({ force: true })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferred brand'
      setError(errorMessage)
      console.error('Error updating preferred brand:', err)
      throw err
    }
  }, [customerId, fetchPreferredTeethShades])

  useEffect(() => {
    fetchPreferredTeethShades()
  }, [customerId, enabled, fetchPreferredTeethShades])

  const explicit = data?.data?.has_explicit_preference

  return {
    data,
    brand: data?.data.preferred_brand || null,
    shades: data?.data.shades || [],
    hasExplicitPreference: typeof explicit === 'boolean' ? explicit : undefined,
    loading,
    error,
    refetch: () => fetchPreferredTeethShades({ force: true }),
    updateBrand
  }
}
