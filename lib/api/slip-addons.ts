import { apiClient } from "@/lib/api/client"

/** Category → subcategory → addon tree (same shape as product add-ons catalog). */
export interface SlipAddonCategory {
  id: number
  name: string
  code: string
  sequence: number
  subcategories: {
    id: number
    name: string
    code: string
    sequence: number
    addons: {
      id: number
      name: string
      code: string
      type: string
      sequence: number
      price: string | number
      customer?: { id: number; name: string; code: string }
      is_custom?: boolean
      status: string
    }[]
  }[]
}

export interface SlipEligibleAddonsPayload {
  slip_id: number
  upper_addons: SlipAddonCategory[]
  lower_addons: SlipAddonCategory[]
}

export interface SlipLinkedAddon {
  slip_product_id: number
  slip_product_type: "upper" | "lower"
  addon: {
    id: number
    name: string
    code: string
    type: string
    price: string | number
    subcategory?: { id: number; name: string; code: string }
  }
  quantity: number
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface SlipLinkedAddonsPayload {
  slip_id: number
  linked_addons: SlipLinkedAddon[]
}

export interface SlipAddonUpdateItem {
  addon_id: number
  quantity: number
  notes?: string
}

export interface SlipUpdateAddonsRequest {
  slip_id: number
  upper_addons?: SlipAddonUpdateItem[]
  lower_addons?: SlipAddonUpdateItem[]
}

export type SlipArchKey = "maxillary" | "mandibular"

/** API `upper` / `lower` ↔ UI arch keys used by AddOnsModal. */
export function slipProductTypeToArch(type: string): SlipArchKey | null {
  const t = type.trim().toLowerCase()
  if (t === "upper") return "maxillary"
  if (t === "lower") return "mandibular"
  return null
}

export function archToSlipProductType(arch: SlipArchKey): "upper" | "lower" {
  return arch === "maxillary" ? "upper" : "lower"
}

function unwrapOne<T>(raw: unknown): T {
  if (raw && typeof raw === "object" && "data" in (raw as object)) {
    return (raw as { data: T }).data
  }
  return raw as T
}

/** POST /slip/eligible-addons */
export async function getEligibleSlipAddons(slipId: number): Promise<SlipEligibleAddonsPayload> {
  const response = await apiClient.post<unknown>("/slip/eligible-addons", { slip_id: slipId })
  return unwrapOne<SlipEligibleAddonsPayload>(response.data)
}

/** POST /slip/linked-addons */
export async function getLinkedSlipAddons(slipId: number): Promise<SlipLinkedAddonsPayload> {
  const response = await apiClient.post<unknown>("/slip/linked-addons", { slip_id: slipId })
  return unwrapOne<SlipLinkedAddonsPayload>(response.data)
}

/** POST /slip/update-addons */
export async function updateSlipAddons(
  payload: SlipUpdateAddonsRequest
): Promise<unknown> {
  const response = await apiClient.post<unknown>("/slip/update-addons", payload)
  return unwrapOne(response.data)
}

/** Flatten category tree into rows for the add-ons table. */
export function flattenSlipAddonCategories(
  categories: SlipAddonCategory[] | null | undefined
): { addonId: number; name: string; code: string; price: number; category: string; subcategory: string; status: string }[] {
  const flat: {
    addonId: number
    name: string
    code: string
    price: number
    category: string
    subcategory: string
    status: string
  }[] = []
  if (!Array.isArray(categories)) return flat
  for (const cat of categories) {
    for (const sub of cat.subcategories ?? []) {
      for (const addon of sub.addons ?? []) {
        const price =
          typeof addon.price === "string" ? parseFloat(addon.price) : Number(addon.price ?? 0)
        flat.push({
          addonId: addon.id,
          name: addon.name,
          code: addon.code,
          price: Number.isFinite(price) ? price : 0,
          category: cat.name,
          subcategory: sub.name,
          status: addon.status ?? "active",
        })
      }
    }
  }
  return flat
}
