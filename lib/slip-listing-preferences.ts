import {
  ALL_COLUMNS,
  type ColumnKey,
} from "@/app/lab-case-management/components/V3FilterBar"

export type SlipListingProfile = "lab" | "office"

const STORAGE_PREFIX = "rxn3d.slip-listing"

function storageKey(profile: SlipListingProfile, suffix: string): string {
  return `${STORAGE_PREFIX}.${profile}.${suffix}`
}

function readJson(key: string): unknown {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore quota / private-mode errors.
  }
}

function parseStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const items = value.filter((item): item is string => typeof item === "string")
  return items
}

const VALID_COLUMN_KEYS = new Set<ColumnKey>(ALL_COLUMNS.map((column) => column.key))
const LOCKED_COLUMN_KEYS = ALL_COLUMNS.filter((column) => column.required).map((column) => column.key)

export function loadSlipListingLocationFilters(profile: SlipListingProfile): string[] | null {
  return parseStringArray(readJson(storageKey(profile, "locations")))
}

export function saveSlipListingLocationFilters(profile: SlipListingProfile, locations: string[]): void {
  writeJson(storageKey(profile, "locations"), locations)
}

export function loadSlipListingStatusFilters(profile: SlipListingProfile): string[] | null {
  return parseStringArray(readJson(storageKey(profile, "statuses")))
}

export function saveSlipListingStatusFilters(profile: SlipListingProfile, statuses: string[]): void {
  writeJson(storageKey(profile, "statuses"), statuses)
}

export function loadSlipListingVisibleColumns(profile: SlipListingProfile): Set<ColumnKey> | null {
  const raw = readJson(storageKey(profile, "visible-columns"))
  if (!Array.isArray(raw)) return null

  const keys = raw.filter(
    (item): item is ColumnKey => typeof item === "string" && VALID_COLUMN_KEYS.has(item as ColumnKey),
  )
  if (keys.length === 0) return null

  for (const key of LOCKED_COLUMN_KEYS) {
    if (!keys.includes(key)) keys.push(key)
  }

  return new Set(keys)
}

export function saveSlipListingVisibleColumns(profile: SlipListingProfile, columns: Set<ColumnKey>): void {
  writeJson(storageKey(profile, "visible-columns"), [...columns])
}
