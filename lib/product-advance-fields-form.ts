/**
 * Normalize GET product advances link rows into ProductCreateForm.advance_fields shape.
 */

export interface ProductAdvanceFieldLinkFormRow {
  advance_field_id: number
  sequence: number
  status: "Active" | "Inactive"
}

/** Optional display cache for linked table until refetch merges full AdvanceField rows */
export interface ProductAdvanceFieldLinkMeta {
  advance_field_id: number
  field_name?: string
  category_name?: string
  subcategory_name?: string
  customer_id?: number | null
}

function statusFromApi(s: unknown): "Active" | "Inactive" {
  if (s === "Inactive" || s === "inactive") return "Inactive"
  return "Active"
}

/** Accepts pivot array, flattened objects, or nested advance_field from API */
export function normalizeProductAdvanceFieldsFromApi(raw: unknown): ProductAdvanceFieldLinkFormRow[] {
  if (!Array.isArray(raw) || raw.length === 0) return []

  const rows: ProductAdvanceFieldLinkFormRow[] = []
  raw.forEach((item: Record<string, unknown>, idx: number) => {
    if (!item || typeof item !== "object") return

    let id: number | undefined
    let sequence = typeof item.sequence === "number" ? item.sequence : idx + 1
    let status = statusFromApi(item.status)

    const pivot = item.pivot as Record<string, unknown> | undefined
    if (pivot && typeof pivot === "object") {
      const pid =
        (pivot.advance_field_id as number | undefined) ??
        (typeof pivot.advance_field_id === "string"
          ? parseInt(String(pivot.advance_field_id), 10)
          : undefined)
      if (pid != null && !Number.isNaN(pid)) id = pid
      if (typeof pivot.sequence === "number") sequence = pivot.sequence
      status = statusFromApi(pivot.status)
    }

    if (id == null && typeof item.advance_field_id === "number") id = item.advance_field_id
    if (id == null && typeof item.advance_field_id === "string") {
      const parsed = parseInt(String(item.advance_field_id), 10)
      if (!Number.isNaN(parsed)) id = parsed
    }

    const nested = item.advance_field as { id?: number } | undefined
    if (id == null && nested?.id != null) id = nested.id

    // Product GET often returns linked fields as embedded definitions { id, name, field_type, ... }
    // (no advance_field_id / pivot / nested advance_field wrapper)
    if (id == null && typeof item.id === "number" && !Number.isNaN(item.id)) id = item.id
    if (id == null && typeof item.id === "string" && item.id !== "") {
      const parsed = parseInt(String(item.id), 10)
      if (!Number.isNaN(parsed)) id = parsed
    }

    if (id == null || Number.isNaN(id)) return

    rows.push({
      advance_field_id: id,
      sequence,
      status,
    })
  })

  rows.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))

  rows.forEach((r, i) => {
    r.sequence = i + 1
  })

  return rows
}

function asUnknownRecord(o: unknown): Record<string, unknown> | undefined {
  if (!o || typeof o !== "object" || Array.isArray(o)) return undefined
  return o as Record<string, unknown>
}

function pickString(obj: Record<string, unknown> | undefined, keys: readonly string[]): string | undefined {
  if (!obj) return undefined
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === "string" && v.trim() !== "") return v.trim()
  }
  return undefined
}

/** Resolve `name` from nested relation objects keyed by aliases (category, advance_category, …). */
function pickNestedRelationName(obj: Record<string, unknown> | undefined, keys: readonly string[]): string | undefined {
  if (!obj) return undefined
  for (const key of keys) {
    const inner = obj[key]
    const rec = asUnknownRecord(inner)
    if (rec && typeof rec.name === "string" && rec.name.trim() !== "") return rec.name.trim()
  }
  return undefined
}

