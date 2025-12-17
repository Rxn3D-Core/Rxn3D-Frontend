"use client"

import type React from "react"
import React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useOnboardingStatus } from "@/hooks/use-onboarding-status"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isNewUser, user } = useAuth()
  const { isOnboardingComplete, isLoading } = useOnboardingStatus()
  const router = useRouter()
  const pathname = usePathname() || ""
  const hasRedirectedRef = React.useRef(false)

  // Validate onboarding status - redirect if already onboarded (immediate redirect)
  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirectedRef.current) {
      return
    }

    // Wait for loading to complete and user to be available
    if (isLoading || !user) {
      return
    }

    // Check if user is already onboarded
    if (isOnboardingComplete) {
      const isSuperAdmin = user.roles?.includes("superadmin")
      // Don't redirect superadmins - they can access onboarding pages
      if (!isSuperAdmin) {
        // Mark as redirected to prevent loops
        hasRedirectedRef.current = true
        // Immediate redirect to dashboard
        router.replace("/dashboard")
      }
    }
  }, [isLoading, user, isOnboardingComplete, router])

  // Calculate progress based on current path
  const getProgress = () => {
    switch (pathname) {
      case "/onboarding/welcome":
        return 0
      case "/onboarding/lab-profile":
      case "/onboarding/user-profile":
        return 20
      case "/onboarding/business-hours":
        return 40
      case "/onboarding/services":
      case "/onboarding/products":
        return 60
      case "/onboarding/product-grades":
        return 80
      case "/onboarding/attachments":
        return 95
      case "/onboarding/invite-users":
        return 97
      case "/onboarding/completion":
        return 99
      default:
        return 0
    }
  }

  // Don't show progress bar on welcome page
  const showProgress = pathname !== "/onboarding/welcome"

  // Always render children to maintain hook order consistency
  // Show loading overlay instead of early return
  return (
    <div className="min-h-screen bg-[#f2f8ff] relative">
      {isLoading && (
        <div className="absolute inset-0 bg-[#f2f8ff] flex items-center justify-center z-50">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#1162a8]" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      )}
      {children}
    </div>
  )
}
