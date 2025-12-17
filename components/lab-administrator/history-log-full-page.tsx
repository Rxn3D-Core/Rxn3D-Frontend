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
import { Copy, Download, Trash2, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

// Define types for our history log entries
interface HistoryLogEntry {
  id: string
  timestamp: string
  user: string
  category: string
  subCategory: string
  product: string
  retention: string
  grade: string
  stages: string
  teethShade: string
  impression: string
}

// Sample data generator
const generateSampleData = (): HistoryLogEntry[] => {
  const categories = ["Crown & Bridge", "Digital Dentistry", "Orthodontics", "Removable"]
  const subCategories = {
    "Crown & Bridge": ["All Ceramic", "PFM", "Full Cast"],
    "Digital Dentistry": ["3D Printing", "CAD/CAM", "Digital Impressions"],
    Orthodontics: ["Space Maintainers", "Retainers", "Aligners"],
    Removable: ["Complete Denture", "Partial Denture", "Nightguard"],
  }
  const products = {
    "All Ceramic": ["Empress", "Zirconia", "E.max"],
    "3D Printing": ["Temporary Crown", "Surgical Guide", "Model"],
    "Space Maintainers": ["Band & Loop", "Lingual Arch", "Transpalatal Arch"],
    "Complete Denture": ["Economy", "Standard", "Premium"],
  }
  const retentions = ["Screw", "Cement", "Magnetic", "N/A"]
  const grades = ["Economy", "Standard", "Premium", "Ultra Premium"]
  const stagesArray = ["Try In", "Bite Block", "Custom Tray", "Finish"]
  const teethShades = ["A1", "A2", "A3", "B1", "B2", "C1", "C2", "BL1", "BL2", "BL3", "BL4"]
  const impressions = ["Traditional", "Digital", "Hybrid"]

  const getRandomDate = () => {
    const start = new Date(2022, 0, 1)
    const end = new Date()
    const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
    return randomDate.toLocaleString()
  }

  const getRandomElement = (array: string[]) => array[Math.floor(Math.random() * array.length)]

  // Generate 50 records for better pagination testing
  return Array.from({ length: 50 }, (_, i) => {
    const category = getRandomElement(categories)
    const subCategory = getRandomElement(subCategories[category as keyof typeof subCategories] || ["Other"])
    const product = getRandomElement(products[subCategory as keyof typeof products] || ["Standard"])

    return {
      id: `log-${i + 1}`,
      timestamp: getRandomDate(),
      user: ["Admin User", "Lab Manager", "System Admin", "Jane Smith"][Math.floor(Math.random() * 4)],
      category,
      subCategory,
      product,
      retention: getRandomElement(retentions),
      grade: getRandomElement(grades),
      stages: getRandomElement(stagesArray),
      teethShade: getRandomElement(teethShades),
      impression: getRandomElement(impressions),
    }
  })
}

export function HistoryLogFullPage() {
  const [historyLogs, setHistoryLogs] = useState<HistoryLogEntry[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>("all")
  const [productFilter, setProductFilter] = useState<string>("all")
  const { toast } = useToast()

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Get unique values for filters
  const categories = ["all", ...new Set(historyLogs.map((log) => log.category))]
  const subCategories = ["all", ...new Set(historyLogs.map((log) => log.subCategory))]
  const products = ["all", ...new Set(historyLogs.map((log) => log.product))]

  // Filter logs based on search term and filters
  const filteredLogs = historyLogs.filter((log) => {
    const matchesSearch = Object.values(log).some((value) =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase()),
    )

    const matchesCategory = categoryFilter === "all" || log.category === categoryFilter
    const matchesSubCategory = subCategoryFilter === "all" || log.subCategory === subCategoryFilter
    const matchesProduct = productFilter === "all" || log.product === productFilter

    return matchesSearch && matchesCategory && matchesSubCategory && matchesProduct
  })

  // Calculate pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem)

  // Check if we're showing all records on the current page
  const isShowingAllRecords = filteredLogs.length <= itemsPerPage || indexOfLastItem >= filteredLogs.length

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, categoryFilter, subCategoryFilter, productFilter])

  // Load sample data
  const loadSampleData = () => {
    setHistoryLogs(generateSampleData())
    toast({
      title: "Sample Data Loaded",
      description: "50 sample records have been loaded into the history log.",
    })
  }

  // Clear all logs
  const clearLogs = () => {
    setHistoryLogs([])
    toast({
      title: "History Cleared",
      description: "All history log records have been cleared.",
    })
  }

  // Duplicate a log entry
  const duplicateLog = (log: HistoryLogEntry) => {
    const newLog = {
      ...log,
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      user: `${log.user} (Copy)`,
    }

    setHistoryLogs([newLog, ...historyLogs])
    toast({
      title: "Record Duplicated",
      description: "The record has been duplicated successfully.",
    })
  }

  // Export logs as CSV
  const exportCSV = () => {
    const headers = [
      "Timestamp",
      "User",
      "Category",
      "Sub Category",
      "Product",
      "Retention",
      "Grade",
      "Stages",
      "Teeth Shade",
      "Impression",
    ]

    const csvRowsData = [
      headers.join(","),
      ...filteredLogs.map((log) =>
        [
          log.timestamp,
          log.user,
          log.category,
          log.subCategory,
          log.product,
          log.retention,
          log.grade,
          log.stages,
          log.teethShade,
          log.impression,
        ].join(","),
      ),
    ]

    const csvContent = csvRowsData.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "history_log_export.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export Complete",
      description: "The history log has been exported as CSV.",
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
        <h1 className="text-2xl font-bold">History Records</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadSampleData}>
            Load Sample Data
          </Button>
          <Button variant="outline" onClick={exportCSV} disabled={filteredLogs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={historyLogs.length === 0}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Records
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all history log records.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearLogs}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="text-sm text-gray-500">View and manage all product configuration history</div>

      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:w-1/3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search records..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="w-full md:w-1/5">
          <label className="text-sm font-medium">Category</label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category === "all" ? "All Categories" : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-1/5">
          <label className="text-sm font-medium">Sub Category</label>
          <Select value={subCategoryFilter} onValueChange={setSubCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Sub Categories" />
            </SelectTrigger>
            <SelectContent>
              {subCategories.map((subCategory) => (
                <SelectItem key={subCategory} value={subCategory}>
                  {subCategory === "all" ? "All Sub Categories" : subCategory}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-1/5">
          <label className="text-sm font-medium">Product</label>
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product} value={product}>
                  {product === "all" ? "All Products" : product}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Timestamp</th>
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Sub Category</th>
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="px-4 py-3 text-left font-medium">Retention</th>
                <th className="px-4 py-3 text-left font-medium">Grade</th>
                <th className="px-4 py-3 text-left font-medium">Stages</th>
                <th className="px-4 py-3 text-left font-medium">Teeth Shade</th>
                <th className="px-4 py-3 text-left font-medium">Impression</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {currentItems.length > 0 ? (
                currentItems.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{log.timestamp}</td>
                    <td className="px-4 py-3 text-gray-900">{log.user}</td>
                    <td className="px-4 py-3 text-gray-900">{log.category}</td>
                    <td className="px-4 py-3 text-gray-900">{log.subCategory}</td>
                    <td className="px-4 py-3 text-gray-900">{log.product}</td>
                    <td className="px-4 py-3 text-gray-900">{log.retention}</td>
                    <td className="px-4 py-3 text-gray-900">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          log.grade === "Economy"
                            ? "bg-gray-100 text-gray-800"
                            : log.grade === "Standard"
                              ? "bg-blue-100 text-blue-800"
                              : log.grade === "Premium"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-red-100 text-red-800"
                        }`}
                      >
                        {log.grade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{log.stages}</td>
                    <td className="px-4 py-3 text-gray-900">{log.teethShade}</td>
                    <td className="px-4 py-3 text-gray-900">{log.impression}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => duplicateLog(log)} title="Duplicate Record">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                    {historyLogs.length === 0
                      ? "No history records found. Click 'Load Sample Data' to generate sample records."
                      : "No records match your search criteria. Try adjusting your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls - Only show if there are records and we're not showing all records */}
      {filteredLogs.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-500">
            Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredLogs.length)} of {filteredLogs.length}{" "}
            records
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
