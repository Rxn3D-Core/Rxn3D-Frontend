"use client"

import { useState, useEffect } from "react"
import { Eye, Search, Plus, ChevronDown, X } from "lucide-react"
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
import { Dialog, DialogContent } from "@/components/ui/dialog"

// Updated interface to match customer data structure
interface LabCustomer {
  id: number
  name: string
  website: string | null
  address: string
  logo_url: string | null
  city: string
  postal_code: string
  email: string
  phone?: string
  userType?: string
  joinDate?: string
  type: string
  status: string
  unique_code: string
  created_at: string
  updated_at: string
}

interface SelectedLabCustomer extends LabCustomer {
  phone: string
  userType: string
  joinDate: string
  city: string
  postal_code: string
  stateName?: string
  countryName?: string
  labNumber?: string
  contactName?: string
  contactEmail?: string
  contactNumber?: string
  release_casepan?: string
  hoursData?: {
    workingDays: Array<{
      day: string
      enabled: boolean
      startTime: string
      endTime: string
    }>
    timezone: string
    holidays: string
  }
  pickupData?: {
    serviceArea: string
    pickupDays: string
    cutOffTime: string
    frequency: string
    window: string
  }
  deliveryData?: {
    serviceArea: string
    deliveryDays: string
    defaultTime: string
    window: string
  }
  rushSettings?: {
    enabled: boolean
    description: string
    rush_type?: "fixed" | "flexible"
    fixed_turnaround_days?: number
    fixed_rush_fee_percentage?: string
  }
  labAdmins?: Array<{
    id: number
    name: string
    email: string
    phone?: string
    status?: string
    role?: string
  }>
}

