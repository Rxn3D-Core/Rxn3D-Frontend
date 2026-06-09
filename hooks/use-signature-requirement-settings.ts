"use client"

import { useEffect, useState } from "react"
import { getSlipSettings } from "@/lib/api/slip-settings"
import {
  DEFAULT_DRIVER_SIGNATURE_SETTINGS,
  resolveSlipSettingsLabId,
  type DriverSignatureSettings,
} from "@/lib/slip-settings-utils"

export interface SignatureRequirementSettings {
  /** Per-location driver signature toggles (submit-scanned-slips). */
  driverSettings: DriverSignatureSettings
  /** Whether the lab "Ready to Send" action requires a signature. */
  readyToSendRequired: boolean
  loading: boolean
}

const SAFE_DEFAULTS: SignatureRequirementSettings = {
  driverSettings: DEFAULT_DRIVER_SIGNATURE_SETTINGS,
  // Ready-to-send signature defaults OFF (preserve current behavior).
  readyToSendRequired: false,
  loading: false,
}

/**
 * Loads the lab's signature-requirement settings for the resolved lab id.
 * Fetches only while `enabled` (e.g. when a modal is open). On failure it keeps
 * the safe defaults (driver signatures required, ready-to-send optional).
 */
export function useSignatureRequirementSettings(
  enabled: boolean
): SignatureRequirementSettings {
  const [state, setState] = useState<SignatureRequirementSettings>({
    ...SAFE_DEFAULTS,
    loading: enabled,
  })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const labId = resolveSlipSettingsLabId()
    if (!labId) {
      setState({ ...SAFE_DEFAULTS, loading: false })
      return
    }
    setState((prev) => ({ ...prev, loading: true }))
    getSlipSettings(labId)
      .then((settings) => {
        if (cancelled) return
        setState({
          driverSettings: {
            require_signature_pickup_from_office:
              settings.require_signature_pickup_from_office ?? true,
            require_signature_pickup_from_lab:
              settings.require_signature_pickup_from_lab ?? true,
            require_signature_drop_at_lab:
              settings.require_signature_drop_at_lab ?? true,
            require_signature_drop_at_office:
              settings.require_signature_drop_at_office ?? true,
          },
          readyToSendRequired: settings.require_signature_ready_to_send ?? false,
          loading: false,
        })
      })
      .catch(() => {
        if (cancelled) return
        // Keep safe defaults on failure (driver signatures required).
        setState({ ...SAFE_DEFAULTS, loading: false })
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return state
}
