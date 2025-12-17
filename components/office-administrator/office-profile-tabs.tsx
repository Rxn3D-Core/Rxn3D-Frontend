"use client"

import { cn } from "@/lib/utils"

interface TabItem {
  id: string
  label: string
}

interface OfficeProfileTabsProps {
  tabs: TabItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export default function OfficeProfileTabs({ tabs, activeTab, onTabChange }: OfficeProfileTabsProps) {
  return (
    <div className="border-b bg-white">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-6 py-4 text-sm font-medium border-b-2 transition-colors relative",
              activeTab === tab.id
                ? "border-blue-600 text-blue-600 bg-blue-50"
                : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
