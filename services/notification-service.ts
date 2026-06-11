import type { Notification } from "@/lib/redux/features/notificationsSlice"
import {
  fetchAllNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification as apiDeleteNotification,
  fetchNotificationPreferences,
  updateNotificationPreferences as apiUpdatePreferences,
  type ApiNotification,
  type NotificationPagination,
  type NotificationPreference,
} from "@/lib/api/notifications"

function inferType(notificationType: string): Notification["type"] {
  const lower = notificationType.toLowerCase()
  if (lower.includes("error") || lower.includes("failed") || lower.includes("reject")) return "error"
  if (lower.includes("warn") || lower.includes("overdue") || lower.includes("due")) return "warning"
  if (lower.includes("success") || lower.includes("paid") || lower.includes("payment")) return "success"
  return "info"
}

function extractTitle(notification: ApiNotification): string {
  const { data } = notification
  if (data.title) return String(data.title)
  if (data.case_number) {
    const slug = notification.type.split("\\").pop() ?? ""
    const label = slug.replace(/Notification$/, "").replace(/([A-Z])/g, " $1").trim()
    return `${label}: ${data.case_number}`
  }
  const slug = notification.type.split("\\").pop() ?? notification.type
  return slug.replace(/Notification$/, "").replace(/([A-Z])/g, " $1").trim()
}

function extractMessage(notification: ApiNotification): string {
  const { data } = notification
  if (data.message) return String(data.message)
  const parts: string[] = []
  if (data.patient_name) parts.push(`Patient: ${data.patient_name}`)
  if (data.doctor_name) parts.push(data.doctor_name)
  if (data.office_name) parts.push(data.office_name)
  if (data.lab_name) parts.push(data.lab_name)
  return parts.join(" · ") || "No details available"
}

export function mapApiNotification(n: ApiNotification): Notification {
  return {
    id: n.id,
    title: extractTitle(n),
    message: extractMessage(n),
    type: inferType(n.type),
    read: n.read_at !== null,
    timestamp: n.created_at,
  }
}

export async function getNotifications(
  perPage = 20
): Promise<{ notifications: Notification[]; pagination: NotificationPagination }> {
  const result = await fetchAllNotifications(perPage)
  return {
    notifications: result.data.map(mapApiNotification),
    pagination: result.pagination,
  }
}

export async function getUnreadCount(): Promise<number> {
  const result = await fetchUnreadCount()
  return result.unread_count
}

export async function markRead(id: string): Promise<void> {
  await markNotificationRead(id)
}

export async function markAllRead(): Promise<void> {
  await markAllNotificationsRead()
}

export async function removeNotification(id: string): Promise<void> {
  await apiDeleteNotification(id)
}

export async function getPreferences(): Promise<NotificationPreference[]> {
  const result = await fetchNotificationPreferences()
  return result.data
}

export async function updatePreferences(
  prefs: Record<string, { internal_enabled: boolean; email_enabled: boolean }>
): Promise<void> {
  await apiUpdatePreferences(prefs)
}
