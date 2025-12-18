"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useDebounce } from "@/lib/performance-utils"
import { Search, Pencil, Eye, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Loader2, Trash2, Plus, Paperclip, Zap, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { CustomerLogo } from "@/components/customer-logo"
import { useProductCategory, type ProductCategory } from "@/contexts/product-category-context"
import { useSlipCreation } from "@/contexts/slip-creation-context"
import { SlipCreationHeader } from "@/components/slip-creation-header"
import InteractiveDentalChart3D from "@/components/interactive-dental-chart-3D"
import { MandibularTeethSVG } from "@/components/mandibular-teeth-svg"
import { MaxillaryTeethSVG } from "@/components/maxillary-teeth-svg"
import { MissingTeethCards } from "@/components/missing-teeth-cards"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import AddOnsModal from "@/components/add-ons-modal"
import RushRequestModal from "@/components/rush-request-modal"
import FileAttachmentModalContent from "@/components/file-attachment-modal-content"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { clearSlipCreationStorage } from "@/utils/slip-creation-storage"
import CancelSlipCreationModal from "@/components/cancel-slip-creation-modal"
import PrintPreviewModal from "@/components/print-preview-modal"

// Type for categories from allCategories API
type ProductCategoryApi = {
  id: number
  name: string
  code?: string
  type?: string
  sequence?: number
  status?: string
  customer_id?: number | null
  image_url?: string
}

interface Doctor {
  id: number
  first_name: string
  last_name: string
  email: string
  image?: string
}

interface Lab {
  id: number
  name: string
  customer_id?: number
  logo?: string
}

interface PatientData {
  name: string
  gender: string
}

interface Product {
  id: number
  name: string
  image_url?: string
  price?: number
  estimated_days?: number
}

interface SavedProduct {
  id: string // Unique ID for this saved product
  product: Product
  productDetails: any | null // Full product details from API including extractions
  category: string
  categoryId: number
  subcategory: string
  subcategoryId: number
  maxillaryTeeth: number[]
  mandibularTeeth: number[]
  maxillaryMaterial: string
  maxillaryStumpShade: string
  maxillaryRetention: string
  maxillaryNotes: string
  mandibularMaterial: string
  mandibularRetention: string
  mandibularImplantDetails: string
  createdAt: number // Timestamp
  addedFrom: "maxillary" | "mandibular" // Track which side the product was added from
  // Optional fields for case notes generation
  maxillaryStage?: string
  maxillaryToothShade?: string
  maxillaryPonticDesign?: string
  maxillaryEmbrasure?: string
  maxillaryOcclusalContact?: string
  maxillaryProximalContact?: string
  maxillaryImpression?: string
  maxillaryAddOns?: string[]
  maxillaryContourPonticType?: string
  // Maxillary implant fields
  maxillaryImplantBrand?: string
  maxillaryImplantPlatform?: string
  maxillaryImplantSize?: string
  maxillaryImplantInclusions?: string
  maxillaryAbutmentDetail?: string
  maxillaryAbutmentType?: string
  mandibularStage?: string
  mandibularToothShade?: string
  mandibularPonticDesign?: string
  mandibularEmbrasure?: string
  mandibularOcclusalContact?: string
  mandibularProximalContact?: string
  mandibularImpression?: string
  mandibularAddOns?: string[]
  mandibularContourPonticType?: string
  // Mandibular implant fields
  mandibularImplantBrand?: string
  mandibularImplantPlatform?: string
  mandibularImplantSize?: string
  mandibularImplantInclusions?: string
  mandibularAbutmentDetail?: string
  mandibularAbutmentType?: string
  // API integration fields
  // Rush request data
  rushData?: {
    targetDate: string
    daysSaved?: number
    rushPercentage?: number
    rushFee?: number
    totalPrice?: number
  }
  // Addons (structured format for API)
  maxillaryAddOnsStructured?: Array<{
    addon_id: number
    qty: number
    quantity?: number
    category?: string
    subcategory?: string
    name?: string
    price?: number
  }>
  mandibularAddOnsStructured?: Array<{
    addon_id: number
    qty: number
    quantity?: number
    category?: string
    subcategory?: string
    name?: string
    price?: number
  }>
  // Impressions
  impressions?: Array<{
    impression_id: number
    quantity: number
    notes?: string
  }>
  // Extractions
  extractions?: Array<{
    extraction_id: number
    teeth_numbers: number[]
    notes?: string
  }>
  // Advance fields
  advanceFields?: Array<{
    teeth_number?: number | null
    advance_field_id: number
    advance_field_value?: string | null
    file?: File
  }>
  // Slip-level notes
  slipNotes?: Array<{
    note: string
  }>
  // ID fields for API mapping
  maxillaryShadeBrand?: number
  maxillaryShadeId?: number
  maxillaryGumShadeBrand?: number
  maxillaryGumShadeId?: number
  maxillaryRetentionId?: number
  maxillaryRetentionOptionId?: number
  maxillaryMaterialId?: number
  maxillaryStageId?: number
  maxillaryGradeId?: number
  mandibularShadeBrand?: number
  mandibularShadeId?: number
  mandibularGumShadeBrand?: number
  mandibularGumShadeId?: number
  mandibularRetentionId?: number
  mandibularRetentionOptionId?: number
  mandibularMaterialId?: number
  mandibularStageId?: number
  mandibularGradeId?: number
}


export default function CaseDesignCenterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const {
    allCategories,
    fetchAllCategories,
    allCategoriesLoading,
    subcategoriesByCategory,
    subcategoriesLoading,
    subcategoriesError,
    fetchSubcategoriesByCategory
  } = useProductCategory()

  const { fetchLabProducts, labProducts, fetchProductDetails } = useSlipCreation()

  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null)
  const [patientData, setPatientData] = useState<PatientData | null>(null)
  const [createdBy, setCreatedBy] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [productSearchQuery, setProductSearchQuery] = useState<string>("")
  const [subcategorySearchQuery, setSubcategorySearchQuery] = useState<string>("")
  const [productListSearchQuery, setProductListSearchQuery] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number | null>(null)
  const [showSubcategories, setShowSubcategories] = useState(false)
  const [showProducts, setShowProducts] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showProductDetails, setShowProductDetails] = useState(false)
  // Product details from API - includes extractions, stages, grades, etc.
  // This is fetched from /v1/library/products/{id}?lang=en&customer_id={id}
  // Use productDetails.extractions as the basis for extraction functionality
  const [productDetails, setProductDetails] = useState<any | null>(null)
  const [isLoadingProductDetails, setIsLoadingProductDetails] = useState(false)

  // Dental chart states
  const [maxillaryTeeth, setMaxillaryTeeth] = useState<number[]>([])
  const [mandibularTeeth, setMandibularTeeth] = useState<number[]>([])

  // Form states for MAXILLARY
  const [maxillaryMaterial, setMaxillaryMaterial] = useState<string>("")
  const [maxillaryStumpShade, setMaxillaryStumpShade] = useState<string>("")
  const [maxillaryRetention, setMaxillaryRetention] = useState<string>("")
  const [maxillaryNotes, setMaxillaryNotes] = useState<string>("")

  // Form states for MANDIBULAR
  const [mandibularMaterial, setMandibularMaterial] = useState<string>("")
  const [mandibularRetention, setMandibularRetention] = useState<string>("")
  const [mandibularImplantDetails, setMandibularImplantDetails] = useState<string>("")

  // Unified accordion state - tracks which accordion is open (only one at a time)
  const [openAccordion, setOpenAccordion] = useState<string | null>(null)

  // Scroll refs and state for horizontal scrolling
  const subcategoriesScrollRef = useRef<HTMLDivElement>(null)
  const productsScrollRef = useRef<HTMLDivElement>(null)
  const [showSubcategoriesLeftArrow, setShowSubcategoriesLeftArrow] = useState(false)
  const [showSubcategoriesRightArrow, setShowSubcategoriesRightArrow] = useState(false)
  const [showProductsLeftArrow, setShowProductsLeftArrow] = useState(false)
  const [showProductsRightArrow, setShowProductsRightArrow] = useState(false)

  // Case summary notes expansion state
  const [isCaseSummaryExpanded, setIsCaseSummaryExpanded] = useState<boolean>(false)

  // Track previous notes value to prevent unnecessary parsing
  const previousNotesRef = useRef<string>("")
  const isParsingRef = useRef<boolean>(false)

  // Handler to toggle accordion - only opens/closes on click
  const handleAccordionChange = (value: string) => {
    // If clicking the same accordion that's open, close it
    // If clicking a different accordion, open it (which automatically closes the previous one)
    if (value && openAccordion === value) {
      // Same accordion clicked - close it
      setOpenAccordion(null)
    } else if (value) {
      // Different accordion clicked or opening for first time - open it
      setOpenAccordion(value)
    } else {
      // Empty string means closing
      setOpenAccordion(null)
    }
  }

  // Fixed restoration flow: track if missing teeth card has been clicked
  const [missingTeethCardClicked, setMissingTeethCardClicked] = useState<boolean>(false)

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  
  // Submit confirmation state
  const [confirmDetailsChecked, setConfirmDetailsChecked] = useState<boolean>(false)
  const [showSubmitPopover, setShowSubmitPopover] = useState<boolean>(false)
  
  // Modal states
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false)
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false)
  
  // Saved products state - array of product configurations
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([])

  // Modal states
  const [showAddOnsModal, setShowAddOnsModal] = useState(false)
  const [showRushModal, setShowRushModal] = useState(false)
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [currentProductForModal, setCurrentProductForModal] = useState<SavedProduct | null>(null)
  const [currentArchForModal, setCurrentArchForModal] = useState<"maxillary" | "mandibular" | null>(null)

  // Load data from localStorage
  useEffect(() => {
    // Get selected doctor
    const storedDoctor = localStorage.getItem("selectedDoctor")
    if (storedDoctor) {
      try {
        const doctor = JSON.parse(storedDoctor)
        setSelectedDoctor(doctor)
      } catch (error) {
        console.error("Error parsing selected doctor:", error)
      }
    }

    // Get selected lab
    const storedLab = localStorage.getItem("selectedLab")
    if (storedLab) {
      try {
        const lab = JSON.parse(storedLab)
        setSelectedLab(lab)
      } catch (error) {
        console.error("Error parsing selected lab:", error)
      }
    }

    // Get patient data
    const storedPatientData = localStorage.getItem("patientData")
    if (storedPatientData) {
      try {
        const patient = JSON.parse(storedPatientData)
        setPatientData(patient)
      } catch (error) {
        console.error("Error parsing patient data:", error)
      }
    }

    // Get created by from localStorage (user info)
    const userStr = localStorage.getItem("user")
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setCreatedBy(`${user.first_name || ""} ${user.last_name || ""}`.trim())
      } catch (error) {
        console.error("Error parsing user:", error)
      }
    }

    // Fetch categories
    const customerId = typeof window !== "undefined" ? localStorage.getItem("customerId") : null
    const customerIdNum = customerId ? Number(customerId) : undefined
    fetchAllCategories("en", customerIdNum)

    // Load saved products from localStorage
    const storedProducts = localStorage.getItem("savedProducts")
    if (storedProducts) {
      try {
        const products = JSON.parse(storedProducts)
        setSavedProducts(products)
      } catch (error) {
        console.error("Error parsing saved products:", error)
      }
    }

    // Load selected product and its details from localStorage if available
    const storedProduct = localStorage.getItem("selectedProduct")
    if (storedProduct) {
      try {
        const product = JSON.parse(storedProduct)
        setSelectedProduct(product)

        // Try to load product details from localStorage
        const storedDetails = localStorage.getItem(`productDetails_${product.id}`)
        if (storedDetails) {
          try {
            const details = JSON.parse(storedDetails)
            setProductDetails(details)
          } catch (error) {
            console.error("Error parsing stored product details:", error)
          }
        }
      } catch (error) {
        console.error("Error parsing selected product:", error)
      }
    }
  }, [fetchAllCategories])

  // Save products to localStorage whenever savedProducts changes
  useEffect(() => {
    if (savedProducts.length > 0) {
      try {
        // Optimize data before saving - remove large unnecessary fields from productDetails
        const optimizedProducts = savedProducts.map((sp) => {
          const { productDetails, ...rest } = sp
          // Only keep essential fields from productDetails if needed
          const optimizedDetails = productDetails ? {
            id: productDetails.id,
            // Add only essential fields you need to restore
            // Remove large nested objects, arrays, etc.
          } : null

          return {
            ...rest,
            // Store minimal product data - remove image_url if it's a large base64 string
            product: {
              ...sp.product,
              // Remove large image data if present
              image_url: sp.product.image_url?.startsWith('data:') ? undefined : sp.product.image_url
            },
            productDetails: optimizedDetails
          }
        })

        const dataToSave = JSON.stringify(optimizedProducts)

        // Check size before saving (localStorage limit is usually ~5-10MB)
        const sizeInMB = new Blob([dataToSave]).size / (1024 * 1024)
        if (sizeInMB > 4) {
          console.warn(`Data size (${sizeInMB.toFixed(2)}MB) is approaching localStorage limit. Consider removing old items.`)
        }

        localStorage.setItem("savedProducts", dataToSave)
      } catch (error: any) {
        if (error.name === 'QuotaExceededError' || error.code === 22) {
          console.error("localStorage quota exceeded. Attempting to clear old data...")

          // Try to remove old items or other localStorage data
          try {
            // Remove old saved products (keep only last 10)
            if (savedProducts.length > 10) {
              const recentProducts = savedProducts.slice(-10)
              const optimizedRecent = recentProducts.map((sp) => {
                const { productDetails, ...rest } = sp
                return {
                  ...rest,
                  product: {
                    ...sp.product,
                    image_url: sp.product.image_url?.startsWith('data:') ? undefined : sp.product.image_url
                  },
                  productDetails: null // Remove productDetails to save space
                }
              })
              localStorage.setItem("savedProducts", JSON.stringify(optimizedRecent))
              toast({
                title: "Storage Limit",
                description: "Some older items were removed to save space. Only the 10 most recent products are saved.",
                variant: "default",
              })
            } else {
              // If still too large, remove productDetails entirely
              const minimalProducts = savedProducts.map((sp) => {
                const { productDetails, ...rest } = sp
                return {
                  ...rest,
                  product: {
                    id: sp.product.id,
                    name: sp.product.name,
                    price: sp.product.price,
                    estimated_days: sp.product.estimated_days,
                    // Remove image_url if it's large
                    image_url: sp.product.image_url?.startsWith('data:') ? undefined : sp.product.image_url
                  },
                  productDetails: null
                }
              })
              localStorage.setItem("savedProducts", JSON.stringify(minimalProducts))
              toast({
                title: "Storage Optimized",
                description: "Product details were removed to save space. Essential data is preserved.",
                variant: "default",
              })
            }
          } catch (retryError) {
            console.error("Failed to save even after optimization:", retryError)
            toast({
              title: "Storage Error",
              description: "Unable to save all products. Please reduce the number of items or clear browser storage.",
              variant: "destructive",
            })
          }
        } else {
          console.error("Error saving to localStorage:", error)
          toast({
            title: "Save Error",
            description: "Failed to save products. Please try again.",
            variant: "destructive",
          })
        }
      }
    } else {
      localStorage.removeItem("savedProducts")
    }
  }, [savedProducts])

  // Sync products from context when labProducts changes
  useEffect(() => {
    if (showProducts && labProducts && Array.isArray(labProducts)) {
      setProducts(labProducts)
    }
  }, [labProducts, showProducts])

  // Check scroll position for subcategories
  const checkSubcategoriesScroll = () => {
    if (subcategoriesScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = subcategoriesScrollRef.current
      setShowSubcategoriesLeftArrow(scrollLeft > 0)
      setShowSubcategoriesRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  // Check scroll position for products
  const checkProductsScroll = () => {
    if (productsScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = productsScrollRef.current
      setShowProductsLeftArrow(scrollLeft > 0)
      setShowProductsRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  // Debounce search queries
  const debouncedProductSearchQuery = useDebounce(productSearchQuery, 500)
  const debouncedSubcategorySearchQuery = useDebounce(subcategorySearchQuery, 300)
  const debouncedProductListSearchQuery = useDebounce(productListSearchQuery, 300)

  // Filtered subcategories based on search query
  const filteredSubcategories = useMemo(() => {
    if (!debouncedSubcategorySearchQuery.trim()) {
      return subcategoriesByCategory
    }
    const query = debouncedSubcategorySearchQuery.toLowerCase().trim()
    return subcategoriesByCategory.filter((subcategory: ProductCategory) =>
      subcategory.sub_name?.toLowerCase().includes(query)
    )
  }, [subcategoriesByCategory, debouncedSubcategorySearchQuery])

  // Filtered products based on search query
  const filteredProducts = useMemo(() => {
    if (!debouncedProductListSearchQuery.trim()) {
      return products
    }
    const query = debouncedProductListSearchQuery.toLowerCase().trim()
    return products.filter((product: Product) =>
      product.name?.toLowerCase().includes(query)
    )
  }, [products, debouncedProductListSearchQuery])

  // Update arrow visibility when subcategories change
  useEffect(() => {
    if (showSubcategories && filteredSubcategories.length > 0) {
      setTimeout(() => {
        checkSubcategoriesScroll()
      }, 100)
    }
  }, [showSubcategories, filteredSubcategories])

  // Update arrow visibility when products change
  useEffect(() => {
    if (showProducts && filteredProducts.length > 0) {
      setTimeout(() => {
        checkProductsScroll()
      }, 100)
    }
  }, [showProducts, filteredProducts])

  // Handle window resize for scroll arrows
  useEffect(() => {
    const handleResize = () => {
      checkSubcategoriesScroll()
      checkProductsScroll()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [showSubcategories, showProducts, filteredSubcategories, filteredProducts])

  // Product search with React Query
  const labId = selectedLab?.id || selectedLab?.customer_id
  const searchTerm = debouncedProductSearchQuery.trim()
  const shouldSearch = !showSubcategories && !showProducts && !showProductDetails && !!searchTerm && !!labId

  const {
    data: productSearchResults = [],
    isLoading: isSearchingProducts,
  } = useQuery<Product[]>({
    queryKey: ['productSearch', labId, searchTerm],
    queryFn: async () => {
      if (!labId || !searchTerm) return []

      const params: Record<string, any> = {
        per_page: 50,
        page: 1,
        q: searchTerm,
      }

      const results = await fetchLabProducts(labId, params)
      return Array.isArray(results) ? results : []
    },
    enabled: shouldSearch,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  // Clear search query when navigating away from categories view
  useEffect(() => {
    if (showSubcategories || showProducts || showProductDetails) {
      setProductSearchQuery("")
    }
  }, [showSubcategories, showProducts, showProductDetails])

  // Scroll handlers
  const scrollSubcategories = (direction: 'left' | 'right') => {
    if (subcategoriesScrollRef.current) {
      const scrollAmount = 300
      const newScrollLeft = direction === 'left'
        ? subcategoriesScrollRef.current.scrollLeft - scrollAmount
        : subcategoriesScrollRef.current.scrollLeft + scrollAmount
      subcategoriesScrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      })
    }
  }

  const scrollProducts = (direction: 'left' | 'right') => {
    if (productsScrollRef.current) {
      const scrollAmount = 300
      const newScrollLeft = direction === 'left'
        ? productsScrollRef.current.scrollLeft - scrollAmount
        : productsScrollRef.current.scrollLeft + scrollAmount
      productsScrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      })
    }
  }

  // Filter categories based on common names
  const getCategoryImage = (name: string) => {
    if (!name) return "/images/product-default.png"
    const lower = name.toLowerCase()
    if (lower.includes("fixed")) return "/images/fixed-restoration.png"
    if (lower.includes("removable")) return "/images/removable-restoration.png"
    if (lower.includes("ortho")) return "/images/orthodontics.png"
    return "/images/product-default.png"
  }

  const mainCategories = allCategories?.filter((cat: ProductCategoryApi) => {
    const name = cat.name.toLowerCase()
    return name.includes("fixed") || name.includes("removable") || name.includes("ortho")
  }) || []

  // Check if selected category is Fixed Restoration
  const isFixedRestoration = selectedCategory?.toLowerCase().includes("fixed") || false

  const handleCategorySelect = (category: ProductCategoryApi) => {
    setSelectedCategory(category.name)
    setSelectedCategoryId(category.id)
    setSelectedSubcategory(null)
    setSelectedSubcategoryId(null)
    setShowSubcategories(true)
    localStorage.setItem("selectedCategory", category.name)

    // Fetch subcategories for the selected category
    const customerId = typeof window !== "undefined" ? localStorage.getItem("customerId") : null
    const customerIdNum = customerId ? Number(customerId) : undefined
    fetchSubcategoriesByCategory(category.id, "en", customerIdNum)
  }

  const handleSubcategorySelect = async (subcategory: ProductCategory) => {
    setSelectedSubcategory(subcategory.sub_name || null)
    setSelectedSubcategoryId(subcategory.id)
    localStorage.setItem("selectedSubcategory", subcategory.sub_name || "")
    localStorage.setItem("selectedSubcategoryId", subcategory.id.toString())

    // Fetch products for the selected subcategory
    setShowProducts(true)
    setShowSubcategories(false)
    setIsLoadingProducts(true)

    try {
      const labId = selectedLab?.id || selectedLab?.customer_id
      if (!labId) {
        toast({
          title: "Error",
          description: "No lab selected",
          variant: "destructive",
        })
        return
      }

      const params: Record<string, any> = {
        per_page: 50,
        page: 1,
        subcategory_id: subcategory.id,
      }

      if (searchQuery.trim()) {
        params.q = searchQuery.trim()
      }

      await fetchLabProducts(labId, params)
      // Products are stored in labProducts from context
      if (labProducts && Array.isArray(labProducts)) {
        setProducts(labProducts)
      } else {
        setProducts([])
      }
    } catch (error: any) {
      console.error("Error fetching products:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch products",
        variant: "destructive",
      })
    } finally {
      setIsLoadingProducts(false)
    }
  }

  const handleProductSelect = async (product: Product) => {
    setSelectedProduct(product)
    setShowProductDetails(true)
    setShowProducts(false)
    setIsLoadingProductDetails(true)
    setProductDetails(null)
    setProductListSearchQuery("")

    // Reset missing teeth card clicked state when selecting a new product
    if (isFixedRestoration) {
      setMissingTeethCardClicked(false)
    }
    localStorage.setItem("selectedProduct", JSON.stringify(product))

    // Fetch product details from API
    try {
      const labId = selectedLab?.id || selectedLab?.customer_id
      const details = await fetchProductDetails(product.id, labId)

      if (details) {
        setProductDetails(details)
        console.log("Product details fetched:", details)
        console.log("Product extractions:", details.extractions)

        // Store product details in localStorage for persistence
        // Only store essential data to avoid quota exceeded errors
        try {
          // Store only essential fields to reduce size
          const essentialData = {
            id: details.id,
            name: details.name,
            code: details.code,
            extractions: details.extractions || details.data?.extractions,
            // Add other essential fields as needed
          }
          localStorage.setItem(`productDetails_${product.id}`, JSON.stringify(essentialData))
        } catch (storageError: any) {
          // Handle quota exceeded or other storage errors gracefully
          if (storageError.name === 'QuotaExceededError' || storageError.message?.includes('quota')) {
            console.warn(`localStorage quota exceeded for product ${product.id}. Skipping storage.`)
            // Optionally clear old product details to free up space
            try {
              // Clear old product details (keep only the last 5 products)
              const keys = Object.keys(localStorage)
              const productDetailKeys = keys.filter(key => key.startsWith('productDetails_'))
              if (productDetailKeys.length > 5) {
                // Sort by key (which includes product ID) and remove oldest
                productDetailKeys.sort()
                const keysToRemove = productDetailKeys.slice(0, productDetailKeys.length - 5)
                keysToRemove.forEach(key => localStorage.removeItem(key))
                // Retry storing the current product
                const essentialData = {
                  id: details.id,
                  name: details.name,
                  code: details.code,
                  extractions: details.extractions || details.data?.extractions,
                }
                localStorage.setItem(`productDetails_${product.id}`, JSON.stringify(essentialData))
              }
            } catch (retryError) {
              console.warn('Failed to free up localStorage space:', retryError)
            }
          } else {
            console.error('Error storing product details in localStorage:', storageError)
          }
        }
      } else {
        toast({
          title: "Warning",
          description: "Could not fetch product details. Some features may be limited.",
          variant: "default",
        })
      }
    } catch (error: any) {
      console.error("Error fetching product details:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch product details",
        variant: "destructive",
      })
    } finally {
      setIsLoadingProductDetails(false)
    }
  }

  // Handler for when a missing teeth card is clicked (for fixed restoration flow)
  const handleMissingTeethCardClick = () => {
    setMissingTeethCardClicked(true)
  }

  const handleBackToSubcategories = () => {
    setShowProducts(false)
    setShowSubcategories(true)
    setSelectedProduct(null)
    setProducts([])
    setProductListSearchQuery("")
  }

  const handleBackToProducts = () => {
    setShowProductDetails(false)
    setShowProducts(true)
    setSelectedProduct(null)
    setMissingTeethCardClicked(false)
  }

  const handleBackToCategories = () => {
    setShowSubcategories(false)
    setShowProducts(false)
    setShowProductDetails(false)
    setSelectedCategory(null)
    setSelectedCategoryId(null)
    setSubcategorySearchQuery("")
    setProductListSearchQuery("")
    setSelectedSubcategory(null)
    setSelectedSubcategoryId(null)
    setSelectedProduct(null)
    setProducts([])
    setMissingTeethCardClicked(false)
  }

  // Function to format teeth numbers for display
  // Formats consecutive teeth as ranges (e.g., #4–5) and non-consecutive as individual numbers
  const formatTeethNumbers = (teeth: number[]): string => {
    if (teeth.length === 0) return ""
    const sorted = [...teeth].sort((a, b) => a - b)
    if (sorted.length === 1) return `#${sorted[0]}`

    // Group consecutive teeth into ranges
    const ranges: string[] = []
    let rangeStart = sorted[0]
    let rangeEnd = sorted[0]

    for (let i = 1; i <= sorted.length; i++) {
      if (i < sorted.length && sorted[i] === rangeEnd + 1) {
        // Continue the range
        rangeEnd = sorted[i]
      } else {
        // End the current range and add it to results
        if (rangeStart === rangeEnd) {
          ranges.push(`#${rangeStart}`)
        } else if (rangeEnd === rangeStart + 1) {
          // Only two consecutive teeth, show as individual (e.g., #4, #5)
          ranges.push(`#${rangeStart}, #${rangeEnd}`)
        } else {
          // Three or more consecutive teeth, show as range (e.g., #4–6)
          ranges.push(`#${rangeStart}–${rangeEnd}`)
        }

        // Start a new range
        if (i < sorted.length) {
          rangeStart = sorted[i]
          rangeEnd = sorted[i]
        }
      }
    }

    return ranges.join(", ")
  }

  // Function to parse teeth numbers from text (e.g., "#4, #5" or "teeth #4-5" or "#4–5")
  const parseTeethNumbers = (text: string): number[] => {
    const teeth: number[] = []

    // Handle ranges first (both hyphen and en-dash) like #4-5 or #4–5
    const rangePattern = /#(\d+)\s*[-–]\s*#?(\d+)/g
    let rangeMatch
    while ((rangeMatch = rangePattern.exec(text)) !== null) {
      const start = parseInt(rangeMatch[1], 10)
      const end = parseInt(rangeMatch[2], 10)
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          if (i >= 1 && i <= 32) {
            teeth.push(i)
          }
        }
      }
    }

    // Match individual teeth numbers like #4, #5, etc.
    const individualPattern = /#(\d+)(?!\s*[-–])/g
    let match
    while ((match = individualPattern.exec(text)) !== null) {
      const num = parseInt(match[1], 10)
      if (!isNaN(num) && num >= 1 && num <= 32) {
        teeth.push(num)
      }
    }

    // Remove duplicates and sort
    return [...new Set(teeth)].sort((a, b) => a - b)
  }

  // Function to parse case notes and update products, categories, and teeth selections
  const parseCaseNotes = async (notes: string) => {
    // Prevent concurrent parsing
    if (isParsingRef.current) {
      return
    }

    if (!notes.trim()) {
      // Don't clear products if notes are empty - user might be editing
      // Only clear if explicitly intended (e.g., user deletes all content intentionally)
      return
    }

    // Check if notes contain valid product sections before parsing
    const hasValidSections = notes.toUpperCase().includes('MAXILLARY') || notes.toUpperCase().includes('MANDIBULAR')
    if (!hasValidSections) {
      // Notes don't contain valid product sections, preserve existing products
      return
    }

    // Check if notes have actually changed from previous value
    if (notes === previousNotesRef.current) {
      // Notes haven't changed, no need to parse
      return
    }

    // CRITICAL SAFEGUARD: If we have existing products, be VERY conservative about parsing
    // Only parse if notes are clearly a complete replacement (substantial and well-formed)
    if (savedProducts.length > 0) {
      // Require notes to be substantial AND contain clear product indicators
      const hasProductIndicators =
        notes.includes('Fabricate') ||
        notes.includes('fabricate') ||
        notes.includes('Fixed Restoration') ||
        notes.includes('Removable') ||
        notes.includes('Orthodontic')

      // If we have existing products, only parse if:
      // 1. Notes are substantial (>= 150 chars) AND
      // 2. Notes contain clear product indicators AND
      // 3. Notes are significantly different from generated notes (user intentionally edited)
      if (!hasProductIndicators || notes.length < 150) {
        // Don't parse - preserve existing products
        return
      }

      // Additional check: if notes match the generated notes format closely, 
      // user might just be viewing, not replacing
      const generatedNotes = generateCaseNotes()
      if (generatedNotes && notes.trim() === generatedNotes.trim()) {
        // Notes match generated format exactly - don't parse
        return
      }
    }

    isParsingRef.current = true

    const newProducts: SavedProduct[] = []
    const sections = notes.split(/\n\s*\n/) // Split by double newlines
    let currentSection = ""

    for (const section of sections) {
      const lines = section.split('\n').map(l => l.trim()).filter(l => l)
      if (lines.length === 0) continue

      const firstLine = lines[0].toUpperCase()
      if (firstLine.includes('MAXILLARY')) {
        currentSection = "maxillary"
        continue
      } else if (firstLine.includes('MANDIBULAR')) {
        currentSection = "mandibular"
        continue
      }

      if (!currentSection) continue

      // Determine restoration type
      const sectionText = lines.join(' ').toLowerCase()
      const isFixedRestoration = sectionText.includes('fixed restoration')
      const isRemovable = sectionText.includes('removable restoration') || sectionText.includes('removable')
      const isOrthodontic = sectionText.includes('orthodontic') || sectionText.includes('ortho')

      if (isFixedRestoration) {
        // Parse Fixed Restoration
        const fullText = lines.join(' ')

        // Extract product name - look for "fabricate a [product]"
        const productMatch = fullText.match(/fabricate\s+(?:a|an)\s+([^for]+?)\s+for\s+teeth/i)
        const productName = productMatch ? productMatch[1].trim() : "restoration"

        // Extract teeth numbers
        const teethText = fullText.match(/teeth\s+([^in]+?)\s+in/i)?.[1] || fullText.match(/teeth\s+(.+?)(?:\s+in|$)/i)?.[1] || ""
        const teeth = parseTeethNumbers(teethText)

        // Extract stage
        const stageMatch = fullText.match(/in\s+the\s+(\w+)\s+stage/i)
        const stage = stageMatch ? stageMatch[1] : "finish"

        // Extract tooth shade
        const toothShadeMatch = fullText.match(/tooth\s+shade\s+is\s+(?:Vita\s+3D\s+Master\s+)?([A-Z]\d+)/i)
        const toothShade = toothShadeMatch ? toothShadeMatch[1] : "A2"

        // Extract stump shade
        const stumpShadeMatch = fullText.match(/stump\s+shade\s+([A-Z]\d+)/i)
        const stumpShade = stumpShadeMatch ? stumpShadeMatch[1] : "A2"

        // Extract retention
        const retentionMatch = fullText.match(/retention\s+is\s+([^.]+)/i)
        const retention = retentionMatch ? retentionMatch[1].trim() : "cement-retained"

        // Extract implant details if present
        const implantMatch = fullText.match(/implant\s+is\s+(.+?)(?:\.|$)/i)
        const implantDetails = implantMatch ? implantMatch[1].trim() : ""

        // Extract design details
        const ponticMatch = fullText.match(/follow:\s*([^,]+)/i)
        const ponticDesign = ponticMatch ? ponticMatch[1].trim() : "Modified ridge pontic"

        const embrasureMatch = fullText.match(/Type\s+(I{1,3}|[IVX]+)\s+embrasures?/i)
        const embrasure = embrasureMatch ? `Type ${embrasureMatch[1]} embrasures` : "Type II embrasures"

        const occlusalMatch = fullText.match(/(standard|light|heavy)\s+occlusal\s+contact/i)
        const occlusalContact = occlusalMatch ? `${occlusalMatch[1]} occlusal contact` : "standard occlusal contact"

        const proximalMatch = fullText.match(/(open|closed)\s+proximal\s+contact/i)
        const proximalContact = proximalMatch ? `${proximalMatch[1]} proximal contact` : "open proximal contact"

        // Extract impression
        const impressionMatch = fullText.match(/impression\s+used:\s*([^.]+)/i)
        const impression = impressionMatch ? impressionMatch[1].trim() : "STL file"

        // Extract add-ons
        const addOnsMatch = fullText.match(/add-ons?\s+requested:\s*([^.]+)/i)
        const addOns = addOnsMatch ? addOnsMatch[1].trim().split(',').map(a => a.trim()) : []

        // Try to find matching product from available products
        let matchedProduct: Product | null = null
        if (labProducts && Array.isArray(labProducts)) {
          matchedProduct = labProducts.find(p =>
            p.name.toLowerCase().includes(productName.toLowerCase()) ||
            productName.toLowerCase().includes(p.name.toLowerCase())
          ) || null
        }

        // Try to find matching category (default to Fixed Restoration)
        let matchedCategory: ProductCategoryApi | null = null
        if (allCategories && Array.isArray(allCategories)) {
          matchedCategory = allCategories.find(c =>
            c.name.toLowerCase().includes('fixed') ||
            c.name.toLowerCase().includes('restoration')
          ) || allCategories[0] || null
        }

        // Try to find matching subcategory
        let matchedSubcategory: any = null
        if (matchedCategory && matchedCategory.id) {
          // Fetch subcategories for this category if not already loaded
          if (subcategoriesByCategory.length === 0 ||
            !subcategoriesByCategory.some(sc => sc.parent_id === matchedCategory.id)) {
            await fetchSubcategoriesByCategory(matchedCategory.id)
          }
          // Find subcategories for this category
          const subcats = subcategoriesByCategory.filter(sc => sc.parent_id === matchedCategory.id)
          matchedSubcategory = subcats && subcats.length > 0 ? subcats[0] : null
        }

        // Create product if we have teeth
        if (teeth.length > 0) {
          const savedProduct: SavedProduct = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            product: matchedProduct || { id: 0, name: productName },
            productDetails: null,
            category: matchedCategory?.name || "Fixed Restoration",
            categoryId: matchedCategory?.id || 0,
            subcategory: matchedSubcategory?.name || "",
            subcategoryId: matchedSubcategory?.id || 0,
            maxillaryTeeth: currentSection === "maxillary" ? teeth : [],
            mandibularTeeth: currentSection === "mandibular" ? teeth : [],
            maxillaryMaterial: currentSection === "maxillary" ? productName : "",
            maxillaryStumpShade: currentSection === "maxillary" ? stumpShade : "",
            maxillaryRetention: currentSection === "maxillary" ? retention : "",
            maxillaryNotes: "",
            mandibularMaterial: currentSection === "mandibular" ? productName : "",
            mandibularRetention: currentSection === "mandibular" ? retention : "",
            mandibularImplantDetails: currentSection === "mandibular" ? implantDetails : "",
            createdAt: Date.now(),
            addedFrom: currentSection as "maxillary" | "mandibular",
            maxillaryStage: currentSection === "maxillary" ? stage : undefined,
            maxillaryToothShade: currentSection === "maxillary" ? toothShade : undefined,
            mandibularStage: currentSection === "mandibular" ? stage : undefined,
            mandibularToothShade: currentSection === "mandibular" ? toothShade : undefined,
            maxillaryPonticDesign: currentSection === "maxillary" ? ponticDesign : undefined,
            maxillaryEmbrasure: currentSection === "maxillary" ? embrasure : undefined,
            maxillaryOcclusalContact: currentSection === "maxillary" ? occlusalContact : undefined,
            maxillaryProximalContact: currentSection === "maxillary" ? proximalContact : undefined,
            maxillaryImpression: currentSection === "maxillary" ? impression : undefined,
            maxillaryAddOns: currentSection === "maxillary" ? addOns : undefined,
            mandibularPonticDesign: currentSection === "mandibular" ? ponticDesign : undefined,
            mandibularEmbrasure: currentSection === "mandibular" ? embrasure : undefined,
            mandibularOcclusalContact: currentSection === "mandibular" ? occlusalContact : undefined,
            mandibularProximalContact: currentSection === "mandibular" ? proximalContact : undefined,
            mandibularImpression: currentSection === "mandibular" ? impression : undefined,
            mandibularAddOns: currentSection === "mandibular" ? addOns : undefined,
          }

          newProducts.push(savedProduct)
        }
      } else if (isRemovable) {
        // Parse Removable Restoration (similar pattern)
        const fullText = lines.join(' ')
        const gradeMatch = fullText.match(/fabricate\s+(?:a|an)\s+([^removable]+?)\s+removable/i)
        const grade = gradeMatch ? gradeMatch[1].trim() : "Premium"

        const productMatch = fullText.match(/removable\s+([^replacing]+?)\s+replacing/i)
        const productName = productMatch ? productMatch[1].trim() : "removable restoration"

        const teethText = fullText.match(/replacing\s+teeth\s+([^in]+?)\s+in/i)?.[1] || ""
        const teeth = parseTeethNumbers(teethText)

        const stageMatch = fullText.match(/in\s+the\s+(\w+)\s+stage/i)
        const stage = stageMatch ? stageMatch[1] : "finish"

        // Similar parsing for removable restoration...
        // (Implementation similar to fixed restoration)
      } else if (isOrthodontic) {
        // Parse Orthodontic Restoration
        const fullText = lines.join(' ')
        const productMatch = fullText.match(/fabricate\s+(?:a|an)\s+([^with]+?)\s+with/i)
        const productName = productMatch ? productMatch[1].trim() : "orthodontic appliance"

        const instructionsMatch = fullText.match(/details:\s*(.+)/i)
        const instructions = instructionsMatch ? instructionsMatch[1].trim() : "Standard specifications"

        // Create orthodontic product...
      }
    }

    // Only update saved products if we successfully parsed at least one product
    // This prevents clearing existing products when parsing fails or returns no products
    if (newProducts.length > 0) {
      setSavedProducts(newProducts)

      // Update the first product's details in the form
      const firstProduct = newProducts[0]
      if (firstProduct.categoryId && firstProduct.subcategoryId) {
        setSelectedCategory(firstProduct.category)
        setSelectedCategoryId(firstProduct.categoryId)
        setSelectedSubcategory(firstProduct.subcategory)
        setSelectedSubcategoryId(firstProduct.subcategoryId)

        if (firstProduct.maxillaryTeeth.length > 0) {
          setMaxillaryTeeth(firstProduct.maxillaryTeeth)
        }
        if (firstProduct.mandibularTeeth.length > 0) {
          setMandibularTeeth(firstProduct.mandibularTeeth)
        }
      }

      // Update the previous notes ref only if parsing was successful
      previousNotesRef.current = notes
    }
    // If newProducts.length === 0, preserve existing products (don't clear them)

    isParsingRef.current = false
  }

  // Function to generate case notes based on the formula
  const generateCaseNotes = (): string => {
    if (savedProducts.length === 0) return ""

    let notes = ""

    // Group products by arch (maxillary/mandibular)
    // A product can have both maxillary and mandibular teeth, so we need to handle both
    const maxillaryProducts = savedProducts.filter(p => p.maxillaryTeeth.length > 0)
    const mandibularProducts = savedProducts.filter(p => p.mandibularTeeth.length > 0)

    // MAXILLARY Section
    if (maxillaryProducts.length > 0) {
      notes += "MAXILLARY\n"

      maxillaryProducts.forEach((product, index) => {
        if (index > 0) notes += "\n"

        const categoryName = product.category.toLowerCase()
        const isFixedRestoration = categoryName.includes("fixed") || (!categoryName.includes("removable") && !categoryName.includes("orthodontic"))
        const isRemovable = categoryName.includes("removable")
        const isOrthodontic = categoryName.includes("orthodontic") || categoryName.includes("ortho")

        if (isFixedRestoration) {
          const teeth = formatTeethNumbers(product.maxillaryTeeth)
          const productName = product.product.name || "restoration"
          const stage = product.maxillaryStage || "finish"
          const toothShade = product.maxillaryToothShade || "A2"
          const stumpShade = product.maxillaryStumpShade || "A2"
          const retention = product.maxillaryRetention || "cement-retained"
          const isImplant = retention.toLowerCase().includes("implant") || retention.toLowerCase().includes("screw")

          // Main fabrication line
          notes += `Fabricate ${productName} for ${teeth} in the ${stage} stage, using tooth shade Vita 3D Master ${toothShade} and stump shade ${stumpShade}. Retention: ${retention}.`

          // Show implant details if it's an implant case
          if (isImplant) {
            const brand = product.maxillaryImplantBrand
            const platform = product.maxillaryImplantPlatform
            const size = product.maxillaryImplantSize
            const inclusions = product.maxillaryImplantInclusions
            const abutmentType = product.maxillaryAbutmentType || "custom"
            const abutmentDetail = product.maxillaryAbutmentDetail || "the office"

            if (brand && platform && size && inclusions) {
              notes += ` Implant: ${brand}, ${platform}, ${size}, with ${inclusions}; using a ${abutmentType} abutment provided by ${abutmentDetail}.`
            }
          }

          const ponticDesign = product.maxillaryPonticDesign || "Modified ridge pontic"
          const embrasure = product.maxillaryEmbrasure || "Type II embrasures"
          const contourPonticType = product.maxillaryContourPonticType || "POS pontic design"
          const proximalContact = product.maxillaryProximalContact || "open proximal contact"
          const occlusalContact = product.maxillaryOcclusalContact || "standard occlusal contact"
          const impression = product.maxillaryImpression || "STL file"
          const addOns = product.maxillaryAddOns && product.maxillaryAddOns.length > 0
            ? product.maxillaryAddOns.join(", ")
            : "selected"

          notes += ` Design specifications: ${ponticDesign}, ${embrasure}, ${contourPonticType}, ${proximalContact}, ${occlusalContact}. Impression: ${impression}. Add-ons ${addOns}`
        } else if (isRemovable) {
          const teeth = formatTeethNumbers(product.maxillaryTeeth)
          const productName = product.product.name || "removable restoration"
          const grade = product.maxillaryMaterial || "Premium"
          const stage = product.maxillaryStage || "finish"
          const teethShade = product.maxillaryToothShade || "A2"
          const gumShade = product.maxillaryStumpShade || "A2"
          const impression = product.maxillaryImpression || "STL file"
          const addOns = product.maxillaryAddOns && product.maxillaryAddOns.length > 0
            ? product.maxillaryAddOns.join(", ")
            : "selected"

          notes += `Fabricate a ${grade} ${productName} replacing teeth ${teeth}, in the ${stage} stage. Use ${teethShade} denture teeth with ${gumShade} gingiva. Impression: ${impression}. Add-ons ${addOns}`
        } else if (isOrthodontic) {
          const productName = product.product.name || "orthodontic appliance"
          const instructions = product.maxillaryNotes || "Standard specifications"

          notes += `Fabricate a ${productName} with the following details: ${instructions}`
        }
      })

      notes += "\n"
    }

    // MANDIBULAR Section
    if (mandibularProducts.length > 0) {
      notes += "MANDIBULAR\n"

      mandibularProducts.forEach((product, index) => {
        if (index > 0) notes += "\n"

        const categoryName = product.category.toLowerCase()
        const isFixedRestoration = categoryName.includes("fixed") || (!categoryName.includes("removable") && !categoryName.includes("orthodontic"))
        const isRemovable = categoryName.includes("removable")
        const isOrthodontic = categoryName.includes("orthodontic") || categoryName.includes("ortho")

        if (isFixedRestoration) {
          const teeth = formatTeethNumbers(product.mandibularTeeth)
          const productName = product.product.name || "restoration"
          const stage = product.mandibularStage || "finish"
          const toothShade = product.mandibularToothShade || "A2"
          const stumpShade = product.maxillaryStumpShade || "A2"
          const retention = product.mandibularRetention || "cement-retained"
          const isImplant = retention.toLowerCase().includes("implant") || retention.toLowerCase().includes("screw")

          notes += `Fabricate ${productName} for ${teeth} in the ${stage} stage, using tooth shade Vita 3D Master ${toothShade} and stump shade ${stumpShade}. Retention: ${retention}.`

          // Show implant details if it's an implant case
          if (isImplant) {
            const brand = product.mandibularImplantBrand
            const platform = product.mandibularImplantPlatform
            const size = product.mandibularImplantSize
            const inclusions = product.mandibularImplantInclusions
            const abutmentType = product.mandibularAbutmentType || "custom"
            const abutmentDetail = product.mandibularAbutmentDetail || "the office"

            if (brand && platform && size && inclusions) {
              notes += ` Implant: ${brand}, ${platform}, ${size}, with ${inclusions}; using a ${abutmentType} abutment provided by ${abutmentDetail}.`
            }
          }

          const ponticDesign = product.mandibularPonticDesign || "Modified ridge pontic"
          const embrasure = product.mandibularEmbrasure || "Type II embrasures"
          const contourPonticType = product.mandibularContourPonticType || "POS pontic design"
          const proximalContact = product.mandibularProximalContact || "open proximal contact"
          const occlusalContact = product.mandibularOcclusalContact || "standard occlusal contact"
          const impression = product.mandibularImpression || "STL file"
          const addOns = product.mandibularAddOns && product.mandibularAddOns.length > 0
            ? product.mandibularAddOns.join(", ")
            : "selected"

          notes += ` Design specifications: ${ponticDesign}, ${embrasure}, ${contourPonticType}, ${proximalContact}, ${occlusalContact}. Impression: ${impression}. Add-ons ${addOns}`
        } else if (isRemovable) {
          const teeth = formatTeethNumbers(product.mandibularTeeth)
          const productName = product.product.name || "removable restoration"
          const grade = product.mandibularMaterial || "Premium"
          const stage = product.mandibularStage || "finish"
          const teethShade = product.mandibularToothShade || "A2"
          const gumShade = product.maxillaryStumpShade || "A2"
          const impression = product.mandibularImpression || "STL"
          const addOns = product.mandibularAddOns && product.mandibularAddOns.length > 0
            ? product.mandibularAddOns.join(", ")
            : "Selected"

          notes += `Fabricate a ${grade} ${productName} replacing teeth ${teeth}, in the ${stage} stage. Use ${teethShade} denture teeth with ${gumShade} gingiva. Impression: ${impression}. Add-ons ${addOns}`
        } else if (isOrthodontic) {
          const productName = product.product.name || "orthodontic appliance"
          const instructions = product.maxillaryNotes || "Standard specifications"

          notes += `Fabricate a ${productName} with the following details: ${instructions}`
        }
      })
    }

    return notes.trim()
  }

  // Initialize maxillaryNotes with generated notes when empty and we have products
  // Only initialize if maxillaryNotes is empty to preserve user input
  useEffect(() => {
    if (!maxillaryNotes && savedProducts.length > 0) {
      const generatedNotes = generateCaseNotes()
      if (generatedNotes) {
        setMaxillaryNotes(generatedNotes)
      }
    }
  }, [savedProducts.length]) // Only run when savedProducts length changes

  // Handler for Add Product button - saves current product and resets to categories
  const handleAddProduct = (type: "maxillary" | "mandibular") => {
    // Validate that we have a product selected
    if (!selectedProduct) {
      toast({
        title: "No Product Selected",
        description: "Please select a product first",
        variant: "destructive",
      })
      return
    }

    // Validate that we have teeth selected for the specified type
    const teethForType = type === "maxillary" ? maxillaryTeeth : mandibularTeeth
    if (teethForType.length === 0) {
      toast({
        title: "No Teeth Selected",
        description: `Please select at least one ${type} tooth`,
        variant: "destructive",
      })
      return
    }

    // Validate category and subcategory
    if (!selectedCategory || !selectedCategoryId || !selectedSubcategory || !selectedSubcategoryId) {
      toast({
        title: "Missing Information",
        description: "Please ensure category and subcategory are selected",
        variant: "destructive",
      })
      return
    }

    // Create saved product configuration
    const savedProduct: SavedProduct = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      product: selectedProduct,
      productDetails: productDetails, // Include full product details with extractions
      category: selectedCategory,
      categoryId: selectedCategoryId,
      subcategory: selectedSubcategory,
      subcategoryId: selectedSubcategoryId,
      maxillaryTeeth: [...maxillaryTeeth],
      mandibularTeeth: [...mandibularTeeth],
      maxillaryMaterial,
      maxillaryStumpShade,
      maxillaryRetention,
      maxillaryNotes,
      mandibularMaterial,
      mandibularRetention,
      mandibularImplantDetails,
      createdAt: Date.now(),
      addedFrom: type, // Track which side the product was added from
    }

    // Add to saved products array
    setSavedProducts((prev) => [...prev, savedProduct])

    // Reset form to categories step
    setShowSubcategories(false)
    setShowProducts(false)
    setShowProductDetails(false)
    setSelectedCategory(null)
    setSelectedCategoryId(null)
    setSelectedSubcategory(null)
    setSelectedSubcategoryId(null)
    setSelectedProduct(null)
    setProducts([])
    setMaxillaryTeeth([])
    setMandibularTeeth([])
    setMaxillaryMaterial("")
    setMaxillaryStumpShade("")
    setMaxillaryRetention("")
    setMaxillaryNotes("")
    setMandibularMaterial("")
    setMandibularRetention("")
    setMandibularImplantDetails("")
    setMissingTeethCardClicked(false)
    setOpenAccordion("maxillary-card")

    toast({
      title: "Product Added",
      description: `${selectedProduct.name} has been added to your case`,
    })
  }

  // Handler to delete a saved product
  const handleDeleteProduct = (productId: string) => {
    setSavedProducts((prev) => prev.filter((p) => p.id !== productId))

    // Reset to category selection view
    setShowSubcategories(false)
    setShowProducts(false)
    setShowProductDetails(false)
    setSelectedCategory(null)
    setSelectedCategoryId(null)
    setSelectedSubcategory(null)
    setSelectedSubcategoryId(null)
    setSelectedProduct(null)
    setProducts([])
    setMaxillaryTeeth([])
    setMandibularTeeth([])
    setMaxillaryMaterial("")
    setMaxillaryStumpShade("")
    setMaxillaryRetention("")
    setMaxillaryNotes("")
    setMandibularMaterial("")
    setMandibularRetention("")
    setMandibularImplantDetails("")
    setMissingTeethCardClicked(false)

    toast({
      title: "Product Removed",
      description: "Product has been removed from your case",
    })
  }

  // Handler to show teeth selection when clicking a saved product card
  const handleSavedProductCardClick = (savedProduct: SavedProduct) => {
    // Set the selected product and show product details to make the teeth selection interface visible
    setSelectedProduct(savedProduct.product)
    setShowProductDetails(true)
    
    // Set category and subcategory from saved product
    setSelectedCategory(savedProduct.category)
    setSelectedCategoryId(savedProduct.categoryId)
    setSelectedSubcategory(savedProduct.subcategory)
    setSelectedSubcategoryId(savedProduct.subcategoryId)
    
    // Update teeth selection to show the teeth from the saved product
    // Always set the arrays to ensure proper state updates, even if empty
    // Create new array references to ensure React detects the change
    const maxillaryTeethArray = Array.isArray(savedProduct.maxillaryTeeth) && savedProduct.maxillaryTeeth.length > 0
      ? [...savedProduct.maxillaryTeeth]
      : []
    const mandibularTeethArray = Array.isArray(savedProduct.mandibularTeeth) && savedProduct.mandibularTeeth.length > 0
      ? [...savedProduct.mandibularTeeth]
      : []
    
    // Use setTimeout to ensure state updates are applied correctly
    // This helps with React batching and ensures the SVG components receive the updated values
    setMaxillaryTeeth([])
    setMandibularTeeth([])
    
    // Use a small delay to ensure the state is reset before setting new values
    setTimeout(() => {
      setMaxillaryTeeth(maxillaryTeethArray)
      setMandibularTeeth(mandibularTeethArray)
    }, 0)
    
    // Set material and other details if available
    if (savedProduct.maxillaryMaterial) {
      setMaxillaryMaterial(savedProduct.maxillaryMaterial)
    }
    if (savedProduct.maxillaryStumpShade) {
      setMaxillaryStumpShade(savedProduct.maxillaryStumpShade)
    }
    if (savedProduct.maxillaryRetention) {
      setMaxillaryRetention(savedProduct.maxillaryRetention)
    }
    if (savedProduct.maxillaryNotes) {
      setMaxillaryNotes(savedProduct.maxillaryNotes)
    }
    if (savedProduct.mandibularMaterial) {
      setMandibularMaterial(savedProduct.mandibularMaterial)
    }
    if (savedProduct.mandibularRetention) {
      setMandibularRetention(savedProduct.mandibularRetention)
    }
    if (savedProduct.mandibularImplantDetails) {
      setMandibularImplantDetails(savedProduct.mandibularImplantDetails)
    }
  }

  // Handler to clear current product and reset to category selection
  const handleClearCurrentProduct = () => {
    // Reset to category selection view
    setShowSubcategories(false)
    setShowProducts(false)
    setShowProductDetails(false)
    setSelectedCategory(null)
    setSelectedCategoryId(null)
    setSelectedSubcategory(null)
    setSelectedSubcategoryId(null)
    setSelectedProduct(null)
    setProducts([])
    setMaxillaryTeeth([])
    setMandibularTeeth([])
    setMaxillaryMaterial("")
    setMaxillaryStumpShade("")
    setMaxillaryRetention("")
    setMaxillaryNotes("")
    setMandibularMaterial("")
    setMandibularRetention("")
    setMandibularImplantDetails("")
    setMissingTeethCardClicked(false)
    setProductDetails(null)

    toast({
      title: "Product Cleared",
      description: "Current product selection has been cleared",
    })
  }

  const handleSubmit = async () => {
    // Check confirmation checkbox
    if (!confirmDetailsChecked) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm that all details are correct before submitting",
        variant: "destructive",
      })
      setShowSubmitPopover(true)
      return
    }

    // Check if there are any saved products or a current product being configured
    const hasSavedProducts = savedProducts.length > 0
    const hasCurrentProduct = selectedProduct && (maxillaryTeeth.length > 0 || mandibularTeeth.length > 0)

    if (!hasSavedProducts && !hasCurrentProduct) {
      toast({
        title: "Validation Error",
        description: "Please add at least one product to your case",
        variant: "destructive",
      })
      return
    }

    // If there's a current product being configured but not saved, prompt to save it first
    if (hasCurrentProduct && !hasSavedProducts) {
      toast({
        title: "Save Product First",
        description: "Please click 'Add Product' to save your current product configuration before submitting",
        variant: "destructive",
      })
      return
    }

    // Validate required data
    if (!selectedLab) {
      toast({
        title: "Validation Error",
        description: "Please select a lab",
        variant: "destructive",
      })
      return
    }

    if (!selectedDoctor) {
      toast({
        title: "Validation Error",
        description: "Please select a doctor",
        variant: "destructive",
      })
      return
    }

    if (!patientData || !patientData.name) {
      toast({
        title: "Validation Error",
        description: "Please enter patient information",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Import services dynamically to avoid SSR issues
      const { slipCreationService } = await import("@/services/slip-creation-service")
      const { transformToSlipCreationPayload, extractFilesFromAdvanceFields } = await import("@/utils/slip-data-transformer")

      // Get user from localStorage
      const userStr = localStorage.getItem("user")
      if (!userStr) {
        throw new Error("User information not found. Please log in again.")
      }
      const user = JSON.parse(userStr)

      // Transform data to API format
      const payload = transformToSlipCreationPayload({
        selectedLab,
        selectedDoctor,
        patientData,
        savedProducts,
        user,
        locationId: undefined, // Could be added from user preferences
      })

      // Extract files from advance fields if any
      const files = extractFilesFromAdvanceFields(savedProducts)

      // Call API
      const response = await slipCreationService.createSlip(payload, files.length > 0 ? files : undefined)

      if (response.success) {
        toast({
          title: "Case Submitted Successfully",
          description: response.data?.case_number
            ? `Case ${response.data.case_number} has been created successfully`
            : "Your case has been submitted successfully",
        })

        // Clear slip creation storage
        clearSlipCreationStorage()

        // Navigate to dashboard or case detail page
        if (response.data?.case_id) {
          // Optionally navigate to case detail page
          // router.push(`/cases/${response.data.case_id}`)
          router.push("/dashboard")
        } else {
          router.push("/dashboard")
        }
      } else {
        throw new Error(response.message || "Failed to submit case")
      }
    } catch (error: any) {
      console.error("Error submitting case:", error)
      
      // Handle validation errors from API
      let errorMessage = error.message || "Failed to submit case"
      if (error.errors) {
        const errorDetails = Object.entries(error.errors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`)
          .join("\n")
        errorMessage = `${errorMessage}\n${errorDetails}`
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMaxillaryToothToggle = (toothNumber: number) => {
    setMaxillaryTeeth(prev =>
      prev.includes(toothNumber)
        ? prev.filter(t => t !== toothNumber)
        : [...prev, toothNumber]
    )
  }

  const handleMandibularToothToggle = (toothNumber: number) => {
    setMandibularTeeth(prev =>
      prev.includes(toothNumber)
        ? prev.filter(t => t !== toothNumber)
        : [...prev, toothNumber]
    )
  }

  // Get subcategory image helper
  const getSubcategoryImage = (name: string) => {
    if (!name) return "/images/product-default.png"
    const lower = name.toLowerCase()
    // You can add more specific image mappings here
    return "/images/product-default.png"
  }

  const handleCancel = () => {
    // Clear all slip creation storage when canceling
    clearSlipCreationStorage()
    router.back()
  }

  const handlePreview = () => {
    // Transform current data to preview format
    setShowPreviewModal(true)
  }

  // Transform saved products and case data to preview format
  const getPreviewCaseData = () => {
    // Get lab info
    const labName = selectedLab?.name || "Lab"
    const labAddress = "" // Could be added to lab object
    const labPhone = "" // Could be added to lab object
    const labEmail = "" // Could be added to lab object

    // Get office info (from user's customerId if office_admin/doctor)
    const officeName = typeof window !== "undefined" 
      ? (localStorage.getItem("customerName") || "Office")
      : "Office"

    // Get doctor info
    const doctorName = selectedDoctor 
      ? `${selectedDoctor.first_name} ${selectedDoctor.last_name}`
      : "Doctor"

    // Get patient info
    const patientName = patientData?.name || "Patient"

    // Transform products
    const previewProducts = savedProducts.map((sp, index) => {
      const maxillaryTeeth = sp.maxillaryTeeth.length > 0 ? sp.maxillaryTeeth : []
      const mandibularTeeth = sp.mandibularTeeth.length > 0 ? sp.mandibularTeeth : []
      
      // Combine teeth for display
      const allTeeth = [...maxillaryTeeth, ...mandibularTeeth]
      const teethString = allTeeth.sort((a, b) => a - b).join(", ")

      return {
        id: sp.id,
        name: sp.product.name,
        type: maxillaryTeeth.length > 0 ? "Upper" : "Lower",
        teeth: teethString,
        deliveryDate: new Date(Date.now() + (sp.product.estimated_days || 7) * 24 * 60 * 60 * 1000).toLocaleDateString(),
        abbreviation: sp.product.name.substring(0, 3).toUpperCase(),
        color: index === 0 ? "#ef4444" : "#6b7280",
        borderColor: index === 0 ? "#dc2626" : "#4b5563",
        addOns: (maxillaryTeeth.length > 0 ? sp.maxillaryAddOnsStructured : sp.mandibularAddOnsStructured)?.map(a => ({
          category: a.category || "",
          addOn: a.name || "",
          qty: a.qty || a.quantity || 1,
        })) || [],
        stageNotesContent: maxillaryTeeth.length > 0 ? sp.maxillaryNotes : sp.mandibularImplantDetails || "",
        rushRequest: sp.rushData ? {
          date: sp.rushData.targetDate,
        } : undefined,
        maxillaryTeeth,
        mandibularTeeth,
        maxillaryConfig: maxillaryTeeth.length > 0 ? {
          material: sp.maxillaryMaterial,
          shade: sp.maxillaryToothShade,
          retention: sp.maxillaryRetention,
        } : undefined,
        mandibularConfig: mandibularTeeth.length > 0 ? {
          material: sp.mandibularMaterial,
          retention: sp.mandibularRetention,
        } : undefined,
      }
    })

    return {
      lab: labName,
      address: labAddress,
      qrCode: undefined, // Could generate QR code
      office: officeName,
      doctor: doctorName,
      patient: patientName,
      pickupDate: new Date().toLocaleDateString(), // Could calculate from delivery date
      panNumber: "A69", // Would come from API after creation
      caseNumber: "C000000", // Would come from API after creation
      slipNumber: "S000000", // Would come from API after creation
      products: previewProducts,
      contact: labPhone,
      email: labEmail,
    }
  }

  const getGenderDisplay = (gender: string) => {
    if (gender === "male") return "M"
    if (gender === "female") return "F"
    return "M / F"
  }

  // Handlers for editable patient data
  const handlePatientNameChange = (value: string) => {
    const updatedPatientData = {
      ...patientData,
      name: value,
      gender: patientData?.gender || "",
    }
    setPatientData(updatedPatientData)
    localStorage.setItem("patientData", JSON.stringify(updatedPatientData))
  }

  const handlePatientGenderChange = (value: string) => {
    const updatedPatientData = {
      ...patientData,
      name: patientData?.name || "",
      gender: value,
    }
    setPatientData(updatedPatientData)
    localStorage.setItem("patientData", JSON.stringify(updatedPatientData))
  }

  return (
    <div className="min-h-screen">
      <SlipCreationHeader
        variant="full"
        sendingToLab={selectedLab}
        createdBy={createdBy}
        doctor={selectedDoctor}
        editablePatientData={{
          name: patientData?.name || "",
          gender: patientData?.gender || "",
          onNameChange: handlePatientNameChange,
          onGenderChange: handlePatientGenderChange,
        }}
      />

      {/* Case Design Center Label */}
      <div className="bg-[#fdfdfd] h-[37px] grid grid-cols-3 items-center px-5">
        <div className="flex items-center">
          {showProducts && !showProductDetails ? (
            <Button
              onClick={handleBackToSubcategories}
              variant="ghost"
              className="text-[#1162a8] hover:text-[#0d4d87] hover:bg-[#dfeefb]"
            >
              ← Back to Subcategories
            </Button>
          ) : showSubcategories && !showProducts && !showProductDetails ? (
            <Button
              onClick={handleBackToCategories}
              variant="ghost"
              className="text-[#1162a8] hover:text-[#0d4d87] hover:bg-[#dfeefb]"
            >
              ← Back to Categories
            </Button>
          ) : null}
        </div>
        <div className="flex items-center justify-center">
          <p className="text-base font-bold text-black">CASE DESIGN CENTER</p>
        </div>
        <div></div>
      </div>

      {/* Main Content */}
      <div className="bg-[#fdfdfd] min-h-full" style={{ paddingBottom: "20px" }}>
        <div className="container mx-auto px-5 py-5" style={{ paddingBottom: "20px" }}>
          {/* Search and Category Selection */}
          <div className="flex flex-col items-center">
            {/* Search and Labels Row */}
            <div className="flex items-center w-full max-w-[1400px] gap-4">
              {/* Two Column Layout for Labels */}
              <div className="grid grid-cols-2 flex-1 gap-4">
                {/* MAXILLARY Column */}
                <div className="flex items-center justify-center gap-3">
                  <p className="text-base font-bold text-black text-center" style={{ fontWeight: 700, letterSpacing: "0.01em" }}>MAXILLARY</p>
                  {/* Only show Add Product button when in tooth selection step */}
                  {showProductDetails && selectedProduct && (
                    <div
                      style={{
                        position: "relative",
                        width: "96.22px",
                        height: "22px",
                        flex: "none",
                        order: 1,
                        flexGrow: 0,
                      }}
                    >
                      {/* Background Rectangle */}
                      <div
                        style={{
                          position: "absolute",
                          width: "96.22px",
                          height: "18.53px",
                          left: "0px",
                          top: "1.74px",
                          background: "#1162A8",
                          boxShadow: "1px 1px 3.5px rgba(0, 0, 0, 0.25)",
                          borderRadius: "6px",
                          zIndex: 1,
                        }}
                      />
                      {/* Add icon (+) */}
                      <span
                        style={{
                          position: "absolute",
                          width: "13px",
                          height: "13px",
                          left: "9.18px", // 143.07 - 133.89
                          top: "4.5px",
                          zIndex: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6.5 4.875V8.125M8.125 6.5H4.875M11.375 6.5C11.375 7.14019 11.2489 7.77412 11.0039 8.36558C10.7589 8.95704 10.3998 9.49446 9.94715 9.94715C9.49446 10.3998 8.95704 10.7589 8.36558 11.0039C7.77412 11.2489 7.14019 11.375 6.5 11.375C5.85981 11.375 5.22588 11.2489 4.63442 11.0039C4.04296 10.7589 3.50554 10.3998 3.05285 9.94715C2.60017 9.49446 2.24108 8.95704 1.99609 8.36558C1.7511 7.77412 1.625 7.14019 1.625 6.5C1.625 5.20707 2.13861 3.96709 3.05285 3.05285C3.96709 2.13861 5.20707 1.625 6.5 1.625C7.79293 1.625 9.03291 2.13861 9.94715 3.05285C10.8614 3.96709 11.375 5.20707 11.375 6.5Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>

                      </span>
                      {/* Add Product Label */}
                      <button
                        type="button"
                        onClick={() => handleAddProduct("maxillary")}
                        style={{
                          all: "unset",
                          cursor: "pointer",
                          position: "absolute",
                          width: "96.22px",
                          height: "22px",
                          left: "0px",
                          top: "0px",
                          zIndex: 3,
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            width: "59px",
                            height: "22px",
                            left: "26.08px", // 159.97 - 133.89
                            top: "0px",
                            fontFamily: "Verdana",
                            fontStyle: "normal",
                            fontWeight: 400,
                            fontSize: "10px",
                            lineHeight: "22px",
                            textAlign: "center",
                            letterSpacing: "-0.02em",
                            color: "#FFFFFF",
                            userSelect: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          Add Product
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* MANDIBULAR Column */}
                <div className="flex items-center justify-center gap-3">
                  <p className="text-base font-bold text-black text-center" style={{ fontWeight: 700, letterSpacing: "0.01em" }}>MANDIBULAR</p>
                  {/* Only show Add Product button when in tooth selection step */}
                  {showProductDetails && selectedProduct && (
                    <div
                      style={{
                        position: "relative",
                        width: "96.22px",
                        height: "22px",
                        flex: "none",
                        order: 1,
                        flexGrow: 0,
                      }}
                    >
                      {/* Background Rectangle */}
                      <div
                        style={{
                          position: "absolute",
                          width: "96.22px",
                          height: "18.53px",
                          left: "0px",
                          top: "1.74px",
                          background: "#1162A8",
                          boxShadow: "1px 1px 3.5px rgba(0, 0, 0, 0.25)",
                          borderRadius: "6px",
                          zIndex: 1,
                        }}
                      />
                      {/* Add icon (+) */}
                      <span
                        style={{
                          position: "absolute",
                          width: "13px",
                          height: "13px",
                          left: "9.18px", // 143.07 - 133.89
                          top: "4.5px",
                          zIndex: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6.5 4.875V8.125M8.125 6.5H4.875M11.375 6.5C11.375 7.14019 11.2489 7.77412 11.0039 8.36558C10.7589 8.95704 10.3998 9.49446 9.94715 9.94715C9.49446 10.3998 8.95704 10.7589 8.36558 11.0039C7.77412 11.2489 7.14019 11.375 6.5 11.375C5.85981 11.375 5.22588 11.2489 4.63442 11.0039C4.04296 10.7589 3.50554 10.3998 3.05285 9.94715C2.60017 9.49446 2.24108 8.95704 1.99609 8.36558C1.7511 7.77412 1.625 7.14019 1.625 6.5C1.625 5.20707 2.13861 3.96709 3.05285 3.05285C3.96709 2.13861 5.20707 1.625 6.5 1.625C7.79293 1.625 9.03291 2.13861 9.94715 3.05285C10.8614 3.96709 11.375 5.20707 11.375 6.5Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>

                      </span>
                      {/* Add Product Label */}
                      <button
                        type="button"
                        onClick={() => handleAddProduct("mandibular")}
                        style={{
                          all: "unset",
                          cursor: "pointer",
                          position: "absolute",
                          width: "96.22px",
                          height: "22px",
                          left: "0px",
                          top: "0px",
                          zIndex: 3,
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            width: "59px",
                            height: "22px",
                            left: "26.08px", // 159.97 - 133.89
                            top: "0px",
                            fontFamily: "Verdana",
                            fontStyle: "normal",
                            fontWeight: 400,
                            fontSize: "10px",
                            lineHeight: "22px",
                            textAlign: "center",
                            letterSpacing: "-0.02em",
                            color: "#FFFFFF",
                            userSelect: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          Add Product
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Product Category Cards - Show when no subcategories, products, or product details are shown */}
            {!showSubcategories && !showProducts && !showProductDetails && (
              <div className="w-full flex flex-col gap-4 mb-6">
                {/* Search Bar for Products */}
                <div className="flex justify-center">
                  <div className="relative max-w-[373px] w-full">
                    <Input
                      type="text"
                      placeholder="Search Products"
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="h-[34px] pl-3 pr-10 border-[#b4b0b0] rounded"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-[#b4b0b0]" />
                  </div>
                </div>

                {/* Product Search Results */}
                {productSearchQuery.trim() && (
                  <div className="w-full">
                    {isSearchingProducts ? (
                      <div className="flex items-center justify-center py-20">
                        <div className="text-gray-500">Searching products...</div>
                      </div>
                    ) : productSearchResults.length === 0 ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="text-center">
                          <p className="text-gray-600">No products found matching "{productSearchQuery}"</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-4 justify-center flex-wrap">
                        {productSearchResults.map((product: Product) => {
                          const isSelected = selectedProduct?.id === product.id
                          return (
                            <div
                              key={product.id}
                              onClick={() => handleProductSelect(product)}
                              className={`bg-white border-2 ${isSelected ? "border-[#1162a8] shadow-lg" : "border-[#b4b0b0] hover:border-[#1162A8]"
                                } rounded-lg h-[210px] w-[155px] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:shadow-md transition-all`}
                            >
                              <div className="w-[117px] h-[117px] rounded overflow-hidden">
                                <img
                                  src={product.image_url || "/images/product-default.png"}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = "/images/product-default.png"
                                  }}
                                />
                              </div>
                              <p className="text-[11px] text-black text-center">
                                {product.name}
                              </p>
                              <div className="flex flex-col gap-1 items-start w-[87px]">
                                <div className="bg-[rgba(17,98,168,0.2)] border border-[#1162a8] rounded-[10px] h-[15px] flex items-center justify-center w-full">
                                  <p className="text-[#1162a8] text-[9.5px]">
                                    ${product.price || 999}
                                  </p>
                                </div>
                                <div className="bg-[rgba(146,147,147,0.2)] border border-[#929393] rounded-[10px] h-[15px] flex items-center justify-center w-full">
                                  <p className="text-[#929393] text-[9.5px]">
                                    est {product.estimated_days || 14} days
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Category Cards - Show when no search query */}
                {!productSearchQuery.trim() && (
                  <div className="flex gap-4 justify-center">
                    {mainCategories.map((category: ProductCategoryApi) => {
                      const isSelected = selectedCategory === category.name
                      return (
                        <div
                          key={category.id}
                          onClick={() => handleCategorySelect(category)}
                          className={`bg-white border-2 ${isSelected ? "border-[#1162a8] shadow-lg" : "border-[#b4b0b0] hover:border-[#1162A8]"
                            } rounded-lg h-[185px] w-[155px] p-4 flex flex-col items-center justify-center gap-4 cursor-pointer hover:shadow-md transition-all`}
                        >
                          <div className="w-[117px] h-[117px] rounded overflow-hidden">
                            <img
                              src={category.image_url || getCategoryImage(category.name)}
                              alt={category.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = getCategoryImage(category.name)
                              }}
                            />
                          </div>
                          <p className="text-[11px] text-black text-center">
                            {category.name}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Subcategory Cards - Show when category is selected */}
            {showSubcategories && !showProducts && !showProductDetails && (
              <div className="w-full flex flex-col gap-4">
                {/* Search Bar for Subcategories */}
                <div className="flex justify-center">
                  <div className="relative max-w-[373px] w-full">
                    <Input
                      type="text"
                      placeholder="Search Products"
                      value={subcategorySearchQuery}
                      onChange={(e) => setSubcategorySearchQuery(e.target.value)}
                      className="h-[34px] pl-3 pr-10 border-[#b4b0b0] rounded"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-[#b4b0b0]" />
                  </div>
                </div>

                {subcategoriesLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-gray-500">Loading subcategories...</div>
                  </div>
                ) : subcategoriesError ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <p className="text-red-600 mb-4">Error loading subcategories: {subcategoriesError}</p>
                      <Button onClick={handleBackToCategories} variant="outline">
                        Back to Categories
                      </Button>
                    </div>
                  </div>
                ) : filteredSubcategories.length === 0 ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <p className="text-gray-600 mb-4">
                        {subcategorySearchQuery.trim()
                          ? `No subcategories found matching "${subcategorySearchQuery}"`
                          : "No subcategories available for this category."}
                      </p>
                      <Button onClick={handleBackToCategories} variant="outline">
                        Back to Categories
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full">
                    {/* Left Arrow Button */}
                    {showSubcategoriesLeftArrow && (
                      <button
                        onClick={() => scrollSubcategories('left')}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-all border border-gray-200"
                        aria-label="Scroll left"
                      >
                        <ChevronLeft className="h-6 w-6 text-gray-700" />
                      </button>
                    )}

                    {/* Scrollable Container */}
                    <div
                      ref={subcategoriesScrollRef}
                      onScroll={checkSubcategoriesScroll}
                      className={`flex gap-4 overflow-x-auto scrollbar-hide py-2 ${showSubcategoriesLeftArrow || showSubcategoriesRightArrow ? 'px-12' : 'px-0 justify-center'
                        }`}
                      style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                      }}
                    >
                      {filteredSubcategories.map((subcategory: ProductCategory) => {
                        const isSelected = selectedSubcategory === subcategory.sub_name
                        return (
                          <div
                            key={subcategory.id}
                            onClick={() => handleSubcategorySelect(subcategory)}
                            className={`bg-white border-2 ${isSelected ? "border-[#1162a8] shadow-lg" : "border-[#b4b0b0] hover:border-[#1162A8]"
                              } rounded-lg h-[185px] w-[155px] p-4 flex flex-col items-center justify-center gap-4 cursor-pointer hover:shadow-md transition-all flex-shrink-0`}
                          >
                            <div className="w-[117px] h-[117px] rounded overflow-hidden">
                              <img
                                src={subcategory.image_url || getSubcategoryImage(subcategory.sub_name || "")}
                                alt={subcategory.sub_name || ""}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = getSubcategoryImage(subcategory.sub_name || "")
                                }}
                              />
                            </div>
                            <p className="text-[11px] text-black text-center">
                              {subcategory.sub_name || ""}
                            </p>
                          </div>
                        )
                      })}
                    </div>

                    {/* Right Arrow Button */}
                    {showSubcategoriesRightArrow && (
                      <button
                        onClick={() => scrollSubcategories('right')}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-all border border-gray-200"
                        aria-label="Scroll right"
                      >
                        <ChevronRight className="h-6 w-6 text-gray-700" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Product Cards - Show when subcategory is selected */}
            {showProducts && !showProductDetails && (
              <div className="w-full flex flex-col gap-4">
                {/* Search Bar for Products */}
                <div className="flex justify-center">
                  <div className="relative max-w-[373px] w-full">
                    <Input
                      type="text"
                      placeholder="Search Products"
                      value={productListSearchQuery}
                      onChange={(e) => setProductListSearchQuery(e.target.value)}
                      className="h-[34px] pl-3 pr-10 border-[#b4b0b0] rounded"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-[#b4b0b0]" />
                  </div>
                </div>

                {isLoadingProducts ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-gray-500">Loading products...</div>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <p className="text-gray-600 mb-4">
                        {productListSearchQuery.trim()
                          ? `No products found matching "${productListSearchQuery}"`
                          : "No products available for this subcategory."}
                      </p>
                      <Button onClick={handleBackToSubcategories} variant="outline">
                        Back to Subcategories
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full">
                    {/* Left Arrow Button */}
                    {showProductsLeftArrow && (
                      <button
                        onClick={() => scrollProducts('left')}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-all border border-gray-200"
                        aria-label="Scroll left"
                      >
                        <ChevronLeft className="h-6 w-6 text-gray-700" />
                      </button>
                    )}

                    {/* Scrollable Container */}
                    <div
                      ref={productsScrollRef}
                      onScroll={checkProductsScroll}
                      className={`flex gap-4 overflow-x-auto scrollbar-hide py-2 ${showProductsLeftArrow || showProductsRightArrow ? 'px-12' : 'px-0 justify-center'
                        }`}
                      style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                      }}
                    >
                      {filteredProducts.map((product: Product) => {
                        const isSelected = selectedProduct?.id === product.id
                        return (
                          <div
                            key={product.id}
                            onClick={() => handleProductSelect(product)}
                            className={`bg-white border-2 ${isSelected ? "border-[#1162a8] shadow-lg" : "border-[#b4b0b0] hover:border-[#1162A8]"
                              } rounded-lg h-[210px] w-[155px] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:shadow-md transition-all flex-shrink-0`}
                          >
                            <div className="w-[117px] h-[117px] rounded overflow-hidden">
                              <img
                                src={product.image_url || "/images/product-default.png"}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "/images/product-default.png"
                                }}
                              />
                            </div>
                            <p className="text-[11px] text-black text-center">
                              {product.name}
                            </p>
                            <div className="flex flex-col gap-1 items-start w-[87px]">
                              <div className="bg-[rgba(17,98,168,0.2)] border border-[#1162a8] rounded-[10px] h-[15px] flex items-center justify-center w-full">
                                <p className="text-[#1162a8] text-[9.5px]">
                                  ${product.price || 999}
                                </p>
                              </div>
                              <div className="bg-[rgba(146,147,147,0.2)] border border-[#929393] rounded-[10px] h-[15px] flex items-center justify-center w-full">
                                <p className="text-[#929393] text-[9.5px]">
                                  est {product.estimated_days || 14} days
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Right Arrow Button */}
                    {showProductsRightArrow && (
                      <button
                        onClick={() => scrollProducts('right')}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-all border border-gray-200"
                        aria-label="Scroll right"
                      >
                        <ChevronRight className="h-6 w-6 text-gray-700" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Product Details Split View - Show when product is selected */}
            {showProductDetails && selectedProduct && (
              <div className="w-full max-w-[1400px] mx-auto">
                {/* Tooth Selection Interface */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-2 mb-8">
                  {/* MAXILLARY Section */}
                  <div className="flex flex-col w-full">
                    {/* Selected Product Badge */}
                    {selectedProduct && (
                      <div
                        className="relative flex items-center justify-center"
                        style={{ width: "100%", height: "32px", flex: "none", order: 0, flexGrow: 0 }}
                      >
                        <div
                          className="absolute left-1/2"
                          style={{
                            width: "auto",
                            minWidth: "210px",
                            maxWidth: "390px",
                            height: "22px",
                            top: "5px",
                            transform: "translateX(-50%)",
                            background: "#DFEEFB",
                            boxShadow: "1px 1px 3.5px rgba(0, 0, 0, 0.25)",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0 14px",
                          }}
                        >
                          <span
                            className="flex items-center justify-center"
                            style={{
                              fontFamily: "Verdana",
                              fontStyle: "normal",
                              fontWeight: 400,
                              fontSize: "10px",
                              lineHeight: "22px",
                              textAlign: "center",
                              letterSpacing: "-0.02em",
                              color: "#000000",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis"
                            }}
                          >
                            {selectedProduct.name}
                            {/* {maxillaryTeeth && maxillaryTeeth.length > 0 && (
                              <>
                                {"  |  "}
                                <span>
                                  {maxillaryTeeth.length === 1
                                    ? `#${maxillaryTeeth[0]}`
                                    : maxillaryTeeth
                                      .slice()
                                      .sort((a, b) => a - b)
                                      .map((num) => `#${num}`)
                                      .join(", ")}
                                </span>
                              </>
                            )} */}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Dental Chart - Outside Card */}
                    <div className="rounded-lg p-3 flex items-center justify-center">
                      <MaxillaryTeethSVG
                        key={`maxillary-${maxillaryTeeth.join('-')}`}
                        selectedTeeth={maxillaryTeeth}
                        onToothClick={handleMaxillaryToothToggle}
                        className="max-w-full"
                      />
                    </div>

                    {/* Missing Teeth Cards - Show first for Fixed Restoration */}
                    {selectedProduct && !missingTeethCardClicked && (
                      <div className="w-full">
                        <MissingTeethCards
                          type="maxillary"
                          selectedTeeth={maxillaryTeeth}
                          missingTeeth={[]}
                          extractedTeeth={[]}
                          willExtractTeeth={[]}
                          onAllTeethMissing={() => { }}
                          onTeethInMouthClick={handleMissingTeethCardClick}
                          onMissingTeethClick={handleMissingTeethCardClick}
                          onWillExtractClick={handleMissingTeethCardClick}
                          isCaseSubmitted={false}
                          showTeethInMouth={true}
                          showMissingTeeth={true}
                          showWillExtract={true}
                          onExtractionTypeSelect={(extractionType) => {
                            // When any extraction type is selected, show the product accordion
                            if (extractionType) {
                              handleMissingTeethCardClick()
                            }
                          }}
                          onTeethSelectionChange={(teeth) => {
                            // Update maxillary teeth when selection changes
                            setMaxillaryTeeth(teeth)
                          }}
                        />
                      </div>
                    )}

                    {/* Summary Card - Single card for all selected teeth */}
                    {maxillaryTeeth.length > 0 && (!isFixedRestoration || missingTeethCardClicked) && (
                      <Card className="overflow-hidden border border-gray-200 shadow-sm">
                        <Accordion
                          type="single"
                          collapsible
                          className="w-full"
                          value={openAccordion === "maxillary-card" ? "maxillary-card" : ""}
                          onValueChange={handleAccordionChange}
                        >
                          <AccordionItem value="maxillary-card" className="border-0">
                            {/* Header */}
                            <div
                              className="w-full"
                              style={{
                                position: 'relative',
                                height: '69.92px',
                                background: openAccordion === "maxillary-card" ? '#DFEEFB' : '#F5F5F5',
                                boxShadow: '0.9px 0.9px 3.6px rgba(0, 0, 0, 0.25)',
                                borderRadius: openAccordion === "maxillary-card" ? '5.4px 5.4px 0px 0px' : '5.4px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                padding: '14px 8px',
                                gap: '10px'
                              }}
                            >
                              <AccordionTrigger
                                className="hover:no-underline w-full group"
                                style={{
                                  padding: '0px',
                                  gap: '10px',
                                  width: '100%',
                                  height: '100%',
                                  background: 'transparent',
                                  boxShadow: 'none',
                                  borderRadius: '0px'
                                }}
                              >
                                {/* Frame 2395 */}
                                <div style={{ width: '697.74px', height: '42.69px', flex: 'none', order: 0, flexGrow: 0, position: 'relative' }}>
                                  {/* Frame 2388 */}
                                  <div style={{ position: 'absolute', width: '639.14px', height: '42.69px', left: '0px', top: '0px' }}>
                                    {/* Product Image */}
                                    <div
                                      style={{
                                        position: 'absolute',
                                        width: '64.04px',
                                        height: '42.69px',
                                        left: '0px',
                                        top: '0px',
                                        background: `url(${selectedProduct?.image_url || "/images/tooth-icon.png"}), #FFFFFF`,
                                        backgroundSize: 'contain',
                                        backgroundPosition: 'center',
                                        backgroundRepeat: 'no-repeat',
                                        borderRadius: '5.4px'
                                      }}
                                    />

                                    {/* Frame 2387 - Content Area */}
                                    <div style={{ position: 'absolute', width: '565.1px', height: '42px', left: '74.04px', top: '0.34px' }}>
                                      {/* Group 1433 - Tooth Numbers */}
                                      <div style={{ position: 'absolute', width: 'auto', height: '20px', left: '0px', top: '0px' }}>
                                        <span
                                          style={{
                                            fontFamily: 'Verdana',
                                            fontStyle: 'normal',
                                            fontWeight: 400,
                                            fontSize: '14.4px',
                                            lineHeight: '20px',
                                            letterSpacing: '-0.02em',
                                            color: '#000000'
                                          }}
                                        >
                                          {(() => {
                                            const sortedTeeth = [...maxillaryTeeth].sort((a, b) => a - b);
                                            return sortedTeeth.length > 0 ? sortedTeeth.join(', ') : '';
                                          })()}
                                        </span>
                                      </div>

                                      {/* Frame 2386 - Badges and Info Row */}
                                      <div style={{ position: 'absolute', width: '565.1px', height: '22px', left: '0px', top: '20px', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px', gap: '5px' }}>
                                        {/* Badge - Category */}
                                        {selectedCategory && (
                                          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 10px', gap: '10px', width: 'fit-content', height: '17px', background: '#F9F9F9', boxShadow: '1px 1px 3.5px rgba(0, 0, 0, 0.25)', borderRadius: '6px', flex: 'none', order: 0, flexGrow: 0 }}>
                                            <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', flex: 'none', order: 0, flexGrow: 0, whiteSpace: 'nowrap' }}>{selectedCategory}</span>
                                          </div>
                                        )}

                                        {/* Badge - Subcategory */}
                                        {selectedSubcategory && (
                                          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 10px', gap: '10px', width: 'fit-content', height: '17px', background: '#F9F9F9', boxShadow: '1px 1px 3.5px rgba(0, 0, 0, 0.25)', borderRadius: '6px', flex: 'none', order: 1, flexGrow: 0 }}>
                                            <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', flex: 'none', order: 0, flexGrow: 0, whiteSpace: 'nowrap' }}>{selectedSubcategory}</span>
                                          </div>
                                        )}

                                        {/* Est days */}
                                        <span style={{ width: 'auto', height: '22px', fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', letterSpacing: '-0.02em', color: '#B4B0B0', flex: 'none', order: 4, flexGrow: 0 }}>
                                          Est days: {selectedProduct?.estimated_days || 10} work days after submission
                                        </span>

                                        {/* Trash Icon */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleClearCurrentProduct()
                                          }}
                                          className="hover:text-red-600 transition-colors"
                                          style={{
                                            width: '16px',
                                            height: '16px',
                                            color: '#999999',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            flex: 'none',
                                            order: 5,
                                            flexGrow: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}
                                        >
                                          <Trash2 className="w-full h-full" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Chevron - Positioned relative to header */}
                                <div style={{ position: 'absolute', width: '21.6px', height: '21.6px', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                                  <ChevronDown
                                    className="w-full h-full transition-transform duration-200 text-black"
                                    style={{
                                      transform: openAccordion === "maxillary-card" ? 'rotate(0deg)' : 'rotate(-180deg)'
                                    }}
                                  />
                                </div>
                              </AccordionTrigger>
                            </div>
                            <AccordionContent className="pt-0" style={{ position: 'relative', minHeight: 'auto' }}>
                              {/* Summary detail */}
                              <div
                                className="bg-white w-full"
                                style={{
                                  position: 'relative',
                                  height: 'auto',
                                  minHeight: 'auto',
                                  paddingLeft: '15.87px',
                                  paddingRight: '15.87px',
                                  paddingBottom: '20px',
                                  paddingTop: '20px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'flex-start',
                                  gap: '20px',
                                  background: '#FFFFFF',
                                  boxSizing: 'border-box'
                                }}
                              >
                                {/* Row 1: Product - Material and Retention Type */}
                                <div
                                  className="flex flex-col sm:flex-row flex-wrap gap-5"
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    padding: '0px',
                                    gap: '20px',
                                    flex: 'none',
                                    order: 0,
                                    alignSelf: 'stretch',
                                    flexGrow: 0
                                  }}
                                >
                                  {/* Product - Material */}
                                  <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
                                    <div
                                      className="flex items-center"
                                      style={{
                                        padding: '12px 39px 5px 15px',
                                        gap: '5px',
                                        width: '100%',
                                        height: '37px',
                                        position: 'relative',
                                        marginTop: '5.27px',
                                        background: '#FFFFFF',
                                        border: '0.740384px solid #7F7F7F',
                                        borderRadius: '7.7px',
                                        boxSizing: 'border-box'
                                      }}
                                    >
                                      <span style={{
                                        fontFamily: 'Verdana',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14.4px',
                                        lineHeight: '20px',
                                        letterSpacing: '-0.02em',
                                        color: '#000000',
                                        whiteSpace: 'nowrap'
                                      }}>{maxillaryMaterial || 'Not specified'}</span>
                                    </div>
                                    <label
                                      className="absolute bg-white"
                                      style={{
                                        padding: '0px',
                                        height: '14px',
                                        left: '8.9px',
                                        top: '0px',
                                        fontFamily: 'Arial',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14px',
                                        lineHeight: '14px',
                                        color: '#7F7F7F'
                                      }}
                                    >
                                      Product - Material
                                    </label>
                                  </div>

                                  {/* Retention Type */}
                                  <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
                                    <div
                                      className="flex items-center"
                                      style={{
                                        padding: '12px 39px 5px 15px',
                                        gap: '5px',
                                        width: '100%',
                                        height: '37px',
                                        position: 'relative',
                                        marginTop: '5.27px',
                                        background: '#FFFFFF',
                                        border: '0.740384px solid #7F7F7F',
                                        borderRadius: '7.7px',
                                        boxSizing: 'border-box'
                                      }}
                                    >
                                      <span style={{
                                        fontFamily: 'Arial',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14px',
                                        lineHeight: '14px',
                                        color: '#000000',
                                        whiteSpace: 'nowrap'
                                      }}>{maxillaryRetention || 'Not specified'}</span>
                                    </div>
                                    <label
                                      className="absolute bg-white"
                                      style={{
                                        padding: '0px',
                                        height: '14px',
                                        left: '9.23px',
                                        top: '0px',
                                        fontFamily: 'Arial',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14px',
                                        lineHeight: '14px',
                                        color: '#7F7F7F'
                                      }}
                                    >
                                      Select Retention type
                                    </label>
                                  </div>
                                </div>

                                {/* Row 2: Stump Shade, Tooth Shade, Stage */}
                                <div
                                  className="flex flex-col sm:flex-row flex-wrap gap-5"
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    padding: '0px',
                                    gap: '20px',
                                    flex: 'none',
                                    order: 1,
                                    alignSelf: 'stretch',
                                    flexGrow: 0
                                  }}
                                >
                                  {/* Stump Shade */}
                                  <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                    <div
                                      className="flex items-center justify-between"
                                      style={{
                                        padding: '12px 39px 5px 15px',
                                        gap: '5px',
                                        width: '100%',
                                        height: '37px',
                                        background: '#FFFFFF',
                                        border: '0.740384px solid #7F7F7F',
                                        borderRadius: '7.7px',
                                        boxSizing: 'border-box',
                                        position: 'relative',
                                        marginTop: '5.27px'
                                      }}
                                    >
                                      <span style={{
                                        fontFamily: 'Verdana',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14.4px',
                                        lineHeight: '20px',
                                        letterSpacing: '-0.02em',
                                        color: '#000000'
                                      }}>{maxillaryStumpShade ? 'Vita 3D Master' : 'Not specified'}</span>
                                      {maxillaryStumpShade && (
                                        <div
                                          className="flex items-center justify-center"
                                          style={{
                                            width: '37.51px',
                                            height: '41.97px',
                                            background: 'linear-gradient(0deg, #DED2C7 0.05%, #E3D4C4 7.04%, #EDD9C1 25.04%, #F0DBC0 50.02%, #F0DCC2 76.01%, #F1E0CA 90%, #F3E7D7 100%)',
                                            borderRadius: '8px',
                                            position: 'absolute',
                                            right: '0px',
                                            top: '-1px'
                                          }}
                                        >
                                          <span style={{
                                            fontFamily: 'Verdana',
                                            fontStyle: 'normal',
                                            fontWeight: 400,
                                            fontSize: '12.8603px',
                                            lineHeight: '18px',
                                            letterSpacing: '-0.02em',
                                            color: '#000000'
                                          }}>{maxillaryStumpShade}</span>
                                        </div>
                                      )}
                                    </div>
                                    <label
                                      className="absolute bg-white"
                                      style={{
                                        padding: '0px',
                                        height: '14px',
                                        left: '8.9px',
                                        top: '0px',
                                        fontFamily: 'Arial',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14px',
                                        lineHeight: '14px',
                                        color: '#7F7F7F'
                                      }}
                                    >
                                      Stump Shade
                                    </label>
                                  </div>

                                  {/* Tooth Shade */}
                                  <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                    <div
                                      className="flex items-center justify-between"
                                      style={{
                                        padding: '12px 39px 5px 15px',
                                        gap: '5px',
                                        width: '100%',
                                        height: '37px',
                                        background: '#FFFFFF',
                                        border: '0.740384px solid #7F7F7F',
                                        borderRadius: '7.7px',
                                        boxSizing: 'border-box',
                                        position: 'relative',
                                        marginTop: '5.27px'
                                      }}
                                    >
                                      <span style={{
                                        fontFamily: 'Verdana',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14.4px',
                                        lineHeight: '20px',
                                        letterSpacing: '-0.02em',
                                        color: '#000000'
                                      }}>Vita 3D Master</span>
                                      <div
                                        className="flex items-center justify-center"
                                        style={{
                                          width: '37.51px',
                                          height: '41.97px',
                                          background: 'linear-gradient(0deg, #DED2C7 0.05%, #E3D4C4 7.04%, #EDD9C1 25.04%, #F0DBC0 50.02%, #F0DCC2 76.01%, #F1E0CA 90%, #F3E7D7 100%)',
                                          borderRadius: '8px',
                                          position: 'absolute',
                                          right: '0px',
                                          top: '-1px'
                                        }}
                                      >
                                        <span style={{
                                          fontFamily: 'Verdana',
                                          fontStyle: 'normal',
                                          fontWeight: 400,
                                          fontSize: '12.8603px',
                                          lineHeight: '18px',
                                          letterSpacing: '-0.02em',
                                          color: '#000000'
                                        }}>A2</span>
                                      </div>
                                    </div>
                                    <label
                                      className="absolute bg-white"
                                      style={{
                                        padding: '0px',
                                        height: '14px',
                                        left: '8.9px',
                                        top: '0px',
                                        fontFamily: 'Arial',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14px',
                                        lineHeight: '14px',
                                        color: '#7F7F7F'
                                      }}
                                    >
                                      Tooth Shade
                                    </label>
                                  </div>

                                  {/* Stage */}
                                  <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                    <div
                                      className="flex items-center"
                                      style={{
                                        padding: '12px 39px 5px 15px',
                                        gap: '5px',
                                        width: '100%',
                                        height: '37px',
                                        position: 'relative',
                                        marginTop: '5.27px',
                                        background: '#FFFFFF',
                                        border: '0.740384px solid #7F7F7F',
                                        borderRadius: '7.7px',
                                        boxSizing: 'border-box'
                                      }}
                                    >
                                      <span style={{
                                        fontFamily: 'Verdana',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14.4px',
                                        lineHeight: '20px',
                                        letterSpacing: '-0.02em',
                                        color: '#000000'
                                      }}>Finish</span>
                                    </div>
                                    <label
                                      className="absolute bg-white"
                                      style={{
                                        padding: '0px',
                                        height: '14px',
                                        left: '8.9px',
                                        top: '0px',
                                        fontFamily: 'Arial',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14px',
                                        lineHeight: '14px',
                                        color: '#7F7F7F'
                                      }}
                                    >
                                      Stage
                                    </label>
                                  </div>
                                </div>

                                {/* Row 3: Teeth Selection Display */}
                                <div
                                  className="flex flex-col sm:flex-row flex-wrap gap-5"
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    padding: '0px',
                                    gap: '20px',
                                    flex: 'none',
                                    order: 2,
                                    alignSelf: 'stretch',
                                    flexGrow: 0
                                  }}
                                >
                                  {/* Teeth Selection */}
                                  <div className="relative flex-1 min-w-[250px] max-w-[100%]" style={{ minHeight: '43px' }}>
                                    <div
                                      className="flex items-center"
                                      style={{
                                        padding: '12px 15px 5px 15px',
                                        gap: '5px',
                                        width: '100%',
                                        height: '37px',
                                        background: '#FFFFFF',
                                        border: '0.740384px solid #7F7F7F',
                                        borderRadius: '7.7px',
                                        boxSizing: 'border-box',
                                        position: 'relative',
                                        marginTop: '5.27px'
                                      }}
                                    >
                                      <span style={{
                                        fontFamily: 'Verdana',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14.4px',
                                        lineHeight: '20px',
                                        letterSpacing: '-0.02em',
                                        color: '#000000'
                                      }}>
                                        {(() => {
                                          const sortedTeeth = [...maxillaryTeeth].sort((a, b) => a - b);
                                          return sortedTeeth.length === 1
                                            ? `#${sortedTeeth[0]}`
                                            : sortedTeeth.length > 0
                                              ? `#${sortedTeeth.join(", #")}`
                                              : "No teeth selected";
                                        })()}
                                      </span>
                                    </div>
                                    <label
                                      className="absolute bg-white"
                                      style={{
                                        padding: '0px',
                                        height: '14px',
                                        left: '8.9px',
                                        top: '0px',
                                        fontFamily: 'Arial',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14px',
                                        lineHeight: '14px',
                                        color: '#7F7F7F'
                                      }}
                                    >
                                      Selected Teeth
                                    </label>
                                  </div>
                                </div>

                                {/* Notes if available */}
                                {maxillaryNotes && (
                                  <div
                                    className="flex flex-col sm:flex-row flex-wrap gap-5"
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'row',
                                      alignItems: 'flex-start',
                                      padding: '0px',
                                      gap: '20px',
                                      flex: 'none',
                                      order: 3,
                                      alignSelf: 'stretch',
                                      flexGrow: 0
                                    }}
                                  >
                                    <div className="relative flex-1 min-w-[250px] max-w-[100%]" style={{ minHeight: '43px' }}>
                                      <div
                                        className="flex items-start"
                                        style={{
                                          padding: '12px 15px 5px 15px',
                                          gap: '5px',
                                          width: '100%',
                                          minHeight: '60px',
                                          background: '#FFFFFF',
                                          border: '0.740384px solid #7F7F7F',
                                          borderRadius: '7.7px',
                                          boxSizing: 'border-box',
                                          position: 'relative',
                                          marginTop: '5.27px'
                                        }}
                                      >
                                        <span style={{
                                          fontFamily: 'Verdana',
                                          fontStyle: 'normal',
                                          fontWeight: 400,
                                          fontSize: '14.4px',
                                          lineHeight: '20px',
                                          letterSpacing: '-0.02em',
                                          color: '#000000'
                                        }}>{maxillaryNotes}</span>
                                      </div>
                                      <label
                                        className="absolute bg-white"
                                        style={{
                                          padding: '0px',
                                          height: '14px',
                                          left: '8.9px',
                                          top: '0px',
                                          fontFamily: 'Arial',
                                          fontStyle: 'normal',
                                          fontWeight: 400,
                                          fontSize: '14px',
                                          lineHeight: '14px',
                                          color: '#7F7F7F'
                                        }}
                                      >
                                        Notes
                                      </label>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div
                                className="flex flex-wrap justify-center items-center w-full"
                                style={{
                                  gap: '7.03px',
                                  position: 'relative',
                                  marginTop: '30px',
                                  marginBottom: '15px'
                                }}
                              >
                                {/* Deliver product first - Only show if multiple products */}
                                {savedProducts.length > 1 && (
                                  <button
                                    className="relative flex flex-col items-center justify-center"
                                    style={{
                                      width: '123.04px',
                                      height: '46.22px',
                                      background: '#F9F9F9',
                                      boxShadow: '0.878154px 0.878154px 3.07354px rgba(0, 0, 0, 0.25)',
                                      borderRadius: '5.26893px',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: '0'
                                    }}
                                  >
                                    <div
                                      className="absolute"
                                      style={{
                                        width: '13.91px',
                                        height: '13.91px',
                                        left: '50%',
                                        top: '9.2px',
                                        transform: 'translateX(-50%)',
                                        background: '#FFFFFF',
                                        border: '1.15951px solid #1162A8',
                                        borderRadius: '1.73926px'
                                      }}
                                    />
                                    <span
                                      className="absolute text-center"
                                      style={{
                                        width: '85px',
                                        height: '20px',
                                        left: '50%',
                                        top: '23.11px',
                                        transform: 'translateX(-50%)',
                                        fontFamily: 'Verdana',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '8.78154px',
                                        lineHeight: '19px',
                                        textAlign: 'center',
                                        letterSpacing: '-0.02em',
                                        color: '#000000'
                                      }}
                                    >
                                      Deliver product first
                                    </span>
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    // Only proceed if we have a valid selectedProduct with an ID
                                    if (!selectedProduct || !selectedProduct.id) {
                                      console.error("Cannot open add-ons modal: No product selected")
                                      return
                                    }
                                    
                                    // For card accordion, use selectedProduct and determine arch from context
                                    const arch = maxillaryTeeth.length > 0 ? "maxillary" : "mandibular"
                                    // Create a temporary saved product structure for the modal
                                    const tempProduct: SavedProduct = {
                                      id: selectedProduct.id.toString(),
                                      product: selectedProduct,
                                      productDetails: productDetails,
                                      category: selectedCategory || "",
                                      categoryId: selectedCategoryId || 0,
                                      subcategory: selectedSubcategory || "",
                                      subcategoryId: selectedSubcategoryId || 0,
                                      maxillaryTeeth: maxillaryTeeth,
                                      mandibularTeeth: mandibularTeeth,
                                      maxillaryMaterial: maxillaryMaterial,
                                      maxillaryStumpShade: maxillaryStumpShade,
                                      maxillaryRetention: maxillaryRetention,
                                      maxillaryNotes: maxillaryNotes,
                                      mandibularMaterial: mandibularMaterial,
                                      mandibularRetention: mandibularRetention,
                                      mandibularImplantDetails: mandibularImplantDetails,
                                      createdAt: Date.now(),
                                      addedFrom: arch,
                                    }
                                    console.log(`🔘 Opening Add Ons Modal for product ID: ${selectedProduct.id}, arch: ${arch}`)
                                    setCurrentProductForModal(tempProduct)
                                    setCurrentArchForModal(arch)
                                    setShowAddOnsModal(true)
                                  }}
                                  className="relative flex flex-col items-center justify-center"
                                  style={{
                                    width: '123.04px',
                                    height: '46.22px',
                                    background: '#F9F9F9',
                                    boxShadow: '0.878154px 0.878154px 3.07354px rgba(0, 0, 0, 0.25)',
                                    borderRadius: '5.26893px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0'
                                  }}
                                >
                                  <span
                                    className="absolute text-center"
                                    style={{
                                      width: '41.8px',
                                      height: '20px',
                                      left: '50%',
                                      top: '3.79px',
                                      transform: 'translateX(-50%)',
                                      fontFamily: 'Verdana',
                                      fontStyle: 'normal',
                                      fontWeight: 400,
                                      fontSize: '8.78154px',
                                      lineHeight: '19px',
                                      textAlign: 'center',
                                      letterSpacing: '-0.02em',
                                      color: '#000000'
                                    }}
                                  >
                                    +
                                  </span>
                                  <span
                                    className="absolute text-center"
                                    style={{
                                      width: '89px',
                                      height: '20px',
                                      left: '50%',
                                      top: '23.11px',
                                      transform: 'translateX(-50%)',
                                      fontFamily: 'Verdana',
                                      fontStyle: 'normal',
                                      fontWeight: 400,
                                      fontSize: '8.78154px',
                                      lineHeight: '19px',
                                      textAlign: 'center',
                                      letterSpacing: '-0.02em',
                                      color: '#000000'
                                    }}
                                  >
                                    Add ons (3 selected)
                                  </span>
                                </button>
                                <button
                                  onClick={() => {
                                    setShowAttachModal(true)
                                  }}
                                  className="relative flex flex-col items-center justify-center"
                                  style={{
                                    width: '123.04px',
                                    height: '46.22px',
                                    background: '#F9F9F9',
                                    boxShadow: '0.878154px 0.878154px 3.07354px rgba(0, 0, 0, 0.25)',
                                    borderRadius: '5.26893px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0'
                                  }}
                                >
                                  <Paperclip
                                    className="absolute"
                                    style={{
                                      width: '8.78px',
                                      height: '10.54px',
                                      left: '50%',
                                      top: '9.34px',
                                      transform: 'translateX(-50%)',
                                      color: '#1E1E1E',
                                      strokeWidth: '0.878154px'
                                    }}
                                  />
                                  <span
                                    className="absolute text-center"
                                    style={{
                                      width: '107px',
                                      height: '20px',
                                      left: '50%',
                                      top: '23.11px',
                                      transform: 'translateX(-50%)',
                                      fontFamily: 'Verdana',
                                      fontStyle: 'normal',
                                      fontWeight: 400,
                                      fontSize: '8.78154px',
                                      lineHeight: '19px',
                                      textAlign: 'center',
                                      letterSpacing: '-0.02em',
                                      color: '#000000'
                                    }}
                                  >
                                    Attach Files (15 uploads)
                                  </span>
                                </button>
                                <button
                                  onClick={() => {
                                    // For card accordion, create temp product for rush modal
                                    const tempProduct: SavedProduct = {
                                      id: selectedProduct?.id?.toString() || `temp-${Date.now()}`,
                                      product: selectedProduct || { id: 0, name: "Product", price: 0 },
                                      productDetails: productDetails,
                                      category: selectedCategory || "",
                                      categoryId: selectedCategoryId || 0,
                                      subcategory: selectedSubcategory || "",
                                      subcategoryId: selectedSubcategoryId || 0,
                                      maxillaryTeeth: maxillaryTeeth,
                                      mandibularTeeth: mandibularTeeth,
                                      maxillaryMaterial: maxillaryMaterial,
                                      maxillaryStumpShade: maxillaryStumpShade,
                                      maxillaryRetention: maxillaryRetention,
                                      maxillaryNotes: maxillaryNotes,
                                      mandibularMaterial: mandibularMaterial,
                                      mandibularRetention: mandibularRetention,
                                      mandibularImplantDetails: mandibularImplantDetails,
                                      createdAt: Date.now(),
                                      addedFrom: maxillaryTeeth.length > 0 ? "maxillary" : "mandibular",
                                    }
                                    setCurrentProductForModal(tempProduct)
                                    setShowRushModal(true)
                                  }}
                                  className="relative flex flex-col items-center justify-center"
                                  style={{
                                    width: '123.04px',
                                    height: '46.22px',
                                    background: '#F9F9F9',
                                    boxShadow: '0px 0px 2.89791px rgba(207, 2, 2, 0.67)',
                                    borderRadius: '5.26893px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0'
                                  }}
                                >
                                  <Zap
                                    className="absolute"
                                    style={{
                                      width: '8.78px',
                                      height: '10.54px',
                                      left: '50%',
                                      top: '9.35px',
                                      transform: 'translateX(-50%)',
                                      color: '#CF0202',
                                      fill: '#CF0202',
                                      strokeWidth: '0.878154px'
                                    }}
                                  />
                                  <span
                                    className="absolute text-center"
                                    style={{
                                      width: '59px',
                                      height: '20px',
                                      left: '50%',
                                      top: '23.11px',
                                      transform: 'translateX(-50%)',
                                      fontFamily: 'Verdana',
                                      fontStyle: 'normal',
                                      fontWeight: 400,
                                      fontSize: '8.78154px',
                                      lineHeight: '19px',
                                      textAlign: 'center',
                                      letterSpacing: '-0.02em',
                                      color: '#000000'
                                    }}
                                  >
                                    Request Rush
                                  </span>
                                </button>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </Card>
                    )}

                    {/* Saved Maxillary Products - Display below MAXILLARY section */}
                    {savedProducts.filter(p => p.addedFrom === "maxillary").length > 0 && (
                      <div className="w-full mt-1 space-y-1">
                        {savedProducts
                          .filter(p => p.addedFrom === "maxillary")
                          .map((savedProduct, index) => {
                            const teeth = savedProduct.maxillaryTeeth.sort((a, b) => a - b)
                            const displayTeeth = teeth.length === 1
                              ? `#${teeth[0]}`
                              : teeth.length > 0
                                ? `#${teeth.join(", #")}`
                                : "No teeth selected"

                            return (
                              <Card key={savedProduct.id} className="overflow-hidden border border-gray-200 shadow-sm">
                                <Accordion
                                  type="single"
                                  collapsible
                                  className="w-full"
                                  value={openAccordion === savedProduct.id ? savedProduct.id : ""}
                                  onValueChange={handleAccordionChange}
                                >
                                  <AccordionItem value={savedProduct.id} className="border-0">
                                    {/* Header */}
                                    <div
                                      className="w-full"
                                      style={{
                                        position: 'relative',
                                        height: '69.92px',
                                        background: openAccordion === savedProduct.id ? '#DFEEFB' : '#F5F5F5',
                                        boxShadow: '0.9px 0.9px 3.6px rgba(0, 0, 0, 0.25)',
                                        borderRadius: openAccordion === savedProduct.id ? '5.4px 5.4px 0px 0px' : '5.4px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        padding: '14px 8px',
                                        gap: '10px'
                                      }}
                                    >
                                      <AccordionTrigger
                                        className="hover:no-underline w-full"
                                        style={{
                                          padding: '0px',
                                          gap: '10px',
                                          width: '100%',
                                          height: '100%',
                                          background: 'transparent',
                                          boxShadow: 'none',
                                          borderRadius: '0px'
                                        }}
                                        onClick={() => handleSavedProductCardClick(savedProduct)}
                                      >
                                        {/* Frame 2395 */}
                                        <div style={{ width: '697.74px', height: '42.69px', flex: 'none', order: 0, flexGrow: 0, position: 'relative' }}>
                                          {/* Frame 2388 */}
                                          <div style={{ position: 'absolute', width: '639.14px', height: '42.69px', left: '0px', top: '0px' }}>
                                            {/* Product Image */}
                                            <div
                                              style={{
                                                position: 'absolute',
                                                width: '64.04px',
                                                height: '42.69px',
                                                left: '0px',
                                                top: '0px',
                                                background: '#F5F5F5',
                                                borderRadius: '5.4px',
                                                overflow: 'hidden',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                              }}
                                            >
                                              <img
                                                src={savedProduct.product.image_url || "/images/product-default.png"}
                                                alt={savedProduct.product.name}
                                                style={{
                                                  width: '100%',
                                                  height: '100%',
                                                  objectFit: 'contain'
                                                }}
                                                onError={(e) => {
                                                  const target = e.target as HTMLImageElement
                                                  if (target.src !== window.location.origin + "/images/product-default.png") {
                                                    target.src = "/images/product-default.png"
                                                  }
                                                }}
                                              />
                                            </div>

                                            {/* Frame 2387 - Content Area */}
                                            <div style={{ position: 'absolute', width: '565.1px', height: '42px', left: '74.04px', top: '0.34px' }}>
                                              {/* Group 1433 - Tooth Numbers */}
                                              <div style={{ position: 'absolute', width: 'auto', height: '20px', left: '0px', top: '0px' }}>
                                                <span
                                                  style={{
                                                    fontFamily: 'Verdana',
                                                    fontStyle: 'normal',
                                                    fontWeight: 400,
                                                    fontSize: '14.4px',
                                                    lineHeight: '20px',
                                                    letterSpacing: '-0.02em',
                                                    color: '#000000'
                                                  }}
                                                >
                                                  {teeth.length > 0 ? teeth.join(', ') : ''}
                                                </span>
                                              </div>

                                              {/* Frame 2386 - Badges and Info Row */}
                                              <div style={{ position: 'absolute', width: '565.1px', height: '22px', left: '0px', top: '20px', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px', gap: '5px' }}>
                                                {/* Badge - Category */}
                                                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 10px', gap: '10px', width: 'fit-content', height: '17px', background: '#F9F9F9', boxShadow: '1px 1px 3.5px rgba(0, 0, 0, 0.25)', borderRadius: '6px', flex: 'none', order: 0, flexGrow: 0 }}>
                                                  <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', flex: 'none', order: 0, flexGrow: 0 }}>{savedProduct.category}</span>
                                                </div>

                                                {/* Badge - Subcategory */}
                                                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 10px', gap: '10px', width: 'fit-content', height: '17px', background: '#F9F9F9', boxShadow: '1px 1px 3.5px rgba(0, 0, 0, 0.25)', borderRadius: '6px', flex: 'none', order: 1, flexGrow: 0 }}>
                                                  <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', flex: 'none', order: 0, flexGrow: 0 }}>{savedProduct.subcategory}</span>
                                                </div>

                                                {/* Est days */}
                                                <span style={{ width: 'auto', height: '22px', fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', letterSpacing: '-0.02em', color: '#B4B0B0', flex: 'none', order: 4, flexGrow: 0 }}>
                                                  Est days: {savedProduct.product.estimated_days || 10} work days after submission
                                                </span>

                                                {/* Trash Icon */}
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDeleteProduct(savedProduct.id)
                                                  }}
                                                  className="hover:text-red-600 transition-colors"
                                                  style={{
                                                    width: '16px',
                                                    height: '16px',
                                                    color: '#999999',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    flex: 'none',
                                                    order: 5,
                                                    flexGrow: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                  }}
                                                >
                                                  <Trash2 className="w-full h-full" />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Chevron - Positioned relative to header */}
                                        <div style={{ position: 'absolute', width: '21.6px', height: '21.6px', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                                          <ChevronDown
                                            className="w-full h-full transition-transform duration-200 text-black"
                                            style={{
                                              transform: openAccordion === savedProduct.id ? 'rotate(0deg)' : 'rotate(-180deg)'
                                            }}
                                          />
                                        </div>
                                      </AccordionTrigger>
                                    </div>

                                    <AccordionContent className="pt-0" style={{ position: 'relative', minHeight: 'auto' }}>
                                      {/* Summary detail - Same structure as current product accordion */}
                                      <div
                                        className="bg-white w-full"
                                        style={{
                                          position: 'relative',
                                          height: 'auto',
                                          minHeight: 'auto',
                                          marginTop: '75px',
                                          paddingLeft: '15.87px',
                                          paddingRight: '15.87px',
                                          paddingBottom: '20px',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'flex-start',
                                          gap: '20px',
                                          background: '#FFFFFF',
                                          boxSizing: 'border-box'
                                        }}
                                      >
                                        {/* Row 1: Product - Material and Retention Type */}
                                        <div
                                          className="flex flex-col sm:flex-row flex-wrap gap-5"
                                          style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignItems: 'flex-start',
                                            padding: '0px',
                                            gap: '20px',
                                            flex: 'none',
                                            order: 0,
                                            alignSelf: 'stretch',
                                            flexGrow: 0
                                          }}
                                        >
                                          {/* Product - Material */}
                                          <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center"
                                              style={{
                                                padding: '12px 39px 5px 15px',
                                                gap: '5px',
                                                width: '100%',
                                                height: '37px',
                                                position: 'relative',
                                                marginTop: '5.27px',
                                                background: '#FFFFFF',
                                                border: '0.740384px solid #7F7F7F',
                                                borderRadius: '7.7px',
                                                boxSizing: 'border-box'
                                              }}
                                            >
                                              <span style={{
                                                fontFamily: 'Verdana',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14.4px',
                                                lineHeight: '20px',
                                                letterSpacing: '-0.02em',
                                                color: '#000000',
                                                whiteSpace: 'nowrap'
                                              }}>{savedProduct.maxillaryMaterial || 'Not specified'}</span>
                                            </div>
                                            <label
                                              className="absolute bg-white"
                                              style={{
                                                padding: '0px',
                                                height: '14px',
                                                left: '8.9px',
                                                top: '0px',
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#7F7F7F'
                                              }}
                                            >
                                              Product - Material
                                            </label>
                                          </div>

                                          {/* Retention Type */}
                                          <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center"
                                              style={{
                                                padding: '12px 39px 5px 15px',
                                                gap: '5px',
                                                width: '100%',
                                                height: '37px',
                                                position: 'relative',
                                                marginTop: '5.27px',
                                                background: '#FFFFFF',
                                                border: '0.740384px solid #7F7F7F',
                                                borderRadius: '7.7px',
                                                boxSizing: 'border-box'
                                              }}
                                            >
                                              <span style={{
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#000000',
                                                whiteSpace: 'nowrap'
                                              }}>{savedProduct.maxillaryRetention || 'Not specified'}</span>
                                            </div>
                                            <label
                                              className="absolute bg-white"
                                              style={{
                                                padding: '0px',
                                                height: '14px',
                                                left: '9.23px',
                                                top: '0px',
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#7F7F7F'
                                              }}
                                            >
                                              Select Retention type
                                            </label>
                                          </div>
                                        </div>

                                        {/* Row 2: Stump Shade, Tooth Shade, Stage */}
                                        <div
                                          className="flex flex-col sm:flex-row flex-wrap gap-5"
                                          style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignItems: 'flex-start',
                                            padding: '0px',
                                            gap: '20px',
                                            flex: 'none',
                                            order: 1,
                                            alignSelf: 'stretch',
                                            flexGrow: 0
                                          }}
                                        >
                                          {/* Stump Shade */}
                                          <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center justify-between"
                                              style={{
                                                padding: '12px 39px 5px 15px',
                                                gap: '5px',
                                                width: '100%',
                                                height: '37px',
                                                background: '#FFFFFF',
                                                border: '0.740384px solid #7F7F7F',
                                                borderRadius: '7.7px',
                                                boxSizing: 'border-box',
                                                position: 'relative',
                                                marginTop: '5.27px'
                                              }}
                                            >
                                              <span style={{
                                                fontFamily: 'Verdana',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14.4px',
                                                lineHeight: '20px',
                                                letterSpacing: '-0.02em',
                                                color: '#000000'
                                              }}>{savedProduct.maxillaryStumpShade || 'Not specified'}</span>
                                              {savedProduct.maxillaryStumpShade && (
                                                <div
                                                  className="flex items-center justify-center"
                                                  style={{
                                                    width: '37.51px',
                                                    height: '41.97px',
                                                    background: 'linear-gradient(0deg, #DED2C7 0.05%, #E3D4C4 7.04%, #EDD9C1 25.04%, #F0DBC0 50.02%, #F0DCC2 76.01%, #F1E0CA 90%, #F3E7D7 100%)',
                                                    borderRadius: '8px',
                                                    position: 'absolute',
                                                    right: '0px',
                                                    top: '-1px'
                                                  }}
                                                >
                                                  <span style={{
                                                    fontFamily: 'Verdana',
                                                    fontStyle: 'normal',
                                                    fontWeight: 400,
                                                    fontSize: '12.8603px',
                                                    lineHeight: '18px',
                                                    letterSpacing: '-0.02em',
                                                    color: '#000000'
                                                  }}>{savedProduct.maxillaryStumpShade}</span>
                                                </div>
                                              )}
                                            </div>
                                            <label
                                              className="absolute bg-white"
                                              style={{
                                                padding: '0px',
                                                height: '14px',
                                                left: '8.9px',
                                                top: '0px',
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#7F7F7F'
                                              }}
                                            >
                                              Stump Shade
                                            </label>
                                          </div>

                                          {/* Tooth Shade */}
                                          <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center justify-between"
                                              style={{
                                                padding: '12px 39px 5px 15px',
                                                gap: '5px',
                                                width: '100%',
                                                height: '37px',
                                                background: '#FFFFFF',
                                                border: '0.740384px solid #7F7F7F',
                                                borderRadius: '7.7px',
                                                boxSizing: 'border-box',
                                                position: 'relative',
                                                marginTop: '5.27px'
                                              }}
                                            >
                                              <span style={{
                                                fontFamily: 'Verdana',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14.4px',
                                                lineHeight: '20px',
                                                letterSpacing: '-0.02em',
                                                color: '#000000'
                                              }}>Not specified</span>
                                            </div>
                                            <label
                                              className="absolute bg-white"
                                              style={{
                                                padding: '0px',
                                                height: '14px',
                                                left: '8.9px',
                                                top: '0px',
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#7F7F7F'
                                              }}
                                            >
                                              Tooth Shade
                                            </label>
                                          </div>

                                          {/* Stage */}
                                          <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center"
                                              style={{
                                                padding: '12px 39px 5px 15px',
                                                gap: '5px',
                                                width: '100%',
                                                height: '37px',
                                                position: 'relative',
                                                marginTop: '5.27px',
                                                background: '#FFFFFF',
                                                border: '0.740384px solid #7F7F7F',
                                                borderRadius: '7.7px',
                                                boxSizing: 'border-box'
                                              }}
                                            >
                                              <span style={{
                                                fontFamily: 'Verdana',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14.4px',
                                                lineHeight: '20px',
                                                letterSpacing: '-0.02em',
                                                color: '#000000'
                                              }}>Finish</span>
                                            </div>
                                            <label
                                              className="absolute bg-white"
                                              style={{
                                                padding: '0px',
                                                height: '14px',
                                                left: '8.9px',
                                                top: '0px',
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#7F7F7F'
                                              }}
                                            >
                                              Stage
                                            </label>
                                          </div>
                                        </div>

                                        {/* Row 3: Teeth Selection Display */}
                                        <div
                                          className="flex flex-col sm:flex-row flex-wrap gap-5"
                                          style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignItems: 'flex-start',
                                            padding: '0px',
                                            gap: '20px',
                                            flex: 'none',
                                            order: 2,
                                            alignSelf: 'stretch',
                                            flexGrow: 0
                                          }}
                                        >
                                          {/* Teeth Selection */}
                                          <div className="relative flex-1 min-w-[250px] max-w-[100%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center"
                                              style={{
                                                padding: '12px 15px 5px 15px',
                                                gap: '5px',
                                                width: '100%',
                                                height: '37px',
                                                background: '#FFFFFF',
                                                border: '0.740384px solid #7F7F7F',
                                                borderRadius: '7.7px',
                                                boxSizing: 'border-box',
                                                position: 'relative',
                                                marginTop: '5.27px'
                                              }}
                                            >
                                              <span style={{
                                                fontFamily: 'Verdana',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14.4px',
                                                lineHeight: '20px',
                                                letterSpacing: '-0.02em',
                                                color: '#000000'
                                              }}>{displayTeeth}</span>
                                            </div>
                                            <label
                                              className="absolute bg-white"
                                              style={{
                                                padding: '0px',
                                                height: '14px',
                                                left: '8.9px',
                                                top: '0px',
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#7F7F7F'
                                              }}
                                            >
                                              Selected Teeth
                                            </label>
                                          </div>
                                        </div>

                                        {/* Notes if available */}
                                        {savedProduct.maxillaryNotes && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 3,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[250px] max-w-[100%]" style={{ minHeight: '43px' }}>
                                              <div
                                                className="flex items-start"
                                                style={{
                                                  padding: '12px 15px 5px 15px',
                                                  gap: '5px',
                                                  width: '100%',
                                                  minHeight: '60px',
                                                  background: '#FFFFFF',
                                                  border: '0.740384px solid #7F7F7F',
                                                  borderRadius: '7.7px',
                                                  boxSizing: 'border-box',
                                                  position: 'relative',
                                                  marginTop: '5.27px'
                                                }}
                                              >
                                                <span style={{
                                                  fontFamily: 'Verdana',
                                                  fontStyle: 'normal',
                                                  fontWeight: 400,
                                                  fontSize: '14.4px',
                                                  lineHeight: '20px',
                                                  letterSpacing: '-0.02em',
                                                  color: '#000000'
                                                }}>{savedProduct.maxillaryNotes}</span>
                                              </div>
                                              <label
                                                className="absolute bg-white"
                                                style={{
                                                  padding: '0px',
                                                  height: '14px',
                                                  left: '8.9px',
                                                  top: '0px',
                                                  fontFamily: 'Arial',
                                                  fontStyle: 'normal',
                                                  fontWeight: 400,
                                                  fontSize: '14px',
                                                  lineHeight: '14px',
                                                  color: '#7F7F7F'
                                                }}
                                              >
                                                Notes
                                              </label>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Action Buttons */}
                                      <div
                                        className="flex flex-wrap justify-center items-center w-full"
                                        style={{
                                          gap: '7.03px',
                                          position: 'relative',
                                          marginTop: '30px',
                                          marginBottom: '15px'
                                        }}
                                      >
                                        {/* Deliver product first - Only show if multiple products */}
                                        {savedProducts.length > 1 && (
                                          <button
                                            className="relative flex flex-col items-center justify-center"
                                            style={{
                                              width: '123.04px',
                                              height: '46.22px',
                                              background: '#F9F9F9',
                                              boxShadow: '0.878154px 0.878154px 3.07354px rgba(0, 0, 0, 0.25)',
                                              borderRadius: '5.26893px',
                                              border: 'none',
                                              cursor: 'pointer',
                                              padding: '0'
                                            }}
                                          >
                                            <div
                                              className="absolute"
                                              style={{
                                                width: '13.91px',
                                                height: '13.91px',
                                                left: '50%',
                                                top: '9.2px',
                                                transform: 'translateX(-50%)',
                                                background: '#FFFFFF',
                                                border: '1.15951px solid #1162A8',
                                                borderRadius: '1.73926px'
                                              }}
                                            />
                                            <span
                                              className="absolute text-center"
                                              style={{
                                                width: '85px',
                                                height: '20px',
                                                left: '50%',
                                                top: '23.11px',
                                                transform: 'translateX(-50%)',
                                                fontFamily: 'Verdana',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '8.78154px',
                                                lineHeight: '19px',
                                                textAlign: 'center',
                                                letterSpacing: '-0.02em',
                                                color: '#000000'
                                              }}
                                            >
                                              Deliver product first
                                            </span>
                                          </button>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setCurrentProductForModal(savedProduct)
                                            setCurrentArchForModal("maxillary")
                                            setShowAddOnsModal(true)
                                          }}
                                          className="relative flex flex-col items-center justify-center"
                                          style={{
                                            width: '123.04px',
                                            height: '46.22px',
                                            background: '#F9F9F9',
                                            boxShadow: '0.878154px 0.878154px 3.07354px rgba(0, 0, 0, 0.25)',
                                            borderRadius: '5.26893px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '0'
                                          }}
                                        >
                                          <span
                                            className="absolute text-center"
                                            style={{
                                              width: '41.8px',
                                              height: '20px',
                                              left: '50%',
                                              top: '3.79px',
                                              transform: 'translateX(-50%)',
                                              fontFamily: 'Verdana',
                                              fontStyle: 'normal',
                                              fontWeight: 400,
                                              fontSize: '8.78154px',
                                              lineHeight: '19px',
                                              textAlign: 'center',
                                              letterSpacing: '-0.02em',
                                              color: '#000000'
                                            }}
                                          >
                                            +
                                          </span>
                                          <span
                                            className="absolute text-center"
                                            style={{
                                              width: '89px',
                                              height: '20px',
                                              left: '50%',
                                              top: '23.11px',
                                              transform: 'translateX(-50%)',
                                              fontFamily: 'Verdana',
                                              fontStyle: 'normal',
                                              fontWeight: 400,
                                              fontSize: '8.78154px',
                                              lineHeight: '19px',
                                              textAlign: 'center',
                                              letterSpacing: '-0.02em',
                                              color: '#000000'
                                            }}
                                          >
                                            Add ons (3 selected)
                                          </span>
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setCurrentProductForModal(savedProduct)
                                            setShowAttachModal(true)
                                          }}
                                          className="relative flex flex-col items-center justify-center"
                                          style={{
                                            width: '123.04px',
                                            height: '46.22px',
                                            background: '#F9F9F9',
                                            boxShadow: '0.878154px 0.878154px 3.07354px rgba(0, 0, 0, 0.25)',
                                            borderRadius: '5.26893px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '0'
                                          }}
                                        >
                                          <Paperclip
                                            className="absolute"
                                            style={{
                                              width: '8.78px',
                                              height: '10.54px',
                                              left: '50%',
                                              top: '9.34px',
                                              transform: 'translateX(-50%)',
                                              color: '#1E1E1E',
                                              strokeWidth: '0.878154px'
                                            }}
                                          />
                                          <span
                                            className="absolute text-center"
                                            style={{
                                              width: '107px',
                                              height: '20px',
                                              left: '50%',
                                              top: '23.11px',
                                              transform: 'translateX(-50%)',
                                              fontFamily: 'Verdana',
                                              fontStyle: 'normal',
                                              fontWeight: 400,
                                              fontSize: '8.78154px',
                                              lineHeight: '19px',
                                              textAlign: 'center',
                                              letterSpacing: '-0.02em',
                                              color: '#000000'
                                            }}
                                          >
                                            Attach Files (15 uploads)
                                          </span>
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setCurrentProductForModal(savedProduct)
                                            setShowRushModal(true)
                                          }}
                                          className="relative flex flex-col items-center justify-center"
                                          style={{
                                            width: '123.04px',
                                            height: '46.22px',
                                            background: '#F9F9F9',
                                            boxShadow: '0px 0px 2.89791px rgba(207, 2, 2, 0.67)',
                                            borderRadius: '5.26893px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '0'
                                          }}
                                        >
                                          <Zap
                                            className="absolute"
                                            style={{
                                              width: '8.78px',
                                              height: '10.54px',
                                              left: '50%',
                                              top: '9.35px',
                                              transform: 'translateX(-50%)',
                                              color: '#CF0202',
                                              fill: '#CF0202',
                                              strokeWidth: '0.878154px'
                                            }}
                                          />
                                          <span
                                            className="absolute text-center"
                                            style={{
                                              width: '59px',
                                              height: '20px',
                                              left: '50%',
                                              top: '23.11px',
                                              transform: 'translateX(-50%)',
                                              fontFamily: 'Verdana',
                                              fontStyle: 'normal',
                                              fontWeight: 400,
                                              fontSize: '8.78154px',
                                              lineHeight: '19px',
                                              textAlign: 'center',
                                              letterSpacing: '-0.02em',
                                              color: '#000000'
                                            }}
                                          >
                                            Request Rush
                                          </span>
                                        </button>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              </Card>
                            )
                          })}
                      </div>
                    )}
                  </div>

                  {/* MANDIBULAR Section */}
                  <div className="flex flex-col w-full">
                    {/* Selected Product Badge */}
                    {selectedProduct && (
                      <div
                        className="relative flex items-center justify-center"
                        style={{ width: "100%", height: "32px", flex: "none", order: 0, flexGrow: 0 }}
                      >
                        <div
                          className="absolute left-1/2"
                          style={{
                            width: "auto",
                            minWidth: "210px",
                            maxWidth: "390px",
                            height: "22px",
                            top: "5px",
                            transform: "translateX(-50%)",
                            background: "#DFEEFB",
                            boxShadow: "1px 1px 3.5px rgba(0, 0, 0, 0.25)",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0 14px",
                          }}
                        >
                          <span
                            className="flex items-center justify-center"
                            style={{
                              fontFamily: "Verdana",
                              fontStyle: "normal",
                              fontWeight: 400,
                              fontSize: "10px",
                              lineHeight: "22px",
                              textAlign: "center",
                              letterSpacing: "-0.02em",
                              color: "#000000",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis"
                            }}
                          >
                            {selectedProduct.name}
                            {/* {mandibularTeeth && mandibularTeeth.length > 0 && (
                              <>
                                {"  |  "}
                                <span>
                                  {mandibularTeeth.length === 1
                                    ? `#${mandibularTeeth[0]}`
                                    : mandibularTeeth
                                      .slice()
                                      .sort((a, b) => a - b)
                                      .map((num) => `#${num}`)
                                      .join(", ")}
                                </span>
                              </>
                            )} */}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Dental Chart - Outside Card */}
                    <div className="rounded-lg p-3 flex items-center justify-center">
                      <MandibularTeethSVG
                        key={`mandibular-${mandibularTeeth.join('-')}`}
                        selectedTeeth={mandibularTeeth}
                        onToothClick={handleMandibularToothToggle}
                        className="max-w-full"
                      />
                    </div>

                    {/* Missing Teeth Cards - Show first for Fixed Restoration */}
                    {isFixedRestoration && selectedProduct && !missingTeethCardClicked && (
                      <div className="w-full">
                        <MissingTeethCards
                          type="mandibular"
                          selectedTeeth={mandibularTeeth}
                          missingTeeth={[]}
                          extractedTeeth={[]}
                          willExtractTeeth={[]}
                          onAllTeethMissing={() => { }}
                          onTeethInMouthClick={handleMissingTeethCardClick}
                          onMissingTeethClick={handleMissingTeethCardClick}
                          onWillExtractClick={handleMissingTeethCardClick}
                          isCaseSubmitted={false}
                          showTeethInMouth={true}
                          showMissingTeeth={true}
                          showWillExtract={true}
                          onExtractionTypeSelect={(extractionType) => {
                            // When any extraction type is selected, show the product accordion
                            if (extractionType) {
                              handleMissingTeethCardClick()
                            }
                          }}
                          onTeethSelectionChange={(teeth) => {
                            // Update mandibular teeth when selection changes
                            setMandibularTeeth(teeth)
                          }}
                        />
                      </div>
                    )}

                    {/* Summary Card - Single card for all selected teeth */}
                    {mandibularTeeth.length > 0 && (!isFixedRestoration || missingTeethCardClicked) && (
                      <Card className="overflow-hidden border border-gray-200 shadow-sm">
                        <Accordion
                          type="single"
                          collapsible
                          className="w-full"
                          value={openAccordion === "mandibular-card" ? "mandibular-card" : ""}
                          onValueChange={handleAccordionChange}
                        >
                          <AccordionItem value="mandibular-card" className="border-0">
                            {/* Header */}
                            <div
                              className="w-full"
                              style={{
                                position: 'relative',
                                height: '69.92px',
                                background: openAccordion === "mandibular-card" ? '#DFEEFB' : '#F5F5F5',
                                boxShadow: '0.9px 0.9px 3.6px rgba(0, 0, 0, 0.25)',
                                borderRadius: openAccordion === "mandibular-card" ? '5.4px 5.4px 0px 0px' : '5.4px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                padding: '14px 8px',
                                gap: '10px'
                              }}
                            >
                              <AccordionTrigger
                                className="hover:no-underline w-full group"
                                style={{
                                  padding: '0px',
                                  gap: '10px',
                                  width: '100%',
                                  height: '100%',
                                  background: 'transparent',
                                  boxShadow: 'none',
                                  borderRadius: '0px'
                                }}
                              >
                                {/* Frame 2395 */}
                                <div style={{ width: '697.74px', height: '42.69px', flex: 'none', order: 0, flexGrow: 0, position: 'relative' }}>
                                  {/* Frame 2388 */}
                                  <div style={{ position: 'absolute', width: '639.14px', height: '42.69px', left: '0px', top: '0px' }}>
                                    {/* Product Image */}
                                    <div
                                      style={{
                                        position: 'absolute',
                                        width: '64.04px',
                                        height: '42.69px',
                                        left: '0px',
                                        top: '0px',
                                        background: `url(${selectedProduct?.image_url || "/images/tooth-icon.png"}), #FFFFFF`,
                                        backgroundSize: 'contain',
                                        backgroundPosition: 'center',
                                        backgroundRepeat: 'no-repeat',
                                        borderRadius: '5.4px'
                                      }}
                                    />

                                    {/* Frame 2387 - Content Area */}
                                    <div style={{ position: 'absolute', width: '565.1px', height: '42px', left: '74.04px', top: '0.34px' }}>
                                      {/* Group 1433 - Tooth Numbers */}
                                      <div style={{ position: 'absolute', width: 'auto', height: '20px', left: '0px', top: '0px' }}>
                                        <span
                                          style={{
                                            fontFamily: 'Verdana',
                                            fontStyle: 'normal',
                                            fontWeight: 400,
                                            fontSize: '14.4px',
                                            lineHeight: '20px',
                                            letterSpacing: '-0.02em',
                                            color: '#000000'
                                          }}
                                        >
                                          {(() => {
                                            const sortedTeeth = [...mandibularTeeth].sort((a, b) => a - b);
                                            return sortedTeeth.length > 0 ? sortedTeeth.join(', ') : '';
                                          })()}
                                        </span>
                                      </div>

                                      {/* Frame 2386 - Badges and Info Row */}
                                      <div style={{ position: 'absolute', width: '565.1px', height: '22px', left: '0px', top: '20px', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px', gap: '5px' }}>
                                        {/* Badge - Category */}
                                        {selectedCategory && (
                                          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 10px', gap: '10px', width: 'fit-content', height: '17px', background: '#F9F9F9', boxShadow: '1px 1px 3.5px rgba(0, 0, 0, 0.25)', borderRadius: '6px', flex: 'none', order: 0, flexGrow: 0 }}>
                                            <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', flex: 'none', order: 0, flexGrow: 0, whiteSpace: 'nowrap' }}>{selectedCategory}</span>
                                          </div>
                                        )}

                                        {/* Badge - Subcategory */}
                                        {selectedSubcategory && (
                                          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 10px', gap: '10px', width: 'fit-content', height: '17px', background: '#F9F9F9', boxShadow: '1px 1px 3.5px rgba(0, 0, 0, 0.25)', borderRadius: '6px', flex: 'none', order: 1, flexGrow: 0 }}>
                                            <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', flex: 'none', order: 0, flexGrow: 0, whiteSpace: 'nowrap' }}>{selectedSubcategory}</span>
                                          </div>
                                        )}

                                        {/* Est days */}
                                        <span style={{ width: 'auto', height: '22px', fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', letterSpacing: '-0.02em', color: '#B4B0B0', flex: 'none', order: 4, flexGrow: 0 }}>
                                          Est days: {selectedProduct?.estimated_days || 10} work days after submission
                                        </span>

                                        {/* Trash Icon */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleClearCurrentProduct()
                                          }}
                                          className="hover:text-red-600 transition-colors"
                                          style={{
                                            width: '16px',
                                            height: '16px',
                                            color: '#999999',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            flex: 'none',
                                            order: 5,
                                            flexGrow: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}
                                        >
                                          <Trash2 className="w-full h-full" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Chevron - Positioned relative to header */}
                                <div style={{ position: 'absolute', width: '21.6px', height: '21.6px', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                                  <ChevronDown
                                    className="w-full h-full transition-transform duration-200 text-black"
                                    style={{
                                      transform: openAccordion === "mandibular-card" ? 'rotate(0deg)' : 'rotate(-180deg)'
                                    }}
                                  />
                                </div>
                              </AccordionTrigger>
                            </div>
                            <AccordionContent className="pt-0" style={{ position: 'relative', minHeight: 'auto' }}>
                              {/* Summary detail */}
                              <div
                                className="bg-white w-full"
                                style={{
                                  position: 'relative',
                                  height: 'auto',
                                  minHeight: 'auto',
                                  paddingLeft: '15.87px',
                                  paddingRight: '15.87px',
                                  paddingBottom: '20px',
                                  paddingTop: '20px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'flex-start',
                                  gap: '20px',
                                  background: '#FFFFFF',
                                  boxSizing: 'border-box'
                                }}
                              >
                                {/* Row 1: Product - Material and Retention Type */}
                                <div
                                  className="flex flex-col sm:flex-row flex-wrap gap-5"
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    padding: '0px',
                                    gap: '20px',
                                    flex: 'none',
                                    order: 0,
                                    alignSelf: 'stretch',
                                    flexGrow: 0
                                  }}
                                >
                                  {/* Product - Material */}
                                  <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
                                    <div
                                      className="flex items-center"
                                      style={{
                                        padding: '12px 39px 5px 15px',
                                        gap: '5px',
                                        width: '100%',
                                        height: '37px',
                                        position: 'relative',
                                        marginTop: '5.27px',
                                        background: '#FFFFFF',
                                        border: '0.740384px solid #7F7F7F',
                                        borderRadius: '7.7px',
                                        boxSizing: 'border-box'
                                      }}
                                    >
                                      <span style={{
                                        fontFamily: 'Verdana',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14.4px',
                                        lineHeight: '20px',
                                        letterSpacing: '-0.02em',
                                        color: '#000000',
                                        whiteSpace: 'nowrap'
                                      }}>Full contour - Zirconia</span>
                                    </div>
                                    <label
                                      className="absolute bg-white"
                                      style={{
                                        padding: '0px',
                                        height: '14px',
                                        left: '8.9px',
                                        top: '0px',
                                        fontFamily: 'Arial',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14px',
                                        lineHeight: '14px',
                                        color: '#7F7F7F'
                                      }}
                                    >
                                      Product - Material
                                    </label>
                                  </div>

                                  {/* Retention Type */}
                                  <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
                                    <div
                                      className="flex items-center"
                                      style={{
                                        padding: '12px 39px 5px 15px',
                                        gap: '5px',
                                        width: '100%',
                                        height: '37px',
                                        position: 'relative',
                                        marginTop: '5.27px',
                                        background: '#FFFFFF',
                                        border: '0.740384px solid #7F7F7F',
                                        borderRadius: '7.7px',
                                        boxSizing: 'border-box'
                                      }}
                                    >
                                      <span style={{
                                        fontFamily: 'Arial',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14px',
                                        lineHeight: '14px',
                                        color: '#000000',
                                        whiteSpace: 'nowrap'
                                      }}>Screwed retained</span>
                                    </div>
                                    <label
                                      className="absolute bg-white"
                                      style={{
                                        padding: '0px',
                                        height: '14px',
                                        left: '9.23px',
                                        top: '0px',
                                        fontFamily: 'Arial',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14px',
                                        lineHeight: '14px',
                                        color: '#7F7F7F'
                                      }}
                                    >
                                      Select Retention type
                                    </label>
                                  </div>
                                </div>

                                {/* Row 2: Stump Shade, Tooth Shade, Stage */}
                                <div
                                  className="flex flex-col sm:flex-row flex-wrap gap-5"
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    padding: '0px',
                                    gap: '20px',
                                    flex: 'none',
                                    order: 1,
                                    alignSelf: 'stretch',
                                    flexGrow: 0
                                  }}
                                >
                                  {/* Stump Shade */}
                                  <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                    <div
                                      className="flex items-center justify-between"
                                      style={{
                                        padding: '12px 39px 5px 15px',
                                        gap: '5px',
                                        width: '100%',
                                        height: '37px',
                                        background: '#FFFFFF',
                                        border: '0.740384px solid #7F7F7F',
                                        borderRadius: '7.7px',
                                        boxSizing: 'border-box',
                                        position: 'relative',
                                        marginTop: '5.27px'
                                      }}
                                    >
                                      <span style={{
                                        fontFamily: 'Verdana',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14.4px',
                                        lineHeight: '20px',
                                        letterSpacing: '-0.02em',
                                        color: '#000000'
                                      }}>Vita 3D Master</span>
                                      <div
                                        className="flex items-center justify-center"
                                        style={{
                                          width: '37.51px',
                                          height: '41.97px',
                                          background: 'linear-gradient(0deg, #DED2C7 0.05%, #E3D4C4 7.04%, #EDD9C1 25.04%, #F0DBC0 50.02%, #F0DCC2 76.01%, #F1E0CA 90%, #F3E7D7 100%)',
                                          borderRadius: '8px',
                                          position: 'absolute',
                                          right: '0px',
                                          top: '-1px'
                                        }}
                                      >
                                        <span style={{
                                          fontFamily: 'Verdana',
                                          fontStyle: 'normal',
                                          fontWeight: 400,
                                          fontSize: '12.8603px',
                                          lineHeight: '18px',
                                          letterSpacing: '-0.02em',
                                          color: '#000000'
                                        }}>A2</span>
                                      </div>
                                    </div>
                                    <label
                                      className="absolute bg-white"
                                      style={{
                                        padding: '0px',
                                        height: '14px',
                                        left: '8.9px',
                                        top: '0px',
                                        fontFamily: 'Arial',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14px',
                                        lineHeight: '14px',
                                        color: '#7F7F7F'
                                      }}
                                    >
                                      Stump Shade
                                    </label>
                                  </div>

                                  {/* Tooth Shade */}
                                  <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                    <div
                                      className="flex items-center justify-between"
                                      style={{
                                        padding: '12px 39px 5px 15px',
                                        gap: '5px',
                                        width: '100%',
                                        height: '37px',
                                        background: '#FFFFFF',
                                        border: '0.740384px solid #7F7F7F',
                                        borderRadius: '7.7px',
                                        boxSizing: 'border-box',
                                        position: 'relative',
                                        marginTop: '5.27px'
                                      }}
                                    >
                                      <span style={{
                                        fontFamily: 'Verdana',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14.4px',
                                        lineHeight: '20px',
                                        letterSpacing: '-0.02em',
                                        color: '#000000'
                                      }}>Vita 3D Master</span>
                                      <div
                                        className="flex items-center justify-center"
                                        style={{
                                          width: '37.51px',
                                          height: '41.97px',
                                          background: 'linear-gradient(0deg, #DED2C7 0.05%, #E3D4C4 7.04%, #EDD9C1 25.04%, #F0DBC0 50.02%, #F0DCC2 76.01%, #F1E0CA 90%, #F3E7D7 100%)',
                                          borderRadius: '8px',
                                          position: 'absolute',
                                          right: '0px',
                                          top: '-1px'
                                        }}
                                      >
                                        <span style={{
                                          fontFamily: 'Verdana',
                                          fontStyle: 'normal',
                                          fontWeight: 400,
                                          fontSize: '12.8603px',
                                          lineHeight: '18px',
                                          letterSpacing: '-0.02em',
                                          color: '#000000'
                                        }}>A2</span>
                                      </div>
                                    </div>
                                    <label
                                      className="absolute bg-white"
                                      style={{
                                        padding: '0px',
                                        height: '14px',
                                        left: '8.9px',
                                        top: '0px',
                                        fontFamily: 'Arial',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14px',
                                        lineHeight: '14px',
                                        color: '#7F7F7F'
                                      }}
                                    >
                                      Tooth Shade
                                    </label>
                                  </div>

                                  {/* Stage */}
                                  <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                    <div
                                      className="flex items-center"
                                      style={{
                                        padding: '12px 39px 5px 15px',
                                        gap: '5px',
                                        width: '100%',
                                        height: '37px',
                                        position: 'relative',
                                        marginTop: '5.27px',
                                        background: '#FFFFFF',
                                        border: '0.740384px solid #7F7F7F',
                                        borderRadius: '7.7px',
                                        boxSizing: 'border-box'
                                      }}
                                    >
                                      <span style={{
                                        fontFamily: 'Verdana',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14.4px',
                                        lineHeight: '20px',
                                        letterSpacing: '-0.02em',
                                        color: '#000000'
                                      }}>Finish</span>
                                    </div>
                                    <label
                                      className="absolute bg-white"
                                      style={{
                                        padding: '0px',
                                        height: '14px',
                                        left: '8.9px',
                                        top: '0px',
                                        fontFamily: 'Arial',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14px',
                                        lineHeight: '14px',
                                        color: '#7F7F7F'
                                      }}
                                    >
                                      Stage
                                    </label>
                                  </div>
                                </div>

                                {/* Row 3: Pontic Design, Embrasures, Occlusal Contact, Interproximal Contact */}
                                <div
                                  className="flex flex-col sm:flex-row flex-wrap gap-5"
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    padding: '0px',
                                    gap: '20px',
                                    flex: 'none',
                                    order: 2,
                                    alignSelf: 'stretch',
                                    flexGrow: 0
                                  }}
                                >
                                  {/* Pontic Design */}
                                  <div className="relative flex-1 min-w-[150px] max-w-[23%]" style={{ minHeight: '43px' }}>
                                    <div
                                      className="flex items-center"
                                      style={{
                                        padding: '12px 15px 5px 15px',
                                        gap: '5px',
                                        width: '100%',
                                        height: '37px',
                                        background: '#FFFFFF',
                                        border: '0.740384px solid #7F7F7F',
                                        borderRadius: '7.7px',
                                        boxSizing: 'border-box',
                                        position: 'relative',
                                        marginTop: '5.27px'
                                      }}
                                    >
                                      <span style={{
                                        fontFamily: 'Verdana',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14.4px',
                                        lineHeight: '20px',
                                        letterSpacing: '-0.02em',
                                        color: '#000000',
                                        whiteSpace: 'nowrap'
                                      }}>Modified Ridge</span>
                                      <div style={{ width: '20px', height: '20px', flexShrink: 0, marginLeft: '5px' }}>
                                        <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <path d="M14.6974 4.49056C13.7369 3.36755 12.0449 1.76287 9.55154 0.956543C8.20286 0.520113 6.61529 0.00917103 4.91327 0.751634C4.00751 1.14815 3.1988 2.51598 1.54654 5.16915C1.16333 5.78388 0.737824 6.50772 0.528803 7.54823C0.401897 8.18158 0.205318 9.17419 0.655708 10.063C1.05882 10.8587 1.53907 10.6911 1.98946 11.4894C2.45478 12.3144 2.1089 12.7801 2.37018 14.0707C2.43487 14.3874 2.75089 15.8085 3.64172 16.7212C4.37081 17.4664 5.2268 17.6101 6.81934 17.8096C11.0396 18.3339 13.1771 18.584 14.4436 18.0146C15.9043 17.3573 16.8548 16.33 17.3027 15.8404C17.9621 15.1166 18.9276 14.0814 19.4004 12.3756C19.7015 11.2872 19.2984 10.9545 19.592 9.3179C19.801 8.15497 19.9901 8.16295 20.1643 7.14373C20.3709 5.94089 20.6247 4.44798 19.8458 3.40747C18.9724 2.23922 17.2928 2.30043 16.7329 2.31905C15.9018 2.34833 13.7369 2.66501 13.3239 2.86193" fill="white" />
                                          <path d="M14.6974 4.49056C13.7369 3.36755 12.0449 1.76287 9.55154 0.956543C8.20286 0.520113 6.61529 0.00917103 4.91327 0.751634C4.00751 1.14815 3.1988 2.51598 1.54654 5.16915C1.16333 5.78388 0.737824 6.50772 0.528803 7.54823C0.401897 8.18158 0.205318 9.17419 0.655708 10.063C1.05882 10.8587 1.53907 10.6911 1.98946 11.4894C2.45478 12.3144 2.1089 12.7801 2.37018 14.0707C2.43487 14.3874 2.75089 15.8085 3.64172 16.7212C4.37081 17.4664 5.2268 17.6101 6.81934 17.8096C11.0396 18.3339 13.1771 18.584 14.4436 18.0146C15.9043 17.3573 16.8548 16.33 17.3027 15.8404C17.9621 15.1166 18.9276 14.0814 19.4004 12.3756C19.7015 11.2872 19.2984 10.9545 19.592 9.3179C19.801 8.15497 19.9901 8.16295 20.1643 7.14373C20.3709 5.94089 20.6247 4.44798 19.8458 3.40747C18.9724 2.23922 17.2928 2.30043 16.7329 2.31905C15.9018 2.34833 13.7369 2.66501 13.3239 2.86193" stroke="black" strokeWidth="0.75" strokeMiterlimit="10" />
                                          <path d="M1.59131 20.3749C1.59131 20.3749 2.79069 19.8666 4.48276 18.1262C5.98324 16.5828 5.87375 15.7418 7.12041 15.002C8.6383 14.0999 10.2856 14.4592 10.7409 14.5603C12.0424 14.845 12.7167 15.5449 14.0131 16.5987C17.7382 19.6218 19.159 20.3749 19.159 20.3749H1.59131Z" fill="#1063AB" />
                                        </svg>
                                      </div>
                                    </div>
                                    <label
                                      className="absolute bg-white"
                                      style={{
                                        padding: '0px',
                                        height: '14px',
                                        left: '8.9px',
                                        top: '0px',
                                        fontFamily: 'Arial',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14px',
                                        lineHeight: '14px',
                                        color: '#7F7F7F'
                                      }}
                                    >
                                      Pontic Design
                                    </label>
                                  </div>

                                  {/* Embrasures */}
                                  <div className="relative flex-1 min-w-[150px] max-w-[23%]" style={{ minHeight: '43px' }}>
                                    <div
                                      className="flex items-center"
                                      style={{
                                        padding: '12px 15px 5px 15px',
                                        gap: '5px',
                                        width: '100%',
                                        height: '37px',
                                        background: '#FFFFFF',
                                        border: '0.740384px solid #7F7F7F',
                                        borderRadius: '7.7px',
                                        boxSizing: 'border-box',
                                        position: 'relative',
                                        marginTop: '5.27px'
                                      }}
                                    >
                                      <span style={{
                                        fontFamily: 'Verdana',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14.4px',
                                        lineHeight: '20px',
                                        letterSpacing: '-0.02em',
                                        color: '#000000',
                                        whiteSpace: 'nowrap'
                                      }}>Type II</span>
                                      <div style={{ width: '31.21px', height: '20px', flexShrink: 0, marginLeft: '5px' }}>
                                        <svg width="32" height="21" viewBox="0 0 32 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <path d="M23.5384 11.8866C22.6561 11.6436 21.7738 11.2207 20.8725 11.3588C20.1572 11.4689 19.5229 11.9233 18.8219 12.1155C17.0144 12.6119 15.1688 11.3133 13.3089 11.4584C11.6875 11.586 10.0581 12.7954 8.55269 12.1243C7.83257 11.8027 7.22532 11.0704 6.44957 11.1019C5.8773 11.1263 5.40517 11.5667 4.93304 11.9215C4.46091 12.2763 3.84413 12.5699 3.33544 12.2833C2.71706 11.9338 2.67255 11.0092 2.54697 10.256C2.29262 8.74245 1.40719 7.46837 0.74907 6.1104C0.0909533 4.75243 -0.336664 3.05365 0.348477 1.71141C0.950957 0.531708 2.27355 -0.0170728 3.50553 0.000404325C4.73751 0.0178814 5.91863 0.498501 7.08861 0.924942C8.2586 1.35138 9.4874 1.73238 10.7067 1.54363C11.6938 1.39158 12.6174 0.872511 13.611 0.788621C15.1259 0.659291 16.5502 1.54363 18.0477 1.82327C19.7788 2.14659 21.537 1.65549 23.2618 1.3007C24.9865 0.945915 26.8496 0.739685 28.4313 1.57684C29.347 2.06095 30.1911 2.89461 31.2069 2.85966C30.9016 4.62135 29.5822 5.91465 28.4154 7.16776C27.3058 8.3597 26.8735 9.50969 26.2201 10.9848C25.7098 12.1382 24.6161 12.1854 23.5384 11.8883V11.8866Z" fill="#1063AB" />
                                          <path d="M4.38445 19.3241C4.06493 19.1773 3.78197 18.9396 3.83443 18.5342C3.92981 17.7966 4.17938 16.381 4.82001 13.714C4.96308 13.1145 6.0202 8.80467 7.10753 8.49183C7.48428 8.38347 7.88487 8.38871 7.88487 8.38871C7.88487 8.38871 8.33315 8.3957 8.74805 8.54251C9.85445 8.93575 10.7049 12.0589 10.8814 13.2736C11.2422 15.7536 11.1468 18.5516 11.1309 19.1441C11.123 19.4272 10.9163 19.5793 10.6827 19.6335C8.9865 20.0302 5.81037 19.983 4.38445 19.3241Z" fill="white" stroke="black" strokeWidth="0.501636" strokeMiterlimit="10" />
                                          <path d="M11.778 19.6135C11.4473 19.4964 11.1469 19.3164 11.1691 18.9476C11.2423 17.7627 11.1326 14.3949 11.3106 13.4808C11.5586 12.2067 12.2151 10.4678 13.0163 9.4803C13.3899 9.02065 14.5106 8.42643 15.0829 8.43168C15.6551 8.43692 16.8378 9.04862 17.1923 9.54671C17.9236 10.5761 18.162 12.2679 18.4768 13.5088C18.693 14.3564 18.4291 17.6404 18.4752 18.7449C18.4895 19.1067 18.2145 19.278 17.9013 19.4265C16.3975 20.1413 13.3327 20.1623 11.778 19.6118V19.6135Z" fill="white" stroke="black" strokeWidth="0.501636" strokeMiterlimit="10" />
                                          <path d="M19.2783 19.6451C18.8253 19.5123 18.4533 19.168 18.5169 18.6349C18.6075 17.8852 18.5359 15.3562 18.811 13.3936C19.1909 10.6829 19.3832 10.7877 20.2766 9.41403C20.5834 8.9404 21.1811 8.04732 22.0872 7.96692C22.8646 7.89702 23.4782 8.45803 23.7119 8.67824C24.8437 9.74434 24.831 11.1792 25.5018 15.538C25.7466 17.1302 25.8452 18.1491 25.8817 18.773C25.9104 19.2449 25.5686 19.5036 25.1775 19.6434C23.7882 20.1397 20.8314 20.0978 19.2783 19.6434V19.6451Z" fill="white" stroke="black" strokeWidth="0.501636" strokeMiterlimit="10" />
                                        </svg>
                                      </div>
                                    </div>
                                    <label
                                      className="absolute bg-white"
                                      style={{
                                        padding: '0px',
                                        height: '14px',
                                        left: '8.9px',
                                        top: '0px',
                                        fontFamily: 'Arial',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14px',
                                        lineHeight: '14px',
                                        color: '#7F7F7F'
                                      }}
                                    >
                                      Embrasures
                                    </label>
                                  </div>

                                  {/* Occlusal Contact */}
                                  <div className="relative flex-1 min-w-[150px] max-w-[23%]" style={{ minHeight: '43px' }}>
                                    <div
                                      className="flex items-center"
                                      style={{
                                        padding: '12px 15px 5px 15px',
                                        gap: '5px',
                                        width: '100%',
                                        height: '37px',
                                        background: '#FFFFFF',
                                        border: '0.740384px solid #7F7F7F',
                                        borderRadius: '7.7px',
                                        boxSizing: 'border-box',
                                        position: 'relative',
                                        marginTop: '5.27px'
                                      }}
                                    >
                                      <span style={{
                                        fontFamily: 'Verdana',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14.4px',
                                        lineHeight: '20px',
                                        letterSpacing: '-0.02em',
                                        color: '#000000',
                                        whiteSpace: 'nowrap'
                                      }}>POS</span>
                                      <div style={{ width: '13.12px', height: '20px', flexShrink: 0, marginLeft: '5px' }}>
                                        <svg width="14" height="20" viewBox="0 0 14 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <g clipPath="url(#clip0_58_14491)">
                                            <path d="M3.49812 19.9226C3.49812 19.9226 1.68128 15.4909 1.59438 14.6613C1.53484 14.1007 1.25644 11.4417 2.93971 10.3139C3.87468 9.68685 5.01886 9.80027 5.09932 9.81C5.89911 9.89912 5.96026 10.2378 6.72626 10.3139C7.61457 10.403 7.86722 9.98175 9.19806 9.68361C10.1379 9.47296 10.9618 9.28824 11.6393 9.62041C12.6579 10.1195 12.8961 11.5665 13.0168 12.3621C13.4851 15.4683 10.3261 19.9242 10.3261 19.9242C9.84659 19.7201 8.26148 19.234 6.82604 19.2534C5.15242 19.2777 3.49973 19.9242 3.49973 19.9242L3.49812 19.9226Z" fill="white" stroke="black" strokeWidth="0.46875" strokeMiterlimit="10" />
                                            <path d="M1.68948 0.0844727C1.68948 0.0844727 0.176792 4.51613 0.104376 5.34575C0.0560987 5.9064 -0.177242 8.56539 1.22441 9.69316C2.00328 10.3202 2.75158 10.2975 2.81595 10.2749C3.52241 10.0415 3.80403 9.73205 4.41876 9.74015C5.16384 9.75149 5.33281 9.85357 6.43997 10.1517C7.22207 10.3624 8.00899 10.0253 8.57383 9.69316C9.4219 9.19409 9.51202 8.43901 9.61179 7.64503C10.0028 4.53882 7.37173 0.0844727 7.37173 0.0844727C6.97263 0.288637 5.65305 0.774742 4.45738 0.755298C3.06539 0.729373 1.68948 0.0844727 1.68948 0.0844727Z" fill="white" stroke="black" strokeWidth="0.46875" strokeMiterlimit="10" />
                                          </g>
                                          <defs>
                                            <clipPath id="clip0_58_14491">
                                              <rect width="13.125" height="20" fill="white" />
                                            </clipPath>
                                          </defs>
                                        </svg>
                                      </div>
                                    </div>
                                    <label
                                      className="absolute bg-white"
                                      style={{
                                        padding: '0px',
                                        height: '14px',
                                        left: '8.9px',
                                        top: '0px',
                                        fontFamily: 'Arial',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14px',
                                        lineHeight: '14px',
                                        color: '#7F7F7F'
                                      }}
                                    >
                                      Occlusal Contact
                                    </label>
                                  </div>

                                  {/* Interproximal Contact */}
                                  <div className="relative flex-1 min-w-[150px] max-w-[23%]" style={{ minHeight: '43px' }}>
                                    <div
                                      className="flex items-center"
                                      style={{
                                        padding: '12px 15px 5px 15px',
                                        gap: '5px',
                                        width: '100%',
                                        height: '37px',
                                        background: '#FFFFFF',
                                        border: '0.740384px solid #7F7F7F',
                                        borderRadius: '7.7px',
                                        boxSizing: 'border-box',
                                        position: 'relative',
                                        marginTop: '5.27px'
                                      }}
                                    >
                                      <span style={{
                                        fontFamily: 'Verdana',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14.4px',
                                        lineHeight: '20px',
                                        letterSpacing: '-0.02em',
                                        color: '#000000',
                                        whiteSpace: 'nowrap'
                                      }}>Open Contact</span>
                                      <div style={{ width: '26.21px', height: '20px', flexShrink: 0, marginLeft: '5px' }}>
                                        <svg width="27" height="20" viewBox="0 0 27 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <path d="M0.103027 2.50471L1.79407 0.781732C2.0659 0.50248 2.3692 0.209266 2.75834 0.150623C3.2419 0.0752254 3.69399 0.385195 4.07455 0.686786C5.65114 1.94063 7.0675 3.38715 8.2807 4.98447C8.73851 4.49299 9.19633 4.0015 9.65414 3.51002" stroke="black" strokeWidth="0.689655" strokeMiterlimit="10" />
                                          <path d="M5.97998 2.12788C5.99143 1.71738 6.44065 1.43255 6.86127 1.42138C7.28188 1.41021 7.67389 1.5973 8.06303 1.75369C8.45217 1.91007 8.88137 2.04131 9.28481 1.92403C9.49083 1.86259 9.67395 1.73972 9.87997 1.6727C10.5495 1.45768 11.2505 1.90727 11.7227 2.41272C12.7098 3.47108 13.2478 4.87013 13.4852 6.28594C13.7227 7.70174 13.677 9.14268 13.634 10.5725C13.5854 12.1167 13.0103 14.0799 12.3207 15.4705C11.3278 17.4756 10.7098 18.7824 9.9515 19.5783" stroke="black" strokeWidth="0.689655" strokeMiterlimit="10" />
                                          <path d="M18.9333 19.9302C16.896 16.3949 14.8988 11.6029 15.0676 7.02041C15.1105 5.86431 15.4367 3.74758 16.3237 2.97964C17.2107 2.2117 18.7788 2.10558 19.4798 3.03828" stroke="black" strokeWidth="0.689655" strokeMiterlimit="10" />
                                          <path d="M19.0538 2.68895L18.9336 3.51833C19.9494 2.7811 20.988 2.07739 22.0467 1.40719C22.4816 1.13352 22.9652 0.854267 23.4774 0.918495C23.9953 0.985515 24.3901 1.38485 24.7764 1.72832C25.1627 2.0718 25.6634 2.39853 26.1728 2.27566" stroke="black" strokeWidth="0.689655" strokeMiterlimit="10" />
                                        </svg>
                                      </div>
                                    </div>
                                    <label
                                      className="absolute bg-white"
                                      style={{
                                        padding: '0px',
                                        height: '14px',
                                        left: '8.9px',
                                        top: '0px',
                                        fontFamily: 'Arial',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14px',
                                        lineHeight: '14px',
                                        color: '#7F7F7F'
                                      }}
                                    >
                                      Interproximal Contact
                                    </label>
                                  </div>
                                </div>

                                {/* Row 4: Impression */}
                                <div
                                  className="flex flex-col sm:flex-row flex-wrap gap-5"
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    padding: '0px',
                                    gap: '20px',
                                    flex: 'none',
                                    order: 3,
                                    alignSelf: 'stretch',
                                    flexGrow: 0
                                  }}
                                >
                                  {/* Impression */}
                                  <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
                                    <div
                                      className="flex items-center"
                                      style={{
                                        padding: '12px 39px 5px 15px',
                                        gap: '5px',
                                        width: '100%',
                                        height: '37px',
                                        background: '#FFFFFF',
                                        border: '0.740384px solid #7F7F7F',
                                        borderRadius: '7.7px',
                                        boxSizing: 'border-box',
                                        position: 'relative',
                                        marginTop: '5.27px'
                                      }}
                                    >
                                      <span style={{
                                        fontFamily: 'Verdana',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14.4px',
                                        lineHeight: '20px',
                                        letterSpacing: '-0.02em',
                                        color: '#000000'
                                      }}>1x STL file</span>
                                    </div>
                                    <label
                                      className="absolute bg-white"
                                      style={{
                                        padding: '0px',
                                        height: '14px',
                                        left: '8.9px',
                                        top: '0px',
                                        fontFamily: 'Arial',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '14px',
                                        lineHeight: '14px',
                                        color: '#7F7F7F'
                                      }}
                                    >
                                      Impression
                                    </label>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div
                                className="flex flex-wrap justify-center items-center w-full"
                                style={{
                                  gap: '7.03px',
                                  position: 'relative',
                                  marginTop: '30px',
                                  marginBottom: '15px'
                                }}
                              >
                                {/* Deliver product first - Only show if multiple products */}
                                {savedProducts.length > 1 && (
                                  <button
                                    className="relative flex flex-col items-center justify-center"
                                    style={{
                                      width: '123.04px',
                                      height: '46.22px',
                                      background: '#F9F9F9',
                                      boxShadow: '0.878154px 0.878154px 3.07354px rgba(0, 0, 0, 0.25)',
                                      borderRadius: '5.26893px',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: '0'
                                    }}
                                  >
                                    <div
                                      className="absolute"
                                      style={{
                                        width: '13.91px',
                                        height: '13.91px',
                                        left: '50%',
                                        top: '9.2px',
                                        transform: 'translateX(-50%)',
                                        background: '#FFFFFF',
                                        border: '1.15951px solid #1162A8',
                                        borderRadius: '1.73926px'
                                      }}
                                    />
                                    <span
                                      className="absolute text-center"
                                      style={{
                                        width: '85px',
                                        height: '20px',
                                        left: '50%',
                                        top: '23.11px',
                                        transform: 'translateX(-50%)',
                                        fontFamily: 'Verdana',
                                        fontStyle: 'normal',
                                        fontWeight: 400,
                                        fontSize: '8.78154px',
                                        lineHeight: '19px',
                                        textAlign: 'center',
                                        letterSpacing: '-0.02em',
                                        color: '#000000'
                                      }}
                                    >
                                      Deliver product first
                                    </span>
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // For card accordion, create temp product for modal
                                    const tempProduct: SavedProduct = {
                                      id: selectedProduct?.id?.toString() || `temp-${Date.now()}`,
                                      product: selectedProduct || { id: 0, name: "Product", price: 0 },
                                      productDetails: productDetails,
                                      category: selectedCategory || "",
                                      categoryId: selectedCategoryId || 0,
                                      subcategory: selectedSubcategory || "",
                                      subcategoryId: selectedSubcategoryId || 0,
                                      maxillaryTeeth: maxillaryTeeth,
                                      mandibularTeeth: mandibularTeeth,
                                      maxillaryMaterial: maxillaryMaterial,
                                      maxillaryStumpShade: maxillaryStumpShade,
                                      maxillaryRetention: maxillaryRetention,
                                      maxillaryNotes: maxillaryNotes,
                                      mandibularMaterial: mandibularMaterial,
                                      mandibularRetention: mandibularRetention,
                                      mandibularImplantDetails: mandibularImplantDetails,
                                      createdAt: Date.now(),
                                      addedFrom: "mandibular",
                                    }
                                    setCurrentProductForModal(tempProduct)
                                    setCurrentArchForModal("mandibular")
                                    setShowAddOnsModal(true)
                                  }}
                                  className="relative flex flex-col items-center justify-center"
                                  style={{
                                    width: '123.04px',
                                    height: '46.22px',
                                    background: '#F9F9F9',
                                    boxShadow: '0.878154px 0.878154px 3.07354px rgba(0, 0, 0, 0.25)',
                                    borderRadius: '5.26893px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0'
                                  }}
                                >
                                  <span
                                    className="absolute text-center"
                                    style={{
                                      width: '41.8px',
                                      height: '20px',
                                      left: '50%',
                                      top: '3.79px',
                                      transform: 'translateX(-50%)',
                                      fontFamily: 'Verdana',
                                      fontStyle: 'normal',
                                      fontWeight: 400,
                                      fontSize: '8.78154px',
                                      lineHeight: '19px',
                                      textAlign: 'center',
                                      letterSpacing: '-0.02em',
                                      color: '#000000'
                                    }}
                                  >
                                    +
                                  </span>
                                  <span
                                    className="absolute text-center"
                                    style={{
                                      width: '89px',
                                      height: '20px',
                                      left: '50%',
                                      top: '23.11px',
                                      transform: 'translateX(-50%)',
                                      fontFamily: 'Verdana',
                                      fontStyle: 'normal',
                                      fontWeight: 400,
                                      fontSize: '8.78154px',
                                      lineHeight: '19px',
                                      textAlign: 'center',
                                      letterSpacing: '-0.02em',
                                      color: '#000000'
                                    }}
                                  >
                                    Add ons (3 selected)
                                  </span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setShowAttachModal(true)
                                  }}
                                  className="relative flex flex-col items-center justify-center"
                                  style={{
                                    width: '123.04px',
                                    height: '46.22px',
                                    background: '#F9F9F9',
                                    boxShadow: '0.878154px 0.878154px 3.07354px rgba(0, 0, 0, 0.25)',
                                    borderRadius: '5.26893px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0'
                                  }}
                                >
                                  <Paperclip
                                    className="absolute"
                                    style={{
                                      width: '8.78px',
                                      height: '10.54px',
                                      left: '50%',
                                      top: '9.34px',
                                      transform: 'translateX(-50%)',
                                      color: '#1E1E1E',
                                      strokeWidth: '0.878154px'
                                    }}
                                  />
                                  <span
                                    className="absolute text-center"
                                    style={{
                                      width: '107px',
                                      height: '20px',
                                      left: '50%',
                                      top: '23.11px',
                                      transform: 'translateX(-50%)',
                                      fontFamily: 'Verdana',
                                      fontStyle: 'normal',
                                      fontWeight: 400,
                                      fontSize: '8.78154px',
                                      lineHeight: '19px',
                                      textAlign: 'center',
                                      letterSpacing: '-0.02em',
                                      color: '#000000'
                                    }}
                                  >
                                    Attach Files (15 uploads)
                                  </span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // For card accordion, create temp product for rush modal
                                    const tempProduct: SavedProduct = {
                                      id: selectedProduct?.id?.toString() || `temp-${Date.now()}`,
                                      product: selectedProduct || { id: 0, name: "Product", price: 0 },
                                      productDetails: productDetails,
                                      category: selectedCategory || "",
                                      categoryId: selectedCategoryId || 0,
                                      subcategory: selectedSubcategory || "",
                                      subcategoryId: selectedSubcategoryId || 0,
                                      maxillaryTeeth: maxillaryTeeth,
                                      mandibularTeeth: mandibularTeeth,
                                      maxillaryMaterial: maxillaryMaterial,
                                      maxillaryStumpShade: maxillaryStumpShade,
                                      maxillaryRetention: maxillaryRetention,
                                      maxillaryNotes: maxillaryNotes,
                                      mandibularMaterial: mandibularMaterial,
                                      mandibularRetention: mandibularRetention,
                                      mandibularImplantDetails: mandibularImplantDetails,
                                      createdAt: Date.now(),
                                      addedFrom: "mandibular",
                                    }
                                    setCurrentProductForModal(tempProduct)
                                    setShowRushModal(true)
                                  }}
                                  className="relative flex flex-col items-center justify-center"
                                  style={{
                                    width: '123.04px',
                                    height: '46.22px',
                                    background: '#F9F9F9',
                                    boxShadow: '0px 0px 2.89791px rgba(207, 2, 2, 0.67)',
                                    borderRadius: '5.26893px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0'
                                  }}
                                >
                                  <Zap
                                    className="absolute"
                                    style={{
                                      width: '8.78px',
                                      height: '10.54px',
                                      left: '50%',
                                      top: '9.35px',
                                      transform: 'translateX(-50%)',
                                      color: '#CF0202',
                                      fill: '#CF0202',
                                      strokeWidth: '0.878154px'
                                    }}
                                  />
                                  <span
                                    className="absolute text-center"
                                    style={{
                                      width: '59px',
                                      height: '20px',
                                      left: '50%',
                                      top: '23.11px',
                                      transform: 'translateX(-50%)',
                                      fontFamily: 'Verdana',
                                      fontStyle: 'normal',
                                      fontWeight: 400,
                                      fontSize: '8.78154px',
                                      lineHeight: '19px',
                                      textAlign: 'center',
                                      letterSpacing: '-0.02em',
                                      color: '#000000'
                                    }}
                                  >
                                    Request Rush
                                  </span>
                                </button>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </Card>
                    )}

                    {/* Saved Mandibular Products - Display below MANDIBULAR section */}
                    {savedProducts.filter(p => p.addedFrom === "mandibular").length > 0 && (
                      <div className="w-full mt-1 space-y-1">
                        {savedProducts
                          .filter(p => p.addedFrom === "mandibular")
                          .map((savedProduct, index) => {
                            const teeth = savedProduct.mandibularTeeth.sort((a, b) => a - b)
                            const displayTeeth = teeth.length === 1
                              ? `#${teeth[0]}`
                              : teeth.length > 0
                                ? `#${teeth.join(", #")}`
                                : "No teeth selected"

                            return (
                              <Card key={savedProduct.id} className="overflow-hidden border border-gray-200 shadow-sm">
                                <Accordion
                                  type="single"
                                  collapsible
                                  className="w-full"
                                  value={openAccordion === savedProduct.id ? savedProduct.id : ""}
                                  onValueChange={handleAccordionChange}
                                >
                                  <AccordionItem value={savedProduct.id} className="border-0">
                                    {/* Header */}
                                    <div
                                      className="w-full"
                                      style={{
                                        position: 'relative',
                                        height: '69.92px',
                                        background: openAccordion === savedProduct.id ? '#DFEEFB' : '#F5F5F5',
                                        boxShadow: '0.9px 0.9px 3.6px rgba(0, 0, 0, 0.25)',
                                        borderRadius: openAccordion === savedProduct.id ? '5.4px 5.4px 0px 0px' : '5.4px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        padding: '14px 8px',
                                        gap: '10px'
                                      }}
                                    >
                                      <AccordionTrigger
                                        className="hover:no-underline w-full"
                                        style={{
                                          padding: '0px',
                                          gap: '10px',
                                          width: '100%',
                                          height: '100%',
                                          background: 'transparent',
                                          boxShadow: 'none',
                                          borderRadius: '0px'
                                        }}
                                      >
                                        {/* Frame 2395 */}
                                        <div style={{ width: '697.74px', height: '42.69px', flex: 'none', order: 0, flexGrow: 0, position: 'relative' }}>
                                          {/* Frame 2388 */}
                                          <div style={{ position: 'absolute', width: '639.14px', height: '42.69px', left: '0px', top: '0px' }}>
                                            {/* Product Image */}
                                            <div
                                              style={{
                                                position: 'absolute',
                                                width: '64.04px',
                                                height: '42.69px',
                                                left: '0px',
                                                top: '0px',
                                                background: '#F5F5F5',
                                                borderRadius: '5.4px',
                                                overflow: 'hidden',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                              }}
                                            >
                                              <img
                                                src={savedProduct.product.image_url || "/images/product-default.png"}
                                                alt={savedProduct.product.name}
                                                style={{
                                                  width: '100%',
                                                  height: '100%',
                                                  objectFit: 'contain'
                                                }}
                                                onError={(e) => {
                                                  const target = e.target as HTMLImageElement
                                                  if (target.src !== window.location.origin + "/images/product-default.png") {
                                                    target.src = "/images/product-default.png"
                                                  }
                                                }}
                                              />
                                            </div>

                                            {/* Frame 2387 - Content Area */}
                                            <div style={{ position: 'absolute', width: '565.1px', height: '42px', left: '74.04px', top: '0.34px' }}>
                                              {/* Group 1433 - Tooth Numbers */}
                                              <div style={{ position: 'absolute', width: 'auto', height: '20px', left: '0px', top: '0px' }}>
                                                <span
                                                  style={{
                                                    fontFamily: 'Verdana',
                                                    fontStyle: 'normal',
                                                    fontWeight: 400,
                                                    fontSize: '14.4px',
                                                    lineHeight: '20px',
                                                    letterSpacing: '-0.02em',
                                                    color: '#000000'
                                                  }}
                                                >
                                                  {teeth.length > 0 ? teeth.join(', ') : ''}
                                                </span>
                                              </div>

                                              {/* Frame 2386 - Badges and Info Row */}
                                              <div style={{ position: 'absolute', width: '565.1px', height: '22px', left: '0px', top: '20px', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px', gap: '5px' }}>
                                                {/* Badge - Category */}
                                                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 10px', gap: '10px', width: 'fit-content', height: '17px', background: '#F9F9F9', boxShadow: '1px 1px 3.5px rgba(0, 0, 0, 0.25)', borderRadius: '6px', flex: 'none', order: 0, flexGrow: 0 }}>
                                                  <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', flex: 'none', order: 0, flexGrow: 0 }}>{savedProduct.category}</span>
                                                </div>

                                                {/* Badge - Subcategory */}
                                                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 10px', gap: '10px', width: 'fit-content', height: '17px', background: '#F9F9F9', boxShadow: '1px 1px 3.5px rgba(0, 0, 0, 0.25)', borderRadius: '6px', flex: 'none', order: 1, flexGrow: 0 }}>
                                                  <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', flex: 'none', order: 0, flexGrow: 0 }}>{savedProduct.subcategory}</span>
                                                </div>

                                                {/* Est days */}
                                                <span style={{ width: 'auto', height: '22px', fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', letterSpacing: '-0.02em', color: '#B4B0B0', flex: 'none', order: 4, flexGrow: 0 }}>
                                                  Est days: {savedProduct.product.estimated_days || 10} work days after submission
                                                </span>

                                                {/* Trash Icon */}
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDeleteProduct(savedProduct.id)
                                                  }}
                                                  className="hover:text-red-600 transition-colors"
                                                  style={{
                                                    width: '16px',
                                                    height: '16px',
                                                    color: '#999999',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    flex: 'none',
                                                    order: 5,
                                                    flexGrow: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                  }}
                                                >
                                                  <Trash2 className="w-full h-full" />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Chevron - Positioned relative to header */}
                                        <div style={{ position: 'absolute', width: '21.6px', height: '21.6px', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                                          <ChevronDown
                                            className="w-full h-full transition-transform duration-200 text-black"
                                            style={{
                                              transform: openAccordion === savedProduct.id ? 'rotate(0deg)' : 'rotate(-180deg)'
                                            }}
                                          />
                                        </div>
                                      </AccordionTrigger>
                                    </div>

                                    <AccordionContent className="pt-0" style={{ position: 'relative', minHeight: 'auto' }}>
                                      {/* Summary detail - Same structure as current product accordion */}
                                      <div
                                        className="bg-white w-full"
                                        style={{
                                          position: 'relative',
                                          height: 'auto',
                                          minHeight: 'auto',
                                          marginTop: '75px',
                                          paddingLeft: '15.87px',
                                          paddingRight: '15.87px',
                                          paddingBottom: '20px',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'flex-start',
                                          gap: '20px',
                                          background: '#FFFFFF',
                                          boxSizing: 'border-box'
                                        }}
                                      >
                                        {/* Row 1: Product - Material and Retention Type */}
                                        <div
                                          className="flex flex-col sm:flex-row flex-wrap gap-5"
                                          style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignItems: 'flex-start',
                                            padding: '0px',
                                            gap: '20px',
                                            flex: 'none',
                                            order: 0,
                                            alignSelf: 'stretch',
                                            flexGrow: 0
                                          }}
                                        >
                                          {/* Product - Material */}
                                          <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center"
                                              style={{
                                                padding: '12px 39px 5px 15px',
                                                gap: '5px',
                                                width: '100%',
                                                height: '37px',
                                                position: 'relative',
                                                marginTop: '5.27px',
                                                background: '#FFFFFF',
                                                border: '0.740384px solid #7F7F7F',
                                                borderRadius: '7.7px',
                                                boxSizing: 'border-box'
                                              }}
                                            >
                                              <span style={{
                                                fontFamily: 'Verdana',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14.4px',
                                                lineHeight: '20px',
                                                letterSpacing: '-0.02em',
                                                color: '#000000',
                                                whiteSpace: 'nowrap'
                                              }}>{savedProduct.mandibularMaterial || 'Not specified'}</span>
                                            </div>
                                            <label
                                              className="absolute bg-white"
                                              style={{
                                                padding: '0px',
                                                height: '14px',
                                                left: '8.9px',
                                                top: '0px',
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#7F7F7F'
                                              }}
                                            >
                                              Product - Material
                                            </label>
                                          </div>

                                          {/* Retention Type */}
                                          <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center"
                                              style={{
                                                padding: '12px 39px 5px 15px',
                                                gap: '5px',
                                                width: '100%',
                                                height: '37px',
                                                position: 'relative',
                                                marginTop: '5.27px',
                                                background: '#FFFFFF',
                                                border: '0.740384px solid #7F7F7F',
                                                borderRadius: '7.7px',
                                                boxSizing: 'border-box'
                                              }}
                                            >
                                              <span style={{
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#000000',
                                                whiteSpace: 'nowrap'
                                              }}>{savedProduct.mandibularRetention || 'Not specified'}</span>
                                            </div>
                                            <label
                                              className="absolute bg-white"
                                              style={{
                                                padding: '0px',
                                                height: '14px',
                                                left: '9.23px',
                                                top: '0px',
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#7F7F7F'
                                              }}
                                            >
                                              Select Retention type
                                            </label>
                                          </div>
                                        </div>

                                        {/* Row 2: Tooth Shade, Stage */}
                                        <div
                                          className="flex flex-col sm:flex-row flex-wrap gap-5"
                                          style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignItems: 'flex-start',
                                            padding: '0px',
                                            gap: '20px',
                                            flex: 'none',
                                            order: 1,
                                            alignSelf: 'stretch',
                                            flexGrow: 0
                                          }}
                                        >
                                          {/* Tooth Shade */}
                                          <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center justify-between"
                                              style={{
                                                padding: '12px 39px 5px 15px',
                                                gap: '5px',
                                                width: '100%',
                                                height: '37px',
                                                background: '#FFFFFF',
                                                border: '0.740384px solid #7F7F7F',
                                                borderRadius: '7.7px',
                                                boxSizing: 'border-box',
                                                position: 'relative',
                                                marginTop: '5.27px'
                                              }}
                                            >
                                              <span style={{
                                                fontFamily: 'Verdana',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14.4px',
                                                lineHeight: '20px',
                                                letterSpacing: '-0.02em',
                                                color: '#000000'
                                              }}>Not specified</span>
                                            </div>
                                            <label
                                              className="absolute bg-white"
                                              style={{
                                                padding: '0px',
                                                height: '14px',
                                                left: '8.9px',
                                                top: '0px',
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#7F7F7F'
                                              }}
                                            >
                                              Tooth Shade
                                            </label>
                                          </div>

                                          {/* Stage */}
                                          <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center"
                                              style={{
                                                padding: '12px 39px 5px 15px',
                                                gap: '5px',
                                                width: '100%',
                                                height: '37px',
                                                position: 'relative',
                                                marginTop: '5.27px',
                                                background: '#FFFFFF',
                                                border: '0.740384px solid #7F7F7F',
                                                borderRadius: '7.7px',
                                                boxSizing: 'border-box'
                                              }}
                                            >
                                              <span style={{
                                                fontFamily: 'Verdana',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14.4px',
                                                lineHeight: '20px',
                                                letterSpacing: '-0.02em',
                                                color: '#000000'
                                              }}>Finish</span>
                                            </div>
                                            <label
                                              className="absolute bg-white"
                                              style={{
                                                padding: '0px',
                                                height: '14px',
                                                left: '8.9px',
                                                top: '0px',
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#7F7F7F'
                                              }}
                                            >
                                              Stage
                                            </label>
                                          </div>
                                        </div>

                                        {/* Row 3: Teeth Selection Display */}
                                        <div
                                          className="flex flex-col sm:flex-row flex-wrap gap-5"
                                          style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignItems: 'flex-start',
                                            padding: '0px',
                                            gap: '20px',
                                            flex: 'none',
                                            order: 2,
                                            alignSelf: 'stretch',
                                            flexGrow: 0
                                          }}
                                        >
                                          {/* Teeth Selection */}
                                          <div className="relative flex-1 min-w-[250px] max-w-[100%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center"
                                              style={{
                                                padding: '12px 15px 5px 15px',
                                                gap: '5px',
                                                width: '100%',
                                                height: '37px',
                                                background: '#FFFFFF',
                                                border: '0.740384px solid #7F7F7F',
                                                borderRadius: '7.7px',
                                                boxSizing: 'border-box',
                                                position: 'relative',
                                                marginTop: '5.27px'
                                              }}
                                            >
                                              <span style={{
                                                fontFamily: 'Verdana',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14.4px',
                                                lineHeight: '20px',
                                                letterSpacing: '-0.02em',
                                                color: '#000000'
                                              }}>{displayTeeth}</span>
                                            </div>
                                            <label
                                              className="absolute bg-white"
                                              style={{
                                                padding: '0px',
                                                height: '14px',
                                                left: '8.9px',
                                                top: '0px',
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#7F7F7F'
                                              }}
                                            >
                                              Selected Teeth
                                            </label>
                                          </div>
                                        </div>

                                        {/* Implant Details if available */}
                                        {savedProduct.mandibularImplantDetails && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 3,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[250px] max-w-[100%]" style={{ minHeight: '43px' }}>
                                              <div
                                                className="flex items-start"
                                                style={{
                                                  padding: '12px 15px 5px 15px',
                                                  gap: '5px',
                                                  width: '100%',
                                                  minHeight: '60px',
                                                  background: '#FFFFFF',
                                                  border: '0.740384px solid #7F7F7F',
                                                  borderRadius: '7.7px',
                                                  boxSizing: 'border-box',
                                                  position: 'relative',
                                                  marginTop: '5.27px'
                                                }}
                                              >
                                                <span style={{
                                                  fontFamily: 'Verdana',
                                                  fontStyle: 'normal',
                                                  fontWeight: 400,
                                                  fontSize: '14.4px',
                                                  lineHeight: '20px',
                                                  letterSpacing: '-0.02em',
                                                  color: '#000000'
                                                }}>{savedProduct.mandibularImplantDetails}</span>
                                              </div>
                                              <label
                                                className="absolute bg-white"
                                                style={{
                                                  padding: '0px',
                                                  height: '14px',
                                                  left: '8.9px',
                                                  top: '0px',
                                                  fontFamily: 'Arial',
                                                  fontStyle: 'normal',
                                                  fontWeight: 400,
                                                  fontSize: '14px',
                                                  lineHeight: '14px',
                                                  color: '#7F7F7F'
                                                }}
                                              >
                                                Implant Details
                                              </label>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              </Card>
                            )
                          })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Case Summary Notes - Expandable and Responsive */}
                <div className="relative bg-white border border-[#7F7F7F] rounded-[7.7px] w-full mx-auto px-2 sm:px-4" style={{ marginBottom: "80px" }}>
                  {/* Label positioned absolutely at the top */}
                  <div
                    className="absolute left-[9px] -top-[7px] bg-white px-2 flex items-center gap-[7.7px] z-10"
                  >
                    <span className="text-[14px] leading-[14px] text-[#7F7F7F] font-[Arial]">
                      Case summary notes
                    </span>
                  </div>

                  {/* Action Icons - positioned absolutely at top right */}
                  <div className="absolute right-[5px] top-[6px] flex items-center gap-2 z-10">
                    {/* Open full page icon */}
                    <button
                      className="w-[14px] h-[14px] flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
                      onClick={() => {
                        // TODO: Implement full page view
                      }}
                      aria-label="Open full page"
                    >
                      <Maximize2 className="w-[10px] h-[10px] text-[#B4B0B0]" />
                    </button>

                    {/* Chevron up/down - toggle expansion */}
                    <button
                      className="w-[14px] h-[14px] flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
                      onClick={() => {
                        const willExpand = !isCaseSummaryExpanded
                        setIsCaseSummaryExpanded(willExpand)
                        // Initialize notes when expanding if empty and we have products
                        if (willExpand && !maxillaryNotes && savedProducts.length > 0) {
                          const generatedNotes = generateCaseNotes()
                          if (generatedNotes) {
                            setMaxillaryNotes(generatedNotes)
                          }
                        }
                      }}
                      aria-label={isCaseSummaryExpanded ? "Collapse notes" : "Expand notes"}
                    >
                      {isCaseSummaryExpanded ? (
                        <ChevronUp className="w-[10px] h-[10px] text-[#B4B0B0]" />
                      ) : (
                        <ChevronDown className="w-[10px] h-[10px] text-[#B4B0B0]" />
                      )}
                    </button>
                  </div>

                  {/* Content Container - Responsive padding */}
                  <div className={cn(
                    "transition-all duration-300 overflow-hidden",
                    "p-[12px_15px_5px_15px] sm:p-[12px_39px_5px_15px]",
                    isCaseSummaryExpanded ? "max-h-[500px] sm:max-h-[600px]" : "max-h-[74px]"
                  )}>
                    <Textarea
                      value={maxillaryNotes}
                      onChange={(e) => {
                        const newValue = e.target.value
                        setMaxillaryNotes(newValue)
                      }}
                      onBlur={async (e) => {
                        const notes = e.target.value
                        // CRITICAL: Only parse if user has made SIGNIFICANT changes
                        // This prevents clearing products when user just clicks or makes minor edits

                        // Don't parse if:
                        // 1. Notes haven't changed from previous value
                        // 2. Notes are too short (user is still typing)
                        // 3. We have existing products AND notes don't contain clear product information

                        const hasChanged = notes !== previousNotesRef.current
                        const hasValidSections = notes.toUpperCase().includes('MAXILLARY') || notes.toUpperCase().includes('MANDIBULAR')
                        const isSubstantial = notes.length >= 100 || notes.includes('Fabricate') || notes.includes('fabricate')

                        // Only parse if:
                        // - Notes have changed AND
                        // - Notes contain valid sections AND
                        // - (No existing products OR notes are substantial enough to be a complete replacement)
                        if (
                          hasChanged &&
                          hasValidSections &&
                          (savedProducts.length === 0 || isSubstantial)
                        ) {
                          await parseCaseNotes(notes)
                        }

                        // Always update the ref to track current value
                        previousNotesRef.current = notes
                      }}
                      onFocus={() => {
                        // Store the current notes value when focusing to track changes
                        previousNotesRef.current = maxillaryNotes
                      }}
                      onKeyDown={(e) => {
                        // Allow user to explicitly trigger parsing with Ctrl+Enter or Cmd+Enter
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                          e.preventDefault()
                          parseCaseNotes(maxillaryNotes)
                        }
                      }}
                      className={cn(
                        "w-full border-0 outline-none resize-none tracking-[-0.02em] text-black bg-transparent p-0 focus:ring-0",
                        "text-[12px] sm:text-[14px] leading-[15px] sm:leading-[17px]",
                        "font-[Verdana]",
                        isCaseSummaryExpanded ? "min-h-[300px] sm:min-h-[442px]" : "min-h-[42px] overflow-hidden"
                      )}
                      placeholder="Enter case notes following the format: MAXILLARY / MANDIBULAR sections with product details..."
                      disabled={!isCaseSummaryExpanded}
                    />
                  </div>

                  {/* Helper text when expanded - Responsive */}
                  {isCaseSummaryExpanded && (
                    <p className="text-[10px] sm:text-xs text-gray-500 px-[15px] pb-3 sm:pb-4">
                      {generateCaseNotes().length > 0 && !maxillaryNotes
                        ? "Case notes are automatically generated from your products. Edit to customize, and changes will update your product selections."
                        : maxillaryNotes
                          ? "Editing case notes will update your products, categories, subcategories, and teeth selections based on the content."
                          : "Enter case notes to automatically populate products, categories, subcategories, and teeth selections. Or add products first to generate notes automatically."}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Summary Accordion - Show in categories, subcategories and products steps, hide when product details are shown */}
          {selectedCategory && !showProductDetails && (
            <div className="w-full flex justify-center mt-auto mb-8">
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '0px 102px',
                  gap: '10px',
                  isolation: 'isolate',
                  width: '724.59px',
                }}
              >
                {/* Summary Accordion */}
                <div
                  style={{
                    width: '724.59px',
                    flex: 'none',
                    order: 0,
                    flexGrow: 0,
                    zIndex: 0,
                    position: 'relative'
                  }}
                >
                  {/* Rectangle 412 */}
                  <div
                    style={{
                      position: 'relative',
                      width: '720px',
                      background: '#FFFFFF',
                      boxShadow: '0.9px 0.9px 3.6px rgba(0, 0, 0, 0.25)',
                      borderRadius: '5.4px'
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '14px 8px',
                        gap: '10px',
                        width: '100%',
                        height: '69.92px',
                        background: '#DFEEFB',
                        boxShadow: '0.9px 0.9px 3.6px rgba(0, 0, 0, 0.25)',
                        borderRadius: '5.4px 5.4px 0px 0px'
                      }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex gap-2 items-center">
                          <div className="bg-[#f9f9f9] px-4 py-2 rounded-[10px] shadow-sm h-[29px] flex items-center">
                            <p className="text-[17px] text-black">{selectedCategory}</p>
                          </div>
                          {selectedSubcategory && (
                            <div className="bg-[#f9f9f9] px-4 py-2 rounded-[10px] shadow-sm h-[29px] flex items-center">
                              <p className="text-[17px] text-black">{selectedSubcategory}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-center w-[22px] h-[22px]">
                          <ChevronRight className="h-5 w-5 text-gray-600 rotate-90" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Saved Products Section - Separate division with 2 columns */}
          {savedProducts.length > 0 && selectedCategory && !showProductDetails && (
            <div className="w-full flex mt-4 mb-8">
              <div
              >
                {/* Two Column Layout for Saved Products */}
                <div className="w-full flex gap-4 items-start">
                  {/* Maxillary Products - Left Column */}
                  <div className="flex-1 flex flex-col">
                    {/* Maxillary Accordion Header */}


                    <div className="space-y-1 flex flex-col items-center">
                      {savedProducts.filter(p => p.addedFrom === "maxillary").length > 0 ? (
                        savedProducts
                          .filter(p => p.addedFrom === "maxillary")
                          .map((savedProduct) => {
                            const isMaxillary = true // All products in this section are maxillary
                            const teeth = savedProduct.maxillaryTeeth.sort((a, b) => a - b)
                            const displayTeeth = teeth.length === 1
                              ? `#${teeth[0]}`
                              : teeth.length > 0
                                ? `#${teeth.join(", #")}`
                                : "No teeth selected"

                            return (
                              <Card key={savedProduct.id} className="overflow-hidden border border-gray-200 shadow-sm" style={{ width: '80%', minWidth: '80%' }}>
                                <Accordion
                                  type="single"
                                  collapsible
                                  className="w-full"
                                  value={openAccordion === savedProduct.id ? savedProduct.id : ""}
                                  onValueChange={handleAccordionChange}
                                >
                                  <AccordionItem value={savedProduct.id} className="border-0">
                                    {/* Header */}
                                    <div
                                      className="w-full"
                                      style={{
                                        position: 'relative',
                                        height: '69.92px',
                                        background: openAccordion === savedProduct.id ? '#DFEEFB' : '#F5F5F5',
                                        boxShadow: '0.9px 0.9px 3.6px rgba(0, 0, 0, 0.25)',
                                        borderRadius: openAccordion === savedProduct.id ? '5.4px 5.4px 0px 0px' : '5.4px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        padding: '14px 8px',
                                        gap: '10px'
                                      }}
                                    >
                                      <AccordionTrigger
                                        className="hover:no-underline w-full"
                                        style={{
                                          padding: '0px',
                                          gap: '10px',
                                          width: '100%',
                                          height: '100%',
                                          background: 'transparent',
                                          boxShadow: 'none',
                                          borderRadius: '0px'
                                        }}
                                      >
                                        {/* Frame 2395 */}
                                        <div style={{ width: '697.74px', height: '42.69px', flex: 'none', order: 0, flexGrow: 0, position: 'relative' }}>
                                          {/* Frame 2388 */}
                                          <div style={{ position: 'absolute', width: '639.14px', height: '42.69px', left: '0px', top: '0px' }}>
                                            {/* Product Image */}
                                            <div
                                              style={{
                                                position: 'absolute',
                                                width: '64.04px',
                                                height: '42.69px',
                                                left: '0px',
                                                top: '0px',
                                                background: '#F5F5F5',
                                                borderRadius: '5.4px',
                                                overflow: 'hidden',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                              }}
                                            >
                                              <img
                                                src={savedProduct.product.image_url || "/images/product-default.png"}
                                                alt={savedProduct.product.name}
                                                style={{
                                                  width: '100%',
                                                  height: '100%',
                                                  objectFit: 'contain'
                                                }}
                                                onError={(e) => {
                                                  const target = e.target as HTMLImageElement
                                                  if (target.src !== window.location.origin + "/images/product-default.png") {
                                                    target.src = "/images/product-default.png"
                                                  }
                                                }}
                                              />
                                            </div>

                                            {/* Frame 2387 - Content Area */}
                                            <div style={{ position: 'absolute', width: '565.1px', height: '42px', left: '74.04px', top: '0.34px' }}>
                                              {/* Group 1433 - Tooth Numbers */}
                                              <div style={{ position: 'absolute', width: 'auto', height: '20px', left: '0px', top: '0px' }}>
                                                <span
                                                  style={{
                                                    fontFamily: 'Verdana',
                                                    fontStyle: 'normal',
                                                    fontWeight: 400,
                                                    fontSize: '14.4px',
                                                    lineHeight: '20px',
                                                    letterSpacing: '-0.02em',
                                                    color: '#000000'
                                                  }}
                                                >
                                                  {teeth.length > 0 ? teeth.join(', ') : ''}
                                                </span>
                                              </div>

                                              {/* Frame 2386 - Badges and Info Row */}
                                              <div style={{ position: 'absolute', width: '565.1px', height: '22px', left: '0px', top: '20px', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px', gap: '5px' }}>
                                                {/* Badge - Category */}
                                                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 10px', gap: '10px', width: 'fit-content', height: '17px', background: '#F9F9F9', boxShadow: '1px 1px 3.5px rgba(0, 0, 0, 0.25)', borderRadius: '6px', flex: 'none', order: 0, flexGrow: 0 }}>
                                                  <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', flex: 'none', order: 0, flexGrow: 0 }}>{savedProduct.category}</span>
                                                </div>

                                                {/* Badge - Subcategory */}
                                                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 10px', gap: '10px', width: 'fit-content', height: '17px', background: '#F9F9F9', boxShadow: '1px 1px 3.5px rgba(0, 0, 0, 0.25)', borderRadius: '6px', flex: 'none', order: 1, flexGrow: 0 }}>
                                                  <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', flex: 'none', order: 0, flexGrow: 0 }}>{savedProduct.subcategory}</span>
                                                </div>

                                                {/* Est days */}
                                                <span style={{ width: 'auto', height: '22px', fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', letterSpacing: '-0.02em', color: '#B4B0B0', flex: 'none', order: 4, flexGrow: 0 }}>
                                                  Est days: {savedProduct.product.estimated_days || 10} work days after submission
                                                </span>

                                                {/* Trash Icon */}
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDeleteProduct(savedProduct.id)
                                                  }}
                                                  className="hover:text-red-600 transition-colors"
                                                  style={{
                                                    width: '16px',
                                                    height: '16px',
                                                    color: '#999999',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    flex: 'none',
                                                    order: 5,
                                                    flexGrow: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                  }}
                                                >
                                                  <Trash2 className="w-full h-full" />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Chevron - Positioned relative to header */}
                                        <div style={{ position: 'absolute', width: '21.6px', height: '21.6px', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                                          <ChevronDown
                                            className="w-full h-full transition-transform duration-200 text-black"
                                            style={{
                                              transform: openAccordion === savedProduct.id ? 'rotate(0deg)' : 'rotate(-180deg)'
                                            }}
                                          />
                                        </div>
                                      </AccordionTrigger>
                                    </div>

                                    <AccordionContent className="pt-0" style={{ position: 'relative', minHeight: 'auto' }}>
                                      {/* Summary detail */}
                                      <div
                                        className="bg-white w-full"
                                        style={{
                                          position: 'relative',
                                          height: 'auto',
                                          minHeight: 'auto',
                                          marginTop: '75px',
                                          paddingLeft: '15.87px',
                                          paddingRight: '15.87px',
                                          paddingBottom: '20px',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'flex-start',
                                          gap: '20px',
                                          background: '#FFFFFF',
                                          boxSizing: 'border-box'
                                        }}
                                      >
                                        {/* Row 1: Product - Material and Retention Type */}
                                        <div
                                          className="flex flex-col sm:flex-row flex-wrap gap-5"
                                          style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignItems: 'flex-start',
                                            padding: '0px',
                                            gap: '20px',
                                            flex: 'none',
                                            order: 0,
                                            alignSelf: 'stretch',
                                            flexGrow: 0
                                          }}
                                        >
                                          {/* Product - Material */}
                                          <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center"
                                              style={{
                                                padding: '12px 39px 5px 15px',
                                                gap: '5px',
                                                width: '100%',
                                                height: '37px',
                                                position: 'relative',
                                                marginTop: '5.27px',
                                                background: '#FFFFFF',
                                                border: '0.740384px solid #7F7F7F',
                                                borderRadius: '7.7px',
                                                boxSizing: 'border-box'
                                              }}
                                            >
                                              <span style={{
                                                fontFamily: 'Verdana',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14.4px',
                                                lineHeight: '20px',
                                                letterSpacing: '-0.02em',
                                                color: '#000000',
                                                whiteSpace: 'nowrap'
                                              }}>{isMaxillary ? (savedProduct.maxillaryMaterial || 'Not specified') : (savedProduct.mandibularMaterial || 'Not specified')}</span>
                                            </div>
                                            <label
                                              className="absolute bg-white"
                                              style={{
                                                padding: '0px',
                                                height: '14px',
                                                left: '8.9px',
                                                top: '0px',
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#7F7F7F'
                                              }}
                                            >
                                              Product - Material
                                            </label>
                                          </div>

                                          {/* Retention Type */}
                                          <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center"
                                              style={{
                                                padding: '12px 39px 5px 15px',
                                                gap: '5px',
                                                width: '100%',
                                                height: '37px',
                                                position: 'relative',
                                                marginTop: '5.27px',
                                                background: '#FFFFFF',
                                                border: '0.740384px solid #7F7F7F',
                                                borderRadius: '7.7px',
                                                boxSizing: 'border-box'
                                              }}
                                            >
                                              <span style={{
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#000000',
                                                whiteSpace: 'nowrap'
                                              }}>{isMaxillary ? (savedProduct.maxillaryRetention || 'Not specified') : (savedProduct.mandibularRetention || 'Not specified')}</span>
                                            </div>
                                            <label
                                              className="absolute bg-white"
                                              style={{
                                                padding: '0px',
                                                height: '14px',
                                                left: '9.23px',
                                                top: '0px',
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#7F7F7F'
                                              }}
                                            >
                                              Select Retention type
                                            </label>
                                          </div>
                                        </div>

                                        {/* Row 2: Stump Shade, Tooth Shade, Stage */}
                                        <div
                                          className="flex flex-col sm:flex-row flex-wrap gap-5"
                                          style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignItems: 'flex-start',
                                            padding: '0px',
                                            gap: '20px',
                                            flex: 'none',
                                            order: 1,
                                            alignSelf: 'stretch',
                                            flexGrow: 0
                                          }}
                                        >
                                          {/* Stump Shade */}
                                          <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center justify-between"
                                              style={{
                                                padding: '12px 39px 5px 15px',
                                                gap: '5px',
                                                width: '100%',
                                                height: '37px',
                                                background: '#FFFFFF',
                                                border: '0.740384px solid #7F7F7F',
                                                borderRadius: '7.7px',
                                                boxSizing: 'border-box',
                                                position: 'relative',
                                                marginTop: '5.27px'
                                              }}
                                            >
                                              <span style={{
                                                fontFamily: 'Verdana',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14.4px',
                                                lineHeight: '20px',
                                                letterSpacing: '-0.02em',
                                                color: '#000000'
                                              }}>{isMaxillary ? (savedProduct.maxillaryStumpShade || 'Not specified') : 'Not specified'}</span>
                                              {isMaxillary && savedProduct.maxillaryStumpShade && (
                                                <div
                                                  className="flex items-center justify-center"
                                                  style={{
                                                    width: '37.51px',
                                                    height: '41.97px',
                                                    background: 'linear-gradient(0deg, #DED2C7 0.05%, #E3D4C4 7.04%, #EDD9C1 25.04%, #F0DBC0 50.02%, #F0DCC2 76.01%, #F1E0CA 90%, #F3E7D7 100%)',
                                                    borderRadius: '8px',
                                                    position: 'absolute',
                                                    right: '0px',
                                                    top: '-1px'
                                                  }}
                                                >
                                                  <span style={{
                                                    fontFamily: 'Verdana',
                                                    fontStyle: 'normal',
                                                    fontWeight: 400,
                                                    fontSize: '12.8603px',
                                                    lineHeight: '18px',
                                                    letterSpacing: '-0.02em',
                                                    color: '#000000'
                                                  }}>{savedProduct.maxillaryStumpShade}</span>
                                                </div>
                                              )}
                                            </div>
                                            <label
                                              className="absolute bg-white"
                                              style={{
                                                padding: '0px',
                                                height: '14px',
                                                left: '8.9px',
                                                top: '0px',
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#7F7F7F'
                                              }}
                                            >
                                              Stump Shade
                                            </label>
                                          </div>

                                          {/* Tooth Shade */}
                                          <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center"
                                              style={{
                                                padding: '12px 39px 5px 15px',
                                                gap: '5px',
                                                width: '100%',
                                                height: '37px',
                                                background: '#FFFFFF',
                                                border: '0.740384px solid #7F7F7F',
                                                borderRadius: '7.7px',
                                                boxSizing: 'border-box',
                                                position: 'relative',
                                                marginTop: '5.27px'
                                              }}
                                            >
                                              <span style={{
                                                fontFamily: 'Verdana',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14.4px',
                                                lineHeight: '20px',
                                                letterSpacing: '-0.02em',
                                                color: '#000000'
                                              }}>Not specified</span>
                                            </div>
                                            <label
                                              className="absolute bg-white"
                                              style={{
                                                padding: '0px',
                                                height: '14px',
                                                left: '8.9px',
                                                top: '0px',
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#7F7F7F'
                                              }}
                                            >
                                              Tooth Shade
                                            </label>
                                          </div>

                                          {/* Stage */}
                                          <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center"
                                              style={{
                                                padding: '12px 39px 5px 15px',
                                                gap: '5px',
                                                width: '100%',
                                                height: '37px',
                                                position: 'relative',
                                                marginTop: '5.27px',
                                                background: '#FFFFFF',
                                                border: '0.740384px solid #7F7F7F',
                                                borderRadius: '7.7px',
                                                boxSizing: 'border-box'
                                              }}
                                            >
                                              <span style={{
                                                fontFamily: 'Verdana',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14.4px',
                                                lineHeight: '20px',
                                                letterSpacing: '-0.02em',
                                                color: '#000000'
                                              }}>Finish</span>
                                            </div>
                                            <label
                                              className="absolute bg-white"
                                              style={{
                                                padding: '0px',
                                                height: '14px',
                                                left: '8.9px',
                                                top: '0px',
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#7F7F7F'
                                              }}
                                            >
                                              Stage
                                            </label>
                                          </div>
                                        </div>

                                        {/* Row 3: Teeth Selection Display */}
                                        <div
                                          className="flex flex-col sm:flex-row flex-wrap gap-5"
                                          style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignItems: 'flex-start',
                                            padding: '0px',
                                            gap: '20px',
                                            flex: 'none',
                                            order: 2,
                                            alignSelf: 'stretch',
                                            flexGrow: 0
                                          }}
                                        >
                                          {/* Teeth Selection */}
                                          <div className="relative flex-1 min-w-[250px] max-w-[100%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center"
                                              style={{
                                                padding: '12px 15px 5px 15px',
                                                gap: '5px',
                                                width: '100%',
                                                height: '37px',
                                                background: '#FFFFFF',
                                                border: '0.740384px solid #7F7F7F',
                                                borderRadius: '7.7px',
                                                boxSizing: 'border-box',
                                                position: 'relative',
                                                marginTop: '5.27px'
                                              }}
                                            >
                                              <span style={{
                                                fontFamily: 'Verdana',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14.4px',
                                                lineHeight: '20px',
                                                letterSpacing: '-0.02em',
                                                color: '#000000'
                                              }}>{displayTeeth}</span>
                                            </div>
                                            <label
                                              className="absolute bg-white"
                                              style={{
                                                padding: '0px',
                                                height: '14px',
                                                left: '8.9px',
                                                top: '0px',
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#7F7F7F'
                                              }}
                                            >
                                              Selected Teeth
                                            </label>
                                          </div>
                                        </div>

                                        {/* Notes if available */}
                                        {isMaxillary && savedProduct.maxillaryNotes && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 3,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[250px] max-w-[100%]" style={{ minHeight: '43px' }}>
                                              <div
                                                className="flex items-start"
                                                style={{
                                                  padding: '12px 15px 5px 15px',
                                                  gap: '5px',
                                                  width: '100%',
                                                  minHeight: '60px',
                                                  background: '#FFFFFF',
                                                  border: '0.740384px solid #7F7F7F',
                                                  borderRadius: '7.7px',
                                                  boxSizing: 'border-box',
                                                  position: 'relative',
                                                  marginTop: '5.27px'
                                                }}
                                              >
                                                <span style={{
                                                  fontFamily: 'Verdana',
                                                  fontStyle: 'normal',
                                                  fontWeight: 400,
                                                  fontSize: '14.4px',
                                                  lineHeight: '20px',
                                                  letterSpacing: '-0.02em',
                                                  color: '#000000'
                                                }}>{savedProduct.maxillaryNotes}</span>
                                              </div>
                                              <label
                                                className="absolute bg-white"
                                                style={{
                                                  padding: '0px',
                                                  height: '14px',
                                                  left: '8.9px',
                                                  top: '0px',
                                                  fontFamily: 'Arial',
                                                  fontStyle: 'normal',
                                                  fontWeight: 400,
                                                  fontSize: '14px',
                                                  lineHeight: '14px',
                                                  color: '#7F7F7F'
                                                }}
                                              >
                                                Notes
                                              </label>
                                            </div>
                                          </div>
                                        )}

                                        {/* Mandibular Implant Details if available */}
                                        {!isMaxillary && savedProduct.mandibularImplantDetails && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 4,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[250px] max-w-[100%]" style={{ minHeight: '43px' }}>
                                              <div
                                                className="flex items-start"
                                                style={{
                                                  padding: '12px 15px 5px 15px',
                                                  gap: '5px',
                                                  width: '100%',
                                                  minHeight: '60px',
                                                  background: '#FFFFFF',
                                                  border: '0.740384px solid #7F7F7F',
                                                  borderRadius: '7.7px',
                                                  boxSizing: 'border-box',
                                                  position: 'relative',
                                                  marginTop: '5.27px'
                                                }}
                                              >
                                                <span style={{
                                                  fontFamily: 'Verdana',
                                                  fontStyle: 'normal',
                                                  fontWeight: 400,
                                                  fontSize: '14.4px',
                                                  lineHeight: '20px',
                                                  letterSpacing: '-0.02em',
                                                  color: '#000000'
                                                }}>{savedProduct.mandibularImplantDetails}</span>
                                              </div>
                                              <label
                                                className="absolute bg-white"
                                                style={{
                                                  padding: '0px',
                                                  height: '14px',
                                                  left: '8.9px',
                                                  top: '0px',
                                                  fontFamily: 'Arial',
                                                  fontStyle: 'normal',
                                                  fontWeight: 400,
                                                  fontSize: '14px',
                                                  lineHeight: '14px',
                                                  color: '#7F7F7F'
                                                }}
                                              >
                                                Implant Details
                                              </label>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              </Card>
                            )
                          })
                      ) : (
                        <div className="text-gray-400 text-sm py-4">No maxillary products</div>
                      )}
                    </div>
                  </div>

                  {/* Mandibular Products - Right Column */}
                  <div className="flex-1 flex flex-col">
                    {/* Mandibular Accordion Header */}
                    <div className="space-y-1">
                      {savedProducts.filter(p => p.addedFrom === "mandibular").length > 0 ? (
                        savedProducts
                          .filter(p => p.addedFrom === "mandibular")
                          .map((savedProduct) => {
                            const isMaxillary = false // All products in this section are mandibular
                            const teeth = savedProduct.mandibularTeeth.sort((a, b) => a - b)
                            const displayTeeth = teeth.length === 1
                              ? `#${teeth[0]}`
                              : teeth.length > 0
                                ? `#${teeth.join(", #")}`
                                : "No teeth selected"

                            return (
                              <Card key={savedProduct.id} className="overflow-hidden border border-gray-200 shadow-sm" style={{ width: '80%', minWidth: '80%' }}>
                                <Accordion
                                  type="single"
                                  collapsible
                                  className="w-full"
                                  value={openAccordion === savedProduct.id ? savedProduct.id : ""}
                                  onValueChange={handleAccordionChange}
                                >
                                  <AccordionItem value={savedProduct.id} className="border-0">
                                    {/* Header */}
                                    <div
                                      className="w-full"
                                      style={{
                                        position: 'relative',
                                        height: '69.92px',
                                        background: openAccordion === savedProduct.id ? '#DFEEFB' : '#F5F5F5',
                                        boxShadow: '0.9px 0.9px 3.6px rgba(0, 0, 0, 0.25)',
                                        borderRadius: openAccordion === savedProduct.id ? '5.4px 5.4px 0px 0px' : '5.4px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        padding: '14px 8px',
                                        gap: '10px'
                                      }}
                                      onClick={() => handleSavedProductCardClick(savedProduct)}
                                    >
                                      <AccordionTrigger
                                        className="hover:no-underline w-full"
                                        style={{
                                          padding: '0px',
                                          gap: '10px',
                                          width: '100%',
                                          height: '100%',
                                          background: 'transparent',
                                          boxShadow: 'none',
                                          borderRadius: '0px'
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleSavedProductCardClick(savedProduct)
                                        }}
                                      >
                                        {/* Frame 2395 */}
                                        <div style={{ width: '697.74px', height: '42.69px', flex: 'none', order: 0, flexGrow: 0, position: 'relative' }}>
                                          {/* Frame 2388 */}
                                          <div style={{ position: 'absolute', width: '639.14px', height: '42.69px', left: '0px', top: '0px' }}>
                                            {/* Product Image */}
                                            <div
                                              style={{
                                                position: 'absolute',
                                                width: '64.04px',
                                                height: '42.69px',
                                                left: '0px',
                                                top: '0px',
                                                background: '#F5F5F5',
                                                borderRadius: '5.4px',
                                                overflow: 'hidden',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                              }}
                                            >
                                              <img
                                                src={savedProduct.product.image_url || "/images/product-default.png"}
                                                alt={savedProduct.product.name}
                                                style={{
                                                  width: '100%',
                                                  height: '100%',
                                                  objectFit: 'contain'
                                                }}
                                                onError={(e) => {
                                                  const target = e.target as HTMLImageElement
                                                  if (target.src !== window.location.origin + "/images/product-default.png") {
                                                    target.src = "/images/product-default.png"
                                                  }
                                                }}
                                              />
                                            </div>

                                            {/* Frame 2387 - Content Area */}
                                            <div style={{ position: 'absolute', width: '565.1px', height: '42px', left: '74.04px', top: '0.34px' }}>
                                              {/* Group 1433 - Tooth Numbers */}
                                              <div style={{ position: 'absolute', width: 'auto', height: '20px', left: '0px', top: '0px' }}>
                                                <span
                                                  style={{
                                                    fontFamily: 'Verdana',
                                                    fontStyle: 'normal',
                                                    fontWeight: 400,
                                                    fontSize: '14.4px',
                                                    lineHeight: '20px',
                                                    letterSpacing: '-0.02em',
                                                    color: '#000000'
                                                  }}
                                                >
                                                  {teeth.length > 0 ? teeth.join(', ') : ''}
                                                </span>
                                              </div>

                                              {/* Frame 2386 - Badges and Info Row */}
                                              <div style={{ position: 'absolute', width: '565.1px', height: '22px', left: '0px', top: '20px', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px', gap: '5px' }}>
                                                {/* Badge - Category */}
                                                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 10px', gap: '10px', width: 'fit-content', height: '17px', background: '#F9F9F9', boxShadow: '1px 1px 3.5px rgba(0, 0, 0, 0.25)', borderRadius: '6px', flex: 'none', order: 0, flexGrow: 0 }}>
                                                  <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', flex: 'none', order: 0, flexGrow: 0 }}>{savedProduct.category}</span>
                                                </div>

                                                {/* Badge - Subcategory */}
                                                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 10px', gap: '10px', width: 'fit-content', height: '17px', background: '#F9F9F9', boxShadow: '1px 1px 3.5px rgba(0, 0, 0, 0.25)', borderRadius: '6px', flex: 'none', order: 1, flexGrow: 0 }}>
                                                  <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', flex: 'none', order: 0, flexGrow: 0 }}>{savedProduct.subcategory}</span>
                                                </div>

                                                {/* Est days */}
                                                <span style={{ width: 'auto', height: '22px', fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', letterSpacing: '-0.02em', color: '#B4B0B0', flex: 'none', order: 4, flexGrow: 0 }}>
                                                  Est days: {savedProduct.product.estimated_days || 10} work days after submission
                                                </span>

                                                {/* Trash Icon */}
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDeleteProduct(savedProduct.id)
                                                  }}
                                                  className="hover:text-red-600 transition-colors"
                                                  style={{
                                                    width: '16px',
                                                    height: '16px',
                                                    color: '#999999',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    flex: 'none',
                                                    order: 5,
                                                    flexGrow: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                  }}
                                                >
                                                  <Trash2 className="w-full h-full" />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Chevron - Positioned relative to header */}
                                        <div style={{ position: 'absolute', width: '21.6px', height: '21.6px', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                                          <ChevronDown
                                            className="w-full h-full transition-transform duration-200 text-black"
                                            style={{
                                              transform: openAccordion === savedProduct.id ? 'rotate(0deg)' : 'rotate(-180deg)'
                                            }}
                                          />
                                        </div>
                                      </AccordionTrigger>
                                    </div>

                                    <AccordionContent className="pt-0" style={{ position: 'relative', minHeight: 'auto' }}>
                                      {/* Summary detail - Same structure as maxillary but for mandibular */}
                                      <div
                                        className="bg-white w-full"
                                        style={{
                                          position: 'relative',
                                          height: 'auto',
                                          minHeight: 'auto',
                                          marginTop: '75px',
                                          paddingLeft: '15.87px',
                                          paddingRight: '15.87px',
                                          paddingBottom: '20px',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'flex-start',
                                          gap: '20px',
                                          background: '#FFFFFF',
                                          boxSizing: 'border-box'
                                        }}
                                      >
                                        {/* Row 1: Product - Material and Retention Type */}
                                        <div
                                          className="flex flex-col sm:flex-row flex-wrap gap-5"
                                          style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignItems: 'flex-start',
                                            padding: '0px',
                                            gap: '20px',
                                            flex: 'none',
                                            order: 0,
                                            alignSelf: 'stretch',
                                            flexGrow: 0
                                          }}
                                        >
                                          {/* Product - Material */}
                                          <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center"
                                              style={{
                                                padding: '12px 39px 5px 15px',
                                                gap: '5px',
                                                width: '100%',
                                                height: '37px',
                                                position: 'relative',
                                                marginTop: '5.27px',
                                                background: '#FFFFFF',
                                                border: '0.740384px solid #7F7F7F',
                                                borderRadius: '7.7px',
                                                boxSizing: 'border-box'
                                              }}
                                            >
                                              <span style={{
                                                fontFamily: 'Verdana',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14.4px',
                                                lineHeight: '20px',
                                                letterSpacing: '-0.02em',
                                                color: '#000000',
                                                whiteSpace: 'nowrap'
                                              }}>{savedProduct.mandibularMaterial || 'Not specified'}</span>
                                            </div>
                                            <label
                                              className="absolute bg-white"
                                              style={{
                                                padding: '0px',
                                                height: '14px',
                                                left: '8.9px',
                                                top: '0px',
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#7F7F7F'
                                              }}
                                            >
                                              Product - Material
                                            </label>
                                          </div>

                                          {/* Retention Type */}
                                          <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center"
                                              style={{
                                                padding: '12px 39px 5px 15px',
                                                gap: '5px',
                                                width: '100%',
                                                height: '37px',
                                                position: 'relative',
                                                marginTop: '5.27px',
                                                background: '#FFFFFF',
                                                border: '0.740384px solid #7F7F7F',
                                                borderRadius: '7.7px',
                                                boxSizing: 'border-box'
                                              }}
                                            >
                                              <span style={{
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#000000',
                                                whiteSpace: 'nowrap'
                                              }}>{savedProduct.mandibularRetention || 'Not specified'}</span>
                                            </div>
                                            <label
                                              className="absolute bg-white"
                                              style={{
                                                padding: '0px',
                                                height: '14px',
                                                left: '9.23px',
                                                top: '0px',
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#7F7F7F'
                                              }}
                                            >
                                              Select Retention type
                                            </label>
                                          </div>
                                        </div>

                                        {/* Row 2: Tooth Shade, Stage */}
                                        <div
                                          className="flex flex-col sm:flex-row flex-wrap gap-5"
                                          style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignItems: 'flex-start',
                                            padding: '0px',
                                            gap: '20px',
                                            flex: 'none',
                                            order: 1,
                                            alignSelf: 'stretch',
                                            flexGrow: 0
                                          }}
                                        >
                                          {/* Tooth Shade */}
                                          <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center"
                                              style={{
                                                padding: '12px 39px 5px 15px',
                                                gap: '5px',
                                                width: '100%',
                                                height: '37px',
                                                background: '#FFFFFF',
                                                border: '0.740384px solid #7F7F7F',
                                                borderRadius: '7.7px',
                                                boxSizing: 'border-box',
                                                position: 'relative',
                                                marginTop: '5.27px'
                                              }}
                                            >
                                              <span style={{
                                                fontFamily: 'Verdana',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14.4px',
                                                lineHeight: '20px',
                                                letterSpacing: '-0.02em',
                                                color: '#000000'
                                              }}>Not specified</span>
                                            </div>
                                            <label
                                              className="absolute bg-white"
                                              style={{
                                                padding: '0px',
                                                height: '14px',
                                                left: '8.9px',
                                                top: '0px',
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#7F7F7F'
                                              }}
                                            >
                                              Tooth Shade
                                            </label>
                                          </div>

                                          {/* Stage */}
                                          <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center"
                                              style={{
                                                padding: '12px 39px 5px 15px',
                                                gap: '5px',
                                                width: '100%',
                                                height: '37px',
                                                position: 'relative',
                                                marginTop: '5.27px',
                                                background: '#FFFFFF',
                                                border: '0.740384px solid #7F7F7F',
                                                borderRadius: '7.7px',
                                                boxSizing: 'border-box'
                                              }}
                                            >
                                              <span style={{
                                                fontFamily: 'Verdana',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14.4px',
                                                lineHeight: '20px',
                                                letterSpacing: '-0.02em',
                                                color: '#000000'
                                              }}>Finish</span>
                                            </div>
                                            <label
                                              className="absolute bg-white"
                                              style={{
                                                padding: '0px',
                                                height: '14px',
                                                left: '8.9px',
                                                top: '0px',
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#7F7F7F'
                                              }}
                                            >
                                              Stage
                                            </label>
                                          </div>
                                        </div>

                                        {/* Row 3: Teeth Selection Display */}
                                        <div
                                          className="flex flex-col sm:flex-row flex-wrap gap-5"
                                          style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignItems: 'flex-start',
                                            padding: '0px',
                                            gap: '20px',
                                            flex: 'none',
                                            order: 2,
                                            alignSelf: 'stretch',
                                            flexGrow: 0
                                          }}
                                        >
                                          {/* Teeth Selection */}
                                          <div className="relative flex-1 min-w-[250px] max-w-[100%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center"
                                              style={{
                                                padding: '12px 15px 5px 15px',
                                                gap: '5px',
                                                width: '100%',
                                                height: '37px',
                                                background: '#FFFFFF',
                                                border: '0.740384px solid #7F7F7F',
                                                borderRadius: '7.7px',
                                                boxSizing: 'border-box',
                                                position: 'relative',
                                                marginTop: '5.27px'
                                              }}
                                            >
                                              <span style={{
                                                fontFamily: 'Verdana',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14.4px',
                                                lineHeight: '20px',
                                                letterSpacing: '-0.02em',
                                                color: '#000000'
                                              }}>{displayTeeth}</span>
                                            </div>
                                            <label
                                              className="absolute bg-white"
                                              style={{
                                                padding: '0px',
                                                height: '14px',
                                                left: '8.9px',
                                                top: '0px',
                                                fontFamily: 'Arial',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '14px',
                                                color: '#7F7F7F'
                                              }}
                                            >
                                              Selected Teeth
                                            </label>
                                          </div>
                                        </div>

                                        {/* Implant Details if available */}
                                        {savedProduct.mandibularImplantDetails && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 3,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[250px] max-w-[100%]" style={{ minHeight: '43px' }}>
                                              <div
                                                className="flex items-start"
                                                style={{
                                                  padding: '12px 15px 5px 15px',
                                                  gap: '5px',
                                                  width: '100%',
                                                  minHeight: '60px',
                                                  background: '#FFFFFF',
                                                  border: '0.740384px solid #7F7F7F',
                                                  borderRadius: '7.7px',
                                                  boxSizing: 'border-box',
                                                  position: 'relative',
                                                  marginTop: '5.27px'
                                                }}
                                              >
                                                <span style={{
                                                  fontFamily: 'Verdana',
                                                  fontStyle: 'normal',
                                                  fontWeight: 400,
                                                  fontSize: '14.4px',
                                                  lineHeight: '20px',
                                                  letterSpacing: '-0.02em',
                                                  color: '#000000'
                                                }}>{savedProduct.mandibularImplantDetails}</span>
                                              </div>
                                              <label
                                                className="absolute bg-white"
                                                style={{
                                                  padding: '0px',
                                                  height: '14px',
                                                  left: '8.9px',
                                                  top: '0px',
                                                  fontFamily: 'Arial',
                                                  fontStyle: 'normal',
                                                  fontWeight: 400,
                                                  fontSize: '14px',
                                                  lineHeight: '14px',
                                                  color: '#7F7F7F'
                                                }}
                                              >
                                                Implant Details
                                              </label>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Action Buttons */}
                                      <div
                                        className="flex flex-wrap justify-center items-center w-full"
                                        style={{
                                          gap: '7.03px',
                                          position: 'relative',
                                          marginTop: '30px',
                                          marginBottom: '15px'
                                        }}
                                      >
                                        {/* Deliver product first - Only show if multiple products */}
                                        {savedProducts.length > 1 && (
                                          <button
                                            className="relative flex flex-col items-center justify-center"
                                            style={{
                                              width: '123.04px',
                                              height: '46.22px',
                                              background: '#F9F9F9',
                                              boxShadow: '0.878154px 0.878154px 3.07354px rgba(0, 0, 0, 0.25)',
                                              borderRadius: '5.26893px',
                                              border: 'none',
                                              cursor: 'pointer',
                                              padding: '0'
                                            }}
                                          >
                                            <div
                                              className="absolute"
                                              style={{
                                                width: '13.91px',
                                                height: '13.91px',
                                                left: '50%',
                                                top: '9.2px',
                                                transform: 'translateX(-50%)',
                                                background: '#FFFFFF',
                                                border: '1.15951px solid #1162A8',
                                                borderRadius: '1.73926px'
                                              }}
                                            />
                                            <span
                                              className="absolute text-center"
                                              style={{
                                                width: '85px',
                                                height: '20px',
                                                left: '50%',
                                                top: '23.11px',
                                                transform: 'translateX(-50%)',
                                                fontFamily: 'Verdana',
                                                fontStyle: 'normal',
                                                fontWeight: 400,
                                                fontSize: '8.78154px',
                                                lineHeight: '19px',
                                                textAlign: 'center',
                                                letterSpacing: '-0.02em',
                                                color: '#000000'
                                              }}
                                            >
                                              Deliver product first
                                            </span>
                                          </button>
                                        )}
                                        <button
                                          onClick={() => {
                                            setCurrentProductForModal(savedProduct)
                                            setCurrentArchForModal("mandibular")
                                            setShowAddOnsModal(true)
                                          }}
                                          className="relative flex flex-col items-center justify-center"
                                          style={{
                                            width: '123.04px',
                                            height: '46.22px',
                                            background: '#F9F9F9',
                                            boxShadow: '0.878154px 0.878154px 3.07354px rgba(0, 0, 0, 0.25)',
                                            borderRadius: '5.26893px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '0'
                                          }}
                                        >
                                          <span
                                            className="absolute text-center"
                                            style={{
                                              width: '41.8px',
                                              height: '20px',
                                              left: '50%',
                                              top: '3.79px',
                                              transform: 'translateX(-50%)',
                                              fontFamily: 'Verdana',
                                              fontStyle: 'normal',
                                              fontWeight: 400,
                                              fontSize: '8.78154px',
                                              lineHeight: '19px',
                                              textAlign: 'center',
                                              letterSpacing: '-0.02em',
                                              color: '#000000'
                                            }}
                                          >
                                            +
                                          </span>
                                          <span
                                            className="absolute text-center"
                                            style={{
                                              width: '89px',
                                              height: '20px',
                                              left: '50%',
                                              top: '23.11px',
                                              transform: 'translateX(-50%)',
                                              fontFamily: 'Verdana',
                                              fontStyle: 'normal',
                                              fontWeight: 400,
                                              fontSize: '8.78154px',
                                              lineHeight: '19px',
                                              textAlign: 'center',
                                              letterSpacing: '-0.02em',
                                              color: '#000000'
                                            }}
                                          >
                                            Add ons (3 selected)
                                          </span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            setCurrentProductForModal(savedProduct)
                                            setShowAttachModal(true)
                                          }}
                                          className="relative flex flex-col items-center justify-center"
                                          style={{
                                            width: '123.04px',
                                            height: '46.22px',
                                            background: '#F9F9F9',
                                            boxShadow: '0.878154px 0.878154px 3.07354px rgba(0, 0, 0, 0.25)',
                                            borderRadius: '5.26893px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '0'
                                          }}
                                        >
                                          <Paperclip
                                            className="absolute"
                                            style={{
                                              width: '8.78px',
                                              height: '10.54px',
                                              left: '50%',
                                              top: '9.34px',
                                              transform: 'translateX(-50%)',
                                              color: '#1E1E1E',
                                              strokeWidth: '0.878154px'
                                            }}
                                          />
                                          <span
                                            className="absolute text-center"
                                            style={{
                                              width: '107px',
                                              height: '20px',
                                              left: '50%',
                                              top: '23.11px',
                                              transform: 'translateX(-50%)',
                                              fontFamily: 'Verdana',
                                              fontStyle: 'normal',
                                              fontWeight: 400,
                                              fontSize: '8.78154px',
                                              lineHeight: '19px',
                                              textAlign: 'center',
                                              letterSpacing: '-0.02em',
                                              color: '#000000'
                                            }}
                                          >
                                            Attach Files (15 uploads)
                                          </span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            setCurrentProductForModal(savedProduct)
                                            setShowRushModal(true)
                                          }}
                                          className="relative flex flex-col items-center justify-center"
                                          style={{
                                            width: '123.04px',
                                            height: '46.22px',
                                            background: '#F9F9F9',
                                            boxShadow: '0px 0px 2.89791px rgba(207, 2, 2, 0.67)',
                                            borderRadius: '5.26893px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '0'
                                          }}
                                        >
                                          <Zap
                                            className="absolute"
                                            style={{
                                              width: '8.78px',
                                              height: '10.54px',
                                              left: '50%',
                                              top: '9.35px',
                                              transform: 'translateX(-50%)',
                                              color: '#CF0202',
                                              fill: '#CF0202',
                                              strokeWidth: '0.878154px'
                                            }}
                                          />
                                          <span
                                            className="absolute text-center"
                                            style={{
                                              width: '59px',
                                              height: '20px',
                                              left: '50%',
                                              top: '23.11px',
                                              transform: 'translateX(-50%)',
                                              fontFamily: 'Verdana',
                                              fontStyle: 'normal',
                                              fontWeight: 400,
                                              fontSize: '8.78154px',
                                              lineHeight: '19px',
                                              textAlign: 'center',
                                              letterSpacing: '-0.02em',
                                              color: '#000000'
                                            }}
                                          >
                                            Request Rush
                                          </span>
                                        </button>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              </Card>
                            )
                          })
                      ) : (
                        <div className="text-gray-400 text-sm py-4">No mandibular products</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer - Consistent across all pages */}
          <div 
            className="bg-white flex-shrink-0 sticky bottom-0 left-0 right-0 z-10"
            style={{
              height: "59.94px",
              background: "#FFFFFF",
            }}
          >
            <div className="flex justify-between items-center h-full px-6 relative">
              {!showProductDetails ? (
                // Regular footer with Previous button on right
                <div className="flex justify-end w-full">
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: "12px 16px",
                      gap: "10px",
                      minWidth: "111px",
                      height: "27px",
                      background: "#1162A8",
                      borderRadius: "6px",
                      border: "none",
                      fontFamily: "Verdana",
                      fontStyle: "normal",
                      fontWeight: 700,
                      fontSize: "12px",
                      lineHeight: "22px",
                      letterSpacing: "-0.02em",
                      color: "#FFFFFF",
                      whiteSpace: "nowrap",
                    }}
                    className="hover:opacity-90"
                  >
                    Previous
                  </Button>
                </div>
              ) : (
                // Teeth selection page footer: Preview on left, Cancel and Submit on right
                <>
                  {/* Preview button on left */}
                  <Button
                    onClick={handlePreview}
                    variant="outline"
                    style={{
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: "12px 16px",
                      gap: "10px",
                      minWidth: "111px",
                      height: "34px",
                      border: "2px solid #9BA5B7",
                      borderRadius: "6px",
                      fontFamily: "Verdana",
                      fontStyle: "normal",
                      fontWeight: 700,
                      fontSize: "12px",
                      lineHeight: "22px",
                      letterSpacing: "-0.02em",
                      color: "#9BA5B7",
                      background: "transparent",
                      whiteSpace: "nowrap",
                    }}
                    className="hover:opacity-80"
                  >
                    <Eye 
                      style={{
                        width: "24px",
                        height: "24px",
                        flex: "none",
                        order: 0,
                        flexGrow: 0,
                      }}
                    />
                    <span
                      style={{
                        height: "22px",
                        display: "flex",
                        alignItems: "center",
                        flex: "none",
                        order: 1,
                        flexGrow: 0,
                      }}
                    >
                      Preview
                    </span>
                  </Button>
                  
                  {/* Cancel and Submit buttons on right */}
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => setShowCancelModal(true)}
                      variant="outline"
                      style={{
                        boxSizing: "border-box",
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: "12px 16px",
                        gap: "10px",
                        minWidth: "111px",
                        height: "27px",
                        border: "2px solid #9BA5B7",
                        borderRadius: "6px",
                        fontFamily: "Verdana",
                        fontStyle: "normal",
                        fontWeight: 700,
                        fontSize: "12px",
                        lineHeight: "22px",
                        letterSpacing: "-0.02em",
                        color: "#9BA5B7",
                        background: "transparent",
                        whiteSpace: "nowrap",
                      }}
                      className="hover:opacity-80"
                    >
                      Cancel
                    </Button>
                    {/* Submit Case button with tooltip */}
                    <div className="relative">
                      <Button
                        onClick={(e) => {
                          e.preventDefault()
                          if (!confirmDetailsChecked) {
                            setShowSubmitPopover(true)
                          } else {
                            setShowSubmitPopover(false)
                            handleSubmit()
                          }
                        }}
                        disabled={isSubmitting}
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          justifyContent: "center",
                          alignItems: "center",
                          padding: "12px 16px",
                          gap: "10px",
                          minWidth: "111px",
                          height: "27px",
                          background: isSubmitting ? "#9BA5B7" : "#1162A8",
                          borderRadius: "6px",
                          border: "none",
                          fontFamily: "Verdana",
                          fontStyle: "normal",
                          fontWeight: 700,
                          fontSize: "12px",
                          lineHeight: "22px",
                          letterSpacing: "-0.02em",
                          color: "#FFFFFF",
                          opacity: isSubmitting ? 0.5 : 1,
                          cursor: isSubmitting ? "not-allowed" : "pointer",
                          whiteSpace: "nowrap",
                        }}
                        className="hover:opacity-90 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 
                              style={{
                                width: "24px",
                                height: "24px",
                                flex: "none",
                                order: 0,
                                flexGrow: 0,
                              }}
                              className="animate-spin" 
                            />
                            <span
                              style={{
                                flex: "none",
                                order: 1,
                                flexGrow: 0,
                              }}
                            >
                              Submitting...
                            </span>
                          </>
                        ) : (
                          <span
                            style={{
                              height: "22px",
                              display: "flex",
                              alignItems: "center",
                              flex: "none",
                              order: 1,
                              flexGrow: 0,
                            }}
                          >
                            Submit Case
                          </span>
                        )}
                      </Button>
                      
                      {/* Tooltip - shown when submit is clicked, stays visible until submit is clicked again */}
                      {showSubmitPopover && (
                        <div className="absolute bottom-full right-0 mb-2 z-50">
                          <div className="relative bg-orange-100 border border-orange-200 rounded-lg px-4 py-3 shadow-lg">
                            <div className="absolute -bottom-2 right-6 w-4 h-4 bg-orange-100 border-r border-b border-orange-200 transform rotate-45"></div>
                            <div className="flex items-center gap-3 whitespace-nowrap">
                              <Checkbox
                                id="confirm-details-tooltip"
                                checked={confirmDetailsChecked}
                                onCheckedChange={(checked) => {
                                  setConfirmDetailsChecked(checked === true)
                                }}
                                className="flex-shrink-0"
                                style={{
                                  borderColor: "#1162a8",
                                  backgroundColor: confirmDetailsChecked ? "#1162a8" : "transparent",
                                }}
                              />
                              <label
                                htmlFor="confirm-details-tooltip"
                                className="text-sm text-orange-800 cursor-pointer whitespace-nowrap"
                              >
                                You confirm all details are correct by submitting case.
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {/* Add Ons Modal */}
      {currentProductForModal && currentArchForModal && currentProductForModal.product && (
        <AddOnsModal
          isOpen={showAddOnsModal}
          onClose={() => {
            console.log("🚪 Closing Add Ons Modal")
            setShowAddOnsModal(false)
            setCurrentProductForModal(null)
            setCurrentArchForModal(null)
          }}
          onAddAddOns={(addOns) => {
            // Handle addons addition - update the saved product
            setSavedProducts((prev) =>
              prev.map((product) =>
                product.id === currentProductForModal.id
                  ? {
                      ...product,
                      ...(currentArchForModal === "maxillary"
                        ? { maxillaryAddOnsStructured: addOns }
                        : { mandibularAddOnsStructured: addOns }),
                    }
                  : product
              )
            )
            toast({
              title: "Add-ons Added",
              description: `${addOns.length} add-on(s) have been added to the ${currentArchForModal} product`,
            })
            setShowAddOnsModal(false)
            setCurrentProductForModal(null)
            setCurrentArchForModal(null)
          }}
          labId={selectedLab?.id || 0}
          productId={String(currentProductForModal.product.id)}
          arch={currentArchForModal}
        />
      )}

      {/* File Attachment Modal */}
      <Dialog open={showAttachModal} onOpenChange={setShowAttachModal}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden">
          <FileAttachmentModalContent
            setShowAttachModal={setShowAttachModal}
            isCaseSubmitted={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Rush Request Modal */}
      {currentProductForModal && (
        <RushRequestModal
          isOpen={showRushModal}
          onClose={() => {
            setShowRushModal(false)
            setCurrentProductForModal(null)
          }}
          onConfirm={(rushData) => {
            // Handle rush request confirmation - update the saved product
            setSavedProducts((prev) =>
              prev.map((product) =>
                product.id === currentProductForModal.id
                  ? {
                      ...product,
                      rushData: {
                        targetDate: rushData.targetDate || "",
                        daysSaved: rushData.daysSaved,
                        rushPercentage: rushData.rushPercentage,
                        rushFee: rushData.rushFee,
                        totalPrice: rushData.totalPrice,
                      },
                    }
                  : product
              )
            )
            toast({
              title: "Rush Request Added",
              description: "Rush request has been added to the product",
            })
            setShowRushModal(false)
            setCurrentProductForModal(null)
          }}
          product={{
            name: currentProductForModal.product.name || "Product",
            stage: currentProductForModal.maxillaryStage || currentProductForModal.mandibularStage || "Not specified",
            deliveryDate: new Date().toISOString(), // You may want to get this from saved product data
            price: currentProductForModal.product.price || 0,
          }}
        />
      )}

      {/* Cancel Slip Creation Modal */}
      <CancelSlipCreationModal
        open={showCancelModal}
        onCancel={() => setShowCancelModal(false)}
        onConfirm={() => {
          setShowCancelModal(false)
          clearSlipCreationStorage()
          router.push("/dashboard")
        }}
      />

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        caseData={getPreviewCaseData()}
      />

    </div>
  )
}

