import { apiClient, buildApiUrl } from "@/lib/api/client"
import {
  driverLabelSettingsFromApi,
  driverLabelSettingsToApi,
  type DriverLabelPrintSettings,
  type DriverLabelSettingsApiValues,
} from "@/lib/driver-labels/label-print-settings"

/** `data` of GET/PUT /v1/slip-settings/driver-label (RXN-63). The lab is the caller's active profile. */
interface DriverLabelSettingsApiData {
  lab_id: number
  is_default: boolean
  can_edit: boolean
  settings: Partial<DriverLabelSettingsApiValues>
  /** Added in RXN-65; read-only. An older API does not send it. */
  logo?: Partial<DriverLabelLogoUrls> | null
}

/** Read-only logo block of GET/PUT/POST/DELETE (RXN-65). `activeUrl` is the one for the saved logo source. */
export interface DriverLabelLogoUrls {
  current_url: string | null
  custom_url: string | null
  active_url: string | null
}

export interface LabDriverLabelSettings {
  settings: DriverLabelPrintSettings
  /** True only for a lab admin of the active lab; everyone else sees the panel read-only. */
  canEdit: boolean
  /** RXN-65: lab profile logo, uploaded driver label logo, and the one the saved choice prints. */
  logo: { currentUrl: string | null; customUrl: string | null; activeUrl: string | null }
}

const urlOrNull = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null)

function toResult(data: DriverLabelSettingsApiData): LabDriverLabelSettings {
  return {
    settings: driverLabelSettingsFromApi(data?.settings),
    canEdit: data?.can_edit === true,
    logo: {
      currentUrl: urlOrNull(data?.logo?.current_url),
      customUrl: urlOrNull(data?.logo?.custom_url),
      activeUrl: urlOrNull(data?.logo?.active_url),
    },
  }
}

/** GET /v1/slip-settings/driver-label */
export async function getDriverLabelSettings(): Promise<LabDriverLabelSettings> {
  const response = await apiClient.get<DriverLabelSettingsApiData>("/slip-settings/driver-label")
  return toResult(response.data)
}

/** PUT /v1/slip-settings/driver-label (lab admins only; the API answers 403 for anyone else). */
export async function saveDriverLabelSettings(
  settings: DriverLabelPrintSettings,
): Promise<LabDriverLabelSettings> {
  const response = await apiClient.put<DriverLabelSettingsApiData>(
    "/slip-settings/driver-label",
    driverLabelSettingsToApi(settings),
  )
  return toResult(response.data)
}

const LOGO_PATH = "/slip-settings/driver-label/logo"

function authHeaders(): Record<string, string> {
  const token = typeof window === "undefined" ? null : localStorage.getItem("token")
  return { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

/** POST /v1/slip-settings/driver-label/logo (lab admins only; PNG/JPG, max 1 MB). Multipart, so not apiClient. */
export async function uploadDriverLabelLogo(file: File): Promise<LabDriverLabelSettings> {
  const form = new FormData()
  form.append("logo", file)
  const res = await fetch(buildApiUrl(LOGO_PATH), { method: "POST", headers: authHeaders(), body: form })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const fieldError = body?.data?.logo?.[0] ?? body?.errors?.logo?.[0]
    throw new Error(fieldError || body?.message || `HTTP error! status: ${res.status}`)
  }
  return toResult(body?.data ?? body)
}

/** DELETE /v1/slip-settings/driver-label/logo (lab admins only). */
export async function deleteDriverLabelLogo(): Promise<LabDriverLabelSettings> {
  const response = await apiClient.delete<DriverLabelSettingsApiData>(LOGO_PATH)
  return toResult(response.data)
}

/**
 * The logo that prints (`logo.active_url`) as a data URL, read through the backend image proxy because the
 * browser cannot read the S3 object for canvas processing without a bucket CORS rule. Null on any failure.
 */
export async function fetchActiveLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(buildApiUrl(`${LOGO_PATH}/image`), { headers: authHeaders() })
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string | null>((resolve) => {
      const fr = new FileReader()
      fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : null)
      fr.onerror = () => resolve(null)
      fr.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}
