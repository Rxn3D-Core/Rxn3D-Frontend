"use client"

import { useState, useEffect } from "react"
import { Eye, Search, Plus, ChevronDown, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { StaffUserDetail } from "@/components/lab-administrator/staff-user-detail"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Avatar } from "@/components/ui/avatar"
import ReactDOM from "react-dom"
import { CreateUserModal } from "@/components/office-administrator/create-user-modal"
import { UpdateUserModal } from "@/components/office-administrator/update-user-modal"
import {
  USER_STATUSES,
  formatUserStatusForApi,
  normalizeUserStatus,
  type UserStatus,
} from "@/lib/user-status"

const USER_STATUS_OPTIONS: Array<{ value: UserStatus; dotClass: string }> = [
  { value: "Active", dotClass: "bg-green-500" },
  { value: "Inactive", dotClass: "bg-gray-400" },
  { value: "Suspended", dotClass: "bg-yellow-500" },
  { value: "Pending", dotClass: "bg-blue-500" },
  { value: "Archived", dotClass: "bg-red-500" },
  { value: "Invited", dotClass: "bg-purple-500" },
]

interface StaffUser {
  id: number
  name: string
  email: string
  customerName: string
  customerId?: number
  phone: string
  userType: string
  customerRoles?: Array<{
    customerId: number
    customerName: string
    roleName: string
    departments: string[]
  }>
  customerNamesList?: string[]
  roleNamesList?: string[]
  departmentsList?: string[]
  joinDate: string
  status: UserStatus
  avatar?: string
  avatarColor?: string
}

interface CustomerOption {
  value: string
  label: string
}

const avatarColors = [
  "bg-[#8bc34a]", // green
  "bg-[#f44336]", // red
  "bg-[#673ab7]", // purple
  "bg-[#ff9800]", // orange
  "bg-[#03a9f4]", // light blue
  "bg-[#9c27b0]", // purple
]

const SORTABLE_COLUMNS = new Set(["first_name", "email", "created_at", "status"])

