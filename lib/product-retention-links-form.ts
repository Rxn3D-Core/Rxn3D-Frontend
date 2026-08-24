/**
 * Normalize product ⇄ retention option link rows for /library/products payloads.
 */

export type ProductRetentionOptionLinkFormRow = {
  retention_option_id: number
  sequence: number
  status: "Active" | "Inactive"
  /** Present on GET embeddings; used to match lab catalog rows whose ids differ. */
  name?: string
  code?: string
}

/** Catalog row used to remap product-link IDs onto library_retention_options.id. */
export type RetentionOptionCatalogMatchRow = {
  id: number
  name?: string | null
  code?: string | null
  global_relationship_id?: number | null
}

type RetentionOptionLinkInput = Partial<ProductRetentionOptionLinkFormRow> & {
  retention_option_id?: number
  status?: string
  name?: string
  code?: string
}

function parsePositiveId(value: unknown): number | undefined {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? parseInt(value.trim(), 10)
        : NaN
  if (!Number.isFinite(n) || n <= 0) return undefined
  return n
}

function normalizeName(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

/**
 * Map a hydrated product-link row onto the catalog id the product modal checkboxes use.
 * Matches exact catalog id, then global_relationship_id, then name, then code.
 */
export function resolveRetentionOptionCatalogId(
  row: RetentionOptionLinkInput,
  catalog: RetentionOptionCatalogMatchRow[],
): number | undefined {
  const rowId = parsePositiveId(row.retention_option_id)
  if (rowId != null) {
    const exact = catalog.find((item) => Number(item.id) === rowId)
    if (exact) return Number(exact.id)
    const byGlobal = catalog.find((item) => parsePositiveId(item.global_relationship_id) === rowId)
    if (byGlobal) return Number(byGlobal.id)
  }

  const rowName = normalizeName(row.name)
  if (rowName) {
    const byName = catalog.find((item) => normalizeName(item.name) === rowName)
    if (byName) return Number(byName.id)
  }

  const rowCode = normalizeName(row.code)
  if (rowCode) {
    const byCode = catalog.find((item) => normalizeName(item.code) === rowCode)
    if (byCode) return Number(byCode.id)
  }

  return rowId
}

export function retentionOptionLinkIdsEqual(
  left: Array<{ retention_option_id?: number }>,
  right: Array<{ retention_option_id?: number }>,
): boolean {
  if (left.length !== right.length) return false
  return left.every(
    (row, index) => Number(row.retention_option_id) === Number(right[index]?.retention_option_id),
  )
}

/** Rewrite form rows so retention_option_id is the catalog (library_retention_options) id. */
export function remapRetentionOptionsToCatalog(
  rows: RetentionOptionLinkInput[] | undefined,
  catalog: RetentionOptionCatalogMatchRow[] | undefined,
): ProductRetentionOptionLinkFormRow[] {
  if (!Array.isArray(rows) || rows.length === 0) return []

  const out: ProductRetentionOptionLinkFormRow[] = []
  const seen = new Set<number>()

  for (const row of rows) {
    const id =
      Array.isArray(catalog) && catalog.length > 0
        ? resolveRetentionOptionCatalogId(row, catalog)
        : parsePositiveId(row.retention_option_id)
    if (id == null || seen.has(id)) continue
    seen.add(id)
    out.push({
      retention_option_id: id,
      sequence: typeof row.sequence === "number" ? row.sequence : out.length + 1,
      status: row.status === "Inactive" ? "Inactive" : "Active",
      ...(row.name ? { name: row.name } : {}),
      ...(row.code ? { code: row.code } : {}),
    })
  }

  return out.map((row, index) => ({ ...row, sequence: index + 1 }))
}

export function serializeRetentionOptionsForApi(
  rows:
    | Array<Partial<ProductRetentionOptionLinkFormRow> & { retention_option_id?: number; status?: string }>
    | undefined,
  catalog?: RetentionOptionCatalogMatchRow[],
): ProductRetentionOptionLinkFormRow[] {
  const source =
    Array.isArray(catalog) && catalog.length > 0 ? remapRetentionOptionsToCatalog(rows, catalog) : rows
  if (!Array.isArray(source)) return []
  return source
    .filter((r) => typeof r.retention_option_id === "number" && !Number.isNaN(r.retention_option_id))
    .map((r, idx) => ({
      retention_option_id: r.retention_option_id as number,
      sequence: typeof r.sequence === "number" ? r.sequence : idx + 1,
      status: r.status === "Inactive" ? "Inactive" : "Active",
    }))
}

/** Build form rows + sequence from GET product retention_options embeddings */
export function hydrateRetentionOptionsFromProduct(
  editingProduct: Record<string, unknown> | null | undefined,
): ProductRetentionOptionLinkFormRow[] {
  if (!editingProduct) return []
  const raw = editingProduct.retention_options
  if (!Array.isArray(raw) || raw.length === 0) return []

  const out: ProductRetentionOptionLinkFormRow[] = []

  raw.forEach((entry: Record<string, unknown>, idx: number) => {
    if (!entry || typeof entry !== "object") return

    const lab = entry.lab_retention_option as { id?: number; name?: string; code?: string } | undefined
    const ro = entry.retention_option as { id?: number; name?: string; code?: string } | undefined
    const pivot = entry.pivot as { retention_option_id?: number | string } | undefined

    // Prefer library_retention_options.id. `lab_retention_option.id` is lab_library_retention_options
    // (a different table) and must not be sent as retention_option_id.
    let id =
      parsePositiveId(entry.retention_option_id) ??
      parsePositiveId(entry.id) ??
      parsePositiveId(ro?.id) ??
      parsePositiveId(pivot?.retention_option_id)

    if (id == null || Number.isNaN(id)) return

    const seq = typeof entry.sequence === "number" ? entry.sequence : idx + 1
    const statusRaw = entry.status
    const status: "Active" | "Inactive" =
      statusRaw === "Inactive" || statusRaw === "inactive" ? "Inactive" : "Active"

    const name =
      typeof entry.name === "string"
        ? entry.name
        : typeof ro?.name === "string"
          ? ro.name
          : typeof lab?.name === "string"
            ? lab.name
            : undefined
    const code =
      typeof entry.code === "string"
        ? entry.code
        : typeof ro?.code === "string"
          ? ro.code
          : typeof lab?.code === "string"
            ? lab.code
            : undefined

    out.push({
      retention_option_id: id,
      sequence: seq,
      status,
      ...(name ? { name } : {}),
      ...(code ? { code } : {}),
    })
  })

  out.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
  return out.map((r, i) => ({ ...r, sequence: i + 1 }))
}

/** Persist product ↔ retention pivot rows (supports optional lab price). */
export function serializeRetentionsForProductApi(rows: unknown[] | undefined): Array<Record<string, unknown>> {
  if (!Array.isArray(rows)) return []
  return rows
    .map((rawUnknown: unknown, idx: number) => {
      const raw =
        rawUnknown !== null && typeof rawUnknown === "object"
          ? (rawUnknown as Record<string, unknown>)
          : {}
      const rid = raw.retention_id
      const retention_id =
        typeof rid === "number" ? rid : typeof rid === "string" ? parseInt(String(rid), 10) : NaN
      const sequence = typeof raw.sequence === "number" ? raw.sequence : idx + 1
      const status =
        raw.status === "Inactive" || raw.status === "inactive" ? ("Inactive" as const) : ("Active" as const)

      const row: Record<string, unknown> = {
        retention_id,
        sequence,
        status,
      }

      const pr = raw.price
      if (pr !== undefined && pr !== null && pr !== "") {
        const parsed = typeof pr === "number" ? pr : parseFloat(String(pr))
        if (!Number.isNaN(parsed)) row.price = Math.min(parsed, 999999.99)
      }

      return row
    })
    .filter((row) => typeof row.retention_id === "number" && Number.isFinite(row.retention_id))
}
