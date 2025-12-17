import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import type {
  Category,
  Product,
  Addon,
  Department,
  Staff,
  Grade,
  HistoryLogEntry,
  CallLogEntry,
  LabAdmin,
} from "@/types/labAdmin"

export const labAdminApi = createApi({
  reducerPath: "labAdminApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Category", "Product", "Addon", "Department", "Staff", "Grade", "HistoryLog", "CallLog", "LabAdmin"],
  endpoints: (builder) => ({
    // Categories
    getCategories: builder.query<{ upper: Category[]; lower: Category[] }, void>({
      query: () => "/lab-admin/categories",
      providesTags: ["Category"],
    }),
    addCategory: builder.mutation<Category, Partial<Category>>({
      query: (category) => ({
        url: "/lab-admin/categories",
        method: "POST",
        body: category,
      }),
      invalidatesTags: ["Category"],
    }),
    deleteCategory: builder.mutation<{ success: boolean; id: number }, { id: number; type: "upper" | "lower" }>({
      query: ({ id, type }) => ({
        url: `/lab-admin/categories/${id}?type=${type}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Category"],
    }),

    // Products
    getProducts: builder.query<{ upper: Product[]; lower: Product[] }, void>({
      query: () => "/lab-admin/products",
      providesTags: ["Product"],
    }),
    addProduct: builder.mutation<Product, Partial<Product>>({
      query: (product) => ({
        url: "/lab-admin/products",
        method: "POST",
        body: product,
      }),
      invalidatesTags: ["Product"],
    }),
    deleteProduct: builder.mutation<{ success: boolean; id: number }, { id: number; type: "upper" | "lower" }>({
      query: ({ id, type }) => ({
        url: `/lab-admin/products/${id}?type=${type}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Product"],
    }),

    // Addons
    getAddons: builder.query<Addon[], void>({
      query: () => "/lab-admin/addons",
      providesTags: ["Addon"],
    }),
    addAddon: builder.mutation<Addon, Partial<Addon>>({
      query: (addon) => ({
        url: "/lab-admin/addons",
        method: "POST",
        body: addon,
      }),
      invalidatesTags: ["Addon"],
    }),
    deleteAddon: builder.mutation<{ success: boolean; id: number }, number>({
      query: (id) => ({
        url: `/lab-admin/addons/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Addon"],
    }),

    // Departments
    getDepartments: builder.query<Department[], void>({
      query: () => "/lab-admin/departments",
      providesTags: ["Department"],
    }),
    addDepartment: builder.mutation<Department, Partial<Department>>({
      query: (department) => ({
        url: "/lab-admin/departments",
        method: "POST",
        body: department,
      }),
      invalidatesTags: ["Department"],
    }),
    updateDepartment: builder.mutation<Department, Partial<Department>>({
      query: (department) => ({
        url: `/lab-admin/departments/${department.id}`,
        method: "PUT",
        body: department,
      }),
      invalidatesTags: ["Department"],
    }),
    deleteDepartment: builder.mutation<{ success: boolean; id: number }, number>({
      query: (id) => ({
        url: `/lab-admin/departments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Department"],
    }),

    // Staff
    getStaff: builder.query<Staff[], void>({
      query: () => "/lab-admin/staff",
      providesTags: ["Staff"],
    }),
    addStaff: builder.mutation<Staff, Partial<Staff>>({
      query: (staff) => ({
        url: "/lab-admin/staff",
        method: "POST",
        body: staff,
      }),
      invalidatesTags: ["Staff"],
    }),
    updateStaff: builder.mutation<Staff, Partial<Staff>>({
      query: (staff) => ({
        url: `/lab-admin/staff/${staff.id}`,
        method: "PUT",
        body: staff,
      }),
      invalidatesTags: ["Staff"],
    }),
    deleteStaff: builder.mutation<{ success: boolean; id: number }, number>({
      query: (id) => ({
        url: `/lab-admin/staff/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Staff"],
    }),

    // Grades
    getGrades: builder.query<Grade[], void>({
      query: () => "/lab-admin/grades",
      providesTags: ["Grade"],
    }),
    addGrade: builder.mutation<Grade, Partial<Grade>>({
      query: (grade) => ({
        url: "/lab-admin/grades",
        method: "POST",
        body: grade,
      }),
      invalidatesTags: ["Grade"],
    }),
    updateGrade: builder.mutation<Grade, Partial<Grade>>({
      query: (grade) => ({
        url: `/lab-admin/grades/${grade.id}`,
        method: "PUT",
        body: grade,
      }),
      invalidatesTags: ["Grade"],
    }),
    deleteGrade: builder.mutation<{ success: boolean; id: number }, number>({
      query: (id) => ({
        url: `/lab-admin/grades/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Grade"],
    }),

    // History Log
    getHistoryLog: builder.query<HistoryLogEntry[], void>({
      query: () => "/lab-admin/history-log",
      providesTags: ["HistoryLog"],
    }),
    addHistoryEntry: builder.mutation<HistoryLogEntry, Partial<HistoryLogEntry>>({
      query: (entry) => ({
        url: "/lab-admin/history-log",
        method: "POST",
        body: entry,
      }),
      invalidatesTags: ["HistoryLog"],
    }),
    clearHistoryLog: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: "/lab-admin/history-log/clear",
        method: "DELETE",
      }),
      invalidatesTags: ["HistoryLog"],
    }),

    // Call Log
    getCallLog: builder.query<CallLogEntry[], void>({
      query: () => "/lab-admin/call-log",
      providesTags: ["CallLog"],
    }),
    addCallLogEntry: builder.mutation<CallLogEntry, Partial<CallLogEntry>>({
      query: (entry) => ({
        url: "/lab-admin/call-log",
        method: "POST",
        body: entry,
      }),
      invalidatesTags: ["CallLog"],
    }),
    updateCallLogEntry: builder.mutation<CallLogEntry, Partial<CallLogEntry>>({
      query: (entry) => ({
        url: `/lab-admin/call-log/${entry.id}`,
        method: "PUT",
        body: entry,
      }),
      invalidatesTags: ["CallLog"],
    }),
    deleteCallLogEntry: builder.mutation<{ success: boolean; id: number }, number>({
      query: (id) => ({
        url: `/lab-admin/call-log/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CallLog"],
    }),

    // Lab Admins
    getLabAdmins: builder.query<LabAdmin[], void>({
      query: () => "/lab-admin/admins",
      providesTags: ["LabAdmin"],
    }),
    addLabAdmin: builder.mutation<LabAdmin, Partial<LabAdmin>>({
      query: (admin) => ({
        url: "/lab-admin/admins",
        method: "POST",
        body: admin,
      }),
      invalidatesTags: ["LabAdmin"],
    }),
    updateLabAdmin: builder.mutation<LabAdmin, Partial<LabAdmin>>({
      query: (admin) => ({
        url: `/lab-admin/admins/${admin.id}`,
        method: "PUT",
        body: admin,
      }),
      invalidatesTags: ["LabAdmin"],
    }),
    deleteLabAdmin: builder.mutation<{ success: boolean; id: number }, number>({
      query: (id) => ({
        url: `/lab-admin/admins/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["LabAdmin"],
    }),
  }),
})

export const {
  // Categories
  useGetCategoriesQuery,
  useAddCategoryMutation,
  useDeleteCategoryMutation,

  // Products
  useGetProductsQuery,
  useAddProductMutation,
  useDeleteProductMutation,

  // Addons
  useGetAddonsQuery,
  useAddAddonMutation,
  useDeleteAddonMutation,

  // Departments
  useGetDepartmentsQuery,
  useAddDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,

  // Staff
  useGetStaffQuery,
  useAddStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,

  // Grades
  useGetGradesQuery,
  useAddGradeMutation,
  useUpdateGradeMutation,
  useDeleteGradeMutation,

  // History Log
  useGetHistoryLogQuery,
  useAddHistoryEntryMutation,
  useClearHistoryLogMutation,

  // Call Log
  useGetCallLogQuery,
  useAddCallLogEntryMutation,
  useUpdateCallLogEntryMutation,
  useDeleteCallLogEntryMutation,

  // Lab Admins
  useGetLabAdminsQuery,
  useAddLabAdminMutation,
  useUpdateLabAdminMutation,
  useDeleteLabAdminMutation,
} = labAdminApi
