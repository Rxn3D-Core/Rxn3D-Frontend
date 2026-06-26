"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import LoginForm from "@/components/login-form"
import { useAuth } from "@/contexts/auth-context"
import { useOnboardingStatus } from "@/hooks/use-onboarding-status"
import { getPostLoginLandingPath } from "@/lib/auth/post-login-landing"

export default function LoginPage() {
  const { user, isLoading, setCustomerId } = useAuth()
  const { isOnboardingComplete, isLoading: onboardingLoading } = useOnboardingStatus()
  const router = useRouter()

  useEffect(() => {
    // Don't redirect if still loading
    if (isLoading || onboardingLoading || !user) {
      return
    }

    // Honor a safe internal ?redirect= target (e.g. returning to an invitation link)
    const redirectTarget = new URLSearchParams(window.location.search).get("redirect")
    if (redirectTarget && redirectTarget.startsWith("/") && !redirectTarget.startsWith("//")) {
      router.replace(redirectTarget)
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
      const landingPath = getPostLoginLandingPath(userRoles)

      if (isSuperAdmin || shouldSeeMultiLocation) {
        // Only show multiple-location page if there are multiple locations
        if (hasMultipleLocations) {
          router.replace("/multiple-location")
        } else {
          // Single location — set via API only if login flow has not already synced it
          if (customers.length === 1) {
            const singleCustomer = customers[0]
            const storedCustomerId = localStorage.getItem("customerId")
            const alreadySynced =
              storedCustomerId === String(singleCustomer.id) &&
              user.customer_id === singleCustomer.id

            if (alreadySynced) {
              if (!localStorage.getItem("selectedLocation")) {
                localStorage.setItem("selectedLocation", JSON.stringify(singleCustomer))
              }
              router.replace(landingPath)
              return
            }

            setCustomerId(singleCustomer.id)
              .then(() => {
                localStorage.setItem("selectedLocation", JSON.stringify(singleCustomer))
                router.replace(landingPath)
              })
              .catch((error) => {
                console.error("Failed to set customer ID:", error)
                localStorage.setItem("selectedLocation", JSON.stringify(singleCustomer))
                localStorage.setItem("customerId", singleCustomer.id.toString())
                router.replace(landingPath)
              })
          } else {
            router.replace(landingPath)
          }
        }
      } else {
        router.replace(landingPath)
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
