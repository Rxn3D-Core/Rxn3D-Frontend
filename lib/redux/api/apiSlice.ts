import {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react"
import { refreshAccessToken } from "@/lib/token-refresh"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: "same-origin",
  prepareHeaders: (headers) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (token) {
      headers.set("Authorization", `Bearer ${token}`)
    }
    return headers
  },
})

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions)

  if (result.error && result.error.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      result = await rawBaseQuery(args, api, extraOptions)
    }
  }

  return result
}

// Base API slice with shared configuration
export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Stage",
    "Casespan",
    "TechnicianBilling",
    "LabAdmin",
    "Billing",
    "Products",
    "ProductCategories",
    "Stages",
    "Addons",
    "HistoryLog",
    "Staff",
    "Departments",
    "Grades",
    "Credits",
    "Transactions",
    "Notifications",
    "Statements",
    "Customer",
    "AdvanceCategories",
    "AdvanceSubcategories",
    "AdvanceFields",
    "Implants",
    "Abutments",
  ],
  endpoints: () => ({}),
})
