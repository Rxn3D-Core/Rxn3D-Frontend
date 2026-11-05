import { buildApiUrl } from "@/lib/api/client"
import type { OffboardingPreview, OffboardPayload, OffboardResult } from "@/types/offboarding"

/** API error that keeps the contract's `error` code, field errors and `data` (a fresh preview on 409 stale). */
export class OffboardingApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null,
    readonly errors?: Record<string, string[]>,
    readonly data?: unknown,
  ) {
    super(message)
    this.name = "OffboardingApiError"
  }
}

interface Envelope<T> {
  success?: boolean
  message?: string
  error?: string
  errors?: Record<string, string[]>
  data?: T
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const body = (await response.json().catch(() => null)) as Envelope<T> | null
  if (!response.ok) {
    throw new OffboardingApiError(
      body?.message || `HTTP error! status: ${response.status}`,
      response.status,
      body?.error ?? null,
      body?.errors,
      body?.data,
    )
  }
  return body?.data as T
}

/** GET /me/customers/{customerId}/offboarding-preview */
export function getSelfOffboardingPreview(customerId: number): Promise<OffboardingPreview> {
  return call(`/me/customers/${customerId}/offboarding-preview`)
}

/** GET /customers/{customerId}/users/{userId}/offboarding-preview */
export function getMemberOffboardingPreview(customerId: number, userId: number): Promise<OffboardingPreview> {
  return call(`/customers/${customerId}/users/${userId}/offboarding-preview`)
}

/** POST /me/customers/{customerId}/leave */
export function leaveWithTransfer(customerId: number, payload: OffboardPayload): Promise<OffboardResult> {
  return call(`/me/customers/${customerId}/leave`, { method: "POST", body: JSON.stringify(payload) })
}

/** POST /customers/{customerId}/users/{userId}/offboard */
export function offboardMember(customerId: number, userId: number, payload: OffboardPayload): Promise<OffboardResult> {
  return call(`/customers/${customerId}/users/${userId}/offboard`, { method: "POST", body: JSON.stringify(payload) })
}
