"use client"

import { useState, useEffect, useRef } from "react"
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
import ReactDOM from "react-dom"

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

const avatarColors = [
  "bg-[#8bc34a]", // green
  "bg-[#f44336]", // red
  "bg-[#673ab7]", // purple
  "bg-[#ff9800]", // orange
  "bg-[#03a9f4]", // light blue
  "bg-[#9c27b0]", // purple
]

export default function AllUsers() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { fetchUsers } = useAuth()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null)
  const [showAddUser, setShowAddUser] = useState(false)
  const [entriesPerPage, setEntriesPerPage] = useState("20")
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [allSelected, setAllSelected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [users, setUsers] = useState<StaffUser[]>([])
  const [showStatusDropdown, setShowStatusDropdown] = useState<number | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null)

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true)
      try {
        // Get customer_id from localStorage and pass it explicitly
        const customerId = localStorage.getItem('customerId')
        const params: { customer_id?: string } = {}
        if (customerId) {
          params.customer_id = customerId
        }
        const response = await fetchUsers(params)

        // Ensure response.data exists and is an array
        const usersData = response?.data || []
        if (!Array.isArray(usersData)) {
          throw new Error("Invalid response format: data is not an array")
        }

        const data = usersData.map((user, index) => {
          const primaryCustomer = user.customers.find((customer) => customer.is_primary === 1)
          const userType = primaryCustomer?.role?.name.replace("_", " ") || "N/A"

          return {
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
            phone: user.phone || "N/A",
            userType,
            joinDate: new Date(user.created_at).toISOString().split("T")[0],
            status: user.status,
            avatarColor: avatarColors[index % avatarColors.length],
          }
        })

        setUsers(data)
      } catch (error) {
        console.error("Failed to load users:", error)
        toast({
          title: "Error",
          description: "Failed to load users. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadUsers()
  }, [toast])

  useEffect(() => {
    const userId = searchParams.get("userId")
    if (userId) {
      const user = users.find((u) => u.id === Number.parseInt(userId))
      if (user) {
        setSelectedUser(user)
      }
    }
  }, [searchParams, users])

  const filteredUsers = users.filter((user) => {
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
  }

  // Handle add new user
  const handleAddUser = () => {
    setShowAddUser(true)
    setSelectedUser(null)
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
      default:
        return "bg-[#eeeeee] text-[#a19d9d]"
    }
  }

  // Get avatar fallback from name
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

  // Handle status change
  const handleStatusChange = (userId: number, newStatus: string) => {
    setUsers((prevUsers) =>
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

              <Button className="bg-[#1162a8] text-white px-3 py-1.5 rounded text-sm" onClick={handleAddUser}>
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
    </div>
  )
}
