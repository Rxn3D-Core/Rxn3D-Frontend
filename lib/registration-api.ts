import type { RegistrationPurpose } from "@/lib/config/registration"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export interface VerifyOtpResponse {
  registration_token: string
  expires_in: number
  email: string
  purpose: RegistrationPurpose
}

export async function sendRegistrationOtp(params: {
  email: string
  purpose: RegistrationPurpose
  turnstileToken?: string
  firstName?: string
}): Promise<void> {
  const body: Record<string, string> = {
    email: params.email,
    purpose: params.purpose,
  }
  if (params.turnstileToken) {
    body.turnstile_token = params.turnstileToken
  }
  if (params.firstName) {
    body.first_name = params.firstName
  }

  const response = await fetch(`${API_BASE_URL}/registration/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || "Failed to send verification code.")
  }
}

export async function verifyRegistrationOtp(params: {
  email: string
  purpose: RegistrationPurpose
  otp: string
}): Promise<VerifyOtpResponse> {
  const response = await fetch(`${API_BASE_URL}/registration/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: params.email,
      purpose: params.purpose,
      otp: params.otp,
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || "Invalid verification code.")
  }

  return data.data as VerifyOtpResponse
}

export async function checkRegistrationOtp(params: {
  email: string
  purpose: RegistrationPurpose
  otp: string
}): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/registration/check-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: params.email,
      purpose: params.purpose,
      otp: params.otp,
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || "Invalid verification code.")
  }
}

export async function registerSelfUser(payload: {
  email: string
  otp: string
  accepted_terms: boolean
  first_name: string
  last_name: string
  phone: string
  password: string
  password_confirmation: string
}) {
  const response = await fetch(`${API_BASE_URL}/registration/self/user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || data.message || "Registration failed.")
  }

  return data
}

export async function registerSelfOrganization(
  type: "lab" | "office",
  formData: FormData,
  authToken?: string | null
) {
  const endpoint = type === "lab" ? "/registration/self/lab" : "/registration/self/office"
  const headers: Record<string, string> = {}
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: formData,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (data?.errors) {
      const firstError = Object.values(data.errors)[0]
      throw new Error(Array.isArray(firstError) ? firstError[0] : String(firstError))
    }
    throw new Error(data.error || data.message || "Registration failed.")
  }

  return data
}
