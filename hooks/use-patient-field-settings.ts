"use client"

import { useEffect, useState } from "react"
import { getSlipSettings } from "@/lib/api/slip-settings"
import {
  resolveSlipSettingsLabId,
} from "@/lib/slip-settings-utils"

/**
 * Resolved patient-field flags for the create-slip form.
 * Gender and age are no longer driven by slip header settings — they are
 * collected per product after selection when the product has gender_required
 * or age_required enabled.
 */
export interface PatientFieldSettings {
  showPatientName: boolean
  showGender: boolean
  genderRequired: boolean
  showAge: boolean
  ageRequired: boolean
  isLoading: boolean
}

const DEFAULT_PATIENT_FIELD_SETTINGS: PatientFieldSettings = {
  showPatientName: true,
  showGender: false,
  genderRequired: false,
  showAge: false,
  ageRequired: false,
  isLoading: true,
}

/**
 * Read-only hook that loads slip settings for patient name visibility.
 * Gender/age visibility and requiredness come from product configuration.
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
      setSettings({ ...DEFAULT_PATIENT_FIELD_SETTINGS, isLoading: false })
      return
    }

    setSettings((prev) => ({ ...prev, isLoading: true }))

    getSlipSettings(labId)
      .then((data) => {
        if (cancelled) return
        setSettings({
          showPatientName: data.show_patient_name,
          showGender: false,
          genderRequired: false,
          showAge: false,
          ageRequired: false,
          isLoading: false,
        })
      })
      .catch(() => {
        if (cancelled) return
        setSettings({ ...DEFAULT_PATIENT_FIELD_SETTINGS, isLoading: false })
      })

    return () => {
      cancelled = true
    }
  }, [labIdOverride])

  return settings
}
