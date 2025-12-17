import type React from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { DriverSlipProvider } from "@/contexts/DriverSlipContext"

export default function AddSlipLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <DriverSlipProvider>
        <div className="w-full h-screen overflow-hidden bg-background">
          {children}
        </div>
      </DriverSlipProvider>
    </ProtectedRoute>
  )
}
