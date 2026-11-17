/**
 * RXN-89: find which products use a library item before it is disabled or deleted.
 *
 * Uses existing endpoints only (no backend change):
 * - impression:       GET /library/impressions/{id}?customer_id=          -> data.products
 * - retention-option: GET /library/retention-options/with-products-categories -> data.data[].products
 * - teeth-shade, gum-shade, material: no reverse lookup exists, so every product is listed
 *   (GET /library/products, all pages) and each product detail (GET /library/products/{id})
 *   is read for teeth_shades[].brand, gum_shades[].brand and materials[].
 *
 * Links whose own status is "Inactive" are ignored: the item is already disabled on that
 * product's configuration, so disabling it does not make the product incomplete.
 *
 * Kept free of React and "@/" imports so it runs under the legacy node:test runner.
 */

export type UsageItemType = "teeth-shade" | "gum-shade" | "material" | "retention-option" | "impression"

export interface UsingProduct {
  id: number
  name: string
}

/** Returns parsed JSON for a GET path relative to the API base URL. Throws on failure. */
export type FetchJson = (path: string) => Promise<any>

/** Max parallel product-detail requests for the shade/material fan-out. */
export const DETAIL_CONCURRENCY = 6
/** Backend caps per_page at 100 for products and retention options. */
export const PAGE_SIZE = 100

const toId = (value: unknown): number | null => {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const isInactive = (status: unknown): boolean => String(status ?? "").toLowerCase() === "inactive"

/** Normalise a raw product list into unique {id, name} rows, skipping links marked Inactive. */
export function toUsingProducts(rows: unknown): UsingProduct[] {
  if (!Array.isArray(rows)) return []
  const seen = new Set<number>()
  const out: UsingProduct[] = []
  for (const row of rows) {
    if (!row || typeof row !== "object") continue
    const r = row as Record<string, any>
    const id = toId(r.id ?? r.product_id)
    if (id === null || seen.has(id)) continue
    const linkStatus = r.lab_impression_status ?? r.link_status ?? r.status
    if (isInactive(linkStatus)) continue
    seen.add(id)
    out.push({ id, name: String(r.name ?? r.product_name ?? `#${id}`) })
  }
  return out
}

/** True when a product detail (GET /library/products/{id}) has an active link to the item. */
export function productDetailUsesItem(detail: any, type: UsageItemType, itemId: number): boolean {
  if (!detail || typeof detail !== "object") return false
  const target = Number(itemId)
  const active = (link: any) => link && !isInactive(link.status)
  switch (type) {
    case "teeth-shade":
      return (Array.isArray(detail.teeth_shades) ? detail.teeth_shades : []).some(
        (s: any) => active(s) && toId(s?.brand?.id ?? s?.brand_id) === target,
      )
    case "gum-shade":
      return (Array.isArray(detail.gum_shades) ? detail.gum_shades : []).some(
        (s: any) => active(s) && toId(s?.brand?.id ?? s?.brand_id) === target,
      )
    case "material":
      return (Array.isArray(detail.materials) ? detail.materials : []).some(
        (m: any) => active(m) && toId(m?.material_id ?? m?.id) === target,
      )
    case "impression":
      return (Array.isArray(detail.impressions) ? detail.impressions : []).some(
        (i: any) => active(i) && toId(i?.impression_id ?? i?.id) === target,
      )
    default:
      return false
  }
}

const withCustomer = (path: string, customerId?: number | null) => {
  if (customerId == null) return path
  return `${path}${path.includes("?") ? "&" : "?"}customer_id=${customerId}`
}

/** Unwrap `{ data: { data: [...], pagination } }` or `{ data: [...], pagination }`. */
function readPage(json: any): { rows: any[]; lastPage: number } {
  const body = json?.data && !Array.isArray(json.data) ? json.data : json
  const rows = Array.isArray(body?.data) ? body.data : []
  const lastPage = Number(body?.pagination?.last_page ?? body?.last_page ?? 1)
  return { rows, lastPage: Number.isFinite(lastPage) && lastPage > 0 ? lastPage : 1 }
}

async function fetchAllPages(fetchJson: FetchJson, basePath: string, customerId?: number | null) {
  const all: any[] = []
  let page = 1
  let lastPage = 1
  do {
    const sep = basePath.includes("?") ? "&" : "?"
    const json = await fetchJson(withCustomer(`${basePath}${sep}per_page=${PAGE_SIZE}&page=${page}`, customerId))
    const result = readPage(json)
    all.push(...result.rows)
    lastPage = result.lastPage
    page += 1
  } while (page <= lastPage)
  return all
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

/**
 * Returns the products that currently use the item (empty when none).
 * Throws if any request fails, so the caller can decide how to fall back.
 */
export async function findProductsUsingItem(params: {
  type: UsageItemType
  itemId: number
  customerId?: number | null
  fetchJson: FetchJson
}): Promise<UsingProduct[]> {
  const { type, itemId, customerId, fetchJson } = params
  const target = Number(itemId)

  if (type === "impression") {
    const json = await fetchJson(withCustomer(`/library/impressions/${target}`, customerId))
    return toUsingProducts(json?.data?.products ?? json?.products)
  }

  if (type === "retention-option") {
    const options = await fetchAllPages(fetchJson, "/library/retention-options/with-products-categories", customerId)
    const option = options.find((o) => toId(o?.id) === target)
    return toUsingProducts(option?.products)
  }

  const products = await fetchAllPages(fetchJson, "/library/products", customerId)
  const listed = toUsingProducts(products.map((p) => ({ id: p?.id, name: p?.name })))
  const flags = await mapWithConcurrency(listed, DETAIL_CONCURRENCY, async (product) => {
    const json = await fetchJson(withCustomer(`/library/products/${product.id}`, customerId))
    return productDetailUsesItem(json?.data ?? json, type, target)
  })
  return listed.filter((_, i) => flags[i])
}
