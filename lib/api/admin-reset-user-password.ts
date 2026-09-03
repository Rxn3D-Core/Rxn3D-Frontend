import { clearSessionStorage } from "@/lib/clear-session-storage"
import { getActiveCustomerId } from "@/lib/customer-scope"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

const ensureAbsoluteUrl = (path: string): string => {
  if (!API_BASE_URL) {
    throw new Error("API_BASE_URL is not configured")
  }
  const baseUrl = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`
}

export interface AdminResetUserPasswordInput {
  userId: number
  password: string
  password_confirmation: string
  /** Required for non-superadmin; scopes the target to a lab/office profile. */
  customerId?: number | string | null
}

/**
 * POST /users/{id}/reset-password — admin sets a user's password without the current one.
 *
 * Lab admin → lab_user / lab_driver. Office admin / doctor_admin → doctor / office_user / doctor_admin.
 */
export async function adminResetUserPassword({
  userId,
  password,
  password_confirmation,
  customerId,
}: AdminResetUserPasswordInput): Promise<{ status: boolean; message: string }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  const scopedCustomerId =
    customerId !== undefined && customerId !== null && `${customerId}` !== ""
      ? customerId
      : getActiveCustomerId()

  const response = await fetch(ensureAbsoluteUrl(`/users/${userId}/reset-password`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      password,
      password_confirmation,
      ...(scopedCustomerId ? { customer_id: Number(scopedCustomerId) } : {}),
    }),
  })

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      clearSessionStorage()
      window.location.href = "/login"
    }
    throw new Error("Unauthorized")
  }

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      body?.message ||
      body?.error ||
      (body?.errors ? Object.values(body.errors).flat().join(" ") : null) ||
      "Failed to reset password"
    throw new Error(typeof message === "string" ? message : "Failed to reset password")
  }

  return {
    status: Boolean(body?.status ?? true),
    message: body?.message || "Password reset successfully",
  }
}
