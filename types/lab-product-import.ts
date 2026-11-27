// "Import products" from the global library (RXN-138).
// Contract: rxn3d_backend docs/library/LAB_PRODUCT_IMPORT_API_DOCUMENTATION.md

export type ImportState = "all" | "imported" | "not_imported"

export interface ImportCatalogProduct {
  id: number
  name: string
  code: string | null
  image_url: string | null
  price: string | number | null
  category: { id: number; name: string } | null
  subcategory: { id: number; name: string } | null
  is_imported: boolean
  imported_products: Array<{ id: number; name: string; status: string | null }>
}

export interface ImportCatalogFilters {
  q?: string
  category_id?: number | null
  subcategory_id?: number | null
  import_state?: ImportState
}

export interface ImportCatalogPage {
  data: ImportCatalogProduct[]
  pagination: { total: number; per_page: number; current_page: number; last_page: number }
}

export interface ImportCatalogIds {
  ids: number[]
  imported_ids: number[]
}

export interface ImportResultItem {
  global_product_id: number
  status: "imported" | "failed"
  product_id: number | null
  name: string | null
  warnings: string[]
  error: string | null
}

export interface LabProductImport {
  import_id: number
  status: "queued" | "processing" | "completed" | "failed"
  total: number
  imported_count: number
  failed_count: number
  error: string | null
  items: ImportResultItem[]
}
