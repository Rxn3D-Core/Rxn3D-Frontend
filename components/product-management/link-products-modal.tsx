"use client"

import { useState, useEffect, useRef } from "react"
import { X, Search, Package, Square, Upload, Image as ImageIcon, Loader2, Trash2 } from "lucide-react"
import { getStageVariations } from "@/services/stage-variations-api"
import { getMaterialVariations } from "@/services/material-variations-api"
import { getRetentionVariations } from "@/services/retention-variations-api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useStages, type Stage } from "@/contexts/product-stages-context"
import { useMaterials, type Material } from "@/contexts/product-materials-context"
import { useImpressions, type Impression } from "@/contexts/product-impression-context"
import { useRetention } from "@/contexts/product-retention-context"
import { useGrades } from "@/contexts/product-grades-context"
import { useTranslation } from "react-i18next"
import { DiscardChangesDialog } from "./discard-changes-dialog"
import { linkStagesToProducts, buildLinkPayload } from "@/services/stage-product-link-api"
import { fetchStageProductConnections, type StageWithProducts } from "@/services/stage-product-connections-api"
import { linkMaterialsToProducts, buildMaterialLinkPayload } from "@/services/material-product-link-api"
import { linkImpressionsToProducts, buildImpressionLinkPayload } from "@/services/impression-product-link-api"
import { linkRetentionsToProducts, buildRetentionLinkPayload } from "@/services/retention-product-link-api"
import { linkRetentionOptionsToProductsCategories, buildRetentionOptionLinkPayload } from "@/services/retention-option-product-link-api"
import { useToast } from "@/hooks/use-toast"
import { LoadingOverlay } from "@/components/ui/loading-overlay"
import { getRetentionOptions } from "@/services/retention-options-api"
import { useAuth } from "@/contexts/auth-context"

// Helper function to get auth token
const getAuthToken = () => {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('token') || ''
}

interface Product {
  id: number
  name: string
  category: string
  imageStatus: "none" | "some" | "all"
  isSelected: boolean
  stages?: any[]
  materials?: any[]
  impressions?: any[]
  retentions?: any[]
  grades?: any[] // Add grades for product-level grade pricing
}

type EntityType = "stage" | "material" | "impression" | "retention" | "retention-option"

interface LinkProductsModalProps {
  isOpen: boolean
  onClose: () => void
  entityType?: EntityType // Type of entity being linked (stage, material, impression)
  context?: "global" | "lab" // Add context prop to differentiate between global and lab usage
  onApply?: (selectedEntities: number[], selectedProducts: number[]) => void // Custom apply handler
  customProducts?: Product[] // Allow custom product data to be passed in
}

// Mock data removed - now using API data from /library/products endpoint

