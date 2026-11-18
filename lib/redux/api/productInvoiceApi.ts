import { apiSlice } from "./apiSlice"
import type {
  ArchType,
  ProductInvoiceDetail,
  ProductInvoiceListParams,
  ProductInvoiceListResult,
  ProductInvoiceStatus,
} from "@/types/product-invoicing"

/**
 * RXN-90 product invoices (one invoice per case and arch) in Charge Management.
 * Same middleware and envelope as `/billing`: `{ success, message, data }`, lists as `data.data` + `data.pagination`.
 */

type Envelope<T> = { success?: boolean; message?: string; data?: T }

function emptyPagination(): ProductInvoiceListResult["pagination"] {
  return { current_page: 1, last_page: 1, per_page: 15, total: 0, from: null, to: null }
}

function buildQuery(params: ProductInvoiceListParams): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    search.append(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value))
  })
  const qs = search.toString()
  return qs ? `?${qs}` : ""
}

const LIST_TAG = { type: "ProductInvoices" as const, id: "LIST" }

export const productInvoiceApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listProductInvoices: builder.query<ProductInvoiceListResult, ProductInvoiceListParams>({
      query: (params) => `/billing/product-invoices${buildQuery(params)}`,
      transformResponse: (response: Envelope<Partial<ProductInvoiceListResult>>): ProductInvoiceListResult => ({
        data: Array.isArray(response?.data?.data) ? response.data!.data! : [],
        pagination: response?.data?.pagination ?? emptyPagination(),
      }),
      providesTags: [LIST_TAG],
    }),

    getProductInvoice: builder.query<ProductInvoiceDetail, number>({
      query: (id) => `/billing/product-invoices/${id}`,
      transformResponse: (response: Envelope<ProductInvoiceDetail>): ProductInvoiceDetail => {
        if (!response?.data) throw new Error("Product invoice not found")
        return response.data
      },
      providesTags: (result, error, id) => [{ type: "ProductInvoices", id: String(id) }],
    }),

    updateProductInvoiceStatus: builder.mutation<
      Envelope<ProductInvoiceDetail>,
      { id: number; status: ProductInvoiceStatus; notes?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/billing/product-invoices/${id}/status`, method: "PUT", body }),
      invalidatesTags: (result, error, { id }) => [LIST_TAG, { type: "ProductInvoices", id: String(id) }],
    }),

    updateProductInvoiceLinePrice: builder.mutation<
      Envelope<ProductInvoiceDetail>,
      { invoiceId: number; lineId: number; price: number; quantity?: number; notes?: string }
    >({
      query: ({ lineId, invoiceId: _invoiceId, ...body }) => ({
        url: `/billing/product-invoice-lines/${lineId}/price`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { invoiceId }) => [LIST_TAG, { type: "ProductInvoices", id: String(invoiceId) }],
    }),

    regenerateProductInvoice: builder.mutation<Envelope<ProductInvoiceDetail>, number>({
      query: (id) => ({ url: `/billing/product-invoices/${id}/regenerate`, method: "POST" }),
      invalidatesTags: (result, error, id) => [LIST_TAG, { type: "ProductInvoices", id: String(id) }],
    }),

    deleteProductInvoice: builder.mutation<Envelope<null>, number>({
      query: (id) => ({ url: `/billing/product-invoices/${id}`, method: "DELETE" }),
      invalidatesTags: [LIST_TAG],
    }),

    finalizeArchInvoice: builder.mutation<Envelope<ProductInvoiceDetail>, { case_id: number; arch: ArchType }>({
      query: (body) => ({ url: "/billing/product-invoices/finalize", method: "POST", body }),
      invalidatesTags: [LIST_TAG],
    }),

    downloadProductInvoicePdf: builder.mutation<Blob, number>({
      query: (id) => ({
        url: `/billing/product-invoices/${id}/download-pdf`,
        method: "GET",
        responseHandler: async (response) => {
          if (!response.ok) {
            const text = await response.text()
            let message = text
            try {
              message = JSON.parse(text)?.message ?? text
            } catch {
              // plain-text error body
            }
            throw new Error(message || `HTTP ${response.status}`)
          }
          return response.blob()
        },
      }),
    }),
  }),
})

export const {
  useListProductInvoicesQuery,
  useGetProductInvoiceQuery,
  useUpdateProductInvoiceStatusMutation,
  useUpdateProductInvoiceLinePriceMutation,
  useRegenerateProductInvoiceMutation,
  useDeleteProductInvoiceMutation,
  useFinalizeArchInvoiceMutation,
  useDownloadProductInvoicePdfMutation,
} = productInvoiceApi

/** Message from an RTK Query error (API `{ message }`, thrown Error, or fallback). */
export function productInvoiceErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback
  const e = error as { data?: { message?: unknown }; error?: unknown; message?: unknown }
  if (e.data && typeof e.data.message === "string" && e.data.message) return e.data.message
  if (typeof e.error === "string" && e.error) return e.error
  if (typeof e.message === "string" && e.message) return e.message
  return fallback
}
