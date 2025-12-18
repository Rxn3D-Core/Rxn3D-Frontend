/**
 * Utility functions for managing slip creation storage
 * Clears all localStorage and sessionStorage items related to slip creation
 */

/**
 * Clears all slip creation related data from localStorage and sessionStorage
 * This includes:
 * - Selected lab, doctor, and patient data
 * - Slip drafts and pending slips
 * - Case design cache
 * - Product selections
 * - Any other slip creation state
 */
export function clearSlipCreationStorage() {
  if (typeof window === "undefined") {
    return
  }

  // Clear localStorage items
  const localStorageKeysToRemove = [
    "selectedLab",
    "selectedDoctor",
    "selectedLabId",
    "slipDraft",
    "caseDesignCache",
    "productTeethSelections",
    "showDentalSlipModal",
    "defaultLabId",
    "patientData",
  ]

  localStorageKeysToRemove.forEach((key) => {
    localStorage.removeItem(key)
  })

  // Clear sessionStorage items
  const sessionStorageKeysToRemove = [
    "pendingSlip",
  ]

  sessionStorageKeysToRemove.forEach((key) => {
    sessionStorage.removeItem(key)
  })

  // Clear persisted state patterns (for case design)
  try {
    const clearPersistedStatePattern = (pattern: RegExp) => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && pattern.test(key)) {
          localStorage.removeItem(key)
        }
      }
    }

    // Clear case design persisted state
    clearPersistedStatePattern(/^case-design-(maxillary|mandibular|selected)/)
  } catch (error) {
    console.error("Error clearing persisted state:", error)
  }

  // Clear slip store (Zustand persisted store)
  try {
    // The slip store is persisted with the key 'slip-store'
    localStorage.removeItem("slip-store")
  } catch (error) {
    console.error("Error clearing slip store:", error)
  }
}

/**
 * Clears only the selection data (lab, doctor, patient)
 * Useful for partial resets without clearing all slip data
 */
export function clearSlipSelections() {
  if (typeof window === "undefined") {
    return
  }

  const selectionKeys = [
    "selectedLab",
    "selectedDoctor",
    "selectedLabId",
  ]

  selectionKeys.forEach((key) => {
    localStorage.removeItem(key)
  })
}

