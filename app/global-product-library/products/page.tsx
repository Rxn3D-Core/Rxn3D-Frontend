"use client"

import { useState, useEffect, useRef } from "react"
import { Search, ArrowUp, ArrowDown, Copy, Edit, TrashIcon, Package2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddProductModal } from "@/components/product-management/add-product-modal"
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal"
import { useProducts } from "@/contexts/product-products-context"
import { useProductCategory } from "@/contexts/product-category-context"
import { useLanguage } from "@/contexts/language-context"
import { useTranslation } from "react-i18next"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTooth } from "@fortawesome/free-solid-svg-icons"

export default function ProductsPage() {
  const {
    products,
    pagination,
    isLoading,
    error,
    searchQuery,
    sortColumn,
    sortDirection,
    statusFilter,
    subcategoryFilter,
    selectedItems,
    fetchProducts,
    setSearchQuery,
    setSortColumn,
    setSortDirection,
    setStatusFilter,
    setSubcategoryFilter,
    setSelectedItems,
    deleteProduct,
    deleteMultipleProducts,
    getProductDetail,
  } = useProducts()

  const { categories, fetchParentDropdownCategories } = useProductCategory()

  const [entriesPerPage, setEntriesPerPage] = useState(pagination.per_page.toString() || "25")
  const [currentPage, setCurrentPage] = useState(pagination.current_page || 1)
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false)
  const [searchInput, setSearchInput] = useState(searchQuery) // Local state for debounced input
  const { currentLanguage } = useLanguage()
  const { t } = useTranslation();
  const isInitialMount = useRef(true)

  // State for delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null)
  const [isMultiDelete, setIsMultiDelete] = useState(false)

  // State for editing product
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [isEditLoading, setIsEditLoading] = useState(false)

  // Open single delete modal
  const openDeleteModal = (id: number) => {
    setDeleteProductId(id)
    setIsMultiDelete(false)
    setIsDeleteModalOpen(true)
  }

  // Open multi delete modal
  const openMultiDeleteModal = () => {
    setDeleteProductId(null)
    setIsMultiDelete(true)
    setIsDeleteModalOpen(true)
  }

  // Confirm delete handler
  const handleConfirmDelete = async () => {
    if (isMultiDelete) {
      await deleteMultipleProducts(selectedItems)
    } else if (deleteProductId !== null) {
      await deleteProduct(deleteProductId)
    }
    setIsDeleteModalOpen(false)
  }

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchQuery) {
        setSearchQuery(searchInput)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchInput, searchQuery])

  // Reset to page 1 when search query changes
  useEffect(() => {
    if (searchQuery && currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [searchQuery, currentPage])

  // Initial load effect
  useEffect(() => {
    fetchProducts(
      currentPage,
      Number(entriesPerPage),
      searchQuery,
      sortColumn,
      sortDirection,
      statusFilter,
      subcategoryFilter,
    )
  }, []) // Only run once on mount

  // Effect for when filters/search change
  useEffect(() => {
    if (!isInitialMount.current) {
      fetchProducts(
        currentPage,
        Number(entriesPerPage),
        searchQuery,
        sortColumn,
        sortDirection,
        statusFilter,
        subcategoryFilter,
      )
    } else {
      isInitialMount.current = false
    }
  }, [
    currentPage,
    entriesPerPage,
    searchQuery,
    sortColumn,
    sortDirection,
    statusFilter,
    subcategoryFilter,
    currentLanguage,
  ])

  useEffect(() => {
    fetchParentDropdownCategories()
  }, [fetchParentDropdownCategories])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleEntriesPerPageChange = (value: string) => {
    setEntriesPerPage(value)
    setCurrentPage(1)
  }

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(columnKey)
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
      setSelectedItems(products.map((product) => product.id))
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

  const totalPages = pagination.last_page || 1
  const startEntry =
    pagination.total > 0 ? Math.min(pagination.total, (currentPage - 1) * Number(entriesPerPage) + 1) : 0
  const endEntry = pagination.total > 0 ? Math.min(pagination.total, currentPage * Number(entriesPerPage)) : 0

  const handleModalClose = () => {
    setIsAddProductModalOpen(false)
    setEditingProduct(null)
  }

  const getVisibilityStatus = (productStatus: string) => {
    return productStatus === "Active" ? "All labs" : "Selected"
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  function handleEdit(id: number): void {
    setIsEditLoading(true)
    setEditingProduct(null)
    setIsAddProductModalOpen(false)
    getProductDetail(id).then((detail) => {
      const productDetail = detail && detail.data ? detail.data : detail
      setEditingProduct(productDetail)
      setIsEditLoading(false)
      setIsAddProductModalOpen(true)
    })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Page Title */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1162a8] rounded-lg">
            <Package2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Products Management</h1>
            <p className="text-sm text-gray-500">Manage your product catalog and configurations</p>
          </div>
        </div>
      </div>

      {/* Enhanced Header */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">{t("Show", { defaultValue: "Show" })}</span>
            <Select value={entriesPerPage} onValueChange={handleEntriesPerPageChange}>
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm ml-2">{t("entries", { defaultValue: "entries" })}</span>
          </div>

          {selectedItems.length > 0 && (
            <div className="ml-6 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                {selectedItems.length} {t("selected")}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={openMultiDeleteModal}
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                {t("Delete Selected")}
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {/* <Button className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
            {t("Import from product library", { defaultValue: "Import from product library" })}
          </Button> */}
          <Button
            className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            onClick={() => setIsAddProductModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("Add Product", { defaultValue: "Add Product" })}
          </Button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder={t("Search products...", { defaultValue: "Search products..." })}
              className="pl-10 h-10 w-64 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Enhanced Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50">
              <TableHead className="w-12 pl-6">
                <Checkbox
                  checked={selectedItems.length === products.length && products.length > 0}
                  onCheckedChange={handleSelectAll}
                  className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                  aria-label={t("Select all products", { defaultValue: "Select all products" })}
                />
              </TableHead>
              <TableHead className="cursor-pointer font-semibold text-gray-900">{t("Case Pan", { defaultValue: "Case Pan" })}</TableHead>
              <TableHead className="cursor-pointer font-semibold text-gray-900">{t("Category", { defaultValue: "Category" })}</TableHead>
              <TableHead className="cursor-pointer font-semibold text-gray-900">{t("Sub Category", { defaultValue: "Sub Category" })}</TableHead>
              <TableHead className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors" onClick={() => handleSort("name")}>
                {t("Product", { defaultValue: "Product" })} {renderSortIndicator("name")}
              </TableHead>
              <TableHead className="cursor-pointer font-semibold text-gray-900">{t("Stages", { defaultValue: "Stages" })}</TableHead>
              <TableHead className="cursor-pointer font-semibold text-gray-900">{t("Code", { defaultValue: "Code" })}</TableHead>
              <TableHead className="cursor-pointer font-semibold text-gray-900">{t("Visibility", { defaultValue: "Visibility" })}</TableHead>
              <TableHead className="cursor-pointer font-semibold text-gray-900">{t("Action", { defaultValue: "Action" })}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: Number.parseInt(entriesPerPage) }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell className="pl-6">
                    <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="w-8 h-6 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="w-28 h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="w-32 h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-6 text-red-500">
                  {t(error, { defaultValue: error })}
                </TableCell>
              </TableRow>
            ) : products.length > 0 ? (
              products.map((product) => (
                <TableRow key={product.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <TableCell className="pl-6">
                    <Checkbox
                      checked={selectedItems.includes(product.id)}
                      onCheckedChange={(checked) => handleSelectItem(product.id, !!checked)}
                      className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                      aria-labelledby={`product-name-${product.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center">
                      <Badge
                        className="text-white border-0 px-3 py-1 rounded"
                        style={{
                          backgroundColor: "#6b7280",
                        }}
                      >
                        ---
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">{product.subcategory?.category?.name || t("N/A", { defaultValue: "N/A" })}</TableCell>
                  <TableCell className="font-medium text-gray-900" id={`product-name-${product.id}`}>
                    {product.subcategory?.name || t("N/A", { defaultValue: "N/A" })}
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">{product.name}</TableCell>
                  <TableCell className="text-gray-600">{product.stages?.[0]?.name || t("N/A", { defaultValue: "N/A" })}</TableCell>
                  <TableCell className="text-gray-600">{product.code}</TableCell>
                  <TableCell className="text-gray-600">{getVisibilityStatus(product.status)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:text-[#1162a8] hover:bg-blue-50" onClick={() => handleEdit(product.id)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                        onClick={() => openDeleteModal(product.id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                        onClick={() => handleCopy(product.sequence.toString())}
                        aria-label={t("Copy days", { defaultValue: "Copy days" })}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-gray-100 rounded-full">
                      <Package2 className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-medium text-gray-900 mb-1">No products found</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Try adjusting your search or filters, or add a new product
                      </p>
                      <Button
                        className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
                        onClick={() => setIsAddProductModalOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Product
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
        <div className="text-sm text-[#6b7280]">
          {t("Showing", { defaultValue: "Showing" })} {startEntry} {t("to", { defaultValue: "to" })} {endEntry} {t("of", { defaultValue: "of" })} {pagination.total} {t("entries", { defaultValue: "entries" })}
        </div>
        <div className="flex items-center space-x-1">
          <button
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-[#f0f0f0] text-[#6b7280] disabled:opacity-50"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label={t("Previous page", { defaultValue: "Previous page" })}
          >
            «
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = i + 1
            if (totalPages > 5) {
              if (currentPage <= 3) pageNum = i + 1
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
              else pageNum = currentPage - 2 + i
            }
            if (pageNum <= 0 || pageNum > totalPages) return null

            return (
              <button
                key={pageNum}
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs ${pageNum === currentPage ? "bg-[#1162a8] text-white" : "bg-[#f0f0f0] text-[#6b7280] hover:bg-[#e5e7eb]"
                  }`}
                onClick={() => handlePageChange(pageNum)}
                aria-label={t("Go to page", { defaultValue: "Go to page" }) + ` ${pageNum}`}
                aria-current={pageNum === currentPage ? "page" : undefined}
              >
                {pageNum}
              </button>
            )
          })}
          <button
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-[#f0f0f0] text-[#6b7280] disabled:opacity-50"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            aria-label={t("Next page", { defaultValue: "Next page" })}
          >
            »
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={isMultiDelete ? t("Delete Selected Products") : t("Delete Product")}
        description={
          isMultiDelete
            ? t("Are you sure you want to delete {{count}} products? This action cannot be undone.", { count: selectedItems.length })
            : t("Are you sure you want to delete this product? This action cannot be undone.")
        }
        itemName={isMultiDelete ? t("products") : t("product")}
        itemCount={isMultiDelete ? selectedItems.length : undefined}
        confirmText={t("Delete")}
        cancelText={t("Cancel")}
        isLoading={isLoading}
      />

     {/* Edit Loading Dots Overlay */}
     {isEditLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg px-8 py-6 shadow-lg flex flex-col items-center">
            {/* FontAwesome Tooth icon animation */}
            <FontAwesomeIcon
              icon={faTooth}
              className="text-[#1162a8] mb-4 fa-regular"
              style={{ fontSize: "4rem", animation: "bounce 1s infinite" }}
            />
            <style>
              {`
                @keyframes bounce {
                  0%, 100% { transform: translateY(0);}
                  50% { transform: translateY(-16px);}
                }
                .fa-tooth {
                  filter: drop-shadow(0 2px 4px rgba(17,98,168,0.15));
                }
              `}
            </style>
            <span className="text-lg font-medium text-gray-700 mb-2">{t("Loading product details")}</span>
          </div>
        </div>
      )}

      <AddProductModal isOpen={isAddProductModalOpen && !isEditLoading} onClose={handleModalClose} editingProduct={editingProduct} />
    </div>
  )
}
