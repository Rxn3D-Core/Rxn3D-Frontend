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

export function serializeRetentionOptionsForApi(
  rows:
    | Array<Partial<ProductRetentionOptionLinkFormRow> & { retention_option_id?: number; status?: string }>
    | undefined,
): ProductRetentionOptionLinkFormRow[] {
  if (!Array.isArray(rows)) return []
  return rows
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

    let id: number | undefined =
      typeof entry.retention_option_id === "number"
        ? entry.retention_option_id
        : typeof entry.retention_option_id === "string"
          ? parseInt(String(entry.retention_option_id), 10)
          : undefined
    if (id != null && Number.isNaN(id)) id = undefined

    const lab = entry.lab_retention_option as { id?: number; name?: string; code?: string } | undefined
    const ro = entry.retention_option as { id?: number; name?: string; code?: string } | undefined
    const pivot = entry.pivot as { retention_option_id?: number | string } | undefined

    if (id == null && typeof lab?.id === "number") id = lab.id
    if (id == null && typeof ro?.id === "number") id = ro.id

    if (id == null && pivot?.retention_option_id != null) {
      const p = pivot.retention_option_id
      if (typeof p === "number" && Number.isFinite(p)) {
        id = p
      } else {
        const parsed = parseInt(String(p).trim(), 10)
        if (!Number.isNaN(parsed)) id = parsed
      }
    }

    /** Product detail payloads often embed the full retention option model as `{ id, name, ... }`. */
    if ((id == null || Number.isNaN(id)) && typeof entry.id === "number") id = entry.id
    if ((id == null || Number.isNaN(id)) && typeof entry.id === "string") {
      const parsedId = parseInt(String(entry.id).trim(), 10)
      if (!Number.isNaN(parsedId)) id = parsedId
    }

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
