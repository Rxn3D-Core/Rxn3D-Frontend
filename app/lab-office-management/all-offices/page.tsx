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
import { useCustomer } from "@/contexts/customer-context"
import ReactDOM from "react-dom"

// Updated interface to match customer data structure
interface officeCustomers {
  id: number
  name: string
  website: string
  address: string
  logo_url: string | null
  city: string
  postal_code: string
  email: string
  type: string
  status: string
  unique_code: string
  created_at: string
  updated_at: string
}

const avatarColors = [
  "bg-[#8bc34a]", // green
  "bg-[#f44336]", // red
  "bg-[#673ab7]", // purple
  "bg-[#ff9800]", // orange
  "bg-[#03a9f4]", // light blue
  "bg-[#9c27b0]", // purple
]

export default function AllOffice() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<officeCustomers | null>(null)
  const [showAddUser, setShowAddUser] = useState(false)
  const [entriesPerPage, setEntriesPerPage] = useState("20")
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [allSelected, setAllSelected] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<keyof officeCustomers | null>(null)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null)

  const { isLoading, customers, officeCustomers, fetchCustomers } = useCustomer()
  // Fetch customers when component mounts
  useEffect(() => {
    fetchCustomers("office")
  }, [fetchCustomers])

  // Check URL params for user detail view
  useEffect(() => {
    const userId = searchParams.get("userId")
    if (userId && officeCustomers) {
      const user = officeCustomers.find((u) => u.id === Number.parseInt(userId))
      if (user) {
        setSelectedUser(user)
      }
    }
  }, [searchParams, officeCustomers])

  // Filter lab customers based on search term and status filter
  const filteredUsers = officeCustomers ? officeCustomers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.unique_code.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || String(user.status) === statusFilter

    return matchesSearch && matchesStatus
  }) : []

  // Handle sorting
  const handleSort = (field: keyof officeCustomers) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  // Sort and paginate filtered users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortField) return 0
    const aValue = a[sortField]
    const bValue = b[sortField]
    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue
    }
    return 0
  })

  const entriesPerPageNum = parseInt(entriesPerPage, 10)
  const paginatedUsers = sortedUsers.slice((currentPage - 1) * entriesPerPageNum, currentPage * entriesPerPageNum)
  const totalPages = Math.ceil(filteredUsers.length / entriesPerPageNum)

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
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
  const handleViewUser = (user: officeCustomers) => {
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
    toast({
      title: "Status Update",
      description: `Status would be updated to ${newStatus} (API call needed)`,
    })
    setShowStatusDropdown(null)
    setDropdownPosition(null)
  }

  // Handle status dropdown open/close and position
  const handleStatusDropdown = (labId: number, event: React.MouseEvent<HTMLButtonElement>) => {
    if (showStatusDropdown === labId) {
      setShowStatusDropdown(null)
      setDropdownPosition(null)
    } else {
      const rect = (event.target as HTMLElement).getBoundingClientRect()
      setShowStatusDropdown(labId)
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

  // Get formatted date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
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
              <div className="px-4 py-2 rounded-lg flex items-center gap-2 w-full md:w-auto">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </div>

              <Button className="bg-[#1162a8] text-white px-3 py-1.5 rounded text-sm" onClick={handleAddUser}>
                <Plus className="h-4 w-4 mr-2" />
                Add Office
              </Button>
            </div>
            <div className="relative w-full md:w-auto">
              <Input
                type="text"
                placeholder="Search Office"
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
                <th className="px-4 py-3 text-left font-medium cursor-pointer" onClick={() => handleSort("name")}>
                  <div className="flex items-center">
                    Name
                    {sortField === "name" && (sortOrder === "asc" ? " ↑" : " ↓")}
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer" onClick={() => handleSort("email")}>
                  <div className="flex items-center">
                    Email
                    {sortField === "email" && (sortOrder === "asc" ? " ↑" : " ↓")}
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer" onClick={() => handleSort("city")}>
                  <div className="flex items-center">
                    City
                    {sortField === "city" && (sortOrder === "asc" ? " ↑" : " ↓")}
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer" onClick={() => handleSort("unique_code")}>
                  <div className="flex items-center">
                    Code
                    {sortField === "unique_code" && (sortOrder === "asc" ? " ↑" : " ↓")}
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer" onClick={() => handleSort("created_at")}>
                  <div className="flex items-center">
                    Created
                    {sortField === "created_at" && (sortOrder === "asc" ? " ↑" : " ↓")}
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  Status
                </th>
                <th className="px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    Loading offices...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    No offices found.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((lab) => (
                  <tr key={lab.id} className="hover:bg-blue-50">
                    <td className="px-4 py-4">
                      <Checkbox
                        checked={selectedRows.includes(lab.id)}
                        onCheckedChange={() => toggleSelectRow(lab.id)}
                        aria-label={`Select ${lab.name}`}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className={getAvatarFallback(lab.name).color}>
                        </Avatar>
                        <span className="font-medium">{lab.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-700">{lab.email}</td>
                    <td className="px-4 py-4 text-gray-700">{lab.city}</td>
                    <td className="px-4 py-4 text-gray-700">{lab.unique_code}</td>
                    <td className="px-4 py-4 text-gray-700">{formatDate(lab.created_at)}</td>
                    <td className="px-4 py-4 relative">
                      <div className="relative">
                        <button
                          onClick={(e) => handleStatusDropdown(lab.id, e)}
                          className={`${getStatusBadgeClass(lab.status)} px-3 py-1 rounded-md text-sm flex items-center`}
                        >
                          <span className="mr-1">•</span> {lab.status}
                          <ChevronDown className="h-4 w-4 ml-1" />
                        </button>
                        {/* Dropdown is now rendered via portal */}
                        {showStatusDropdown === lab.id && dropdownPosition &&
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
                                  onClick={() => handleStatusChange(lab.id, "Active")}
                                >
                                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                                  Active
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                                  onClick={() => handleStatusChange(lab.id, "Inactive")}
                                >
                                  <span className="w-2 h-2 rounded-full bg-gray-400 mr-2"></span>
                                  Inactive
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                                  onClick={() => handleStatusChange(lab.id, "Suspended")}
                                >
                                  <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
                                  Suspended
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                                  onClick={() => handleStatusChange(lab.id, "Archived")}
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
                        onClick={() => handleViewUser(lab)}
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
            Showing {(currentPage - 1) * entriesPerPageNum + 1} to{" "}
            {Math.min(currentPage * entriesPerPageNum, filteredUsers.length)} of {filteredUsers.length} entries
          </div>
          <div className="flex items-center space-x-1">
            <button
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-[#f0f0f0] text-[#6b7280] disabled:opacity-50"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              «
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs ${
                  currentPage === i + 1 ? "bg-[#1162a8] text-white" : "bg-[#f0f0f0] text-[#6b7280]"
                }`}
                onClick={() => handlePageChange(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-[#f0f0f0] text-[#6b7280] disabled:opacity-50"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
