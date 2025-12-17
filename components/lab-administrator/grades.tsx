"use client"

import { useState, useEffect, useCallback } from "react"
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
import { getAuthToken } from "@/lib/auth-utils"
import { useLanguage } from "@/contexts/language-context"
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

interface Grade {
  id: number
  name: string
  code: string
  description: string
  status: "Active" | "Inactive"
}

const initialGrades: Grade[] = [
  {
    id: 1,
    name: "Economy",
    code: "ECO",
    description: "Basic quality materials and finish",
    status: "Active",
  },
  {
    id: 2,
    name: "Mid Grade",
    code: "MID",
    description: "Standard quality materials and finish",
    status: "Active",
  },
  {
    id: 3,
    name: "High Grade",
    code: "HIGH",
    description: "Premium quality materials and finish",
    status: "Active",
  },
  {
    id: 4,
    name: "Premium",
    code: "PREM",
    description: "Highest quality materials and finish",
    status: "Inactive",
  },
]

export function Grades() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null)
  const [isLoadingGrade, setIsLoadingGrade] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    status: "Active" as "Active" | "Inactive",
  })
  const { toast } = useToast()
  const { currentLanguage } = useLanguage()

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"

  // Get customerId from localStorage
  const getCustomerId = (): number | null => {
    if (typeof window === "undefined") return null
    const storedCustomerId = localStorage.getItem("customerId")
    if (storedCustomerId) {
      return parseInt(storedCustomerId, 10)
    }
    return null
  }

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Fetch grades from API
  const fetchGrades = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = getAuthToken()
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to continue.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      const customerId = getCustomerId()
      let url = `${API_BASE_URL}/library/lab-grades?lang=${currentLanguage}`
      if (customerId) {
        url += `&customer_id=${customerId}`
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch grades: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Handle response structure - could be result.data or result.data.data
      const gradesData = result.data?.data || result.data || []
      setGrades(gradesData)
    } catch (error: any) {
      console.error("Error fetching grades:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch grades.",
        variant: "destructive",
      })
      setGrades([])
    } finally {
      setIsLoading(false)
    }
  }, [API_BASE_URL, currentLanguage, toast])

  // Fetch grades on component mount
  useEffect(() => {
    fetchGrades()
  }, [fetchGrades])

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

  // Fetch grade details from API when editing
  const fetchGradeById = useCallback(async (id: number) => {
    setIsLoadingGrade(true)
    try {
      const token = getAuthToken()
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to continue.",
          variant: "destructive",
        })
        setIsLoadingGrade(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/library/lab-grades/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch grade: ${response.statusText}`)
      }

      const result = await response.json()
      const gradeData = result.data

      if (gradeData) {
        setFormData({
          name: gradeData.name || "",
          code: gradeData.code || "",
          description: gradeData.description || "",
          status: gradeData.status || "Active",
        })
      }
    } catch (error: any) {
      console.error("Error fetching grade:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch grade details.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingGrade(false)
    }
  }, [toast])

  // Set form data when editing - fetch from API
  useEffect(() => {
    if (selectedGrade && isEditDialogOpen) {
      fetchGradeById(selectedGrade.id)
    }
  }, [selectedGrade, isEditDialogOpen, fetchGradeById])

  // Filter grades based on search term and status filter
  const filteredGrades = grades.filter((grade) => {
    const matchesSearch = Object.values(grade).some((value) =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase()),
    )

    const matchesStatus = statusFilter === "all" || grade.status.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  // Calculate pagination
  const totalPages = Math.ceil(filteredGrades.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredGrades.slice(indexOfFirstItem, indexOfLastItem)

  // Check if we're showing all records on the current page
  const isShowingAllRecords = filteredGrades.length <= itemsPerPage || indexOfLastItem >= filteredGrades.length

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  // Add grade
  const addGrade = async () => {
    try {
      const token = getAuthToken()
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to continue.",
          variant: "destructive",
        })
        return
      }

      const customerId = getCustomerId()
      let url = `${API_BASE_URL}/library/lab-grades`
      const payload: any = {
        name: formData.name,
        code: formData.code,
        description: formData.description,
        status: formData.status,
      }
      if (customerId) {
        payload.customer_id = customerId
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to add grade: ${response.statusText}`)
      }

      setIsAddDialogOpen(false)
      toast({
        title: "Grade Added",
        description: `${formData.name} has been added successfully.`,
      })
      // Refresh the grades list
      fetchGrades()
    } catch (error: any) {
      console.error("Error adding grade:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add grade.",
        variant: "destructive",
      })
    }
  }

  // Edit grade
  const editGrade = async () => {
    if (!selectedGrade) return

    try {
      const token = getAuthToken()
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to continue.",
          variant: "destructive",
        })
        return
      }

      const customerId = getCustomerId()
      let url = `${API_BASE_URL}/library/lab-grades/${selectedGrade.id}`
      const payload: any = {
        name: formData.name,
        code: formData.code,
        description: formData.description,
        status: formData.status,
      }
      if (customerId) {
        payload.customer_id = customerId
      }

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to update grade: ${response.statusText}`)
      }

      setIsEditDialogOpen(false)
      toast({
        title: "Grade Updated",
        description: `${formData.name} has been updated successfully.`,
      })
      // Refresh the grades list
      fetchGrades()
    } catch (error: any) {
      console.error("Error updating grade:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update grade.",
        variant: "destructive",
      })
    }
  }

  // Delete grade
  const deleteGrade = async (id: number) => {
    try {
      const token = getAuthToken()
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to continue.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`${API_BASE_URL}/library/lab-grades/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to delete grade: ${response.statusText}`)
      }

      toast({
        title: "Grade Deleted",
        description: "The grade has been deleted successfully.",
      })
      // Refresh the grades list
      fetchGrades()
    } catch (error: any) {
      console.error("Error deleting grade:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete grade.",
        variant: "destructive",
      })
    }
  }

  // Duplicate grade
  const duplicateGrade = async (grade: Grade) => {
    try {
      const token = getAuthToken()
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to continue.",
          variant: "destructive",
        })
        return
      }

      const customerId = getCustomerId()
      let url = `${API_BASE_URL}/library/lab-grades`
      const payload: any = {
        name: `${grade.name} (Copy)`,
        code: `${grade.code}C`,
        description: grade.description,
        status: grade.status,
      }
      if (customerId) {
        payload.customer_id = customerId
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to duplicate grade: ${response.statusText}`)
      }

      toast({
        title: "Grade Duplicated",
        description: `${grade.name} has been duplicated successfully.`,
      })
      // Refresh the grades list
      fetchGrades()
    } catch (error: any) {
      console.error("Error duplicating grade:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate grade.",
        variant: "destructive",
      })
    }
  }

  // Export grades as CSV
  const exportCSV = () => {
    const headers = ["ID", "Name", "Code", "Description", "Status"]

    const csvRowsData = [
      headers.join(","),
      ...filteredGrades.map((grade) => [grade.id, grade.name, grade.code, grade.description, grade.status].join(",")),
    ]

    const csvContent = csvRowsData.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "grades_export.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export Complete",
      description: "The grades have been exported as CSV.",
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
        <h1 className="text-2xl font-bold">Grades</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} disabled={filteredGrades.length === 0 || isLoading}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600">
                <Plus className="h-4 w-4 mr-2" />
                Add Grade
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Grade</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Grade Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter grade name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Grade Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Enter grade code"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter grade description"
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
                <Button onClick={addGrade} disabled={!formData.name || !formData.code}>
                  Add Grade
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="text-sm text-gray-500">Manage dental lab grades and quality levels</div>

      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:w-1/2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search grades..."
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
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Loading grades...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((grade) => (
                  <tr key={grade.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{grade.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                        {grade.code}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{grade.description}</td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          grade.status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }
                      >
                        {grade.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedGrade(grade)
                            setIsEditDialogOpen(true)
                          }}
                          title="Edit Grade"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => duplicateGrade(grade)} title="Duplicate Grade">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" title="Delete Grade">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the grade.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteGrade(grade.id)}>Delete</AlertDialogAction>
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
                    {grades.length === 0
                      ? "No grades found. Click 'Load Sample Data' to generate sample records or 'Add Grade' to create a grade."
                      : "No grades match your search criteria. Try adjusting your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls - Only show if there are records and we're not showing all records */}
      {filteredGrades.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-500">
            Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredGrades.length)} of {filteredGrades.length}{" "}
            grades
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

      {/* Edit Grade Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Grade</DialogTitle>
          </DialogHeader>
          {isLoadingGrade ? (
            <div className="py-8 text-center text-gray-500">Loading grade details...</div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Grade Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter grade name"
                    disabled={isLoadingGrade}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-code">Grade Code</Label>
                  <Input
                    id="edit-code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Enter grade code"
                    disabled={isLoadingGrade}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter grade description"
                    disabled={isLoadingGrade}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as "Active" | "Inactive" })}
                    disabled={isLoadingGrade}
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
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isLoadingGrade}>
                  Cancel
                </Button>
                <Button onClick={editGrade} disabled={!formData.name || !formData.code || isLoadingGrade}>
                  Update Grade
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
