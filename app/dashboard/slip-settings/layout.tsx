import type React from "react"
import { PermissionRoute } from "@/components/permission-route"
import { ROUTE_PERMISSIONS } from "@/lib/route-permissions"

export default function SlipSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PermissionRoute permissions={[...ROUTE_PERMISSIONS.slipSettings]}>
      {children}
    </PermissionRoute>
  )
}
