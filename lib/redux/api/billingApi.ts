import { apiSlice } from "./apiSlice"

/** Query params for `GET /billing` (see ListBillingRequest on backend) */
export interface BillingListParams {
  lab_id?: number
  office_id?: number
  status?: "pending" | "paid" | "overdue" | "cancelled" | string
  invoice_number?: string
  patient_name?: string
  doctor_name?: string
  date_from?: string
  date_to?: string
  amount_min?: number
  amount_max?: number
  sort_by?: string
  sort_direction?: "asc" | "desc"
  per_page?: number
  page?: number
}

/** Body for `POST /billing/advanced-search` (AdvancedBillingRequest) */
export interface AdvancedBillingSearchBody {
  search?: string
  patient_name?: string
  office_name?: string
  doctor_name?: string
  case_number?: string
  product_name?: string
  lab_name?: string
  date_range?: "today" | "yesterday" | "last_7_days" | "last_week" | "last_month" | "last_year" | "custom"
  date_from?: string
  date_to?: string
  status?: string
  item_status?: string
  /** Library / billing filter scoping (when supported by API) */
  category_id?: number
  subcategory_id?: number
  product_id?: number
  stage_id?: number
  /** true = has attachment, false = no attachment */
  has_attachment?: boolean
  sort_by?: string
  sort_direction?: "asc" | "desc"
  per_page?: number
  page?: number
}

export interface BillingPagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

export interface BillingProductAddon {
  id?: number
  addon_name?: string | null
  quantity?: number | null
  total?: number | string | null
  /** When present, use for per-addon price updates */
  price?: number | string | null
}

/** Retention line — ids are slip_billing_product_retentions.id (see backend BillingResource) */
export interface BillingRetentionLine {
  id: number
  name?: string | null
  retention_name?: string | null
  price?: number | string | null
  total?: number | string | null
}

/** Advance field line — ids are slip_billing_product_advance_fields.id */
export interface BillingAdvanceFieldLine {
  id: number
  name?: string | null
  advance_field_name?: string | null
  price?: number | string | null
  quantity?: number | null
  line_total?: number | string | null
}

export interface BillingProduct {
  id: number
  slip_product_id?: number
  product_id?: number
  /** Some APIs expose slip billing item id for `POST /billing/items/{id}/notes` */
  billing_item_id?: number
  status?: string | null
  item_status?: string | null
  product_name?: string | null
  product_code?: string | null
  product_type?: string | null
  grade_name?: string | null
  stage_name?: string | null
  teeth_count?: number | null
  base_price?: number | string | null
  material_price?: number | string | null
  rush_fee?: number | string | null
  rush_percentage?: number | string | null
  total_price?: number | string | null
  addons?: BillingProductAddon[]
  retentions?: BillingRetentionLine[]
  advance_fields?: BillingAdvanceFieldLine[]
}

/** Body for `PUT /billing/products/{id}/pricing` (single line; same rules as invoice pricing) */
export interface UpdateBillingProductPricingBody {
  base_price: number
  rush_percentage?: number
  rush_fee?: number
  notes?: string
  addons?: Array<{ id: number; price: number; notes?: string }>
  retentions?: Array<{ id: number; price: number; notes?: string }>
  advance_fields?: Array<{ id: number; price: number; quantity?: number; notes?: string }>
}

/** Line inside `PUT /billing/{invoiceId}/pricing` — full invoice update in one transaction */
export interface UpdateBillingInvoicePricingProductLine {
  id: number
  base_price?: number
  material_price?: number
  quantity?: number
  teeth_count?: number
  rush_percentage?: number
  addons?: Array<{ id: number; price?: number; quantity?: number }>
  retentions?: Array<{ id: number; price?: number }>
  advance_fields?: Array<{ id: number; price?: number; quantity?: number }>
  edit_reason?: string
  notes?: string
}

/** `PUT /billing/{id}/pricing` — see rxn3d_backend FRONTEND_INVOICE_DETAIL_AND_PRICING_API.md */
export interface UpdateBillingInvoicePricingBody {
  products: UpdateBillingInvoicePricingProductLine[]
  edit_reason?: string
  notes?: string
}

