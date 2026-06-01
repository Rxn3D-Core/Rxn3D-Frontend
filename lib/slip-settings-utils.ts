import type { FieldRequirement, SlipSettings } from "@/lib/api/slip-settings"
import { getCustomerId } from "@/lib/dashboard-widgets"

export interface SlipSettingsFormState {
  show_patient_name: boolean
  show_gender: boolean
  show_age: boolean
  show_slip_number: boolean
  gender_requirement: FieldRequirement
  age_requirement: FieldRequirement
}

export const DEFAULT_SLIP_SETTINGS_FORM: SlipSettingsFormState = {
  show_patient_name: true,
  show_gender: true,
  show_age: true,
  show_slip_number: true,
  gender_requirement: "optional",
  age_requirement: "optional",
}

/** Lab id for GET/PUT /v1/slip-settings (office users use selected lab). */
export function resolveSlipSettingsLabId(): number | null {
  if (typeof window === "undefined") return null

  const role = localStorage.getItem("role")
  if (role === "office_admin" || role === "doctor" || role === "doctor_admin") {
    const selectedLabId = localStorage.getItem("selectedLabId")
    if (selectedLabId) {
      const parsed = Number(selectedLabId)
      if (!Number.isNaN(parsed) && parsed > 0) return parsed
    }
  }

  return getCustomerId()
}

export function slipSettingsToForm(settings: SlipSettings): SlipSettingsFormState {
  return {
    show_patient_name: settings.show_patient_name,
    show_gender: settings.show_gender,
    show_age: settings.show_age ?? true,
    show_slip_number: settings.show_slip_number,
    gender_requirement: settings.gender_requirement ?? "optional",
    age_requirement: settings.age_requirement ?? "optional",
  }
}

export function formToSlipSettingsUpdate(
  form: SlipSettingsFormState
): Partial<SlipSettings> {
  return {
    show_patient_name: form.show_patient_name,
    show_gender: form.show_gender,
    show_age: form.show_age,
    show_slip_number: form.show_slip_number,
    gender_requirement: form.gender_requirement,
    age_requirement: form.age_requirement,
  }
}

/** Whether create-slip should treat gender/age as required (when shown). */
export function isSlipFieldRequired(
  settings: Pick<
    SlipSettings,
    | "show_gender"
    | "show_age"
    | "gender_requirement"
    | "age_requirement"
  >,
  field: "gender" | "age"
): boolean {
  if (field === "gender") {
    return settings.show_gender && settings.gender_requirement === "required"
  }
  return settings.show_age && settings.age_requirement === "required"
}
