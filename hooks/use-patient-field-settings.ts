"use client"

import { useEffect, useState } from "react"
import { getSlipSettings } from "@/lib/api/slip-settings"
import {
  isSlipFieldRequired,
  resolveSlipSettingsLabId,
} from "@/lib/slip-settings-utils"

/**
 * Resolved patient-field flags for the create-slip form, derived from the
 * lab's slip settings. Visibility comes from `show_*` and requiredness from
 * `*_requirement` (only meaningful when the field is shown).
 */
export interface PatientFieldSettings {
  showPatientName: boolean
  showGender: boolean
  genderRequired: boolean
  showAge: boolean
  ageRequired: boolean
  isLoading: boolean
}

/**
 * Defaults preserve the historic behavior (gender shown + required, age shown +
 * optional) while settings load, so the fields don't flicker their required
 * state on first paint.
 */
const DEFAULT_PATIENT_FIELD_SETTINGS: PatientFieldSettings = {
  showPatientName: true,
  showGender: true,
  genderRequired: true,
  showAge: true,
  ageRequired: false,
  isLoading: true,
}

/**
 * Read-only hook that loads the active lab's slip settings and exposes the
 * resolved patient-field flags. Used by the create-slip patient inputs
 * (patient-input header + new-case wizard) to drive field visibility,
 * required styling, and validation. Settings are managed elsewhere
 * (the slip-settings page); this hook only reads them.
 */
export function usePatientFieldSettings(
  labIdOverride?: number | null
): PatientFieldSettings {
  const [settings, setSettings] = useState<PatientFieldSettings>(
    DEFAULT_PATIENT_FIELD_SETTINGS
  )

  useEffect(() => {
    let cancelled = false

    const labId =
      labIdOverride != null ? labIdOverride : resolveSlipSettingsLabId()

    if (!labId) {
      // No lab to read settings for — fall back to defaults but stop loading.
      setSettings({ ...DEFAULT_PATIENT_FIELD_SETTINGS, isLoading: false })
      return
    }

    setSettings((prev) => ({ ...prev, isLoading: true }))

    getSlipSettings(labId)
      .then((data) => {
        if (cancelled) return
        setSettings({
          showPatientName: data.show_patient_name,
          showGender: data.show_gender,
          genderRequired: isSlipFieldRequired(data, "gender"),
          showAge: data.show_age,
          ageRequired: isSlipFieldRequired(data, "age"),
          isLoading: false,
        })
      })
      .catch(() => {
        if (cancelled) return
        // On failure keep historic defaults so the form stays usable.
        setSettings({ ...DEFAULT_PATIENT_FIELD_SETTINGS, isLoading: false })
      })

    return () => {
      cancelled = true
    }
  }, [labIdOverride])

  return settings
}
