import type React from "react"
import { ProtectedRoute } from "@/components/protected-route"

/** Onboarding checks run once from root `app/layout.tsx` (`OnboardingCheck`). Do not duplicate here. */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}
