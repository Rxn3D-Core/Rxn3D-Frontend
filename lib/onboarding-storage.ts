/**
 * Legacy onboarding flag in localStorage. Source of truth is the API; sync this only after
 * confirmed server success so stale values do not trigger wrong redirects.
 */
export function setLegacyOnboardingCompleteLocalFlagTrue(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem("onboardingComplete", "true")
  } catch {
    /* quota / privacy mode — ignore */
  }
}

