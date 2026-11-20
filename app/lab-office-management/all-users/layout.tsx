import type React from "react"
import type { Metadata } from "next"
import { Header } from "@/components/header"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"

export default function StaffManagementLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="flex min-h-screen bg-[#f9f9f9]">
                    <DashboardSidebar />
                    <div className="flex-1 flex flex-col min-w-0">
                      <Header />
                      <div className="flex-1 flex min-w-0">
                        <main className="flex-1 min-w-0 px-3 py-4 sm:px-6">
                          {children}
                        </main>
                      </div>
                    </div>
                  </div>
}
