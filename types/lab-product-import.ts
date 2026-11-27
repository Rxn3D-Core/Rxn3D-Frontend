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
  imported: Array<{ id: number; name: string }>
}

export interface LinkedItem {
  id: number
  name: string
  status: string | null
  is_default?: string | null
  is_required?: string | null
  is_optional?: string | null
  min_teeth?: number | null
  max_teeth?: number | null
  variation?: string | null
  variations?: string[]
  brand?: string | null
  price?: string | number | null
}

export interface ImportProductDetail extends ImportCatalogProduct {
  settings: Record<string, string | number | boolean | null>
  price_tiers: Array<{ min_teeth: number; max_teeth: number | null; total_price: string | number }>
  grades: LinkedItem[]
  stages: LinkedItem[]
  impressions: LinkedItem[]
  materials: LinkedItem[]
  retentions: LinkedItem[]
  retention_options: LinkedItem[]
  gum_shades: LinkedItem[]
  teeth_shades: LinkedItem[]
  addons: LinkedItem[]
  extractions: LinkedItem[]
  opposite_extractions: LinkedItem[]
  variations: Array<{ id: number; name_template: string | null; teeth_spec: string | null; days: number | null; image_url: string | null }>
  jaw_images: Array<{ jaw_type: string; image_url: string | null }>
  default_tooth_chart: Array<{ tooth_number: number; chart_type: string | null; retention_option: string | null; extraction: string | null }>
  implants: Array<{ id: number; name: string; platforms: string[] }>
  advance_fields: Array<{ id: number; name: string; field_type: string | null; is_required: string | null; options: string[] }>
}

export interface ImportResultItem {
  global_product_id: number
  status: "imported" | "failed"
  product_id: number | null
  name: string | null
  warnings: string[]
  error: string | null
}

/** One API request's import, of at most one batch. */
export interface LabProductImport {
  import_id: number
  status: "processing" | "completed" | "failed"
  total: number
  imported_count: number
  failed_count: number
  error: string | null
  items: ImportResultItem[]
}

/** The whole selection, summed over its batches. */
export type ImportRun = Pick<
  LabProductImport,
  "status" | "total" | "imported_count" | "failed_count" | "items"
>
