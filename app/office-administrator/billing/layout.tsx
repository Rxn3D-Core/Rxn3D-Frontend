import type React from "react"
import { Header } from "@/components/header"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { ProtectedRoute } from "@/components/protected-route"
import { PermissionRoute } from "@/components/permission-route"

export default function OfficeAdminBillingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <PermissionRoute permissions={["view_billing", "manage_billing"]}>
      <div className="flex min-h-screen bg-[#f9f9f9]">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 flex">
            <main className="flex-1">
              {children}
            </main>
          </div>
        </div>
      </div>
      </PermissionRoute>
    </ProtectedRoute>
  )
}























