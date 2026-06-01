import { apiClient } from "@/lib/api/client"

export type FieldRequirement = "optional" | "required"

export interface SlipSettings {
  lab_id: number
  show_patient_name: boolean
  show_gender: boolean
  show_age: boolean
  gender_requirement: FieldRequirement
  age_requirement: FieldRequirement
  show_slip_number: boolean
}

export type SlipSettingsUpdate = Partial<
  Omit<SlipSettings, "lab_id">
>

/** GET /v1/slip-settings?lab_id={id} */
export async function getSlipSettings(labId: number): Promise<SlipSettings> {
  const response = await apiClient.get<SlipSettings>("/slip-settings", {
    params: { lab_id: labId },
  })
  return response.data
}

/** PUT /v1/slip-settings?lab_id={id} — partial body supported */
export async function updateSlipSettings(
  labId: number,
  payload: SlipSettingsUpdate
): Promise<SlipSettings> {
  const response = await apiClient.put<SlipSettings>(
    `/slip-settings?lab_id=${labId}`,
    payload
  )
  return response.data
}
