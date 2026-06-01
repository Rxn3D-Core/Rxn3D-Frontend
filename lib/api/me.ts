import { clearSessionStorage } from "@/lib/clear-session-storage"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

const ensureAbsoluteUrl = (url: string): string => {
  if (!API_BASE_URL) {
    throw new Error("API_BASE_URL is not configured")
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }
  const baseUrl = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL
  const path = url.startsWith("/") ? url : `/${url}`
  return `${baseUrl}${path}`
}

const getBearerHeaders = (): HeadersInit => {
  if (typeof window === "undefined") return {}
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function parseMeResponse(response: Response): Promise<MeProfile> {
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
      `HTTP error! status: ${response.status}`
    throw new Error(message)
  }

  return (body?.data ?? body) as MeProfile
}

export interface MeProfile {
  id: number
  uuid?: string
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  work_number?: string | null
  avatar?: string | null
  image?: string | null
  status?: string
  roles?: string[] | Array<{ name?: string }>
  departments?: unknown[]
  mobile?: string | null
  [key: string]: unknown
}

export interface UpdateMeProfileInput {
  first_name?: string
  last_name?: string
  phone?: string
  /** Pass empty string to clear work number */
  work_number?: string
  avatar?: File | null
}

/** GET /me — current user profile */
export async function getMe(): Promise<MeProfile> {
  const response = await fetch(ensureAbsoluteUrl("/me"), {
    method: "GET",
    headers: {
      ...getBearerHeaders(),
      Accept: "application/json",
    },
  })
  return parseMeResponse(response)
}

/** PUT /me — text-only updates (no file upload) */
export async function updateMeJson(payload: UpdateMeProfileInput): Promise<MeProfile> {
  const { avatar: _avatar, ...jsonPayload } = payload
  const response = await fetch(ensureAbsoluteUrl("/me"), {
    method: "PUT",
    headers: {
      ...getBearerHeaders(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(jsonPayload),
  })
  return parseMeResponse(response)
}

/** POST /me — multipart profile update (required when uploading avatar) */
export async function updateMeMultipart(payload: UpdateMeProfileInput): Promise<MeProfile> {
  const formData = new FormData()

  if (payload.first_name !== undefined) {
    formData.append("first_name", payload.first_name)
  }
  if (payload.last_name !== undefined) {
    formData.append("last_name", payload.last_name)
  }
  if (payload.phone !== undefined) {
    formData.append("phone", payload.phone)
  }
  if (payload.work_number !== undefined) {
    formData.append("work_number", payload.work_number)
  }
  if (payload.avatar instanceof File) {
    formData.append("avatar", payload.avatar)
  }

  const response = await fetch(ensureAbsoluteUrl("/me"), {
    method: "POST",
    headers: {
      ...getBearerHeaders(),
    },
    body: formData,
  })
  return parseMeResponse(response)
}

/** Update current user; uses POST multipart when a new avatar file is included */
export async function updateMe(payload: UpdateMeProfileInput): Promise<MeProfile> {
  if (payload.avatar instanceof File) {
    return updateMeMultipart(payload)
  }
  return updateMeJson(payload)
}
