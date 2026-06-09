import type { FieldRequirement, SlipSettings } from "@/lib/api/slip-settings"
import { getCustomerId } from "@/lib/dashboard-widgets"
import { SLIP_LOCATION_FILTER_OPTIONS } from "@/app/lab-case-management/lab-slip-listing-constants"

export interface SlipSettingsFormState {
  show_patient_name: boolean
  show_gender: boolean
  show_age: boolean
  show_slip_number: boolean
  gender_requirement: FieldRequirement
  age_requirement: FieldRequirement
  require_signature_pickup_from_office: boolean
  require_signature_pickup_from_lab: boolean
  require_signature_drop_at_lab: boolean
  require_signature_drop_at_office: boolean
  require_signature_ready_to_send: boolean
}

export const DEFAULT_SLIP_SETTINGS_FORM: SlipSettingsFormState = {
  show_patient_name: true,
  show_gender: true,
  show_age: true,
  show_slip_number: true,
  gender_requirement: "optional",
  age_requirement: "optional",
  // Pickup/drop signatures default ON; ready-to-send signature defaults OFF.
  require_signature_pickup_from_office: true,
  require_signature_pickup_from_lab: true,
  require_signature_drop_at_lab: true,
  require_signature_drop_at_office: true,
  require_signature_ready_to_send: false,
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
    require_signature_pickup_from_office:
      settings.require_signature_pickup_from_office ?? true,
    require_signature_pickup_from_lab:
      settings.require_signature_pickup_from_lab ?? true,
    require_signature_drop_at_lab: settings.require_signature_drop_at_lab ?? true,
    require_signature_drop_at_office:
      settings.require_signature_drop_at_office ?? true,
    require_signature_ready_to_send:
      settings.require_signature_ready_to_send ?? false,
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
    require_signature_pickup_from_office: form.require_signature_pickup_from_office,
    require_signature_pickup_from_lab: form.require_signature_pickup_from_lab,
    require_signature_drop_at_lab: form.require_signature_drop_at_lab,
    require_signature_drop_at_office: form.require_signature_drop_at_office,
    require_signature_ready_to_send: form.require_signature_ready_to_send,
  }
}

/* ------------------------------------------------------------------ */
/*  Driver signature requirement (submit-scanned-slips)               */
/* ------------------------------------------------------------------ */

/** The four driver-action signature toggles, keyed by slip current location. */
export type DriverSignatureSettings = Pick<
  SlipSettings,
  | "require_signature_pickup_from_office"
  | "require_signature_pickup_from_lab"
  | "require_signature_drop_at_lab"
  | "require_signature_drop_at_office"
>

/**
 * Safe defaults: signatures required. Used before settings load and on fetch
 * failure so behavior never silently drops a required signature.
 */
export const DEFAULT_DRIVER_SIGNATURE_SETTINGS: DriverSignatureSettings = {
  require_signature_pickup_from_office: true,
  require_signature_pickup_from_lab: true,
  require_signature_drop_at_lab: true,
  require_signature_drop_at_office: true,
}

/** slip_locations id → driver signature setting key. */
const LOCATION_ID_TO_SIGNATURE_KEY: Record<number, keyof DriverSignatureSettings> = {
  1: "require_signature_pickup_from_office", // In office ready to pickup
  4: "require_signature_pickup_from_lab", // In lab ready to pickup
  2: "require_signature_drop_at_lab", // On route to the lab
  5: "require_signature_drop_at_office", // On route to the office
}

function resolveSignatureLocationId(ref: {
  locationId?: number | null
  location?: string | null
}): number | null {
  if (typeof ref.locationId === "number") return ref.locationId
  const label = (ref.location || "").toLowerCase().replace(/\s+/g, " ").trim()
  if (!label) return null
  const match = SLIP_LOCATION_FILTER_OPTIONS.find(
    (o) => o.label.toLowerCase() === label
  )
  return match ? match.id : null
}

/**
 * Whether a driver pickup/drop action at this slip's location requires a
 * signature, per the lab's settings. Locations with no driver action (3, 6)
 * return false.
 */
export function driverActionRequiresSignature(
  ref: { locationId?: number | null; location?: string | null },
  settings: DriverSignatureSettings
): boolean {
  const id = resolveSignatureLocationId(ref)
  if (id == null) return false
  const key = LOCATION_ID_TO_SIGNATURE_KEY[id]
  return key ? settings[key] === true : false
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