function TableSkeletonRows({ rows = 5, cols = 8 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-4">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export default function AllLabs() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<SelectedLabCustomer | null>(null)
  const [showAddUser, setShowAddUser] = useState(false)
  const [entriesPerPage, setEntriesPerPage] = useState("20")
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [allSelected, setAllSelected] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<keyof LabCustomer | null>(null)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null)

  const { isCustomersLoading, labCustomers, fetchCustomers, pagination, updateCustomerProfile, fetchCustomerProfile } = useCustomer()
  const API_STATUS_OPTIONS = ["Active", "Inactive"] as const

  useEffect(() => {
    fetchCustomers("lab", {
      q: searchTerm.trim() || undefined,
      status: statusFilter === "all" ? undefined : (statusFilter as "Active" | "Inactive"),
      per_page: parseInt(entriesPerPage, 10),
      order_by: sortField === "name" ? "name" : "created_at",
      sort_by: sortOrder,
      page: currentPage,
    })
  }, [fetchCustomers, searchTerm, statusFilter, entriesPerPage, sortField, sortOrder, currentPage])

  // Handle sorting
  const handleSort = (field: keyof LabCustomer) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const entriesPerPageNum = parseInt(entriesPerPage, 10)
  const paginatedUsers = labCustomers || []
  const totalPages = pagination?.last_page || 1

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page)
    }
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
      setSelectedRows(paginatedUsers.map((user) => user.id))
    }
    setAllSelected(!allSelected)
  }

  // Handle view user details
  const handleViewUser = async (user: LabCustomer) => {
    try {
      const profile = await fetchCustomerProfile(user.id)
      const profileData = profile as any
      const toDisplayTime = (timeValue?: string) => {
        if (!timeValue) return ""
        const parsed = new Date(timeValue)
        if (!Number.isNaN(parsed.getTime())) {
          return parsed.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
        }
        if (typeof timeValue === "string") {
          const [h, m] = timeValue.split(":")
          if (h && m) {
            const d = new Date()
            d.setHours(Number(h), Number(m), 0, 0)
            if (!Number.isNaN(d.getTime())) {
              return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
            }
          }
        }
        return ""
      }
      const hoursData = {
        workingDays: (profileData?.business_settings?.business_hours || []).map((hour: any) => ({
          day: hour?.day ? `${String(hour.day).charAt(0).toUpperCase()}${String(hour.day).slice(1)}` : "",
          enabled: !!hour?.is_open,
          startTime: hour?.open_time ? toDisplayTime(hour.open_time) : "",
          endTime: hour?.close_time ? toDisplayTime(hour.close_time) : "",
        })),
        timezone: profileData?.state?.name || "Unknown Timezone",
        holidays: "All Federal Holidays",
      }
      const pickupData = {
        serviceArea:
          profileData?.business_settings?.pickup_area ||
          `${profileData?.city || ""}, ${profileData?.state?.name || ""} ${profileData?.country?.name || ""}`.trim(),
        pickupDays: profileData?.business_settings?.pickup_days || "Lab hours",
        cutOffTime: profileData?.business_settings?.case_schedule?.default_pickup_time
          ? toDisplayTime(profileData.business_settings.case_schedule.default_pickup_time)
          : "",
        frequency: profileData?.business_settings?.pickup_frequency || "Daily",
        window: profileData?.business_settings?.pickup_window || "10:00 am - 2:00 pm",
      }
      const deliveryData = {
        serviceArea:
          profileData?.business_settings?.delivery_area ||
          `${profileData?.city || ""}, ${profileData?.state?.name || ""} ${profileData?.country?.name || ""}`.trim(),
        deliveryDays: profileData?.business_settings?.delivery_days || "Lab hours",
        defaultTime: profileData?.business_settings?.case_schedule?.default_delivery_time
          ? toDisplayTime(profileData.business_settings.case_schedule.default_delivery_time)
          : "",
        window: profileData?.business_settings?.delivery_window || "3:00 pm - 6:00 pm",
      }
      const rushSettings = {
        enabled: !!profileData?.business_settings?.case_schedule?.enable_rush_cases,
        description: "Allow users to request expedited processing.",
        rush_type: profileData?.business_settings?.case_schedule?.rush_type as "fixed" | "flexible" | undefined,
        fixed_turnaround_days: profileData?.business_settings?.case_schedule?.fixed_turnaround_days,
        fixed_rush_fee_percentage:
          profileData?.business_settings?.case_schedule?.fixed_rush_fee_percentage !== undefined
            ? String(profileData.business_settings.case_schedule.fixed_rush_fee_percentage)
            : undefined,
      }
      const admins = (profileData?.users || [])
        .filter((u: any) => u?.role?.name === "lab_admin")
        .map((u: any) => ({
          id: u.id,
          name: `${u.first_name || ""} ${u.last_name || ""}`.trim(),
          email: u.email || "",
          phone: u.phone || "",
          status: u.status || "",
          role: u?.role?.name || "lab_admin",
        }))

      setSelectedUser({
        ...user,
        phone: user.phone || "",
        userType: user.userType || user.type,
        joinDate: user.joinDate || formatDate(user.created_at),
        city: profileData?.city || user.city || "",
        postal_code: profileData?.postal_code || user.postal_code || "",
        stateName: profileData?.state?.name || "",
        countryName: profileData?.country?.name || "",
        labNumber: profileData?.default_admin?.work_number || "",
        contactName: profileData?.default_admin ? `${profileData.default_admin.first_name || ""} ${profileData.default_admin.last_name || ""}`.trim() : "",
        contactEmail: profileData?.default_admin?.email || "",
        contactNumber: profileData?.default_admin?.phone || "",
        release_casepan: profileData?.release_casepan || "",
        hoursData,
        pickupData,
        deliveryData,
        rushSettings,
        address: [profileData?.address || user.address, profileData?.city || user.city, profileData?.state?.name, profileData?.country?.name, profileData?.postal_code || user.postal_code]
          .filter(Boolean)
          .join(", "),
        labAdmins: admins,
      })
    } catch {
      setSelectedUser({
        ...user,
        phone: user.phone || "",
        userType: user.userType || user.type,
        joinDate: user.joinDate || formatDate(user.created_at),
        city: user.city || "",
        postal_code: user.postal_code || "",
        stateName: "",
        countryName: "",
        labNumber: "",
        contactName: "",
        contactEmail: "",
        contactNumber: "",
        release_casepan: "",
        hoursData: {
          workingDays: [],
          timezone: "Unknown Timezone",
          holidays: "All Federal Holidays",
        },
        pickupData: {
          serviceArea: "",
          pickupDays: "",
          cutOffTime: "",
          frequency: "",
          window: "",
        },
        deliveryData: {
          serviceArea: "",
          deliveryDays: "",
          defaultTime: "",
          window: "",
        },
        rushSettings: {
          enabled: false,
          description: "Allow users to request expedited processing.",
        },
        labAdmins: [],
      })
    }
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

  // Define avatar colors
  const avatarColors = [
    "bg-[#8bc34a]", // green
    "bg-[#f44336]", // red
    "bg-[#673ab7]", // purple
    "bg-[#ff9800]", // orange
    "bg-[#03a9f4]", // light blue
    "bg-[#9c27b0]", // purple
  ]

  // Get avatar color based on user ID
  const getAvatarColor = (id: number) => {
    return avatarColors[id % avatarColors.length]
  }

  // Get avatar fallback from name
  const getAvatarFallback = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  // Handle status change
  const handleStatusChange = async (userId: number, newStatus: "Active" | "Inactive") => {
    try {
      await updateCustomerProfile(userId, { status: newStatus } as any)
      toast({
        title: "Status Updated",
        description: `Customer status changed to ${newStatus}.`,
      })
      await fetchCustomers("lab", {
        q: searchTerm.trim() || undefined,
        status: statusFilter === "all" ? undefined : (statusFilter as "Active" | "Inactive"),
        per_page: parseInt(entriesPerPage, 10),
        order_by: sortField === "name" ? "name" : "created_at",
        sort_by: sortOrder,
        page: currentPage,
      })
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error?.message || "Failed to update customer status.",
        variant: "destructive",
      })
    } finally {
      setShowStatusDropdown(null)
      setDropdownPosition(null)
    }
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

  // If showing add user form
  if (showAddUser) {
    return (
      <div className="h-full">
        <AddUserForm onCancel={handleBackToList} onSuccess={handleBackToList} />
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
              <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setCurrentPage(1) }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Button className="bg-[#1162a8] text-white px-3 py-1.5 rounded text-sm" onClick={handleAddUser}>
                <Plus className="h-4 w-4 mr-2" />
                Add Lab
              </Button>
            </div>
            <div className="relative w-full md:w-auto">
              <Input
                type="text"
                placeholder="Search Lab"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
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
              {isCustomersLoading ? (
                <TableSkeletonRows rows={5} cols={8} />
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    No labs found.
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
                        <Avatar className={getAvatarColor(lab.id)}>
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
                              className="z-50 w-40 bg-white border border-gray-200 rounded-md shadow-lg"
                              style={{
                                position: "absolute",
                                top: dropdownPosition.top,
                                left: dropdownPosition.left,
                              }}
                            >
                              <div className="py-1">
                                {API_STATUS_OPTIONS.map((status) => (
                                  <button
                                    key={status}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                                    onClick={() => handleStatusChange(lab.id, status)}
                                  >
                                    <span className={`w-2 h-2 rounded-full mr-2 ${status === "Active" ? "bg-green-500" : "bg-gray-400"}`}></span>
                                    {status}
                                  </button>
                                ))}
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
            Showing {pagination.total === 0 ? 0 : (pagination.current_page - 1) * pagination.per_page + 1} to{" "}
            {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total} entries
          </div>
          <div className="flex items-center space-x-1">
            <button
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-[#f0f0f0] text-[#6b7280] disabled:opacity-50"
              disabled={pagination.current_page === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              «
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs ${
                  pagination.current_page === i + 1 ? "bg-[#1162a8] text-white" : "bg-[#f0f0f0] text-[#6b7280]"
                }`}
                onClick={() => handlePageChange(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-[#f0f0f0] text-[#6b7280] disabled:opacity-50"
              disabled={pagination.current_page === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              »
            </button>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] p-0 overflow-hidden flex flex-col">
          <div className="shrink-0 border-b bg-white px-4 py-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              {selectedUser?.name ? `${selectedUser.name} Details` : "Lab Details"}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSelectedUser(null)}
              className="h-8 w-8"
              aria-label="Close details modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {selectedUser && (
              <StaffUserDetail
                user={selectedUser as any}
                onBack={() => setSelectedUser(null)}
                mode="lab"
                hideOtherNotes={true}
                customerId={selectedUser.id}
                customerType="lab"
                hoursData={selectedUser.hoursData}
                pickupData={selectedUser.pickupData}
                deliveryData={selectedUser.deliveryData}
                rushSettings={selectedUser.rushSettings}
                labAdmins={selectedUser.labAdmins || []}
              />
            )}
          </div>

          <div className="shrink-0 border-t bg-white px-4 py-3 flex justify-end">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setSelectedUser(null)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
