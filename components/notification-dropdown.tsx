"use client"

import { Bell, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDistanceToNow } from "date-fns"
import { useAppSelector } from "@/lib/redux/hooks"
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllRead,
  useDeleteNotification,
} from "@/hooks/use-notifications"

export function NotificationDropdown() {
  const { isLoading } = useNotifications()
  const markAsReadMutation = useMarkAsRead()
  const markAllReadMutation = useMarkAllRead()
  const deleteNotificationMutation = useDeleteNotification()

  const notifications = useAppSelector((s) => s.notifications.notifications)
  const unreadCount = useAppSelector((s) => s.notifications.unreadCount)

  function formatTime(timestamp: string): string {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch {
      return ""
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto py-1"
              disabled={markAllReadMutation.isPending}
              onClick={(e) => {
                e.preventDefault()
                markAllReadMutation.mutate()
              }}
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Mark all as read"
              )}
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">No notifications</div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="flex flex-col items-start p-3 cursor-pointer focus:bg-accent group"
              onClick={() => {
                if (!notification.read) {
                  markAsReadMutation.mutate(notification.id)
                }
              }}
            >
              <div className="flex w-full justify-between items-start gap-2">
                <span className={`font-medium text-sm leading-tight ${notification.read ? "" : "text-primary"}`}>
                  {notification.title}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTime(notification.timestamp)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNotificationMutation.mutate(notification.id)
                    }}
                    aria-label="Delete notification"
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
              <span className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.message}</span>
              {!notification.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