export interface BillingInvoice {
  id: number
  slip_id: number
  invoice_number?: string | null
  total_amount?: number | string | null
  status?: string | null
  billing_details?: unknown
  is_manually_edited?: boolean
  last_edited_at?: string | null
  last_edited_by?: { id?: number; name?: string | null; email?: string | null } | null
  edit_logs?: unknown[]
  slip?: {
    id?: number
    slip_number?: string | null
    status?: string | null
    case?: {
      id?: number
      case_number?: string | null
      patient_name?: string | null
      doctor?: string | null
      case_status?: string | null
      created_at?: string | null
    } | null
  } | null
  lab?: { id?: number; name?: string | null; email?: string | null; phone?: string | null } | null
  office?: { id?: number; name?: string | null; email?: string | null; phone?: string | null } | null
  products?: BillingProduct[]
  created_at?: string | null
  updated_at?: string | null
}

export interface BillingListResult {
  data: BillingInvoice[]
  pagination: BillingPagination
}

export interface StatementListParams {
  search?: string
  office_code?: string
  recipient_email?: string
  statement_id?: string
  direction?: "outgoing" | "incoming"
  payment_status?: "sent" | "billed" | "paid" | "overdue" | "disputed" | "refunded"
  is_disputed?: boolean
  is_overdue?: boolean
  date_from?: string
  date_to?: string
  due_date_from?: string
  due_date_to?: string
  amount_min?: number
  amount_max?: number
  sort_by?:
    | "created_at"
    | "updated_at"
    | "statement_id"
    | "office_name"
    | "lab_name"
    | "recipient_email"
    | "date_sent"
    | "due_date"
    | "amount_due"
    | "direction"
    | "payment_status"
  sort_direction?: "asc" | "desc"
  per_page?: number
  page?: number
}

export interface StatementParty {
  id?: number | null
  name?: string | null
  email?: string | null
  phone?: string | null
  code?: string | null
  address?: string | null
}

export interface StatementHistoryEntry {
  id?: number
  action?: string | null
  old_status?: string | null
  new_status?: string | null
  notes?: string | null
  created_at?: string | null
}

export interface StatementBillingItem {
  id?: number
  amount?: number | string | null
  status?: string | null
  patient_name?: string | null
  product_name?: string | null
}

export interface StatementRecord {
  id: number
  statement_id?: string | null
  office_id?: number | null
  lab_id?: number | null
  direction?: "outgoing" | "incoming" | string | null
  recipient_email?: string | null
  cc_emails?: string[]
  bcc_emails?: string[]
  subject?: string | null
  message?: string | null
  amount_due?: number | string | null
  date_sent?: string | null
  due_date?: string | null
  payment_status?: "sent" | "billed" | "paid" | "overdue" | "disputed" | "refunded" | string | null
  status?: string | null
  statement_type?: string | null
  template_used?: string | null
  pdf_path?: string | null
  is_disputed?: boolean | null
  dispute_reason?: string | null
  dispute_notes?: string | null
  auto_mark_billed?: boolean | null
  is_overdue?: boolean | null
  created_at?: string | null
  updated_at?: string | null
  office?: StatementParty | null
  lab?: StatementParty | null
  billing_items?: StatementBillingItem[]
  history?: StatementHistoryEntry[]
}

export interface StatementListResult {
  data: StatementRecord[]
  pagination: BillingPagination
}

export interface StatementSummary {
  outgoing?: number
  incoming?: number
  overdue?: number
  disputed?: number
  total_amount?: number | string
  total_statements?: number
}

export interface StatementEmailPreview {
  subject?: string | null
  recipient_email?: string | null
  cc_emails?: string[]
  bcc_emails?: string[]
  message?: string | null
  template?: string | null
  preview_html?: string | null
}

export interface SendStatementBody {
  recipient_email: string
  cc_emails?: string[]
  bcc_emails?: string[]
  subject: string
  message?: string
  template?: string
  include_pdf?: boolean
}

export interface GenerateStatementBody {
  billing_ids: number[]
  office_id: number
  direction: "outgoing" | "incoming"
  template?: string
  auto_mark_billed?: boolean
}

export interface StatementPdfResult {
  pdf_url?: string
  download_url?: string
}

/** GET /billing/statistics — backend returns scoped aggregates */
export interface BillingStatistics {
  total_invoices?: number
  total_amount?: number | string
  status_breakdown?: Record<string, number>
  monthly_data?: unknown[]
  average_invoice_amount?: number
  [key: string]: unknown
}

