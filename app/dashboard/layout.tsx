import type React from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { OnboardingCheck } from "@/components/onboarding-check"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <OnboardingCheck />
      <ProtectedRoute>{children}</ProtectedRoute>
    </>
  )
}
