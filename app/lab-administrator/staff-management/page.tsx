"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, Filter, Search, Plus, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StaffUserDetail } from "@/components/lab-administrator/staff-user-detail"
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
  uuid?: string
  work_number?: string
  roles?: Array<{ id: number; name: string; permissions: string[] }>
}

export default function StaffManagementPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const { fetchUsers, updateUser } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null)
  const [showAddUser, setShowAddUser] = useState(false)
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

  // Check if user has lab admin permissions
  useEffect(() => {
    if (user && user.role !== "Lab Admin" && !user?.roles?.includes("lab_admin")) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      })
      router.replace("/dashboard")
    }
  }, [user, router, toast])

  // Load staff users data
  useEffect(() => {
    const loadStaffUsers = async () => {
      setIsLoading(true)
      try {
        // Fetch users with lab_admin role and Active status
        const response = await fetchUsers({ 
          status: "Active", 
          role: "lab_admin" 
        });

        // Avatar colors
        const avatarColors = [
          "bg-[#8bc34a]", // green
          "bg-[#f44336]", // red
          "bg-[#673ab7]", // purple
          "bg-[#ff9800]", // orange
          "bg-[#03a9f4]", // light blue
          "bg-[#9c27b0]", // purple
        ]

        // Transform API response to StaffUser format
        const transformedUsers: StaffUser[] = response.data.map((apiUser: any, index: number) => ({
          id: apiUser.id,
          uuid: apiUser.uuid,
          name: `${apiUser.first_name} ${apiUser.last_name}`,
          email: apiUser.email,
          phone: apiUser.phone || apiUser.work_number || "N/A",
          userType: apiUser.roles?.[0]?.name === "lab_admin" ? "Lab Admin" : "User",
          joinDate: new Date(apiUser.created_at).toLocaleDateString('en-US'),
          status: apiUser.status as "Active" | "Inactive" | "Suspended" | "Archived",
          avatarColor: avatarColors[index % avatarColors.length],
          work_number: apiUser.work_number,
          roles: apiUser.roles,
        }));

        setStaffUsers(transformedUsers)
      } catch (error) {
        console.error("Failed to load staff users:", error)
        toast({
          title: "Error",
          description: "Failed to load staff users. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadStaffUsers()
  }, [toast, fetchUsers])

  // Check URL params for user detail view
  useEffect(() => {
    const userId = searchParams.get("userId")
    if (userId) {
      const user = staffUsers.find((u) => u.id === Number.parseInt(userId))
      if (user) {
        setSelectedUser(user)
      }
    }
  }, [searchParams, staffUsers])

  // Filter staff users based on search term and status filter
  const filteredUsers = staffUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.includes(searchTerm)

    const matchesStatus = statusFilter === "all" || user.status === statusFilter

    return matchesSearch && matchesStatus
  })

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
    router.replace(`/lab-administrator/staff-management?userId=${user.id}`)
  }

  // Handle add new user
  const handleAddUser = () => {
    setShowAddUser(true)
    setSelectedUser(null)
    router.replace("/lab-administrator/staff-management?action=add")
  }

  // Handle back to list
  const handleBackToList = () => {
    setSelectedUser(null)
    setShowAddUser(false)
    router.replace("/lab-administrator/staff-management")
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
  const handleStatusChange = async (userId: number, newStatus: string) => {
    
    try {
      // Update status via API
      const result = await updateUser(userId, { status: newStatus });
      
      // Update local state on successful API call
      setStaffUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, status: newStatus as "Active" | "Inactive" | "Suspended" | "Archived" } : user,
        ),
      )
      
      setShowStatusDropdown(null)
      setDropdownPosition(null)
      
      toast({
        title: "Status Updated",
        description: `User status has been successfully updated to ${newStatus}.`,
        variant: "default",
      })
    } catch (error) {
      console.error("Failed to update user status:", error)
      toast({
        title: "Update Failed",
        description: "Failed to update user status. Please try again.",
        variant: "destructive",
      })
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

  // If showing user detail or add user form
  if (selectedUser || showAddUser) {
    return (
      <div className="h-full">
        {selectedUser ? (
          <StaffUserDetail user={selectedUser} onBack={handleBackToList} />
        ) : (
          <AddUserForm onCancel={handleBackToList} onSuccess={handleBackToList} />
        )}
      </div>
    )
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
              <div className=" px-4 py-2 rounded-lg flex items-center gap-2 w-full md:w-auto">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filter
                </Button>
              </div>

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
                <th className="px-4 py-3 text-left font-medium">
                  <div className="flex items-center">
                    Name
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  <div className="flex items-center">
                    Email
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  <div className="flex items-center">
                    User Type
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  <div className="flex items-center">
                    Phone Number
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  <div className="flex items-center">
                    Join Date
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  <div className="flex items-center">
                    Status
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </div>
                </th>
                <th className="px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    Loading staff users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    No staff users found.
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
                        <Avatar className={user.avatarColor}>
                          
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
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
                        className="text-blue-600 hover:text-blue-800"
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
