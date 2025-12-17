"use client"

import React, { useState, useMemo, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { X, Search, Filter, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSlipCreation } from "@/contexts/slip-creation-context"
import { useProductCategory } from "@/contexts/product-category-context"
import { useLanguage } from "@/contexts/language-context"

// API functions
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api"

const getAuthToken = () => {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('token') || ''
}

const getCustomerId = () => {
  if (typeof window === 'undefined') return undefined
  
  const role = localStorage.getItem('role')
  if (role === 'lab_admin') {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        return user?.customers?.find((customer: any) => customer.id)?.id
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }
  }
  return undefined
}

const fetchCategories = async (language: string = 'en') => {
  const token = getAuthToken()
  const customerId = getCustomerId()
  
  const params = new URLSearchParams({ lang: language })
  if (customerId) params.append("customer_id", String(customerId))
  
  const response = await fetch(
    `${API_BASE_URL}/library/categories?${params.toString()}`,
    {
      method: "GET",
      headers: { 
        Authorization: `Bearer ${token}`, 
        "Content-Type": "application/json" 
      },
    }
  )
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    throw new Error(errData.message || `Failed to fetch categories (status ${response.status})`)
  }
  
  const responseData = await response.json()
  return responseData.data.data || []
}

const fetchSubcategories = async (categoryId: number, language: string = 'en') => {
  const token = getAuthToken()
  const customerId = getCustomerId()
  
  const params = new URLSearchParams({ 
    lang: language,
    category_id: categoryId.toString()
  })
  
  if (customerId) {
    params.append("customer_id", customerId.toString())
  }
  
  const response = await fetch(
    `${API_BASE_URL}/library/subcategories?${params.toString()}`,
    {
      method: "GET",
      headers: { 
        Authorization: `Bearer ${token}`, 
        "Content-Type": "application/json" 
      },
    }
  )
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    throw new Error(errData.message || `Failed to fetch subcategories (status ${response.status})`)
  }
  
  const responseData = await response.json()
  const dataArray = responseData.data?.data || []
  
  return dataArray.map((subcategory: any) => ({
    id: subcategory.id,
    name: subcategory.name,
    sub_name: subcategory.name,
    code: subcategory.code,
    type: subcategory.type,
    sequence: subcategory.sequence,
    status: subcategory.status,
    parent_id: subcategory.category_id,
    case_pan_id: subcategory.case_pan_id || null,
    color_code: subcategory?.case_pan?.color_code || null,
    created_at: subcategory.created_at,
    updated_at: subcategory.updated_at,
    all_labs: 'All Labs',
    is_custom: subcategory.is_custom,
  }))
}

