"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { Header } from "@/components/header"
import { UnifiedDashboard } from "@/components/dashboard/unified-dashboard"
import { useAuth } from "@/contexts/auth-context"
import { useOnboardingStatus } from "@/hooks/use-onboarding-status"

export default function Dashboard() {
  const router = useRouter()
  const { user, setCustomerId } = useAuth()
  const { isOnboardingComplete, isLoading: onboardingLoading } = useOnboardingStatus()

  const MULTI_LOCATION_ROLES = ["lab_admin", "lab_user", "office_admin", "office_user"]

  // Check onboarding status and redirect if not complete
  const hasRedirectedRef = React.useRef(false)
  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirectedRef.current) {
      return
    }

    if (!user || onboardingLoading) return

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

    // If no customer, skip onboarding check (might be a different user type)
    if (!primaryCustomer) return

    // Check onboarding status from customer data
    const onboardingCompleted = primaryCustomer?.onboarding_completed === true
    const businessHoursCompleted = primaryCustomer?.business_hours_setup_completed === true
    const isOnboardingCompleteFromData = onboardingCompleted && businessHoursCompleted

    // If onboarding is not complete, redirect to onboarding flow
    // Always start with business-hours first
    if (!isOnboardingCompleteFromData) {
      hasRedirectedRef.current = true
      router.push("/onboarding/business-hours")
      return // Don't proceed with multi-location logic if redirecting to onboarding
    }
  }, [user, onboardingLoading, isOnboardingComplete, router])

  useEffect(() => {
    if (user) {
      const userRoles = user.roles || (user.role ? [user.role] : [])
      const shouldSeeMultiLocation = userRoles.some((role) => MULTI_LOCATION_ROLES.includes(role))
  
      if (shouldSeeMultiLocation) {
        const selectedLocation = localStorage.getItem("selectedLocation")
        
        if (!selectedLocation) {
          const customers = user.customers || []
          
          if (customers.length === 1) {
            // Handle single customer case - don't redirect to multi-location
            const singleCustomer = customers[0]
            setCustomerId(singleCustomer.id).then(() => {
              localStorage.setItem("selectedLocation", JSON.stringify(singleCustomer))
            }).catch((error) => {
              console.error("Failed to set customer ID:", error)
              localStorage.setItem("selectedLocation", JSON.stringify(singleCustomer))
            })
          } else if (customers.length > 1) {
            router.replace("/multiple-location")
          }
        }
      }
    }
  }, [user, router, setCustomerId])

  return (
    <div className="flex h-screen bg-[#F9F9F9] overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onNewSlip={() => window.dispatchEvent(new Event("open-dental-slip"))} />
        <div className="flex-1 overflow-auto">
          <UnifiedDashboard />
        </div>
      </div>
    </div>
  )
}
