"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Eye,
  Printer,
  Phone,
  MoreVertical,
  Edit,
  Calendar,
  FileText,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Slip } from "@/types/slip"

// Dummy slip data matching the reference design
const dummySlips = [
  {
    id: 1,
    createdAt: "01/23/25 @ 1:23 pm",
    pan: "----",
    panColor: "bg-blue-700",
    officeCode: "SRD",
    stageCode: "STG1",
    patient: "Maria Pavlova",
    product: "SFN-IFD",
    status: "In Process",
    rush: true,
    location: "In office ready to pick up",
    attachment: true,
    dueDate: "02/10",
    overdue: false,
    daysLeft: 5,
    actions: [],
  },
  {
    id: 2,
    createdAt: "01/23/25 @ 1:23 pm",
    pan: "----",
    panColor: "bg-red-700",
    officeCode: "SRD",
    stageCode: "STG2",
    patient: "Maria Pavlova",
    product: "AOT",
    status: "In Process",
    rush: false,
    location: "In office ready to pick up",
    attachment: true,
    dueDate: "02/10",
    overdue: true,
    daysLeft: -2,
    actions: [],
  },
  {
    id: 3,
    createdAt: "01/23/25 @ 1:23 pm",
    pan: "----",
    panColor: "bg-blue-700",
    officeCode: "SRD",
    stageCode: "STG3",
    patient: "Maria Pavlova",
    product: "MFA-BB/MFA-BB",
    status: "In Process",
    rush: false,
    location: "In office ready to pick up",
    attachment: true,
    dueDate: "02/15",
    overdue: false,
    daysLeft: 10,
    actions: [],
  },
  {
    id: 4,
    createdAt: "01/23/25 @ 1:23 pm",
    pan: "----",
    panColor: "bg-blue-700",
    officeCode: "RDS",
    stageCode: "STG1",
    patient: "Christina Perri",
    product: "FD-BB",
    status: "On Hold",
    rush: false,
    location: "In office ready to pick up",
    attachment: true,
    dueDate: "02/10",
    overdue: false,
    daysLeft: 3,
    actions: [],
  },
  {
    id: 5,
    createdAt: "01/23/25 @ 1:23 pm",
    pan: "----",
    panColor: "bg-red-700",
    officeCode: "CRD",
    stageCode: "STG2",
    patient: "Matt Damon",
    product: "CRN-FN",
    status: "Canceled",
    rush: true,
    location: "In office ready to pick up",
    attachment: false,
    dueDate: "02/10",
    overdue: false,
    daysLeft: 0,
    actions: [],
  },
  // ...add more dummy rows as needed
]

type SlipsTableProps = {
  onNewSlip: () => void
}

