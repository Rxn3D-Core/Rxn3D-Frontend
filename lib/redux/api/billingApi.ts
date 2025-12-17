import { apiSlice } from "./apiSlice"

export interface BillingItem {
  id: string
  officeCode: string
  patient: string
  uid: string
  product: string
  grade: string
  stage: string
  total: number
  addOn: string
  qty: string
  bn: string
  dueDate: string
  status?: "Paid" | "Pending"
  transactionId?: string
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
    // Billing items endpoints
    getBillingItems: builder.query<BillingItem[], void>({
      query: () => "/billing",
      providesTags: ["Billing"],
    }),

    getBillingItemById: builder.query<BillingItem, string>({
      query: (id) => `/billing/${id}`,
      providesTags: (result, error, id) => [{ type: "Billing", id }],
    }),

    addBillingItem: builder.mutation<BillingItem, Partial<BillingItem>>({
      query: (item) => ({
        url: "/billing",
        method: "POST",
        body: item,
      }),
      invalidatesTags: ["Billing"],
    }),

    updateBillingItem: builder.mutation<BillingItem, Partial<BillingItem>>({
      query: (item) => ({
        url: `/billing/${item.id}`,
        method: "PUT",
        body: item,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Billing", id }],
    }),

    deleteBillingItem: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/billing/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Billing"],
    }),

    // Payment endpoints
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

    // Credit system endpoints
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
  // Billing items
  useGetBillingItemsQuery,
  useGetBillingItemByIdQuery,
  useAddBillingItemMutation,
  useUpdateBillingItemMutation,
  useDeleteBillingItemMutation,

  // Payments
  useCreatePaymentIntentMutation,
  useLogPaymentMutation,

  // Credits
  useGetCreditBalanceQuery,
  useGetCreditTransactionsQuery,
  useCreateCreditPurchaseIntentMutation,
  useLogCreditPurchaseMutation,
} = billingApi
