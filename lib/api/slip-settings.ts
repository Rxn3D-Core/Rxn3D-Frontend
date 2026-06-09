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
  /** Driver must sign when picking up from an office ("In office ready to pickup"). Default true. */
  require_signature_pickup_from_office: boolean
  /** Driver must sign when picking up from the lab ("In lab ready to pickup"). Default true. */
  require_signature_pickup_from_lab: boolean
  /** Driver must sign when dropping off at the lab ("On route to the lab"). Default true. */
  require_signature_drop_at_lab: boolean
  /** Driver must sign when dropping off at an office ("On route to the office"). Default true. */
  require_signature_drop_at_office: boolean
  /** Signature required on the lab "Ready to Send" action. Default false. */
  require_signature_ready_to_send: boolean
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
