"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useOnboardingStatus } from "@/hooks/use-onboarding-status"

export function OnboardingCheck() {
  const { user, isNewUser } = useAuth()
  const { isOnboardingComplete, isLoading, onboardingStatus, error } = useOnboardingStatus()
  const router = useRouter()
  const pathname = usePathname()
  const hasRedirectedRef = useRef(false)

  useEffect(() => {
    // Don't redirect if still loading or no user
    if (!user || isLoading) {
      return
    }

    // Prevent multiple redirects
    if (hasRedirectedRef.current) {
      return
    }

    const isSuperAdmin = user.roles?.includes("superadmin")
    const isOnOnboardingPage = pathname?.startsWith("/onboarding")
    
    // Finished per setup-status API (only)
    if (
      isOnOnboardingPage &&
      !isSuperAdmin &&
      onboardingStatus !== null &&
      !error &&
      isOnboardingComplete
    ) {
      hasRedirectedRef.current = true
      router.replace("/dashboard")
      return
    }

    // Get customerId from localStorage as primary source, fallback to user.customer?.id
    const customerIdFromStorage = typeof window !== "undefined" ? localStorage.getItem("customerId") : null
    const customerId = customerIdFromStorage 
      ? Number(customerIdFromStorage) 
      : (user.customer?.id || user.customer_id || null)
    
    // Check if customer mismatch (only if we have both values to compare)
    const userCustomerId = user.customer?.id || user.customer_id
    const isDifferentCustomer = userCustomerId && customerId && userCustomerId !== customerId

    // If user is on onboarding page but not yet complete, allow them to continue
    // (they might be in the middle of onboarding)
    if (isOnOnboardingPage && !isOnboardingComplete) {
      hasRedirectedRef.current = false
      return
    }

    // PRIORITY 2: Check if user needs onboarding
    // Only redirect if:
    // 1. User is new
    // 2. Onboarding is not complete
    // 3. Not superadmin
    // 4. Either no customerId set, or customer mismatch
    if (
      isNewUser &&
      !isOnboardingComplete &&
      !error &&
      onboardingStatus !== null &&
      !isSuperAdmin &&
      (isDifferentCustomer || !customerId)
    ) {
      hasRedirectedRef.current = true
      router.push("/onboarding/business-hours")
    }
  }, [user, isNewUser, isOnboardingComplete, isLoading, onboardingStatus, error, router, pathname])

  // Reset redirect flag when onboarding is complete or user changes
  useEffect(() => {
    if (isOnboardingComplete || !isNewUser) {
      hasRedirectedRef.current = false
    }
  }, [isOnboardingComplete, isNewUser])

  return null
}
