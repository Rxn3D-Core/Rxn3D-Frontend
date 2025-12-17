"use client"

import { NotificationDropdown } from "@/components/notification-dropdown"

export default function TestNotifications() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Notifications</h1>
      <div className="flex items-center gap-4">
        <NotificationDropdown />
        <span>← Click the bell icon to test notifications</span>
      </div>
    </div>
  )
}
