import type React from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { PermissionRoute } from "@/components/permission-route"
import { ROUTE_PERMISSIONS } from "@/lib/route-permissions"

export default function ChooseDoctorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <PermissionRoute permissions={[...ROUTE_PERMISSIONS.caseDesign]}>
        <div className="min-h-screen bg-white">{children}</div>
      </PermissionRoute>
    </ProtectedRoute>
  )
}
