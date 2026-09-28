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
  /** Show photo upload when picking up from office. Default false. */
  enable_photo_pickup_from_office: boolean
  /** Require photo when enabled for office pickup. Default false. */
  require_photo_pickup_from_office: boolean
  /** Show photo upload when picking up from lab. Default false. */
  enable_photo_pickup_from_lab: boolean
  /** Require photo when enabled for lab pickup. Default false. */
  require_photo_pickup_from_lab: boolean
  /** Show photo upload when dropping at lab. Default true. */
  enable_photo_drop_at_lab: boolean
  /** Require photo when enabled for lab drop-off. Default false. */
  require_photo_drop_at_lab: boolean
  /** Show photo upload when dropping at office. Default true. */
  enable_photo_drop_at_office: boolean
  /** Require photo when enabled for office drop-off. Default false. */
  require_photo_drop_at_office: boolean
  /** Allow multiple slips when picking up from office. Default true. */
  allow_multiple_pickup_from_office: boolean
  /** Allow multiple slips when picking up from lab. Default true. */
  allow_multiple_pickup_from_lab: boolean
  /** Allow multiple slips when dropping at lab. Default false. */
  allow_multiple_drop_at_lab: boolean
  /** Allow multiple slips when dropping at office. Default false. */
  allow_multiple_drop_at_office: boolean
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
