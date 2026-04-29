/**
 * Legacy `onboardingComplete` key in localStorage. Onboarding truth comes from the API;
 * remove this after successful complete-onboarding responses so nothing reads a stale flag.
 */
export function clearLegacyOnboardingCompleteLocalFlag(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem("onboardingComplete")
  } catch {
    /* quota / privacy mode — ignore */
  }
}
