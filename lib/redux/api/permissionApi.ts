import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import type { Permission, Role, UserPermission } from "@/types/permission"

export const permissionApi = createApi({
  reducerPath: "permissionApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Permission", "Role", "UserPermission"],
  endpoints: (builder) => ({
    // Permissions
    getPermissions: builder.query<Permission[], void>({
      query: () => "/permissions",
      providesTags: ["Permission"],
    }),
    addPermission: builder.mutation<Permission, Partial<Permission>>({
      query: (permission) => ({
        url: "/permissions",
        method: "POST",
        body: permission,
      }),
      invalidatesTags: ["Permission"],
    }),
    updatePermission: builder.mutation<Permission, Partial<Permission>>({
      query: (permission) => ({
        url: `/permissions/${permission.id}`,
        method: "PUT",
        body: permission,
      }),
      invalidatesTags: ["Permission"],
    }),
    deletePermission: builder.mutation<{ success: boolean; id: string }, string>({
      query: (id) => ({
        url: `/permissions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Permission"],
    }),

    // Roles
    getRoles: builder.query<Role[], void>({
      query: () => "/roles",
      providesTags: ["Role"],
    }),
    addRole: builder.mutation<Role, Partial<Role>>({
      query: (role) => ({
        url: "/roles",
        method: "POST",
        body: role,
      }),
      invalidatesTags: ["Role"],
    }),
    updateRole: builder.mutation<Role, Partial<Role>>({
      query: (role) => ({
        url: `/roles/${role.id}`,
        method: "PUT",
        body: role,
      }),
      invalidatesTags: ["Role"],
    }),
    deleteRole: builder.mutation<{ success: boolean; id: string }, string>({
      query: (id) => ({
        url: `/roles/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Role"],
    }),
    setDefaultRole: builder.mutation<{ success: boolean; id: string }, string>({
      query: (id) => ({
        url: `/roles/${id}/default`,
        method: "PUT",
      }),
      invalidatesTags: ["Role"],
    }),

    // User Permissions
    getUserPermissions: builder.query<UserPermission[], void>({
      query: () => "/user-permissions",
      providesTags: ["UserPermission"],
    }),
    updateUserRole: builder.mutation<UserPermission, { userId: string; roleId: string }>({
      query: ({ userId, roleId }) => ({
        url: `/user-permissions/${userId}/role`,
        method: "PUT",
        body: { roleId },
      }),
      invalidatesTags: ["UserPermission"],
    }),
  }),
})

export const {
  useGetPermissionsQuery,
  useAddPermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
  useGetRolesQuery,
  useAddRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useSetDefaultRoleMutation,
  useGetUserPermissionsQuery,
  useUpdateUserRoleMutation,
} = permissionApi