export function extractAdvanceFieldLinkMetaFromApi(raw: unknown): Map<number, ProductAdvanceFieldLinkMeta> {
  const map = new Map<number, ProductAdvanceFieldLinkMeta>()
  if (!Array.isArray(raw) || raw.length === 0) return map

  for (const item of raw as Record<string, unknown>[]) {
    if (!item || typeof item !== "object") continue
    const nested =
      asUnknownRecord(item.advance_field) ??
      asUnknownRecord(item.field) ??
      asUnknownRecord(item.advanceField)
    const pivot = item.pivot as Record<string, unknown> | undefined

    let id: number | undefined

    if (pivot && typeof pivot === "object" && pivot.advance_field_id != null) {
      id =
        typeof pivot.advance_field_id === "number"
          ? (pivot.advance_field_id as number)
          : parseInt(String(pivot.advance_field_id), 10)
    }
    if (id == null && typeof item.advance_field_id === "number") id = item.advance_field_id
    if (id == null && typeof item.advance_field_id === "string") {
      const parsed = parseInt(String(item.advance_field_id), 10)
      if (!Number.isNaN(parsed)) id = parsed
    }
    if (id == null && nested && typeof nested.id === "number") id = nested.id
    if (id == null && typeof item.id === "number" && !Number.isNaN(item.id)) id = item.id
    if (id == null && typeof item.id === "string" && item.id !== "") {
      const parsed = parseInt(String(item.id), 10)
      if (!Number.isNaN(parsed)) id = parsed
    }

    if (id == null || Number.isNaN(id)) continue

    const cat =
      pickNestedRelationName(nested, ["category", "advance_category", "advance_category_details"]) ??
      pickString(nested, ["category_name", "advance_category_name"]) ??
      pickNestedRelationName(item, ["category", "advance_category"]) ??
      pickString(item, ["category_name", "advance_category_name"])

    const sub =
      pickString(nested, [
        "subcategory_name",
        "advance_subcategory_name",
        "sub_category_name",
        "advance_sub_category_name",
      ]) ??
      pickNestedRelationName(nested, [
        "subcategory",
        "advance_subcategory",
        "advance_sub_categories",
        "sub_category",
        "advance_sub_category",
      ]) ??
      pickString(item, ["subcategory_name", "advance_subcategory_name", "sub_category_name"]) ??
      pickNestedRelationName(item, ["subcategory", "advance_subcategory", "sub_category"])

    const name =
      pickString(nested, ["name", "title", "field_name", "label"]) ??
      pickString(item as Record<string, unknown>, ["name", "title", "field_name", "label"])

    const customerIdRaw =
      (nested?.subcategory as { customer_id?: unknown } | undefined)?.customer_id ??
      (nested?.advance_subcategory as { customer_id?: unknown } | undefined)?.customer_id ??
      (item.subcategory as { customer_id?: unknown } | undefined)?.customer_id ??
      (item.advance_subcategory as { customer_id?: unknown } | undefined)?.customer_id ??
      item.customer_id

    map.set(id, {
      advance_field_id: id,
      field_name: name,
      category_name: typeof cat === "string" ? cat : undefined,
      subcategory_name: typeof sub === "string" ? sub : undefined,
      customer_id:
        customerIdRaw === null || customerIdRaw === undefined
          ? null
          : typeof customerIdRaw === "number"
            ? customerIdRaw
            : parseInt(String(customerIdRaw), 10) || null,
    })
  }

  return map
}

export function serializeAdvanceFieldsForApi(
  rows: ProductAdvanceFieldLinkFormRow[] | undefined,
): ProductAdvanceFieldLinkFormRow[] {
  if (!Array.isArray(rows)) return []
  return rows.map((item, idx) => ({
    advance_field_id: item.advance_field_id,
    sequence: typeof item.sequence === "number" && item.sequence >= 0 ? item.sequence : idx + 1,
    status: item.status === "Inactive" ? "Inactive" : "Active",
  }))
}

/** Pick link rows from product API (handles alternate keys). First non-empty candidate wins — including embedded field rows `{ id, name, field_type, ... }`. */
function pickAdvanceLinksArrayFromProduct(product: Record<string, unknown>): unknown {
  const candidates = [
    product.product_advance_fields,
    product.advance_field_links,
    product.advance_fields,
    product.linked_advance_fields,
  ]
  for (const c of candidates) {
    if (!Array.isArray(c) || c.length === 0) continue
    const first = c[0]
    if (first && typeof first === "object") return c
  }
  return []
}

export function hydrateAdvanceFieldsFormFromProduct(
  editingProduct: Record<string, unknown> | null | undefined,
): Array<ProductAdvanceFieldLinkFormRow & ProductAdvanceFieldLinkMeta> {
  if (!editingProduct) return []
  const raw = pickAdvanceLinksArrayFromProduct(editingProduct as Record<string, unknown>)
  if (!Array.isArray(raw) || raw.length === 0) return []

  const rows = normalizeProductAdvanceFieldsFromApi(raw)
  const meta = extractAdvanceFieldLinkMetaFromApi(raw)
  return rows.map((r) => {
    const m = meta.get(r.advance_field_id)
    return {
      ...r,
      field_name: m?.field_name,
      category_name: m?.category_name,
      subcategory_name: m?.subcategory_name,
      customer_id: m?.customer_id,
    }
  })
}
