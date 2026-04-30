import { LabOnboardCompleteBody } from "@/lib/lab-onboard-complete-payload"
import { clearLegacyOnboardingCompleteLocalFlag } from "@/lib/onboarding-storage"
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ""

/** Success shape from LAB_COMPLETE_ONBOARDING_API.md */
export interface LabOnboardCompleteResponse {
  message: string
  data: {
    library: Record<string, unknown>
    business_settings: {
      business_hours: unknown[]
      case_schedule: unknown
    }
    customer: {
      id: number
      business_hours_setup_completed?: boolean
      business_hours_setup_completed_at?: string | null
      business_hours_setup_completed_by?: number | null
      onboarding_completed?: boolean
    }
  }
}

function getBearerToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token") || localStorage.getItem("library_token")
}

export async function postLabOnboardComplete(body: LabOnboardCompleteBody): Promise<LabOnboardCompleteResponse> {
  const token = getBearerToken()
  if (!token) throw new Error("No authentication token found")

  const response = await fetch(`${API_BASE}/labs/onboard-complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const json = await response.json().catch(() => ({}))

  if (!response.ok) {
    const msg =
      (typeof json?.message === "string" && json.message) ||
      (typeof json?.error === "string" && json.error) ||
      `HTTP ${response.status}`
    throw new Error(msg)
  }

  clearLegacyOnboardingCompleteLocalFlag()

  return json as LabOnboardCompleteResponse
}
