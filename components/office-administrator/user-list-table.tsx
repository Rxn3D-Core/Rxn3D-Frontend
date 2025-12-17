"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, Plus, ChevronDown, ChevronUp, Eye, Edit } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { OfficeUserDetail } from "./office-user-detail"
import { CreateUserModal } from "./create-user-modal"
import { UpdateUserModal } from "./update-user-modal"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import ReactDOM from "react-dom"

interface ApiUser {
  id: number
  uuid: string
  first_name: string
  last_name: string
  email: string
  phone: string
  work_number?: string
  status: string
  is_email_verified: boolean
  email_verified_at?: string
  roles: any[]
  direct_permissions: any[]
  customers: Array<{
    id: number
    name: string
    is_primary: number
    role: {
      id: number
      name: string
      permissions: string[]
    }
    departments: any[]
  }>
  created_at: string
  updated_at: string
}

interface StaffUser {
  id: number
  name: string
  email: string
  phone: string
  userType: string
  joinDate: string
  status: "Active" | "Inactive" | "Suspended" | "Archived"
  avatar?: string
  avatarColor?: string
  role?: string
  customerName?: string
}

interface UserListTableProps {
  roleFilter: string
  title: string
  description: string
}

export function UserListTable({ roleFilter, title, description }: UserListTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, fetchUsers, updateUser } = useAuth()
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [showAddUser, setShowAddUser] = useState(false)
  const [showUpdateUser, setShowUpdateUser] = useState(false)
  const [userToUpdate, setUserToUpdate] = useState<StaffUser | null>(null)

  const [entriesPerPage, setEntriesPerPage] = useState("20")
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [allSelected, setAllSelected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([])
  const [showStatusDropdown, setShowStatusDropdown] = useState<number | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null)

  // Avatar colors
  const avatarColors = [
    "bg-[#8bc34a]", // green
    "bg-[#f44336]", // red
    "bg-[#673ab7]", // purple
    "bg-[#ff9800]", // orange
    "bg-[#03a9f4]", // light blue
    "bg-[#9c27b0]", // purple
  ]

  // Transform API user data to component format
  const transformApiUser = (apiUser: ApiUser, index: number): StaffUser => {
    const primaryCustomer = apiUser.customers.find(c => c.is_primary === 1) || apiUser.customers[0]
    const userType = primaryCustomer?.role?.name.replace("_", " ") || "N/A"
    
    return {
      id: apiUser.id,
      name: `${apiUser.first_name} ${apiUser.last_name}`,
      email: apiUser.email,
      phone: apiUser.phone || "N/A",
      userType,
      joinDate: new Date(apiUser.created_at).toISOString().split("T")[0],
      status: apiUser.status as "Active" | "Inactive" | "Suspended" | "Archived",
      avatarColor: avatarColors[index % avatarColors.length],
      role: primaryCustomer?.role?.name || "Unknown",
      customerName: primaryCustomer?.name || "Unknown",
    }
  }

  // Load users data
  const loadUsers = async () => {
    setIsLoading(true)
    try {
      // Get customer_id from localStorage and pass it explicitly
      const customerId = localStorage.getItem('customerId')
      const params: { customer_id?: string } = {}
      if (customerId) {
        params.customer_id = customerId
      }
      const result = await fetchUsers(params)
      
      let userData = null
      
      if (Array.isArray(result)) {
        userData = result
      } else if (result.success && result.data) {
        userData = result.data
      } else if (result.data && Array.isArray(result.data)) {
        userData = result.data
      } else {
        throw new Error('Invalid response format')
      }

      if (userData && Array.isArray(userData)) {
        const transformedUsers = userData.map((apiUser: ApiUser, index: number) => 
          transformApiUser(apiUser, index)
        )
        
        // Filter users by role
        const filteredUsers = transformedUsers.filter(user => {
          if (roleFilter === "doctor") {
            return user.role === "doctor"
          } else if (roleFilter === "office_admin") {
            return user.role === "office_admin"
          } else if (roleFilter === "other") {
            return user.role !== "doctor" && user.role !== "office_admin"
          }
          return true
        })
        
        setStaffUsers(filteredUsers)
      } else {
        throw new Error('No user data received')
      }
    } catch (error: any) {
      console.error("Failed to load users:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load users. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [roleFilter])

  // Check URL params for user detail view
  useEffect(() => {
    const userId = searchParams?.get("userId")
    if (userId) {
      const user = staffUsers.find((u) => u.id === Number.parseInt(userId))
      if (user) {
        setSelectedUser(user)
      }
    }
  }, [searchParams, staffUsers])

  // Get unique user types for filter
  const uniqueUserTypes = Array.from(new Set(staffUsers.map(user => user.userType))).sort()

  // Filter users based on search term, status filter, and user type filter
  let filteredUsers = staffUsers.filter((user) => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.includes(searchTerm)
    
    const matchesStatus = statusFilter === "all" || user.status.toLowerCase() === statusFilter.toLowerCase()
    const matchesUserType = userTypeFilter === "all" || user.userType === userTypeFilter
    
    return matchesSearch && matchesStatus && matchesUserType
  })

  // Apply sorting
  if (sortColumn) {
    filteredUsers = [...filteredUsers].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortColumn) {
        case "name":
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case "email":
          aValue = a.email.toLowerCase()
          bValue = b.email.toLowerCase()
          break
        case "userType":
          aValue = a.userType.toLowerCase()
          bValue = b.userType.toLowerCase()
          break
        case "phone":
          aValue = a.phone
          bValue = b.phone
          break
        case "joinDate":
          aValue = new Date(a.joinDate).getTime()
          bValue = new Date(b.joinDate).getTime()
          break
        case "status":
          aValue = a.status.toLowerCase()
          bValue = b.status.toLowerCase()
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }

  // Check if any filters are active
  const hasActiveFilters = statusFilter !== "all" || userTypeFilter !== "all"

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter("all")
    setUserTypeFilter("all")
  }

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  // Render sort indicator
  const renderSortIndicator = (column: string) => {
    if (sortColumn !== column) {
      return null
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 ml-1 text-blue-600" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1 text-blue-600" />
    )
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
      default:
        return "bg-[#eeeeee] text-[#a19d9d]"
    }
  }

  // Handle status change
  const handleStatusChange = (userId: number, newStatus: string) => {
    setStaffUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.id === userId ? { ...user, status: newStatus as "Active" | "Inactive" | "Suspended" | "Archived" } : user,
      ),
    )
    setShowStatusDropdown(null)
    setDropdownPosition(null)
  }

  // Handle status dropdown open/close and position
  const handleStatusDropdown = (userId: number, event: React.MouseEvent<HTMLButtonElement>) => {
    if (showStatusDropdown === userId) {
      setShowStatusDropdown(null)
      setDropdownPosition(null)
    } else {
      const rect = (event.target as HTMLElement).getBoundingClientRect()
      setShowStatusDropdown(userId)
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
          setDropdownPosition(null)
        }
      }
      document.addEventListener("mousedown", handleClick)
      return () => document.removeEventListener("mousedown", handleClick)
    }
  }, [showStatusDropdown])

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
  const handleViewUser = (user: StaffUser) => {
    setSelectedUser(user)
    router.push(`?userId=${user.id}`)
  }

  // Handle back to list
  const handleBackToList = () => {
    setSelectedUser(null)
    router.push(window.location.pathname)
  }

  // Handle create user success
  const handleCreateUserSuccess = () => {
    loadUsers() // Reload the user list
  }

  // Handle update user success
  const handleUpdateUserSuccess = () => {
    loadUsers() // Reload the user list
  }

  // Handle edit user
  const handleEditUser = (user: StaffUser) => {
    setUserToUpdate(user)
    setShowUpdateUser(true)
  }

  // If viewing user details, show detail component
  if (selectedUser) {
    return <OfficeUserDetail user={selectedUser} onBack={handleBackToList} />
  }

  return (
    <div className="py-6">
      {/* Filters and actions */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6">
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
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`flex items-center gap-2 ${hasActiveFilters ? 'border-blue-500 bg-blue-50' : ''}`}
                  >
                    <Filter className="h-4 w-4" />
                    Filter
                    {hasActiveFilters && (
                      <span className="ml-1 h-5 w-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                        {(statusFilter !== "all" ? 1 : 0) + (userTypeFilter !== "all" ? 1 : 0)}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Filters</h4>
                      {hasActiveFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
                        >
                          Clear all
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                          <SelectItem value="Suspended">Suspended</SelectItem>
                          <SelectItem value="Archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">User Type</Label>
                      <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All User Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All User Types</SelectItem>
                          {uniqueUserTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button className="bg-[#1162a8] text-white px-3 py-1.5 rounded text-sm" onClick={() => setShowAddUser(true)}>
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
                <th 
                  className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center">
                    Name
                    {renderSortIndicator("name")}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("email")}
                >
                  <div className="flex items-center">
                    Email
                    {renderSortIndicator("email")}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("userType")}
                >
                  <div className="flex items-center">
                    User Type
                    {renderSortIndicator("userType")}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("phone")}
                >
                  <div className="flex items-center">
                    Phone Number
                    {renderSortIndicator("phone")}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("joinDate")}
                >
                  <div className="flex items-center">
                    Join Date
                    {renderSortIndicator("joinDate")}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center">
                    Status
                    {renderSortIndicator("status")}
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
                        <div className="h-10 w-10 rounded-full bg-gray-200"></div>
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
                          <Avatar className={`${user.avatarColor} h-10 w-10`}>
                            <AvatarFallback className={`${user.avatarColor} text-white font-semibold`}>
                              {user.name
                                .split(' ')
                                .map(word => word.charAt(0))
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-gray-900">{user.name}</span>
                        </div>
                    </td>
                    <td className="px-4 py-4 text-gray-700">{user.email}</td>
                    <td className="px-4 py-4 text-gray-700">{user.userType}</td>
                    <td className="px-4 py-4 text-gray-700">{user.phone}</td>
                    <td className="px-4 py-4 text-gray-700">{user.joinDate}</td>
                    <td className="px-4 py-4 relative">
                      <div className="relative">
                        <button
                          onClick={(e) => handleStatusDropdown(user.id, e)}
                          className={`${getStatusBadgeClass(user.status)} px-3 py-1 rounded-md text-sm flex items-center`}
                        >
                          <span className="mr-1">•</span> {user.status}
                          <ChevronDown className="h-4 w-4 ml-1" />
                        </button>
                        {/* Dropdown is now rendered via portal */}
                        {showStatusDropdown === user.id && dropdownPosition &&
                          ReactDOM.createPortal(
                            <div
                              id="status-dropdown-portal"
                              className="z-50 w-40 bg-white border border-gray-200 rounded-md shadow-lg absolute"
                              style={{
                                position: "absolute",
                                top: dropdownPosition.top,
                                left: dropdownPosition.left,
                              }}
                            >
                              <div className="py-1">
                                <button
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                                  onClick={() => handleStatusChange(user.id, "Active")}
                                >
                                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                                  Active
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                                  onClick={() => handleStatusChange(user.id, "Inactive")}
                                >
                                  <span className="w-2 h-2 rounded-full bg-gray-400 mr-2"></span>
                                  Inactive
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                                  onClick={() => handleStatusChange(user.id, "Suspended")}
                                >
                                  <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
                                  Suspended
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                                  onClick={() => handleStatusChange(user.id, "Archived")}
                                >
                                  <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                                  Archived
                                </button>
                              </div>
                            </div>,
                            document.body
                          )
                        }
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewUser(user)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Edit className="h-5 w-5" />
                        </Button>
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
            Showing {Math.min(filteredUsers.length, 1)} to {Math.min(filteredUsers.length, Number.parseInt(entriesPerPage))} of {filteredUsers.length} entries
          </div>
          <div className="flex items-center space-x-1">
            <button
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-[#f0f0f0] text-[#6b7280] disabled:opacity-50"
              disabled={true}
            >
              «
            </button>
            <button
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-[#1162a8] text-white"
            >
              1
            </button>
            <button
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-[#f0f0f0] text-[#6b7280] disabled:opacity-50"
              disabled={true}
            >
              »
            </button>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={showAddUser}
        onClose={() => setShowAddUser(false)}
        onSuccess={handleCreateUserSuccess}
      />


      {/* Update User Modal */}
      <UpdateUserModal
        isOpen={showUpdateUser}
        onClose={() => {
          setShowUpdateUser(false)
          setUserToUpdate(null)
        }}
        onSuccess={handleUpdateUserSuccess}
        user={userToUpdate}
      />
    </div>
  )
}
