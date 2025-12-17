import type React from "react"
import { Header } from "@/components/header"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"

export default function ChooseLabLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-[#d7dde1]">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex">
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}























