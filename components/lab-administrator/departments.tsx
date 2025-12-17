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

interface Department {
  id: number
  name: string
  code: string
  description: string
  status: "Active" | "Inactive"
}

const initialDepartments: Department[] = [
  {
    id: 1,
    name: "Prosthodontics",
    code: "PROS",
    description: "Specializes in dental prostheses",
    status: "Active",
  },
  {
    id: 2,
    name: "Orthodontics",
    code: "ORTH",
    description: "Specializes in correcting teeth and jaw alignment",
    status: "Active",
  },
  {
    id: 3,
    name: "Endodontics",
    code: "ENDO",
    description: "Specializes in root canal treatments",
    status: "Inactive",
  },
]

export function Departments() {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    status: "Active" as "Active" | "Inactive",
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
        code: "",
        description: "",
        status: "Active",
      })
    }
  }, [isAddDialogOpen])

  // Set form data when editing
  useEffect(() => {
    if (selectedDepartment && isEditDialogOpen) {
      setFormData({
        name: selectedDepartment.name,
        code: selectedDepartment.code,
        description: selectedDepartment.description,
        status: selectedDepartment.status,
      })
    }
  }, [selectedDepartment, isEditDialogOpen])

  // Filter departments based on search term and status filter
  const filteredDepartments = departments.filter((department) => {
    const matchesSearch = Object.values(department).some((value) =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase()),
    )

    const matchesStatus = statusFilter === "all" || department.status.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  // Calculate pagination
  const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredDepartments.slice(indexOfFirstItem, indexOfLastItem)

  // Check if we're showing all records on the current page
  const isShowingAllRecords =
    filteredDepartments.length <= itemsPerPage || indexOfLastItem >= filteredDepartments.length

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  // Add department
  const addDepartment = () => {
    const newDepartment: Department = {
      id: Date.now(),
      ...formData,
    }

    setDepartments([...departments, newDepartment])
    setIsAddDialogOpen(false)
    toast({
      title: "Department Added",
      description: `${formData.name} has been added successfully.`,
    })
  }

  // Edit department
  const editDepartment = () => {
    if (!selectedDepartment) return

    const updatedDepartments = departments.map((department) =>
      department.id === selectedDepartment.id ? { ...department, ...formData } : department,
    )

    setDepartments(updatedDepartments)
    setIsEditDialogOpen(false)
    toast({
      title: "Department Updated",
      description: `${formData.name} has been updated successfully.`,
    })
  }

  // Delete department
  const deleteDepartment = (id: number) => {
    const updatedDepartments = departments.filter((department) => department.id !== id)
    setDepartments(updatedDepartments)
    toast({
      title: "Department Deleted",
      description: "The department has been deleted successfully.",
    })
  }

  // Duplicate department
  const duplicateDepartment = (department: Department) => {
    const newDepartment = {
      ...department,
      id: Date.now(),
      name: `${department.name} (Copy)`,
      code: `${department.code}C`,
    }

    setDepartments([...departments, newDepartment])
    toast({
      title: "Department Duplicated",
      description: `${department.name} has been duplicated successfully.`,
    })
  }

  // Export departments as CSV
  const exportCSV = () => {
    const headers = ["ID", "Name", "Code", "Description", "Status"]

    const csvRowsData = [
      headers.join(","),
      ...filteredDepartments.map((department) =>
        [department.id, department.name, department.code, department.description, department.status].join(","),
      ),
    ]

    const csvContent = csvRowsData.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "departments_export.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export Complete",
      description: "The departments have been exported as CSV.",
    })
  }

  // Load sample data
  const loadSampleData = () => {
    const sampleData: Department[] = [
      {
        id: 4,
        name: "Periodontics",
        code: "PERIO",
        description: "Specializes in gum diseases",
        status: "Active",
      },
      {
        id: 5,
        name: "Oral Surgery",
        code: "SURG",
        description: "Specializes in surgical procedures",
        status: "Active",
      },
      {
        id: 6,
        name: "Pediatric Dentistry",
        code: "PEDO",
        description: "Specializes in children's dental care",
        status: "Inactive",
      },
    ]

    setDepartments([...departments, ...sampleData])
    toast({
      title: "Sample Data Loaded",
      description: "Additional sample departments have been loaded.",
    })
  }

  // Clear all departments
  const clearDepartments = () => {
    setDepartments([])
    toast({
      title: "Departments Cleared",
      description: "All department records have been cleared.",
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Departments</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadSampleData}>
            Load Sample Data
          </Button>
          <Button variant="outline" onClick={exportCSV} disabled={filteredDepartments.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600">
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Department</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Department Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter department name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Department Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Enter department code"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter department description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as "Active" | "Inactive" })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={addDepartment} disabled={!formData.name || !formData.code}>
                  Add Department
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={departments.length === 0}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Departments
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all department records.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearDepartments}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="text-sm text-gray-500">Manage dental lab departments and their codes</div>

      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:w-1/2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search departments..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="w-full md:w-1/4">
          <label className="text-sm font-medium">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-blue-50 text-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {currentItems.length > 0 ? (
                currentItems.map((department) => (
                  <tr key={department.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{department.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                        {department.code}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{department.description}</td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          department.status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }
                      >
                        {department.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDepartment(department)
                            setIsEditDialogOpen(true)
                          }}
                          title="Edit Department"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateDepartment(department)}
                          title="Duplicate Department"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" title="Delete Department">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the department.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteDepartment(department.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    {departments.length === 0
                      ? "No departments found. Click 'Load Sample Data' to generate sample records or 'Add Department' to create a department."
                      : "No departments match your search criteria. Try adjusting your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls - Only show if there are records and we're not showing all records */}
      {filteredDepartments.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-500">
            Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredDepartments.length)} of{" "}
            {filteredDepartments.length} departments
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

      {/* Edit Department Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Department Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter department name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Department Code</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Enter department code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter department description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as "Active" | "Inactive" })}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={editDepartment} disabled={!formData.name || !formData.code}>
              Update Department
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
