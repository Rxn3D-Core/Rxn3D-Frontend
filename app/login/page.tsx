"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import LoginForm from "@/components/login-form"
import { useAuth } from "@/contexts/auth-context"
import { useOnboardingStatus } from "@/hooks/use-onboarding-status"

export default function LoginPage() {
  const { user, isLoading, setCustomerId } = useAuth()
  const { isOnboardingComplete, isLoading: onboardingLoading } = useOnboardingStatus()
  const router = useRouter()

  useEffect(() => {
    // Don't redirect if still loading
    if (isLoading || onboardingLoading || !user) {
      return
    }

    // Only redirect to dashboard if onboarding is complete
    // The auth-context will handle redirecting to onboarding if not complete
    if (isOnboardingComplete) {
      const userRoles = user.roles || (user.role ? [user.role] : [])
      const isSuperAdmin = userRoles.includes("superadmin")
      const MULTI_LOCATION_ROLES = ["lab_admin", "lab_user", "office_admin", "office_user"]
      const shouldSeeMultiLocation = userRoles.some((role) => MULTI_LOCATION_ROLES.includes(role))
      const customers = user.customers || []
      const hasMultipleLocations = customers.length > 1

      if (isSuperAdmin || shouldSeeMultiLocation) {
        // Only show multiple-location page if there are multiple locations
        if (hasMultipleLocations) {
          router.replace("/multiple-location")
        } else {
          // Single location - set it automatically via API and go to dashboard
          if (customers.length === 1) {
            const singleCustomer = customers[0]
            setCustomerId(singleCustomer.id).then(() => {
              localStorage.setItem("selectedLocation", JSON.stringify(singleCustomer))
              router.replace("/dashboard")
            }).catch((error) => {
              console.error("Failed to set customer ID:", error)
              // Fallback: still set localStorage and redirect
              localStorage.setItem("selectedLocation", JSON.stringify(singleCustomer))
              localStorage.setItem("customerId", singleCustomer.id.toString())
              router.replace("/dashboard")
            })
          } else {
            router.replace("/dashboard")
          }
        }
      } else {
        router.replace("/dashboard")
      }
    }
    // If onboarding is not complete, let auth-context handle the redirect
  }, [user, isLoading, onboardingLoading, isOnboardingComplete, router, setCustomerId])

  // Don't show loading dots - just redirect immediately when user is authenticated
  if (isLoading || user) {
    return null
  }

  return (
    <div className="items-center justify-center">
      <div className="w-full">
        <LoginForm />
      </div>
    </div>
  )
}
