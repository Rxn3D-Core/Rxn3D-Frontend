"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, Filter, Search, Plus, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { OfficeUserDetail } from "@/components/office-administrator/office-user-detail"
import { AddUserForm } from "@/components/lab-administrator/add-user-form"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

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
}

export default function UserOfficeManagement() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, fetchUsers, updateUser } = useAuth()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null)
  const [showAddUser, setShowAddUser] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [entriesPerPage, setEntriesPerPage] = useState("20")
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [allSelected, setAllSelected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([])
  const [showStatusDropdown, setShowStatusDropdown] = useState<number | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Don't close if clicking on dropdown content
      if (showStatusDropdown !== null && !target.closest('[data-dropdown-content]')) {
        setShowStatusDropdown(null)
        setDropdownPosition(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showStatusDropdown])

  // Check if user has office admin permissions
  useEffect(() => {
    if (user && user.role !== "Office Admin" && !user?.roles?.includes("office_admin")) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      })
      router.replace("/dashboard")
    }
  }, [user, router, toast])

  // Avatar colors
  const avatarColors = [
    "bg-[#8bc34a]", // green
    "bg-[#f44336]", // red
    "bg-[#673ab7]", // purple
    "bg-[#ff9800]", // orange
    "bg-[#03a9f4]", // light blue
    "bg-[#9c27b0]", // purple
  ]

  // Transform API user data to StaffUser format
  const transformApiUser = (apiUser: any, index: number): StaffUser => {
    // Map API status to our status types
    const statusMap: { [key: string]: "Active" | "Inactive" | "Suspended" | "Archived" } = {
      'Active': 'Active',
      'active': 'Active',
      'Inactive': 'Inactive',
      'inactive': 'Inactive',
      'suspended': 'Suspended',
      'archived': 'Archived',
      'pending': 'Inactive' // Default pending to Inactive
    }

    // Extract role names from roles array
    const roleNames = apiUser.roles?.map((role: any) => role.name) || []
    const userType = roleNames.length > 0 ? roleNames.join(', ') : 'User'

    return {
      id: apiUser.id,
      name: `${apiUser.first_name || ''} ${apiUser.last_name || ''}`.trim() || apiUser.username || 'Unknown User',
      email: apiUser.email || '',
      phone: apiUser.phone || apiUser.work_number || '',
      userType: userType,
      joinDate: apiUser.created_at ? new Date(apiUser.created_at).toISOString().split('T')[0] : '',
      status: statusMap[apiUser.status] || 'Inactive',
      avatarColor: avatarColors[index % avatarColors.length],
    }
  }

  // Load staff users data
  const loadStaffUsers = async () => {
    setIsLoading(true)
    try {
      // Get customer_id from localStorage and pass it explicitly
      const customerId = localStorage.getItem('customerId')
      const params: { customer_id?: string } = {}
      if (customerId) {
        params.customer_id = customerId
      }
      const result = await fetchUsers(params)
      
      // Handle different response structures
      let userData = null
      
      if (Array.isArray(result)) {
        // Data is returned directly as array
        userData = result
      } else if (result.success && result.data) {
        // Data is wrapped in success response
        userData = result.data
      } else if (result.data && Array.isArray(result.data)) {
        // Data is in data property
        userData = result.data
      } else {
        throw new Error('Invalid response format')
      }

      if (userData && Array.isArray(userData)) {
        const transformedUsers = userData.map((apiUser: any, index: number) => 
          transformApiUser(apiUser, index)
        )
        setStaffUsers(transformedUsers)
      } else {
        throw new Error('No user data received')
      }
    } catch (error: any) {
      console.error("Failed to load staff users:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load staff users. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStaffUsers()
  }, [])

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

  // Filter staff users based on search term, status filter, and user type filter
  let filteredUsers = staffUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.includes(searchTerm)

    const matchesStatus = statusFilter === "all" || user.status === statusFilter
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
    router.replace(`/office-administrator/user-management?userId=${user.id}`)
  }

  // Handle add new user
  const handleAddUser = () => {
    setShowAddUser(true)
    setSelectedUser(null)
    router.replace("/office-administrator/user-management?action=add")
  }

  // Handle back to list
  const handleBackToList = () => {
    setSelectedUser(null)
    setShowAddUser(false)
    router.replace("/office-administrator/user-management")
    // Reload users to get latest data
    loadStaffUsers()
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

  // Handle status dropdown toggle
  const handleStatusDropdownToggle = (userId: number, event: React.MouseEvent<HTMLButtonElement>) => {
    if (showStatusDropdown === userId) {
      setShowStatusDropdown(null)
      setDropdownPosition(null)
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect()
      setDropdownPosition({
        top: buttonRect.bottom + window.scrollY + 4,
        left: buttonRect.right + window.scrollX - 160
      })
      setShowStatusDropdown(userId)
    }
  }

  // Handle status change with API integration
  const handleStatusChange = async (userId: number, newStatus: string) => {
    try {
      // Map our status types to API status
      const apiStatusMap: { [key: string]: string } = {
        'Active': 'active',
        'Inactive': 'inactive', 
        'Suspended': 'suspended',
        'Archived': 'archived'
      }

      const apiStatus = apiStatusMap[newStatus]
      if (!apiStatus) {
        throw new Error('Invalid status')
      }

      // Update user status via API
      const result = await updateUser(userId, { status: apiStatus })
      
      if (result.success) {
        // Update local state
        setStaffUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === userId ? { ...user, status: newStatus as "Active" | "Inactive" | "Suspended" | "Archived" } : user,
          ),
        )
        
        toast({
          title: "Status Updated",
          description: `User status has been updated to ${newStatus}.`,
          variant: "default",
        })
      } else {
        throw new Error(result.message || 'Failed to update user status')
      }
    } catch (error: any) {
      console.error("Failed to update user status:", error)
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setShowStatusDropdown(null)
      setDropdownPosition(null)
    }
  }

  // If showing user detail or add user form
  if (selectedUser || showAddUser) {
    return (
      <div className="h-full">
        {selectedUser ? (
          <OfficeUserDetail user={selectedUser} onBack={handleBackToList} />
        ) : (
          <AddUserForm onCancel={handleBackToList} onSuccess={handleBackToList} />
        )}
      </div>
    )
  }

  return (
    <div className="py-6 px-4">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 mt-1">Manage and monitor all users in your organization</p>
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

              <Button className="bg-[#1162a8] hover:bg-blue-700 text-white" onClick={handleAddUser}>
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
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-blue-50 transition-colors">
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
                          data-status-dropdown={user.id}
                          onClick={(e) => handleStatusDropdownToggle(user.id, e)}
                          className={`${getStatusBadgeClass(user.status)} px-3 py-1 rounded-md text-sm flex items-center`}
                        >
                          <span className="mr-1">•</span> {user.status}
                          <ChevronDown className="h-4 w-4 ml-1" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewUser(user)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        title="View user details"
                      >
                        <Eye className="h-5 w-5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Status Dropdown Portal - Outside table to avoid clipping */}
        {showStatusDropdown !== null && dropdownPosition && (
          <div className="fixed inset-0 z-50">
            <div 
              data-dropdown-content
              className="absolute bg-white border border-gray-200 rounded-md shadow-lg w-40"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`
              }}
            >
              <div className="py-1">
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleStatusChange(showStatusDropdown!, "Active");
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                  Active
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleStatusChange(showStatusDropdown!, "Inactive");
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-gray-400 mr-2"></span>
                  Inactive
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleStatusChange(showStatusDropdown!, "Suspended");
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
                  Suspended
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleStatusChange(showStatusDropdown!, "Archived");
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                  Archived
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 flex justify-between items-center border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Showing 1 to {Math.min(filteredUsers.length, Number.parseInt(entriesPerPage))} of {filteredUsers.length}{" "}
            entries
          </div>
          <div className="flex items-center space-x-1">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" className="bg-blue-600 text-white">
              1
            </Button>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
