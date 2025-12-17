import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import type { Slip } from "@/types/slip"

export const slipsApi = createApi({
  reducerPath: "slipsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Slip"],
  endpoints: (builder) => ({
    getSlips: builder.query<Slip[], void>({
      query: () => "/slips",
      providesTags: ["Slip"],
    }),
    getSlipById: builder.query<Slip, string>({
      query: (id) => `/slips/${id}`,
      providesTags: (result, error, id) => [{ type: "Slip", id }],
    }),
    addSlip: builder.mutation<Slip, Partial<Slip>>({
      query: (slip) => ({
        url: "/slips",
        method: "POST",
        body: slip,
      }),
      invalidatesTags: ["Slip"],
    }),
    updateSlip: builder.mutation<Slip, Partial<Slip>>({
      query: (slip) => ({
        url: `/slips/${slip.id}`,
        method: "PUT",
        body: slip,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Slip", id }],
    }),
    deleteSlip: builder.mutation<{ success: boolean; id: string }, string>({
      query: (id) => ({
        url: `/slips/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Slip", id }],
    }),
  }),
})

export const {
  useGetSlipsQuery,
  useGetSlipByIdQuery,
  useAddSlipMutation,
  useUpdateSlipMutation,
  useDeleteSlipMutation,
} = slipsApi
