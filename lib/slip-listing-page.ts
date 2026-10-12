export type SlipListingProfile = "lab" | "office"

const STORAGE_PREFIX = "rxn3d.slip-listing"

function storageKey(profile: SlipListingProfile): string {
  return `${STORAGE_PREFIX}.${profile}.page`
}

/** Positive integer page, or null when the value cannot be a listing page. */
export function normalizeSlipListingPage(value: unknown): number | null {
  const page = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
  if (!Number.isInteger(page) || page < 1) return null
  return page
}

export function loadSlipListingPage(profile: SlipListingProfile): number {
  if (typeof window === "undefined") return 1
  try {
    const raw = sessionStorage.getItem(storageKey(profile))
    if (!raw) return 1
    return normalizeSlipListingPage(JSON.parse(raw)) ?? 1
  } catch {
    return 1
  }
}

export function saveSlipListingPage(profile: SlipListingProfile, page: number): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(storageKey(profile), JSON.stringify(normalizeSlipListingPage(page) ?? 1))
  } catch {
    // Ignore quota / private-mode errors.
  }
}
