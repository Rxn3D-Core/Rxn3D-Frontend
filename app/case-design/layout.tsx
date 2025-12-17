import type React from "react"
import { AuthHeader } from "@/components/auth-header"
import { DriverSlipProvider } from "@/contexts/DriverSlipContext"
import { ProtectedRoute } from "@/components/protected-route"

export default function CaseDesignLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <DriverSlipProvider>
        <div className="flex flex-col w-full min-h-screen max-w-[1920px] mx-auto">
          {children}
        </div>
      </DriverSlipProvider>
    </ProtectedRoute>
  )
}
