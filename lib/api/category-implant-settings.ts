import { resolveLibraryCustomerId } from "@/lib/customer-scope"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

export const IMPLANT_FIELD_KEYS = [
  "implant_brand_system",
  "implant_platform",
  "implant_size",
  "implant_inclusion",
  "abutment",
  "abutment_type",
] as const

export type ImplantFieldKey = (typeof IMPLANT_FIELD_KEYS)[number]
export type ImplantFieldRequirement = "mandatory" | "hidden"

export type ImplantFieldSettings = Record<ImplantFieldKey, ImplantFieldRequirement>

export interface CategoryImplantSettingRow {
  id?: number | null
  customer_id?: number | null
  category_id: number
  category_name: string
  fields: ImplantFieldSettings
}

export const DEFAULT_IMPLANT_FIELD_SETTINGS: ImplantFieldSettings = {
  implant_brand_system: "mandatory",
  implant_platform: "mandatory",
  implant_size: "hidden",
  implant_inclusion: "hidden",
  abutment: "mandatory",
  abutment_type: "hidden",
}

export const IMPLANT_FIELD_LABELS: Record<ImplantFieldKey, string> = {
  implant_brand_system: "Implant brand and system",
  implant_platform: "Implant platform",
  implant_size: "Implant size",
  implant_inclusion: "Implant inclusion",
  abutment: "Abutment",
  abutment_type: "Abutment type",
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function settingsUrl(params?: { customerId?: number | null; categoryId?: number | null }): string {
  const base = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL
  const url = new URL(`${base}/library/category-implant-settings`)
  const customerId =
    params && "customerId" in params ? params.customerId : resolveLibraryCustomerId()
  if (customerId) url.searchParams.set("customer_id", String(customerId))
  if (params?.categoryId) url.searchParams.set("category_id", String(params.categoryId))
  return url.toString()
}

export async function fetchCategoryImplantSettings(options?: {
  customerId?: number | null
  categoryId?: number | null
}): Promise<CategoryImplantSettingRow[]> {
  const res = await fetch(settingsUrl(options), { headers: authHeaders() })
  if (!res.ok) throw new Error("Failed to load implant settings")
  const json = await res.json()
  return parseSettingsResponse(json.data)
}

export async function saveCategoryImplantSettings(
  settings: Array<{ category_id: number; fields: ImplantFieldSettings }>,
  customerId?: number | null
): Promise<CategoryImplantSettingRow[]> {
  const resolvedCustomerId =
    customerId !== undefined ? customerId : resolveLibraryCustomerId()
  const res = await fetch(settingsUrl({ customerId: resolvedCustomerId }), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({
      ...(resolvedCustomerId ? { customer_id: resolvedCustomerId } : {}),
      settings,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || "Failed to save implant settings")
  }
  const json = await res.json()
  return parseSettingsResponse(json.data)
}

function parseSettingsResponse(data: unknown): CategoryImplantSettingRow[] {
  if (!Array.isArray(data)) return []
  return data.map((row: CategoryImplantSettingRow) => ({
    ...row,
    fields: normalizeImplantFieldSettings({
      ...DEFAULT_IMPLANT_FIELD_SETTINGS,
      ...(row.fields ?? {}),
    }),
  }))
}

export function settingsForCategory(
  rows: CategoryImplantSettingRow[],
  categoryId?: number | null
): ImplantFieldSettings {
  if (!categoryId) return DEFAULT_IMPLANT_FIELD_SETTINGS
  const match = rows.find((row) => row.category_id === categoryId)
  return normalizeImplantFieldSettings({
    ...DEFAULT_IMPLANT_FIELD_SETTINGS,
    ...(match?.fields ?? {}),
  })
}

function normalizeImplantFieldSettings(
  fields: ImplantFieldSettings
): ImplantFieldSettings {
  const next = { ...fields }
  for (const key of IMPLANT_FIELD_KEYS) {
    if ((next[key] as string) === "optional") {
      next[key] = "mandatory"
    }
  }
  return next
}

export function isImplantFieldVisible(
  settings: ImplantFieldSettings | undefined,
  key: ImplantFieldKey
): boolean {
  return (settings?.[key] ?? DEFAULT_IMPLANT_FIELD_SETTINGS[key]) !== "hidden"
}

export function isImplantFieldRequired(
  settings: ImplantFieldSettings | undefined,
  key: ImplantFieldKey
): boolean {
  return isImplantFieldVisible(settings, key)
}
