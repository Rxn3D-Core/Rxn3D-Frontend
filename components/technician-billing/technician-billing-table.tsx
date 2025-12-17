"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Search,
  Eye,
  Edit,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import {
  setSearchQuery,
  addFilter,
  removeFilter,
  setCurrentPage,
  setItemsPerPage,
} from "@/lib/redux/features/technicianBillingSlice"
import {
  useGetTechnicianBillingItemsQuery,
  useDeleteTechnicianBillingItemMutation,
  useLazyExportTechnicianBillingCsvQuery,
} from "@/lib/redux/api/technicianBillingApi"

export function TechnicianBillingTable() {
  // Initialize with default values to prevent errors during initialization
  const dispatch = useAppDispatch()
  const {
    searchQuery = "",
    selectedFilters = [],
    currentPage = 1,
    itemsPerPage = 10,
  } = useAppSelector((state) => state.technicianBilling) || {}

  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const { toast } = useToast()

  // RTK Query hooks with fallback for initialization
  const { data: billingItems = [], isLoading, isError } = useGetTechnicianBillingItemsQuery() || { data: [] }

  const [deleteTechnicianBillingItem] = useDeleteTechnicianBillingItemMutation() || [() => Promise.resolve()]
  const [exportCsv, { isLoading: isExporting = false }] = useLazyExportTechnicianBillingCsvQuery() || [
    () => Promise.resolve(),
    { isLoading: false },
  ]

  // Filter the data based on search query and selected filters
  const filteredData = billingItems.filter((item) => {
    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (
        !item.slip.toLowerCase().includes(query) &&
        !item.patientName.toLowerCase().includes(query) &&
        !item.technician.toLowerCase().includes(query) &&
        !item.office.toLowerCase().includes(query)
      ) {
        return false
      }
    }

    // Apply department filters
    if (selectedFilters.length > 0) {
      if (!selectedFilters.includes(item.department)) {
        return false
      }
    }

    return true
  })

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem)

  // Check if we're showing all records on the current page
  const isShowingAllRecords = filteredData.length <= itemsPerPage || indexOfLastItem >= filteredData.length

  // Pagination controls
  const goToPage = (page: number) => {
    if (page < 1) page = 1
    if (page > totalPages) page = totalPages
    dispatch(setCurrentPage(page))
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

  // Export billing data as CSV
  const handleExportCSV = async () => {
    try {
      const result = await exportCsv()
      if (result?.data) {
        const url = URL.createObjectURL(result.data)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", "technician_billing_export.csv")
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        toast({
          title: "Export Complete",
          description: "The billing data has been exported as CSV.",
        })
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting the data.",
        variant: "destructive",
      })
    }
  }

  // Delete a billing item
  const handleDeleteItem = async () => {
    if (selectedItemId) {
      try {
        await deleteTechnicianBillingItem(selectedItemId).unwrap()
        toast({
          title: "Record Deleted",
          description: "The billing record has been deleted successfully.",
        })
      } catch (error) {
        toast({
          title: "Delete Failed",
          description: "There was an error deleting the record.",
          variant: "destructive",
        })
      } finally {
        setIsAlertOpen(false)
        setSelectedItemId(null)
      }
    }
  }

  // Handle filter changes
  const handleAddFilter = (filter: string) => {
    if (dispatch) {
      dispatch(addFilter(filter))
    }
  }

  const handleRemoveFilter = (filter: string) => {
    if (dispatch) {
      dispatch(removeFilter(filter))
    }
  }

  // Procedural filters
  const procedureFilters = [
    { label: "S-UP1 - Set up 1", value: "S-UP1" },
    { label: "WUP - Wax up", value: "WUP" },
    { label: "FN1 - Finish 1", value: "FN1" },
    { label: "SPH - Spherotech", value: "SPH" },
  ]

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Technician Billing Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64">
            <p>Loading billing records...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Technician Billing Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64">
            <p className="text-red-500">Error loading billing records. Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Technician Billing Records</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={filteredData.length === 0 || isExporting}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={billingItems.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Records
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all billing records.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteItem}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by slip, patient, technician or office..."
                value={searchQuery}
                onChange={(e) => dispatch && dispatch(setSearchQuery(e.target.value))}
                className="pl-8"
              />
            </div>
            <div className="w-64">
              <Select onValueChange={handleAddFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Add filter" />
                </SelectTrigger>
                <SelectContent>
                  {procedureFilters.map((filter) => (
                    <SelectItem key={filter.value} value={filter.value}>
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedFilters.map((filter) => (
                <Badge key={filter} variant="secondary" className="flex items-center gap-1">
                  {filter}
                  <button onClick={() => handleRemoveFilter(filter)} className="ml-1 hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No billing records found</h3>
              <p className="text-muted-foreground mt-2">
                {billingItems.length === 0
                  ? "All billing records have been cleared."
                  : "Try adjusting your search or filters to find what you're looking for."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-blue-800 text-white">
                    <TableHead className="text-white">Posted Time</TableHead>
                    <TableHead className="text-white">Technician</TableHead>
                    <TableHead className="text-white">Office</TableHead>
                    <TableHead className="text-white">Slip</TableHead>
                    <TableHead className="text-white">Patient Name</TableHead>
                    <TableHead className="text-white">Stage</TableHead>
                    <TableHead className="text-white">Type</TableHead>
                    <TableHead className="text-white">Department</TableHead>
                    <TableHead className="text-white">Procedure</TableHead>
                    <TableHead className="text-white">QTY</TableHead>
                    <TableHead className="text-white">Unit Price</TableHead>
                    <TableHead className="text-white">Rush</TableHead>
                    <TableHead className="text-white">Total $</TableHead>
                    <TableHead className="text-white">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-gray-50">
                      <TableCell>{item.postedTime}</TableCell>
                      <TableCell>{item.technician}</TableCell>
                      <TableCell>{item.office}</TableCell>
                      <TableCell>{item.slip}</TableCell>
                      <TableCell>{item.patientName}</TableCell>
                      <TableCell>{item.stage}</TableCell>
                      <TableCell>
                        <Badge
                          variant={item.type === "Upper" ? "default" : item.type === "Lower" ? "secondary" : "outline"}
                        >
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.department}</TableCell>
                      <TableCell>{item.procedure}</TableCell>
                      <TableCell>{item.qty}</TableCell>
                      <TableCell>${item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell>
                        {item.rush !== "0%" ? <Badge variant="destructive">{item.rush}</Badge> : item.rush}
                      </TableCell>
                      <TableCell className="font-medium">${item.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={() => {
                              setSelectedItemId(item.id)
                              setIsAlertOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls - Only show if there are records and we're not showing all records */}
          {filteredData.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-500">
                Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length}{" "}
                records
              </div>

              {!isShowingAllRecords && (
                <div className="flex items-center gap-2">
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      dispatch && dispatch(setItemsPerPage(Number.parseInt(value)))
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
      </CardContent>
    </Card>
  )
}
