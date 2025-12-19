"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Search, ArrowUp, ArrowDown, Edit, TrashIcon, Copy, Plus, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { TableRowSkeleton } from "@/components/ui/loading-skeleton"
import { AddLabProductModal } from "@/components/product-management/add-lab-product-modal"
import { useProductsQuery } from "@/hooks/useProductsQuery"
import { useProductMutations } from "@/hooks/useProductMutations"
import { getAuthToken, redirectToLogin } from "@/lib/auth-utils"
import { useProductCategory } from "@/contexts/product-category-context"
import { useLanguage } from "@/contexts/language-context"
import { useTranslation } from "react-i18next"
import { LoadingOverlay } from "@/components/ui/loading-overlay"

export default function ProductsPage() {
  // Use React Query hooks for better state management
  const {
    updateProduct: updateProductMutation,
    createProduct: createProductMutation,
    deleteProduct: deleteProductMutation,
    isUpdating,
    isCreating,
    isDeleting,
  } = useProductMutations()

  // Create a standalone getProductDetail function
  const getProductDetail = async (id: number) => {
    try {
      const token = getAuthToken()
      const customerId = localStorage.getItem("customerId")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/library/products/${id}?customer_id=${customerId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        redirectToLogin()
        throw new Error("Unauthorized")
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error("Failed to fetch product detail:", error)
      throw error
    }
  }

  // Local state for selected items
  const [selectedItems, setSelectedItems] = useState<number[]>([])

  // Local state for filters and pagination
  const [searchQuery, setSearchQuery] = useState("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [subcategoryFilter, setSubcategoryFilter] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [entriesPerPage, setEntriesPerPage] = useState("100")

  // Use React Query for data fetching
  const {
    data: productsData,
    isLoading,
    error,
    refetch,
  } = useProductsQuery({
    page: currentPage,
    perPage: Number(entriesPerPage),
    searchQuery,
    sortColumn,
    sortDirection,
    statusFilter,
    subcategoryFilter,
  })

  // Ensure products is always an array to prevent rendering errors
  const products = useMemo(() => {
    const productsFromData = productsData?.products
    if (Array.isArray(productsFromData)) {
      return productsFromData
    }
    // If it's an object with a data property, extract it
    if (productsFromData && typeof productsFromData === 'object' && 'data' in productsFromData) {
      return Array.isArray(productsFromData.data) ? productsFromData.data : []
    }
    return []
  }, [productsData?.products])
  
  const pagination = productsData?.pagination || {
    total: 0,
    per_page: 100,
    current_page: 1,
    last_page: 1,
  }

  const { 
    categories, 
    fetchParentDropdownCategories, 
    allCategories, 
    allCategoriesLoading, 
    fetchAllCategories,
    subcategoriesByCategory,
    subcategoriesLoading,
    fetchSubcategoriesByCategory
  } = useProductCategory()

  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [isEditLoading, setIsEditLoading] = useState(false)
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [searchInput, setSearchInput] = useState(searchQuery)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [availableSubcategories, setAvailableSubcategories] = useState<any[]>([])
  const { currentLanguage } = useLanguage()
  const { t } = useTranslation();
  const isInitialMount = useRef(true)

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

  // React Query will automatically refetch when dependencies change

  // Fetch all categories on component mount
  useEffect(() => {
    fetchAllCategories(currentLanguage)
  }, [fetchAllCategories, currentLanguage])

  // Update available subcategories when subcategoriesByCategory changes
  useEffect(() => {
    if (selectedCategoryId && subcategoriesByCategory && subcategoriesByCategory.length > 0) {
      setAvailableSubcategories(subcategoriesByCategory)
    } else if (!selectedCategoryId) {
      setAvailableSubcategories([])
    }
  }, [subcategoriesByCategory, selectedCategoryId])

  // Debug: Log categories data
  useEffect(() => {
  }, [allCategories, availableSubcategories, subcategoriesByCategory, selectedCategoryId])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleEntriesPerPageChange = (value: string) => {
    setEntriesPerPage(value)
    setCurrentPage(1)
  }

  const handleSort = (columnKey: string) => {
    let newSortDirection = sortDirection
    let newSortColumn = sortColumn
    if (sortColumn === columnKey) {
      if (sortDirection === "asc") {
        newSortDirection = "desc"
      } else if (sortDirection === "desc") {
        newSortColumn = null
        newSortDirection = null
      } else {
        newSortDirection = "asc"
      }
    } else {
      newSortColumn = columnKey
      newSortDirection = "asc"
    }
    setSortColumn(newSortColumn)
    setSortDirection(newSortDirection)
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
      setSelectedItems(products.map((product: any) => product.id))
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

  const handleDuplicate = async (id: number) => {
    setIsEditLoading(true)
    setEditingProduct(null)
    setIsAddProductModalOpen(false)
    
    try {
      const detail = await getProductDetail(id)
      const productDetail = detail && detail.data ? detail.data : detail
      
      // Generate a unique code by appending timestamp to avoid conflicts
      const timestamp = Date.now().toString().slice(-6) // Last 6 digits of timestamp
      const uniqueCode = productDetail.code 
        ? `${productDetail.code}_COPY_${timestamp}` 
        : `PROD_${timestamp}`
      
      // Remove id and other read-only/auto-generated fields to make it a new product
      const {
        id: _,
        created_at,
        updated_at,
        deleted_at,
        image_url, // Use image instead if base64, but remove URL
        ...productWithoutId
      } = productDetail
      
      // Create duplicated product with unique code and name
      const duplicatedProduct = {
        ...productWithoutId,
        name: productDetail.name ? `${productDetail.name} (Copy)` : productDetail.name,
        code: uniqueCode,
        // Ensure image is null if it's just a URL (we don't want to copy the URL)
        image: productDetail.image || null, // Keep base64 image if present, otherwise null
      }
      
      setEditingProduct(duplicatedProduct)
      setIsEditLoading(false)
      setIsAddProductModalOpen(true)
    } catch (error) {
      console.error("Failed to duplicate product:", error)
      setIsEditLoading(false)
    }
  }

  async function handleDelete(id: number): Promise<void> {
    setDeletingProductId(id)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (deletingProductId) {
      try {
        await deleteProductMutation(deletingProductId)
        setShowDeleteConfirm(false)
        setDeletingProductId(null)
        // React Query will automatically refetch the data
      } catch (error) {
        console.error("Failed to delete product:", error)
      }
    }
  }

  const handleBulkDelete = async () => {
    setShowBulkDeleteConfirm(true)
  }

  const confirmBulkDelete = async () => {
    if (selectedItems.length > 0) {
      try {
        // Delete products one by one using the mutation
        for (const id of selectedItems) {
          await deleteProductMutation(id)
        }
        setShowBulkDeleteConfirm(false)
        setSelectedItems([])
        // React Query will automatically refetch the data
      } catch (error) {
        console.error("Failed to delete products:", error)
      }
    }
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

  // Handle category selection
  const handleCategoryChange = async (categoryId: string) => {
    if (categoryId === "all") {
      setSelectedCategoryId(null)
      setSubcategoryFilter(null)
      setAvailableSubcategories([])
    } else {
      const id = parseInt(categoryId)
      setSelectedCategoryId(id)
      setSubcategoryFilter(null) // Reset subcategory filter when category changes
      
      // Fetch subcategories for the selected category
      try {
        await fetchSubcategoriesByCategory(id, currentLanguage)
        // The subcategoriesByCategory will be updated by the context, 
        // we need to wait for it to be updated
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

  // Memoize category options to prevent unnecessary re-renders
  const categoryOptions = useMemo(() => [
    { value: "all", label: t("All Categories") },
    ...(Array.isArray(allCategories) && allCategories.length > 0
      ? allCategories.map((category) => ({
          value: category.id.toString(),
          label: category.name,
        }))
      : [])
  ], [allCategories, t])

  // Memoize subcategory options
  const subcategoryOptions = useMemo(() => [
    { value: "all", label: t("All Subcategories") },
    ...(Array.isArray(availableSubcategories) && availableSubcategories.length > 0
      ? availableSubcategories.map((subcategory) => ({
          value: subcategory.id.toString(),
          label: subcategory.name || subcategory.sub_name, // Use name first, fallback to sub_name
        }))
      : [])
  ], [availableSubcategories, t])

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Page Title */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1162a8] rounded-lg">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{t("Products Management")}</h1>
            <p className="text-sm text-gray-500">{t("Manage your product inventory and configurations")}</p>
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
                onClick={handleBulkDelete}
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
            {/* <Button className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
              {t("Import from product library")}
            </Button> */}
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
          <p className="text-sm text-red-600">{error instanceof Error ? error.message : String(error)}</p>
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
                <TableHead className="font-semibold text-gray-900 py-2 px-2">{t("Case Pan")}</TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2">{t("Category Hierarchy")}</TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2">{t("Product")}</TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2">{t("Code")}</TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2">{t("Arch type")}</TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2">{t("Price")}</TableHead>
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
                const casePanColor = casePanObj?.color_code || "#e5e7eb" // fallback to gray if not present
                // Category
                const categoryName = product.subcategory?.category?.name || "-"

                // Sub Category
                const subcategoryName = product.subcategory?.name || "-"
                
                // Category hierarchy display
                const categoryHierarchy = categoryName !== "-" && subcategoryName !== "-" 
                  ? `${categoryName} → ${subcategoryName}`
                  : categoryName !== "-" 
                    ? categoryName 
                    : subcategoryName

                // Product Name
                const productName = product.name || "-"

                // Code
                const code = product.code || "-"

                // Arch type from subcategory.type
                const archType = product.subcategory?.type || "-";

                // Price: check for price in various possible locations
                const priceValue = (product as any).price ?? (product as any).lab_product?.price ?? (product as any).base_price;
                const price = priceValue !== null && priceValue !== undefined ? `$${priceValue}` : "-";

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
                      <span className="truncate block text-xs max-w-[180px]">{productName}</span>
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
                    <TableCell className="text-center py-2 px-2">
                      <div className="flex items-center justify-center gap-0.5">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-600 hover:text-[#1162a8] hover:bg-blue-50" onClick={() => handleEdit(product.id)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(product.id)}
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
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-gray-100 rounded-full">
                      <Package className="h-8 w-8 text-gray-400" />
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
              disabled={currentPage === totalPages}
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("Confirm Delete")}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {t("Are you sure you want to delete this product? This action cannot be undone.")}
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeletingProductId(null)
                }}
              >
                {t("Cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
              >
                {t("Delete")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("Confirm Bulk Delete")}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {t("Are you sure you want to delete {{count}} products? This action cannot be undone.", { count: selectedItems.length })}
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowBulkDeleteConfirm(false)}
              >
                {t("Cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={confirmBulkDelete}
              >
                {t("Delete All")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Only show modal when not loading */}
      <AddLabProductModal 
        isOpen={isAddProductModalOpen && !isEditLoading} 
        onClose={handleModalClose}
        editingProduct={editingProduct}
        updateProduct={updateProductMutation}
        createProduct={createProductMutation}
        isUpdating={isUpdating}
        isCreating={isCreating}
      />

      {/* Edit Loading Overlay */}
      <LoadingOverlay
        isLoading={isEditLoading}
        title={t("Loading product details", "Loading Product Details...")}
        message={t("Please wait while we load the product information.", "Please wait while we load the product information.")}
        zIndex={9999}
      />
    </div>
  )
}
