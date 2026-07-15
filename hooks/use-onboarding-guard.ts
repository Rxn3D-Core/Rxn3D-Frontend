import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useOnboardingStatus } from "@/hooks/use-onboarding-status"

/**
 * Hook to guard routes and redirect to onboarding if user is not onboarded
 * @param options - Configuration options
 * @param options.skipCheck - Skip onboarding check (for superadmin or special cases)
 * @param options.redirectPath - Custom redirect path (optional)
 */
export function useOnboardingGuard(options: {
  skipCheck?: boolean
  redirectPath?: string
} = {}) {
  const { user, isLoading: authLoading, isActingAsLabAdmin } = useAuth()
  const { isOnboardingComplete, isLoading: onboardingLoading, onboardingStatus, error } =
    useOnboardingStatus()
  const router = useRouter()

  useEffect(() => {
    // Wait for auth and onboarding status to load
    if (authLoading || onboardingLoading || !user) return

    // Skip check if explicitly requested (e.g., for superadmin)
    if (options.skipCheck) return

    const userRoles = user.roles || (user.role ? [user.role] : [])
    const isSuperAdmin = !isActingAsLabAdmin && userRoles.includes("superadmin")

    // Skip onboarding check for superadmin
    if (isSuperAdmin) return

    // Get primary customer from user
    let primaryCustomer = null
    if (user.customers && Array.isArray(user.customers) && user.customers.length > 0) {
      primaryCustomer =
        user.customers.find((c: any) => {
          return c?.is_primary === true || c?.is_primary === 1 || c?.is_primary === "1"
        }) || user.customers[0]
    } else if (user.customer) {
      primaryCustomer = user.customer
    }

    // If no customer, skip onboarding check
    if (!primaryCustomer) return
    if (error || onboardingStatus === null) return

    // If custom redirect path is provided, use it
    if (options.redirectPath && !isOnboardingComplete) {
      router.replace(options.redirectPath)
      return
    }

    // If onboarding is not complete, redirect to onboarding flow
    if (!isOnboardingComplete) {
      router.replace("/onboarding/business-hours")
    }
  }, [
    user,
    authLoading,
    onboardingLoading,
    isOnboardingComplete,
    onboardingStatus,
    error,
    router,
    options.skipCheck,
    options.redirectPath,
  ])

  return {
    isLoading: authLoading || onboardingLoading,
    isOnboardingComplete,
    user,
  }
}
