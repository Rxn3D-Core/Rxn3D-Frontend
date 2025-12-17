import { useState, useEffect, useCallback } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api"

interface UseCustomerLogoResult {
  logoUrl: string | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook to fetch customer logo from the API
 * @param customerId - The ID of the customer to fetch logo for
 * @param enabled - Whether to fetch the logo (default: true)
 * @returns Object containing logoUrl, isLoading, error, and refetch function
 */
export function useCustomerLogo(
  customerId: number | string | null | undefined,
  enabled: boolean = true
): UseCustomerLogoResult {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLogo = useCallback(async () => {
    if (!customerId || !enabled) {
      setLogoUrl(null)
      return
    }

    // First, check localStorage for cached logo
    const cachedLogoKey = `customerLogo_${customerId}`
    const cachedLogo = localStorage.getItem(cachedLogoKey) || localStorage.getItem("customerLogo")
    
    if (cachedLogo) {
      setLogoUrl(cachedLogo)
      // Still fetch in background to update cache if logo changed
      setIsLoading(true)
    } else {
      setIsLoading(true)
    }

    setError(null)

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("Authentication token not found")
      }

      const response = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized")
        }
        throw new Error(`Failed to fetch customer logo: ${response.status}`)
      }

      const responseData = await response.json()
      const logo = responseData.data?.logo_url || null
      
      // Update state and cache
      setLogoUrl(logo)
      if (logo) {
        localStorage.setItem(cachedLogoKey, logo)
        localStorage.setItem("customerLogo", logo)
      } else {
        // Remove cache if logo is null
        localStorage.removeItem(cachedLogoKey)
        localStorage.removeItem("customerLogo")
      }
    } catch (err: any) {
      console.error("Error fetching customer logo:", err)
      // If we have a cached logo, use it instead of showing error
      if (!cachedLogo) {
        setError(err.message || "Failed to fetch customer logo")
        setLogoUrl(null)
      }
    } finally {
      setIsLoading(false)
    }
  }, [customerId, enabled])

  useEffect(() => {
    // Check localStorage first for immediate display
    if (customerId && enabled) {
      const cachedLogoKey = `customerLogo_${customerId}`
      const cachedLogo = localStorage.getItem(cachedLogoKey) || localStorage.getItem("customerLogo")
      if (cachedLogo) {
        setLogoUrl(cachedLogo)
      }
    }
    
    fetchLogo()
  }, [fetchLogo, customerId, enabled])

  return {
    logoUrl,
    isLoading,
    error,
    refetch: fetchLogo,
  }
}