export function SlipsTable({ onNewSlip }: SlipsTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [officeFilter, setOfficeFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [selectedSlips, setSelectedSlips] = useState<number[]>([])
  const { toast } = useToast()

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [allSlips, setAllSlips] = useState<Slip[]>(dummySlips)

  // Get unique values for filters
  const statuses = ["all", ...new Set(allSlips.map((slip) => slip.status))]
  const offices = ["all", ...new Set(allSlips.map((slip) => slip.officeCode))]
  const locations = ["all", ...new Set(allSlips.map((slip) => slip.dueDate))]

  // Filter slips based on search term and filters
  const filteredSlips = allSlips.filter((slip) => {
    const matchesSearch = Object.values(slip).some((value) =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase()),
    )

    const matchesStatus = statusFilter === "all" || slip.status === statusFilter
    const matchesOffice = officeFilter === "all" || slip.officeCode === officeFilter
    const matchesLocation = locationFilter === "all" || slip.dueDate === locationFilter

    return matchesSearch && matchesStatus && matchesOffice && matchesLocation
  })

  // Calculate pagination
  const totalPages = Math.ceil(filteredSlips.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredSlips.slice(indexOfFirstItem, indexOfLastItem)

  // Check if we're showing all records on the current page
  const isShowingAllRecords = filteredSlips.length <= itemsPerPage || indexOfLastItem >= filteredSlips.length

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, officeFilter, locationFilter])

  // Load sample data
  const loadSampleData = () => {
    // In a real app, this would call an API to load more data
    // For now, we'll just duplicate the existing data
    const newSlips = [...slips, ...slips.map((slip) => ({ ...slip, id: slip.id + 100 }))]
    setAllSlips(newSlips)
    toast({
      title: "Sample Data Loaded",
      description: "Additional sample records have been loaded.",
    })
  }

  // Clear all slips
  const clearSlips = () => {
    setAllSlips([])
    setSelectedSlips([])
    toast({
      title: "Slips Cleared",
      description: "All slip records have been cleared.",
    })
  }

  // Duplicate a slip
  const duplicateSlip = (slip: Slip) => {
    const newSlip = {
      ...slip,
      id: Date.now(),
      createdAt: new Date().toLocaleString(),
      patient: `${slip.patient} (Copy)`,
    }

    setAllSlips([newSlip, ...allSlips])
    toast({
      title: "Slip Duplicated",
      description: "The slip has been duplicated successfully.",
    })
  }

  // Export slips as CSV
  const exportCSV = () => {
    const headers = [
      "ID",
      "Created At",
      "Pan",
      "Office Code",
      "Stage Code",
      "Patient",
      "Status",
      "Due Date",
      "Days Left",
    ]

    const csvRowsData = [
      headers.join(","),
      ...filteredSlips.map((slip) =>
        [
          slip.id,
          slip.createdAt,
          slip.pan,
          slip.officeCode,
          slip.stageCode,
          slip.patient,
          slip.status,
          slip.dueDate,
          slip.daysLeft,
        ].join(","),
      ),
    ]

    const csvContent = csvRowsData.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "slips_export.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export Complete",
      description: "The slips have been exported as CSV.",
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
        <h1 className="text-2xl font-bold">Slips</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadSampleData}>
            Load Sample Data
          </Button>
          <Button variant="outline" onClick={exportCSV} disabled={filteredSlips.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button className="bg-blue-600" onClick={onNewSlip}>
            <Plus className="h-4 w-4 mr-2" />
            New Slip
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={allSlips.length === 0}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Slips
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all slip records.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearSlips}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="text-sm text-gray-500">View and manage all dental lab slips</div>

      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:w-1/3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search slips..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
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
        <div className="w-full md:w-1/5">
          <label className="text-sm font-medium">Office</label>
          <Select value={officeFilter} onValueChange={setOfficeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Offices" />
            </SelectTrigger>
            <SelectContent>
              {offices.map((office) => (
                <SelectItem key={office} value={office}>
                  {office === "all" ? "All Offices" : office}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-1/5">
          <label className="text-sm font-medium">Location</label>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location} value={location}>
                  {location === "all" ? "All Locations" : location}
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
                <th className="px-4 py-3 text-left font-medium">
                  <Checkbox />
                </th>
                <th className="px-4 py-3 text-left font-medium">Created At</th>
                <th className="px-4 py-3 text-left font-medium">Pan</th>
                <th className="px-4 py-3 text-left font-medium">Office Code</th>
                <th className="px-4 py-3 text-left font-medium">Stage Code</th>
                <th className="px-4 py-3 text-left font-medium">Patient</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Location</th>
                <th className="px-4 py-3 text-left font-medium">Due Date</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {currentItems.length > 0 ? (
                currentItems.map((slip) => (
                  <tr key={slip.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedSlips.includes(slip.id)}
                        onCheckedChange={() => {
                          if (selectedSlips.includes(slip.id)) {
                            setSelectedSlips(selectedSlips.filter((id) => id !== slip.id))
                          } else {
                            setSelectedSlips([...selectedSlips, slip.id])
                          }
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-900">{slip.createdAt}</td>
                    <td className="px-4 py-3">
                      <div className={`w-10 h-6 rounded text-white flex items-center justify-center ${slip.panColor}`}>
                        {slip.pan}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{slip.officeCode}</td>
                    <td className="px-4 py-3 text-gray-900">{slip.stageCode}</td>
                    <td className="px-4 py-3 text-gray-900">{slip.patient}</td>
                    <td className="px-4 py-3 text-gray-900">
                      <Badge
                        className={
                          slip.status === "In Process"
                            ? "bg-green-100 text-green-800"
                            : slip.status === "Hold"
                              ? "bg-red-100 text-red-800"
                              : slip.status === "Ready/2Go"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                        }
                      >
                        {slip.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                        {slip.dueDate}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      <div className="flex items-center gap-2">
                        <span className="text-red-500">{slip.daysLeft} days past 02/27</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-blue-600"
                        >
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8">
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8">
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => duplicateSlip(slip)} title="Duplicate Slip">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    {allSlips.length === 0
                      ? "No slips found. Click 'Load Sample Data' to generate sample records or 'New Slip' to create a slip."
                      : "No slips match your search criteria. Try adjusting your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls - Only show if there are records and we're not showing all records */}
      {filteredSlips.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-500">
            Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredSlips.length)} of {filteredSlips.length}{" "}
            slips
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
    </div>
  )
}
