import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

// Base API slice with shared configuration
export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    // Add credentials and headers as needed
    credentials: "same-origin",
    prepareHeaders: (headers) => {
      // Add any common headers here
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
      return headers
    },
  }),
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
    "AdvanceCategories",
    "AdvanceSubcategories",
    "AdvanceFields",
    "Implants",
    "Abutments",
  ],
  endpoints: () => ({}),
})
