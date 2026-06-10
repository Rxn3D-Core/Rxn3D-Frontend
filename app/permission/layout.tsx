import type React from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { PermissionRoute } from "@/components/permission-route"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { Header } from "@/components/header"

export default function PermissionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <PermissionRoute permissions={["view_users", "manage_users"]}>
      <div className="flex h-[100dvh] bg-[#F9F9F9] overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>
        </div>
      </div>
      </PermissionRoute>
    </ProtectedRoute>
  )
}














