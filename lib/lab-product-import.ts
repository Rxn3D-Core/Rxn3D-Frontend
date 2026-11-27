import { normalizeRoleSlug } from "./role-utils.ts"
import type { ImportCatalogFilters, ImportResultItem, ImportRun, LabProductImport } from "../types/lab-product-import"

/** Most products one selection can hold. */
export const MAX_IMPORT_PRODUCTS = 500
/** Products sent per request. The API imports inside the request and accepts at most 10. */
export const IMPORT_BATCH_SIZE = 5

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

export function importProgressPercent(run: Pick<ImportRun, "total" | "items">): number {
  if (!run.total) return 0
  return Math.min(100, Math.round((run.items.length / run.total) * 100))
}

/**
 * Sends the selection batch by batch, reporting progress after each one. A request that fails
 * stops the run: the products already reported stay imported.
 */
export async function runImportInBatches(options: {
  ids: number[]
  confirmIds: number[]
  send: (ids: number[], confirmIds: number[]) => Promise<Pick<LabProductImport, "items">>
  onProgress: (run: ImportRun) => void
}): Promise<{ run: ImportRun; error: unknown }> {
  const { ids, confirmIds, send, onProgress } = options
  const confirmed = new Set(confirmIds)
  const items: ImportResultItem[] = []
  const snapshot = (status: ImportRun["status"]): ImportRun => ({
    status,
    total: ids.length,
    items: [...items],
    imported_count: items.filter((item) => item.status === "imported").length,
    failed_count: items.filter((item) => item.status === "failed").length,
  })

  onProgress(snapshot("processing"))
  for (let start = 0; start < ids.length; start += IMPORT_BATCH_SIZE) {
    const batch = ids.slice(start, start + IMPORT_BATCH_SIZE)
    try {
      const result = await send(batch, batch.filter((id) => confirmed.has(id)))
      items.push(...result.items)
    } catch (error) {
      const run = snapshot("failed")
      onProgress(run)
      return { run, error }
    }
    onProgress(snapshot("processing"))
  }

  const run = snapshot("completed")
  onProgress(run)
  return { run, error: null }
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