export default function AllUsers() {
  const { fetchUsers, updateUser, deleteUser, fetchUserById, hasPermission } = useAuth()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null)
  const [showAddUser, setShowAddUser] = useState(false)
  const [showUpdateUser, setShowUpdateUser] = useState(false)
  const [userToUpdate, setUserToUpdate] = useState<StaffUser | null>(null)
  const [entriesPerPage, setEntriesPerPage] = useState("20")
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [allSelected, setAllSelected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [users, setUsers] = useState<StaffUser[]>([])
  const [showStatusDropdown, setShowStatusDropdown] = useState<number | null>(null)
  const [statusDropdownCustomerId, setStatusDropdownCustomerId] = useState<number | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const [sortColumn, setSortColumn] = useState("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, per_page: 20, current_page: 1, last_page: 1 })
  const [roleFilter, setRoleFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("")
  const [customerFilter, setCustomerFilter] = useState("")
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([])
  const canCreateUser = hasPermission("create_user")
  const canEditUser = hasPermission("edit_user")
  const hasActiveFilters = statusFilter !== "all" || roleFilter !== "all" || !!departmentFilter || !!customerFilter

  const customerNameById = customerOptions.reduce<Record<string, string>>((acc, option) => {
    acc[option.value] = option.label
    return acc
  }, {})

  const formatFirstPlusCount = (items: string[]) => {
    if (!items || items.length === 0) return "N/A"
    if (items.length === 1) return items[0]
    return `${items[0]} +${items.length - 1}`
  }

  const buildCustomerScopedRoleData = (userData: any, selectedCustomerId?: number) => {
    const customerUsers = Array.isArray(userData?.customer_users) ? userData.customer_users : []
    const mapped = customerUsers.map((cu: any) => ({
      customerId: cu?.customer_id || cu?.customer?.id,
      customerName: cu?.customer?.name || customerNameById[String(cu?.customer_id || cu?.customer?.id || "")] || "",
      roleName: cu?.role?.name || "",
      departments: Array.isArray(cu?.departments) ? cu.departments.map((d: any) => d?.name).filter(Boolean) : [],
    })).filter((item: any) => item.customerId && item.roleName)

    const scoped = selectedCustomerId ? mapped.filter((item: any) => item.customerId === selectedCustomerId) : mapped
    const source = scoped.length > 0 ? scoped : mapped

    const customerNames: string[] = Array.from(
      new Set(
        source
          .map((item: any) => item.customerName)
          .filter((name: unknown): name is string => typeof name === "string" && name.trim().length > 0)
      )
    )
    const roleNames: string[] = Array.from(
      new Set(
        source
          .map((item: any) => item.roleName)
          .filter((name: unknown): name is string => typeof name === "string" && name.trim().length > 0)
      )
    )
    const departmentNames: string[] = Array.from(
      new Set(
        source
          .flatMap((item: any) => (Array.isArray(item.departments) ? item.departments : []))
          .filter((name: unknown): name is string => typeof name === "string" && name.trim().length > 0)
      )
    )

    return {
      customerNameDisplay: formatFirstPlusCount(customerNames),
      roleDisplay: formatFirstPlusCount(roleNames),
      customerNamesList: customerNames,
      roleNamesList: roleNames,
      departmentsList: departmentNames,
      customerRoles: mapped,
    }
  }

  const loadCustomerOptions = async () => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("library_token")
      if (!token) return
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""
      const fetchAllCustomersByType = async (type: "lab" | "office") => {
        const perPage = 100
        let page = 1
        let lastPage = 1
        const items: any[] = []

        do {
          const url = `${API_BASE_URL}/customers/search?${new URLSearchParams({
            type,
            per_page: String(perPage),
            order_by: "name",
            sort_by: "asc",
            page: String(page),
          }).toString()}`
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          })
          if (!res.ok) break
          const json = await res.json()
          items.push(...(json?.data || []))
          lastPage = json?.pagination?.last_page || json?.meta?.last_page || 1
          page += 1
        } while (page <= lastPage)

        return items
      }

      const [labs, offices] = await Promise.all([
        fetchAllCustomersByType("lab"),
        fetchAllCustomersByType("office"),
      ])
      const combined = [...labs, ...offices]
      const uniqueById = new Map<number, CustomerOption>()
      combined.forEach((customer: any) => {
        if (customer?.id && customer?.name && !uniqueById.has(customer.id)) {
          uniqueById.set(customer.id, {
            value: String(customer.id),
            label: customer.name,
          })
        }
      })
      setCustomerOptions(Array.from(uniqueById.values()))
    } catch {
      setCustomerOptions([])
    }
  }

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetchUsers({
        q: searchTerm.trim() || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        role: roleFilter === "all" ? undefined : roleFilter,
        department_id: departmentFilter.trim() || undefined,
        customer_id: customerFilter.trim() || undefined,
        per_page: Number(entriesPerPage),
        order_by: sortColumn,
        sort_by: sortDirection,
        page: currentPage,
      })
      const usersData = response?.data || []
      if (!Array.isArray(usersData)) throw new Error("Invalid response format")

      const selectedCustomerId = customerFilter.trim() ? Number(customerFilter.trim()) : undefined
      setUsers(usersData.map((user: any, index: number) => {
        const scopedRoleData = buildCustomerScopedRoleData(user, selectedCustomerId)
        return {
          id: user.id,
          name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
          email: user.email,
          customerName: scopedRoleData.customerNameDisplay,
          customerId: selectedCustomerId,
          phone: user.phone || user.work_number || "N/A",
          userType: scopedRoleData.roleDisplay,
          customerRoles: scopedRoleData.customerRoles,
          customerNamesList: scopedRoleData.customerNamesList,
          roleNamesList: scopedRoleData.roleNamesList,
          departmentsList: scopedRoleData.departmentsList,
          joinDate: user.created_at ? new Date(user.created_at).toISOString().split("T")[0] : "",
          status: normalizeUserStatus(user.status),
          avatarColor: avatarColors[index % avatarColors.length],
        }
      }))
      setPagination({
        total: response?.total || response?.pagination?.total || usersData.length,
        per_page: response?.per_page || response?.pagination?.per_page || Number(entriesPerPage),
        current_page: response?.current_page || response?.pagination?.current_page || 1,
        last_page: response?.last_page || response?.pagination?.last_page || 1,
      })
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to load users.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [searchTerm, statusFilter, roleFilter, departmentFilter, customerFilter, entriesPerPage, sortColumn, sortDirection, currentPage])

  useEffect(() => {
    loadCustomerOptions()
  }, [])

  const filteredUsers = users

  // Handle row selection
  const toggleSelectRow = (id: number) => {
    setSelectedRows((prev) => (prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]))
  }

  // Handle select all rows
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedRows([])
    } else {
      setSelectedRows(filteredUsers.map((user) => user.id))
    }
    setAllSelected(!allSelected)
  }

  // Handle view user details
  const handleViewUser = async (user: StaffUser) => {
    try {
      const result = await fetchUserById(user.id, customerFilter.trim() || undefined)
      const details = result?.data || result
      const selectedCustomerId = customerFilter.trim() ? Number(customerFilter.trim()) : undefined
      const scopedRoleData = buildCustomerScopedRoleData(details, selectedCustomerId)
      const mapped: StaffUser = {
        id: details.id,
        name: `${details.first_name || ""} ${details.last_name || ""}`.trim(),
        email: details.email || "",
        customerName: scopedRoleData.customerNameDisplay,
        customerId: selectedCustomerId || user.customerId,
        phone: details.phone || details.work_number || "N/A",
        userType: scopedRoleData.roleDisplay,
        customerRoles: scopedRoleData.customerRoles,
        customerNamesList: scopedRoleData.customerNamesList,
        roleNamesList: scopedRoleData.roleNamesList,
        departmentsList: scopedRoleData.departmentsList,
        joinDate: details.created_at ? new Date(details.created_at).toISOString().split("T")[0] : "",
        status: normalizeUserStatus(details.status),
        avatarColor: user.avatarColor,
      }
      setSelectedUser(mapped)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to load user details.",
        variant: "destructive",
      })
    }
  }

  const handleAddUser = () => {
    if (!canCreateUser) return
    setShowAddUser(true)
    setSelectedUser(null)
  }

  const handleEditUser = (user: StaffUser) => {
    if (!canEditUser) return
    setUserToUpdate(user)
    setShowUpdateUser(true)
  }

  const handleDeleteUser = async (userId: number) => {
    if (!canEditUser) return
    try {
      await deleteUser(userId)
      toast({ title: "User Deleted", description: "User deleted successfully." })
      loadUsers()
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error?.message || "Failed to delete user.", variant: "destructive" })
    }
  }

  // Handle back to list
  const handleBackToList = () => {
    setSelectedUser(null)
    setShowAddUser(false)
  }

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-[#c3f2cf] text-[#119933]"
      case "Inactive":
        return "bg-[#eeeeee] text-[#a19d9d]"
      case "Suspended":
        return "bg-[#fff3e1] text-[#ff9500]"
      case "Archived":
        return "bg-[#f8dddd] text-[#eb0303]"
      case "Pending":
        return "bg-[#e3f2fd] text-[#1162a8]"
      case "Invited":
        return "bg-[#ede7f6] text-[#673ab7]"
      default:
        return "bg-[#eeeeee] text-[#a19d9d]"
    }
  }

  // Get avatar fallback from name
  const resolveCustomerIdForUserAction = (user: StaffUser): number | undefined => {
    if (customerFilter.trim()) return Number(customerFilter.trim())
    if (user.customerRoles?.length === 1) return user.customerRoles[0].customerId
    return undefined
  }

  const userNeedsCustomerPickForStatus = (user: StaffUser) => {
    if (customerFilter.trim()) return false
    return (user.customerRoles?.length ?? 0) > 1
  }

  const getAvatarFallback = (name: string) => {
    const initials = name
      .split(' ')
      .map(word => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
    const colorIndex = name.charCodeAt(0) % avatarColors.length;
    return { initials, color: avatarColors[colorIndex] };
  }

  const handleStatusChange = async (userId: number, newStatus: UserStatus) => {
    if (!canEditUser) return
    const user = users.find((entry) => entry.id === userId)
    const customerId = statusDropdownCustomerId ?? (user ? resolveCustomerIdForUserAction(user) : undefined)

    if (!customerId) {
      toast({
        title: "Customer required",
        description: "Select which lab or office this status change applies to.",
        variant: "destructive",
      })
      return
    }

    try {
      await updateUser(userId, {
        status: formatUserStatusForApi(newStatus),
        customer_id: customerId,
      })
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)))
      toast({
        title: "Status Updated",
        description: `User status changed to ${newStatus}.`,
      })
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error?.message || "Could not update user status.",
        variant: "destructive",
      })
    } finally {
      setShowStatusDropdown(null)
      setStatusDropdownCustomerId(null)
      setDropdownPosition(null)
    }
  }

  const handleSort = (column: string) => {
    if (!SORTABLE_COLUMNS.has(column)) return
    if (sortColumn === column) setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const clearFilters = () => {
    setStatusFilter("all")
    setRoleFilter("all")
    setDepartmentFilter("")
    setCustomerFilter("")
    setCurrentPage(1)
  }

  // Handle status dropdown open/close and position
  const handleStatusDropdown = (user: StaffUser, event: React.MouseEvent<HTMLButtonElement>) => {
    if (showStatusDropdown === user.id) {
      setShowStatusDropdown(null)
      setStatusDropdownCustomerId(null)
      setDropdownPosition(null)
    } else {
      const rect = (event.target as HTMLElement).getBoundingClientRect()
      setShowStatusDropdown(user.id)
      setStatusDropdownCustomerId(resolveCustomerIdForUserAction(user) ?? null)
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }

  // Click-away handler for dropdown
  useEffect(() => {
    if (showStatusDropdown !== null) {
      const handleClick = (e: MouseEvent) => {
        const dropdown = document.getElementById("status-dropdown-portal")
        if (dropdown && !dropdown.contains(e.target as Node)) {
          setShowStatusDropdown(null)
          setStatusDropdownCustomerId(null)
          setDropdownPosition(null)
        }
      }
      document.addEventListener("mousedown", handleClick)
      return () => document.removeEventListener("mousedown", handleClick)
    }
  }, [showStatusDropdown])

  if (selectedUser) {
    return (
      <div className="h-full">
        <StaffUserDetail user={selectedUser} onBack={handleBackToList} />
      </div>
    )
  }

  return (
    <div className="py-6 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 mt-1">Manage all users across labs and offices.</p>
      </div>

      {/* Filters and actions */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6 shadow-sm">
        <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm">Show</span>
            <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
              <SelectTrigger className="w-[70px]">
                <SelectValue placeholder="20" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm">entries</span>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="w-[220px]">
                <SearchableSelect
                  value={customerFilter}
                  onValueChange={(value) => {
                    setCustomerFilter(value)
                    setCurrentPage(1)
                  }}
                  placeholder="Filter by customer"
                  searchPlaceholder="Search customer..."
                  emptyMessage="No customers found."
                  options={customerOptions}
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setCurrentPage(1) }}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {USER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={(value) => { setRoleFilter(value); setCurrentPage(1) }}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Roles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="lab_admin">Lab Admin</SelectItem>
                  <SelectItem value="lab_user">Lab User</SelectItem>
                  <SelectItem value="office_admin">Office Admin</SelectItem>
                  <SelectItem value="office_user">Office User</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={departmentFilter}
                onChange={(e) => { setDepartmentFilter(e.target.value.replace(/[^0-9]/g, "")); setCurrentPage(1) }}
                placeholder="Department ID"
                className="w-[140px]"
              />
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
              <Button className="bg-[#1162a8] text-white px-3 py-1.5 rounded text-sm" onClick={handleAddUser} disabled={!canCreateUser}>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
            <div className="relative w-full md:w-auto">
              <Input
                type="text"
                placeholder="Search User"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full md:w-[300px]"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-gray-700 text-sm">
              <tr>
                <th className="px-4 py-3 text-left">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all rows" />
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer" onClick={() => handleSort("first_name")}>
                  <div className="flex items-center">
                    Name
                    {sortColumn === "first_name" && <ChevronDown className={`h-4 w-4 ml-1 ${sortDirection === "asc" ? "rotate-180" : ""}`} />}
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer" onClick={() => handleSort("email")}>
                  <div className="flex items-center">
                    Email
                    {sortColumn === "email" && <ChevronDown className={`h-4 w-4 ml-1 ${sortDirection === "asc" ? "rotate-180" : ""}`} />}
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  <div className="flex items-center">
                    Customer
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer" onClick={() => handleSort("role")}>
                  <div className="flex items-center">
                    Role
                    {sortColumn === "role" && <ChevronDown className={`h-4 w-4 ml-1 ${sortDirection === "asc" ? "rotate-180" : ""}`} />}
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer" onClick={() => handleSort("status")}>
                  <div className="flex items-center">
                    Status
                    {sortColumn === "status" && <ChevronDown className={`h-4 w-4 ml-1 ${sortDirection === "asc" ? "rotate-180" : ""}`} />}
                  </div>
                </th>
                <th className="px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                // Skeletal loader for 5 rows
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-4 w-4 bg-gray-200 rounded"></div></td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-200"></div>
                        <div className="h-4 w-24 bg-gray-200 rounded"></div>
                      </div>
                    </td>
                    <td className="px-4 py-4"><div className="h-4 w-32 bg-gray-200 rounded"></div></td>
                    <td className="px-4 py-4"><div className="h-4 w-20 bg-gray-200 rounded"></div></td>
                    <td className="px-4 py-4"><div className="h-4 w-20 bg-gray-200 rounded"></div></td>
                    <td className="px-4 py-4"><div className="h-4 w-20 bg-gray-200 rounded"></div></td>
                    <td className="px-4 py-4"><div className="h-4 w-16 bg-gray-200 rounded"></div></td>
                    <td className="px-4 py-4 text-center"><div className="h-4 w-8 bg-gray-200 rounded mx-auto"></div></td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    No Users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-blue-50">
                    <td className="px-4 py-4">
                      <Checkbox
                        checked={selectedRows.includes(user.id)}
                        onCheckedChange={() => toggleSelectRow(user.id)}
                        aria-label={`Select ${user.name}`}
                      />
                    </td>
                    <td className="px-4 py-4">
                       <div className="flex items-center gap-3">
                          <Avatar className={getAvatarFallback(user.name).color}>
                          </Avatar>
                          <span className="font-medium">{user.name}</span>
                        </div>
                    </td>
                    <td className="px-4 py-4 text-gray-700">{user.email}</td>
                    <td className="px-4 py-4 text-gray-700" title={user.customerNamesList?.join(", ") || user.customerName}>
                      {user.customerName}
                    </td>
                    <td className="px-4 py-4 text-gray-700" title={user.roleNamesList?.join(", ") || user.userType}>
                      <div className="flex flex-col">
                        <span>{user.userType}</span>
                        {user.departmentsList && user.departmentsList.length > 0 && (
                          <span className="text-xs text-gray-500" title={user.departmentsList.join(", ")}>
                            Dept: {formatFirstPlusCount(user.departmentsList)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 relative">
                      <div className="relative">
                        <button
                          onClick={(e) => handleStatusDropdown(user, e)}
                          className={`${getStatusBadgeClass(user.status)} px-3 py-1 rounded-md text-sm flex items-center`}
                          disabled={!canEditUser}
                        >
                          <span className="mr-1">•</span> {user.status}
                          <ChevronDown className="h-4 w-4 ml-1" />
                        </button>
                        {/* Dropdown is now rendered via portal */}
                        {showStatusDropdown === user.id && dropdownPosition &&
                          ReactDOM.createPortal(
                            <div
                              id="status-dropdown-portal"
                              className="z-50 min-w-[11rem] max-w-xs bg-white border border-gray-200 rounded-md shadow-lg absolute"
                              style={{
                                position: "absolute",
                                top: dropdownPosition.top,
                                left: dropdownPosition.left,
                              }}
                            >
                              <div className="py-1">
                                {userNeedsCustomerPickForStatus(user) && !statusDropdownCustomerId ? (
                                  <>
                                    <div className="px-4 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                                      Select customer
                                    </div>
                                    {user.customerRoles?.map((customerRole) => (
                                      <button
                                        key={customerRole.customerId}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                                        onClick={() => setStatusDropdownCustomerId(customerRole.customerId)}
                                      >
                                        {customerRole.customerName || `Customer #${customerRole.customerId}`}
                                      </button>
                                    ))}
                                  </>
                                ) : (
                                  <>
                                    {statusDropdownCustomerId && user.customerRoles && user.customerRoles.length > 1 && (
                                      <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                                        {user.customerRoles.find((role) => role.customerId === statusDropdownCustomerId)?.customerName
                                          || `Customer #${statusDropdownCustomerId}`}
                                      </div>
                                    )}
                                    {USER_STATUS_OPTIONS.map((option) => (
                                      <button
                                        key={option.value}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                                        onClick={() => handleStatusChange(user.id, option.value)}
                                      >
                                        <span className={`w-2 h-2 rounded-full mr-2 ${option.dotClass}`}></span>
                                        {option.value}
                                      </button>
                                    ))}
                                  </>
                                )}
                              </div>
                            </div>,
                            document.body
                          )
                        }
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewUser(user)} className="text-blue-600 hover:text-blue-800"><Eye className="h-5 w-5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)} className="text-green-600 hover:text-green-800" disabled={!canEditUser}><Edit className="h-5 w-5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800" disabled={!canEditUser}><Trash2 className="h-5 w-5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 flex justify-between items-center border-t border-[#d9d9d9]">
          <div className="text-sm text-[#6b7280]">
            Showing {pagination.total === 0 ? 0 : (pagination.current_page - 1) * pagination.per_page + 1} to {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total} entries
          </div>
          <div className="flex items-center space-x-1">
            <button className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-[#f0f0f0] text-[#6b7280] disabled:opacity-50" disabled={pagination.current_page <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>«</button>
            <button className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-[#1162a8] text-white">{pagination.current_page}</button>
            <button className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-[#f0f0f0] text-[#6b7280] disabled:opacity-50" disabled={pagination.current_page >= pagination.last_page} onClick={() => setCurrentPage((p) => Math.min(pagination.last_page, p + 1))}>»</button>
          </div>
        </div>
      </div>

      <CreateUserModal
        isOpen={showAddUser}
        onClose={() => setShowAddUser(false)}
        onSuccess={() => {
          setShowAddUser(false)
          loadUsers()
        }}
      />

      <UpdateUserModal
        isOpen={showUpdateUser}
        onClose={() => {
          setShowUpdateUser(false)
          setUserToUpdate(null)
        }}
        onSuccess={() => {
          setShowUpdateUser(false)
          setUserToUpdate(null)
          loadUsers()
        }}
        user={userToUpdate}
      />
    </div>
  )
}
