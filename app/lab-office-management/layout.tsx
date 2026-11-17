import type React from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { PanelRoute } from "@/components/panel-route"

/** RXN-85: every /lab-office-management/* page is superadmin-only; other profiles get a "no permission" page. */
export default function LabOfficeManagementPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <PanelRoute panel="superadmin">{children}</PanelRoute>
    </ProtectedRoute>
  )
}
