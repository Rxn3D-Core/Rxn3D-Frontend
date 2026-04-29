/**
 * Offices finish the onboarding wizard after business hours — no invite/offices step required.
 * Labs still need both `onboarding_completed` and business hours per existing product rules.
 */
export function isCustomerProfileOnboardingWizardComplete(
  customer: {
    type?: "lab" | "office" | string
    onboarding_completed?: boolean
    business_hours_setup_completed?: boolean
  } | null | undefined,
): boolean {
  if (!customer) return false
  const bh = customer.business_hours_setup_completed === true
  const oc = customer.onboarding_completed === true
  const t = (customer.type || "").toLowerCase()
  if (t === "office") {
    return bh
  }
  return oc && bh
}

export function isOnboardingStatusWizardComplete(
  status: {
    type: "lab" | "office"
    onboarding_completed: boolean
    business_hours_setup_completed: boolean
  } | null,
): boolean {
  if (!status) return false
  return isCustomerProfileOnboardingWizardComplete(status)
}
