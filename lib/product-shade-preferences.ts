/** Lab-configured default shade on a product (persisted as is_preferred on pivot / detail row). */

export function rowIsPreferred(row: { is_preferred?: string; pivot?: { is_preferred?: string } } | null | undefined): boolean {
  if (!row) return false
  return row.is_preferred === "Yes" || row.pivot?.is_preferred === "Yes"
}

function isActiveShade(row: { status?: string } | null | undefined): boolean {
  if (!row) return false
  return !row.status || row.status === "Active"
}

/** Flat gum shade list from product details (e.g. /v1/library/products/:id). */
export function getPreferredLabGumShade(product: { gum_shades?: unknown } | null | undefined): Record<string, unknown> | null {
  const list = product?.gum_shades
  if (!Array.isArray(list)) return null
  const hit = list.find((s: any) => isActiveShade(s) && rowIsPreferred(s))
  return (hit as Record<string, unknown>) ?? null
}

/**
 * Teeth shades may be a flat list or brand groups (`shades` / `teeth_shades` on each brand).
 */
export function getPreferredLabTeethShade(product: { teeth_shades?: unknown } | null | undefined): Record<string, unknown> | null {
  const raw = product?.teeth_shades
  if (!Array.isArray(raw)) return null

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const e = entry as Record<string, unknown>
    if (isActiveShade(e as { status?: string }) && rowIsPreferred(e as { is_preferred?: string; pivot?: { is_preferred?: string } })) {
      return e
    }
  }

  for (const brand of raw) {
    if (!brand || typeof brand !== "object") continue
    const b = brand as Record<string, unknown>
    const shades = (b.shades ?? b.teeth_shades) as unknown
    if (!Array.isArray(shades)) continue
    const hit = shades.find(
      (s: unknown) =>
        s &&
        typeof s === "object" &&
        isActiveShade(s as { status?: string }) &&
        rowIsPreferred(s as { is_preferred?: string; pivot?: { is_preferred?: string } }),
    ) as Record<string, unknown> | undefined
    if (hit) {
      const brandObj = b.brand as { id?: number; name?: string } | undefined
      const brandId = typeof b.id === "number" ? b.id : brandObj?.id
      return { ...hit, brand: brandId != null ? { id: brandId, name: brandObj?.name } : hit.brand }
    }
  }

  return null
}

export function normalizeSinglePreferredShadeRow<T extends { is_preferred?: string } & Record<string, unknown>>(
  rows: T[] | undefined,
): T[] {
  if (!Array.isArray(rows) || rows.length === 0) return rows ?? []
  let kept = false
  return rows.map((row) => {
    if (row.is_preferred !== "Yes") return row
    if (kept) return { ...row, is_preferred: "No" as const }
    kept = true
    return row
  })
}

/** Gum shade auto-default should wait until teeth shade is done when the product offers both. */
export function canAutoApplyPreferredGum(
  product: { gum_shades?: unknown; teeth_shades?: unknown } | null | undefined,
  getTeethShadeFieldValue: () => string | undefined,
): boolean {
  const gums = product?.gum_shades
  if (!Array.isArray(gums) || gums.length === 0) return false
  const teeth = product?.teeth_shades
  const hasTeethShades = Array.isArray(teeth) && teeth.length > 0
  if (!hasTeethShades) return true
  const teethVal = getTeethShadeFieldValue()
  return Boolean(teethVal && String(teethVal).trim() !== "")
}
