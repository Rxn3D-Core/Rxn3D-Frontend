/**
 * RXN-90: lab invoicing mode (stage based / product based per arch).
 * Shapes follow the RXN-90 design contract (newer `{ success, message, data }` envelope).
 * Money comes from the API as 2-decimal strings.
 */

export type InvoicingMode = "stage" | "product"
export type ArchType = "Upper" | "Lower"
export type ChargeFrequency = "per_stage" | "per_case"
export type ProductInvoiceStatus = "pending" | "checked" | "billed" | "paid" | "overdue"
export type CancellationChoice = "full" | "partial" | "none"
export type PartialType = "amount" | "percent"

export interface UserRef {
  id: number
  first_name?: string | null
  last_name?: string | null
}

/** `data` of GET/PUT /v1/slip-settings/invoicing */
export interface InvoicingSettings {
  invoicing_mode: InvoicingMode
  options?: InvoicingMode[]
  can_edit: boolean
  applies_to?: "new_cases" | string
  updated_at?: string | null
  updated_by?: UserRef | null
}

/** One row of GET /v1/billing/product-invoices */
export interface ProductInvoiceListItem {
  id: number
  invoice_kind?: "product"
  invoice_number: string
  case_id: number
  case_number?: string | null
  patient_name?: string | null
  arch: ArchType
  lab_id?: number
  office_id?: number
  office_name?: string | null
  status: ProductInvoiceStatus | string
  total_amount: string | number
  finalized_reason?: "completed" | "cancelled" | "mixed" | "manual" | string | null
  finalized_at?: string | null
  on_statement?: boolean
  statement_id?: number | null
  products_count?: number
  created_at?: string | null
  /**
   * Optional row fields so the list can look like the slip listing (requested from the backend after RXN-90 v1;
   * absent on the first release). Each is read when present and otherwise derived from `products[].sections`.
   */
  office_code?: string | null
  /** Latest slip of the arch, for the "View virtual slip" action. */
  slip_id?: number | null
  product_name?: string | null
  grade_name?: string | null
  variation_name?: string | null
  base_total?: string | number | null
  addons?: ProductInvoiceListAddon[] | null
  sub_total?: string | number | null
  rush_percentage?: string | number | null
  rush_fee?: string | number | null
  gross_amount?: string | number | null
  due_date?: string | null
  products?: ProductInvoiceListProduct[] | null
}

export interface ProductInvoiceListAddon {
  name?: string | null
  addon_name?: string | null
  quantity?: number | string | null
  price?: string | number | null
  total?: string | number | null
}

/** Per-product block of a list row (when the API sends one); `sections` lets the UI derive missing totals. */
export interface ProductInvoiceListProduct {
  product_id?: number
  product_name?: string | null
  grade_name?: string | null
  variation_name?: string | null
  status?: string | null
  base_total?: string | number | null
  addons?: ProductInvoiceListAddon[] | null
  sub_total?: string | number | null
  rush_percentage?: string | number | null
  rush_fee?: string | number | null
  gross_amount?: string | number | null
  product_total?: string | number | null
  sections?: ProductInvoiceSection[] | null
}

export interface ProductInvoicePagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

export interface ProductInvoiceListResult {
  data: ProductInvoiceListItem[]
  pagination: ProductInvoicePagination
}

export interface ProductInvoiceListParams {
  lab_id?: number
  office_id?: number
  status?: string
  case_id?: number
  arch?: ArchType
  date_from?: string
  date_to?: string
  search?: string
  not_on_statement?: boolean
  per_page?: number
  page?: number
}

export type ProductInvoiceLineType =
  | "stage_base"
  | "material"
  | "retention"
  | "addon"
  | "advance_field"
  | "implant"
  | "abutment"
  | "rush"
  | "cancellation_charge"

export interface ProductInvoiceLine {
  id: number
  line_type: ProductInvoiceLineType | string
  ref_id?: number | null
  name?: string | null
  option_name?: string | null
  teeth_number?: string | null
  price: string | number
  quantity?: number | null
  total: string | number
  charge_frequency?: ChargeFrequency | null
  frequency_waived?: boolean
}

export interface ProductInvoiceSection {
  id: number
  kind: "stage" | "cancellation"
  slip_id?: number | null
  slip_number?: string | null
  slip_product_id?: number | null
  stage_id?: number | null
  stage_name?: string | null
  stage_sequence?: number | null
  is_remake?: boolean
  is_reference?: boolean
  is_teeth_based_price?: boolean
  teeth_count?: number | null
  grade_name?: string | null
  variation_name?: string | null
  rush_percentage?: string | number | null
  subtotal_before_rush?: string | number | null
  rush_fee?: string | number | null
  section_total: string | number
  accrued_at?: string | null
  lines: ProductInvoiceLine[]
}

export interface CancellationDecision {
  choice: CancellationChoice
  partial_type?: PartialType | null
  partial_value?: string | number | null
  reference_total?: string | number | null
  charge_amount?: string | number | null
  notes?: string | null
  decided_by?: UserRef | null
  decided_at?: string | null
}

export interface ProductInvoiceProduct {
  product_id: number
  product_name: string
  product_code?: string | null
  status: "completed" | "cancelled" | string
  product_total: string | number
  cancellation?: CancellationDecision | null
  sections: ProductInvoiceSection[]
}

/** `data` of GET /v1/billing/product-invoices/{id} */
export interface ProductInvoiceDetail {
  id: number
  invoice_kind?: "product"
  invoice_number: string
  case: { id: number; case_number?: string | null; patient_name?: string | null; invoicing_mode?: InvoicingMode }
  arch: ArchType
  lab?: { id: number; name?: string | null } | null
  office?: { id: number; name?: string | null } | null
  status: ProductInvoiceStatus | string
  finalized_reason?: string | null
  finalized_at?: string | null
  on_statement?: boolean
  statement_id?: number | null
  /** Backend's lock flag (billed/paid/overdue or on a statement). */
  is_locked?: boolean
  notes?: string | null
  total_amount: string | number
  products: ProductInvoiceProduct[]
}

/** One product of GET /v1/slip/{slipId}/cancellation-billing */
export interface CancellationBillingProduct {
  arch: ArchType
  product_id: number
  product_name: string
  status?: string
  completed_stages: Array<{
    section_id: number
    stage_name?: string | null
    section_total: string | number
    accrued_at?: string | null
  }>
  current_stage?: { slip_id?: number; stage_name?: string | null; estimated_total?: string | number | null } | null
  reference_total: string | number
  full_amount: string | number
  decision?: CancellationDecision | null
}

export interface CancellationBillingData {
  case_id: number
  invoicing_mode: InvoicingMode
  products: CancellationBillingProduct[]
  invoices?: Array<{ id: number; arch: ArchType; invoice_number: string; total_amount: string | number }>
}

export interface CancellationDecisionInput {
  arch: ArchType
  product_id: number
  choice: CancellationChoice
  partial_type?: PartialType
  partial_value?: number
  notes?: string
}
