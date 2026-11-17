import type React from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { PanelRoute } from "@/components/panel-route"

/** RXN-85: every /doctor/* page is office-only; other profiles get a "no permission" page. */
export default function DoctorPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <PanelRoute panel="office">{children}</PanelRoute>
    </ProtectedRoute>
  )
}
