import type React from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { PanelRoute } from "@/components/panel-route"

/** RXN-85: every /lab-administrator/* page is lab-only; other profiles get a "no permission" page. */
export default function LabAdministratorPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <PanelRoute panel="lab">{children}</PanelRoute>
    </ProtectedRoute>
  )
}
