import { apiClient } from "./client"

export interface ApiNotification {
  id: string
  type: string
  data: Record<string, any>
  read_at: string | null
  created_at: string
  updated_at: string
}

export interface NotificationPagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface NotificationsPaginated {
  data: ApiNotification[]
  pagination: NotificationPagination
}

export interface NotificationPreference {
  id: number
  user_id: number
  notification_type: string
  internal_enabled: boolean
  email_enabled: boolean
  created_at: string
  updated_at: string
}

export async function fetchAllNotifications(perPage = 20): Promise<NotificationsPaginated> {
  const { data } = await apiClient.get<NotificationsPaginated>("/notifications", {
    params: { per_page: perPage },
  })
  return data
}

export async function fetchUnreadNotifications(perPage = 20): Promise<NotificationsPaginated> {
  const { data } = await apiClient.get<NotificationsPaginated>("/notifications/unread", {
    params: { per_page: perPage },
  })
  return data
}

export async function fetchUnreadCount(): Promise<{ unread_count: number }> {
  const { data } = await apiClient.get<{ unread_count: number }>("/notifications/count")
  return data
}

export async function markNotificationRead(id: string): Promise<{ message: string }> {
  const { data } = await apiClient.put<{ message: string }>(`/notifications/${id}/read`)
  return data
}

export async function markAllNotificationsRead(): Promise<{ message: string; count: number }> {
  const { data } = await apiClient.put<{ message: string; count: number }>("/notifications/read-all")
  return data
}

export async function deleteNotification(id: string): Promise<{ message: string }> {
  const { data } = await apiClient.delete<{ message: string }>(`/notifications/${id}`)
  return data
}

export async function fetchNotificationPreferences(): Promise<{ data: NotificationPreference[] }> {
  const { data } = await apiClient.get<{ data: NotificationPreference[] }>("/notifications/preferences")
  return data
}

export async function updateNotificationPreferences(
  preferences: Record<string, { internal_enabled: boolean; email_enabled: boolean }>
): Promise<{ message: string }> {
  const { data } = await apiClient.put<{ message: string }>("/notifications/preferences", { preferences })
  return data
}
