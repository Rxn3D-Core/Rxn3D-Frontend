export type SlipListingProfile = "lab" | "office"

const STORAGE_KEYS: Record<SlipListingProfile, string> = {
  lab: "lab-case-management-page",
  office: "office-case-management-page",
}

const RESTORE_KEYS: Record<SlipListingProfile, string> = {
  lab: "lab-case-management-page-restore",
  office: "office-case-management-page-restore",
}

const LISTING_ROOTS: Record<SlipListingProfile, string> = {
  lab: "/lab-case-management",
  office: "/office-case-management",
}

export const SLIP_LISTING_RESET_PAGE_EVENT = "slip-listing-reset-page"

export function normalizeSlipListingPage(value: unknown): number | null {
  const page = typeof value === "number" ? value : Number(value)
  if (!Number.isInteger(page) || page < 1) return null
  return page
}

/** Match only the listing index roots (no nested routes). */
export function getSlipListingProfileForPath(path: string): SlipListingProfile | null {
  const normalized = path.replace(/\/+$/, "") || "/"
  for (const [profile, root] of Object.entries(LISTING_ROOTS) as [
    SlipListingProfile,
    string,
  ][]) {
    if (normalized === root) return profile
  }
  return null
}

export function loadSlipListingPage(profile: SlipListingProfile): number {
  if (typeof window === "undefined") return 1
  try {
    return normalizeSlipListingPage(window.sessionStorage.getItem(STORAGE_KEYS[profile])) ?? 1
  } catch {
    return 1
  }
}

export function saveSlipListingPage(profile: SlipListingProfile, page: number): void {
  if (typeof window === "undefined") return
  const normalized = normalizeSlipListingPage(page)
  if (!normalized) return
  try {
    window.sessionStorage.setItem(STORAGE_KEYS[profile], String(normalized))
  } catch {
    // ignore quota / private-mode failures
  }
}

/** Mark the current page so the next listing mount can restore it (one-shot). */
export function markSlipListingPageForRestore(
  profile: SlipListingProfile,
  page: number,
): void {
  if (typeof window === "undefined") return
  const normalized = normalizeSlipListingPage(page)
  if (!normalized) return
  try {
    window.sessionStorage.setItem(RESTORE_KEYS[profile], String(normalized))
  } catch {
    // ignore
  }
}

/** Consume a one-shot restore mark; otherwise start at page 1. */
export function consumeSlipListingPage(profile: SlipListingProfile): number {
  if (typeof window === "undefined") return 1
  try {
    const raw = window.sessionStorage.getItem(RESTORE_KEYS[profile])
    window.sessionStorage.removeItem(RESTORE_KEYS[profile])
    return normalizeSlipListingPage(raw) ?? 1
  } catch {
    return 1
  }
}

/** Clear restore state and tell an open listing to jump to page 1. */
export function resetSlipListingPage(profile: SlipListingProfile): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(RESTORE_KEYS[profile])
    window.sessionStorage.setItem(STORAGE_KEYS[profile], "1")
  } catch {
    // ignore
  }
  window.dispatchEvent(
    new CustomEvent(SLIP_LISTING_RESET_PAGE_EVENT, { detail: { profile } }),
  )
}
