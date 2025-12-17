import { apiSlice } from "./apiSlice"

export interface CasespanItem {
  id: string
  name: string
  color: string
  quantity: number
  sequence: number
  status: "Active" | "Inactive"
}

export const casespanApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCasespanItems: builder.query<CasespanItem[], void>({
      query: () => "/casespan",
      providesTags: ["Casespan"],
    }),

    getCasespanItemById: builder.query<CasespanItem, string>({
      query: (id) => `/casespan/${id}`,
      providesTags: (result, error, id) => [{ type: "Casespan", id }],
    }),

    addCasespanItem: builder.mutation<CasespanItem, Partial<CasespanItem>>({
      query: (item) => ({
        url: "/casespan",
        method: "POST",
        body: item,
      }),
      invalidatesTags: ["Casespan"],
    }),

    updateCasespanItem: builder.mutation<CasespanItem, Partial<CasespanItem>>({
      query: (item) => ({
        url: `/casespan/${item.id}`,
        method: "PUT",
        body: item,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Casespan", id }],
    }),

    deleteCasespanItem: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/casespan/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Casespan"],
    }),
  }),
})

export const {
  useGetCasespanItemsQuery,
  useGetCasespanItemByIdQuery,
  useAddCasespanItemMutation,
  useUpdateCasespanItemMutation,
  useDeleteCasespanItemMutation,
} = casespanApi
