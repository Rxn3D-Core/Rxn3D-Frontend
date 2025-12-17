"use client"

import type React from "react"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { Header } from "@/components/header"
import { ProtectedRoute } from "@/components/protected-route"
import { HolidaysProvider } from "@/contexts"
import { useAuth } from "@/contexts/auth-context"

function HolidaysProviderWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  let customerId: number | undefined = undefined
  if (user) {
    if (user.role === "lab_admin" && user.customers && user.customers.length > 0) {
      customerId = user.customers[0].id
    } else if (user.customer_id) {
      customerId = user.customer_id
    }
  }
  if (!customerId) {
    // Optionally, handle error or fallback
    return <>{children}</>
  }
  return <HolidaysProvider>{children}</HolidaysProvider>
}

export default function LabProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-[#F9F9F9] overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <div className="flex-1 overflow-auto">
            <HolidaysProviderWrapper>{children}</HolidaysProviderWrapper>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
} 