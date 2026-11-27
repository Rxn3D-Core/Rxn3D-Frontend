import { ApiService } from "@/lib/api-service"
import { buildCatalogQuery } from "@/lib/lab-product-import"
import type {
  ImportCatalogFilters,
  ImportCatalogIds,
  ImportCatalogPage,
  ImportProductDetail,
  LabProductImport,
} from "@/types/lab-product-import"

const BASE = "/library/products/import"

interface Envelope<T> {
  status: boolean
  message: string
  data: T
}

export interface GlobalLibraryOption {
  id: number
  name: string
}

/**
 * Global categories / subcategories for the filters. A plain fetch on purpose: ApiService
 * appends the lab's `customer_id`, which would return the lab's own rows instead.
 */
async function fetchGlobalOptions(path: string): Promise<GlobalLibraryOption[]> {
  const token = localStorage.getItem("token")
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ""}${path}`, {
    headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  const json = await response.json()
  const rows: any[] = json?.data?.data ?? []
  return rows.map((row) => ({ id: row.id, name: row.name || row.sub_name }))
}

export const labProductImportService = {
  async catalog(customerId: number, filters: ImportCatalogFilters, page: number, lang: string) {
    const query = buildCatalogQuery(customerId, filters, { page, per_page: 25, lang })
    const response = await ApiService.get<Envelope<ImportCatalogPage>>(`${BASE}/catalog?${query}`)
    return response.data
  },

  async catalogIds(customerId: number, filters: ImportCatalogFilters) {
    const query = buildCatalogQuery(customerId, filters, { ids_only: 1 })
    const response = await ApiService.get<Envelope<ImportCatalogIds>>(`${BASE}/catalog?${query}`)
    return response.data
  },

  async product(customerId: number, productId: number, lang: string) {
    const response = await ApiService.get<Envelope<ImportProductDetail>>(
      `${BASE}/catalog/${productId}?customer_id=${customerId}&lang=${lang}`,
    )
    return response.data
  },

  /** Imports one batch; answers when it is done. */
  async start(customerId: number, productIds: number[], confirmReimportIds: number[]) {
    const response = await ApiService.post<Envelope<LabProductImport>>(BASE, {
      customer_id: customerId,
      product_ids: productIds,
      confirm_reimport_ids: confirmReimportIds,
    })
    return response.data
  },

  globalCategories(lang: string) {
    return fetchGlobalOptions(`/library/categories?status=Active&per_page=100&lang=${lang}`)
  },

  globalSubcategories(categoryId: number, lang: string) {
    return fetchGlobalOptions(
      `/library/subcategories?category_id=${categoryId}&status=Active&per_page=100&lang=${lang}`,
    )
  },
}
