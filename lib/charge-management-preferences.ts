/** Persisted Charge Management search/filter preferences (per lab/office customer). */

export const CHARGE_MANAGEMENT_PER_PAGE = 100

const STORAGE_PREFIX = "rxn3d.charge-management.filters"

export type ChargeManagementDateRange =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year"
  | "custom"

export interface ChargeManagementFiltersPrefs {
  searchInput: string
  dateFrom: string
  dateTo: string
  officeFilter: string
  page: number
  advDateRange: ChargeManagementDateRange | string
  advItemStatus: string
  showAdvancedFilters: boolean
  activeSource: "list" | "advanced"
  advCategoryId: number | null
  advSubcategoryId: number | null
  advProductId: number | null
  advStageId: number | null
  advAttachment: "all" | "yes" | "no"
  showCasesWithAddon: boolean
  showOnlyChecked: boolean
}

const DATE_RANGES = new Set<string>([
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_year",
  "last_year",
  "custom",
])

function storageKey(customerId: number): string {
  return `${STORAGE_PREFIX}.${customerId}`
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

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function asPositiveInt(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback
}

/** Default filters for first visit (no saved prefs). */
export function defaultChargeManagementFilters(): ChargeManagementFiltersPrefs {
  return {
    searchInput: "",
    dateFrom: "",
    dateTo: "",
    officeFilter: "all",
    page: 1,
    advDateRange: "today",
    advItemStatus: "all",
    showAdvancedFilters: false,
    activeSource: "list",
    advCategoryId: null,
    advSubcategoryId: null,
    advProductId: null,
    advStageId: null,
    advAttachment: "all",
    showCasesWithAddon: false,
    showOnlyChecked: false,
  }
}

export function loadChargeManagementFilters(
  customerId: number | null | undefined,
): ChargeManagementFiltersPrefs | null {
  if (customerId == null || !Number.isFinite(customerId)) return null
  const raw = readJson(storageKey(customerId))
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const defaults = defaultChargeManagementFilters()
  const advDateRange = asString(o.advDateRange, defaults.advDateRange)
  const advAttachment = asString(o.advAttachment, defaults.advAttachment)
  const activeSource = asString(o.activeSource, defaults.activeSource)

  return {
    searchInput: asString(o.searchInput),
    dateFrom: asString(o.dateFrom),
    dateTo: asString(o.dateTo),
    officeFilter: asString(o.officeFilter, "all") || "all",
    page: asPositiveInt(o.page, 1),
    advDateRange: DATE_RANGES.has(advDateRange) ? advDateRange : defaults.advDateRange,
    advItemStatus: asString(o.advItemStatus, "all") || "all",
    showAdvancedFilters: Boolean(o.showAdvancedFilters),
    activeSource: activeSource === "advanced" ? "advanced" : "list",
    advCategoryId: asNullableNumber(o.advCategoryId),
    advSubcategoryId: asNullableNumber(o.advSubcategoryId),
    advProductId: asNullableNumber(o.advProductId),
    advStageId: asNullableNumber(o.advStageId),
    advAttachment:
      advAttachment === "yes" || advAttachment === "no" ? advAttachment : "all",
    showCasesWithAddon: Boolean(o.showCasesWithAddon),
    showOnlyChecked: Boolean(o.showOnlyChecked),
  }
}

export function saveChargeManagementFilters(
  customerId: number | null | undefined,
  prefs: ChargeManagementFiltersPrefs,
): void {
  if (customerId == null || !Number.isFinite(customerId)) return
  writeJson(storageKey(customerId), prefs)
}
