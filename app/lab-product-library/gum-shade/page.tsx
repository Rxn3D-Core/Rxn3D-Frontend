"use client"

import { useState, useEffect } from "react"
import { Search, ArrowUp, ArrowDown, Info, Edit, TrashIcon, Copy, Plus, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CreateGumShadeModal } from "@/components/product-management/create-gum-shade-modal"
import { CreateGumShadeGroupModal } from "@/components/product-management/create-gum-shade-group-modal"
import { GumShadeBrand, useGumShades } from "@/contexts/product-gum-shade-context"
import { useLanguage } from "@/contexts/language-context"

// Define sort direction type
type SortDirection = "asc" | "desc" | null

export default function GumShadePage() {
  const {
    gumShadeBrands,
    gumShadeGroups,
    isLoading,
    isGroupsLoading,
    error,
    pagination,
    searchQuery,
    sortColumn,
    sortDirection,
    fetchGumShadeBrands,
    updateGumShadeBrand,
    deleteGumShadeBrand,
    setSearchQuery,
    setSortColumn,
    setSortDirection,
  } = useGumShades()

  // Local state for UI interactions
  const [searchInput, setSearchInput] = useState(searchQuery)
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(pagination.current_page)
  const [entriesPerPage, setEntriesPerPage] = useState(pagination.per_page.toString())

  // Modal states
  const [isCreateGumShadeModalOpen, setIsCreateGumShadeModalOpen] = useState(false)
  const [isCreateGumShadeGroupModalOpen, setIsCreateGumShadeGroupModalOpen] = useState(false)
  const [editingGumShade, setEditingGumShade] = useState<any>(null)
  const [isCopying, setIsCopying] = useState(false)

  // Discard dialog states
  const [showPageLevelDiscardDialog, setShowPageLevelDiscardDialog] = useState(false)
  const [isModalDirty, setIsModalDirty] = useState(false)
  const [discardType, setDiscardType] = useState<"gum-shade" | "group">("gum-shade")
  const [modalToClose, setModalToClose] = useState<"gum-shade" | "group" | null>(null)

  const { currentLanguage } = useLanguage()
  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    item: any | null
  }>({
    isOpen: false,
    item: null,
  })

  // Fetch when search, sort, or pagination changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchGumShadeBrands(pagination.current_page, pagination.per_page, searchQuery ?? undefined, sortColumn ?? undefined, sortDirection ?? undefined)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, sortColumn, sortDirection, currentLanguage])

  // Handle column sort
  const handleSort = (column: string) => {
    let newDirection: SortDirection = "asc"

    if (sortColumn === column) {
      if (sortDirection === "asc") {
        newDirection = "desc"
      } else if (sortDirection === "desc") {
        newDirection = null
        column = ""
      }
    }

    setSortColumn(column)
    setSortDirection(newDirection)
    setCurrentPage(1)
  }

  // Render sort indicator
  const renderSortIndicator = (column: string) => {
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
      setSelectedItems(gumShadeBrands.map((shade) => shade.id))
    } else {
      setSelectedItems([])
    }
  }

  // Handle individual item selection
  const handleSelectItem = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, itemId])
    } else {
      setSelectedItems((prev) => prev.filter((id) => id !== itemId))
    }
  }

  // Handle opening create modal
  const handleOpenCreateGumShadeModal = () => {
    setEditingGumShade(null)
    setIsCreateGumShadeModalOpen(true)
  }

  // Handle opening edit modal
  const handleEditGumShade = (gumShade: any) => {
    setEditingGumShade(gumShade)
    setIsCopying(false)
    setIsCreateGumShadeModalOpen(true)
  }

  // Handle opening copy modal
  const handleCopyGumShade = (gumShade: any) => {
    setEditingGumShade(gumShade)
    setIsCopying(true)
    setIsCreateGumShadeModalOpen(true)
  }

  // Handle delete confirmation
  const handleDeleteClick = (gumShade: any) => {
    setDeleteConfirmation({
      isOpen: true,
      item: gumShade,
    })
  }

  const handleConfirmDelete = async () => {
    if (deleteConfirmation.item) {
      const deleted = await deleteGumShadeBrand(deleteConfirmation.item.id)
      setDeleteConfirmation({ isOpen: false, item: null })
      if (deleted) {
        // Always refetch the list after delete
        await fetchGumShadeBrands(
          1, // reset to first page after delete for consistency
          parseInt(entriesPerPage),
          searchInput ?? undefined,
          sortColumn ?? undefined,
          sortDirection ?? undefined
        )
        setCurrentPage(1)
      }
    }
  }

  // Handle modal close with discard check
  const handleAttemptModalClose = (type: "gum-shade" | "group") => {
    if (isModalDirty) {
      setDiscardType(type)
      setModalToClose(type)
      setShowPageLevelDiscardDialog(true)
    } else {
      if (type === "gum-shade") {
        setIsCreateGumShadeModalOpen(false)
        setEditingGumShade(null)
      } else {
        setIsCreateGumShadeGroupModalOpen(false)
      }
    }
  }

  // Handle discard changes
  const handleDiscardChanges = () => {
    setShowPageLevelDiscardDialog(false)
    setIsModalDirty(false)

    if (modalToClose === "gum-shade") {
      setIsCreateGumShadeModalOpen(false)
      setEditingGumShade(null)
    } else if (modalToClose === "group") {
      setIsCreateGumShadeGroupModalOpen(false)
    }

    setModalToClose(null)
  }

  // Handle keep editing
  const handleKeepEditing = () => {
    setShowPageLevelDiscardDialog(false)
    setModalToClose(null)
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Handle entries per page change
  const handleEntriesPerPageChange = (value: string) => {
    setEntriesPerPage(value)
    setCurrentPage(1)
  }

  // Render loading skeleton
  const renderLoadingSkeleton = () => {
    const skeletonCount = Number.parseInt(entriesPerPage.toString()) || 10
    return (
      <>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <TableRow key={index}>
            <TableCell>
              <Skeleton className="h-4 w-4" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-32" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-40" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-8 w-20" />
            </TableCell>
          </TableRow>
        ))}
      </>
    )
  }

  // Render groups loading skeleton
  const renderGroupsLoadingSkeleton = () => (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <Skeleton className="h-4 w-4" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )

  function handleEdit(shade: GumShadeBrand): void {
    setEditingGumShade(shade)
    setIsCopying(false)
    setIsCreateGumShadeModalOpen(true)
  }

  function handleCopy(shade: GumShadeBrand): void {
    setEditingGumShade(shade)
    setIsCopying(true)
    setIsCreateGumShadeModalOpen(true)
  }

  function handleDelete(id: number): void {
    const gumShade = gumShadeBrands.find((shade) => shade.id === id)
    if (gumShade) {
      handleDeleteClick(gumShade)
    }
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
            <h1 className="text-xl font-semibold text-gray-900">Gum Shades Management</h1>
            <p className="text-sm text-gray-500">Manage your gum shade inventory and configurations</p>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Show</span>
          <Select value={entriesPerPage} onValueChange={handleEntriesPerPageChange}>
            <SelectTrigger className="w-20 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
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
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Delete Selected
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          {/* <Button className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
            Import gum shade
          </Button> */}
          <Button
            className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            onClick={handleOpenCreateGumShadeModal}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add gum shade
          </Button>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search gum shades..."
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
                      checked={selectedItems.length === gumShadeBrands.length && gumShadeBrands.length > 0}
                      onCheckedChange={handleSelectAll}
                      className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors" onClick={() => handleSort("name")}>
                    <div className="flex items-center">
                      Brand
                      {renderSortIndicator("name")}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors" onClick={() => handleSort("system_name")}>
                    <div className="flex items-center">
                      System
                      {renderSortIndicator("system_name")}
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">Shades</TableHead>
                  <TableHead className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors" onClick={() => handleSort("status")}>
                    <div className="flex items-center">
                      Status
                      {renderSortIndicator("status")}
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900 text-center pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  renderLoadingSkeleton()
                ) : gumShadeBrands.length > 0 ? (
                  gumShadeBrands.map((shade) => (
                    <TableRow key={shade.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="pl-6">
                        <Checkbox
                          checked={selectedItems.includes(shade.id)}
                          onCheckedChange={(checked) => handleSelectItem(shade.id, !!checked)}
                          className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">{shade.name}</TableCell>
                      <TableCell className="text-gray-600">{(shade.system_name || "-").replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-gray-600">
                        <div className="flex flex-wrap gap-1">
                          {shade.shades && shade.shades.length > 0 ? (
                            shade.shades.slice(0, 3).map((shadeItem, idx) => (
                              <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {shadeItem.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                          {shade.shades && shade.shades.length > 3 && (
                            <span className="text-xs text-gray-500">+{shade.shades.length - 3} more</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            shade.status === "Active"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-50 text-gray-700 border-gray-200"
                          }
                        >
                          {shade.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center pr-6">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:text-[#1162a8] hover:bg-blue-50" onClick={() => handleEdit(shade)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(shade.id)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                            onClick={() => handleCopy(shade)}
                          >
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
                          <h3 className="font-medium text-gray-900 mb-1">No gum shades found</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            {searchInput 
                              ? "Try adjusting your search terms or filters"
                              : "Get started by creating your first gum shade"
                            }
                          </p>
                          {!searchInput && (
                            <Button
                              className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
                              onClick={handleOpenCreateGumShadeModal}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Your First Gum Shade
                            </Button>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="p-4 flex justify-between items-center border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {pagination ? (
                <>
                  Showing {Math.min(pagination.total, 1 + (currentPage - 1) * pagination.per_page)} to{" "}
                  {Math.min(pagination.total, currentPage * pagination.per_page)} of {pagination.total} entries
                </>
              ) : (
                "Loading entries..."
              )}
            </div>
            <div className="flex items-center space-x-1">
              <button
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 disabled:opacity-50"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                «
              </button>
              {pagination &&
                Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
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
                      pageNum === currentPage ? "bg-[#1162a8] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 disabled:opacity-50"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination || !pagination.last_page || currentPage === pagination.last_page}
              >
                »
              </button>
            </div>
          </div>
        </div>
       
      </div>

      {/* Create/Edit Gum Shade Modal */}
      <CreateGumShadeModal
        isOpen={isCreateGumShadeModalOpen}
        onClose={() => {
          setIsCreateGumShadeModalOpen(false)
          setEditingGumShade(null)
          setIsCopying(false)
        }}
        onChanges={setIsModalDirty}
        editingGumShade={editingGumShade}
        isCopying={isCopying}
      />

      {/* Create Gum Shade Group Modal */}
      <CreateGumShadeGroupModal
        isOpen={isCreateGumShadeGroupModalOpen}
        onClose={() => setIsCreateGumShadeGroupModalOpen(false)}
        onChanges={setIsModalDirty}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg p-6 shadow-lg max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-2">Delete Gum Shade Brand?</h2>
            <p className="mb-4 text-gray-600">
              Are you sure you want to delete <span className="font-bold">{deleteConfirmation.item?.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmation({ isOpen: false, item: null })}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
