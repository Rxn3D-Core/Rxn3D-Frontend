"use client"

import { useState, useEffect } from "react"
import { Search, ArrowUp, ArrowDown, Info, Edit, TrashIcon, Copy, Plus, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CreateImpressionModal } from "@/components/product-management/create-impression-modal"
import { CreateImpressionGroupModal } from "@/components/product-management/create-impression-group-modal"
import { DiscardChangesDialog } from "@/components/product-management/discard-changes-dialog"
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal"
import { Impression, useImpressions } from "@/contexts/product-impression-context"
import { useLanguage } from "@/contexts/language-context"

type SortDirection = "asc" | "desc" | null

type SortState = {
  column: keyof Impression | null
  direction: SortDirection
}

export default function ImpressionPage() {
  const {
    impressions,
    isLoading,
    pagination,
    searchQuery,
    sortColumn,
    sortDirection,
    selectedItems,
    fetchImpressions,
    setSearchQuery,
    setSortColumn,
    setSortDirection,
    setSelectedItems,
    deleteImpression,
    bulkDeleteImpressions,
  } = useImpressions()

  const [entriesPerPage, setEntriesPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [isCreateImpressionModalOpen, setIsCreateImpressionModalOpen] = useState(false)
  const [isCreateImpressionGroupModalOpen, setIsCreateImpressionGroupModalOpen] = useState(false)
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false)
  const [discardType, setDiscardType] = useState<"impression" | "group">("impression")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteBulkModalOpen, setDeleteBulkModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deletingName, setDeletingName] = useState<string>("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingImpression, setEditingImpression] = useState<Impression | null>(null)
  const [isCopying, setIsCopying] = useState(false)
  const { currentLanguage } = useLanguage()

  // Fetch impressions on component mount and when dependencies change
  useEffect(() => {
    fetchImpressions(currentPage, entriesPerPage)
  }, [fetchImpressions, currentPage, entriesPerPage, currentLanguage])

  // Filter and sort impressions based on API data
  const filteredImpressions = impressions.filter(
    (impression) =>
      impression.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      impression.code.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Handle column sort
  const handleSort = (column: keyof Impression) => {
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortColumn(null)
        setSortDirection(null)
      } else {
        setSortDirection("asc")
      }
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  // Render sort indicator
  const renderSortIndicator = (column: keyof Impression) => {
    if (sortColumn !== column) return null

    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-4 w-4 inline" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4 inline" />
    )
  }

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(impressions.map((impression) => impression.id))
    } else {
      setSelectedItems([])
    }
  }

  // Handle individual item selection
  const handleSelectItem = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId])
    } else {
      setSelectedItems(selectedItems.filter((id) => id !== itemId))
    }
  }

  // Handle opening the create impression modal
  const handleOpenCreateImpressionModal = () => {
    setEditingImpression(null)
    setIsCopying(false)
    setIsCreateImpressionModalOpen(true)
  }

  // Handle opening the create impression group modal
  const handleOpenCreateImpressionGroupModal = () => {
    setIsCreateImpressionGroupModalOpen(true)
  }

  // Handle closing modals with unsaved changes
  const handleCloseWithCheck = (type: "impression" | "group") => {
    if (hasUnsavedChanges) {
      setDiscardType(type)
      setIsDiscardDialogOpen(true)
    } else {
      if (type === "impression") {
        setIsCreateImpressionModalOpen(false)
        setEditingImpression(null)
        setIsCopying(false)
      } else {
        setIsCreateImpressionGroupModalOpen(false)
      }
    }
  }

  // Handle discard changes
  const handleDiscardChanges = () => {
    setIsDiscardDialogOpen(false)
    if (discardType === "impression") {
      setIsCreateImpressionModalOpen(false)
      setEditingImpression(null)
      setIsCopying(false)
    } else {
      setIsCreateImpressionGroupModalOpen(false)
    }
    setHasUnsavedChanges(false)
  }

  // Handle keep editing
  const handleKeepEditing = () => {
    setIsDiscardDialogOpen(false)
  }

  function handleEdit(impression: Impression): void {
    setEditingImpression(impression)
    setIsCopying(false)
    setIsCreateImpressionModalOpen(true)
  }

  // Handle duplicate/copy
  function handleCopy(impression: Impression): void {
    setEditingImpression(impression)
    setIsCopying(true)
    setIsCreateImpressionModalOpen(true)
  }

  // Handle single delete
  function handleDelete(id: number): void {
    const impression = impressions.find((imp) => imp.id === id)
    setDeletingId(id)
    setDeletingName(impression?.name || "")
    setDeleteModalOpen(true)
  }

  // Confirm single delete
  async function confirmDelete() {
    if (deletingId == null) return
    setIsDeleting(true)
    await deleteImpression(deletingId)
    setIsDeleting(false)
    setDeleteModalOpen(false)
    setDeletingId(null)
    setDeletingName("")
  }

  // Handle bulk delete
  function handleBulkDelete() {
    setDeleteBulkModalOpen(true)
  }

  // Confirm bulk delete
  async function confirmBulkDelete() {
    setIsDeleting(true)
    await bulkDeleteImpressions(selectedItems)
    setIsDeleting(false)
    setDeleteBulkModalOpen(false)
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
            <h1 className="text-xl font-semibold text-gray-900">Impression Management</h1>
            <p className="text-sm text-gray-500">Manage impression types and configurations</p>
          </div>
        </div>
      </div>

      {/* Enhanced Header Section */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Show</span>
          <select
            value={entriesPerPage}
            onChange={(e) => {
              const newEntriesPerPage = Number(e.target.value)
              setEntriesPerPage(newEntriesPerPage)
              setCurrentPage(1)
            }}
            className="w-20 h-9 text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
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
                disabled={isLoading || isDeleting}
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
            onClick={handleOpenCreateImpressionModal}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Impression
          </Button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search impressions..."
              className="pl-10 h-10 w-64 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Enhanced Table Section */}
      <div className="flex">
        <div className="flex-grow border-r border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50">
                  <TableHead className="w-12 pl-6">
                    <Checkbox
                      checked={selectedItems.length === impressions.length && impressions.length > 0}
                      onCheckedChange={handleSelectAll}
                      className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors" onClick={() => handleSort("name")}>
                    <span>Impressions</span>
                    {sortColumn === "name" && renderSortIndicator("name")}
                  </TableHead>
                  <TableHead className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors" onClick={() => handleSort("code")}>
                    <span>Code</span>
                    {sortColumn === "code" && renderSortIndicator("code")}
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">Opposing warning</TableHead>
                  <TableHead className="font-semibold text-gray-900">URL</TableHead>
                  <TableHead className="font-semibold text-gray-900">Status</TableHead>
                  <TableHead className="font-semibold text-gray-900">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1162a8] mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading impressions...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredImpressions.length > 0 ? (
                  filteredImpressions.map((impression) => (
                    <TableRow key={impression.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="pl-6">
                        <Checkbox
                          checked={selectedItems.includes(impression.id)}
                          onCheckedChange={(checked) => handleSelectItem(impression.id, !!checked)}
                          className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">{impression.name}</TableCell>
                      <TableCell className="text-gray-600">{impression.code}</TableCell>
                      <TableCell className="text-gray-600">{impression.is_digital_impression || "No"}</TableCell>
                      <TableCell className="text-gray-600">{impression.url || "---"}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            impression.status === "Active"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-50 text-gray-700 border-gray-200"
                          }`}
                        >
                          {impression.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:text-[#1162a8] hover:bg-blue-50" onClick={() => handleEdit(impression)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(impression.id)}
                            disabled={isLoading || isDeleting}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                            onClick={() => handleCopy(impression)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-gray-100 rounded-full">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="text-center">
                          <h3 className="font-medium text-gray-900 mb-1">No impressions found</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            Try adjusting your search or add a new impression
                          </p>
                          <Button
                            className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
                            onClick={handleOpenCreateImpressionModal}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Your First Impression
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

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
      <CreateImpressionModal
        isOpen={isCreateImpressionModalOpen}
        onClose={() => handleCloseWithCheck("impression")}
        onChanges={(hasChanges) => setHasUnsavedChanges(hasChanges)}
        impression={editingImpression}
        mode={editingImpression && !isCopying ? "edit" : "create"}
        isCopying={isCopying}
      />

      {/* Create Impression Group Modal */}
      <CreateImpressionGroupModal
        isOpen={isCreateImpressionGroupModalOpen}
        onClose={() => handleCloseWithCheck("group")}
        onChanges={(hasChanges) => setHasUnsavedChanges(hasChanges)}
      />

      {/* Discard Changes Dialog */}
      <DiscardChangesDialog
        isOpen={isDiscardDialogOpen}
        type={discardType}
        onDiscard={handleDiscardChanges}
        onKeepEditing={handleKeepEditing}
      />

      {/* Delete Confirmation Modal for single delete */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Impression"
        description={`Are you sure you want to delete "${deletingName}"? This action cannot be undone.`}
        itemName={deletingName}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />

      {/* Delete Confirmation Modal for bulk delete */}
      <DeleteConfirmationModal
        isOpen={deleteBulkModalOpen}
        onClose={() => setDeleteBulkModalOpen(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Impressions"
        description={`Are you sure you want to delete ${selectedItems.length} selected impressions? This action cannot be undone.`}
        itemCount={selectedItems.length}
        confirmText="Delete All"
        cancelText="Cancel"
        isLoading={isDeleting}
      />
    </div>
  )
}
