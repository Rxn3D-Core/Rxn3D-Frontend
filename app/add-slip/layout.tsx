import type React from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { PermissionRoute } from "@/components/permission-route"
import { DriverSlipProvider } from "@/contexts/DriverSlipContext"
import { ROUTE_PERMISSIONS } from "@/lib/route-permissions"

export default function AddSlipLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <PermissionRoute permissions={[...ROUTE_PERMISSIONS.caseDesign]}>
      <DriverSlipProvider>
        <div className="w-full h-[100dvh] overflow-hidden bg-background">
          {children}
        </div>
      </DriverSlipProvider>
      </PermissionRoute>
    </ProtectedRoute>
  )
}