export interface BulkBillingActionBody {
  billing_ids: number[]
  action: "mark_checked" | "mark_billed" | "mark_refund" | "refresh_charges" | "send_statement"
  notes?: string
  email_template?: string
  send_email?: boolean
}

export interface UpdateBillingInvoiceStatusBody {
  status: "pending" | "paid" | "overdue" | "cancelled"
  notes?: string
  payment_date?: string
  payment_method?: string
  payment_reference?: string
}

export interface UpdateBillingItemStatusBody {
  status: "unbilled" | "checked" | "billed" | "paid" | "refund" | "dispute"
  notes?: string
  refund_amount?: number
  refund_reason?: string
}

export interface UpdateBillingItemPriceBody {
  base_price: number
  rush_fee?: number
  notes?: string
}

export interface SendStatementEmailBody {
  email: string
  template?: string
  message?: string
  include_pdf?: boolean
}

function buildBillingQueryString(params: BillingListParams): string {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    searchParams.append(key, String(value))
  })
  const qs = searchParams.toString()
  return qs ? `?${qs}` : ""
}

function emptyPagination(): BillingPagination {
  return {
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
    from: null,
    to: null,
  }
}

function unwrapBillingList(response: { success?: boolean; data?: BillingListResult }): BillingListResult {
  const inner = response?.data
  if (!inner) {
    return { data: [], pagination: emptyPagination() }
  }
  return {
    data: Array.isArray(inner.data) ? inner.data : [],
    pagination: inner.pagination ?? emptyPagination(),
  }
}

function unwrapStatementList(response: {
  success?: boolean
  data?: StatementRecord[]
  meta?: Partial<BillingPagination> & { total?: number }
}): StatementListResult {
  return {
    data: Array.isArray(response?.data) ? response.data : [],
    pagination: {
      current_page: response?.meta?.current_page ?? 1,
      last_page: response?.meta?.last_page ?? 1,
      per_page: response?.meta?.per_page ?? 15,
      total: response?.meta?.total ?? 0,
      from: null,
      to: null,
    },
  }
}

export interface CreditTransaction {
  id: string
  type: "purchase" | "usage" | "refund"
  amount: number
  credits: number
  description: string
  timestamp: string
  status: string
  transactionId?: string
}

