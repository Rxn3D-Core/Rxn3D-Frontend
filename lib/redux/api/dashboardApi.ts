import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import type { DashboardStats, RevenueData, SalesData, AnalyticsData } from "@/types/dashboard"

export const dashboardApi = createApi({
  reducerPath: "dashboardApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Dashboard"],
  endpoints: (builder) => ({
    getDashboardStats: builder.query<DashboardStats, string>({
      query: (dateRange) => `/dashboard/stats?range=${dateRange}`,
      providesTags: ["Dashboard"],
    }),
    getRevenueData: builder.query<RevenueData, void>({
      query: () => "/dashboard/revenue",
      providesTags: ["Dashboard"],
    }),
    getSalesData: builder.query<SalesData, void>({
      query: () => "/dashboard/sales",
      providesTags: ["Dashboard"],
    }),
    getAnalyticsData: builder.query<AnalyticsData, { type: string; dateRange: string }>({
      query: ({ type, dateRange }) => `/dashboard/analytics?type=${type}&range=${dateRange}`,
      providesTags: ["Dashboard"],
    }),
    exportDashboardReport: builder.mutation<Blob, string>({
      query: (dateRange) => ({
        url: `/dashboard/export?range=${dateRange}`,
        method: "GET",
       
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
})

export const {
  useGetDashboardStatsQuery,
  useGetRevenueDataQuery,
  useGetSalesDataQuery,
  useGetAnalyticsDataQuery,
  useExportDashboardReportMutation,
} = dashboardApi
