"use client"

import { useState, useEffect } from "react"
import { Search, ArrowUp, ArrowDown, Copy, Edit, TrashIcon, Plus, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddAddOnCategoryModal } from "@/components/product-management/add-add-on-category-modal"
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal"
import { useAddOns } from "@/contexts/product-add-on-category-context"
import { useLanguage } from "@/contexts/language-context"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function AddOnsCategoryPage() {
  const {
    addOnCategories,
    addOnCategoriesPagination,
    isLoadingAddOnCategories,
    addOnCategoriesError,
    searchQuery,
    sortColumn,
    sortDirection,
    selectedItems,
    fetchAddOnCategories,
    setSearchQuery,
    setSortColumn,
    setSortDirection,
    setSelectedItems,
    deleteAddOn,
    getAddOnCategoryDetail,
  } = useAddOns()

  const [entriesPerPage, setEntriesPerPage] = useState(addOnCategoriesPagination?.per_page?.toString() || "25")
  const [currentPage, setCurrentPage] = useState(addOnCategoriesPagination?.current_page || 1)
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false)
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null)
  const [searchInput, setSearchInput] = useState(searchQuery)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number, name?: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  const [copyingCategory, setCopyingCategory] = useState<any>(null)
  const { currentLanguage } = useLanguage();
  const { t } = useTranslation();
  
  useEffect(() => {
    fetchAddOnCategories(currentPage, Number(entriesPerPage), searchQuery, sortColumn as string, sortDirection)
  }, [currentPage, entriesPerPage, searchQuery, sortColumn, sortDirection, fetchAddOnCategories, currentLanguage])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchQuery) {
        setSearchQuery(searchInput)
        setCurrentPage(1) 
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchInput, searchQuery, setSearchQuery])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleEntriesPerPageChange = (value: string) => {
    setEntriesPerPage(value)
    setCurrentPage(1)
  }

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === "asc") setSortDirection("desc")
      else if (sortDirection === "desc") {
        setSortColumn(null)
        setSortDirection("asc")
      } else setSortDirection("asc")
    } else {
      setSortColumn(columnKey as any)
      setSortDirection("asc")
    }
    setCurrentPage(1)
  }

  const renderSortIndicator = (columnKey: string) => {
    if (sortColumn !== columnKey) return null
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-4 w-4 inline" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4 inline" />
    )
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(addOnCategories.map((category) => category.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleSelectItem = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId])
    } else {
      setSelectedItems(selectedItems.filter((id) => id !== itemId))
    }
  }

  const totalPages = addOnCategoriesPagination?.last_page || 1
  const startEntry =
    addOnCategoriesPagination && addOnCategoriesPagination.total > 0 
      ? Math.min(addOnCategoriesPagination.total, (currentPage - 1) * Number(entriesPerPage) + 1) 
      : 0
  const endEntry = addOnCategoriesPagination && addOnCategoriesPagination.total > 0 
    ? Math.min(addOnCategoriesPagination.total, currentPage * Number(entriesPerPage)) 
    : 0

  function handleEdit(id: number): void {
    const category = addOnCategories.find((cat) => cat.id === id)
    setEditCategoryId(id)
    setCopyingCategory(null)
    setIsCopying(false)
    setIsAddCategoryModalOpen(true)
  }

  function handleCopyCategory(id: number): void {
    const category = addOnCategories.find((cat) => cat.id === id)
    if (category) {
      setEditCategoryId(null)
      setCopyingCategory(category)
      setIsCopying(true)
      setIsAddCategoryModalOpen(true)
    }
  }

  function handleDelete(id: number): void {
    const category = addOnCategories.find((cat) => cat.id === id)
    setDeleteTarget({ id, name: category?.name })
    setDeleteModalOpen(true)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    await deleteAddOn(deleteTarget.id, false) // false = category, not subcategory
    setIsDeleting(false)
    setDeleteModalOpen(false)
    setDeleteTarget(null)
    fetchAddOnCategories(currentPage, Number(entriesPerPage), searchQuery, sortColumn as string, sortDirection)
  }

  function closeDeleteModal() {
    setDeleteModalOpen(false)
    setDeleteTarget(null)
  }
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <TooltipProvider>
      {/* Page Title */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1162a8] rounded-lg">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{t("Add-ons Category Management", { defaultValue: "Add-ons Category Management" })}</h1>
            <p className="text-sm text-gray-500">{t("Manage your add-on categories", { defaultValue: "Manage your add-on categories" })}</p>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">{t("Show", { defaultValue: "Show" })}</span>
          <Select value={entriesPerPage} onValueChange={handleEntriesPerPageChange}>
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
          <span className="text-sm text-gray-700">{t("entries", { defaultValue: "entries" })}</span>
          
          {selectedItems.length > 0 && (
            <div className="ml-6 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                {selectedItems.length} {t("selected")}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                {t("Delete Selected")}
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <Button
            className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            onClick={() => setIsAddCategoryModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("Add Category", { defaultValue: "Add Category" })}
          </Button>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder={t("Search Categories", { defaultValue: "Search Categories" })}
              className="pl-10 h-10 w-64 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      {addOnCategoriesError && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{addOnCategoriesError}</p>
        </div>
      )}

      {/* Table Section */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50">
              <TableHead className="w-12 pl-6">
                <Checkbox
                  checked={selectedItems.length === addOnCategories.length && addOnCategories.length > 0}
                  onCheckedChange={handleSelectAll}
                  className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                  aria-label={t("Select all categories", { defaultValue: "Select all categories" })}
                />
              </TableHead>
              <TableHead className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors" onClick={() => handleSort("name")}>
                <div className="flex items-center">
                  {t("Category", { defaultValue: "Category" })} 
                  {renderSortIndicator("name")}
                </div>
              </TableHead>
              <TableHead className="font-semibold text-gray-900">
                {t("Category Code", { defaultValue: "Category Code" })}
              </TableHead>
              <TableHead className="font-semibold text-gray-900">
                {t("Status", { defaultValue: "Status" })}
              </TableHead>
              <TableHead className="font-semibold text-gray-900 text-center pr-6">
                {t("Action", { defaultValue: "Action" })}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingAddOnCategories ? (
              Array.from({ length: Number.parseInt(entriesPerPage) }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell><div className="w-4 h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="w-32 h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="w-16 h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="w-16 h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="w-20 h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                </TableRow>
              ))
            ) : addOnCategories.length > 0 ? (
              addOnCategories.map((category) => (
                <TableRow key={category.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <TableCell className="pl-6">
                    <Checkbox
                      checked={selectedItems.includes(category.id)}
                      onCheckedChange={(checked) => handleSelectItem(category.id, !!checked)}
                      className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                      aria-labelledby={`category-name-${category.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-gray-900" id={`category-name-${category.id}`}>
                    {category.name}
                  </TableCell>
                  <TableCell>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-800">
                      {category?.code || "-"}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        category.status === "Active"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-50 text-gray-700 border-gray-200"
                      }
                    >
                      {t(category.status || "Inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center pr-6">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:text-[#1162a8] hover:bg-blue-50" onClick={() => handleEdit(category.id)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(category.id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                        onClick={() => handleCopyCategory(category.id)}
                        title={t("Duplicate Category")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-gray-100 rounded-full">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-medium text-gray-900 mb-1">
                        {t("No categories found")}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {searchInput 
                          ? t("Try adjusting your search terms or filters")
                          : t("Get started by creating your first category")
                        }
                      </p>
                      {!searchInput && (
                        <Button
                          className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
                          onClick={() => setIsAddCategoryModalOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t("Add Your First Category")}
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
      {addOnCategoriesPagination && addOnCategoriesPagination.total > 0 && (
        <div className="px-6 py-4 flex justify-between items-center border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {t("Showing")} {startEntry} {t("to")} {endEntry} {t("of")} {addOnCategoriesPagination.total} {t("entries")}
          </div>
          <div className="flex items-center space-x-1">
            <button
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 disabled:opacity-50"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              «
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1
              if (totalPages > 5) {
                if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
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
              disabled={currentPage === totalPages}
            >
              »
            </button>
          </div>
        </div>
      )}

      <AddAddOnCategoryModal
        isOpen={isAddCategoryModalOpen}
        onClose={() => {
          setEditCategoryId(null)
          setCopyingCategory(null)
          setIsCopying(false)
          setIsAddCategoryModalOpen(false)
          fetchAddOnCategories(currentPage, Number(entriesPerPage), searchQuery, sortColumn as string, sortDirection)
        }}
        onHasChangesChange={() => {}}
        addOn={editCategoryId ? addOnCategories.find(c => c.id === editCategoryId) as any : copyingCategory}
        isEditing={!!editCategoryId && !isCopying}
        isCopying={isCopying}
        isSubCategory={false}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        itemName={deleteTarget?.name}
        title={t("Delete Category", { defaultValue: "Delete Category" })}
        description={t("Are you sure you want to delete this category?")}
        confirmText={t("Delete", { defaultValue: "Delete" })}
        cancelText={t("Cancel", { defaultValue: "Cancel" })}
        isLoading={isDeleting}
      />
      </TooltipProvider>
    </div>
  )
}
