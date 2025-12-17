"use client"

import { useState, useEffect } from "react"
import { Search, ArrowUp, ArrowDown, Info, ChevronLeft, ChevronRight, Edit, TrashIcon, Copy, Plus, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreateGradeModal } from "@/components/product-management/create-grade-modal"
import { CreateGradeGroupModal } from "@/components/product-management/create-grade-group-modal"
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal"
import { useGrades, type Grade } from "@/contexts/product-grades-context"
import { useLanguage } from "@/contexts/language-context"

const mockGradeGroups = [
  { id: 1, name: "All Complete denture" },
  { id: 2, name: "All Partial Denture" },
  { id: 3, name: "All Single Crowns" },
  { id: 4, name: "Repairs" },
]

export default function GradesPage() {
  const {
    grades,
    isLoading,
    pagination,
    searchQuery: contextSearchQuery, 
    setSearchQuery,
    sortColumn,
    sortDirection,
    setSortColumn,
    setSortDirection,
    selectedItems,
    setSelectedItems,
    fetchGrades,
    deleteGrade,
    bulkDeleteGrades,
  } = useGrades()

  const [isCreateGradeModalOpen, setIsCreateGradeModalOpen] = useState(false)
  const [isCreateGradeGroupModalOpen, setIsCreateGradeGroupModalOpen] = useState(false)

  const [isModalDirty, setIsModalDirty] = useState(false)

  const [entriesPerPage, setEntriesPerPage] = useState(pagination.per_page.toString())
  const [currentPage, setCurrentPage] = useState(pagination.current_page)

  const [searchInput, setSearchInput] = useState(contextSearchQuery)

  const { currentLanguage } = useLanguage()

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteTargetGrade, setDeleteTargetGrade] = useState<Grade | null>(null)
  const [isBulkDelete, setIsBulkDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchGrades()
  }, [fetchGrades, currentLanguage])
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== contextSearchQuery) {
        setSearchQuery(searchInput)
      }
    }, 500) 
    return () => clearTimeout(timer)
  }, [searchInput, contextSearchQuery, setSearchQuery, currentLanguage])

  useEffect(() => {
    setSearchInput(contextSearchQuery)
  }, [contextSearchQuery])

  useEffect(() => {
    if (currentPage !== pagination.current_page || Number.parseInt(entriesPerPage) !== pagination.per_page) {
      fetchGrades(currentPage, Number.parseInt(entriesPerPage))
    }
  }, [currentPage, entriesPerPage, fetchGrades, pagination.current_page, pagination.per_page, currentLanguage])

  useEffect(() => {
    setCurrentPage(pagination.current_page)
    setEntriesPerPage(pagination.per_page.toString())
  }, [pagination.current_page, pagination.per_page, currentLanguage])

  const handleSort = (column: keyof Grade | string) => {
    const newSortDirection =
      sortColumn === column
        ? sortDirection === "asc"
          ? "desc"
          : sortDirection === "desc"
            ? null 
            : "asc"
        : "asc"

    setSortColumn(newSortDirection === null ? null : column)
    setSortDirection(newSortDirection)
  }

  const renderSortIndicator = (column: keyof Grade | string) => {
    if (sortColumn !== column || !sortDirection) return null
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-4 w-4 inline" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4 inline" />
    )
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(checked ? grades.map((grade) => grade.id) : [])
  }

  const handleSelectItem = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId])
    } else {
      setSelectedItems(selectedItems.filter((id) => id !== itemId))
    }
  }

  const renderLoadingSkeleton = () => (
    <>
      {[...Array(Number.parseInt(entriesPerPage) || 5)].map((_, index) => (
        <TableRow key={`skeleton-${index}`}>
          <TableCell>
            <Skeleton className="h-5 w-5 rounded" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-3/4" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-1/2" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-1/4" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-20 rounded-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )

  const totalPages = pagination.last_page || 1

  function handleEdit(grade: Grade): void {
    setIsCreateGradeModalOpen(true)
  }

  function handleDelete(gradeId: number): void {
    const grade = grades.find(g => g.id === gradeId) || null
    setDeleteTargetGrade(grade)
    setIsBulkDelete(false)
    setIsDeleteModalOpen(true)
  }

  function handleBulkDelete(): void {
    setDeleteTargetGrade(null)
    setIsBulkDelete(true)
    setIsDeleteModalOpen(true)
  }

  async function confirmDelete() {
    setIsDeleting(true)
    if (isBulkDelete) {
      await bulkDeleteGrades(selectedItems)
    } else if (deleteTargetGrade) {
      await deleteGrade(deleteTargetGrade.id)
    }
    setIsDeleting(false)
    setIsDeleteModalOpen(false)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Page Title */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1162a8] rounded-lg">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Grades Management</h1>
            <p className="text-sm text-gray-500">Manage product grades and quality classifications</p>
          </div>
        </div>
      </div>

      {/* Enhanced Header Section */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Show</span>
          <Select
            value={entriesPerPage}
            onValueChange={(value) => {
              setEntriesPerPage(value)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-20 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-700">entries</span>

          {selectedItems.length > 0 && (
            <div className="ml-6 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                {selectedItems.length} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleBulkDelete}
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Delete Selected
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            onClick={() => setIsCreateGradeModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Grade
          </Button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search grades..."
              className="pl-10 h-10 w-64 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex">
        <div className="flex-grow border-r border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50">
                  <TableHead className="w-12 pl-6">
                    <Checkbox
                      checked={grades.length > 0 && selectedItems.length === grades.length}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      disabled={grades.length === 0}
                      className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                    />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    Grade Name {renderSortIndicator("name")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors"
                    onClick={() => handleSort("code")}
                  >
                    Code {renderSortIndicator("code")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors"
                    onClick={() => handleSort("sequence")}
                  >
                    Sequence {renderSortIndicator("sequence")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    Status {renderSortIndicator("status")}
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  renderLoadingSkeleton()
                ) : grades.length > 0 ? (
                  grades.map((grade) => (
                    <TableRow key={grade.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="pl-6">
                        <Checkbox
                          checked={selectedItems.includes(grade.id)}
                          onCheckedChange={(checked) => handleSelectItem(grade.id, !!checked)}
                          className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        {grade.name}
                      </TableCell>
                      <TableCell className="text-gray-600">{grade.code}</TableCell>
                      <TableCell className="text-gray-600 text-center">
                        {grade.sequence}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            grade.status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {grade.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:text-[#1162a8] hover:bg-blue-50" onClick={() => handleEdit(grade)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(grade.id)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800 hover:bg-gray-50">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-gray-100 rounded-full">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="text-center">
                          <h3 className="font-medium text-gray-900 mb-1">No grades found</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            Get started by creating your first grade
                          </p>
                          <Button
                            className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
                            onClick={() => setIsCreateGradeModalOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Your First Grade
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Enhanced Pagination */}
          <div className="px-6 py-4 flex justify-between items-center border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {Math.min(pagination.total, 1 + (currentPage - 1) * pagination.per_page)} to{" "}
              {Math.min(pagination.total, currentPage * pagination.per_page)} of {pagination.total} entries
            </div>
            <div className="flex items-center space-x-1">
              <button
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-200 text-gray-600 disabled:opacity-50"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                «
              </button>
              {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                let pageNum = i + 1
                if (pagination.last_page > 5) {
                  if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= pagination.last_page - 2) {
                    pageNum = pagination.last_page - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                }

                return (
                  <button
                    key={pageNum}
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs ${
                      pageNum === currentPage ? "bg-[#1162a8] text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-200 text-gray-600 disabled:opacity-50"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === pagination.last_page}
              >
                »
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title={isBulkDelete ? "Delete Selected Grades" : "Delete Grade"}
        description={
          isBulkDelete
            ? `Are you sure you want to delete ${selectedItems.length} selected grades? This action cannot be undone.`
            : `Are you sure you want to delete grade "${deleteTargetGrade?.name}"? This action cannot be undone.`
        }
        itemName={deleteTargetGrade?.name}
        itemCount={isBulkDelete ? selectedItems.length : undefined}
        isLoading={isDeleting}
      />

      <CreateGradeModal
        isOpen={isCreateGradeModalOpen}
        onClose={() => setIsCreateGradeModalOpen(false)}
      />

      <CreateGradeGroupModal
        isOpen={isCreateGradeGroupModalOpen}
        onClose={() => setIsCreateGradeGroupModalOpen(false)}
        onChanges={setIsModalDirty} 
      />
    </div>
  )
}
