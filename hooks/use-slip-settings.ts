"use client"

import { useCallback, useEffect, useState } from "react"
import {
  getSlipSettings,
  updateSlipSettings,
  type SlipSettings,
} from "@/lib/api/slip-settings"
import {
  DEFAULT_SLIP_SETTINGS_FORM,
  formToSlipSettingsUpdate,
  resolveSlipSettingsLabId,
  slipSettingsToForm,
  type SlipSettingsFormState,
} from "@/lib/slip-settings-utils"

export function useSlipSettings() {
  const [labId, setLabId] = useState<number | null>(null)
  const [form, setForm] = useState<SlipSettingsFormState>(DEFAULT_SLIP_SETTINGS_FORM)
  const [initialForm, setInitialForm] = useState<SlipSettingsFormState>(
    DEFAULT_SLIP_SETTINGS_FORM
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const applySettings = useCallback((settings: SlipSettings) => {
    const next = slipSettingsToForm(settings)
    setForm(next)
    setInitialForm(next)
  }, [])

  const load = useCallback(async () => {
    const resolvedLabId = resolveSlipSettingsLabId()
    setLabId(resolvedLabId)

    if (!resolvedLabId) {
      setIsLoading(false)
      setError("No lab selected. Choose a lab location and try again.")
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const settings = await getSlipSettings(resolvedLabId)
      applySettings(settings)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load slip settings"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [applySettings])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(async (): Promise<boolean> => {
    if (!labId) {
      setError("No lab selected. Choose a lab location and try again.")
      return false
    }

    setIsSaving(true)
    setError(null)
    try {
      const updated = await updateSlipSettings(
        labId,
        formToSlipSettingsUpdate(form)
      )
      applySettings(updated)
      return true
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save slip settings"
      setError(message)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [labId, form, applySettings])

  const reset = useCallback(() => {
    setForm(initialForm)
    setError(null)
  }, [initialForm])

  const isDirty =
    JSON.stringify(form) !== JSON.stringify(initialForm)

  return {
    labId,
    form,
    setForm,
    isLoading,
    isSaving,
    isDirty,
    error,
    load,
    save,
    reset,
  }
}
