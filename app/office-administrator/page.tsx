"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

export default function OfficeAdministrator() {
  const [activeTab, setActiveTab] = useState("user-management")

  const tabs = [
    { id: "user-management", label: "User Management" },
    { id: "staff", label: "Staff" },
    { id: "office-schedule", label: "Office Schedule" },
    { id: "all-connections", label: "All Connections" },
  ]

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Office Administrator</h1>

      {/* Custom Tab Navigation */}
      <div className="border-b bg-white mb-8">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "px-8 py-4 text-sm font-medium border-b-2 transition-colors",
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

      {/* Tab Content */}
      <div className="w-full">
        {activeTab === "user-management" && (
          <div className="p-4 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-semibold mb-4">User Management</h3>
            <p className="text-gray-600 mb-4">Manage office users, their roles, and permissions.</p>
            <a 
              href="/office-administrator/user-management" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to User Management →
            </a>
          </div>
        )}

        {activeTab === "staff" && (
          <div className="p-4 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-semibold mb-4">Staff Management</h3>
            <p className="text-gray-600 mb-4">View and manage staff members and their information.</p>
            <a 
              href="/office-administrator/staff" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Staff →
            </a>
          </div>
        )}

        {activeTab === "office-schedule" && (
          <div className="p-4 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-semibold mb-4">Office Schedule</h3>
            <p className="text-gray-600 mb-4">Manage office schedules and working hours.</p>
            <a 
              href="/office-administrator/office-schedule" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Office Schedule →
            </a>
          </div>
        )}

        {activeTab === "all-connections" && (
          <div className="p-4 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-semibold mb-4">All Connections</h3>
            <p className="text-gray-600 mb-4">View and manage connections with labs and other offices.</p>
            <a 
              href="/office-administrator/all-connections" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to All Connections →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