const fetchProducts = async (labId: number, params: Record<string, any>) => {
  const token = getAuthToken()
  
  // Determine the correct lab ID based on user role
  let effectiveLabId = labId
  if (typeof window !== "undefined") {
    const role = localStorage.getItem("role")
    if (role === "office_admin" || role === "doctor") {
      const storedLabId = localStorage.getItem("selectedLabId")
      if (storedLabId) {
        effectiveLabId = Number(storedLabId)
      }
    }
  }
  
  const url = new URL(`/v1/slip/lab/${effectiveLabId}/products`, API_BASE_URL)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.append(k, String(v))
    }
  })
  
  const response = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
  
  if (response.status === 401) {
    window.location.href = '/login'
    return []
  }
  
  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.status}`)
  }
  
  const json = await response.json()
  return json.data || []
}

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onProductSelect: (product: any, arch: string) => void
  selectedLabId?: number | null
}

const AddProductModal = React.memo(function AddProductModal({ isOpen, onClose, onProductSelect, selectedLabId }: AddProductModalProps) {
  const [productSearch, setProductSearch] = useState("")
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("")
  const [productSort, setProductSort] = useState("name")
  const [sortOrder, setSortOrder] = useState("asc")
  const [selectedProductInModal, setSelectedProductInModal] = useState<string>("")
  const [showArchModal, setShowArchModal] = useState(false)
  const [selectedArch, setSelectedArch] = useState<string>("")
  
  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Filter states
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all")
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("all")
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>([])
  const [selectedStageType, setSelectedStageType] = useState<string>("all")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  
  const { labProducts } = useSlipCreation() // Keep for fallback only
  const { currentLanguage } = useLanguage()

  // Determine the correct lab ID based on user role
  const getLabId = () => {
    if (typeof window === 'undefined') return null
    
    const role = localStorage.getItem('role')
    if (role === 'office_admin') {
      return localStorage.getItem('selectedLabId')
    } else {
      return localStorage.getItem('customerId')
    }
  }

  const effectiveLabId = getLabId()

  // React Query hooks
  const {
    data: allCategories = [],
    isLoading: allCategoriesLoading,
    error: allCategoriesError
  } = useQuery<any[]>({
    queryKey: ['categories', currentLanguage],
    queryFn: () => fetchCategories(currentLanguage),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  const {
    data: subcategories = [],
    isLoading: subcategoriesLoading,
    error: subcategoriesError
  } = useQuery<any[]>({
    queryKey: ['subcategories', selectedCategoryId, currentLanguage],
    queryFn: () => fetchSubcategories(parseInt(selectedCategoryId), currentLanguage),
    enabled: isOpen && selectedCategoryId !== "all",
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Build products query parameters
  const productsParams = useMemo(() => {
    const params: Record<string, any> = {
      per_page: perPage,
      lang: currentLanguage,
      page: currentPage
    }

    // Add search parameter
    if (debouncedProductSearch.trim()) {
      params.search = debouncedProductSearch.trim()
    }

    // Add category filter
    if (selectedCategoryId && selectedCategoryId !== "all") {
      params.category_id = selectedCategoryId
    }

    // Add subcategory filter
    if (selectedSubcategoryId && selectedSubcategoryId !== "all") {
      params.subcategory_id = selectedSubcategoryId
    }

    // Add sort parameters
    if (productSort) {
      params.sort_by = productSort
    }
    if (sortOrder) {
      params.sort_order = sortOrder
    }

    // Add grade filter
    if (selectedGradeIds.length > 0) {
      params.grade_ids = selectedGradeIds
    }

    // Add stage type filter
    if (selectedStageType && selectedStageType !== "all") {
      params.stage_type = selectedStageType
    }

    return params
  }, [
    perPage,
    currentLanguage,
    currentPage,
    debouncedProductSearch,
    selectedCategoryId,
    selectedSubcategoryId,
    productSort,
    sortOrder,
    selectedGradeIds,
    selectedStageType
  ])

  const {
    data: products = [],
    isLoading: productsLoading,
    error: productsError,
    refetch: refetchProducts
  } = useQuery<any[]>({
    queryKey: ['products', effectiveLabId, productsParams],
    queryFn: () => fetchProducts(parseInt(effectiveLabId!), productsParams),
    enabled: isOpen && !!effectiveLabId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
  

  // Debounce search input
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedProductSearch(productSearch)
    }, 500) // 500ms debounce delay
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [productSearch])

  // Reset subcategory when category changes
  useEffect(() => {
    setSelectedSubcategoryId("all")
  }, [selectedCategoryId])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Get products from React Query or fallback to context
  const displayProducts = products.length > 0 ? products : (labProducts || [])

  const handleProductClick = (product: any) => {
    setSelectedProductInModal(String(product.id))
    setShowArchModal(true)
  }

  const handleArchSelect = () => {
    if (selectedProductInModal && selectedArch) {
      const product = displayProducts.find(p => String(p.id) === selectedProductInModal)
      if (product) {
        onProductSelect(product, selectedArch)
        handleClose()
      }
    }
  }

  const handleClose = () => {
    setProductSearch("")
    setDebouncedProductSearch("")
    setProductSort("name")
    setSortOrder("asc")
    setSelectedProductInModal("")
    setShowArchModal(false)
    setSelectedArch("")
    setSelectedCategoryId("all")
    setSelectedSubcategoryId("all")
    setSelectedGradeIds([])
    setSelectedStageType("all")
    setShowAdvancedFilters(false)
    setCurrentPage(1)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 md:p-3 lg:p-4">
      <div className="bg-white rounded-lg md:rounded-xl shadow-2xl max-w-6xl w-full mx-auto relative max-h-[96vh] md:max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 lg:p-5 border-b bg-white">
          <h2 className="text-base md:text-lg lg:text-xl font-semibold text-gray-900">Choose a Dental Product</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-7 w-7 md:h-8 md:w-8 p-0 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b bg-white">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search Product"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-10 h-10 text-sm bg-white border-gray-300"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 md:gap-3">
              <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">Category</Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId} disabled={allCategoriesLoading}>
                <SelectTrigger className="w-48 h-10 text-sm bg-white">
                  <SelectValue placeholder={allCategoriesLoading ? "Loading..." : "All Categories"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {allCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Second Row - Sort By and Advanced Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-3">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort By:</Label>
              <Select value={`${productSort}-${sortOrder}`} onValueChange={(value) => {
                const [sort, order] = value.split('-')
                setProductSort(sort)
                setSortOrder(order)
              }}>
                <SelectTrigger className="w-40 h-9 text-sm bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name A-Z</SelectItem>
                  <SelectItem value="name-desc">Name Z-A</SelectItem>
                  <SelectItem value="code-asc">Code A-Z</SelectItem>
                  <SelectItem value="code-desc">Code Z-A</SelectItem>
                  <SelectItem value="sequence-asc">Sequence (Low-High)</SelectItem>
                  <SelectItem value="sequence-desc">Sequence (High-Low)</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Advance Filter
              </Button>
            </div>

            <span className="text-sm text-gray-500 whitespace-nowrap">
              {displayProducts.length} products found
            </span>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">Subcategory</Label>
              <Select value={selectedSubcategoryId} onValueChange={setSelectedSubcategoryId} disabled={selectedCategoryId === "all" || subcategoriesLoading}>
                <SelectTrigger className="w-48 h-9 text-sm bg-white">
                  <SelectValue placeholder={subcategoriesLoading ? "Loading..." : "All Subcategories"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subcategories</SelectItem>
                  {selectedCategoryId !== "all" && subcategories.map((subcategory) => (
                    <SelectItem key={subcategory.id} value={subcategory.id.toString()}>
                      {subcategory.sub_name || subcategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">Stage Type</Label>
                <Select value={selectedStageType} onValueChange={setSelectedStageType}>
                  <SelectTrigger className="w-32 h-9 text-sm bg-white">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="multiple">Multiple</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-9 sm:ml-auto"
                onClick={() => {
                  setSelectedGradeIds([])
                  setSelectedStageType("all")
                  setSelectedSubcategoryId("all")
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {/* Product Grid */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-white">
          {productsError ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <div className="text-red-500 mb-4">
                <X className="h-12 w-12 mx-auto mb-2" />
                <p className="text-lg font-medium">Error loading products</p>
                <p className="text-sm text-gray-600">{productsError.message}</p>
              </div>
              <Button onClick={() => refetchProducts()} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          ) : productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-gray-50 h-80 flex flex-col">
                  <div className="h-48 bg-gray-200 mb-4" />
                  <div className="px-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <div className="text-gray-500 mb-4">
                <Search className="h-12 w-12 mx-auto mb-2" />
                <p className="text-lg font-medium">No products found</p>
                <p className="text-sm text-gray-600">Try adjusting your search criteria</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayProducts.map((product: any) => (
                <div
                  key={product.id}
                  className={`cursor-pointer transition-all hover:shadow-md rounded-lg border-2 bg-white flex flex-col overflow-hidden ${
                    selectedProductInModal === String(product.id) ? "border-blue-500 shadow-md" : "border-gray-200"
                  }`}
                  onClick={() => handleProductClick(product)}
                >
                  {/* Product Image Section - Larger */}
                  <div className="flex items-center justify-center bg-gray-100 p-6 h-48">
                    <img
                      src={
                        (product.image_url && product.image_url !== "/placeholder.svg" && product.image_url !== null)
                        || (product.image_url_url && product.image_url_url !== "/placeholder.svg" && product.image_url_url !== null)
                        || (product.image && product.image !== "/placeholder.svg" && product.image !== null)
                          ? (product.image_url || product.image_url_url || product.image)
                          : "/images/product-default.png"
                      }
                      alt={product.name}
                      className="object-contain w-full h-full max-w-[200px] max-h-[180px]"
                      onError={(e) => {
                        // Fallback to default image if the image URL fails to load
                        const target = e.target as HTMLImageElement;
                        if (target.src !== window.location.origin + "/images/product-default.png") {
                          target.src = "/images/product-default.png";
                        }
                      }}
                    />
                  </div>

                  {/* Product Info Section */}
                  <div className="flex flex-col flex-1 p-4 bg-white">
                    <h3 className="font-semibold text-base text-gray-900 mb-2 leading-tight line-clamp-2 min-h-[3rem]">
                      {product.name}
                    </h3>
                    <div className="text-xs text-gray-500 space-y-0.5 mb-3">
                      <div className="truncate">Category: {product.category_name}</div>
                      {product.subcategory_name && (
                        <div className="truncate">Sub Category: {product.subcategory_name}</div>
                      )}
                    </div>

                    {/* Tags Section */}
                    <div className="flex flex-wrap gap-2 mt-auto">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          product.stage_type === "multiple"
                            ? "bg-cyan-100 text-cyan-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {product.stage_type === "multiple" ? "Multi Stage" : "Single Stage"}
                      </span>
                      {product.grades && product.grades.length > 0 && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {product.grades.length} days to Finish
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-t bg-white flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose} className="h-10 px-6">
            Cancel
          </Button>
          <Button
            className="bg-[#1e40af] hover:bg-[#1e3a8a] h-10 px-6"
            disabled={!selectedProductInModal}
            onClick={() => setShowArchModal(true)}
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Arch Selection Modal */}
      {showArchModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-3 md:p-4">
          <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl mx-auto p-4 md:p-5 lg:p-6 relative flex flex-col max-w-xl w-full max-h-[90vh]">
            {/* Header */}
            <div className="text-center mb-3 md:mb-4">
              <h2 className="text-base md:text-lg lg:text-xl font-bold text-gray-900 mb-1">Select Arch for treatment</h2>
              {selectedArch && (
                <p className="text-xs md:text-sm text-gray-500 mt-1">Press Enter to continue</p>
              )}
            </div>

            {/* Combined Dental Arches Display - Main Focal Point */}
            <div className="flex flex-col items-center mb-3 md:mb-4 w-full flex-1 justify-center">
              {/* Dental Arches Container with Centered Button */}
              <div className="relative w-full max-w-md mx-auto flex flex-col items-center">
                {/* Combined Upper and Lower Arches */}
                <div className="flex flex-col items-center space-y-2 md:space-y-3 w-full">
                  {/* Upper Arch */}
                  <div
                    className={`flex justify-center items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg transition-all p-3 w-full ${
                      selectedArch === 'upper' || selectedArch === 'both' ? 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedArch('upper')}
                    tabIndex={0}
                    role="button"
                    aria-label="Select Upper Arch"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedArch('upper')
                      }
                    }}
                  >
                    <div className="flex justify-center items-center w-36 h-20 sm:w-44 sm:h-24 md:w-52 md:h-28">
                      <img
                        src={selectedArch === 'upper' || selectedArch === 'both' ? "/images/upper.svg" : "/images/upper-arch.png"}
                        alt="Upper Arch"
                        className="max-w-full max-h-full object-contain"
                        draggable={false}
                      />
                    </div>
                  </div>

                  {/* Both Arches Selection - Centered Between the Arches */}
                  <div className="flex justify-center w-full">
                    <div
                      className={`w-36 h-9 sm:w-44 sm:h-10 md:w-52 md:h-11 flex items-center justify-center rounded-lg border-2 text-xs sm:text-sm md:text-base font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                        ${selectedArch === 'both' ? 'border-blue-600 bg-blue-600 text-white shadow-lg' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'}
                      `}
                      onClick={() => setSelectedArch('both')}
                      tabIndex={0}
                      role="button"
                      aria-pressed={selectedArch === 'both'}
                      aria-label="Select Both Arches"
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedArch('both');
                        }
                      }}
                    >
                      Both Arches
                    </div>
                  </div>

                  {/* Lower Arch */}
                  <div
                    className={`flex justify-center items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg transition-all p-3 w-full ${
                      selectedArch === 'lower' || selectedArch === 'both' ? 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedArch('lower')}
                    tabIndex={0}
                    role="button"
                    aria-label="Select Lower Arch"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedArch('lower')
                      }
                    }}
                  >
                    <div className="flex justify-center items-center w-36 h-20 sm:w-44 sm:h-24 md:w-52 md:h-28">
                      <img
                        src={selectedArch === 'lower' || selectedArch === 'both' ? "/images/lower.svg" : "/images/lower-arch.png"}
                        alt="Lower Arch"
                        className="max-w-full max-h-full object-contain"
                        draggable={false}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons - Centered below the arches */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-2 md:gap-3 mt-3 md:mt-4 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowArchModal(false)}
                className="w-full sm:w-auto px-3 md:px-4 h-9 border-gray-300 text-gray-700 hover:bg-gray-50 min-w-[120px] text-xs md:text-sm rounded-lg"
              >
                Change Product
              </Button>
              <Button
                size="sm"
                className={`w-full sm:w-auto px-4 md:px-6 h-9 min-w-[120px] text-xs md:text-sm transition-all rounded-lg ${
                  selectedArch && (selectedArch === 'upper' || selectedArch === 'lower' || selectedArch === 'both')
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600/60 text-white cursor-not-allowed'
                }`}
                onClick={handleArchSelect}
                disabled={!selectedArch}
              >
                Add Product
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default AddProductModal
