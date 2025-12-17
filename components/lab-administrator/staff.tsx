"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Copy,
  Download,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Pencil,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Staff {
  id: number
  name: string
  email: string
  role: string
  department: string
  status: "Active" | "Inactive" | "On Leave"
  avatar?: string
}

const initialStaff: Staff[] = [
  {
    id: 1,
    name: "John Doe",
    email: "john.doe@example.com",
    role: "Technician",
    department: "Prosthodontics",
    status: "Active",
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane.smith@example.com",
    role: "Senior Technician",
    department: "Orthodontics",
    status: "Active",
  },
  {
    id: 3,
    name: "Robert Johnson",
    email: "robert.johnson@example.com",
    role: "Lab Manager",
    department: "Administration",
    status: "Active",
  },
  {
    id: 4,
    name: "Emily Davis",
    email: "emily.davis@example.com",
    role: "Technician",
    department: "Endodontics",
    status: "On Leave",
  },
  {
    id: 5,
    name: "Michael Wilson",
    email: "michael.wilson@example.com",
    role: "Technician",
    department: "Prosthodontics",
    status: "Inactive",
  },
]

export function Staff() {
  const [staff, setStaff] = useState<Staff[]>(initialStaff)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    department: "",
    status: "Active" as "Active" | "Inactive" | "On Leave",
  })
  const { toast } = useToast()

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Reset form data when dialog opens/closes
  useEffect(() => {
    if (isAddDialogOpen) {
      setFormData({
        name: "",
        email: "",
        role: "",
        department: "",
        status: "Active",
      })
    }
  }, [isAddDialogOpen])

  // Set form data when editing
  useEffect(() => {
    if (selectedStaff && isEditDialogOpen) {
      setFormData({
        name: selectedStaff.name,
        email: selectedStaff.email,
        role: selectedStaff.role,
        department: selectedStaff.department,
        status: selectedStaff.status,
      })
    }
  }, [selectedStaff, isEditDialogOpen])

  // Get unique values for filters
  const departments = ["all", ...new Set(staff.map((s) => s.department))]
  const roles = ["all", ...new Set(staff.map((s) => s.role))]
  const statuses = ["all", "Active", "Inactive", "On Leave"]

  // Filter staff based on search term and filters
  const filteredStaff = staff.filter((s) => {
    const matchesSearch = Object.values(s).some((value) =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase()),
    )

    const matchesStatus = statusFilter === "all" || s.status === statusFilter
    const matchesDepartment = departmentFilter === "all" || s.department === departmentFilter
    const matchesRole = roleFilter === "all" || s.role === roleFilter

    return matchesSearch && matchesStatus && matchesDepartment && matchesRole
  })

  // Calculate pagination
  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredStaff.slice(indexOfFirstItem, indexOfLastItem)

  // Check if we're showing all records on the current page
  const isShowingAllRecords = filteredStaff.length <= itemsPerPage || indexOfLastItem >= filteredStaff.length

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, departmentFilter, roleFilter])

  // Add staff
  const addStaff = () => {
    const newStaff: Staff = {
      id: Date.now(),
      ...formData,
    }

    setStaff([...staff, newStaff])
    setIsAddDialogOpen(false)
    toast({
      title: "Staff Added",
      description: `${formData.name} has been added successfully.`,
    })
  }

  // Edit staff
  const editStaff = () => {
    if (!selectedStaff) return

    const updatedStaff = staff.map((s) => (s.id === selectedStaff.id ? { ...s, ...formData } : s))

    setStaff(updatedStaff)
    setIsEditDialogOpen(false)
    toast({
      title: "Staff Updated",
      description: `${formData.name} has been updated successfully.`,
    })
  }

  // Delete staff
  const deleteStaff = (id: number) => {
    const updatedStaff = staff.filter((s) => s.id !== id)
    setStaff(updatedStaff)
    toast({
      title: "Staff Deleted",
      description: "The staff member has been deleted successfully.",
    })
  }

  // Duplicate staff
  const duplicateStaff = (s: Staff) => {
    const newStaff = {
      ...s,
      id: Date.now(),
      name: `${s.name} (Copy)`,
      email: `copy.${s.email}`,
    }

    setStaff([...staff, newStaff])
    toast({
      title: "Staff Duplicated",
      description: `${s.name} has been duplicated successfully.`,
    })
  }

  // Export staff as CSV
  const exportCSV = () => {
    const headers = ["ID", "Name", "Email", "Role", "Department", "Status"]

    const csvRowsData = [
      headers.join(","),
      ...filteredStaff.map((s) => [s.id, s.name, s.email, s.role, s.department, s.status].join(",")),
    ]

    const csvContent = csvRowsData.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "staff_export.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export Complete",
      description: "The staff list has been exported as CSV.",
    })
  }

  // Load sample data
  const loadSampleData = () => {
    const sampleData: Staff[] = [
      {
        id: 6,
        name: "Sarah Johnson",
        email: "sarah.johnson@example.com",
        role: "Senior Technician",
        department: "Prosthodontics",
        status: "Active",
      },
      {
        id: 7,
        name: "David Brown",
        email: "david.brown@example.com",
        role: "Technician",
        department: "Orthodontics",
        status: "Active",
      },
      {
        id: 8,
        name: "Lisa Anderson",
        email: "lisa.anderson@example.com",
        role: "Lab Assistant",
        department: "Endodontics",
        status: "Active",
      },
    ]

    setStaff([...staff, ...sampleData])
    toast({
      title: "Sample Data Loaded",
      description: "Additional sample staff members have been loaded.",
    })
  }

  // Clear all staff
  const clearStaff = () => {
    setStaff([])
    toast({
      title: "Staff Cleared",
      description: "All staff records have been cleared.",
    })
  }

  // Pagination controls
  const goToPage = (page: number) => {
    if (page < 1) page = 1
    if (page > totalPages) page = totalPages
    setCurrentPage(page)
  }

  const goToFirstPage = () => goToPage(1)
  const goToPreviousPage = () => goToPage(currentPage - 1)
  const goToNextPage = () => goToPage(currentPage + 1)
  const goToLastPage = () => goToPage(totalPages)

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      // Show all pages if there are fewer than maxPagesToShow
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      // Calculate which pages to show
      let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2))
      let endPage = startPage + maxPagesToShow - 1

      if (endPage > totalPages) {
        endPage = totalPages
        startPage = Math.max(1, endPage - maxPagesToShow + 1)
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i)
      }
    }

    return pageNumbers
  }

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Staff</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadSampleData}>
            Load Sample Data
          </Button>
          <Button variant="outline" onClick={exportCSV} disabled={filteredStaff.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600">
                <Plus className="h-4 w-4 mr-2" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Staff Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Enter role"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Enter department"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value as "Active" | "Inactive" | "On Leave" })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="On Leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={addStaff}
                  disabled={!formData.name || !formData.email || !formData.role || !formData.department}
                >
                  Add Staff
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={staff.length === 0}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Staff
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all staff records.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearStaff}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="text-sm text-gray-500">Manage dental lab staff members and their roles</div>

      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:w-1/3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search staff..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="w-full md:w-1/5">
          <label className="text-sm font-medium">Department</label>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((department) => (
                <SelectItem key={department} value={department}>
                  {department === "all" ? "All Departments" : department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-1/5">
          <label className="text-sm font-medium">Role</label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role === "all" ? "All Roles" : role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-1/5">
          <label className="text-sm font-medium">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === "all" ? "All Statuses" : status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-blue-50 text-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Staff</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Department</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {currentItems.length > 0 ? (
                currentItems.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={s.avatar} />
                          <AvatarFallback>{getInitials(s.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{s.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{s.email}</td>
                    <td className="px-4 py-3 text-gray-900">{s.role}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                        {s.department}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          s.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : s.status === "Inactive"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedStaff(s)
                            setIsEditDialogOpen(true)
                          }}
                          title="Edit Staff"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => duplicateStaff(s)} title="Duplicate Staff">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" title="Delete Staff">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the staff member.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteStaff(s.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    {staff.length === 0
                      ? "No staff found. Click 'Load Sample Data' to generate sample records or 'Add Staff' to create a staff member."
                      : "No staff match your search criteria. Try adjusting your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls - Only show if there are records and we're not showing all records */}
      {filteredStaff.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-500">
            Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredStaff.length)} of {filteredStaff.length}{" "}
            staff members
          </div>

          {!isShowingAllRecords && (
            <div className="flex items-center gap-2">
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number.parseInt(value))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Items per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 per page</SelectItem>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToFirstPage}
                  disabled={currentPage === 1}
                  className="h-8 w-8"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center mx-2">
                  {getPageNumbers().map((pageNumber) => (
                    <Button
                      key={pageNumber}
                      variant={pageNumber === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(pageNumber)}
                      className={`h-8 w-8 ${pageNumber === currentPage ? "font-bold" : ""}`}
                    >
                      {pageNumber}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToLastPage}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Staff Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Input
                id="edit-role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="Enter role"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-department">Department</Label>
              <Input
                id="edit-department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Enter department"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as "Active" | "Inactive" | "On Leave" })
                }
              >
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="On Leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={editStaff}
              disabled={!formData.name || !formData.email || !formData.role || !formData.department}
            >
              Update Staff
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Staff
