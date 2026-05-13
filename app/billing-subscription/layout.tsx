"use client"

import type React from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { Header } from "@/components/header"
import { SuperAdminBillingGuard } from "@/components/billing-subscription/super-admin-billing-guard"

export default function BillingSubscriptionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-[100dvh] bg-[#F9F9F9] overflow-hidden">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <div className="flex-1 overflow-auto">
            <SuperAdminBillingGuard>{children}</SuperAdminBillingGuard>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}