export function LinkProductsModal({ isOpen, onClose, entityType = "stage", context = "global", onApply, customProducts }: LinkProductsModalProps) {
  const { stages } = useStages()
  const { materials } = useMaterials()
  const { impressions } = useImpressions()
  const { retentions } = useRetention()
  const { grades, fetchGrades } = useGrades()
  const { t } = useTranslation()
  const { toast } = useToast()
  const { user } = useAuth()

  // State for retention options
  const [retentionOptions, setRetentionOptions] = useState<any[]>([])
  const [isLoadingRetentionOptions, setIsLoadingRetentionOptions] = useState(false)

  // Get entities based on entityType
  const getEntities = () => {
    switch (entityType) {
      case "material":
        return materials
      case "impression":
        return impressions
      case "retention":
        return retentions
      case "retention-option":
        return retentionOptions
      case "stage":
      default:
        return stages
    }
  }

  const entities = getEntities()

  // Get entity name for labels
  const getEntityName = (singular: boolean = false) => {
    switch (entityType) {
      case "material":
        return singular ? "Material" : "Materials"
      case "impression":
        return singular ? "Impression" : "Impressions"
      case "retention":
        return singular ? "Retention" : "Retentions"
      case "retention-option":
        return singular ? "Retention Option" : "Retention Options"
      case "stage":
      default:
        return singular ? "Stage" : "Stages"
    }
  }

  const [selectedEntities, setSelectedEntities] = useState<number[]>([]) // Multiple entity selection
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"individual" | "category">("individual")
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null)
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // API state
  const [apiProducts, setApiProducts] = useState<Product[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Stage-product connections state
  const [stageProductConnections, setStageProductConnections] = useState<StageWithProducts[]>([])

  // Category selection state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // Image upload state - stores images for each product-entity combination
  const [uploadedImages, setUploadedImages] = useState<Record<string, File>>({})
  // Image preview URLs for displaying thumbnails
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({})
  // Ref to track preview URLs for cleanup without causing re-renders
  const imagePreviewsRef = useRef<Record<string, string>>({})
  // Track selected variation names for display
  const [selectedVariationNames, setSelectedVariationNames] = useState<Record<string, string>>({})
  // Track selected variation IDs for API submission
  const [selectedVariationIds, setSelectedVariationIds] = useState<Record<string, number | null>>({})

  // Grade pricing state - stores editable grade prices for each product-stage-grade combination
  // Key format: `${productId}-${stageId}-${gradeId}`
  const [gradePrices, setGradePrices] = useState<Record<string, number>>({})

  // Retention pricing state - stores editable retention prices for each product-retention combination
  // Key format: `${productId}-${retentionId}`
  const [retentionPrices, setRetentionPrices] = useState<Record<string, number>>({})

  // Variation selection modal state
  const [showVariationModal, setShowVariationModal] = useState(false)
  const [currentProductId, setCurrentProductId] = useState<number | null>(null)
  const [currentEntityId, setCurrentEntityId] = useState<number | null>(null)
  const [variations, setVariations] = useState<any[]>([])
  const [isLoadingVariations, setIsLoadingVariations] = useState(false)
  const [selectedVariationId, setSelectedVariationId] = useState<number | null>(null)
  
  // Image preview modal state
  const [showImagePreviewModal, setShowImagePreviewModal] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [previewImageName, setPreviewImageName] = useState<string>("")

  // Use custom products if provided, otherwise use API data
  const products = customProducts || apiProducts

  // Get unique categories from products
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)))

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      if (customProducts || !isOpen) return

      setIsLoadingProducts(true)
      setProductsError(null)

      try {
        // Get lab ID from localStorage
        const role = typeof window !== "undefined" ? localStorage.getItem("role") : null
        
        // For superadmin, get customerId from localStorage if available, otherwise skip labId requirement
        let labId: string | null = null
        let customerId: string | null = null
        
        if (role === "superadmin") {
          // For superadmin, try to get customerId from localStorage, but don't require it
          customerId = typeof window !== "undefined" ? localStorage.getItem("customerId") : null
          // Use customerId as labId for API calls if available, otherwise use 0 as fallback
          labId = customerId || "0"
        } else {
          labId = role === "office_admin" || role === "doctor"
            ? (typeof window !== "undefined" ? localStorage.getItem("selectedLabId") : null)
            : (typeof window !== "undefined" ? localStorage.getItem("customerId") : null)

          if (!labId) {
            throw new Error("Lab ID not found")
          }
        }

        // Use library/products API for all entity types
        const token = getAuthToken()
        if (!token) {
          throw new Error("Authentication token not found")
        }

        // Build URL with query parameters
        const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/library/products`)
        url.searchParams.append('per_page', '100')
        url.searchParams.append('order_by', 'name')
        url.searchParams.append('sort_by', 'asc')
        
        // Add customer_id based on role
        if (role === "superadmin") {
          // For superadmin, customer_id is optional
          if (customerId) {
            url.searchParams.append('customer_id', customerId)
          }
        } else {
          // For other roles, customer_id is required (use labId as customer_id)
          if (labId) {
            url.searchParams.append('customer_id', labId)
          }
        }

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.status === 401) {
          window.location.href = '/login'
          throw new Error('Unauthorized - Redirecting to login')
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.status}`)
        }

        const json = await response.json()
        const productsData = json.data?.data || json.data || []

        // Transform API response to match Product interface
        const transformedProducts: Product[] = productsData.map((item: any) => {
          // Calculate image status based on stages
          let imageStatus: "none" | "some" | "all" = "none"
          if (item.stages && item.stages.length > 0) {
            // For now, set to "none" - you can implement logic to check actual image configuration
            imageStatus = "none"
          }

          return {
            id: item.id,
            name: item.name,
            category: item.subcategory_name || item.category_name || "Uncategorized",
            imageStatus,
            isSelected: false,
            stages: item.stages || []
          }
        })

        setApiProducts(transformedProducts)

        // For stage entity type, also fetch stage-product connections to get existing connection data
        if (entityType === "stage") {
          try {
            // For superadmin, don't pass customer_id parameter
            const customerIdForApi = role === "superadmin" ? undefined : Number(labId)
            const connectionsResponse = await fetchStageProductConnections(customerIdForApi)
            // Store the stage-product connections for displaying existing data
            setStageProductConnections(connectionsResponse.data)
          } catch (error) {
            // If fetching connections fails, continue without them
            console.warn("Failed to fetch stage-product connections:", error)
            setStageProductConnections([])
          }
        }
      } catch (error: any) {
        console.error("Error fetching products:", error)
        setProductsError(error.message || "Failed to load products")
      } finally {
        setIsLoadingProducts(false)
      }
    }

    fetchProducts()
  }, [isOpen, customProducts, entityType])

  // Fetch grades when modal opens
  useEffect(() => {
    if (isOpen && entityType === "stage") {
      fetchGrades(1, 100) // Fetch all grades (assuming max 100)
    }
  }, [isOpen, entityType, fetchGrades])

  // Fetch retention options when modal opens and entityType is retention-option
  useEffect(() => {
    const fetchRetentionOptionsData = async () => {
      if (!isOpen || entityType !== "retention-option") {
        setRetentionOptions([])
        return
      }

      setIsLoadingRetentionOptions(true)
      try {
        // Get customer ID similar to how it's done in the retention option pages
        const getCustomerId = () => {
          if (typeof window === "undefined") return null
          
          const storedCustomerId = localStorage.getItem("customerId")
          if (storedCustomerId) {
            return parseInt(storedCustomerId, 10)
          }

          if (user?.customers && user.customers.length > 0) {
            return user.customers[0].id
          }

          if (user?.customer_id) {
            return user.customer_id
          }

          if (user?.customer?.id) {
            return user.customer.id
          }

          return null
        }

        const customerId = getCustomerId()
        
        // For global context (superadmin), don't pass customer_id
        // For lab context, pass customer_id if available
        const response = await getRetentionOptions({
          per_page: 100,
          page: 1,
          order_by: "name",
          sort_by: "asc",
          // Only pass customer_id for lab context, not for global
          ...(context === "lab" && customerId ? { customer_id: customerId } : {}),
        })

        if (response.status && response.data) {
          setRetentionOptions(response.data.data || [])
        } else {
          setRetentionOptions([])
        }
      } catch (error: any) {
        console.error("Error fetching retention options:", error)
        toast({
          title: t("error") || "Error",
          description: error.message || t("Failed to fetch retention options", "Failed to fetch retention options"),
          variant: "destructive",
        })
        setRetentionOptions([])
      } finally {
        setIsLoadingRetentionOptions(false)
      }
    }

    fetchRetentionOptionsData()
  }, [isOpen, entityType, context, user, toast, t])

  // Reset selections when modal opens/closes or entityType changes
  useEffect(() => {
    if (!isOpen) {
      setSelectedEntities([])
      setSelectedProducts([])
      setHasChanges(false)
      setGradePrices({})
      setRetentionPrices({})
    }
  }, [isOpen, entityType])

  // Initialize selected products with pre-selected items from the products data
  useEffect(() => {
    if (products.length > 0 && selectedProducts.length === 0 && isOpen) {
      const preSelected = products.filter(p => p.isSelected).map(p => p.id)
      setSelectedProducts(preSelected)
    }
  }, [products, selectedProducts.length, isOpen])

  // Filter products based on search query
  const filteredProducts = products.filter(product => {
    // If no search query, show all products
    if (!searchQuery.trim()) {
      return true
    }

    // Internal search: search by product name, category, and other relevant fields
    const searchLower = searchQuery.toLowerCase().trim()
    const matchesName = product.name.toLowerCase().includes(searchLower)
    const matchesCategory = product.category?.toLowerCase().includes(searchLower) || false
    
    // Search in grade names if available
    const matchesGrade = product.grades?.some((grade: any) => 
      grade.name?.toLowerCase().includes(searchLower) || 
      grade.code?.toLowerCase().includes(searchLower)
    ) || false

    // Search in stage names if available
    const matchesStage = product.stages?.some((stage: any) => 
      stage.name?.toLowerCase().includes(searchLower) || 
      stage.code?.toLowerCase().includes(searchLower)
    ) || false

    return matchesName || matchesCategory || matchesGrade || matchesStage
  })

  const handleEntitySelect = (entityId: number, checked: boolean) => {
    if (checked) {
      setSelectedEntities([...selectedEntities, entityId])
    } else {
      setSelectedEntities(selectedEntities.filter(id => id !== entityId))
    }
    setHasChanges(true)
  }

  const handleProductSelect = (productId: number, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId])
    } else {
      setSelectedProducts(selectedProducts.filter(id => id !== productId))
    }
    setHasChanges(true)
  }

  const handleSelectAllEntities = () => {
    if (selectedEntities.length === entities.length) {
      setSelectedEntities([])
    } else {
      setSelectedEntities(entities.map((entity: any) => entity.id))
    }
    setHasChanges(true)
  }

  const handleSelectAllProducts = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(filteredProducts.map(product => product.id))
    }
    setHasChanges(true)
  }

  const handleCategorySelect = (category: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, category])
      // Select all products in this category
      const categoryProducts = products.filter(p => p.category === category).map(p => p.id)
      const newSelection = Array.from(new Set([...selectedProducts, ...categoryProducts]))
      setSelectedProducts(newSelection)
    } else {
      setSelectedCategories(selectedCategories.filter(c => c !== category))
      // Deselect all products in this category
      const categoryProducts = products.filter(p => p.category === category).map(p => p.id)
      setSelectedProducts(selectedProducts.filter(id => !categoryProducts.includes(id)))
    }
    setHasChanges(true)
  }

  const handleSelectAllCategories = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([])
      setSelectedProducts([])
    } else {
      setSelectedCategories([...categories])
      setSelectedProducts(products.map(p => p.id))
    }
    setHasChanges(true)
  }

  const handleImageUpload = (productId: number, entityId: number, file: File | null) => {
    const key = `${productId}-${entityId}`
    if (file) {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      setUploadedImages(prev => ({
        ...prev,
        [key]: file
      }))
      setImagePreviews(prev => ({
        ...prev,
        [key]: previewUrl
      }))
      // Clear variation name and ID when uploading new file
      setSelectedVariationNames(prev => {
        const newNames = { ...prev }
        delete newNames[key]
        return newNames
      })
      setSelectedVariationIds(prev => {
        const newIds = { ...prev }
        delete newIds[key]
        return newIds
      })
      setHasChanges(true)
      toast({
        title: "Image Uploaded",
        description: `Image uploaded for ${file.name}`,
      })
    } else {
      // Remove image and cleanup preview URL
      setUploadedImages(prev => {
        const newImages = { ...prev }
        delete newImages[key]
        return newImages
      })
      setImagePreviews(prev => {
        const newPreviews = { ...prev }
        if (newPreviews[key] && newPreviews[key].startsWith('blob:')) {
          URL.revokeObjectURL(newPreviews[key])
        }
        delete newPreviews[key]
        return newPreviews
      })
      // Clear variation name and ID
      setSelectedVariationNames(prev => {
        const newNames = { ...prev }
        delete newNames[key]
        return newNames
      })
      setSelectedVariationIds(prev => {
        const newIds = { ...prev }
        delete newIds[key]
        return newIds
      })
      setHasChanges(true)
    }
  }

  const handleClearAllImages = (productId: number) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    // Get the appropriate property based on entityType
    const entityList = entityType === "material" 
      ? (product.materials || [])
      : entityType === "impression"
      ? (product.impressions || [])
      : entityType === "retention"
      ? (product.retentions || [])
      : (product.stages || [])

    setUploadedImages(prev => {
      const newImages = { ...prev }
      entityList.forEach((entity: any) => {
        const key = `${productId}-${entity.id}`
        delete newImages[key]
      })
      return newImages
    })
    setImagePreviews(prev => {
      const newPreviews = { ...prev }
      entityList.forEach((entity: any) => {
        const key = `${productId}-${entity.id}`
        if (newPreviews[key]) {
          URL.revokeObjectURL(newPreviews[key])
          delete newPreviews[key]
        }
      })
      return newPreviews
    })
    setHasChanges(true)
    toast({
      title: "Images Cleared",
      description: "All images cleared for this product",
    })
  }

  // Handler to delete individual image
  const handleDeleteImage = (productId: number, entityId: number) => {
    handleImageUpload(productId, entityId, null)
  }

  // Fetch variations for an entity
  const fetchVariations = async (entityId: number) => {
    setIsLoadingVariations(true)
    try {
      let response: any
      switch (entityType) {
        case "material":
          response = await getMaterialVariations({ material_id: entityId, per_page: 100 })
          break
        case "retention":
          response = await getRetentionVariations({ retention_id: entityId, per_page: 100 })
          break
        case "stage":
        default:
          response = await getStageVariations({ stage_id: entityId, per_page: 100 })
          break
      }
      setVariations(response.data.data || [])
    } catch (error) {
      console.error("Failed to fetch variations:", error)
      setVariations([])
    } finally {
      setIsLoadingVariations(false)
    }
  }

  // Open variation selection modal
  const handleOpenVariationModal = async (productId: number, entityId: number) => {
    setCurrentProductId(productId)
    setCurrentEntityId(entityId)
    setShowVariationModal(true)
    setSelectedVariationId(null)
    await fetchVariations(entityId)
  }

  // Handle variation selection
  const handleSelectVariation = (variation: any) => {
    if (!currentProductId || !currentEntityId) return

    setSelectedVariationId(variation.id)

    // Small delay to show selection feedback before closing
    setTimeout(() => {
      const imageKey = `${currentProductId}-${currentEntityId}`

      // Store the variation URL as preview
      setImagePreviews(prev => ({
        ...prev,
        [imageKey]: variation.image_url
      }))

      // Store the variation name for display
      setSelectedVariationNames(prev => ({
        ...prev,
        [imageKey]: variation.name
      }))

      // Store the variation ID for API submission
      setSelectedVariationIds(prev => ({
        ...prev,
        [imageKey]: variation.id
      }))

      // Create a mock file object to track that an image is selected
      // We'll use the variation URL when submitting
      const mockFile = new File([], variation.name, { type: 'image/jpeg' })
      setUploadedImages(prev => ({
        ...prev,
        [imageKey]: mockFile
      }))

      setHasChanges(true)
      setShowVariationModal(false)
      setSelectedVariationId(null)

      toast({
        title: "Variation Selected",
        description: `Selected "${variation.name}"`,
      })
    }, 200)
  }

  // Handle upload new photo
  const handleUploadNewPhoto = () => {
    if (!currentProductId || !currentEntityId) return
    
    const imageKey = `${currentProductId}-${currentEntityId}`
    const fileInputId = `file-${imageKey}`
    
    setShowVariationModal(false)
    setSelectedVariationId(null)
    
    // Trigger file input click
    setTimeout(() => {
      document.getElementById(fileInputId)?.click()
    }, 100)
  }

  // Handle grade price change
  const handleGradePriceChange = (productId: number, stageId: number, gradeId: number, price: string) => {
    const key = `${productId}-${stageId}-${gradeId}`
    const numericPrice = parseFloat(price) || 0
    setGradePrices(prev => ({
      ...prev,
      [key]: numericPrice
    }))
    setHasChanges(true)
  }

  // Get grade price for a product-stage-grade combination
  const getGradePrice = (productId: number, stageId: number, gradeId: number, defaultValue: number = 0): number => {
    const key = `${productId}-${stageId}-${gradeId}`
    return gradePrices[key] !== undefined ? gradePrices[key] : defaultValue
  }

  // Handle retention price change
  const handleRetentionPriceChange = (productId: number, retentionId: number, price: string) => {
    const key = `${productId}-${retentionId}`
    // If price is empty, remove it from state (will send null to API)
    // Allow 0 as a valid price
    if (!price || price.trim() === '') {
      setRetentionPrices(prev => {
        const newPrices = { ...prev }
        delete newPrices[key]
        return newPrices
      })
    } else {
      const numericPrice = parseFloat(price)
      // Only set if it's a valid number (including 0)
      if (!isNaN(numericPrice)) {
        setRetentionPrices(prev => ({
          ...prev,
          [key]: numericPrice
        }))
      }
    }
    setHasChanges(true)
  }

  // Get retention price for a product-retention combination
  const getRetentionPrice = (productId: number, retentionId: number, defaultValue: number | null = null): number | null => {
    const key = `${productId}-${retentionId}`
    return retentionPrices[key] !== undefined ? retentionPrices[key] : defaultValue
  }

  // Initialize grade prices, variation IDs, and images from existing data when products are loaded
  useEffect(() => {
    if (entityType === "stage" && stageProductConnections.length > 0) {
      const initialPrices: Record<string, number> = {}
      const initialVariationIds: Record<string, number | null> = {}
      const initialImagePreviews: Record<string, string> = {}
      const initialVariationNames: Record<string, string> = {}
      
      stageProductConnections.forEach((stageData) => {
        stageData.products.forEach((connection) => {
          const imageKey = `${connection.product.id}-${stageData.stage.id}`
          
          // Initialize variation ID, image, and name if available
          if (connection.stage_variation) {
            if (connection.stage_variation.id) {
              initialVariationIds[imageKey] = connection.stage_variation.id
            }
            if (connection.stage_variation.image_url) {
              initialImagePreviews[imageKey] = connection.stage_variation.image_url
            }
            if (connection.stage_variation.name) {
              initialVariationNames[imageKey] = connection.stage_variation.name
            }
          }
          
          // Initialize grade prices
          if (grades.length > 0) {
            if (connection.grades && connection.grades.length > 0) {
              connection.grades.forEach((gradePrice: any) => {
                const key = `${connection.product.id}-${stageData.stage.id}-${gradePrice.grade.id}`
                initialPrices[key] = parseFloat(gradePrice.price) || 0
              })
            } else {
              // Initialize with default prices if no grades exist
              grades.forEach((grade) => {
                const key = `${connection.product.id}-${stageData.stage.id}-${grade.id}`
                const stagePriceValue = stageData.products[0]?.lab_data?.price
                const stagePrice = typeof stagePriceValue === 'number' 
                  ? stagePriceValue 
                  : parseFloat(String(stagePriceValue || '0'))
                initialPrices[key] = stagePrice
              })
            }
          }
        })
      })
      
      setGradePrices(prev => ({ ...prev, ...initialPrices }))
      setSelectedVariationIds(prev => ({ ...prev, ...initialVariationIds }))
      setImagePreviews(prev => ({ ...prev, ...initialImagePreviews }))
      setSelectedVariationNames(prev => ({ ...prev, ...initialVariationNames }))
    }
  }, [stageProductConnections, grades, entityType])

  // Update ref whenever imagePreviews changes
  useEffect(() => {
    imagePreviewsRef.current = imagePreviews
  }, [imagePreviews])

  // Cleanup preview URLs when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Cleanup all preview URLs when modal closes
      Object.values(imagePreviewsRef.current).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
      setImagePreviews({})
      imagePreviewsRef.current = {}
      setSelectedVariationNames({})
      setSelectedVariationIds({})
      setShowVariationModal(false)
      setCurrentProductId(null)
      setCurrentEntityId(null)
      setVariations([])
    }
  }, [isOpen])

  const getImageStatusIcon = (status: string) => {
    switch (status) {
      case "all":
        return <div className="w-3 h-3 bg-green-500 rounded-full" />
      case "some":
        return <div className="w-3 h-3 bg-yellow-500 rounded-full" />
      case "none":
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />
    }
  }

  const getImageStatusText = (status: string) => {
    switch (status) {
      case "all":
        return "All Image Configured"
      case "some":
        return "Some Image Configured"
      case "none":
      default:
        return "No Image Configured"
    }
  }

  // Helper function to get stage-product connection data
  const getStageProductConnection = (productId: number, stageId: number) => {
    if (entityType !== "stage" || stageProductConnections.length === 0) return null
    
    const stageData = stageProductConnections.find(s => s.stage.id === stageId)
    if (!stageData) return null
    
    return stageData.products.find(p => p.product.id === productId) || null
  }

  // Calculate image status for a product based on uploaded images and selected entities
  const calculateImageStatus = (productId: number): "none" | "some" | "all" => {
    // If product is not selected, return "none"
    if (!selectedProducts.includes(productId)) {
      return "none"
    }

    // If no entities are selected, return "none"
    if (selectedEntities.length === 0) {
      return "none"
    }

    // Count how many selected entities have images uploaded for this product
    let imagesCount = 0
    selectedEntities.forEach((entityId) => {
      const imageKey = `${productId}-${entityId}`
      if (uploadedImages[imageKey]) {
        imagesCount++
      }
    })

    // Determine status based on image count
    if (imagesCount === 0) {
      return "none"
    } else if (imagesCount === selectedEntities.length) {
      return "all"
    } else {
      return "some"
    }
  }

  const handleApply = async () => {
    // Use custom apply handler if provided
    if (onApply) {
      onApply(selectedEntities, selectedProducts)
      setHasChanges(false)
      onClose()
      return
    }

    // Default behavior - call API to link entities to products
    if (selectedEntities.length === 0 || selectedProducts.length === 0) {
      toast({
        title: "Selection Required",
        description: `Please select at least one ${getEntityName(true).toLowerCase()} and one product.`,
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      let response: any

      // Call the appropriate API based on entityType
      switch (entityType) {
        case "material": {
          const payload = buildMaterialLinkPayload(
            selectedEntities,
            selectedProducts,
            products,
            materials,
            selectedVariationIds,
            uploadedImages,
            imagePreviews
          )
          response = await linkMaterialsToProducts(payload)
          break
        }
        case "impression": {
          const payload = buildImpressionLinkPayload(
            selectedEntities,
            selectedProducts,
            products,
            impressions
          )
          response = await linkImpressionsToProducts(payload)
          break
        }
        case "retention": {
          const payload = buildRetentionLinkPayload(
            selectedEntities,
            selectedProducts,
            products,
            retentions,
            retentionPrices
          )
          response = await linkRetentionsToProducts(payload)
          break
        }
        case "retention-option": {
          const payload = buildRetentionOptionLinkPayload(
            selectedEntities,
            selectedProducts,
            products,
            retentionOptions
          )
          response = await linkRetentionOptionsToProductsCategories(payload)
          break
        }
        case "stage":
        default: {
          const payload = buildLinkPayload(
            selectedEntities,
            selectedProducts,
            products,
            stages,
            gradePrices,
            selectedVariationIds,
            grades
          )
          response = await linkStagesToProducts(payload)
          break
        }
      }

      // Check both 'success' and 'status' fields for compatibility
      const isSuccess = response.success || response.status

      if (isSuccess) {
        console.log("API call successful - closing modal")
        toast({
          title: "Success",
          description: response.message || `${getEntityName()} linked to products successfully!`,
        })
        setHasChanges(false)

        // Update image status for linked products
        setApiProducts(prevProducts =>
          prevProducts.map(product => {
            if (selectedProducts.includes(product.id)) {
              // Product was just linked with entities - update status to "some"
              const entityProperty = entityType === "material" ? "materials" 
                : entityType === "impression" ? "impressions" 
                : entityType === "retention" ? "retentions" 
                : entityType === "retention-option" ? "retention_options"
                : "stages"
              return {
                ...product,
                imageStatus: "some" as const,
                [entityProperty]: [
                  ...(product[entityProperty as keyof Product] as any[] || []),
                  ...selectedEntities.map(entityId => {
                    const entity = entities.find((e: any) => e.id === entityId)
                    return entity
                  }).filter(Boolean)
                ]
              }
            }
            return product
          })
        )

        // Reset selections
        setSelectedEntities([])
        setSelectedProducts([])
        setExpandedProduct(null)

        // Close the modal after successful linking
        onClose()
      } else {
        throw new Error(response.message || `Failed to link ${getEntityName(true).toLowerCase()}s to products`)
      }
    } catch (error: any) {
      console.error(`Error linking ${getEntityName(true).toLowerCase()}s to products:`, error)
      toast({
        title: "Error",
        description: error.message || `Failed to link ${getEntityName(true).toLowerCase()}s to products. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (hasChanges) {
      setIsDiscardDialogOpen(true)
    } else {
      onClose()
    }
  }

  const handleDiscard = () => {
    setHasChanges(false)
    setIsDiscardDialogOpen(false)
    onClose()
  }

  const handleKeepEditing = () => {
    setIsDiscardDialogOpen(false)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-full w-screen h-screen max-h-screen p-0 gap-0 overflow-hidden bg-white rounded-none sm:rounded-none m-0 left-0 top-0 translate-x-0 translate-y-0">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold">
                Assign {getEntityName()} to Products {context === "lab" ? "(Lab)" : "(Global)"}
              </DialogTitle>
              <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>

          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Panel - Select Stages or Entities */}
            <div className="w-1/2 border-r border-gray-200 flex flex-col">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="41.2246" height="41.2246" rx="6" fill="#1162A8" />
                    <path d="M18.9942 30.9121V15.9121C18.9942 15.6469 18.8888 15.3925 18.7013 15.205C18.5138 15.0175 18.2594 14.9121 17.9942 14.9121H12.9942C12.4638 14.9121 11.9551 15.1228 11.58 15.4979C11.2049 15.873 10.9942 16.3817 10.9942 16.9121V28.9121C10.9942 29.4425 11.2049 29.9512 11.58 30.3263C11.9551 30.7014 12.4638 30.9121 12.9942 30.9121H24.9942C25.5246 30.9121 26.0333 30.7014 26.4084 30.3263C26.7835 29.9512 26.9942 29.4425 26.9942 28.9121V23.9121C26.9942 23.6469 26.8888 23.3925 26.7013 23.205C26.5138 23.0175 26.2594 22.9121 25.9942 22.9121H10.9942" stroke="white" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M29.9942 10.9121H23.9942C23.4419 10.9121 22.9942 11.3598 22.9942 11.9121V17.9121C22.9942 18.4644 23.4419 18.9121 23.9942 18.9121H29.9942C30.5465 18.9121 30.9942 18.4644 30.9942 17.9121V11.9121C30.9942 11.3598 30.5465 10.9121 29.9942 10.9121Z" stroke="white" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>

                  <h3 className="font-semibold text-gray-900">Select {getEntityName()} to Assign</h3>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {isLoadingRetentionOptions && entityType === "retention-option" ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#1162a8]" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {entityType === "stage" && stageProductConnections.length > 0 ? (
                      // Show stages from API response for stage entity type
                      stageProductConnections.map((stageData) => (
                        <div key={stageData.stage.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedEntities.includes(stageData.stage.id)}
                              onCheckedChange={(checked) => handleEntitySelect(stageData.stage.id, !!checked)}
                              className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                            />
                            <span className="font-medium text-gray-900">{stageData.stage.name}</span>
                          </div>
                          <span className="text-sm text-gray-600">
                            ${stageData.products[0]?.lab_data?.price || 0}
                          </span>
                        </div>
                      ))
                    ) : entities.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">
                          {entityType === "retention-option" 
                            ? t("No retention options found", "No retention options found")
                            : t("No entities found", "No entities found")}
                        </p>
                      </div>
                    ) : (
                      // Show entities from context for other entity types
                      entities.map((entity: any) => (
                        <div key={entity.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedEntities.includes(entity.id)}
                              onCheckedChange={(checked) => handleEntitySelect(entity.id, !!checked)}
                              className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                            />
                            <span className="font-medium text-gray-900">{entity.name}</span>
                          </div>
                          {(entity.price !== undefined || (entity as any).lab_material?.price !== undefined || (entity as any).lab_retention?.price !== undefined) && (
                            <span className="text-sm font-semibold text-gray-600">
                              ${typeof entity.price === 'number' ? entity.price : (entity as any).lab_material?.price || (entity as any).lab_retention?.price || 0}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllEntities}
                      className="text-gray-700 border-gray-300 hover:bg-gray-100"
                    >
                      {selectedEntities.length === (entityType === "stage" && stageProductConnections.length > 0 ? stageProductConnections.length : entities.length) ? "Clear all" : "Select all"}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  {selectedEntities.length} {getEntityName(true).toLowerCase()}{selectedEntities.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            </div>

            {/* Right Panel - Select Products */}
            <div className="w-1/2 flex flex-col">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="41.2246" height="41.2246" rx="6" fill="#1162A8" />
                    <path d="M20.9942 30.9121V21.9121" stroke="white" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M24.1642 11.1225C24.4133 10.9833 24.6938 10.9102 24.9792 10.9102C25.2645 10.9102 25.5451 10.9833 25.7942 11.1225L29.9942 13.4825C30.2916 13.6507 30.5391 13.8949 30.7113 14.1901C30.8835 14.4852 30.9742 14.8208 30.9742 15.1625C30.9742 15.5042 30.8835 15.8398 30.7113 16.135C30.5391 16.4302 30.2916 16.6743 29.9942 16.8425L17.8142 23.7025C17.5644 23.845 17.2818 23.92 16.9942 23.92C16.7066 23.92 16.424 23.845 16.1742 23.7025L11.9942 21.3425C11.6967 21.1743 11.4493 20.9302 11.2771 20.635C11.1049 20.3398 11.0142 20.0042 11.0142 19.6625C11.0142 19.3208 11.1049 18.9852 11.2771 18.6901C11.4493 18.3949 11.6967 18.1507 11.9942 17.9825L24.1642 11.1225Z" stroke="white" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M28.9942 21.9121V25.7821C28.9946 26.1596 28.8913 26.5299 28.6955 26.8526C28.4998 27.1753 28.2191 27.438 27.8842 27.6121L21.8842 30.6921C21.6093 30.835 21.304 30.9096 20.9942 30.9096C20.6844 30.9096 20.3791 30.835 20.1042 30.6921L14.1042 27.6121C13.7693 27.438 13.4886 27.1753 13.2929 26.8526C13.0971 26.5299 12.9938 26.1596 12.9942 25.7821V21.9121" stroke="white" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M29.9942 21.3424C30.2916 21.1742 30.5391 20.93 30.7113 20.6348C30.8835 20.3397 30.9742 20.0041 30.9742 19.6624C30.9742 19.3206 30.8835 18.985 30.7113 18.6899C30.5391 18.3947 30.2916 18.1506 29.9942 17.9824L17.8242 11.1124C17.5761 10.9703 17.2951 10.8955 17.0092 10.8955C16.7233 10.8955 16.4423 10.9703 16.1942 11.1124L11.9942 13.4824C11.6967 13.6506 11.4493 13.8947 11.2771 14.1899C11.1049 14.485 11.0142 14.8206 11.0142 15.1624C11.0142 15.5041 11.1049 15.8397 11.2771 16.1348C11.4493 16.43 11.6967 16.6741 11.9942 16.8424L24.1742 23.7024C24.4222 23.8448 24.7032 23.9198 24.9892 23.9198C25.2752 23.9198 25.5562 23.8448 25.8042 23.7024L29.9942 21.3424Z" stroke="white" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>

                  <h3 className="font-semibold text-gray-900">Assign to These Products</h3>
                </div>
              </div>

              {/* Tabs */}
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveTab("individual")}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "individual"
                        ? "bg-[#1162a8] text-white"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                  >
                    By Individual Products
                  </button>
                  <button
                    onClick={() => setActiveTab("category")}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "category"
                        ? "bg-[#1162a8] text-white"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                  >
                    By Category
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Search Products..."
                    className="pr-10 h-10 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Products List */}
              <div className="flex-1 overflow-y-auto p-4">
                {isLoadingProducts ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-[#1162a8] mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Loading products...</p>
                    </div>
                  </div>
                ) : productsError ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-sm text-red-600 mb-2">Error: {productsError}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.reload()}
                        className="text-gray-700 border-gray-300 hover:bg-gray-100"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                ) : activeTab === "category" ? (
                  // Category View
                  categories.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">No categories available</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {categories
                        .filter((category) => {
                          // Filter categories based on search query
                          if (!searchQuery.trim()) return true
                          const searchLower = searchQuery.toLowerCase().trim()
                          // Show category if it matches search or has products that match
                          const categoryMatches = category.toLowerCase().includes(searchLower)
                          const hasMatchingProducts = filteredProducts.some(p => p.category === category)
                          return categoryMatches || hasMatchingProducts
                        })
                        .map((category) => {
                        // Use filteredProducts to respect search query
                        const categoryProducts = filteredProducts.filter(p => p.category === category)
                        const selectedCount = categoryProducts.filter(p => selectedProducts.includes(p.id)).length
                        const isAllSelected = selectedCount === categoryProducts.length && categoryProducts.length > 0

                        return (
                          <div key={category} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={isAllSelected}
                                  onCheckedChange={(checked) => handleCategorySelect(category, !!checked)}
                                  className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                                />
                                <span className="font-medium text-gray-900">{category}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {selectedCount}/{categoryProducts.length} selected
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                ) : filteredProducts.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        {searchQuery
                          ? "No products found matching your search"
                          : "No products available"}
                      </p>
                    </div>
                  </div>
                ) : (
                  // Individual Products View
                  <div className="space-y-3">
                    {filteredProducts.map((product) => (
                      <div key={product.id} className="border border-gray-200 rounded-lg">
                        <div className="p-3 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <Checkbox
                                checked={selectedProducts.includes(product.id)}
                                onCheckedChange={(checked) => handleProductSelect(product.id, !!checked)}
                                className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <span className="font-medium text-gray-900">{product.name}</span>
                                  <div className="flex items-center gap-2">
                                    {getImageStatusIcon(calculateImageStatus(product.id))}
                                    <ImageIcon className="h-4 w-4 text-gray-400" />
                                  </div>
                                </div>
                                {/* Display grade pricing if available */}
                                {entityType === "stage" && product.grades && product.grades.length > 0 && (
                                  <div className="flex items-center gap-3 mt-2">
                                    {product.grades.map((grade) => (
                                      <div key={grade.id} className="flex items-center gap-1 text-xs">
                                        <span className="text-gray-600">{grade.name}:</span>
                                        <span className="font-semibold text-gray-900">${grade.price}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {product.category}
                            </Badge>
                          </div>
                        </div>

                        {/* Expandable Configuration Section */}
                        {selectedProducts.includes(product.id) && (
                          <div className="px-3 pb-3 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                                className="text-left py-2 text-sm text-gray-600 hover:text-gray-900"
                              >
                                Configure images
                              </button>
                              {entityType === "stage" && selectedEntities.length > 0 && (
                                <button
                                  onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                                  className="text-left py-2 text-sm text-gray-600 hover:text-gray-900"
                                >
                                  Configure grades
                                </button>
                              )}
                              {entityType === "retention" && selectedEntities.length > 0 && (
                                <button
                                  onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                                  className="text-left py-2 text-sm text-gray-600 hover:text-gray-900"
                                >
                                  Configure pricing
                                </button>
                              )}
                            </div>

                            {expandedProduct === product.id && (
                              <div className="mt-2 space-y-4">
                                {/* Grade Pricing Section */}
                                {entityType === "stage" && selectedEntities.length > 0 && grades.length > 0 && (
                                  <div className="space-y-3 border-b border-gray-200 pb-3">
                                    {selectedEntities.map((stageId) => {
                                      const stage = entities.find((e: any) => e.id === stageId)
                                      if (!stage) return null
                                      
                                      return (
                                        <div key={stageId} className="space-y-2">
                                          <h4 className="text-sm font-semibold text-gray-700">Grade Pricing for {stage.name}</h4>
                                          <div className="grid grid-cols-2 gap-3">
                                            {grades.map((grade) => {
                                              // Get connection data for this product-stage combination
                                              const connection = getStageProductConnection(product.id, stageId)
                                              const defaultPrice = connection?.grades?.find((gp: any) => gp.grade.id === grade.id)?.price || 0
                                              
                                              const currentPrice = getGradePrice(
                                                product.id,
                                                stageId,
                                                grade.id,
                                                defaultPrice
                                              )
                                              return (
                                                <div key={grade.id} className="flex items-center gap-2">
                                                  <label className="text-xs text-gray-600 w-20 flex-shrink-0">{grade.name}:</label>
                                                  <div className="flex items-center gap-1 flex-1">
                                                    <span className="text-xs text-gray-500">$</span>
                                                    <Input
                                                      type="number"
                                                      step="0.01"
                                                      min="0"
                                                      value={currentPrice || ''}
                                                      onChange={(e) => handleGradePriceChange(product.id, stageId, grade.id, e.target.value)}
                                                      className="h-8 text-sm"
                                                      placeholder="0.00"
                                                    />
                                                  </div>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}

                                {/* Retention Pricing Section */}
                                {entityType === "retention" && selectedEntities.length > 0 && (
                                  <div className="space-y-3 border-b border-gray-200 pb-3">
                                    <h4 className="text-sm font-semibold text-gray-700">Retention Pricing</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                      {selectedEntities.map((retentionId) => {
                                        const retention = entities.find((e: any) => e.id === retentionId)
                                        if (!retention) return null

                                        // Get existing price from retention data if available
                                        const existingPrice = (retention as any).lab_retention?.price || (retention as any).price || null
                                        const currentPrice = getRetentionPrice(product.id, retentionId, existingPrice)

                                        return (
                                          <div key={retentionId} className="flex items-center gap-2">
                                            <label className="text-xs text-gray-600 w-24 flex-shrink-0">{retention.name}:</label>
                                            <div className="flex items-center gap-1 flex-1">
                                              <span className="text-xs text-gray-500">$</span>
                                              <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="999999.99"
                                                value={currentPrice !== null ? currentPrice : ''}
                                                onChange={(e) => handleRetentionPriceChange(product.id, retentionId, e.target.value)}
                                                className="h-8 text-sm"
                                                placeholder="0.00"
                                              />
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Image Configuration Section */}
                                {selectedEntities.length > 0 ? (
                                  // Show only the selected entities for image upload
                                  selectedEntities.map((entityId) => {
                                    const entity = entities.find((e: any) => e.id === entityId)
                                    if (!entity) return null

                                    const imageKey = `${product.id}-${entity.id}`
                                    const hasImage = uploadedImages[imageKey]
                                    const previewUrl = imagePreviews[imageKey]
                                    
                                    // Check if there's an existing variation image from connection data
                                    const connection = entityType === "stage" ? getStageProductConnection(product.id, entity.id) : null
                                    const existingVariationImage = connection?.stage_variation?.image_url
                                    const existingVariationName = connection?.stage_variation?.name
                                    
                                    // Use preview URL if available, otherwise use existing variation image
                                    const displayImageUrl = previewUrl || existingVariationImage
                                    const displayName = selectedVariationNames[imageKey] || existingVariationName || (hasImage ? hasImage.name : entity.name)
                                    const hasAnyImage = displayImageUrl || hasImage

                                    return (
                                      <div key={entity.id} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          {/* Image Preview - Clickable for larger view */}
                                          {displayImageUrl ? (
                                            <div 
                                              className="relative w-20 h-20 border-2 border-gray-300 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:border-[#1162a8] transition-colors group"
                                              onClick={() => {
                                                setPreviewImageUrl(displayImageUrl)
                                                setPreviewImageName(displayName)
                                                setShowImagePreviewModal(true)
                                              }}
                                              title="Click to preview"
                                            >
                                              <img
                                                src={displayImageUrl}
                                                alt={displayName}
                                                className="w-full h-full object-cover"
                                              />
                                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
                                                <ImageIcon className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-50">
                                              <ImageIcon className="h-8 w-8 text-gray-400" />
                                            </div>
                                          )}
                                          
                                          {/* Input and Buttons */}
                                          <div className="flex-1 flex items-center gap-2">
                                            <Input
                                              value={displayName}
                                              placeholder={entity.name}
                                              className="flex-1 h-8 text-sm"
                                              readOnly
                                            />
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-8 w-8 p-0"
                                              type="button"
                                              onClick={() => handleOpenVariationModal(product.id, entity.id)}
                                              title="Change photo"
                                            >
                                              <Upload className="h-4 w-4" />
                                            </Button>
                                            {hasAnyImage && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                type="button"
                                                onClick={() => handleDeleteImage(product.id, entity.id)}
                                                title="Delete image"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                        <input
                                          id={`file-${imageKey}`}
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                              handleImageUpload(product.id, entity.id, file)
                                            }
                                            // Reset input to allow selecting the same file again
                                            e.target.value = ''
                                          }}
                                        />
                                      </div>
                                    )
                                  })
                                ) : (
                                  <div className="text-sm text-gray-500 text-center py-2">
                                    Please select {getEntityName(true).toLowerCase()}s to upload images
                                  </div>
                                )}
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-500">Use default for all</span>
                                  <button
                                    className="text-red-600 hover:text-red-800"
                                    onClick={() => handleClearAllImages(product.id)}
                                  >
                                    Clear all images
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Actions and Legend */}
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                {activeTab === "category" ? (
                  // Category tab footer
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAllCategories}
                          className="text-gray-700 border-gray-300 hover:bg-gray-100"
                        >
                          {selectedCategories.length === categories.length ? "Clear all" : "Select all"}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected from {selectedCategories.length} categor{selectedCategories.length !== 1 ? 'ies' : 'y'}
                    </p>
                  </div>
                ) : (
                  // Individual products tab footer
                  <div className="flex items-center gap-6 text-xs text-gray-600">
                    <span className="text-sm font-medium text-gray-700 mr-3">Legend:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span>All Image Configured</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      <span>Some Image Configured</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      <span>No Image Configured</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t">
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApply}
                className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
                disabled={selectedEntities.length === 0 || selectedProducts.length === 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Apply {getEntityName(true).toLowerCase()}s to selected products
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DiscardChangesDialog
        isOpen={isDiscardDialogOpen}
        type={entityType === "material" ? "material" : entityType === "impression" ? "impression" : entityType === "retention" ? "retention" : "stage"}
        onDiscard={handleDiscard}
        onKeepEditing={handleKeepEditing}
      />

      {/* Loading Overlay for Linking */}
      <LoadingOverlay
        isLoading={isSubmitting}
        title={`Linking ${getEntityName()} to Products...`}
        message={`Please wait while we link the selected ${getEntityName(true).toLowerCase()}s to products.`}
        zIndex={99999}
      />

      {/* Variation Selection Modal */}
      <Dialog open={showVariationModal} onOpenChange={setShowVariationModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Change {getEntityName(true)} photo</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {isLoadingVariations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#1162a8]" />
              </div>
            ) : variations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No variations available. Please upload a new photo.
              </div>
            ) : (
              <div className="space-y-2">
                {variations.map((variation) => (
                  <button
                    key={variation.id}
                    onClick={() => handleSelectVariation(variation)}
                    className={`w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
                      selectedVariationId === variation.id
                        ? "border-[#1162a8] bg-blue-50"
                        : "border-gray-200"
                    }`}
                  >
                    {variation.image_url ? (
                      <img
                        src={variation.image_url}
                        alt={variation.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <span className="flex-1 text-left font-medium text-gray-900">
                      {variation.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowVariationModal(false)
                setSelectedVariationId(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadNewPhoto}
              className="bg-[#1162a8] hover:bg-[#0d4d87] text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload new photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog open={showImagePreviewModal} onOpenChange={setShowImagePreviewModal}>
        <DialogContent className="sm:max-w-[600px] p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>{previewImageName || "Image Preview"}</DialogTitle>
              <button 
                onClick={() => setShowImagePreviewModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>
          
          <div className="p-6 flex items-center justify-center bg-gray-50 min-h-[400px]">
            {previewImageUrl ? (
              <img
                src={previewImageUrl}
                alt={previewImageName}
                className="max-w-full max-h-[500px] object-contain rounded-lg shadow-lg"
              />
            ) : (
              <div className="text-center text-gray-500">
                <ImageIcon className="h-16 w-16 mx-auto mb-2 text-gray-400" />
                <p>No image to preview</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
