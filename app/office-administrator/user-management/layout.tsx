import type React from "react"
import type { Metadata } from "next"
import { Header } from "@/components/header"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { ProtectedRoute } from "@/components/protected-route"
import { PermissionRoute } from "@/components/permission-route"

export const metadata: Metadata = {
  title: "User Management - RXn3D LMS",
  description: "Manage users members in your dental office",
}

export default function StaffManagementLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <PermissionRoute permissions={["view_users", "manage_users"]}>
        <div className="flex min-h-screen bg-[#f9f9f9]">
          <DashboardSidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <div className="flex-1 flex">
              <main className="flex-1 p-6">{children}</main>
            </div>
          </div>
        </div>
      </PermissionRoute>
    </ProtectedRoute>
  )
}
