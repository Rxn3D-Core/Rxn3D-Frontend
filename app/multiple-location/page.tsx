"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import MultipleLocation from "@/components/multiple-location-form"
import { useAuth } from "@/contexts/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { useOnboardingStatus } from "@/hooks/use-onboarding-status"

export default function MultipleLocationPage() {
  const { user, isLoading, setCustomerId } = useAuth()
  const { isOnboardingComplete, isLoading: onboardingLoading } = useOnboardingStatus()
  const router = useRouter()
  const hasHandledSingleLocationRef = useRef(false)

  useEffect(() => {
    // If not loading and no user, redirect to login
    if (!isLoading && !user) {
      router.replace("/login")
    }
  }, [user, isLoading, router])

  // Handle single location case - redirect immediately without showing the component
  useEffect(() => {
    if (!user || isLoading || onboardingLoading || hasHandledSingleLocationRef.current) return

    const customers = user.customers || []
    
    // If user has only one location, handle it here and redirect
    if (customers.length === 1) {
      hasHandledSingleLocationRef.current = true
      const singleLocation = customers[0]
      
      // Set customer ID and redirect
      setCustomerId(singleLocation.id).then(() => {
        localStorage.setItem("selectedLocation", JSON.stringify(singleLocation))
        
        // Check onboarding status before redirecting
        const onboardingCompleted = singleLocation?.onboarding_completed === true
        const businessHoursCompleted = singleLocation?.business_hours_setup_completed === true
        const isOnboardingCompleteFromData = onboardingCompleted && businessHoursCompleted

        if (isOnboardingCompleteFromData || isOnboardingComplete) {
          router.replace("/dashboard")
        } else {
          router.replace("/onboarding/business-hours")
        }
      }).catch((error) => {
        console.error("Failed to set customer ID:", error)
        // Still save location even if API fails
        localStorage.setItem("selectedLocation", JSON.stringify(singleLocation))
        
        // Check onboarding status before redirecting
        const onboardingCompleted = singleLocation?.onboarding_completed === true
        const businessHoursCompleted = singleLocation?.business_hours_setup_completed === true
        const isOnboardingCompleteFromData = onboardingCompleted && businessHoursCompleted

        if (isOnboardingCompleteFromData || isOnboardingComplete) {
          router.replace("/dashboard")
        } else {
          router.replace("/onboarding/business-hours")
        }
      })
    }
  }, [user, isLoading, onboardingLoading, isOnboardingComplete, router, setCustomerId])

  // Check onboarding status and redirect if not complete (only for multiple locations)
  useEffect(() => {
    if (!user || isLoading || onboardingLoading || hasHandledSingleLocationRef.current) return

    const userRoles = user.roles || (user.role ? [user.role] : [])
    const isSuperAdmin = userRoles.includes("superadmin")

    // Skip onboarding check for superadmin
    if (isSuperAdmin) return

    // Get primary customer from user
    let primaryCustomer = null
    if (user.customers && Array.isArray(user.customers) && user.customers.length > 0) {
      primaryCustomer = user.customers.find((c: any) => {
        return c?.is_primary === true || c?.is_primary === 1 || c?.is_primary === "1"
      }) || user.customers[0]
    } else if (user.customer) {
      primaryCustomer = user.customer
    }

    // If no customer, skip onboarding check
    if (!primaryCustomer) return

    // Check onboarding status from customer data
    const onboardingCompleted = primaryCustomer?.onboarding_completed === true
    const businessHoursCompleted = primaryCustomer?.business_hours_setup_completed === true
    const isOnboardingCompleteFromData = onboardingCompleted && businessHoursCompleted

    // If onboarding is not complete, redirect to onboarding flow
    // Always start with business-hours first
    if (!isOnboardingCompleteFromData) {
      router.push("/onboarding/business-hours")
    }
  }, [user, isLoading, onboardingLoading, isOnboardingComplete, router])

  // Show nothing while checking auth or redirecting
  if (isLoading || !user || onboardingLoading) {
    return null
  }

  // Only show the component if user has multiple locations
  const customers = user.customers || []
  if (customers.length <= 1) {
    return null // Will redirect via useEffect above
  }

  return (
    <ProtectedRoute>
      <MultipleLocation />
    </ProtectedRoute>
  )
}
