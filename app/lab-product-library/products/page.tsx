"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Search, ArrowUp, ArrowDown, Copy, Edit, TrashIcon, Package2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { TableRowSkeleton } from "@/components/ui/loading-skeleton"
import { AddProductModal } from "@/components/product-management/add-product-modal"
import { AddFieldModal } from "@/components/advance-mode"
import type { AdvanceField } from "@/lib/api/advance-mode-query"
import type { AdvanceFieldEditorRequest } from "@/components/product-management/add-lab-product-modal/AdvanceFieldsSection"
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal"
import { useProducts } from "@/contexts/product-products-context"
import { useProductCategory } from "@/contexts/product-category-context"
import { useLanguage } from "@/contexts/language-context"
import { useTranslation } from "react-i18next"
import { LoadingOverlay } from "@/components/ui/loading-overlay"
import { useAuth } from "@/contexts/auth-context"

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

  const {
    categories,
    fetchParentDropdownCategories,
    allCategories,
    allCategoriesLoading,
    fetchAllCategories,
    subcategoriesByCategory,
    subcategoriesLoading,
    fetchSubcategoriesByCategory,
  } = useProductCategory()

  const { user } = useAuth()

  const [entriesPerPage, setEntriesPerPage] = useState(pagination.per_page.toString() || "10")
  const [currentPage, setCurrentPage] = useState(pagination.current_page || 1)
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false)
  const [searchInput, setSearchInput] = useState(searchQuery)
  const { currentLanguage } = useLanguage()
  const { t } = useTranslation();

  // Get customer ID for lab admin
  const customerId = useMemo(() => {
    if (typeof window === "undefined") return undefined
    const storedCustomerId = localStorage.getItem("customerId")
    if (storedCustomerId) return parseInt(storedCustomerId, 10)
    if (user?.customers?.length) return user.customers[0]?.id
    return undefined
  }, [user])

  type AdvanceFieldModalHostState =
    | { open: false }
    | {
        open: true
        mode: "create" | "edit"
        fieldId?: number
        catalogCustomerId: number | null
      }

  const [advanceFieldHost, setAdvanceFieldHost] = useState<AdvanceFieldModalHostState>({
    open: false,
  })
  const advanceFieldPersistRef = useRef<(field: AdvanceField) => void>(() => {})

  const handleRequestAdvanceFieldEditor = useCallback((req: AdvanceFieldEditorRequest) => {
    advanceFieldPersistRef.current = req.onPersisted
    setAdvanceFieldHost({
      open: true,
      mode: req.mode,
      fieldId: req.fieldId,
      catalogCustomerId: req.catalogCustomerId ?? null,
    })
  }, [])

  // State for delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null)
  const [isMultiDelete, setIsMultiDelete] = useState(false)

  // State for editing product
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [isEditLoading, setIsEditLoading] = useState(false)

  // State for category/subcategory filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [availableSubcategories, setAvailableSubcategories] = useState<any[]>([])

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

  // Stable ref for fetchProducts to avoid re-triggering effect on identity changes
  const fetchProductsRef = useRef(fetchProducts)
  fetchProductsRef.current = fetchProducts

  // Single debounced fetch effect
  const fetchTimerRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current)
    fetchTimerRef.current = setTimeout(() => {
      fetchProductsRef.current(
        currentPage,
        Number(entriesPerPage),
        searchQuery,
        sortColumn,
        sortDirection,
        statusFilter,
        subcategoryFilter,
      )
    }, 50)
    return () => { if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current) }
  }, [
    currentPage,
    entriesPerPage,
    searchQuery,
    sortColumn,
    sortDirection,
    statusFilter,
    subcategoryFilter,
  ])

  // Fetch all categories on mount (lab admin: pass customer_id)
  useEffect(() => {
    if (customerId) {
      fetchAllCategories(currentLanguage, customerId)
    }
  }, [fetchAllCategories, currentLanguage, customerId])

  // Update available subcategories when subcategoriesByCategory changes
  useEffect(() => {
    if (selectedCategoryId && subcategoriesByCategory && subcategoriesByCategory.length > 0) {
      setAvailableSubcategories(subcategoriesByCategory)
    } else if (!selectedCategoryId) {
      setAvailableSubcategories([])
    }
  }, [subcategoriesByCategory, selectedCategoryId])

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

  const handleDuplicate = async (id: number) => {
    setIsEditLoading(true)
    setEditingProduct(null)
    setIsAddProductModalOpen(false)

    try {
      const detail = await getProductDetail(id)
      const productDetail = detail && detail.data ? detail.data : detail

      const timestamp = Date.now().toString().slice(-6)
      const uniqueCode = productDetail.code
        ? `${productDetail.code}_COPY_${timestamp}`
        : `PROD_${timestamp}`

      const {
        id: _,
        created_at,
        updated_at,
        deleted_at,
        image_url,
        ...productWithoutId
      } = productDetail

      const duplicatedProduct = {
        ...productWithoutId,
        name: productDetail.name ? `${productDetail.name} (Copy)` : productDetail.name,
        code: uniqueCode,
        image: productDetail.image || null,
      }

      setEditingProduct(duplicatedProduct)
      setIsEditLoading(false)
      setIsAddProductModalOpen(true)
    } catch (error) {
      console.error("Failed to duplicate product:", error)
      setIsEditLoading(false)
    }
  }

  // Handle category selection
  const handleCategoryChange = async (categoryId: string) => {
    if (categoryId === "all") {
      setSelectedCategoryId(null)
      setSubcategoryFilter(null)
      setAvailableSubcategories([])
    } else {
      const id = parseInt(categoryId)
      setSelectedCategoryId(id)
      setSubcategoryFilter(null)

      try {
        await fetchSubcategoriesByCategory(id, currentLanguage, customerId)
      } catch (error) {
        console.error('Error fetching subcategories:', error)
        setAvailableSubcategories([])
      }
    }
  }

  // Handle subcategory selection
  const handleSubcategoryChange = useCallback((subcategoryId: string) => {
    if (subcategoryId === "all") {
      setSubcategoryFilter(null)
    } else {
      setSubcategoryFilter(parseInt(subcategoryId))
    }
  }, [])

  // Memoize category options
  const categoryOptions = useMemo(() => [
    { value: "all", label: t("All Categories") },
    ...(Array.isArray(allCategories) && allCategories.length > 0
      ? allCategories.map((category: any) => ({
          value: category.id.toString(),
          label: category.name,
        }))
      : [])
  ], [allCategories, t])

  // Memoize subcategory options
  const subcategoryOptions = useMemo(() => [
    { value: "all", label: t("All Subcategories") },
    ...(Array.isArray(availableSubcategories) && availableSubcategories.length > 0
      ? availableSubcategories.map((subcategory: any) => ({
          value: subcategory.id.toString(),
          label: subcategory.name || subcategory.sub_name,
        }))
      : [])
  ], [availableSubcategories, t])

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Page Title */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1162a8] rounded-lg">
            <Package2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{t("Products Management")}</h1>
            <p className="text-sm text-gray-500">{t("Manage your product catalog and configurations")}</p>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
        {/* Filters Row */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">{t("Show")}</span>
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
              <span className="text-sm text-gray-700">{t("entries")}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">{t("Status")}</span>
              <Select value={statusFilter || "all"} onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}>
                <SelectTrigger className="w-24 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All")}</SelectItem>
                  <SelectItem value="Active">{t("Active")}</SelectItem>
                  <SelectItem value="Inactive">{t("Inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">{t("Category")}</span>
              <SearchableSelect
                value={selectedCategoryId?.toString() || "all"}
                onValueChange={handleCategoryChange}
                placeholder={allCategoriesLoading ? t("Loading...") : t("All Categories")}
                disabled={allCategoriesLoading}
                className="w-40 sm:w-48 h-9 text-sm"
                options={categoryOptions}
                emptyMessage={t("No categories found")}
                searchPlaceholder={t("Search categories...")}
              />
            </div>

            {selectedCategoryId && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">{t("Subcategory")}</span>
                <SearchableSelect
                  value={subcategoryFilter?.toString() || "all"}
                  onValueChange={handleSubcategoryChange}
                  placeholder={subcategoriesLoading ? t("Loading...") : t("All Subcategories")}
                  disabled={subcategoriesLoading}
                  className="w-40 sm:w-48 h-9 text-sm"
                  options={subcategoryOptions}
                  emptyMessage={t("No subcategories found")}
                  searchPlaceholder={t("Search subcategories...")}
                />
              </div>
            )}
          </div>

          {selectedItems.length > 0 && (
            <div className="flex items-center gap-2">
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

        {/* Actions Row */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
              onClick={() => {
                setEditingProduct(null)
                setIsAddProductModalOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("Add Product")}
            </Button>
          </div>

          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder={t("Search products...")}
              className="pl-10 h-10 w-full sm:w-64 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{typeof error === 'string' ? error : String(error)}</p>
        </div>
      )}

      {/* Table Section */}
      <div className="relative">
        <div className="overflow-x-auto">
          <Table className="w-full text-xs">
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50">
                <TableHead className="w-10 pl-4 py-2">
                  <Checkbox
                    checked={selectedItems.length === products.length && products.length > 0}
                    onCheckedChange={handleSelectAll}
                    className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8] h-4 w-4"
                  />
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors" onClick={() => handleSort("name")}>
                  {t("Product")} {renderSortIndicator("name")}
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors" onClick={() => handleSort("case_pan")}>
                  {t("Case Pan")} {renderSortIndicator("case_pan")}
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors" onClick={() => handleSort("category_hierarchy")}>
                  {t("Category Hierarchy")} {renderSortIndicator("category_hierarchy")}
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors" onClick={() => handleSort("code")}>
                  {t("Code")} {renderSortIndicator("code")}
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors" onClick={() => handleSort("arch_type")}>
                  {t("Arch type")} {renderSortIndicator("arch_type")}
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors" onClick={() => handleSort("price")}>
                  {t("Price")} {renderSortIndicator("price")}
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors" onClick={() => handleSort("status")}>
                  {t("Status")} {renderSortIndicator("status")}
                </TableHead>
                <TableHead className="font-semibold text-gray-900 text-center py-2 px-2">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <TableRowSkeleton key={index} />
                  ))}
                </>
              ) : products.length > 0 ? (
                products.map((product: any) => {
                  // Case Pan
                  const casePanObj = (product.subcategory as any)?.case_pan
                  const casePanName = casePanObj?.name || "-"
                  const casePanColor = casePanObj?.color_code || "#e5e7eb"

                  // Category hierarchy
                  const categoryName = product.subcategory?.category?.name || "-"
                  const subcategoryName = product.subcategory?.name || "-"
                  const categoryHierarchy = categoryName !== "-" && subcategoryName !== "-"
                    ? `${categoryName} → ${subcategoryName}`
                    : categoryName !== "-"
                      ? categoryName
                      : subcategoryName

                  // Product details
                  const productName = product.name || "-"
                  const code = product.code || "-"
                  const archType = product.subcategory?.type || "-"
                  const priceValue = product.price ?? product.base_price
                  const price = priceValue !== null && priceValue !== undefined ? `$${priceValue}` : "-"

                  return (
                    <TableRow key={product.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="pl-4 py-2">
                        <Checkbox
                          checked={selectedItems.includes(product.id)}
                          onCheckedChange={(checked) => handleSelectItem(product.id, !!checked)}
                          className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8] h-4 w-4"
                        />
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <span className="truncate block text-xs max-w-[180px]">{productName}</span>
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="inline-block w-4 h-4 rounded border border-gray-200 flex-shrink-0"
                            style={{ backgroundColor: casePanColor }}
                            title={casePanColor}
                          />
                          <span className="truncate text-xs">{casePanName}</span>
                        </span>
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <span className="text-xs font-medium text-gray-900 truncate max-w-[200px]">{categoryHierarchy}</span>
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-800 inline-block">
                          {code}
                        </code>
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <span className="truncate block text-xs">{archType}</span>
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <span className="font-medium text-gray-900 text-xs">{price}</span>
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            product.status === "Active"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-50 text-gray-700 border-gray-200"
                          }`}
                        >
                          {product.status || "Active"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-2 px-2">
                        <div className="flex items-center justify-center gap-0.5">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-600 hover:text-[#1162a8] hover:bg-blue-50" onClick={() => handleEdit(product.id)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                            onClick={() => openDeleteModal(product.id)}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                            onClick={() => handleDuplicate(product.id)}
                            title={t("Duplicate product")}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-gray-100 rounded-full">
                        <Package2 className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="text-center">
                        <h3 className="font-medium text-gray-900 mb-1">{t("No products found")}</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          {searchInput || statusFilter || subcategoryFilter
                            ? t("Try adjusting your search terms or filters")
                            : t("Get started by creating your first product")
                          }
                        </p>
                        {!searchInput && !statusFilter && !subcategoryFilter && (
                          <Button
                            className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
                            onClick={() => {
                              setEditingProduct(null)
                              setIsAddProductModalOpen(true)
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {t("Add Your First Product")}
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
      </div>

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-200">
          <div className="text-sm text-gray-600 order-2 sm:order-1">
            {t("Showing")} {startEntry} {t("to")} {endEntry} {t("of")} {pagination.total} {t("entries")}
          </div>
          <div className="flex items-center space-x-1 order-1 sm:order-2">
            <button
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 disabled:opacity-50 hover:bg-gray-200 transition-colors"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
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
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs transition-colors ${
                    pageNum === currentPage ? "bg-[#1162a8] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 disabled:opacity-50 hover:bg-gray-200 transition-colors"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              »
            </button>
          </div>
        </div>
      )}

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

      <LoadingOverlay
        isLoading={isEditLoading}
        title={t("Loading product details", "Loading Product Details...")}
        message={t("Please wait while we load the product information.", "Please wait while we load the product information.")}
        zIndex={9999}
      />

      <AddFieldModal
        isOpen={advanceFieldHost.open}
        onClose={() => setAdvanceFieldHost({ open: false })}
        isEditing={advanceFieldHost.open && advanceFieldHost.mode === "edit"}
        field={
          advanceFieldHost.open &&
          advanceFieldHost.mode === "edit" &&
          typeof advanceFieldHost.fieldId === "number"
            ? ({ id: advanceFieldHost.fieldId } as AdvanceField)
            : undefined
        }
        catalogCustomerId={
          advanceFieldHost.open ? advanceFieldHost.catalogCustomerId ?? undefined : undefined
        }
        onFieldPersisted={(field) => advanceFieldPersistRef.current(field)}
      />

      <AddProductModal
        isOpen={isAddProductModalOpen && !isEditLoading}
        onClose={handleModalClose}
        editingProduct={editingProduct}
        pricingScope="lab"
        onProductPersisted={(product) => setEditingProduct(product)}
        onRequestAdvanceFieldEditor={handleRequestAdvanceFieldEditor}
      />
    </div>
  )
}
