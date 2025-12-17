"use client"

import type React from "react"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { Header } from "@/components/header"
import { CaseTrackingSidebar } from "@/components/case-tracking/case-tracking-sidebar"
import { CaseTrackingProvider } from "@/contexts/case-tracking-context"
import { ProtectedRoute } from "@/components/protected-route"

export default function CaseTrackingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <CaseTrackingProvider>
        <div className="flex min-h-screen bg-[#f9f9f9]">
          <DashboardSidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <div className="flex-1 flex">
              <CaseTrackingSidebar />
              <main className="flex-1">{children}</main>
            </div>
          </div>
        </div>
      </CaseTrackingProvider>
    </ProtectedRoute>
  )
}
