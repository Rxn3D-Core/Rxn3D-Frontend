import type React from "react"
import type { Metadata } from "next"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { Header } from "@/components/header"
import { ProtectedRoute } from "@/components/protected-route"
import { LabSideRoute } from "@/components/slip-activity/lab-side-route"

// Hidden page (RXN-7): reachable only by URL. Do not add it to any menu, sidebar or sitemap.
export const metadata: Metadata = {
  title: "Slip Activity Monitor - RXn3D LMS",
  robots: { index: false, follow: false },
}

export default function SlipActivityLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex h-[100dvh] bg-[#F9F9F9] overflow-hidden">
        <DashboardSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header />
          <div className="flex-1 overflow-auto">
            <LabSideRoute>{children}</LabSideRoute>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
