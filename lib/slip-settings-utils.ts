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
  enable_photo_pickup_from_office: boolean
  require_photo_pickup_from_office: boolean
  enable_photo_pickup_from_lab: boolean
  require_photo_pickup_from_lab: boolean
  enable_photo_drop_at_lab: boolean
  require_photo_drop_at_lab: boolean
  enable_photo_drop_at_office: boolean
  require_photo_drop_at_office: boolean
  allow_multiple_pickup_from_office: boolean
  allow_multiple_pickup_from_lab: boolean
  allow_multiple_drop_at_lab: boolean
  allow_multiple_drop_at_office: boolean
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
  enable_photo_pickup_from_office: false,
  require_photo_pickup_from_office: false,
  enable_photo_pickup_from_lab: false,
  require_photo_pickup_from_lab: false,
  enable_photo_drop_at_lab: true,
  require_photo_drop_at_lab: false,
  enable_photo_drop_at_office: true,
  require_photo_drop_at_office: false,
  allow_multiple_pickup_from_office: true,
  allow_multiple_pickup_from_lab: true,
  allow_multiple_drop_at_lab: false,
  allow_multiple_drop_at_office: false,
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
    enable_photo_pickup_from_office:
      settings.enable_photo_pickup_from_office ?? false,
    require_photo_pickup_from_office:
      settings.require_photo_pickup_from_office ?? false,
    enable_photo_pickup_from_lab: settings.enable_photo_pickup_from_lab ?? false,
    require_photo_pickup_from_lab: settings.require_photo_pickup_from_lab ?? false,
    enable_photo_drop_at_lab: settings.enable_photo_drop_at_lab ?? true,
    require_photo_drop_at_lab: settings.require_photo_drop_at_lab ?? false,
    enable_photo_drop_at_office: settings.enable_photo_drop_at_office ?? true,
    require_photo_drop_at_office: settings.require_photo_drop_at_office ?? false,
    allow_multiple_pickup_from_office:
      settings.allow_multiple_pickup_from_office ?? true,
    allow_multiple_pickup_from_lab:
      settings.allow_multiple_pickup_from_lab ?? true,
    allow_multiple_drop_at_lab: settings.allow_multiple_drop_at_lab ?? false,
    allow_multiple_drop_at_office:
      settings.allow_multiple_drop_at_office ?? false,
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
    enable_photo_pickup_from_office: form.enable_photo_pickup_from_office,
    require_photo_pickup_from_office: form.require_photo_pickup_from_office,
    enable_photo_pickup_from_lab: form.enable_photo_pickup_from_lab,
    require_photo_pickup_from_lab: form.require_photo_pickup_from_lab,
    enable_photo_drop_at_lab: form.enable_photo_drop_at_lab,
    require_photo_drop_at_lab: form.require_photo_drop_at_lab,
    enable_photo_drop_at_office: form.enable_photo_drop_at_office,
    require_photo_drop_at_office: form.require_photo_drop_at_office,
    allow_multiple_pickup_from_office: form.allow_multiple_pickup_from_office,
    allow_multiple_pickup_from_lab: form.allow_multiple_pickup_from_lab,
    allow_multiple_drop_at_lab: form.allow_multiple_drop_at_lab,
    allow_multiple_drop_at_office: form.allow_multiple_drop_at_office,
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

/* ------------------------------------------------------------------ */
/*  Driver photo upload (enable + require)                            */
/* ------------------------------------------------------------------ */

export type DriverPhotoSettings = Pick<
  SlipSettings,
  | "enable_photo_pickup_from_office"
  | "require_photo_pickup_from_office"
  | "enable_photo_pickup_from_lab"
  | "require_photo_pickup_from_lab"
  | "enable_photo_drop_at_lab"
  | "require_photo_drop_at_lab"
  | "enable_photo_drop_at_office"
  | "require_photo_drop_at_office"
>

