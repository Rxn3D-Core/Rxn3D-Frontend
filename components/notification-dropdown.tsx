"use client"

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "New case received",
      description: "Case #12345 has been assigned to you",
      time: "2 minutes ago",
      read: false,
    },
    {
      id: 2,
      title: "Reminder: Case due today",
      description: "Case #10982 is due by 5:00 PM",
      time: "1 hour ago",
      read: false,
    },
    {
      id: 3,
      title: "New message from Dr. Smith",
      description: "Please call me regarding case #11234",
      time: "3 hours ago",
      read: false,
    },
    {
      id: 4,
      title: "System update scheduled",
      description: "System maintenance at 11:00 PM tonight",
      time: "Yesterday",
      read: false,
    },
    {
      id: 5,
      title: "Payment received",
      description: "Payment for invoice #INV-2023-004 received",
      time: "2 days ago",
      read: false,
    },
  ])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = (id: number) => {
    setNotifications(
      notifications.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    )
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map((notification) => ({ ...notification, read: true })))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-auto py-1">
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">No notifications</div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="flex flex-col items-start p-3 cursor-pointer"
              onClick={() => markAsRead(notification.id)}
            >
              <div className="flex w-full justify-between">
                <span className={`font-medium ${notification.read ? "" : "text-primary"}`}>{notification.title}</span>
                <span className="text-xs text-muted-foreground ml-2">{notification.time}</span>
              </div>
              <span className="text-sm text-muted-foreground mt-1">{notification.description}</span>
              {!notification.read && <span className="mt-1 h-2 w-2 rounded-full bg-blue-600"></span>}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
