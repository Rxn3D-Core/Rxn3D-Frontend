import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "../store"
import type { Permission, Role, UserPermission } from "@/types/permission"

interface PermissionState {
  activeTab: "acl" | "roles" | "users"
  permissionSearchTerm: string
  permissionCategoryFilter: string
  permissionStatusFilter: string
  permissionRoleFilter: string
  roleSearchTerm: string
  userSearchTerm: string
  userRoleFilter: string
  userDepartmentFilter: string
  isAddDialogOpen: boolean
  isEditDialogOpen: boolean
  selectedPermission: Permission | null
  selectedRole: Role | null
  selectedUser: UserPermission | null
}

const initialState: PermissionState = {
  activeTab: "acl",
  permissionSearchTerm: "",
  permissionCategoryFilter: "all",
  permissionStatusFilter: "all",
  permissionRoleFilter: "all",
  roleSearchTerm: "",
  userSearchTerm: "",
  userRoleFilter: "all",
  userDepartmentFilter: "all",
  isAddDialogOpen: false,
  isEditDialogOpen: false,
  selectedPermission: null,
  selectedRole: null,
  selectedUser: null,
}

export const permissionSlice = createSlice({
  name: "permission",
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<"acl" | "roles" | "users">) => {
      state.activeTab = action.payload
    },
    setPermissionSearchTerm: (state, action: PayloadAction<string>) => {
      state.permissionSearchTerm = action.payload
    },
    setPermissionCategoryFilter: (state, action: PayloadAction<string>) => {
      state.permissionCategoryFilter = action.payload
    },
    setPermissionStatusFilter: (state, action: PayloadAction<string>) => {
      state.permissionStatusFilter = action.payload
    },
    setPermissionRoleFilter: (state, action: PayloadAction<string>) => {
      state.permissionRoleFilter = action.payload
    },
    setRoleSearchTerm: (state, action: PayloadAction<string>) => {
      state.roleSearchTerm = action.payload
    },
    setUserSearchTerm: (state, action: PayloadAction<string>) => {
      state.userSearchTerm = action.payload
    },
    setUserRoleFilter: (state, action: PayloadAction<string>) => {
      state.userRoleFilter = action.payload
    },
    setUserDepartmentFilter: (state, action: PayloadAction<string>) => {
      state.userDepartmentFilter = action.payload
    },
    setIsAddDialogOpen: (state, action: PayloadAction<boolean>) => {
      state.isAddDialogOpen = action.payload
    },
    setIsEditDialogOpen: (state, action: PayloadAction<boolean>) => {
      state.isEditDialogOpen = action.payload
    },
    setSelectedPermission: (state, action: PayloadAction<Permission | null>) => {
      state.selectedPermission = action.payload
    },
    setSelectedRole: (state, action: PayloadAction<Role | null>) => {
      state.selectedRole = action.payload
    },
    setSelectedUser: (state, action: PayloadAction<UserPermission | null>) => {
      state.selectedUser = action.payload
    },
    resetPermissionFilters: (state) => {
      state.permissionSearchTerm = ""
      state.permissionCategoryFilter = "all"
      state.permissionStatusFilter = "all"
      state.permissionRoleFilter = "all"
    },
    resetRoleFilters: (state) => {
      state.roleSearchTerm = ""
    },
    resetUserFilters: (state) => {
      state.userSearchTerm = ""
      state.userRoleFilter = "all"
      state.userDepartmentFilter = "all"
    },
  },
})

export const {
  setActiveTab,
  setPermissionSearchTerm,
  setPermissionCategoryFilter,
  setPermissionStatusFilter,
  setPermissionRoleFilter,
  setRoleSearchTerm,
  setUserSearchTerm,
  setUserRoleFilter,
  setUserDepartmentFilter,
  setIsAddDialogOpen,
  setIsEditDialogOpen,
  setSelectedPermission,
  setSelectedRole,
  setSelectedUser,
  resetPermissionFilters,
  resetRoleFilters,
  resetUserFilters,
} = permissionSlice.actions

export const selectPermissionState = (state: RootState) => state.permission

export default permissionSlice.reducer
