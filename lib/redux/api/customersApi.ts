import type { CustomerAddressProfile } from "@/lib/api/customers"
import { getCustomerProfile } from "@/lib/api/customers"
import { apiSlice } from "./apiSlice"

export const customersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCustomerById: builder.query<CustomerAddressProfile, number>({
      async queryFn(customerId) {
        try {
          const data = await getCustomerProfile(customerId)
          return { data }
        } catch (error) {
          return {
            error: {
              status: "CUSTOM_ERROR",
              error: error instanceof Error ? error.message : "Failed to load customer",
            },
          }
        }
      },
      providesTags: (_result, _error, id) => [{ type: "Customer", id: String(id) }],
    }),
  }),
})

export const { useGetCustomerByIdQuery } = customersApi
