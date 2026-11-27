import { normalizeRoleSlug } from "./role-utils.ts"
import type { ImportCatalogFilters, LabProductImport } from "../types/lab-product-import"

/** Most products the API accepts in one import. */
export const MAX_IMPORT_PRODUCTS = 500
export const IMPORT_POLL_MS = 3000

/** The API accepts only a lab admin of the lab; superadmin is refused even when acting as one. */
export function canImportProducts(options: {
  activeRole: string | null | undefined
  isSuperadminUser: boolean
  canCreateProduct: boolean
}): boolean {
  return (
    !options.isSuperadminUser &&
    options.canCreateProduct &&
    normalizeRoleSlug(options.activeRole) === "lab_admin"
  )
}

export function buildCatalogQuery(
  customerId: number,
  filters: ImportCatalogFilters,
  extra: Record<string, string | number | undefined> = {},
): string {
  const params = new URLSearchParams({ customer_id: String(customerId) })
  const values: Record<string, string | number | null | undefined> = {
    q: filters.q?.trim(),
    category_id: filters.category_id,
    subcategory_id: filters.subcategory_id,
    import_state: filters.import_state === "all" ? undefined : filters.import_state,
    ...extra,
  }
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value))
  }
  return params.toString()
}

/** Adds or removes ids, never going over the API limit. */
export function setSelected(selection: Set<number>, ids: number[], selected: boolean): Set<number> {
  const next = new Set(selection)
  for (const id of ids) {
    if (!selected) next.delete(id)
    else if (next.size < MAX_IMPORT_PRODUCTS) next.add(id)
  }
  return next
}

export interface ReimportProduct {
  id: number
  name: string
}

export function isImportActive(run: Pick<LabProductImport, "status"> | null | undefined): boolean {
  return run?.status === "queued" || run?.status === "processing"
}

export function importProgressPercent(run: Pick<LabProductImport, "total" | "items">): number {
  if (!run.total) return 0
  return Math.min(100, Math.round((run.items.length / run.total) * 100))
}

export interface ImportApiError {
  status?: number
  code?: string
  body?: any
}

/** Reads the `error` code from a failed ApiService request. */
export function readImportError(error: unknown): ImportApiError {
  const e = (error ?? {}) as { status?: number; body?: any }
  return { status: e.status, code: typeof e.body?.error === "string" ? e.body.error : undefined, body: e.body }
}
