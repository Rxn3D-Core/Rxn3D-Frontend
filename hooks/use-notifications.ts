"use client"

import { useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppDispatch } from "@/lib/redux/hooks"
import {
  setNotifications,
  markAsRead as reduxMarkAsRead,
  markAllAsRead as reduxMarkAllAsRead,
  removeNotification as reduxRemoveNotification,
  addNotification,
} from "@/lib/redux/features/notificationsSlice"
import {
  getNotifications,
  markRead,
  markAllRead,
  removeNotification,
} from "@/services/notification-service"
import { mapApiNotification } from "@/services/notification-service"
import { initializeEcho, disconnectEcho } from "@/lib/echo"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
}

export function useNotifications(perPage = 20) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  return useQuery({
    queryKey: notificationKeys.lists(),
    queryFn: async () => {
      const result = await getNotifications(perPage)
      dispatch(setNotifications(result.notifications))
      return result
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    onError: () => {
      toast({ title: "Failed to load notifications", variant: "destructive" })
    },
  } as any)
}

export function useMarkAsRead() {
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => markRead(id),
    onSuccess: (_: unknown, id: string) => {
      dispatch(reduxMarkAsRead(id))
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
    },
  })
}

export function useMarkAllRead() {
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => markAllRead(),
    onSuccess: () => {
      dispatch(reduxMarkAllAsRead())
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
    },
  })
}

export function useDeleteNotification() {
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => removeNotification(id),
    onSuccess: (_: unknown, id: string) => {
      dispatch(reduxRemoveNotification(id))
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
    },
  })
}

// Subscribes to the user's private Reverb channel and pushes live notifications into Redux.
// Should be mounted once near the top of the authenticated layout.
export function useRealtimeNotifications() {
  const dispatch = useAppDispatch()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user?.id) return

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) return

    let subscribed = true

    initializeEcho(token).then((echo) => {
      if (!subscribed) return

      const channel = echo.private(`user.${user.id}`)

      channel
        .subscribed(() => {
          // channel ready
        })
        .notification((raw: any) => {
          const notification = mapApiNotification(raw)
          dispatch(addNotification(notification))
          queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
        })
        .error((err: any) => {
          console.error("Notification channel error:", err)
        })
    }).catch((err) => {
      console.error("Echo init failed:", err)
    })

    return () => {
      subscribed = false
      disconnectEcho()
    }
  }, [user?.id, dispatch, queryClient])
}
