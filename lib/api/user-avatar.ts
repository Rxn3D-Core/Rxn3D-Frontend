import { clearSessionStorage } from "@/lib/clear-session-storage"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

/** Matches the backend `avatar` validation rule on POST /users/{id}/avatar. */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024
export const AVATAR_ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png"] as const
export const AVATAR_ACCEPT_ATTRIBUTE = ".jpg,.jpeg,.png"

export interface UploadUserAvatarInput {
  userId: number
  file: File
  /** Required unless uploading your own photo; identifies the shared office. */
  customerId?: number | string | null
}

export interface UploadUserAvatarResult {
  id: number
  image: string | null
}

const ensureAbsoluteUrl = (path: string): string => {
  if (!API_BASE_URL) {
    throw new Error("API_BASE_URL is not configured")
  }
  const baseUrl = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`
}

/**
 * Validate a file before uploading so the user sees the problem immediately
 * instead of waiting on a 422 from the API.
 */
export function validateAvatarFile(file: File): string | null {
  if (!AVATAR_ACCEPTED_TYPES.includes(file.type as (typeof AVATAR_ACCEPTED_TYPES)[number])) {
    return "Please choose a JPG or PNG image."
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return "Image must be smaller than 5 MB."
  }
  return null
}

/**
 * POST /users/{id}/avatar — upload a profile photo.
 *
 * Users may always upload their own. Uploading for someone else requires the
 * `edit_user` permission on `customerId` (office_admin or doctor_admin).
 */
export async function uploadUserAvatar({
  userId,
  file,
  customerId,
}: UploadUserAvatarInput): Promise<UploadUserAvatarResult> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  const formData = new FormData()
  formData.append("avatar", file)
  if (customerId !== undefined && customerId !== null && `${customerId}` !== "") {
    formData.append("customer_id", `${customerId}`)
  }

  const response = await fetch(ensureAbsoluteUrl(`/users/${userId}/avatar`), {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: "application/json",
    },
    body: formData,
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
      (body && typeof body === "object" && "message" in body && String(body.message)) ||
      `Failed to upload photo (${response.status})`
    throw new Error(message)
  }

  const data = (body?.data ?? body) as { id?: number; image?: string | null }
  return { id: data?.id ?? userId, image: data?.image ?? null }
}
