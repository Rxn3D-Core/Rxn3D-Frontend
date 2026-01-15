import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { OnboardingApiService, OnboardingStatus, OnboardingStatusResponse } from '@/lib/api-onboarding'
import { useAuth } from '@/contexts/auth-context'

// Global cache to share across all hook instances
const globalCache = {
  data: null as OnboardingStatus | null,
  customerId: null as number | null,
  lastFetchTime: 0,
  isFetching: false,
  CACHE_DURATION: 60000, // 60 seconds cache
}

// Debounce timer for API calls
let debounceTimer: NodeJS.Timeout | null = null
const DEBOUNCE_DELAY = 500 // 500ms debounce delay

export interface UseOnboardingStatusReturn {
  onboardingStatus: OnboardingStatus | null
  isOnboardingComplete: boolean
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  markBusinessHoursComplete: () => Promise<void>
}

export function useOnboardingStatus(): UseOnboardingStatusReturn {
  const { user } = useAuth()
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const maxRetries = 3
  const timeoutMs = 10000 // 10 seconds timeout
  const isFetchingRef = useRef(false)
  const lastCustomerIdRef = useRef<number | null>(null)
  const onboardingStatusRef = useRef<OnboardingStatus | null>(null)

  // Get customer_id from user object or localStorage as fallback
  // Use useMemo to stabilize the customerId value
  const customerId = useMemo((): number | null => {
    if (user?.customer_id) {
      return user.customer_id
    }
    // Fallback to localStorage for cases where user object hasn't been updated yet
    if (typeof window !== "undefined") {
      const customerIdFromStorage = localStorage.getItem("customerId")
      if (customerIdFromStorage) {
        const parsedId = parseInt(customerIdFromStorage, 10)
        if (!isNaN(parsedId)) {
          return parsedId
        }
      }
    }
    return null
  }, [user?.customer_id])

  // Keep ref in sync with state
  useEffect(() => {
    onboardingStatusRef.current = onboardingStatus
  }, [onboardingStatus])

  const fetchOnboardingStatus = useCallback(async (retryAttempt = 0, forceRefetch = false): Promise<void> => {
    // Get current customerId from the stable value
    const currentCustomerId = customerId
    
    if (!currentCustomerId) {
      setOnboardingStatus(null)
      setIsLoading(false)
      setError(null) // Clear error if no customer ID
      isFetchingRef.current = false
      lastCustomerIdRef.current = null
      onboardingStatusRef.current = null
      return
    }

    // Check global cache first
    const now = Date.now()
    const timeSinceLastFetch = now - globalCache.lastFetchTime
    const isCacheValid = globalCache.customerId === currentCustomerId && 
                         globalCache.data !== null && 
                         timeSinceLastFetch < globalCache.CACHE_DURATION

    // Use cached data if available and valid
    if (!forceRefetch && retryAttempt === 0 && isCacheValid && globalCache.data) {
      setOnboardingStatus(globalCache.data)
      onboardingStatusRef.current = globalCache.data
      setIsLoading(false)
      return
    }

    // Prevent concurrent fetches unless forced
    if (globalCache.isFetching && !forceRefetch && retryAttempt === 0) {
      // Wait a bit and check cache again
      setTimeout(() => {
        if (globalCache.customerId === currentCustomerId && globalCache.data) {
          setOnboardingStatus(globalCache.data)
          onboardingStatusRef.current = globalCache.data
        }
      }, 100)
      return
    }

    // Mark as fetching in global cache
    globalCache.isFetching = true
    isFetchingRef.current = true
    lastCustomerIdRef.current = currentCustomerId
    setIsLoading(true)
    // Only clear error on first attempt, not retries
    if (retryAttempt === 0) {
      setError(null)
    }

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<OnboardingStatusResponse>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      })

      // Race between API call and timeout
      const response = await Promise.race([
        OnboardingApiService.getOnboardingStatus(currentCustomerId),
        timeoutPromise
      ]) as OnboardingStatusResponse
      
      // Update global cache
      globalCache.data = response.data
      globalCache.customerId = currentCustomerId
      globalCache.lastFetchTime = Date.now()
      globalCache.isFetching = false
      
      setOnboardingStatus(response.data)
      onboardingStatusRef.current = response.data
      setError(null) // Clear error on success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch onboarding status'
      console.error(`Error fetching onboarding status (attempt ${retryAttempt + 1}):`, err)
      
      // Retry logic with exponential backoff (only for network errors, not 4xx or 5xx errors)
      // Don't retry on client errors (4xx) or server errors (5xx)
      const isClientError = errorMessage.includes('401') || 
                           errorMessage.includes('403') || 
                           errorMessage.includes('404') ||
                           errorMessage.includes('400') ||
                           errorMessage.includes('405') ||
                           errorMessage.includes('422')
      const isServerError = errorMessage.includes('500') ||
                           errorMessage.includes('502') ||
                           errorMessage.includes('503') ||
                           errorMessage.includes('504')
      const isRetryableError = !isClientError && 
                               !isServerError &&
                               retryAttempt < maxRetries
      
      if (isRetryableError) {
        const delay = Math.min(1000 * Math.pow(2, retryAttempt), 5000) // Max 5 seconds
        console.log(`Retrying onboarding status fetch in ${delay}ms...`)
        setTimeout(() => {
          fetchOnboardingStatus(retryAttempt + 1, false)
        }, delay)
        return // Don't set error or loading state yet, will retry
      }
      
      // Set error only if we're not retrying
      setError(errorMessage)
      // Don't set status to null on error - keep previous status if available to prevent UI flicker
    } finally {
      // Only set loading to false if we're not retrying
      if (retryAttempt === 0 || retryAttempt >= maxRetries) {
        setIsLoading(false)
        isFetchingRef.current = false
        globalCache.isFetching = false
      }
    }
  }, [customerId]) // Removed onboardingStatus from dependencies to prevent infinite loop

  const markBusinessHoursComplete = useCallback(async () => {
    if (!customerId) return

    try {
      await OnboardingApiService.markBusinessHoursSetupCompleted(customerId)
      // Clear debounce timer and cache before refetching
      if (debounceTimer) {
        clearTimeout(debounceTimer)
        debounceTimer = null
      }
      // Invalidate cache and force refetch
      globalCache.data = null
      globalCache.lastFetchTime = 0
      await fetchOnboardingStatus(0, true)
    } catch (err) {
      console.error('Error marking business hours as complete:', err)
      setError(err instanceof Error ? err.message : 'Failed to mark business hours as complete')
    }
  }, [customerId, fetchOnboardingStatus])

  // Only fetch when customerId changes, not when fetchOnboardingStatus changes
  // Use debounce to prevent multiple rapid calls
  useEffect(() => {
    if (customerId && customerId !== lastCustomerIdRef.current) {
      // Clear any existing debounce timer
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      // Check cache first before debouncing
      const now = Date.now()
      const timeSinceLastFetch = now - globalCache.lastFetchTime
      const isCacheValid = globalCache.customerId === customerId && 
                           globalCache.data !== null && 
                           timeSinceLastFetch < globalCache.CACHE_DURATION

      if (isCacheValid && globalCache.data) {
        // Use cached data immediately, no need to fetch
        setOnboardingStatus(globalCache.data)
        onboardingStatusRef.current = globalCache.data
        return
      }

      // Debounce the API call
      debounceTimer = setTimeout(() => {
        fetchOnboardingStatus(0, false)
      }, DEBOUNCE_DELAY)
    }

    // Cleanup debounce timer on unmount or dependency change
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
        debounceTimer = null
      }
    }
  }, [customerId, fetchOnboardingStatus]) // Include fetchOnboardingStatus but it's stable due to useCallback

  const isOnboardingComplete = onboardingStatus?.onboarding_completed && 
                               onboardingStatus?.business_hours_setup_completed

  return {
    onboardingStatus,
    isOnboardingComplete: !!isOnboardingComplete,
    isLoading,
    error,
    refetch: fetchOnboardingStatus,
    markBusinessHoursComplete
  }
}
