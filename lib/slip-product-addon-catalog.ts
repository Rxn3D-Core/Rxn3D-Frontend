/** Linked add-on row from POST /slip/linked-addons (subset used for display merge). */
export type SlipLinkedAddonLike = {
  slip_product_type: "upper" | "lower"
  addon?: {
    id?: number
    name?: string
    code?: string
    price?: string | number
    subcategory?: { name?: string; code?: string }
  }
  quantity?: number
}

function slipTypeForArch(arch: "maxillary" | "mandibular"): "upper" | "lower" {
  return arch === "maxillary" ? "upper" : "lower"
}

/** Row shape used by AddOnsModal tables. */
export type SlipAddonCatalogRow = {
  addon: {
    id: number
    name: string
    code: string
    sequence: number
    price: number
    status: string
  }
  category: string
  subcategory: string
}

type CatalogAddonInput = {
  id?: number
  addon_id?: number
  name?: string
  code?: string
  sequence?: number
  status?: string
  price?: string | number | null
  category?: { name?: string } | null
  subcategory?: { name?: string } | null
}

type ApiCategoryShape = {
  name: string
  subcategories: {
    name: string
    addons: SlipAddonCatalogRow["addon"][]
  }[]
}

/** Library catalog product id from a slip line item (`apiProduct` on slip details). */
export function resolveSlipCatalogProductId(
  apiProduct: Record<string, unknown> | null | undefined
): number {
  if (!apiProduct) return 0
  const nested = apiProduct.product as { id?: number } | undefined
  return Number(nested?.id ?? apiProduct.product_id ?? 0)
}

/** Slip line `addons` are often linked selections (`{ addon, quantity }`), not the product catalog. */
export function isSlipLinkedAddonEntry(item: unknown): boolean {
  if (!item || typeof item !== "object") return false
  const row = item as Record<string, unknown>
  const hasNested = !!(row.addon || row.add_on)
  const hasCatalogName = String(row.name ?? "").trim().length > 0
  return hasNested && !hasCatalogName
}

/** Only pre-load entries that look like product-catalog addons, not slip linked rows. */
export function catalogAddonsFromProductPayload(
  raw: unknown
): CatalogAddonInput[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const catalog = raw.filter((item) => !isSlipLinkedAddonEntry(item)) as CatalogAddonInput[]
  return catalog.length > 0 ? catalog : undefined
}

export function flattenProductAddonsToCatalogRows(
  productAddons: CatalogAddonInput[] | null | undefined,
  categories: ApiCategoryShape[] = []
): SlipAddonCatalogRow[] {
  const flat: SlipAddonCatalogRow[] = []
  if (productAddons != null && productAddons.length > 0) {
    for (const a of productAddons) {
      const status = String(a.status ?? "Active").trim().toLowerCase()
      if (status === "inactive") continue
      const addonId = Number(a.addon_id ?? a.id ?? 0)
      const name = String(a.name ?? "").trim()
      if (!addonId || !name) continue
      flat.push({
        addon: {
          id: addonId,
          name,
          code: a.code ?? "",
          sequence: a.sequence ?? 0,
          price:
            typeof a.price === "string" ? parseFloat(a.price) : (a.price ?? 0),
          status: a.status ?? "Active",
        },
        category: a.category?.name ?? a.subcategory?.name ?? "",
        subcategory: a.subcategory?.name ?? "",
      })
    }
    return flat
  }
  for (const cat of categories) {
    for (const subcat of cat.subcategories ?? []) {
      for (const addon of subcat.addons ?? []) {
        const addonId = Number(addon.id ?? 0)
        const name = String(addon.name ?? "").trim()
        if (!addonId || !name) continue
        flat.push({
          addon: { ...addon, id: addonId, name },
          category: cat.name,
          subcategory: subcat.name,
        })
      }
    }
  }
  return flat
}

export function linkedAddonToCatalogRow(
  linked: SlipLinkedAddonLike
): SlipAddonCatalogRow | null {
  const addon = linked.addon
  if (!addon?.id || !String(addon.name ?? "").trim()) return null
  const price =
    typeof addon.price === "string" ? parseFloat(addon.price) : Number(addon.price ?? 0)
  return {
    addon: {
      id: addon.id,
      name: addon.name,
      code: addon.code ?? "",
      sequence: 0,
      price: Number.isFinite(price) ? price : 0,
      status: "Active",
    },
    category: addon.subcategory?.name ?? "",
    subcategory: addon.subcategory?.name ?? "",
  }
}

/** Ensure previously linked slip add-ons appear in the table even if not in the current catalog. */
export function mergeLinkedAddonsIntoCatalog(
  catalog: SlipAddonCatalogRow[],
  linked: SlipLinkedAddonLike[] | undefined,
  arch: "maxillary" | "mandibular"
): SlipAddonCatalogRow[] {
  const type = slipTypeForArch(arch)
  const byId = new Map(catalog.map((r) => [r.addon.id, r]))
  for (const row of linked ?? []) {
    if (row.slip_product_type !== type) continue
    const merged = linkedAddonToCatalogRow(row)
    if (!merged || byId.has(merged.addon.id)) continue
    byId.set(merged.addon.id, merged)
  }
  return [...byId.values()]
}
