import type React from "react"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { Header } from "@/components/header"
import { ProtectedRoute } from "@/components/protected-route"
import { PermissionRoute } from "@/components/permission-route"
import { DriverSlipProvider } from "@/contexts/DriverSlipContext"
import { ROUTE_PERMISSIONS } from "@/lib/route-permissions"

export default function LabProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <PermissionRoute permissions={[...ROUTE_PERMISSIONS.officeProfile]}>
      <DriverSlipProvider>
        <div className="flex h-[100dvh] bg-[#F9F9F9] overflow-hidden">
          <DashboardSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </div>
        </div>
      </DriverSlipProvider>
      </PermissionRoute>
    </ProtectedRoute>
  )
} 