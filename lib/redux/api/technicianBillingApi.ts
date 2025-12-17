import { apiSlice } from "./apiSlice"

export interface TechnicianBillingItem {
  id: string
  postedTime: string
  technician: string
  office: string
  slip: string
  patientName: string
  stage: string
  type: "Upper" | "Lower" | "Both"
  department: string
  procedure: string
  qty: number
  unitPrice: number
  rush: string
  total: number
}

export const technicianBillingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTechnicianBillingItems: builder.query<TechnicianBillingItem[], void>({
      query: () => "/technician-billing",
      providesTags: ["TechnicianBilling"],
    }),

    getTechnicianBillingItemById: builder.query<TechnicianBillingItem, string>({
      query: (id) => `/technician-billing/${id}`,
      providesTags: (result, error, id) => [{ type: "TechnicianBilling", id }],
    }),

    addTechnicianBillingItem: builder.mutation<TechnicianBillingItem, Partial<TechnicianBillingItem>>({
      query: (item) => ({
        url: "/technician-billing",
        method: "POST",
        body: item,
      }),
      invalidatesTags: ["TechnicianBilling"],
    }),

    updateTechnicianBillingItem: builder.mutation<TechnicianBillingItem, Partial<TechnicianBillingItem>>({
      query: (item) => ({
        url: `/technician-billing/${item.id}`,
        method: "PUT",
        body: item,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "TechnicianBilling", id }],
    }),

    deleteTechnicianBillingItem: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/technician-billing/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["TechnicianBilling"],
    }),

    exportTechnicianBillingCsv: builder.query<Blob, void>({
      query: () => ({
        url: "/technician-billing/export",
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
})

export const {
  useGetTechnicianBillingItemsQuery,
  useGetTechnicianBillingItemByIdQuery,
  useAddTechnicianBillingItemMutation,
  useUpdateTechnicianBillingItemMutation,
  useDeleteTechnicianBillingItemMutation,
  useLazyExportTechnicianBillingCsvQuery,
} = technicianBillingApi
