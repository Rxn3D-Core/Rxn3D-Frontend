"use client"

import { useState, useEffect } from "react"
import { Search, ArrowUp, ArrowDown, Info, Edit, TrashIcon, Copy, Package, Plus, Package2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreateTeethShadeModal } from "@/components/product-management/create-teeth-shade-modal"
import { CreateTeethShadeGroupModal } from "@/components/product-management/create-teeth-shade-group-modal"
import { useTeethShades } from "@/contexts/product-teeth-shade-context"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/contexts/language-context"
import { useTranslation } from "react-i18next"

export default function TeethShadePage() {
  const {
    teethShadeBrands,
    isLoading,
    error,
    pagination,
    searchQuery,
    setSearchQuery,
    sortColumn,
    sortDirection,
    setSortColumn,
    setSortDirection,
    selectedItems,
    setSelectedItems,
    fetchTeethShadeBrands,
    deleteTeethShadeBrand,
    bulkDeleteTeethShadeBrands,
    teethShadeGroups,
    fetchTeethShadeGroups,
    isGroupsLoading,
    updateTeethShadeBrand,
  } = useTeethShades()

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false)
  const [editingTeethShadeBrand, setEditingTeethShadeBrand] = useState<any>(null)
  const [isCopying, setIsCopying] = useState(false)

  // Discard dialog states
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [modalToClose, setModalToClose] = useState<"create" | "edit" | "group" | null>(null)
  const [hasModalChanges, setHasModalChanges] = useState(false)

  // Pagination states
  const [entriesPerPage, setEntriesPerPage] = useState(pagination.per_page.toString())
  const [currentPage, setCurrentPage] = useState(pagination.current_page)

  // Search state
  const [searchInput, setSearchInput] = useState(searchQuery)

  const { currentLanguage } = useLanguage()
  const { t } = useTranslation()

  // Fetch initial data
  useEffect(() => {
    fetchTeethShadeBrands()
    fetchTeethShadeGroups()
  }, [fetchTeethShadeBrands, fetchTeethShadeGroups, currentLanguage])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchQuery) {
        setSearchQuery(searchInput)
        setCurrentPage(1) // Reset to first page on new search
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchInput, setSearchQuery, searchQuery])

  // Sync search input with context
  useEffect(() => {
    if (searchQuery !== searchInput) {
      setSearchInput(searchQuery)
    }
  }, [searchQuery])

  useEffect(() => {
    if (Number(entriesPerPage) !== pagination.per_page || currentPage !== pagination.current_page) {
      fetchTeethShadeBrands(currentPage, Number(entriesPerPage))
    }
  }, [currentPage, entriesPerPage, fetchTeethShadeBrands, pagination.per_page, pagination.current_page])

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }
  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
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
    setCurrentPage(1) // Reset to first page on sort change
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

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(teethShadeBrands.map((brand) => brand.id))
    } else {
      setSelectedItems([])
    }
  }

  // Handle select item
  const handleSelectItem = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, itemId])
    } else {
      setSelectedItems((prev) => prev.filter((id) => id !== itemId))
    }
  }

  // Handle edit
  const handleEdit = (brand: any) => {
    setEditingTeethShadeBrand(brand)
    setIsCopying(false)
    setIsEditModalOpen(true)
  }

  // Handle copy
  const handleCopy = (brand: any) => {
    setEditingTeethShadeBrand(brand)
    setIsCopying(true)
    setIsCreateModalOpen(true)
  }

  // Handle save after editing
  const handleEditSave = async (updatedBrand: any) => {
    if (!editingTeethShadeBrand) return
    await updateTeethShadeBrand(editingTeethShadeBrand.id, updatedBrand)
    setIsEditModalOpen(false)
    setEditingTeethShadeBrand(null)
  }

  // Handle delete (single)
  const handleDelete = async (id: number) => {
    const success = await deleteTeethShadeBrand(id)
      if (success) {
        setSelectedItems((prev) => prev.filter((itemId) => itemId !== id))
      }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    const success = await bulkDeleteTeethShadeBrands(selectedItems)
      if (success) {
        setSelectedItems([])
      }
  }

  // Modal close handlers
  const handleAttemptCloseModal = (type: "create" | "edit" | "group") => {
    if (hasModalChanges) {
      setModalToClose(type)
      setShowDiscardDialog(true)
    } else {
      closeModal(type)
    }
  }

  const closeModal = (type: "create" | "edit" | "group") => {
    if (type === "create") {
      setIsCreateModalOpen(false)
    } else if (type === "edit") {
      setIsEditModalOpen(false)
      setEditingTeethShadeBrand(null)
    } else {
      setIsCreateGroupModalOpen(false)
    }
  }

  // Discard dialog handlers
  const handleDiscardChanges = () => {
    setShowDiscardDialog(false)
    setHasModalChanges(false)
    if (modalToClose) {
      closeModal(modalToClose)
      setModalToClose(null)
    }
  }

  const handleKeepEditing = () => {
    setShowDiscardDialog(false)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col" style={{ height: '100%', minHeight: 0 }}>
      {/* Page Title */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1162a8] rounded-lg">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{t("Teeth Shade Management")}</h1>
            <p className="text-sm text-gray-500">{t("Manage teeth shade brands, systems, and groupings")}</p>
          </div>
        </div>
      </div>

      {/* Enhanced Header Section */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">{t("Show")}</span>
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
          <span className="text-sm text-gray-700">{t("entries")}</span>

          {selectedItems.length > 0 && (
            <div className="ml-6 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                {selectedItems.length} {t("selected")}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleBulkDelete}
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                {t("Delete Selected")}
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {/* <Button className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
            {t("Import teeth shade")}
          </Button> */}
          <Button
            className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("Add teeth shade")}
          </Button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder={t("Search teeth shades...")}
              className="pl-10 h-10 w-64 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Enhanced Error Display */}
      {error && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-200 flex-shrink-0">
          <div className="text-red-600 text-sm">{error}</div>
        </div>
      )}

      {/* Enhanced Table Section */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-grow border-r border-gray-200 flex flex-col min-h-0">
          <div className="overflow-x-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50">
                  <TableHead className="w-12 pl-6">
                    <Checkbox
                      checked={selectedItems.length === teethShadeBrands.length && teethShadeBrands.length > 0}
                      onCheckedChange={handleSelectAll}
                      className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors" onClick={() => handleSort("name")}>
                    <div className="flex items-center">
                      <span>{t("Brand")}</span>
                      {renderSortIndicator("name")}
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    <span>{t("System")}</span>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    <span>{t("Shades")}</span>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    <span>{t("Status")}</span>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900 text-center pr-6">
                    <span>{t("Actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1162a8]"></div>
                        <span className="text-gray-500 text-sm">{t("Loading teeth shades...")}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : teethShadeBrands.length > 0 ? (
                  teethShadeBrands.map((brand, index) => (
                    <TableRow 
                      key={brand.id} 
                      className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${
                        selectedItems.includes(brand.id) ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <TableCell className="pl-6">
                        <Checkbox
                          checked={selectedItems.includes(brand.id)}
                          onCheckedChange={(checked) => handleSelectItem(brand.id, !!checked)}
                          className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-semibold">{brand.name}</span>
                          {brand.description && (
                            <span className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                              {brand.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {brand.system_name?.replace(/_/g, ' ') || brand.system_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        <div className="flex flex-wrap gap-1">
                          {brand.shades && brand.shades.length > 0 ? (
                            brand.shades.slice(0, 3).map((shade, idx) => (
                              <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {shade.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">{t("No shades")}</span>
                          )}
                          {brand.shades && brand.shades.length > 3 && (
                            <span className="text-xs text-gray-500">+{brand.shades.length - 3} {t("more")}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            brand.status === "Active"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-50 text-gray-700 border-gray-200"
                          }
                        >
                          {t(brand.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center pr-6">
                        <div className="flex items-center justify-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-gray-600 hover:text-[#1162a8] hover:bg-blue-50" 
                            onClick={() => handleEdit(brand)}
                            title={t("Edit")}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                            onClick={() => handleCopy(brand)}
                            title={t("Duplicate")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(brand.id)}
                            title={t("Delete")}
                          >
                            <TrashIcon className="h-4 w-4" />
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
                          <h3 className="font-medium text-gray-900 mb-1">{t("No teeth shades found")}</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            {searchQuery 
                              ? t("Try adjusting your search terms or filters")
                              : t("Get started by creating your first teeth shade")
                            }
                          </p>
                          {!searchQuery && (
                            <Button
                              className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
                              onClick={() => setIsCreateModalOpen(true)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {t("Add Your First Teeth Shade")}
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

          {/* Enhanced Pagination */}
          <div className="px-6 py-4 flex justify-between items-center border-t border-gray-200 flex-shrink-0 bg-white">
            <div className="text-sm text-gray-600">
              {t("Showing")} {Math.min(pagination.total, 1 + (currentPage - 1) * pagination.per_page)} {t("to")}{" "}
              {Math.min(pagination.total, currentPage * pagination.per_page)} {t("of")} {pagination.total} {t("entries")}
            </div>
            <div className="flex items-center space-x-1">
              <button
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 disabled:opacity-50"
                onClick={() => handlePageChange(currentPage - 1)}
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
                disabled={currentPage === pagination.last_page}
              >
                »
              </button>
            </div>
          </div>
        </div>
      
      </div>

      {/* Create Teeth Shade Modal */}
      <CreateTeethShadeModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setEditingTeethShadeBrand(null)
          setIsCopying(false)
        }}
        onHasChangesChange={setHasModalChanges}
        teethShadeBrand={isCopying ? editingTeethShadeBrand : undefined}
        isCopying={isCopying}
      />

      {/* Edit Teeth Shade Modal */}
      {editingTeethShadeBrand && !isCopying && (
        <CreateTeethShadeModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingTeethShadeBrand(null)
            setIsCopying(false)
          }}
          onHasChangesChange={setHasModalChanges}
          teethShadeBrand={editingTeethShadeBrand}
          isEditing={true}
          onSave={handleEditSave}
        />
      )}

      {/* Create Teeth Shade Group Modal */}
      <CreateTeethShadeGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onChanges={setHasModalChanges}
      />
    </div>
  )
}