export const billingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // --- Core list & detail ---
    listBillingInvoices: builder.query<BillingListResult, BillingListParams>({
      query: (params) => `/billing${buildBillingQueryString(params)}`,
      transformResponse: (response: {
        success?: boolean
        data?: BillingListResult
      }): BillingListResult => unwrapBillingList(response),
      providesTags: [{ type: "Billing", id: "LIST" }],
    }),

    listStatements: builder.query<StatementListResult, StatementListParams | void>({
      query: (params) => `/statements${params ? buildBillingQueryString(params) : ""}`,
      transformResponse: (response: {
        success?: boolean
        data?: StatementRecord[]
        meta?: Partial<BillingPagination> & { total?: number }
      }): StatementListResult => unwrapStatementList(response),
      providesTags: [{ type: "Statements", id: "LIST" }],
    }),

    getStatementSummary: builder.query<StatementSummary, void>({
      query: () => "/statements/summary",
      transformResponse: (response: { success?: boolean; data?: StatementSummary }): StatementSummary => {
        return response?.data ?? {}
      },
      providesTags: [{ type: "Statements", id: "SUMMARY" }],
    }),

    getStatementById: builder.query<StatementRecord, number>({
      query: (id) => `/statements/${id}`,
      transformResponse: (response: { success?: boolean; data?: StatementRecord }): StatementRecord => {
        const data = response?.data
        if (!data) {
          throw new Error("Statement not found")
        }
        return data
      },
      providesTags: (result, error, id) => [{ type: "Statements", id: String(id) }],
    }),

    previewStatementEmail: builder.query<StatementEmailPreview, number>({
      query: (id) => `/statements/${id}/preview-email`,
      transformResponse: (response: { success?: boolean; data?: StatementEmailPreview }): StatementEmailPreview => {
        return response?.data ?? {}
      },
    }),

    sendStatement: builder.mutation<
      { success?: boolean; data?: unknown; message?: string },
      { id: number; body: SendStatementBody }
    >({
      query: ({ id, body }) => ({
        url: `/statements/${id}/send`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Statements", id: "LIST" },
        { type: "Statements", id: "SUMMARY" },
        { type: "Statements", id: String(id) },
      ],
    }),

    generateStatement: builder.mutation<
      { success?: boolean; data?: StatementRecord; message?: string },
      GenerateStatementBody
    >({
      query: (body) => ({
        url: "/statements/generate",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Statements", id: "LIST" },
        { type: "Statements", id: "SUMMARY" },
      ],
    }),

    generateStatementPdf: builder.mutation<
      { success?: boolean; data?: StatementPdfResult; message?: string },
      number
    >({
      query: (id) => ({
        url: `/statements/${id}/generate-pdf`,
        method: "GET",
      }),
    }),

    getBillingStatistics: builder.query<BillingStatistics, BillingListParams | void>({
      query: (params) => `/billing/statistics${params ? buildBillingQueryString(params) : ""}`,
      transformResponse: (response: { success?: boolean; data?: BillingStatistics }): BillingStatistics => {
        return response?.data ?? {}
      },
      providesTags: [{ type: "Billing", id: "STATS" }],
    }),

    advancedBillingSearch: builder.mutation<BillingListResult, AdvancedBillingSearchBody>({
      query: (body) => ({
        url: "/billing/advanced-search",
        method: "POST",
        body,
      }),
      transformResponse: (response: { success?: boolean; data?: BillingListResult }): BillingListResult =>
        unwrapBillingList(response),
    }),

    getBillingInvoiceById: builder.query<BillingInvoice, string | number>({
      query: (id) => `/billing/${id}`,
      transformResponse: (response: { success?: boolean; data?: BillingInvoice }): BillingInvoice => {
        const data = response?.data
        if (!data) {
          throw new Error("Billing invoice not found")
        }
        return data
      },
      providesTags: (result, error, id) => [{ type: "Billing", id: String(id) }],
    }),

    updateBillingInvoiceStatus: builder.mutation<
      { success?: boolean; data?: BillingInvoice; message?: string },
      { id: string | number; body: UpdateBillingInvoiceStatusBody }
    >({
      query: ({ id, body }) => ({
        url: `/billing/${id}/status`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Billing", id: "LIST" },
        { type: "Billing", id: String(id) },
        { type: "Billing", id: "STATS" },
      ],
    }),

    deleteBillingInvoice: builder.mutation<{ success: boolean; message?: string }, string | number>({
      query: (id) => ({
        url: `/billing/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Billing", id: "LIST" }, { type: "Billing", id: "STATS" }],
    }),

    bulkBillingAction: builder.mutation<{ success?: boolean; data?: unknown; message?: string }, BulkBillingActionBody>({
      query: (body) => ({
        url: "/billing/bulk-action",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Billing", id: "LIST" }, { type: "Billing", id: "STATS" }],
    }),

    getBillingEmailTemplates: builder.query<unknown, void>({
      query: () => "/billing/email-templates",
      transformResponse: (response: { success?: boolean; data?: unknown }) => response?.data ?? response,
    }),

    generateBillingPdf: builder.mutation<
      {
        success?: boolean
        data?: {
          invoice_pdf?: string
          pdf_url?: string
          download_url?: string
          note?: string
        }
        message?: string
      },
      number
    >({
      query: (billingId) => ({
        url: `/billing/${billingId}/generate-pdf`,
        method: "POST",
      }),
    }),

    downloadBillingPdf: builder.query<Blob, number>({
      query: (billingId) => ({
        url: `/billing/download-pdf/${billingId}`,
        responseHandler: async (response) => {
          if (!response.ok) {
            const text = await response.text()
            throw new Error(text || `HTTP ${response.status}`)
          }
          return response.blob()
        },
      }),
    }),

    generateVirtualStatement: builder.mutation<
      { success?: boolean; data?: { html?: string; print_url?: string }; message?: string },
      number
    >({
      query: (billingId) => ({
        url: `/billing/${billingId}/virtual-statement`,
        method: "POST",
      }),
    }),

    sendStatementEmail: builder.mutation<
      { success?: boolean; data?: unknown; message?: string },
      { billingId: number; body: SendStatementEmailBody }
    >({
      query: ({ billingId, body }) => ({
        url: `/billing/${billingId}/send-statement-email`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Billing", id: "LIST" }],
    }),

    /**
     * Slip module — `POST /slip/{slipId}/regenerate-invoice` (rebuilds billing from slip; replaces invoice).
     * @see rxn3d_backend docs/slip/INVOICE_REGENERATION_API_DOCUMENTATION.md
     */
    regenerateSlipInvoice: builder.mutation<
      { success?: boolean; message?: string; data?: BillingInvoice & { id?: number } },
      number
    >({
      query: (slipId) => ({
        url: `/slip/${slipId}/regenerate-invoice`,
        method: "POST",
      }),
      transformResponse: (response: {
        success?: boolean
        message?: string
        data?: BillingInvoice & { id?: number }
      }) => response,
      invalidatesTags: [{ type: "Billing", id: "LIST" }, { type: "Billing", id: "STATS" }],
    }),

    /** Full invoice pricing in one DB transaction — `PUT /billing/{id}/pricing` */
    updateBillingInvoicePricing: builder.mutation<
      { success?: boolean; data?: BillingInvoice; message?: string },
      { invoiceId: number; body: UpdateBillingInvoicePricingBody }
    >({
      query: ({ invoiceId, body }) => ({
        url: `/billing/${invoiceId}/pricing`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: {
        success?: boolean
        data?: BillingInvoice
        message?: string
      }) => response,
      invalidatesTags: (result, error, { invoiceId }) => [
        { type: "Billing", id: "LIST" },
        { type: "Billing", id: "STATS" },
        { type: "Billing", id: String(invoiceId) },
      ],
    }),

    updateBillingItemStatus: builder.mutation<
      { success?: boolean; message?: string; data?: unknown },
      { itemId: number; body: UpdateBillingItemStatusBody }
    >({
      query: ({ itemId, body }) => ({
        url: `/billing/items/${itemId}/status`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [{ type: "Billing", id: "LIST" }, { type: "Billing", id: "STATS" }],
    }),

    updateBillingItemPrice: builder.mutation<
      { success?: boolean; message?: string; data?: unknown },
      { itemId: number; body: UpdateBillingItemPriceBody }
    >({
      query: ({ itemId, body }) => ({
        url: `/billing/items/${itemId}/price`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [{ type: "Billing", id: "LIST" }],
    }),

    updateBillingProduct: builder.mutation<
      { success?: boolean; data?: unknown; message?: string },
      { productId: number; body: Record<string, unknown> }
    >({
      query: ({ productId, body }) => ({
        url: `/billing/products/${productId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [{ type: "Billing", id: "LIST" }],
    }),

    updateBillingProductPricing: builder.mutation<
      { success?: boolean; data?: unknown; message?: string },
      { productId: number; invoiceId?: number; body: UpdateBillingProductPricingBody }
    >({
      query: ({ productId, body }) => ({
        url: `/billing/products/${productId}/pricing`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { invoiceId }) => [
        { type: "Billing", id: "LIST" },
        { type: "Billing", id: "STATS" },
        ...(invoiceId != null ? [{ type: "Billing" as const, id: String(invoiceId) }] : []),
      ],
    }),

    updateBillingAddonPrice: builder.mutation<
      { success?: boolean; message?: string },
      { addonId: number; body: { price: number; notes?: string } }
    >({
      query: ({ addonId, body }) => ({
        url: `/billing/addons/${addonId}/price`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [{ type: "Billing", id: "LIST" }],
    }),

    updateBillingRetentionPrice: builder.mutation<
      { success?: boolean; message?: string },
      { retentionId: number; body: { price: number; notes?: string } }
    >({
      query: ({ retentionId, body }) => ({
        url: `/billing/retentions/${retentionId}/price`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [{ type: "Billing", id: "LIST" }],
    }),

    updateBillingAdvanceFieldPrice: builder.mutation<
      { success?: boolean; message?: string },
      { fieldId: number; body: { price: number; quantity?: number; notes?: string } }
    >({
      query: ({ fieldId, body }) => ({
        url: `/billing/advance-fields/${fieldId}/price`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [{ type: "Billing", id: "LIST" }],
    }),

    addBillingItemNotes: builder.mutation<
      { success?: boolean; message?: string },
      { itemId: number; body: { notes: string; is_internal?: boolean } }
    >({
      query: ({ itemId, body }) => ({
        url: `/billing/items/${itemId}/notes`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Billing", id: "LIST" }],
    }),

    addBillingItemAddon: builder.mutation<
      { success?: boolean; message?: string },
      { itemId: number; body: { addon_id: number; quantity: number; price?: number; notes?: string } }
    >({
      query: ({ itemId, body }) => ({
        url: `/billing/items/${itemId}/addon`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Billing", id: "LIST" }],
    }),

    getBillingItemSlip: builder.query<unknown, number>({
      query: (itemId) => `/billing/items/${itemId}/slip`,
      transformResponse: (response: { success?: boolean; data?: unknown }) => response?.data ?? response,
    }),

    // Payment endpoints (non-billing-module)
    createPaymentIntent: builder.mutation<{ clientSecret: string }, { amount: number; itemIds: string[] }>({
      query: (data) => ({
        url: "/create-payment-intent",
        method: "POST",
        body: data,
      }),
    }),

    logPayment: builder.mutation<
      { success: boolean; paymentLog: any },
      { amount: number; itemIds: string[]; transactionId: string }
    >({
      query: (data) => ({
        url: "/log-payment",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Billing"],
    }),

    getCreditBalance: builder.query<{ balance: number }, void>({
      query: () => "/credits/balance",
      providesTags: ["Credits"],
    }),

    getCreditTransactions: builder.query<CreditTransaction[], { limit?: number; offset?: number; type?: string }>({
      query: (params) => {
        const queryParams = new URLSearchParams()
        if (params.limit) queryParams.append("limit", params.limit.toString())
        if (params.offset) queryParams.append("offset", params.offset.toString())
        if (params.type) queryParams.append("type", params.type)

        return `/credits/transactions?${queryParams.toString()}`
      },
      providesTags: ["Transactions"],
    }),

    createCreditPurchaseIntent: builder.mutation<{ clientSecret: string }, { amount: number; credits: number }>({
      query: (data) => ({
        url: "/credits/purchase",
        method: "POST",
        body: data,
      }),
    }),

    logCreditPurchase: builder.mutation<
      { success: boolean; newBalance: number },
      { amount: number; credits: number; transactionId: string }
    >({
      query: (data) => ({
        url: "/log-credit-purchase",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Credits", "Transactions"],
    }),
  }),
})

export const {
  useListBillingInvoicesQuery,
  useLazyListBillingInvoicesQuery,
  useListStatementsQuery,
  useGetStatementSummaryQuery,
  useGetStatementByIdQuery,
  useLazyGetStatementByIdQuery,
  useLazyPreviewStatementEmailQuery,
  useSendStatementMutation,
  useGenerateStatementMutation,
  useGenerateStatementPdfMutation,
  useGetBillingStatisticsQuery,
  useAdvancedBillingSearchMutation,
  useGetBillingInvoiceByIdQuery,
  useLazyGetBillingInvoiceByIdQuery,
  useUpdateBillingInvoiceStatusMutation,
  useDeleteBillingInvoiceMutation,
  useBulkBillingActionMutation,
  useGetBillingEmailTemplatesQuery,
  useGenerateBillingPdfMutation,
  useLazyDownloadBillingPdfQuery,
  useGenerateVirtualStatementMutation,
  useSendStatementEmailMutation,
  useRegenerateSlipInvoiceMutation,
  useUpdateBillingInvoicePricingMutation,
  useUpdateBillingItemStatusMutation,
  useUpdateBillingItemPriceMutation,
  useUpdateBillingProductMutation,
  useUpdateBillingProductPricingMutation,
  useUpdateBillingAddonPriceMutation,
  useUpdateBillingRetentionPriceMutation,
  useUpdateBillingAdvanceFieldPriceMutation,
  useAddBillingItemNotesMutation,
  useAddBillingItemAddonMutation,
  useGetBillingItemSlipQuery,
  useLazyGetBillingItemSlipQuery,

  useCreatePaymentIntentMutation,
  useLogPaymentMutation,

  useGetCreditBalanceQuery,
  useGetCreditTransactionsQuery,
  useCreateCreditPurchaseIntentMutation,
  useLogCreditPurchaseMutation,
} = billingApi
