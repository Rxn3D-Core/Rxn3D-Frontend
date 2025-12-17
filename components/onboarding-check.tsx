"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useOnboardingStatus } from "@/hooks/use-onboarding-status"

export function OnboardingCheck() {
  const { user, isNewUser } = useAuth()
  const { isOnboardingComplete, isLoading } = useOnboardingStatus()
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
    
    // PRIORITY 1: If user is already onboarded and trying to access onboarding pages, redirect to dashboard
    // BUT only if onboarding is truly complete (double-check from user data)
    if (isOnOnboardingPage && isOnboardingComplete && !isSuperAdmin) {
      // Double-check onboarding status from user data
      let primaryCustomer = null
      if (user.customers && Array.isArray(user.customers) && user.customers.length > 0) {
        primaryCustomer = user.customers.find((c: any) => {
          return c?.is_primary === true || c?.is_primary === 1 || c?.is_primary === "1"
        }) || user.customers[0]
      } else if (user.customer) {
        primaryCustomer = user.customer
      }

      const onboardingCompleted = primaryCustomer?.onboarding_completed === true
      const businessHoursCompleted = primaryCustomer?.business_hours_setup_completed === true
      const isOnboardingCompleteFromData = onboardingCompleted && businessHoursCompleted

      // Only redirect to dashboard if onboarding is confirmed complete
      if (isOnboardingCompleteFromData) {
        hasRedirectedRef.current = true
        router.replace("/dashboard")
        return
      }
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
      !isSuperAdmin &&
      (isDifferentCustomer || !customerId)
    ) {
      hasRedirectedRef.current = true
      router.push("/onboarding/business-hours")
    }
  }, [user, isNewUser, isOnboardingComplete, isLoading, router, pathname])

  // Reset redirect flag when onboarding is complete or user changes
  useEffect(() => {
    if (isOnboardingComplete || !isNewUser) {
      hasRedirectedRef.current = false
    }
  }, [isOnboardingComplete, isNewUser])

  return null
}
