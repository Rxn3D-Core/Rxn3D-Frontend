import type React from "react"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { Header } from "@/components/header"
import { ProtectedRoute } from "@/components/protected-route"
import { PermissionRoute } from "@/components/permission-route"
import { ROUTE_PERMISSIONS } from "@/lib/route-permissions"

export default function AllConnectionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <PermissionRoute permissions={[...ROUTE_PERMISSIONS.connections]}>
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
