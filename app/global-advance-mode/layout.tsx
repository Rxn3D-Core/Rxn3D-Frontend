"use client"

import type React from "react"

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { Header } from "@/components/header"
import { AdvanceSidebar } from "@/components/advance-mode/advance-sidebar"
import { ProtectedRoute } from "@/components/protected-route"

export default function GlobalAdvanceModeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-[#f9f9f9]">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 flex">
            <AdvanceSidebar />
            <main className="flex-1">
              {children}
            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