export const DEFAULT_DRIVER_PHOTO_SETTINGS: DriverPhotoSettings = {
  enable_photo_pickup_from_office: false,
  require_photo_pickup_from_office: false,
  enable_photo_pickup_from_lab: false,
  require_photo_pickup_from_lab: false,
  enable_photo_drop_at_lab: true,
  require_photo_drop_at_lab: false,
  enable_photo_drop_at_office: true,
  require_photo_drop_at_office: false,
}

const LOCATION_ID_TO_PHOTO_ENABLE_KEY: Record<
  number,
  keyof DriverPhotoSettings
> = {
  1: "enable_photo_pickup_from_office",
  4: "enable_photo_pickup_from_lab",
  2: "enable_photo_drop_at_lab",
  5: "enable_photo_drop_at_office",
}

const LOCATION_ID_TO_PHOTO_REQUIRE_KEY: Record<
  number,
  keyof DriverPhotoSettings
> = {
  1: "require_photo_pickup_from_office",
  4: "require_photo_pickup_from_lab",
  2: "require_photo_drop_at_lab",
  5: "require_photo_drop_at_office",
}

/* ------------------------------------------------------------------ */
/*  Driver allow-multiple                                             */
/* ------------------------------------------------------------------ */

export type DriverAllowMultipleSettings = Pick<
  SlipSettings,
  | "allow_multiple_pickup_from_office"
  | "allow_multiple_pickup_from_lab"
  | "allow_multiple_drop_at_lab"
  | "allow_multiple_drop_at_office"
>

export const DEFAULT_DRIVER_ALLOW_MULTIPLE_SETTINGS: DriverAllowMultipleSettings =
  {
    allow_multiple_pickup_from_office: true,
    allow_multiple_pickup_from_lab: true,
    allow_multiple_drop_at_lab: false,
    allow_multiple_drop_at_office: false,
  }

const LOCATION_ID_TO_ALLOW_MULTIPLE_KEY: Record<
  number,
  keyof DriverAllowMultipleSettings
> = {
  1: "allow_multiple_pickup_from_office",
  4: "allow_multiple_pickup_from_lab",
  2: "allow_multiple_drop_at_lab",
  5: "allow_multiple_drop_at_office",
}

function resolveSignatureLocationId(ref: {
  locationId?: number | null
  location?: string | null
}): number | null {
  const rawId = ref.locationId
  const numericId =
    typeof rawId === "number"
      ? rawId
      : typeof rawId === "string" && rawId.trim() !== ""
        ? Number(rawId)
        : NaN
  if (Number.isFinite(numericId) && LOCATION_ID_TO_SIGNATURE_KEY[numericId]) {
    return numericId
  }

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

/** Whether photo upload UI is shown for this location. */
export function driverActionPhotoEnabled(
  ref: { locationId?: number | null; location?: string | null },
  settings: DriverPhotoSettings
): boolean {
  const id = resolveSignatureLocationId(ref)
  if (id == null) return false
  const key = LOCATION_ID_TO_PHOTO_ENABLE_KEY[id]
  return key ? settings[key] === true : false
}

/**
 * Whether a proof photo is required for this location (only when photo is
 * enabled for that action).
 */
export function driverActionRequiresPhoto(
  ref: { locationId?: number | null; location?: string | null },
  settings: DriverPhotoSettings
): boolean {
  if (!driverActionPhotoEnabled(ref, settings)) return false
  const id = resolveSignatureLocationId(ref)
  if (id == null) return false
  const key = LOCATION_ID_TO_PHOTO_REQUIRE_KEY[id]
  return key ? settings[key] === true : false
}

/** Whether multiple slips may be submitted together at this location. */
export function driverActionAllowsMultiple(
  ref: { locationId?: number | null; location?: string | null },
  settings: DriverAllowMultipleSettings
): boolean {
  const id = resolveSignatureLocationId(ref)
  // Unknown location: do not allow multi (safer for Add Slip / batching).
  if (id == null) return false
  const key = LOCATION_ID_TO_ALLOW_MULTIPLE_KEY[id]
  if (!key) return false
  return settings[key] === true
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
