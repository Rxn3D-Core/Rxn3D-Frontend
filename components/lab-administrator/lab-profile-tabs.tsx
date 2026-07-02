"use client"

import { cn } from "@/lib/utils"

interface TabItem {
  id: string
  label: string
}

interface LabProfileTabsProps {
  tabs: TabItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export default function LabProfileTabs({ tabs, activeTab, onTabChange }: LabProfileTabsProps) {
  return (
    <div className="border-b bg-white">
      <div className="flex">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "px-6 py-4 text-sm font-medium transition-colors relative border-b-2 border-transparent",
                isActive ? "text-gray-900" : "text-gray-600 hover:text-gray-800 hover:bg-gray-50",
              )}
            >
              {tab.label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                  style={{ background: "linear-gradient(256.66deg, #2AA6DE 0%, #82298D 50%, #C9539F 100%)" }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
