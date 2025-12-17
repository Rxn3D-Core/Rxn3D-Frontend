import type React from "react"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { ProtectedRoute } from "@/components/protected-route"
import { DriverSlipProvider } from "@/contexts/DriverSlipContext"

export default function LabProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <DriverSlipProvider>
        <div className="flex h-screen bg-white overflow-hidden">
          <DashboardSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </div>
        </div>
      </DriverSlipProvider>
    </ProtectedRoute>
  )
} 