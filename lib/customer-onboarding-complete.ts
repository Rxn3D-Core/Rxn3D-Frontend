/**
 * Offices finish the onboarding wizard after business hours — no invite/offices step required.
 * Labs with deferred library clone only need business hours to finish the wizard; catalog setup
 * happens later from the lab dashboard.
 */
export function isCustomerProfileOnboardingWizardComplete(
  customer: {
    type?: "lab" | "office" | string
    onboarding_completed?: boolean
    business_hours_setup_completed?: boolean
    defer_product_library_clone?: boolean
  } | null | undefined,
): boolean {
  if (!customer) return false
  const bh = customer.business_hours_setup_completed === true
  const oc = customer.onboarding_completed === true
  const t = (customer.type || "").toLowerCase()
  if (t === "office") {
    return bh
  }
  if (t === "lab" && customer.defer_product_library_clone === true) {
    return bh
  }
  return oc && bh
}

export function isOnboardingStatusWizardComplete(
  status: {
    type: "lab" | "office"
    onboarding_completed: boolean
    business_hours_setup_completed: boolean
    defer_product_library_clone?: boolean
  } | null,
): boolean {
  if (!status) return false
  return isCustomerProfileOnboardingWizardComplete(status)
}

export function isLabProductLibrarySetupPending(
  customer: {
    type?: string
    product_library_clone_completed?: boolean
  } | null | undefined,
): boolean {
  if (!customer) return false
  if ((customer.type || "").toLowerCase() !== "lab") return false
  return customer.product_library_clone_completed !== true
}
