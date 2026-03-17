"use client"

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { Header } from "@/components/header"
import { SlipSettingsPage } from "@/components/dashboard/slip-settings-page"

export default function SlipSettings() {
  return (
    <div className="flex h-screen bg-[#F9F9F9] overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onNewSlip={() => window.dispatchEvent(new Event("open-dental-slip"))} />
        <div className="flex-1 overflow-auto">
          <SlipSettingsPage />
        </div>
      </div>
    </div>
  )
}
