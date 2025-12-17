"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { AuthHeader } from "@/components/auth-header"
import { useOnboardingStatus } from "@/hooks/use-onboarding-status"

export default function CompletePage() {
  const router = useRouter()
  const { setOnboardingComplete, user } = useAuth()
  const { isOnboardingComplete, isLoading: onboardingLoading } = useOnboardingStatus()

  // Validate onboarding status - redirect if already onboarded (but allow completion page)
  useEffect(() => {
    if (!onboardingLoading && user && isOnboardingComplete) {
      const isSuperAdmin = user.roles?.includes("superadmin")
      // Allow completion page to be viewed even if already onboarded
      // But redirect after a short delay to dashboard
      const timer = setTimeout(() => {
        if (!isSuperAdmin) {
          router.replace("/dashboard")
        }
      }, 3000) // Give user 3 seconds to see completion message
      return () => clearTimeout(timer)
    }
  }, [onboardingLoading, user, isOnboardingComplete, router])

  // Mark onboarding as complete
  useEffect(() => {
    // In a real app, you would make an API call to mark onboarding as complete
    localStorage.setItem("onboardingComplete", "true")
    if (setOnboardingComplete) {
      setOnboardingComplete()
    }
  }, [setOnboardingComplete])

  const handleLogin = () => {
    router.replace("/login")
  }

  return (
    <div className="min-h-screen bg-[#f2f8ff] flex flex-col">
        <AuthHeader/>
        {/* Progress bar */}
        <div className="px-6 py-4 bg-white border-b">
        <div className="relative h-1 bg-[#e4e6ef] rounded-full max-w-3xl mx-auto">
          <div className="absolute h-1 w-full bg-[#1162a8] rounded-full"></div>
        </div>
        <div className="text-right max-w-3xl mx-auto mt-1 text-sm">100% complete</div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-4xl w-full bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Log in to your account!</h1>
          <p className="text-gray-600 mb-8">Invite sent! Log in to your account to finish setting up your profile.</p>

          <Button
            onClick={handleLogin}
            className="px-8 py-2 bg-white hover:bg-gray-50 text-blue-600 border-2 border-blue-600"
          >
            Log in
          </Button>
        </div>
      </main>
    </div>
  )
}
