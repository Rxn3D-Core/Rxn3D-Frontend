import { apiClient } from "@/lib/api/client"
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
}

export interface LabDriverLabelSettings {
  settings: DriverLabelPrintSettings
  /** True only for a lab admin of the active lab; everyone else sees the panel read-only. */
  canEdit: boolean
}

function toResult(data: DriverLabelSettingsApiData): LabDriverLabelSettings {
  return { settings: driverLabelSettingsFromApi(data?.settings), canEdit: data?.can_edit === true }
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
