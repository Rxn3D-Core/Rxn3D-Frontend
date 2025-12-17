import type React from "react"
import type { Metadata } from "next"
import { Header } from "@/components/header"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"

export default function OfficeAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="flex min-h-screen bg-[#f9f9f9]">
                    <DashboardSidebar />
                    <div className="flex-1 flex flex-col">
                      <Header />
                      <div className="flex-1 flex">
                        <main className="flex-1 p-6">
                          {children}
                        </main>
                      </div>
                    </div>
                  </div>
}
