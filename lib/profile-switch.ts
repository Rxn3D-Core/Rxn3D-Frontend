import { clearSlipCreationStorage } from "@/utils/slip-creation-storage"

/** Clears in-progress slip/case state tied to the previous profile (keeps auth session). */
export function clearProfileScopedStorage(): void {
  if (typeof window === "undefined") return

  clearSlipCreationStorage()

  const extraKeys = [
    "selectedLab",
    "selectedDoctor",
    "selectedLabId",
    "patientData",
  ]

  extraKeys.forEach((key) => localStorage.removeItem(key))
}

/** Hard reload so React state, query cache, and permissions match the new profile. */
export function reloadAppAfterProfileSwitch(redirectTo = "/dashboard"): void {
  if (typeof window === "undefined") return
  clearProfileScopedStorage()
  window.location.assign(redirectTo)
}
