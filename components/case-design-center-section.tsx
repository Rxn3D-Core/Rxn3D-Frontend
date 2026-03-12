import React, { useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useMemo } from "react"
import { useSlipCreation } from "@/contexts/slip-creation-context"
import { useQueryClient } from "@tanstack/react-query"
// Removed unused api-hooks import - using TanStack Query instead
import AddProductModal from "./add-product-modal"
import { useCaseDesignStore } from "@/stores/caseDesignStore"
import { useSelectedTeethShadeStore } from "@/stores/selected-teeth-shade-store"
import { useSelectedGumShadeStore } from "@/stores/selected-gum-shade-store"
import { useSlipStore } from "@/stores/slipStore"
import { useDebounce } from "@/lib/performance-utils"
import { ShadeSelectionModal } from "./shade-selection-modal"
import { ImpressionSelectionModal } from "./impression-selection-modal"
import { useDropdownState } from "@/hooks/use-dropdown-state"
import { useImpressionQuantitiesStore } from "@/stores/impression-quantities-store"
import { useArchSelectionStore } from "@/stores/arch-selection-store"
import { useProductGrades, useProductStages, useProductTeethShades as useTanStackTeethShades, useProductGumShades as useTanStackGumShades, useProductImpressions as useTanStackImpressions, useDeliveryDate, usePrefetchProductData } from "@/hooks/use-product-data"
import { useStages } from "@/contexts/product-stages-context"
import { useGrades } from "@/contexts/product-grades-context"


import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Paperclip, Zap, Trash2, Calendar, Check, ClipboardList, Clipboard, GitFork, X, Maximize2, ChevronDown, FileText, Pencil, Save, Settings } from "lucide-react"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import Image from "next/image"
import FileAttachmentModalContent from "./file-attachment-modal-content"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getTeethShadeDisplayName, getShadeColor, getTeethShadeDisplayText } from "@/utils/teeth-shade-utils"
import { ExtractionsApi } from "@/lib/api-service"
import { useToast } from "@/hooks/use-toast"
import { useTeethSelectionStore } from "@/stores/teeth-selection-store"
import InlineLoading from "@/components/ui/inline-loading"
import { TeethShadeSelectionModal } from "./teeth-shade-selection-modal"
import ExpertModeModal from "./expert-mode-modal"
// Removed ExtractionsModal import - using product selection for extractions instead

interface ProductConfiguration {
  restoration: string
  productName: string
  grade: string
  stage: string
  gradeId?: number
  stageId?: number
  teethShadeBrandId?: number
  teethShadeBrandName?: string
  teethShadeId?: number
  teethShadeName?: string
  gumShadeBrandId?: number
  gumShadeBrandName?: string
  gumShadeId?: number
  gumShadeName?: string
  teethShadePart1: string
  teethShadePart2: string
  gumShadePart1: string
  gumShadePart2: string
  impressions?: { id: number; name: string; qty: number }[]
  extractions?: { extraction_id: number; teeth_numbers: number[]; notes?: string }[]
}

interface Product {
  id: string
  name: string
  type: string
  teeth: string
  maxillaryTeeth?: string
  mandibularTeeth?: string
  deliveryDate: string
  image: string
  abbreviation: string
  color: string
  borderColor: string
  addOns: {
    maxillary?: { category: string; addOn: string; qty: number }[]
    mandibular?: { category: string; addOn: string; qty: number }[]
  }
  stageNotesContent: string
  maxillaryConfig: ProductConfiguration
  mandibularConfig: ProductConfiguration
  
  // Additional fields for product data
  category_name?: string
  subcategory_name?: string
  category_id?: number
  subcategory_id?: number
  grades?: any[]
  stages?: any[]
  productTeethShades?: any[]
  productGumShades?: any[]
}

interface Note {
  id: string
  date: string
  time: string
  author: string
  content: string
  attachments: number
  slipNumber: string
  stage: string
  deliveryDate: string
  isRush?: boolean
}

interface CaseDesignCenterSectionProps {
  products: Product[]
  rushRequests: { [key: string]: any }
  openAccordionItem: string | undefined
  setOpenAccordionItem: (id: string | undefined) => void
  handleProductButtonClick: (id: string) => void
  handleAddProductClick: () => void
  handleDeleteProduct: (id: string) => void
  handleProductDetailChange: (
    productId: string,
    arch: "maxillary" | "mandibular",
    field: keyof ProductConfiguration | "stage" | "grade" | "restoration" | "productName",
    value: string | number | { id: number; name: string; qty: number }[],
  ) => void
  handleUpdateStageNotes: (productId: string, stageNotes: string) => void
  handleOpenAddOnsModal: (productId: string) => void
  handleOpenMaxillaryAddOnsModal: (productId: string) => void
  handleOpenMandibularAddOnsModal: (productId: string) => void
  handleRushRequest: (productId: string) => void
  handleCancelRush: (productId: string) => void
  setShowAttachModal: (show: boolean) => void
  showAttachModal: boolean
  isCaseSubmitted: boolean
  setShowStageNotesModal: (product: Product) => void
  allNotes: Note[]
  setAllNotes: (notes: Note[]) => void
  slipData: any
  slipId?: string | number
  productErrors?: { [productId: string]: { [key: string]: string } }
  handleAddAddOnsToProduct: (productId: string, addOns: any[], arch: "maxillary" | "mandibular") => void
  // Removed handleAddExtractionsToProduct - using product selection for extractions instead
  handleUpdateDatesFromApi?: (pickupDate: string, deliveryDate: string, deliveryTime: string) => void
  onProductSelected?: (product: any, arch: string) => void
  setCurrentArch?: (arch: "maxillary" | "mandibular") => void
  onTeethShadeSelect?: (productId: string, arch: "maxillary" | "mandibular", shadeSystem: string, individualShade: string) => void
  hasSelectedTeeth?: boolean
  // Selected teeth for stage notes
  selectedMaxillaryTeeth?: number[]
  selectedMandibularTeeth?: number[]
}

interface DropdownVisibilityState {
  restoration: boolean
  productName: boolean
  grade: boolean
  stage: boolean
  teethShadePart1: boolean
  teethShadePart2: boolean
  gumShadePart1: boolean
  gumShadePart2: boolean
  impression: boolean
}

function normalizeAddOns(product: any) {
  // If addOns already has the correct arch-specific structure, return it as-is
  if (product.addOns && (product.addOns.maxillary || product.addOns.mandibular)) {
    return product.addOns
  }
  
  // Only normalize if addOns is an array (legacy format)
  if (Array.isArray(product.addOns)) {
    const uniqueBy = (arr: any[], key: string) => {
      const seen = new Set()
      return arr.filter((item: any) => {
        const val = item[key] || item.name || item.addOn
        if (seen.has(val)) return false
        seen.add(val)
        return true
      })
    }
    return {
      maxillary: uniqueBy(
        product.addOns.filter((a: any) =>
          product.type.includes("Maxillary") &&
          (!product.type.includes("Mandibular") || a.arch === "maxillary" || !a.arch)
        ),
        "id"
      ),
      mandibular: uniqueBy(
        product.addOns.filter((a: any) =>
          product.type.includes("Mandibular") &&
          (!product.type.includes("Maxillary") || a.arch === "mandibular" || !a.arch)
        ),
        "id"
      ),
    }
  }
  
  // Return empty structure if no addOns
  return { maxillary: [], mandibular: [] }
}



export default function CSDSection({
  products,
  rushRequests,
  openAccordionItem,
  setOpenAccordionItem,
  handleProductButtonClick,
  handleAddProductClick,
  handleDeleteProduct,
  handleProductDetailChange,
  handleUpdateStageNotes,
  handleOpenAddOnsModal,
  handleOpenMaxillaryAddOnsModal,
  handleOpenMandibularAddOnsModal,
  handleRushRequest,
  handleCancelRush,
  setShowAttachModal,
  showAttachModal,
  isCaseSubmitted,
  setShowStageNotesModal,
  allNotes,
  slipData,
  slipId,
  productErrors = {},
  handleAddAddOnsToProduct,
  // Removed handleAddExtractionsToProduct - using product selection for extractions instead
  handleUpdateDatesFromApi,
  onProductSelected,
  setCurrentArch = () => {},
  onTeethShadeSelect,
  hasSelectedTeeth = false,
  selectedMaxillaryTeeth = [],
  selectedMandibularTeeth = [],
}: CaseDesignCenterSectionProps) {
  const archType = useArchSelectionStore((s) => s.archType)



  const didAutoSelect = useRef(false)

  useEffect(() => {
    if (products.length !== 1) didAutoSelect.current = false
  }, [products.length])

  useEffect(() => {
    if (!didAutoSelect.current && products.length === 1 && !openAccordionItem) {
      setOpenAccordionItem(products[0].id)
      didAutoSelect.current = true
    }
  }, [products, openAccordionItem, setOpenAccordionItem])

  let localCaseData: any = {}
  if (typeof window !== "undefined") {
    try {
      const cache = window.localStorage.getItem("caseDesignCache")
      if (cache) localCaseData = JSON.parse(cache)
    } catch { localCaseData = {} }
  }

  // Use custom hooks for better state management
  const {
    dropdownVisibility,
    selectOpen,
    autoOpenedFor,
    initializeDropdownVisibility,
    updateDropdownVisibility,
    openNextDropdown,
    isAutoOpenedFor,
    markAsAutoOpened,
    setSelectOpen,
  } = useDropdownState(products)

  const {
    impressionQuantities,
    addImpressionQuantity,
    removeImpressionQuantity,
    updateImpressionQuantity,
    decreaseImpressionQuantity,
    getImpressionQuantitiesForProduct,
    hasChosenImpressions,
    getTotalImpressionCount,
    clearAllImpressionQuantities,
    clearImpressionQuantitiesForProduct,
  } = useImpressionQuantitiesStore()


  const [stageNotesCollapsed, setStageNotesCollapsed] = useState<{ [productId: string]: boolean }>({})

  // Stage Notes editing state
  const [editingStageNotes, setEditingStageNotes] = useState<{ [productId: string]: boolean }>({})
  const [stageNotesContent, setStageNotesContent] = useState<{ [productId: string]: string }>({})
  const [stageNoteIds, setStageNoteIds] = useState<{ [productId: string]: number }>({})
  const [savingStageNotes, setSavingStageNotes] = useState<{ [productId: string]: boolean }>({})
  const [cacheUpdateTrigger, setCacheUpdateTrigger] = useState(0) // Used to force re-render when cache updates
  const { toast } = useToast()

  // Teeth shade selection modal state
  const [teethShadeSelectionOpen, setTeethShadeSelectionOpen] = useState(false)
  const [selectedProductForShadeGuide, setSelectedProductForShadeGuide] = useState<string | null>(null)
  const [selectedArchForShadeGuide, setSelectedArchForShadeGuide] = useState<'maxillary' | 'mandibular' | null>(null)

  // Gum shade selection modal state
  const [gumShadeSelectionOpen, setGumShadeSelectionOpen] = useState(false)
  const [selectedProductForGumShadeGuide, setSelectedProductForGumShadeGuide] = useState<string | null>(null)
  const [selectedArchForGumShadeGuide, setSelectedArchForGumShadeGuide] = useState<'maxillary' | 'mandibular' | null>(null)

  // Delivery date state for each product
  const [productDeliveryDates, setProductDeliveryDates] = useState<{ [productId: string]: string }>({})
  
  // Function to clear delivery date for a product
  const clearProductDeliveryDate = useCallback((productId: string) => {
    setProductDeliveryDates(prev => {
      const newDates = { ...prev }
      delete newDates[productId]
      return newDates
    })
  }, [])

  // Function to save stage notes
  const saveStageNotes = useCallback(async (productId: string, notes: string) => {
    if (!notes.trim()) return

    setSavingStageNotes(prev => ({ ...prev, [productId]: true }))
    
    try {
      const product = products.find(p => p.id === productId)
      if (!product) return

      // Get the current slip ID from context
      const currentSlipId = slipId
      if (!currentSlipId) {
        console.error('No slip ID available for saving stage notes')
        return
      }

      // Get product ID from the library (assuming product has a library product ID)
      const libraryProductId = product.category_id // or however you get the library product ID
      const stageId = product.stages?.[0]?.id // or however you get the current stage ID

      const noteData = {
        type: 'stage' as const,
        note: notes,
        slip_id: Number(currentSlipId),
        product_id: libraryProductId,
        stage_id: stageId,
        needs_follow_up: false
      }

      // If we already have a note ID for this product, update it
      if (stageNoteIds[productId]) {
        await ExtractionsApi.updateStageNote(stageNoteIds[productId], {
          note: notes,
          needs_follow_up: false
        })
      } else {
        // Create new note
        const response = await ExtractionsApi.createStageNote(noteData)
        if (response.data?.data?.id) {
          setStageNoteIds(prev => ({ ...prev, [productId]: response.data.data.id }))
        }
      }

      // Update the product's stage notes content
      handleUpdateStageNotes(productId, notes)

      toast({
        title: "Success",
        description: "Stage notes saved successfully.",
      })

    } catch (error) {
      console.error('Error saving stage notes:', error)
      toast({
        title: "Error",
        description: "Failed to save stage notes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSavingStageNotes(prev => ({ ...prev, [productId]: false }))
    }
  }, [products, slipId, stageNoteIds, handleUpdateStageNotes, toast])

  // Function to load existing stage notes
  const loadStageNotes = useCallback(async () => {
    if (!slipId) return

    try {
      const response = await ExtractionsApi.getStageNotes({
        slip_id: Number(slipId),
        type: 'stage'
      })

      if (response.data) {
        const notesMap: { [productId: string]: number } = {}
        const contentMap: { [productId: string]: string } = {}

        response.data.forEach((note: any) => {
          if (note.product_id) {
            // Find the product that matches this library product ID
            const product = products.find(p => p.category_id === note.product_id)
            if (product) {
              notesMap[product.id] = note.id
              contentMap[product.id] = note.note || ''
            }
          }
        })

        setStageNoteIds(prev => ({ ...prev, ...notesMap }))
        
        // Update products with existing stage notes content
        Object.entries(contentMap).forEach(([productId, content]) => {
          handleUpdateStageNotes(productId, content)
        })
      }
    } catch (error) {
      console.error('Error loading stage notes:', error)
    }
  }, [slipId, products, handleUpdateStageNotes])
  
  // Clear delivery dates for products that no longer exist
  useEffect(() => {
    const currentProductIds = products.map(p => p.id)
    setProductDeliveryDates(prev => {
      const newDates = { ...prev }
      Object.keys(newDates).forEach(productId => {
        if (!currentProductIds.includes(productId)) {
          delete newDates[productId]
        }
      })
      return newDates
    })
  }, [products])

  // Add click outside handler to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.dropdown-container')) {
        setSelectOpen({})
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [setSelectOpen])

  // Load stage notes when slipId changes
  useEffect(() => {
    if (slipId && products.length > 0) {
      loadStageNotes()
    }
  }, [slipId, loadStageNotes])

  // Add Product Modal state
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [selectedLabId, setSelectedLabId] = useState<number | null>(null)

  // Shade Selection Modal state
  const [showShadeModal, setShowShadeModal] = useState(false)
  const [shadeModalProductId, setShadeModalProductId] = useState<string>("")
  const [showExpertModeModal, setShowExpertModeModal] = useState(false)
  const [shadeModalArch, setShadeModalArch] = useState<"maxillary" | "mandibular">("maxillary")
  const [shadeModalSelectedSystem, setShadeModalSelectedSystem] = useState<string>("")
  const [shadeModalSelectedShade, setShadeModalSelectedShade] = useState<string>("")

  // Impression Selection Modal state
  const [showImpressionModal, setShowImpressionModal] = useState(false)
  const [impressionModalProductId, setImpressionModalProductId] = useState<string>("")
  const [impressionModalArch, setImpressionModalArch] = useState<"maxillary" | "mandibular">("maxillary")

  // Get lab ID from localStorage or slipData
  useEffect(() => {
    if (typeof window !== "undefined") {
      const customerId = localStorage.getItem("customerId")
      if (customerId) {
        setSelectedLabId(Number(customerId))
      }
    }
  }, [])

  const {
    fetchProductAddons,
    calculateDeliveryDate,
  } = useSlipCreation()

  // Zustand store for add-ons management
  const { 
    getProductAddOns, 
    removeAddOn: removeAddOnFromStore
  } = useCaseDesignStore()

  // Zustand store for real-time teeth shade updates
  const { selectedShade, updateShade, clearSelectedShade } = useSelectedTeethShadeStore()
  
  // Slip store for getting selected product ID
  const { slipData: storeSlipData } = useSlipStore()
  
  // Local state to track immediate UI updates
  const [localProducts, setLocalProducts] = useState<Product[]>(products)
  
  // Ref to track if we're in the middle of a shade update to prevent state reset
  const isUpdatingShade = useRef(false)
  
  // Update local products when props change
  useEffect(() => {
    // Always sync products prop to localProducts for grade/stage updates
    // Only skip if we're in the middle of a shade update to prevent conflicts
    if (!isUpdatingShade.current) {
      setLocalProducts(products)
    } else {
      // If we're updating shade, sync after a delay to ensure grade/stage changes are still reflected
      const timeoutId = setTimeout(() => {
        if (!isUpdatingShade.current) {
          setLocalProducts(products)
        }
      }, 200)
      return () => clearTimeout(timeoutId)
    }
  }, [products, isUpdatingShade.current])

  // Force re-render when localProducts changes to ensure UI updates
  useEffect(() => {
    // Removed console.log to prevent infinite re-renders
  }, [localProducts])

  // Auto-update product when shade is selected via Zustand
  useEffect(() => {
    if (selectedShade) {
      console.log('🔄 Zustand selectedShade changed, updating UI:', selectedShade)
      
      // Set flag to prevent state reset during update
      isUpdatingShade.current = true
      
      // Find the current product state
      const currentProduct = products.find(p => p.id === selectedShade.productId)
      const currentConfig = selectedShade.arch === 'maxillary' ? currentProduct?.maxillaryConfig : currentProduct?.mandibularConfig
      
      console.log('🔄 Current product state before update:', {
        productId: selectedShade.productId,
        arch: selectedShade.arch,
        currentTeethShadePart1: currentConfig?.teethShadePart1,
        currentTeethShadePart2: currentConfig?.teethShadePart2,
        selectedShadeSystem: selectedShade.shadeSystem,
        selectedIndividualShade: selectedShade.individualShade
      })
      
      // Update local products state immediately for UI reflection
      setLocalProducts(prevProducts => {
        console.log('🔄 Updating localProducts state:', { 
          productId: selectedShade.productId, 
          arch: selectedShade.arch, 
          shadeSystem: selectedShade.shadeSystem, 
          individualShade: selectedShade.individualShade 
        })
        
        return prevProducts.map(product => {
          if (product.id === selectedShade.productId) {
            const updatedProduct = { ...product }
            
            // Ensure configs exist
            updatedProduct.maxillaryConfig = updatedProduct.maxillaryConfig || {}
            updatedProduct.mandibularConfig = updatedProduct.mandibularConfig || {}
            
            // Look up brand and shade IDs from product data - use improved matching
            const teethShadeData = getProductData(selectedShade.productId, 'teethShades')
            
            // Try multiple matching strategies to find brand
            const brandObj = teethShadeData?.find((b: any) => {
              if (b.name === selectedShade.shadeSystem || b.system_name === selectedShade.shadeSystem) return true
              if (b.name?.includes(selectedShade.shadeSystem) || selectedShade.shadeSystem?.includes(b.name)) return true
              const normalizedBrandName = (b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
              const normalizedSystem = (selectedShade.shadeSystem || '').toLowerCase().replace(/[^a-z0-9]/g, '')
              if (normalizedBrandName && normalizedSystem && normalizedBrandName === normalizedSystem) return true
              return false
            })
            
            // Try to find shade - search in found brand first, then across all brands
            let shadeObj = brandObj?.shades?.find((s: any) => 
              s.name === selectedShade.individualShade ||
              s.id?.toString() === selectedShade.individualShade?.toString() ||
              s.shade_name === selectedShade.individualShade
            )
            
            // If not found in brand, search across all brands
            let foundBrandObj = brandObj
            if (!shadeObj && teethShadeData) {
              for (const brand of teethShadeData) {
                if (brand.shades) {
                  shadeObj = brand.shades.find((s: any) => 
                    s.name === selectedShade.individualShade ||
                    s.id?.toString() === selectedShade.individualShade?.toString() ||
                    s.shade_name === selectedShade.individualShade
                  )
                  if (shadeObj) {
                    foundBrandObj = brand
                    break
                  }
                }
              }
            }
            
            const finalBrandObj = foundBrandObj || brandObj
            
            // Store IDs in Part1 and Part2
            const brandId = finalBrandObj?.id ? finalBrandObj.id.toString() : selectedShade.shadeSystem
            const shadeId = shadeObj?.id ? shadeObj.id.toString() : selectedShade.individualShade
            
            // Log if shade not found
            if (!shadeObj) {
              console.warn('⚠️ Shade not found in Zustand useEffect:', { 
                individualShade: selectedShade.individualShade,
                shadeSystem: selectedShade.shadeSystem,
                brandObj: finalBrandObj?.name,
                availableShades: finalBrandObj?.shades?.map((s: any) => s.name)
              })
            }
            
            // Update the selected arch - use finalBrandObj
            if (selectedShade.arch === 'maxillary') {
              updatedProduct.maxillaryConfig = {
                ...updatedProduct.maxillaryConfig,
                teethShadePart1: brandId,
                teethShadePart2: shadeId,
                teethShadeBrandId: finalBrandObj?.id,
                teethShadeBrandName: finalBrandObj?.name,
                teethShadeId: shadeObj?.id,
                teethShadeName: shadeObj?.name
              }
              console.log('🔄 Updated maxillary config:', updatedProduct.maxillaryConfig)
            } else {
              updatedProduct.mandibularConfig = {
                ...updatedProduct.mandibularConfig,
                teethShadePart1: brandId,
                teethShadePart2: shadeId,
                teethShadeBrandId: finalBrandObj?.id,
                teethShadeBrandName: finalBrandObj?.name,
                teethShadeId: shadeObj?.id,
                teethShadeName: shadeObj?.name
              }
              console.log('🔄 Updated mandibular config:', updatedProduct.mandibularConfig)
            }
            
            // For "both arch" products, also update the other arch
            if (product.type.includes("Maxillary") && product.type.includes("Mandibular")) {
              if (selectedShade.arch === 'maxillary') {
                // Update mandibular as well
                updatedProduct.mandibularConfig = {
                  ...updatedProduct.mandibularConfig,
                  teethShadePart1: brandId,
                  teethShadePart2: shadeId,
                  teethShadeBrandId: finalBrandObj?.id,
                  teethShadeBrandName: finalBrandObj?.name,
                  teethShadeId: shadeObj?.id,
                  teethShadeName: shadeObj?.name
                }
                console.log('🔄 Updated mandibular for both arch:', updatedProduct.mandibularConfig)
                if (!shadeObj?.id) {
                  console.warn('⚠️ Mandibular teethShadeId is null/undefined in Zustand update')
                }
              } else {
                // Update maxillary as well
                updatedProduct.maxillaryConfig = {
                  ...updatedProduct.maxillaryConfig,
                  teethShadePart1: brandId,
                  teethShadePart2: shadeId,
                  teethShadeBrandId: finalBrandObj?.id,
                  teethShadeBrandName: finalBrandObj?.name,
                  teethShadeId: shadeObj?.id,
                  teethShadeName: shadeObj?.name
                }
                console.log('🔄 Updated maxillary for both arch:', updatedProduct.maxillaryConfig)
              }
            }
            
            return updatedProduct
          }
          return product
        })
      })
      
      // Don't call handleLocalProductDetailChange here - it interferes with local state
      // Backend updates will be handled by the confirm function
      
      // Check the state after update
      setTimeout(() => {
        const updatedProduct = localProducts.find(p => p.id === selectedShade.productId)
        const updatedConfig = selectedShade.arch === 'maxillary' ? updatedProduct?.maxillaryConfig : updatedProduct?.mandibularConfig
        
        console.log('🔄 Product state after update:', {
          productId: selectedShade.productId,
          arch: selectedShade.arch,
          updatedTeethShadePart1: updatedConfig?.teethShadePart1,
          updatedTeethShadePart2: updatedConfig?.teethShadePart2
        })
        
        // Clear the selectedShade to prevent infinite loops
        clearSelectedShade()
        
        // Reset the flag after a short delay to allow state to settle
        setTimeout(() => {
          isUpdatingShade.current = false
        }, 200)
      }, 100)
    }
  }, [selectedShade]) // Removed handleProductDetailChange from dependencies to prevent infinite loop

  // Zustand store for real-time gum shade updates
  const { selectedGumShade, updateGumShade } = useSelectedGumShadeStore()

  // Auto-update product when gum shade is selected via Zustand
  useEffect(() => {
    if (selectedGumShade) {
      console.log('🔄 Zustand gum shade updated, syncing to product config:', selectedGumShade)
      handleProductDetailChange(
        selectedGumShade.productId,
        selectedGumShade.arch,
        "gumShadePart1",
        selectedGumShade.brandName
      )
      handleProductDetailChange(
        selectedGumShade.productId,
        selectedGumShade.arch,
        "gumShadePart2",
        selectedGumShade.shadeName
      )
    }
  }, [selectedGumShade]) // Removed handleProductDetailChange from dependencies to prevent infinite loop

  // Teeth selection store integration
  const { 
    getExtractionTypeTeeth, 
    getSelectedExtractionType,
    getAllSelectedTeeth,
    extractionTypeTeethSelection,
    selectedExtractionType,
    maxillarySelectedTeeth: zustandMaxillaryTeeth,
    mandibularSelectedTeeth: zustandMandibularTeeth
  } = useTeethSelectionStore()

  // Compute hasSelectedTeeth based on teeth selection store data
  const computedHasSelectedTeeth = useMemo(() => {
    // Check if there are any teeth selected in general selection
    const allSelectedTeeth = getAllSelectedTeeth()
    if (allSelectedTeeth.length > 0) return true
    // Also check per-extraction-type selections
    return Object.values(extractionTypeTeethSelection).some((sel: any) =>
      (sel?.maxillary?.length || 0) > 0 || (sel?.mandibular?.length || 0) > 0
    )
  }, [zustandMaxillaryTeeth, zustandMandibularTeeth, extractionTypeTeethSelection])

  // Use computed value or fallback to prop
  const effectiveHasSelectedTeeth = computedHasSelectedTeeth || hasSelectedTeeth

  // TanStack Query hooks for product data
  const queryClient = useQueryClient()

  // Get the current product ID from the open accordion item
  const currentProductIdFromAccordion = useMemo(() => {
    if (!openAccordionItem) return null
    const product = products.find(p => p.id === openAccordionItem)
    if (!product) return null
    return Number(product.id.split("-")[0]) || Number(product.id)
  }, [openAccordionItem, products])

  // Use detailed product data from API response if available, otherwise fallback to TanStack Query
  const detailedProductData = slipData?.selectedProductDetails
  
  const { data: grades = [], isLoading: gradesLoading, error: gradesError } = useProductGrades(currentProductIdFromAccordion)
  const { data: stages = [], isLoading: stagesLoading, error: stagesError } = useProductStages(currentProductIdFromAccordion)
  const { data: teethShades = [], isLoading: teethShadesLoading } = useTanStackTeethShades(currentProductIdFromAccordion)
  const { data: gumShades = [], isLoading: gumShadesLoading } = useTanStackGumShades(currentProductIdFromAccordion)
  const { data: impressions = [], isLoading: impressionsLoading } = useTanStackImpressions(currentProductIdFromAccordion)
  
  // Use detailed product data if available, otherwise use TanStack Query data
  const finalGrades = detailedProductData?.grades || grades
  const finalStages = detailedProductData?.stages || stages
  const finalTeethShades = detailedProductData?.teeth_shades || teethShades
  const finalGumShades = detailedProductData?.gum_shades || gumShades
  const finalImpressions = detailedProductData?.impressions || impressions
  const finalMaterials = detailedProductData?.materials || []
  const finalRetentions = detailedProductData?.retentions || []
  const finalExtractions = detailedProductData?.extractions || []
  const finalAddons = detailedProductData?.addons || []
  
  // Context hooks for stages and grades - provides fallback data when API data is not available
  const { stages: contextStages, isLoading: contextStagesLoading } = useStages()
  const { grades: contextGrades, isLoading: contextGradesLoading } = useGrades()
  
  // Use final data with context fallback
  const availableGrades = finalGrades.length > 0 ? finalGrades : contextGrades
  const availableStages = finalStages.length > 0 ? finalStages : contextStages
  

  const deliveryDateMutation = useDeliveryDate()
  const prefetchProductData = usePrefetchProductData()

  // Helper function to get product data from TanStack Query or fallback to context
  // Helper function to get brand name and shade name from IDs or names
  const getTeethShadeDisplay = useCallback((product: Product, arch: 'maxillary' | 'mandibular'): string => {
    const config = arch === 'maxillary' ? product.maxillaryConfig : product.mandibularConfig
    return getTeethShadeDisplayText(
      config?.teethShadePart1,
      config?.teethShadePart2,
      config?.teethShadeBrandId,
      config?.teethShadeId,
      config?.teethShadeBrandName,
      config?.teethShadeName,
      product.productTeethShades
    )
  }, [])

  const getProductData = useCallback((productId: string, dataType: 'grades' | 'stages' | 'teethShades' | 'gumShades' | 'impressions'): any[] => {
    const productIdNum = Number(productId.split('-')[0]) || Number(productId)
    const product = products.find(p => p.id === productId)
    
    let result: any[] = []
    
    // Always try multiple sources in order of preference
    switch (dataType) {
      case 'grades':
        // 1. Detailed product data (if available)
        if (detailedProductData?.grades && Array.isArray(detailedProductData.grades) && detailedProductData.grades.length > 0) {
          result = detailedProductData.grades
        }
        // 2. TanStack Query data (if this is the current product)
        else if (productIdNum === currentProductIdFromAccordion && Array.isArray(grades) && grades.length > 0) {
          result = grades
        }
        // 2. Product's own data (from when it was created)
        else if (Array.isArray(product?.grades) && product.grades.length > 0) {
          result = product.grades
        }
        // 3. Context data (global grades)
        else if (Array.isArray(contextGrades) && contextGrades.length > 0) {
          result = contextGrades
        }
        // 4. Fallback default grades
        else {
          result = [
            { id: 1, name: "Economy", code: "ECO", status: "Active" },
            { id: 2, name: "Mid Grade", code: "MID", status: "Active" },
            { id: 3, name: "Premium", code: "PREM", status: "Active" }
          ]
        }
        break
        
      case 'stages':
        // 1. Detailed product data (if available)
        if (detailedProductData?.stages && Array.isArray(detailedProductData.stages) && detailedProductData.stages.length > 0) {
          result = detailedProductData.stages
        }
        // 2. TanStack Query data (if this is the current product)
        else if (productIdNum === currentProductIdFromAccordion && Array.isArray(stages) && stages.length > 0) {
          result = stages
        }
        // 2. Product's own data (from when it was created)
        else if (Array.isArray(product?.stages) && product.stages.length > 0) {
          result = product.stages
        }
        // 3. Context data (global stages)
        else if (Array.isArray(contextStages) && contextStages.length > 0) {
          result = contextStages
        }
        // 4. Fallback default stages
        else {
          result = [
            { id: 1, name: "Bisque/Try In", code: "BISQUE", status: "Active" },
            { id: 2, name: "Die trim", code: "DIE", status: "Active" },
            { id: 3, name: "Finish", code: "FINISH", status: "Active" },
            { id: 4, name: "Digital design", code: "DIGITAL", status: "Active" }
          ]
        }
        break
        
      case 'teethShades':
        // Check if data is currently being fetched
        const isFetching = teethShadesLoading && productIdNum === currentProductIdFromAccordion
        const cachedData = queryClient.getQueryData(['product-teeth-shades', productIdNum])

        // 1. Detailed product data (highest priority - from slip data)
        if (detailedProductData?.teeth_shades && Array.isArray(detailedProductData.teeth_shades) && detailedProductData.teeth_shades.length > 0) {
          result = detailedProductData.teeth_shades
        }
        // 2. Try to get data from TanStack Query cache for this specific product
        else if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
          result = cachedData
        }
        // 3. If this is the current product, use the hook data
        else if (productIdNum === currentProductIdFromAccordion && Array.isArray(teethShades) && teethShades.length > 0) {
          result = teethShades
        }
        // 4. Product's own data (from when it was created)
        else if (Array.isArray(product?.productTeethShades) && product.productTeethShades.length > 0) {
          result = product.productTeethShades
        } else {
          result = []
        }
        break
        
      case 'gumShades':
        // 1. Detailed product data (highest priority - from slip data)
        if (detailedProductData?.gum_shades && Array.isArray(detailedProductData.gum_shades) && detailedProductData.gum_shades.length > 0) {
          result = detailedProductData.gum_shades
        }
        // 2. Try to get data from TanStack Query cache for this specific product
        else {
          const cachedData = queryClient.getQueryData(['product-gum-shades', productIdNum])
          if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
            result = cachedData
          }
          // 3. If this is the current product, use the hook data
          else if (productIdNum === currentProductIdFromAccordion && Array.isArray(gumShades) && gumShades.length > 0) {
            result = gumShades
          }
          // 4. Product's own data (from when it was created)
          else if (Array.isArray(product?.productGumShades) && product.productGumShades.length > 0) {
            result = product.productGumShades
          } else {
            result = []
          }
        }
        break
        
      case 'impressions':
        // 1. TanStack Query data (prioritized)
        if (productIdNum === currentProductIdFromAccordion && Array.isArray(impressions) && impressions.length > 0) {
          result = impressions
        }
        // 2. Detailed product data (fallback)
        else if (detailedProductData?.impressions && Array.isArray(detailedProductData.impressions) && detailedProductData.impressions.length > 0) {
        } else {
          result = []
        }
        break
        
      default:
        result = []
    }
    return result
  }, [grades, stages, teethShades, gumShades, impressions, currentProductIdFromAccordion, products, contextGrades, contextStages, detailedProductData, queryClient, cacheUpdateTrigger, teethShadesLoading])

  // Helper function to get the correct value for teeth shade dropdowns
  const getTeethShadeValue = useCallback((product: Product, arch: "maxillary" | "mandibular", part: "part1" | "part2"): string => {
    const config = arch === "maxillary" ? product.maxillaryConfig : product.mandibularConfig
    
    if (part === "part1") {
      // For brand selection, use the part1 value directly
      const value = config.teethShadePart1
      return value || "placeholder"
    } else {
      // For shade selection, use the part2 value directly
      const value = config.teethShadePart2
      return value || "placeholder"
    }
  }, [])

  // Helper function to get the correct value for gum shade dropdowns
  const getGumShadeValue = useCallback((product: Product, arch: "maxillary" | "mandibular", part: "part1" | "part2"): string => {
    const config = arch === "maxillary" ? product.maxillaryConfig : product.mandibularConfig
    
    if (part === "part1") {
      // For brand selection, use brand name if available, otherwise use ID
      if (config.gumShadeBrandName) {
        return config.gumShadeBrandName
      } else if (config.gumShadeBrandId) {
        return config.gumShadeBrandId.toString()
      }
      return "placeholder"
    } else {
      // For shade selection, use shade name if available, otherwise use ID
      if (config.gumShadeName) {
        return config.gumShadeName
      } else if (config.gumShadeId) {
        return config.gumShadeId.toString()
      }
      return "placeholder"
    }
  }, [])

  // Prefetch teeth shade data for all products on mount or when products change
  useEffect(() => {
    
    // Debounce the prefetch operations to avoid excessive calls
    const prefetchTimer = setTimeout(() => {
      products.forEach(product => {
        const productId = Number(product.id.split("-")[0]) || Number(product.id)
        if (productId) {
          // Prefetch data for all products to ensure dropdowns have data
          prefetchProductData(productId)
        }
      })
    }, 100) // 100ms debounce

    return () => clearTimeout(prefetchTimer)
  }, [products.length, prefetchProductData]) // Only run when number of products changes

  // Force re-render when teeth shade data changes by subscribing to cache updates
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null
    let lastUpdateTime = 0
    let processedQueries = new Set<string>()

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // Only process successful query updates for teeth/gum shades
      if (event?.type === 'updated' && 
          event?.query?.state?.status === 'success' &&
          (event?.query?.queryKey?.[0] === 'product-teeth-shades' ||
           event?.query?.queryKey?.[0] === 'product-gum-shades')) {
        
        const queryKey = `${event.query.queryKey[0]}-${event.query.queryKey[1]}`
        const now = Date.now()
        
        // Skip if we've already processed this query recently (within 2 seconds)
        if (processedQueries.has(queryKey) && now - lastUpdateTime < 2000) {
          return
        }
        
        processedQueries.add(queryKey)
        lastUpdateTime = now
        
        // Throttle logging to avoid spam (only log once per 5 seconds)
        if (now - lastUpdateTime > 5000) {
          // Query cache updated
        }

        // Debounce the re-render to avoid excessive updates
        if (debounceTimer) {
          clearTimeout(debounceTimer)
        }

        debounceTimer = setTimeout(() => {
          setCacheUpdateTrigger(prev => prev + 1)
          debounceTimer = null
          // Clear processed queries after re-render
          processedQueries.clear()
        }, 500) // Increased to 500ms debounce
      }
    })

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      unsubscribe()
    }
  }, [queryClient])

  // Load options when opening an accordion item
  useEffect(() => {
    if (!openAccordionItem) return
    const product = products.find(p => p.id === openAccordionItem)
    if (!product) return
    const productId = Number(product.id.split("-")[0]) || Number(product.id)
    if (!productId) return

    // Prefetch data for better UX (this will trigger TanStack Query)
    prefetchProductData(productId)

    // Initialize dropdown visibility
    initializeDropdownVisibility(product.id, product)

    // Auto-open first empty dropdown for this product (only once per product)
    if (!isAutoOpenedFor(product.id) && !isCaseSubmitted) {
      const order: (keyof DropdownVisibilityState)[] = [
        "restoration", "productName", "grade", "stage",
        "gumShadePart1", "gumShadePart2", "impression"
      ]
      
      // Helper function to find the first empty field for an arch
      const findFirstEmptyField = (arch: "maxillary" | "mandibular"): keyof DropdownVisibilityState | null => {
        for (const field of order) {
          const value = (product as any)[`${arch}Config`]?.[field]
          if (field === 'impression') {
            if (!Array.isArray(value) || value.length === 0) return field
          } else if (!value || value === "placeholder" || value === "") {
            return field
          }
        }
        return null
      }

      // Find first empty fields for both arches
      const firstMax = findFirstEmptyField('maxillary')
      const firstMand = findFirstEmptyField('mandibular')

      // Only auto-open if there's an empty field and the product has some data
      const hasSomeData = product.maxillaryConfig.grade || product.maxillaryConfig.stage || 
                         product.mandibularConfig.grade || product.mandibularConfig.stage
      
      if ((firstMax || firstMand) && hasSomeData) {
        setSelectOpen(prev => {
          const next = { ...prev }
          // Prioritize maxillary over mandibular
          if (firstMax && product.type?.includes("Maxillary")) {
            next[product.id] = { ...next[product.id], maxillary: firstMax }
          } else if (firstMand && product.type?.includes("Mandibular")) {
            next[product.id] = { ...next[product.id], mandibular: firstMand }
          }
          return next
        })

        markAsAutoOpened(product.id)
      }
    }
  }, [openAccordionItem, products, isCaseSubmitted, initializeDropdownVisibility, isAutoOpenedFor, markAsAutoOpened, prefetchProductData])



  const handleLocalProductDetailChange = (
    productId: string,
    arch: "maxillary" | "mandibular",
    field: keyof ProductConfiguration | "stage" | "grade" | "restoration" | "productName",
    value: string | number | { id: number; name: string; qty: number }[],
  ) => {
    console.log('🔄 handleLocalProductDetailChange called:', { productId, arch, field, value })
    if (field === "restoration" || field === "productName") {
      products.forEach(product => {
        ;(["maxillary", "mandibular"] as const).forEach(archKey => {
          handleProductDetailChange(product.id, archKey, field, value)
        })
      })
      // Update dropdown visibility for all products
      products.forEach(product => {
        updateDropdownVisibility(product.id, "maxillary", field)
        updateDropdownVisibility(product.id, "mandibular", field)
      })
      openNextDropdown(productId, arch, field as any)
      return
    } else if (field === "grade") {
      // Handle grade selection with ID - only update the specific product and arch
      const gradeData = getProductData(productId, 'grades')
      const gradeObj = gradeData.find((g: any) => g.name === value || g.id === value)
      
      // Only update the specific product and arch, not all products
      handleProductDetailChange(productId, arch, "grade", gradeObj?.name || value)
      handleProductDetailChange(productId, arch, "gradeId", gradeObj?.id)
      
      // If it's a "both arch" product and we're updating maxillary, also update mandibular
      const product = products.find(p => p.id === productId)
      if (product && product.type.includes("Maxillary") && product.type.includes("Mandibular") && arch === "maxillary") {
        handleProductDetailChange(productId, "mandibular", "grade", gradeObj?.name || value)
        handleProductDetailChange(productId, "mandibular", "gradeId", gradeObj?.id)
      }
      
      // Update dropdown visibility for this product
      updateDropdownVisibility(productId, "maxillary", field)
      updateDropdownVisibility(productId, "mandibular", field)
      openNextDropdown(productId, arch, field as any)
      return
    } else if (field === "stage") {
      // Handle stage selection with ID - only update the specific product and arch
      const stageData = getProductData(productId, 'stages')
      const stageObj = stageData.find((s: any) => s.name === value || s.id === value)
      
      // Only update the specific product and arch, not all products
      handleProductDetailChange(productId, arch, "stage", stageObj?.name || value)
      handleProductDetailChange(productId, arch, "stageId", stageObj?.id)
      
      // If it's a "both arch" product and we're updating maxillary, also update mandibular
      const product = products.find(p => p.id === productId)
      if (product && product.type.includes("Maxillary") && product.type.includes("Mandibular") && arch === "maxillary") {
        handleProductDetailChange(productId, "mandibular", "stage", stageObj?.name || value)
        handleProductDetailChange(productId, "mandibular", "stageId", stageObj?.id)
      }
      
      // Update dropdown visibility for this product
      updateDropdownVisibility(productId, "maxillary", field)
      updateDropdownVisibility(productId, "mandibular", field)
      openNextDropdown(productId, arch, field as any)
      return
    }

    if (field === "teethShadePart1") {
      const teethShadeData = getProductData(productId, 'teethShades')
      // Try multiple matching strategies to find the brand
      const valueStr = String(value || '')
      const brandObj = teethShadeData.find((b: any) => {
        // Exact match
        if (b.name === valueStr || b.id === value || b.id?.toString() === valueStr) return true
        // Partial match
        if (b.name && valueStr && (b.name.includes(valueStr) || valueStr.includes(b.name))) return true
        // System name match
        if (b.system_name === valueStr) return true
        // Normalized match
        const normalizedBrandName = (b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        const normalizedValue = valueStr.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (normalizedBrandName && normalizedValue && normalizedBrandName === normalizedValue) return true
        return false
      })
      
      // ALWAYS set the brand ID when a brand is selected
      if (brandObj) {
        handleProductDetailChange(productId, arch, "teethShadeBrandId", brandObj.id)
        handleProductDetailChange(productId, arch, "teethShadeBrandName", brandObj.name)
        // Store brand ID in Part1 instead of name
        handleProductDetailChange(productId, arch, field, brandObj.id.toString())
      } else {
        // If brand not found, still set what user selected but log a warning
        console.warn('⚠️ Brand not found for teeth shade selection:', value)
        handleProductDetailChange(productId, arch, field, value)
        // Note: We don't clear the brand ID here - keep existing value if brand lookup fails
      }
      
      // Auto-copy to mandibular if both arches are selected and maxillary is being updated
      const product = products.find(p => p.id === productId)
      if (product && product.type.includes("Maxillary") && product.type.includes("Mandibular") && arch === "maxillary") {
        // Only update mandibular brand if we found a valid brand
        if (brandObj) {
          handleProductDetailChange(productId, "mandibular", "teethShadeBrandId", brandObj.id)
          handleProductDetailChange(productId, "mandibular", "teethShadeBrandName", brandObj.name)
          // Store brand ID in Part1 instead of name
          handleProductDetailChange(productId, "mandibular", "teethShadePart1", brandObj.id.toString())
        } else {
          // Note: We don't clear the brand ID here - keep existing value if brand lookup fails
        }
        // Clear mandibular teeth shade part2 since brand changed
        handleProductDetailChange(productId, "mandibular", "teethShadePart2", "")
        // Clear shade ID when brand changes
        handleProductDetailChange(productId, "mandibular", "teethShadeId", "")
        handleProductDetailChange(productId, "mandibular", "teethShadeName", "")
      }
      
      // Update dropdown visibility and auto-open next dropdown
      updateDropdownVisibility(productId, arch, field)
      updateDropdownVisibility(productId, "mandibular", field)
      openNextDropdown(productId, arch, field as any)
    } else if (field === "teethShadePart2") {
      const teethShadeData = getProductData(productId, 'teethShades')
      const product = products.find(p => p.id === productId)
      const config = arch === "maxillary" ? product?.maxillaryConfig : product?.mandibularConfig
      
      // Try to find the brand by name, with fallback to partial matching
      const brandObj = teethShadeData.find((b: any) => {
        // Normalize names for comparison
        const normalizedBrandName = b.name?.toLowerCase().replace(/[^a-z0-9]/g, '')
        const normalizedConfigName = config?.teethShadePart1?.toLowerCase().replace(/[^a-z0-9]/g, '')
        
        const exactMatch = b.name === config?.teethShadePart1
        const containsMatch = b.name.includes(config?.teethShadePart1) || config?.teethShadePart1?.includes(b.name)
        const normalizedMatch = normalizedBrandName === normalizedConfigName
        
        const match = exactMatch || containsMatch || normalizedMatch
        return match
      })
      
      
      let shadeObj = null
      
      if (brandObj?.shades) {
        // Try to find the shade within the found brand
        shadeObj = brandObj.shades.find((s: any) => {
          const match = s.name === value || s.id === value || s.id?.toString() === value?.toString()
          return match
        })
      }
      
      // If no shade found in the brand, try to find it across all brands
      let foundBrandForShade = brandObj
      if (!shadeObj) {
        for (const brand of teethShadeData) {
          const foundShade = brand.shades?.find((s: any) => {
            const match = s.name === value || s.id === value || s.id?.toString() === value?.toString()
            return match
          })
          if (foundShade) {
            shadeObj = foundShade
            foundBrandForShade = brand // Update brand if shade found in different brand
            break
          }
        }
      }
      
      
      // Set the teeth shade ID - use null if not found to avoid foreign key constraint issues
      const teethShadeId = shadeObj?.id || null
      // ALWAYS ensure teethShadeBrandId is set when a shade is selected
      if (foundBrandForShade) {
        handleProductDetailChange(productId, arch, "teethShadeBrandId", foundBrandForShade.id)
        handleProductDetailChange(productId, arch, "teethShadeBrandName", foundBrandForShade.name)
        // Store brand ID in Part1 instead of name
        handleProductDetailChange(productId, arch, "teethShadePart1", foundBrandForShade.id.toString())
      }
      // Make sure we're setting the shade ID, not the brand ID
      handleProductDetailChange(productId, arch, "teethShadeId", teethShadeId)
      handleProductDetailChange(productId, arch, "teethShadeName", shadeObj?.name)
      // Store shade ID in Part2 instead of name
      handleProductDetailChange(productId, arch, field, teethShadeId ? teethShadeId.toString() : value)
      
      // Auto-copy to mandibular if both arches are selected and maxillary is being updated
      if (product && product.type.includes("Maxillary") && product.type.includes("Mandibular") && arch === "maxillary") {
        if (foundBrandForShade) {
          handleProductDetailChange(productId, "mandibular", "teethShadeBrandId", foundBrandForShade.id)
          handleProductDetailChange(productId, "mandibular", "teethShadeBrandName", foundBrandForShade.name)
          // Store brand ID in Part1 instead of name
          handleProductDetailChange(productId, "mandibular", "teethShadePart1", foundBrandForShade.id.toString())
        }
        handleProductDetailChange(productId, "mandibular", "teethShadeId", teethShadeId)
        handleProductDetailChange(productId, "mandibular", "teethShadeName", shadeObj?.name)
        // Store shade ID in Part2 instead of name
        handleProductDetailChange(productId, "mandibular", "teethShadePart2", teethShadeId ? teethShadeId.toString() : value)
      }
      
      // Update dropdown visibility and auto-open next dropdown
      updateDropdownVisibility(productId, arch, field)
      updateDropdownVisibility(productId, "mandibular", field)
      openNextDropdown(productId, arch, field as any)
    } else if (field === "gumShadePart1") {
      const gumShadeData = getProductData(productId, 'gumShades')
      const shadeObj = gumShadeData.find((s: any) => s.id?.toString() === value?.toString() || s.name === value)
      handleProductDetailChange(productId, arch, "gumShadeBrandId", shadeObj?.id)
      handleProductDetailChange(productId, arch, "gumShadeBrandName", shadeObj?.name)
      handleProductDetailChange(productId, arch, field, shadeObj?.name)
      const product = products.find(p => p.id === productId)
      if (product && product.type.includes("Maxillary") && product.type.includes("Mandibular") && arch === "maxillary") {
        handleProductDetailChange(productId, "mandibular", "gumShadeBrandId", shadeObj?.id)
        handleProductDetailChange(productId, "mandibular", "gumShadeBrandName", shadeObj?.name)
        handleProductDetailChange(productId, "mandibular", "gumShadePart1", shadeObj?.name)
        handleProductDetailChange(productId, "mandibular", "gumShadePart2", "")
        handleProductDetailChange(productId, "mandibular", "gumShadeId", "")
        handleProductDetailChange(productId, "mandibular", "gumShadeName", "")
      }
      
      // Update dropdown visibility and auto-open next dropdown
      updateDropdownVisibility(productId, arch, field)
      updateDropdownVisibility(productId, "mandibular", field)
      openNextDropdown(productId, arch, field as any)
    } else if (field === "gumShadePart2") {
      const gumShadeData = getProductData(productId, 'gumShades')
      const product = products.find(p => p.id === productId)
      const config = arch === "maxillary" ? product?.maxillaryConfig : product?.mandibularConfig
    
      // Try to find the brand by name, with fallback to partial matching
      const gumShadeBrand = gumShadeData.find((brand: any) => {
        const match = brand.name === config?.gumShadePart1 || 
                     brand.name.includes(config?.gumShadePart1) ||
                     config?.gumShadePart1?.includes(brand.name)
        return match
      })
      
      
      const shadeObj = gumShadeBrand?.shades?.find((s: any) => {
        const match = s.name === value || s.id === value || s.id?.toString() === value?.toString()
        return match
      })
      
      
      // Set the gum shade ID - use null if not found to avoid foreign key constraint issues
      const gumShadeId = shadeObj?.id || null
      
      handleProductDetailChange(productId, arch, "gumShadeId", gumShadeId)
      handleProductDetailChange(productId, arch, "gumShadeName", shadeObj?.name)
      handleProductDetailChange(productId, arch, "gumShadePart2", shadeObj?.name ?? value)
      if (product && product.type.includes("Maxillary") && product.type.includes("Mandibular") && arch === "maxillary") {
        handleProductDetailChange(productId, "mandibular", "gumShadeId", gumShadeId)
        handleProductDetailChange(productId, "mandibular", "gumShadeName", shadeObj?.name)
        handleProductDetailChange(productId, "mandibular", "gumShadePart2", shadeObj?.name ?? value)
      }
      
      // Update dropdown visibility and auto-open next dropdown
      updateDropdownVisibility(productId, arch, field)
      updateDropdownVisibility(productId, "mandibular", field)
      openNextDropdown(productId, arch, field as any)
    } else if (field === "impressions") {
      handleProductDetailChange(productId, arch, field, value)
      const product = products.find(p => p.id === productId)
      if (product && product.type.includes("Maxillary") && product.type.includes("Mandibular") && arch === "maxillary") {
        handleProductDetailChange(productId, "mandibular", field, value)
      }
    } else {
      handleProductDetailChange(productId, arch, field, value)
      // Update dropdown visibility and auto-open next dropdown for other fields
      updateDropdownVisibility(productId, arch, field as any)
      openNextDropdown(productId, arch, field as any)
    }
  }

  useEffect(() => {
    products.forEach(product => {
      const arches = product.type || "N/A"
      
      // Get selected teeth from teeth selection store
      const maxillarySelectedTeeth = getExtractionTypeTeeth('Teeth in mouth', 'maxillary')
      const mandibularSelectedTeeth = getExtractionTypeTeeth('Teeth in mouth', 'mandibular')
      
      // Fallback to product teeth if no selection in store
      const maxTeeth = maxillarySelectedTeeth.length > 0 
        ? maxillarySelectedTeeth.map(t => `#${t}`).join(', ')
        : (product.maxillaryTeeth || product.teeth || "")
      const manTeeth = mandibularSelectedTeeth.length > 0
        ? mandibularSelectedTeeth.map(t => `#${t}`).join(', ')
        : (product.mandibularTeeth || "")
      
      let toothNumbers = ""
      
      // Build tooth numbers string with proper formatting
      const maxTeethList = maxTeeth.split(",").map(t => t.trim()).filter(t => t.length > 0)
      const manTeethList = manTeeth.split(",").map(t => t.trim()).filter(t => t.length > 0)
      
      if (maxTeethList.length > 0 && manTeethList.length > 0) {
        toothNumbers = `Maxillary teeth ${maxTeethList.join(", ")}, Mandibular teeth ${manTeethList.join(", ")}`
      } else if (maxTeethList.length > 0) {
        toothNumbers = `Maxillary teeth ${maxTeethList.join(", ")}`
      } else if (manTeethList.length > 0) {
        toothNumbers = `Mandibular teeth ${manTeethList.join(", ")}`
      } else {
        toothNumbers = "N/A"
      }
      
      const maxConfig = product.maxillaryConfig
      const manConfig = product.mandibularConfig
      const grade = maxConfig.grade || manConfig.grade || "N/A"
      const productName = maxConfig.productName || manConfig.productName || "N/A"
      const stage = maxConfig.stage || manConfig.stage || "N/A"
      const teethShade = maxConfig.teethShadePart1 && maxConfig.teethShadePart2 
        ? getTeethShadeDisplayText(
            maxConfig.teethShadePart1,
            maxConfig.teethShadePart2,
            maxConfig.teethShadeBrandId,
            maxConfig.teethShadeId,
            maxConfig.teethShadeBrandName,
            maxConfig.teethShadeName,
            product.productTeethShades
          )
        : "N/A"
      const gumShade = `${maxConfig.gumShadePart1} - ${maxConfig.gumShadePart2}`.trim() || "N/A"
      const impression = maxConfig.impressions || manConfig.impressions
        ? (maxConfig.impressions ?? manConfig.impressions)?.map(i => `${i.qty}x ${i.name}`).join(", ")
        : "1x STL"

      let addOnsText = ""
      if ((product.addOns?.maxillary?.length || 0) + (product.addOns?.mandibular?.length || 0) > 0) {
        const list = [
          ...(product.addOns.maxillary ?? []),
          ...(product.addOns.mandibular ?? []),
        ].map((ao: any) => `${ao.qty ?? 1}x ${ao.addOn ?? ao.name ?? "Add-on"}`).join(", ")
        addOnsText = ` and Add-on: ${list} on ${toothNumbers}`
      }
      let rushText = ""
      if (rushRequests && rushRequests[product.id]) {
        rushText = `\nRush case for ${rushRequests[product.id].targetDate} delivery.`
      }
      const notes = `Fabricate a ${grade} ${productName} for ${arches} ${toothNumbers}, in ${stage} stage, using ${teethShade} shade and ${gumShade} gum, with ${impression}${addOnsText}.${rushText}`
      product.stageNotesContent = notes
    })
  }, [products.map(p =>
    JSON.stringify(p.maxillaryConfig) +
    JSON.stringify(p.mandibularConfig) +
    JSON.stringify(p.addOns) +
    (p.teeth || "") +
    (p.maxillaryTeeth || "") +
    (p.mandibularTeeth || "")
  ).join(), rushRequests, extractionTypeTeethSelection])





  const handleOpenAddOnsModalWithFetch = async (productId: string, arch: "maxillary" | "mandibular") => {
    setCurrentArch(arch)
    handleOpenAddOnsModal(productId)
  }

  const handleOpenMaxillaryAddOnsModalWithFetch = async (productId: string) => {
    handleOpenMaxillaryAddOnsModal(productId)
  }

  const handleOpenMandibularAddOnsModalWithFetch = async (productId: string) => {
    handleOpenMandibularAddOnsModal(productId)
  }

  // Removed extraction modal state - using product selection for extractions instead

  // Handler for when a product is selected from the modal
  const handleProductSelect = (product: any, arch: string) => {
    // If parent provides a callback, use it to handle the product selection
    if (onProductSelected) {
      onProductSelected(product, arch)
    } else {
      // Fallback to the existing handleAddProductClick for compatibility
      handleAddProductClick()
    }
    setShowAddProductModal(false)
  }

  // Handler for opening the add product modal
  const handleOpenAddProductModal = () => {
    setShowAddProductModal(true)
  }

  // Handler for opening the impression selection modal
  const handleOpenImpressionModal = (productId: string, arch: "maxillary" | "mandibular") => {
    setImpressionModalProductId(productId)
    setImpressionModalArch(arch)
    setShowImpressionModal(true)
  }

  // Handler for closing the impression selection modal
  const handleCloseImpressionModal = () => {
    // Save the selected impressions before closing
    // DISABLED: Don't save product when closing impression modal
    // if (impressionModalProductId && impressionModalArch) {
    //   const selectedImpressions = Object.entries(impressionQuantities)
    //     .filter(([key, qty]) => key.startsWith(`${impressionModalProductId}_${impressionModalArch}_`) && (qty as number) > 0)
    //     .map(([key, qty]) => {
    //       const name = key.replace(`${impressionModalProductId}_${impressionModalArch}_`, "")
    //       const impressionData = getProductData(impressionModalProductId, 'impressions')
    //       const impObj = impressionData.find((opt: any) => opt.name === name)
    //       return { id: impObj?.id ?? null, name, qty: qty as number }
    //     })
    //   
    //   handleProductDetailChange(impressionModalProductId, impressionModalArch, "impressions", selectedImpressions)
    //   
    //   // Auto-copy maxillary impressions to mandibular if arch type is "both"
    //   const product = products.find(p => p.id === impressionModalProductId)
    //   if (product && product.type.includes("Mandibular") && impressionModalArch === "maxillary") {
    //     handleProductDetailChange(impressionModalProductId, "mandibular", "impressions", selectedImpressions)
    //     
    //     // Also copy the impression quantities to mandibular keys
    //     Object.entries(impressionQuantities)
    //       .filter(([key, qty]) => key.startsWith(`${impressionModalProductId}_maxillary_`) && (qty as number) > 0)
    //       .forEach(([key, qty]) => {
    //         const mandibularKey = key.replace(`${impressionModalProductId}_maxillary_`, `${impressionModalProductId}_mandibular_`)
    //         updateImpressionQuantity(mandibularKey, qty as number)
    //       })
    //   }
    // }
    
    setShowImpressionModal(false)
    setImpressionModalProductId("")
    setImpressionModalArch("maxillary")
  }

  // Handler for updating impression quantity in modal
  const handleImpressionQuantityUpdate = (impressionKey: string, quantity: number) => {
    updateImpressionQuantity(impressionKey, quantity)
  }

  // Handler for removing impression in modal
  const handleImpressionRemove = (impressionKey: string) => {
    removeImpressionQuantity(impressionKey)
  }

  function handleRemoveAddOn(productId: string, arch: "maxillary" | "mandibular", index: number) {
    
    // Remove from Zustand store
    removeAddOnFromStore(productId, arch, index)
    
    // Update the products state for backward compatibility
    const updatedProducts = products.map(product => {
      if (product.id === productId) {
        const currentAddOns = product.addOns?.[arch] || []
        const newAddOns = [...currentAddOns]
        newAddOns.splice(index, 1)
        
        return {
          ...product,
          addOns: {
            ...product.addOns,
            [arch]: newAddOns,
          },
        }
      }
      return product
    })
    
    // Call the parent function to update the state
    if (handleAddAddOnsToProduct) {
      // We need to pass the updated add-ons for the specific arch
      const product = updatedProducts.find(p => p.id === productId)
      if (product) {
        const archAddOns = product.addOns?.[arch] || []
        
        // Clear any cached data for this product/arch combination
        if (typeof window !== "undefined") {
          try {
            const cacheKey = `addons_${productId}_${arch}`
            localStorage.removeItem(cacheKey)
          } catch (error) {
            console.error("Error clearing cache:", error)
          }
        }
        
        // Update the product with the new add-ons
        handleAddAddOnsToProduct(productId, archAddOns, arch)
      }
    }
  }

  const handleAddAddOns = (productId: string, addOns: any[], arch: "maxillary" | "mandibular") => {
    handleAddAddOnsToProduct(productId, addOns, arch)
  }

  // Removed handleRemoveExtraction function - using product selection for extractions instead

  // Shade selection modal handlers
  const handleShadeSelect = (shade: string, system: string) => {
    if (shadeModalProductId && shadeModalArch) {
      handleLocalProductDetailChange(shadeModalProductId, shadeModalArch, "teethShadePart2", shade)
      // Also set the shade ID if needed
      const teethShadeData = getProductData(shadeModalProductId, 'teethShades')
      const brandObj = teethShadeData.find((b: any) => b.name?.toLowerCase().includes("vita"))
      const shadeObj = brandObj?.shades?.find((s: any) => s.name === shade)
      if (shadeObj) {
        handleLocalProductDetailChange(shadeModalProductId, shadeModalArch, "teethShadeId", shadeObj.id)
      }
    }
  }

  const handleSetShadeAsDefault = (system: string, shade: string) => {
    // TODO: Implement setting shade as default for the office
  }

  // Teeth shade selection modal handlers
  const handleOpenTeethShadeSelection = (productId: string, arch: 'maxillary' | 'mandibular') => {
    // Use selectedProductId from slip store if available, otherwise extract from productId string
    setSelectedProductForShadeGuide(productId)
    setSelectedArchForShadeGuide(arch)
    setTeethShadeSelectionOpen(true)
  }

  const handleCloseTeethShadeSelection = () => {
    setTeethShadeSelectionOpen(false)
    setSelectedProductForShadeGuide(null)
    setSelectedArchForShadeGuide(null)
  }

  const handleTeethShadeSelectionConfirm = (shadeSystem: string, individualShade: string) => {
    if (selectedProductForShadeGuide && selectedArchForShadeGuide) {
      // Map brand and shade IDs from available API data - use improved matching
      const brandName = shadeSystem
      const teethShadeData: any[] = getProductData(selectedProductForShadeGuide, 'teethShades')
      
      // Try multiple matching strategies to find brand
      const brandObj = teethShadeData?.find((b: any) => {
        if (b.name === brandName || b.system_name === brandName) return true
        if (b.name?.includes(brandName) || brandName?.includes(b.name)) return true
        const normalizedBrandName = (b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        const normalizedSystem = (brandName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        if (normalizedBrandName && normalizedSystem && normalizedBrandName === normalizedSystem) return true
        return false
      })
      
      // Try to find shade - search in found brand first, then across all brands
      let shadeObj = brandObj?.shades?.find((s: any) => 
        s.name === individualShade || s.id?.toString() === individualShade?.toString()
      )
      
      // If not found in brand, search across all brands
      let foundBrandObj = brandObj
      if (!shadeObj && teethShadeData) {
        for (const brand of teethShadeData) {
          if (brand.shades) {
            shadeObj = brand.shades.find((s: any) => 
              s.name === individualShade || 
              s.id?.toString() === individualShade?.toString() ||
              s.shade_name === individualShade
            )
            if (shadeObj) {
              // Use the brand that contains this shade
              foundBrandObj = brand
              break
            }
          }
        }
      }
      
      // Update brandObj if we found a different brand
      const finalBrandObj = foundBrandObj || brandObj
      
      // Log if shade not found for debugging
      if (!shadeObj) {
        console.warn('⚠️ Shade not found in confirm handler:', { 
          individualShade, 
          brandName, 
          brandObj: finalBrandObj?.name,
          availableShades: finalBrandObj?.shades?.map((s: any) => s.name),
          allBrands: teethShadeData?.map((b: any) => ({ name: b.name, shadeCount: b.shades?.length }))
        })
      }

      // Get the product to check if it's a "both" arch type
      const product = products.find(p => p.id === selectedProductForShadeGuide)
      const isBothArch = product && product.type.includes("Maxillary") && product.type.includes("Mandibular")
      
      console.log('🔍 Product type check:', { 
        productId: selectedProductForShadeGuide,
        productType: product?.type,
        isBothArch,
        selectedArchForShadeGuide,
        allProducts: products.map(p => ({ id: p.id, type: p.type }))
      })

      // Update via Zustand for live UI - use the selected arch, not the "both" logic
      console.log('🔄 Confirm: Updating Zustand store:', { 
        productId: selectedProductForShadeGuide, 
        arch: selectedArchForShadeGuide, 
        shadeSystem: brandName, 
        individualShade: individualShade 
      })
      updateShade(selectedProductForShadeGuide, selectedArchForShadeGuide, brandName, individualShade)

      // Persist IDs/names expected by backend - use finalBrandObj which may have been updated
      if (finalBrandObj?.id) {
        handleProductDetailChange(selectedProductForShadeGuide, selectedArchForShadeGuide, 'teethShadeBrandId', finalBrandObj.id)
        handleProductDetailChange(selectedProductForShadeGuide, selectedArchForShadeGuide, 'teethShadeBrandName', finalBrandObj.name)
        handleLocalProductDetailChange(selectedProductForShadeGuide, selectedArchForShadeGuide, 'teethShadePart1', finalBrandObj.id.toString())
      } else {
        console.warn('⚠️ Brand not found when updating shade, cannot set brand ID')
        handleLocalProductDetailChange(selectedProductForShadeGuide, selectedArchForShadeGuide, 'teethShadePart1', brandName)
      }
      
      if (shadeObj?.id) {
        handleProductDetailChange(selectedProductForShadeGuide, selectedArchForShadeGuide, 'teethShadeId', shadeObj.id)
        handleProductDetailChange(selectedProductForShadeGuide, selectedArchForShadeGuide, 'teethShadeName', shadeObj.name)
        handleLocalProductDetailChange(selectedProductForShadeGuide, selectedArchForShadeGuide, 'teethShadePart2', shadeObj.id.toString())
      } else {
        console.warn('⚠️ Shade not found when updating, cannot set shade ID:', { individualShade, brandName })
        handleLocalProductDetailChange(selectedProductForShadeGuide, selectedArchForShadeGuide, 'teethShadePart2', individualShade)
      }

      // If it's a "both" arch product and we're updating maxillary, also update mandibular
      if (isBothArch && selectedArchForShadeGuide === 'maxillary') {
        console.log('🔄 Updating mandibular for both arch product:', { 
          productId: selectedProductForShadeGuide, 
          brandName, 
          individualShade,
          isBothArch,
          finalBrandObj: finalBrandObj?.id,
          shadeObj: shadeObj?.id
        })
        
        // Don't update Zustand store for mandibular - keep the selected arch in the store
        
        // Persist IDs/names for mandibular - ensure we have valid IDs
        if (finalBrandObj?.id) {
          handleProductDetailChange(selectedProductForShadeGuide, 'mandibular', 'teethShadeBrandId', finalBrandObj.id)
          handleProductDetailChange(selectedProductForShadeGuide, 'mandibular', 'teethShadeBrandName', finalBrandObj.name)
          handleProductDetailChange(selectedProductForShadeGuide, 'mandibular', 'teethShadePart1', finalBrandObj.id.toString())
        } else {
          console.warn('⚠️ Brand not found when updating mandibular, cannot set brand ID')
        }
        
        if (shadeObj?.id) {
          handleProductDetailChange(selectedProductForShadeGuide, 'mandibular', 'teethShadeId', shadeObj.id)
          handleProductDetailChange(selectedProductForShadeGuide, 'mandibular', 'teethShadeName', shadeObj.name)
          handleProductDetailChange(selectedProductForShadeGuide, 'mandibular', 'teethShadePart2', shadeObj.id.toString())
          console.log('✅ Mandibular shade ID set:', shadeObj.id)
        } else {
          console.warn('⚠️ Shade not found when updating mandibular, cannot set shade ID:', { individualShade, brandName })
          // Try to find shade from Part2 if it's an ID
          const mandibularConfig = products.find(p => p.id === selectedProductForShadeGuide)?.mandibularConfig
          if (mandibularConfig?.teethShadePart2 && /^\d+$/.test(mandibularConfig.teethShadePart2)) {
            const shadeIdFromPart2 = parseInt(mandibularConfig.teethShadePart2)
            handleProductDetailChange(selectedProductForShadeGuide, 'mandibular', 'teethShadeId', shadeIdFromPart2)
            console.log('✅ Mandibular shade ID set from Part2:', shadeIdFromPart2)
          }
        }
        
        console.log('✅ Mandibular update completed')
      }

      // Verify
      setTimeout(() => {
        const updatedProduct = products.find(p => p.id === selectedProductForShadeGuide)
        const config = selectedArchForShadeGuide === 'maxillary' ? updatedProduct?.maxillaryConfig : updatedProduct?.mandibularConfig
        // Verify the updated configuration
        const updatedConfig = {
          teethShadePart1: config?.teethShadePart1,
          teethShadePart2: config?.teethShadePart2,
          teethShadeBrandId: (selectedArchForShadeGuide === 'maxillary' ? updatedProduct?.maxillaryConfig?.teethShadeBrandId : updatedProduct?.mandibularConfig?.teethShadeBrandId),
          teethShadeId: (selectedArchForShadeGuide === 'maxillary' ? updatedProduct?.maxillaryConfig?.teethShadeId : updatedProduct?.mandibularConfig?.teethShadeId)
        }
      }, 100)
    } else {
      console.warn('⚠️ No product or arch selected for shade guide')
    }
    handleCloseTeethShadeSelection()
  }

  const handleTeethShadeLiveUpdate = (shadeSystem: string, individualShade: string) => {
    console.log('🔄 Live update called:', { shadeSystem, individualShade, selectedProductForShadeGuide, selectedArchForShadeGuide })
    console.log('🔄 Current products state:', products.map(p => ({ 
      id: p.id, 
      maxillaryTeethShade: p.maxillaryConfig?.teethShadePart2,
      mandibularTeethShade: p.mandibularConfig?.teethShadePart2
    })))
    
    if (selectedProductForShadeGuide && selectedArchForShadeGuide) {
      // Map brand and shade IDs from available API data - use improved matching
      const brandName = shadeSystem
      const teethShadeData: any[] = getProductData(selectedProductForShadeGuide, 'teethShades')
      
      // Try multiple matching strategies to find brand
      const brandObj = teethShadeData?.find((b: any) => {
        if (b.name === brandName || b.system_name === brandName) return true
        if (b.name?.includes(brandName) || brandName?.includes(b.name)) return true
        const normalizedBrandName = (b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        const normalizedSystem = (brandName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        if (normalizedBrandName && normalizedSystem && normalizedBrandName === normalizedSystem) return true
        return false
      })
      
      // Try to find shade - search in found brand first, then across all brands
      let shadeObj = brandObj?.shades?.find((s: any) => 
        s.name === individualShade || s.id?.toString() === individualShade?.toString()
      )
      
      // If not found in brand, search across all brands
      let foundBrandObj = brandObj
      if (!shadeObj && teethShadeData) {
        for (const brand of teethShadeData) {
          if (brand.shades) {
            shadeObj = brand.shades.find((s: any) => 
              s.name === individualShade || 
              s.id?.toString() === individualShade?.toString() ||
              s.shade_name === individualShade
            )
            if (shadeObj) {
              // Use the brand that contains this shade
              foundBrandObj = brand
              break
            }
          }
        }
      }
      
      // Update brandObj if we found a different brand
      const finalBrandObj = foundBrandObj || brandObj
      
      // Log if shade not found for debugging
      if (!shadeObj) {
        console.warn('⚠️ Shade not found in live update:', { 
          individualShade, 
          brandName, 
          brandObj: finalBrandObj?.name,
          availableShades: finalBrandObj?.shades?.map((s: any) => s.name),
          allBrands: teethShadeData?.map((b: any) => ({ name: b.name, shadeCount: b.shades?.length }))
        })
      }

      console.log('🎨 Updating shade:', { 
        brandName, 
        brandId: brandObj?.id,
        shadeName: shadeObj?.name ?? individualShade,
        shadeId: shadeObj?.id 
      })

      // Get the product to check if it's a "both" arch type
      const product = products.find(p => p.id === selectedProductForShadeGuide)
      const isBothArch = product && product.type.includes("Maxillary") && product.type.includes("Mandibular")
      
      console.log('🔍 Live update - Product type check:', { 
        productId: selectedProductForShadeGuide,
        productType: product?.type,
        isBothArch,
        selectedArchForShadeGuide,
        allProducts: products.map(p => ({ id: p.id, type: p.type }))
      })

      // Update brand and shade IDs first - use finalBrandObj which may have been updated
      if (finalBrandObj?.id) {
        handleProductDetailChange(selectedProductForShadeGuide, selectedArchForShadeGuide, 'teethShadeBrandId', finalBrandObj.id)
        handleProductDetailChange(selectedProductForShadeGuide, selectedArchForShadeGuide, 'teethShadeBrandName', finalBrandObj.name)
        handleLocalProductDetailChange(selectedProductForShadeGuide, selectedArchForShadeGuide, 'teethShadePart1', finalBrandObj.id.toString())
      } else {
        console.warn('⚠️ Brand not found in live update')
        handleLocalProductDetailChange(selectedProductForShadeGuide, selectedArchForShadeGuide, 'teethShadePart1', brandName)
      }
      
      if (shadeObj?.id) {
        handleProductDetailChange(selectedProductForShadeGuide, selectedArchForShadeGuide, 'teethShadeId', shadeObj.id)
        handleProductDetailChange(selectedProductForShadeGuide, selectedArchForShadeGuide, 'teethShadeName', shadeObj.name)
        handleLocalProductDetailChange(selectedProductForShadeGuide, selectedArchForShadeGuide, 'teethShadePart2', shadeObj.id.toString())
      } else {
        console.warn('⚠️ Shade not found in live update')
        handleLocalProductDetailChange(selectedProductForShadeGuide, selectedArchForShadeGuide, 'teethShadePart2', individualShade)
      }
      
      // Also update the Zustand store for immediate UI reflection - use the selected arch, not the "both" logic
      console.log('🔄 Live update: Updating Zustand store for selected arch:', { 
        productId: selectedProductForShadeGuide, 
        arch: selectedArchForShadeGuide, 
        shadeSystem: finalBrandObj?.name ?? brandName, 
        individualShade: shadeObj?.name ?? individualShade 
      })
      updateShade(selectedProductForShadeGuide, selectedArchForShadeGuide, finalBrandObj?.name ?? brandName, shadeObj?.name ?? individualShade)
      
      // If it's a "both" arch product and we're updating maxillary, also update mandibular
      if (isBothArch && selectedArchForShadeGuide === 'maxillary') {
        console.log('🔄 Live update: Updating mandibular for both arch product:', { 
          productId: selectedProductForShadeGuide, 
          brandName, 
          individualShade,
          isBothArch,
          finalBrandObj: finalBrandObj?.id,
          shadeObj: shadeObj?.id
        })
        
        // Update mandibular in real-time - store IDs and update brand/shade IDs
        if (finalBrandObj?.id) {
          handleProductDetailChange(selectedProductForShadeGuide, 'mandibular', 'teethShadeBrandId', finalBrandObj.id)
          handleProductDetailChange(selectedProductForShadeGuide, 'mandibular', 'teethShadeBrandName', finalBrandObj.name)
          handleProductDetailChange(selectedProductForShadeGuide, 'mandibular', 'teethShadePart1', finalBrandObj.id.toString())
        } else {
          console.warn('⚠️ Brand not found in live update for mandibular')
        }
        
        if (shadeObj?.id) {
          handleProductDetailChange(selectedProductForShadeGuide, 'mandibular', 'teethShadeId', shadeObj.id)
          handleProductDetailChange(selectedProductForShadeGuide, 'mandibular', 'teethShadeName', shadeObj.name)
          handleProductDetailChange(selectedProductForShadeGuide, 'mandibular', 'teethShadePart2', shadeObj.id.toString())
          console.log('✅ Live update: Mandibular shade ID set:', shadeObj.id)
        } else {
          console.warn('⚠️ Shade not found in live update for mandibular:', { individualShade, brandName })
        }
        
        // Don't update Zustand store for mandibular - keep the selected arch in the store
        
        console.log('✅ Live update: Mandibular update completed')
      }
    } else {
      console.warn('⚠️ No product or arch selected for live update')
    }
  }

  // Gum shade selection modal handlers
  const handleOpenGumShadeSelection = (productId: string, arch: 'maxillary' | 'mandibular') => {
    console.log('🎯 Opening gum shade selection:', { productId, arch })
    
    // Use selectedProductId from slip store if available, otherwise extract from productId string
    const numericProductId = storeSlipData?.selectedProduct?.id || Number(productId.split("-")[0]) || Number(productId)
    console.log('🎯 Using product ID for API:', { 
      productId, 
      numericProductId, 
      fromSlipStore: !!storeSlipData?.selectedProduct?.id,
      slipStoreProductId: storeSlipData?.selectedProduct?.id 
    })
    
    setSelectedProductForGumShadeGuide(productId)
    setSelectedArchForGumShadeGuide(arch)
    setGumShadeSelectionOpen(true)
  }

  const handleCloseGumShadeSelection = () => {
    setGumShadeSelectionOpen(false)
    setSelectedProductForGumShadeGuide(null)
    setSelectedArchForGumShadeGuide(null)
  }

  const handleGumShadeSelectionConfirm = (shadeSystem: string, individualShade: string) => {
    if (selectedProductForGumShadeGuide && selectedArchForGumShadeGuide) {
      // Parse the shade system to extract brand name and ID (format: "BrandName|BrandID")
      let brandName = shadeSystem
      let brandId = null
      
      if (shadeSystem.includes('|')) {
        const parts = shadeSystem.split('|')
        brandName = parts[0]
        brandId = parts[1] ? parseInt(parts[1]) : null
      }
      
      // Resolve gum brand and shade objects from API data for proper IDs
      const gumData: any[] = getProductData(selectedProductForGumShadeGuide, 'gumShades')
      let brandObj = gumData?.find((b: any) => b.name === brandName || b.system_name === brandName || b.id?.toString() === brandName?.toString())
      let shadeObj = brandObj?.shades?.find((s: any) => s.name === individualShade || s.id?.toString() === individualShade?.toString())

      // If we couldn't find the brand in product data, it might be a preferred brand
      // Use the brand ID that was passed from the modal
      if (!brandObj) {
        console.log('Brand not found in product data, using preferred brand approach:', { brandName, brandId })
        
        // Create a brand object with the preferred brand data
        brandObj = {
          id: brandId,
          name: brandName,
          system_name: brandName
        }
        
        // Try to find the shade in any available brand data
        for (const brand of gumData || []) {
          const foundShade = brand.shades?.find((s: any) => s.name === individualShade || s.id?.toString() === individualShade?.toString())
          if (foundShade) {
            shadeObj = foundShade
            break
          }
        }
      }

      // Get the product to check if it's a "both" arch type
      const product = products.find(p => p.id === selectedProductForGumShadeGuide)
      const isBothArch = product && product.type.includes("Maxillary") && product.type.includes("Mandibular")
      
     

      // Update via Zustand for live UI
      updateGumShade(selectedProductForGumShadeGuide, selectedArchForGumShadeGuide, brandObj?.name ?? brandName, shadeObj?.name ?? individualShade)

      // Persist IDs and names expected by backend
      handleProductDetailChange(selectedProductForGumShadeGuide, selectedArchForGumShadeGuide, 'gumShadeBrandId', brandObj?.id ?? brandId)
      handleProductDetailChange(selectedProductForGumShadeGuide, selectedArchForGumShadeGuide, 'gumShadeBrandName', brandObj?.name ?? brandName)
      handleProductDetailChange(selectedProductForGumShadeGuide, selectedArchForGumShadeGuide, 'gumShadeId', shadeObj?.id ?? null)
      handleProductDetailChange(selectedProductForGumShadeGuide, selectedArchForGumShadeGuide, 'gumShadeName', shadeObj?.name ?? individualShade)

      // Keep the UI-friendly parts in sync - use handleProductDetailChange directly to avoid clearing logic
      // Don't use handleLocalProductDetailChange for gumShadePart1 as it has side effects that clear other fields
      handleProductDetailChange(selectedProductForGumShadeGuide, selectedArchForGumShadeGuide, 'gumShadePart1', brandObj?.name ?? brandName)
      handleProductDetailChange(selectedProductForGumShadeGuide, selectedArchForGumShadeGuide, 'gumShadePart2', shadeObj?.name ?? individualShade)

      // If it's a "both" arch product and we're updating maxillary, also update mandibular
      if (isBothArch && selectedArchForGumShadeGuide === 'maxillary') {
        console.log('🔄 Updating mandibular gum shade for both arch product:', { 
          productId: selectedProductForGumShadeGuide, 
          brandName: brandObj?.name ?? brandName, 
          individualShade: shadeObj?.name ?? individualShade,
          isBothArch 
        })
        
        // Update via Zustand for mandibular
        updateGumShade(selectedProductForGumShadeGuide, 'mandibular', brandObj?.name ?? brandName, shadeObj?.name ?? individualShade)
        
        // Persist IDs/names for mandibular
        handleProductDetailChange(selectedProductForGumShadeGuide, 'mandibular', 'gumShadeBrandId', brandObj?.id ?? brandId)
        handleProductDetailChange(selectedProductForGumShadeGuide, 'mandibular', 'gumShadeBrandName', brandObj?.name ?? brandName)
        handleProductDetailChange(selectedProductForGumShadeGuide, 'mandibular', 'gumShadeId', shadeObj?.id ?? null)
        handleProductDetailChange(selectedProductForGumShadeGuide, 'mandibular', 'gumShadeName', shadeObj?.name ?? individualShade)

        // Keep the UI-friendly parts in sync for mandibular
        // Update both parts together to avoid clearing issues
        handleProductDetailChange(selectedProductForGumShadeGuide, 'mandibular', 'gumShadePart1', brandObj?.name ?? brandName)
        handleProductDetailChange(selectedProductForGumShadeGuide, 'mandibular', 'gumShadePart2', shadeObj?.name ?? individualShade)
        
        
        // Force a re-render by updating the product state directly
        const productIndex = products.findIndex(p => p.id === selectedProductForGumShadeGuide)
        if (productIndex !== -1) {
          const updatedProducts = [...products]
          updatedProducts[productIndex].mandibularConfig.gumShadePart1 = brandObj?.name ?? brandName
          updatedProducts[productIndex].mandibularConfig.gumShadePart2 = shadeObj?.name ?? individualShade
          updatedProducts[productIndex].mandibularConfig.gumShadeBrandName = brandObj?.name ?? brandName
          updatedProducts[productIndex].mandibularConfig.gumShadeName = shadeObj?.name ?? individualShade
          console.log('🔄 Force updated mandibular config:', updatedProducts[productIndex].mandibularConfig)
        }
      }
      
      // Debug: Log the final values to verify they're set correctly
      setTimeout(() => {
        const updatedProduct = products.find(p => p.id === selectedProductForGumShadeGuide)
        if (updatedProduct) {
          console.log('🔍 Gum shade final values:', {
            maxillary: {
              gumShadePart1: updatedProduct.maxillaryConfig.gumShadePart1,
              gumShadePart2: updatedProduct.maxillaryConfig.gumShadePart2,
              gumShadeBrandName: updatedProduct.maxillaryConfig.gumShadeBrandName,
              gumShadeName: updatedProduct.maxillaryConfig.gumShadeName
            },
            mandibular: {
              gumShadePart1: updatedProduct.mandibularConfig.gumShadePart1,
              gumShadePart2: updatedProduct.mandibularConfig.gumShadePart2,
              gumShadeBrandName: updatedProduct.mandibularConfig.gumShadeBrandName,
              gumShadeName: updatedProduct.mandibularConfig.gumShadeName
            }
          })
        }
      }, 100)
    }
    handleCloseGumShadeSelection()
  }

  const handleGumShadeLiveUpdate = (shadeSystem: string, individualShade: string) => {
    console.log('🔄 Gum shade live update called:', { shadeSystem, individualShade, selectedProductForGumShadeGuide, selectedArchForGumShadeGuide })

    if (selectedProductForGumShadeGuide && selectedArchForGumShadeGuide) {
      // Parse the shade system to extract brand name and ID (format: "BrandName|BrandID")
      let brandName = shadeSystem
      let brandId = null
      
      if (shadeSystem.includes('|')) {
        const parts = shadeSystem.split('|')
        brandName = parts[0]
        brandId = parts[1] ? parseInt(parts[1]) : null
      }
      
      // Resolve gum brand and shade objects from API data for proper IDs
      const gumData: any[] = getProductData(selectedProductForGumShadeGuide, 'gumShades')
      console.log('🔍 Gum data lookup:', { gumData: gumData?.map((b: any) => ({ id: b.id, name: b.name, system_name: b.system_name, shadeCount: b.shades?.length })) })
      let brandObj = gumData?.find((b: any) => b.name === brandName || b.system_name === brandName || b.id?.toString() === brandName?.toString())
      console.log('🔍 Brand object found:', { brandObj: brandObj ? { id: brandObj.id, name: brandObj.name, shadeCount: brandObj.shades?.length } : null })
      let shadeObj = brandObj?.shades?.find((s: any) => s.name === individualShade || s.id?.toString() === individualShade?.toString())
      console.log('🔍 Shade object found:', { shadeObj: shadeObj ? { id: shadeObj.id, name: shadeObj.name } : null })

      // If we couldn't find the brand in product data, it might be a preferred brand
      if (!brandObj) {
        console.log('Brand not found in product data for live update, using preferred brand approach:', { brandName, brandId })
        
        // Create a brand object with the preferred brand data
        brandObj = {
          id: brandId,
          name: brandName,
          system_name: brandName
        }
        
        // Try to find the shade in any available brand data
        for (const brand of gumData || []) {
          const foundShade = brand.shades?.find((s: any) => s.name === individualShade || s.id?.toString() === individualShade?.toString())
          if (foundShade) {
            shadeObj = foundShade
            break
          }
        }
      }


      // Get the product to check if it's a "both" arch type
      const product = products.find(p => p.id === selectedProductForGumShadeGuide)
      const isBothArch = product && product.type.includes("Maxillary") && product.type.includes("Mandibular")
      
      
      // Update the UI-friendly parts in real-time without closing modal
      // Use handleProductDetailChange directly to avoid clearing logic in handleLocalProductDetailChange
      handleProductDetailChange(selectedProductForGumShadeGuide, selectedArchForGumShadeGuide, 'gumShadePart1', brandObj?.name ?? brandName)
      handleProductDetailChange(selectedProductForGumShadeGuide, selectedArchForGumShadeGuide, 'gumShadePart2', shadeObj?.name ?? individualShade)
      
      // Also update the Zustand store for immediate UI reflection
      updateGumShade(selectedProductForGumShadeGuide, selectedArchForGumShadeGuide, brandObj?.name ?? brandName, shadeObj?.name ?? individualShade)
      
      // If it's a "both" arch product and we're updating maxillary, also update mandibular
      if (isBothArch && selectedArchForGumShadeGuide === 'maxillary') {
        console.log('🔄 Gum shade live update: Updating mandibular for both arch product:', { 
          productId: selectedProductForGumShadeGuide, 
          brandName: brandObj?.name ?? brandName, 
          individualShade: shadeObj?.name ?? individualShade,
          isBothArch 
        })
        
        // Update mandibular in real-time
        // Update both parts together to avoid clearing issues
        handleProductDetailChange(selectedProductForGumShadeGuide, 'mandibular', 'gumShadePart1', brandObj?.name ?? brandName)
        handleProductDetailChange(selectedProductForGumShadeGuide, 'mandibular', 'gumShadePart2', shadeObj?.name ?? individualShade)
        
        // Also update the Zustand store for mandibular
        updateGumShade(selectedProductForGumShadeGuide, 'mandibular', brandObj?.name ?? brandName, shadeObj?.name ?? individualShade)
        
        
        // Force a re-render by updating the product state directly
        const productIndex = products.findIndex(p => p.id === selectedProductForGumShadeGuide)
        if (productIndex !== -1) {
          const updatedProducts = [...products]
          updatedProducts[productIndex].mandibularConfig.gumShadePart1 = brandObj?.name ?? brandName
          updatedProducts[productIndex].mandibularConfig.gumShadePart2 = shadeObj?.name ?? individualShade
          updatedProducts[productIndex].mandibularConfig.gumShadeBrandName = brandObj?.name ?? brandName
          updatedProducts[productIndex].mandibularConfig.gumShadeName = shadeObj?.name ?? individualShade
          console.log('🔄 Force updated mandibular config (live):', updatedProducts[productIndex].mandibularConfig)
        }
      }
      
      // Debug: Log the final values to verify they're set correctly
      
      
      // Force a re-render by updating the product state directly
      const productIndex = products.findIndex(p => p.id === selectedProductForGumShadeGuide)
      if (productIndex !== -1) {
        const updatedProducts = [...products]
        if (selectedArchForGumShadeGuide === 'maxillary') {
          updatedProducts[productIndex].maxillaryConfig.gumShadePart1 = brandObj?.name ?? brandName
          updatedProducts[productIndex].maxillaryConfig.gumShadePart2 = shadeObj?.name ?? individualShade
        } else {
          updatedProducts[productIndex].mandibularConfig.gumShadePart1 = brandObj?.name ?? brandName
          updatedProducts[productIndex].mandibularConfig.gumShadePart2 = shadeObj?.name ?? individualShade
        }
        // This should trigger a re-render if the products are reactive
        console.log('🔄 Updated gum shade product config:', updatedProducts[productIndex])
      }
    } else {
      console.warn('⚠️ No product or arch selected for gum shade live update')
    }
  }

  const handleAddImpressions = (productId: string, arch: "maxillary" | "mandibular") => {
    const selectedImpressions = Object.entries(impressionQuantities)
      .filter(([key, qty]) => key.startsWith(`${productId}_${arch}_`) && (qty as number) > 0)
      .map(([key, qty]) => ({
        name: key.replace(`${productId}_${arch}_`, ""),
        qty: qty as number,
      }))
    // You can use selectedImpressions as needed
  }

  const getGradeOptions = (product: any) => {
    // Use TanStack Query data with context fallback
    const gradeData = getProductData(product.id, 'grades')
    // Debug grade data
    const debugInfo = {
      gradeData,
      isLoading: gradesLoading,
      contextGradesLoading,
      contextGrades: contextGrades?.slice(0, 3) // Log first 3 for brevity
    }
    return Array.isArray(gradeData) ? gradeData.map((g: any) => ({ value: g.name, label: g.name, id: g.id, data: g })) : []
  }

  const getStageOptions = (product: any) => {
    // Use TanStack Query data with context fallback
    const stageData = getProductData(product.id, 'stages')
     
    return Array.isArray(stageData) ? stageData.map((s: any) => ({ value: s.name, label: s.name, id: s.id, data: s })) : []
  }

  const getTeethShadeOptions = (product: any) => {
    const teethShadeData = getProductData(product.id, 'teethShades')
    
    if (teethShadeData && teethShadeData.length > 0) {
      // Return brand names for the first dropdown
      const brandOptions = teethShadeData.map((brand: any) => ({
        value: brand.name,
        label: brand.name,
        id: brand.id,
        sequence: brand.sequence
      }))

      return brandOptions
    }

    // Fallback if no API data
    return []
  }

  const getTeethShadeDetailOptions = (product: any, brandName: string) => {
    const teethShadeData = getProductData(product.id, 'teethShades')
    const brand = teethShadeData.find((b: any) => b.name === brandName)

     
    if (brand?.shades && brand.shades.length > 0) {
      const options = brand.shades.map((shade: any) => ({
        value: shade.name,
        label: shade.name,
        id: shade.id,
        sequence: shade.sequence,
        price: shade.price,
        status: shade.status
      }))
      return options
    }

    return []
  }

  const getGumShadeOptions = (product: any) => {
    // Only use TanStack Query data - no fallbacks
    const gumShadeData = getProductData(product.id, 'gumShades')
    
    if (gumShadeData && gumShadeData.length > 0) {
      return gumShadeData.map((brand: any) => ({ value: brand.name, label: brand.name }))
    }
    
    return []
  }

  const getGumShadeDetailOptions = (product: any, brandName: string) => {
    // Only use TanStack Query data - no fallbacks
    const gumShadeData = getProductData(product.id, 'gumShades')
    const brand = gumShadeData.find((b: any) => b.name === brandName)
    
    if (brand?.shades && brand.shades.length > 0) {
      return brand.shades.map((shade: any) => ({ value: shade.name, label: shade.name }))
    }
    
    return []
  }

  const getImpressionOptions = (product: any) => {
    // Only use TanStack Query data - no fallbacks
    const impressionData = getProductData(product.id, 'impressions')
    
    if (impressionData && impressionData.length > 0) {
      // Based on your console logs, the data structure is {id: 1, name: 'STL file', code: 'STL', ...}
      // We need to map it to have value and label properties
      const options = impressionData.map((impression: any) => ({ 
        value: impression.name, 
        label: impression.name,
        id: impression.id,
        code: impression.code,
        ...impression // Keep all original properties
      }))
      return options
    }
    
    return []
  }

  const handleStageDropdownOpen = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return
    const prodId = Number(product.id.split('-')[0]) || Number(product.id)
    if (!prodId) return
  }

  // Normalize addOns for all products before rendering - always use products prop for reactivity
  const normalizedProducts = useMemo(() => {
    // Always use products prop directly - it's the source of truth from Zustand
    // This ensures we get the latest updates immediately
    const productsToUse = products.length > 0 ? products : localProducts
    
    // Debug: Log when products change
    console.log('🔄 normalizedProducts recalculating:', {
      productsLength: products.length,
      localProductsLength: localProducts.length,
      usingProducts: products.length > 0,
      productGrades: products.map(p => ({
        id: p.id,
        grade: p.maxillaryConfig?.grade,
        stage: p.maxillaryConfig?.stage
      }))
    })
    
    const normalized = productsToUse.map(product => {
      const originalAddOns = product.addOns
      const normalizedAddOns = normalizeAddOns(product)
      
      return { ...product, addOns: normalizedAddOns }
    })
    
    return normalized
  }, [products, localProducts])

  // Load teeth shade, gum shade, and impressions for all products on mount or products change
  useEffect(() => {
    // Removed prefetch calls to prevent duplicate API requests
    // TanStack Query will handle data fetching automatically when needed
  }, [products])

  // Debounce the products and lab data to prevent excessive API calls
  const debouncedProducts = useDebounce(products, 500)
  const debouncedLabId = useDebounce(slipData?.selectedLab?.lab?.id || slipData?.selectedLab?.id, 500)

  // Cache for delivery date calculations to prevent duplicate API calls
  const deliveryDateCache = useRef<Map<string, any>>(new Map())
  const pendingRequests = useRef<Map<string, Promise<any>>>(new Map())

  // Create a debounced delivery date calculation function with caching
  const debouncedCalculateDeliveryDate = useCallback(
    async (prodId: number, stageId: number) => {
      const cacheKey = `${prodId}-${stageId}`
      
      // Check if we already have this data cached
      if (deliveryDateCache.current.has(cacheKey)) {
        return deliveryDateCache.current.get(cacheKey)
      }
      
      // Check if there's already a pending request for this combination
      if (pendingRequests.current.has(cacheKey)) {
        return await pendingRequests.current.get(cacheKey)
      }
      
      // Make the API call and cache the result
      const requestPromise = calculateDeliveryDate(prodId, stageId).then(result => {
        if (result !== null && result !== undefined) {
          deliveryDateCache.current.set(cacheKey, result)
        }
        pendingRequests.current.delete(cacheKey)
        return result
      }).catch(error => {
        pendingRequests.current.delete(cacheKey)
        throw error
      })
      
      pendingRequests.current.set(cacheKey, requestPromise)
      return await requestPromise
    },
    [calculateDeliveryDate]
  )

  // Memoize the products that need delivery date calculation to prevent unnecessary re-runs
  const productsNeedingDeliveryDates = useMemo(() => {
    if (!debouncedProducts.length || !debouncedLabId) return []
    
    return debouncedProducts.filter(product => {
      const prodId = Number(product.id.split('-')[0]) || Number(product.id)
      if (!prodId) return false
      
      const maxillaryStage = product.maxillaryConfig?.stage
      const mandibularStage = product.mandibularConfig?.stage
      
      const hasMaxillaryStage = maxillaryStage && maxillaryStage !== "placeholder" && maxillaryStage !== ""
      const hasMandibularStage = mandibularStage && mandibularStage !== "placeholder" && mandibularStage !== "" && product.type.includes("Mandibular")
      
      return hasMaxillaryStage || hasMandibularStage
    })
  }, [debouncedProducts, debouncedLabId])

  // Calculate delivery dates on initial load if stages are already available
  useEffect(() => {
    const calculateInitialDeliveryDates = async () => {
      if (!productsNeedingDeliveryDates.length || !debouncedLabId) return
      
      
      for (const product of productsNeedingDeliveryDates) {
        const prodId = Number(product.id.split('-')[0]) || Number(product.id)
        if (!prodId) continue
        
        // Check if product has stages configured
        const maxillaryStage = product.maxillaryConfig?.stage
        const mandibularStage = product.mandibularConfig?.stage
        
        // Calculate delivery date for maxillary if stage is set
        if (maxillaryStage && maxillaryStage !== "placeholder" && maxillaryStage !== "") {
          try {
            const stageObj = product.stages?.find((s) => s.name === maxillaryStage)
            if (stageObj?.id) {
              const deliveryData = await debouncedCalculateDeliveryDate(prodId, stageObj.id) as any
              if (deliveryData?.delivery_date) {
                setProductDeliveryDates(prev => ({
                  ...prev,
                  [product.id]: deliveryData.delivery_date
                }))
                handleUpdateDatesFromApi?.(deliveryData?.pickup_date || "", deliveryData?.delivery_date || "", deliveryData?.delivery_time || "")
              }
            }
          } catch (error) {
            console.error(`Error calculating delivery date for product ${product.id} maxillary:`, error)
          }
        }
        
        // Calculate delivery date for mandibular if stage is set (for both arches products)
        if (mandibularStage && mandibularStage !== "placeholder" && mandibularStage !== "" && product.type.includes("Mandibular")) {
          try {
            const stageObj = product.stages?.find((s) => s.name === mandibularStage)
            if (stageObj?.id) {
              const deliveryData = await debouncedCalculateDeliveryDate(prodId, stageObj.id) as any
              if (deliveryData?.delivery_date) {
                setProductDeliveryDates(prev => ({
                  ...prev,
                  [product.id]: deliveryData.delivery_date
                }))
                handleUpdateDatesFromApi?.(deliveryData?.pickup_date || "", deliveryData?.delivery_date || "", deliveryData?.delivery_time || "")
              }
            }
          } catch (error) {
            console.error(`Error calculating delivery date for product ${product.id} mandibular:`, error)
          }
        }
      }
    }
    
    // Only run when we have products that need delivery dates and lab data
    if (productsNeedingDeliveryDates.length > 0 && debouncedLabId) {
      calculateInitialDeliveryDates()
    }
  }, [productsNeedingDeliveryDates, debouncedLabId, debouncedCalculateDeliveryDate, handleUpdateDatesFromApi]) // Use memoized products to prevent excessive API calls

  return (
    <TooltipProvider>
      <Card className={`w-full h-full min-h-0 flex flex-col ${!effectiveHasSelectedTeeth ? 'bg-gray-100 opacity-60' : ''}`}>
        <CardHeader className={`text-center pb-4 ${!effectiveHasSelectedTeeth ? 'opacity-60' : ''}`}>
          <CardTitle className="text-xl font-bold text-gray-900 mb-2">CASE DESIGN CENTER</CardTitle>
          <div className="flex items-center justify-center text-sm text-gray-600 mb-4">
            {products.length} product configured <Paperclip className="w-4 h-4 ml-1" />
          </div>

          {/* Show product content only when teeth are selected */}
          {effectiveHasSelectedTeeth && (
            <>
              <div className="flex flex-wrap justify-center gap-2">
                {!isCaseSubmitted && normalizedProducts.map((product) => (
                  <button
                key={product.id}
                type="button"
                className={`rounded-full px-4 py-2 border text-sm font-medium transition-all duration-200
                  ${openAccordionItem === product.id
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg"
                    : "border-gray-300 bg-white text-gray-800 hover:bg-blue-50 hover:border-blue-400"}
                  disabled:opacity-50`}
                onClick={() => {
                  if (openAccordionItem !== product.id) handleProductButtonClick(product.id)
                }}
                disabled={openAccordionItem === product.id || !effectiveHasSelectedTeeth}
                style={{ outline: "none" }}
              >
                {product.name}
              </button>
                ))}
            {!isCaseSubmitted && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2 text-sm font-medium shadow-md disabled:opacity-50"
                onClick={handleOpenAddProductModal}
                disabled={!effectiveHasSelectedTeeth}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Product
              </Button>
            )}
          </div>
            </>
          )}
        </CardHeader>
        <CardContent className={`flex-1 min-h-0 overflow-hidden ${isCaseSubmitted ? 'space-y-1' : 'space-y-2'} ${!effectiveHasSelectedTeeth ? 'bg-gray-100 pointer-events-none' : ''}`}>
          {!effectiveHasSelectedTeeth ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-gray-500 text-lg mb-4">
                <strong>No teeth selected</strong>
              </div>
              <p className="text-sm">
                Click on teeth from the <strong>Maxillary</strong> (left) or <strong>Mandibular</strong> (right)
              </p>
              <p className="text-sm">charts to start building your case.</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">
                Click on teeth from the <strong>Maxillary</strong> (left) or <strong>Mandibular</strong> (right)
              </p>
              <p className="text-sm">charts to start building your case.</p>
            </div>
          ) : (
            <Accordion
              type="single"
              className="w-full h-full flex flex-col"
              value={openAccordionItem}
              onValueChange={(val) => {
                // If val is empty (closing accordion) or different from current (opening different one)
                setOpenAccordionItem(val || undefined)
                setSelectOpen({}) // Close all dropdowns when switching product/accordion
              }}
            >
              {normalizedProducts.map((product) => {
                const productNoteCount = allNotes.filter(
                  (note) => note.slipNumber === slipData.slipNumber && note.stage === product.maxillaryConfig.stage,
                ).length

                const isBothArches = product.type.includes("Maxillary") && product.type.includes("Mandibular")
                const hasMaxillary = product.type.includes("Maxillary")
                const hasMandibular = product.type.includes("Mandibular")
                const currentVisibility = dropdownVisibility[product.id] || { maxillary: {}, mandibular: {} }
                const errors = productErrors[product.id] || {}

                // Get add-ons from Zustand store
                const storeAddOns = getProductAddOns(product.id)
                const maxAddOnCount = Array.isArray(storeAddOns?.maxillary) ? storeAddOns.maxillary.length : 0
                const manAddOnCount = Array.isArray(storeAddOns?.mandibular) ? storeAddOns.mandibular.length : 0
                let attachmentCount = 0
                if (typeof window !== "undefined") {
                  try {
                    const cacheStr = window.localStorage.getItem("caseDesignCache")
                    if (cacheStr) {
                      const cache = JSON.parse(cacheStr)
                      if (Array.isArray(cache.attachments)) attachmentCount = cache.attachments.length
                    }
                  } catch {}
                }

                return (
                  <AccordionItem
                    key={product.id}
                    value={product.id}
                    className={`border w-full min-h-[78px] flex-shrink-0 mb-1 transition-all duration-200 ${
                      openAccordionItem === product.id
                        ? "border-blue-200 bg-blue-50 shadow-md rounded-t-[6px]"
                        : rushRequests[product.id]
                          ? "border-red-300 bg-red-50 rounded-lg"
                          : "border-gray-200 hover:border-gray-300 rounded-lg"
                    }`}
                  >
                    <AccordionTrigger
                      className={`px-2 sm:px-3 md:px-4 min-h-[78px] hover:no-underline transition-all duration-200 [&>svg]:hidden ${
                        openAccordionItem === product.id
                          ? "text-blue-900"
                          : "text-gray-900 hover:bg-gray-50"
                      }`}
                      style={openAccordionItem === product.id ? { backgroundColor: '#DFEEFB' } : undefined}
                    >
                      <div className="flex flex-row items-center gap-2 sm:gap-3 w-full min-h-[62px] overflow-hidden">
                        {/* Product Image */}
                        <div className={`w-16 sm:w-20 md:w-[100px] h-12 sm:h-14 md:h-[62px] bg-white rounded-lg border-2 flex items-center justify-center flex-shrink-0 shadow-sm transition-all duration-200 ${
                          openAccordionItem === product.id
                            ? "border-blue-200 shadow-md"
                            : "border-gray-200"
                        }`}>
                          <Image
                            src={product.image && product.image !== "/placeholder.svg" ? product.image : "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=facearea&w=128&q=80"}
                            alt={`${product.name} thumbnail`}
                            width={100}
                            height={62}
                            className="object-cover rounded w-full h-full"
                          />
                        </div>

                        {/* Product Info - Center */}
                        <div className="flex-1 flex flex-col justify-center gap-1 min-w-0 overflow-hidden">
                          {/* Product Name - Top */}
                          <div className="font-bold text-sm sm:text-base truncate" style={{ display: 'flex', alignItems: 'center' }}>
                            {product.name}
                          </div>

                          {/* Badges and Delivery Date Container */}
                          <div className="flex flex-col gap-1">
                            {/* Badges Row */}
                            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                              {/* Arch Type Badges */}
                              {product.type.split(",").map((typePart, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="text-xs font-medium transition-all duration-200 bg-gray-100 text-gray-800 border border-gray-200 flex-shrink-0"
                                  style={{ minWidth: '60px', maxWidth: '80px', height: '20px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}
                                >
                                  {typePart.trim()}
                                </Badge>
                              ))}

                              {/* Teeth Badge */}
                              {(() => {
                                // Get selected teeth from teeth selection store - use state directly for reactivity
                                const teethInMouthSelection = extractionTypeTeethSelection['Teeth in mouth'] || {}
                                const maxillarySelectedTeeth = teethInMouthSelection.maxillary || []
                                const mandibularSelectedTeeth = teethInMouthSelection.mandibular || []

                                // Fallback to product teeth if no selection in store
                                const maxTeeth = maxillarySelectedTeeth.length > 0
                                  ? maxillarySelectedTeeth.map(t => `#${t}`)
                                  : (product.maxillaryTeeth || product.teeth || "")
                                    .split(",").map(s => s.trim()).filter(Boolean)
                                const manTeeth = mandibularSelectedTeeth.length > 0
                                  ? mandibularSelectedTeeth.map(t => `#${t}`)
                                  : (product.mandibularTeeth || "")
                                    .split(",").map(s => s.trim()).filter(Boolean)
                                const allTeeth = [...maxTeeth, ...manTeeth]

                                return allTeeth.length > 4 ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <Badge
                                          variant="secondary"
                                          className="text-xs font-medium cursor-pointer transition-all duration-200 bg-gray-100 text-black-800 border border-black-200 flex-shrink-0"
                                          style={{ height: '20px', borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '0 6px' }}
                                        >
                                          {allTeeth.slice(0, 3).join(", ")}, ...
                                        </Badge>
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs break-words">
                                      {maxTeeth.length > 0 && <div>Maxillary: {maxTeeth.join(", ")}</div>}
                                      {manTeeth.length > 0 && <div>Mandibular: {manTeeth.join(", ")}</div>}
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs font-medium transition-all duration-200 bg-green-100 text-green-800 border border-green-200 flex-shrink-0"
                                    style={{ height: '20px', borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '0 6px' }}
                                  >
                                    {allTeeth.join(", ")}
                                  </Badge>
                                )
                              })()}
                              <Badge variant="secondary" className={`text-xs font-medium transition-all duration-200 flex-shrink-0 ${
                                openAccordionItem === product.id
                                  ? "bg-white-200 text-white-900 border-white-300"
                                  : "bg-white-100 text-white-800 border-white-200"
                              }`} style={{ height: '20px', borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '0 6px' }}>
                                {product.maxillaryConfig.stage}
                              </Badge>
                            </div>

                            {/* Delivery Date - Below Badges */}
                            <div className="text-right text-xs sm:text-sm text-gray-600 truncate">
                              Delivery date: <span className="text-gray-900 font-medium">{rushRequests[product.id]?.targetDate
                                ? rushRequests[product.id].targetDate
                                : (productDeliveryDates[product.id]
                                    ? new Date(productDeliveryDates[product.id]).toLocaleString('en-US', {
                                        month: '2-digit',
                                        day: '2-digit',
                                        year: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                      })
                                    : (slipData?.delivery?.delivery_date
                                        ? new Date(slipData.delivery.delivery_date).toLocaleString('en-US', {
                                            month: '2-digit',
                                            day: '2-digit',
                                            year: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: true
                                          })
                                        : (product.deliveryDate || "—")
                                      )
                                  )
                              }</span>
                            </div>
                          </div>
                        </div>

                        {/* Right Side - Delete Button and Chevron */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Delete Button */}
                          {!isCaseSubmitted && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                              onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id) }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          {/* Custom Chevron - Single icon that rotates */}
                          <ChevronDown
                            className={`w-5 h-5 text-gray-600 transition-transform duration-200 flex-shrink-0 ${
                              openAccordionItem === product.id ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent 
                      className="mt-2 relative flex-1 min-h-0 overflow-y-auto"
                      style={{
                        maxHeight: '600px'
                      }}
                    >

                      {rushRequests[product.id] && (
                        <div className="bg-red-100 border border-red-300 rounded-lg p-2 mb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Image
                                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/light-bolt-with-border-XnvKIn7SXFAK7OaDLnerrP2skkJn8M.png"
                                alt="Rush Request Icon"
                                width={24}
                                height={24}
                                className="flex-shrink-0"
                              />
                              <span className="font-medium text-red-800">RUSH REQUEST</span>
                              <div className="flex items-center gap-3 ml-4">
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-red-600 hover:bg-red-200">
                                  <Calendar className="w-4 h-4 mr-1" />
                                  Change due date
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600 hover:bg-green-200">
                                  <Check className="w-5 h-5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:bg-red-200">
                                  <X className="w-5 h-5" />
                                </Button>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelRush(product.id)}
                              className="text-red-600 border-red-300"
                            >
                              Cancel Rush
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Three-column layout with labels in the middle */}
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-2 md:gap-4 p-2 md:p-3 bg-gray-50 rounded-lg">
                        {/* Left Column - Maxillary */}
                        <div className="space-y-2 px-2">
                          {/* Restoration */}
                          {currentVisibility.maxillary?.restoration && (
                            <div>
                              {isCaseSubmitted ? (
                                <div className="relative dropdown-container">
                                  <div className="w-full h-[28px] px-3 py-1 text-left border rounded-[6px] bg-white text-sm flex items-center border-gray-300">
                                    <span className="text-gray-900">{product.maxillaryConfig.restoration}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative dropdown-container">
                                  <Select value={product.maxillaryConfig.restoration} disabled>
                                    <SelectTrigger className="h-[28px] w-full bg-white border border-gray-300 rounded-[6px] text-sm" disabled>
                                      <SelectValue placeholder="Select Restoration" />
                                    </SelectTrigger>
                                    <SelectContent className="z-[50] max-h-[300px] overflow-y-auto">
                                      <SelectItem value={product.maxillaryConfig.restoration}>
                                        {product.maxillaryConfig.restoration}
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              {errors["maxillary.restoration"] && <span className="text-red-500 text-xs">{errors["maxillary.restoration"]}</span>}
                            </div>
                          )}

                          {/* Product */}
                          {currentVisibility.maxillary?.productName && (
                            <div>
                              {isCaseSubmitted ? (
                                <div className="relative dropdown-container">
                                  <div className="w-full h-[28px] px-3 py-1 text-left border rounded-[6px] bg-white text-sm flex items-center border-gray-300">
                                    <span className="text-gray-900">{product.maxillaryConfig.productName}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative dropdown-container">
                                  <Select value={product.maxillaryConfig.productName} disabled>
                                    <SelectTrigger className="h-[28px] w-full bg-white border border-gray-300 rounded-[6px] text-sm" disabled>
                                      <SelectValue placeholder="Select Product Name" />
                                    </SelectTrigger>
                                    <SelectContent className="z-[50] max-h-[300px] overflow-y-auto">
                                      <SelectItem value={product.maxillaryConfig.productName}>
                                        {product.maxillaryConfig.productName}
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              {errors["maxillary.productName"] && <span className="text-red-500 text-xs">{errors["maxillary.productName"]}</span>}
                            </div>
                          )}

                          {/* Grade */}
                          {currentVisibility.maxillary?.grade && (
                            <div>
                              {isCaseSubmitted ? (
                                <div className="relative dropdown-container">
                                  <div className="w-full h-[28px] px-3 py-1 text-left border rounded-[6px] bg-white text-sm flex items-center border-gray-300">
                                    <span className="text-gray-900">{product.maxillaryConfig.grade}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative dropdown-container">
                                  <button
                                    type="button"
                                    className={`w-full h-[28px] px-3 py-1 text-left border rounded-[6px] bg-white text-sm focus:outline-none transition-all duration-200 flex items-center justify-between relative ${
                                      selectOpen[product.id]?.maxillary === "grade"
                                        ? "border-blue-500 shadow-md"
                                        : !product.maxillaryConfig.grade
                                        ? "border-blue-500 hover:border-blue-600"
                                        : "border-gray-300 hover:border-gray-400"
                                    }`}
                                    onClick={() =>
                                      setSelectOpen(prev => ({ ...prev, [product.id]: { ...prev[product.id], maxillary: prev[product.id]?.maxillary === "grade" ? undefined : "grade" } }))
                                    }
                                  >
                                    {!product.maxillaryConfig.grade && null}
                                    <span className="text-gray-900">
                                      {product.maxillaryConfig.grade || "Select Grade"}
                                    </span>
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                  {selectOpen[product.id]?.maxillary === "grade" && (
                                    <div className="absolute z-[9999] top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                                      <div className="py-1">
                                        <InlineLoading
                                          isLoading={gradesLoading || contextGradesLoading}
                                          text="Loading grades..."
                                        />
                                        {!(gradesLoading || contextGradesLoading) && getGradeOptions(product).length > 0 ? (
                                          getGradeOptions(product).map((opt: any, idx: number) => (
                                            <button
                                              key={idx}
                                              type="button"
                                              className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 transition-colors duration-150"
                                              onClick={() => {
                                                handleLocalProductDetailChange(product.id, "maxillary", "grade", opt.value)
                                                setSelectOpen(prev => ({ ...prev, [product.id]: { ...prev[product.id], maxillary: undefined } }))
                                              }}
                                            >
                                              {opt.label}
                                            </button>
                                          ))
                                        ) : (
                                          <div className="px-3 py-2 text-sm text-gray-500">No options available</div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              {errors["maxillary.grade"] && <span className="text-red-500 text-xs">{errors["maxillary.grade"]}</span>}
                            </div>
                          )}

                          {/* Stage */}
                          {currentVisibility.maxillary?.stage && (
                            <div>
                              {isCaseSubmitted ? (
                                <div className="relative dropdown-container">
                                  <div className="w-full h-[28px] px-3 py-1 text-left border rounded-[6px] bg-white text-sm flex items-center border-gray-300">
                                    <span className="text-gray-900">{product.maxillaryConfig.stage}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative dropdown-container">
                                  <button
                                    type="button"
                                    className={`w-full h-[28px] px-3 py-1 text-left border rounded-[6px] bg-white text-sm focus:outline-none transition-all duration-200 flex items-center justify-between relative ${
                                      selectOpen[product.id]?.maxillary === "stage"
                                        ? "border-blue-500 shadow-md"
                                        : !product.maxillaryConfig.stage
                                        ? "border-blue-500 hover:border-blue-600"
                                        : "border-gray-300 hover:border-gray-400"
                                    }`}
                                    onClick={() =>
                                      setSelectOpen(prev => ({ ...prev, [product.id]: { ...prev[product.id], maxillary: prev[product.id]?.maxillary === "stage" ? undefined : "stage" } }))
                                    }
                                  >
                                    {!product.maxillaryConfig.stage && null}
                                    <span className="text-gray-900">
                                      {product.maxillaryConfig.stage || "Select Stage"}
                                    </span>
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                  {selectOpen[product.id]?.maxillary === "stage" && (
                                    <div className="absolute z-[9999] top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                                      <div className="py-1">
                                        {(stagesLoading || contextStagesLoading) ? (
                                          <div className="px-3 py-2 text-sm text-gray-500 flex items-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Loading stages...
                                          </div>
                                        ) : getStageOptions(product).length > 0 ? (
                                          getStageOptions(product).map((opt: any, idx: number) => (
                                            <button
                                              key={idx}
                                              type="button"
                                              className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 transition-colors duration-150"
                                              onClick={async () => {
                                                handleLocalProductDetailChange(product.id, "maxillary", "stage", opt.value)
                                                handleStageDropdownOpen(product.id)
                                                setSelectOpen(prev => ({ ...prev, [product.id]: { ...prev[product.id], maxillary: undefined } }))
                                                const prodId = Number(product.id.split('-')[0]) || Number(product.id)
                                                const stageObj = product.stages?.find((s) => s.name === opt.value)
                                                if (prodId && stageObj?.id) {
                                                  try {
                                                    const deliveryData = await debouncedCalculateDeliveryDate(prodId, stageObj.id) as any
                                                    handleUpdateDatesFromApi?.(deliveryData?.pickup_date || "", deliveryData?.delivery_date || "", deliveryData?.delivery_time || "")
                                                    // Store delivery date for this product
                                                    if (deliveryData?.delivery_date) {
                                                      setProductDeliveryDates(prev => ({
                                                        ...prev,
                                                        [product.id]: deliveryData.delivery_date
                                                      }))
                                                    }
                                                  } catch (error) {
                                                    console.error(`Error calculating delivery date for product ${product.id} maxillary stage change:`, error)
                                                  }
                                                }
                                              }}
                                            >
                                              {opt.label}
                                            </button>
                                          ))
                                        ) : (
                                          <div className="px-3 py-2 text-sm text-gray-500">No options available</div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              {errors["maxillary.stage"] && <span className="text-red-500 text-xs">{errors["maxillary.stage"]}</span>}
                            </div>
                          )}

                          {/* Teeth Shade */}
                          {currentVisibility.maxillary?.teethShadePart1 && (
                            <div className="relative">
                              {isCaseSubmitted ? (
                                <div className="w-full h-[28px] px-3 py-1 text-left border rounded-[6px] bg-white text-sm flex items-center border-gray-300">
                                  <div className="flex items-center gap-2">
                                    {product.maxillaryConfig.teethShadePart1 && product.maxillaryConfig.teethShadePart2 && (
                                      <div
                                        className="w-4 h-4 rounded border border-gray-300 shadow-sm"
                                        style={{ backgroundColor: getShadeColor(product.maxillaryConfig.teethShadePart1, product.maxillaryConfig.teethShadePart2, product.productTeethShades) }}
                                        title={getTeethShadeDisplay(product, 'maxillary')}
                                      />
                                    )}
                                    <span className="text-gray-900">
                                      {getTeethShadeDisplay(product, 'maxillary')}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative">
                                  {/* Combined Teeth Shade - Single Field, Clickable to Open Guide */}
                                  <div className="relative">
                                    <button
                                      type="button"
                                      className={`w-full h-[28px] px-3 py-1 text-left border rounded-[6px] bg-white text-sm focus:outline-none transition-all duration-200 flex items-center justify-between cursor-pointer relative ${
                                        !product.maxillaryConfig.teethShadePart1 || !product.maxillaryConfig.teethShadePart2
                                          ? "border-blue-500 hover:border-blue-600"
                                          : "border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                                      }`}
                                      onClick={() => {
                                        handleOpenTeethShadeSelection(product.id, 'maxillary')
                                      }}
                                      title="Click to open Teeth Shade Selection"
                                    >
                                      {(!product.maxillaryConfig.teethShadePart1 || !product.maxillaryConfig.teethShadePart2) && null}
                                      <div className="flex items-center gap-2">
                                        {product.maxillaryConfig.teethShadePart1 && product.maxillaryConfig.teethShadePart2 && (
                                          <div
                                            className="w-4 h-4 rounded border border-gray-300 shadow-sm"
                                            style={{ backgroundColor: getShadeColor(product.maxillaryConfig.teethShadePart1, product.maxillaryConfig.teethShadePart2) }}
                                            title={getTeethShadeDisplay(product, 'maxillary')}
                                          />
                                        )}
                                        <span className="text-gray-900">
                                          {getTeethShadeDisplay(product, 'maxillary')}
                                        </span>
                                      </div>
                                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              )}
                              {errors["maxillary.teethShadePart1"] && <span className="text-red-500 text-xs">{errors["maxillary.teethShadePart1"]}</span>}
                              {errors["maxillary.teethShadePart2"] && <span className="text-red-500 text-xs">{errors["maxillary.teethShadePart2"]}</span>}
                            </div>
                          )}

                          {/* Gum Shade */}
                          {(currentVisibility.maxillary?.gumShadePart1 && product.maxillaryConfig.teethShadePart1) && (
                            <div className="relative">
                              {isCaseSubmitted ? (
                                <div className="w-full h-[28px] px-3 py-1 text-left border rounded-[6px] bg-white text-sm flex items-center border-gray-300">
                                  <span className="text-gray-900">
                                    {product.maxillaryConfig.gumShadePart1} {product.maxillaryConfig.gumShadePart2}
                                  </span>
                                </div>
                              ) : (
                                <div className="relative">
                                  {/* Gum Shade - Single Selection, Clickable to Open Guide */}
                                  <button
                                    type="button"
                                    className={`w-full h-[28px] px-3 py-1 text-left border rounded-[6px] bg-white text-sm focus:outline-none transition-all duration-200 flex items-center justify-between cursor-pointer relative ${
                                      !product.maxillaryConfig.gumShadePart1
                                        ? "border-blue-500 hover:border-blue-600"
                                        : "border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                                    }`}
                                    onClick={() => {
                                      handleOpenGumShadeSelection(product.id, 'maxillary')
                                    }}
                                    title="Click to open Gum Shade Selection"
                                  >
                                    {!product.maxillaryConfig.gumShadePart1 && null}
                                    <span className="text-gray-900">
                                      {product.maxillaryConfig.gumShadePart1
                                        ? `${product.maxillaryConfig.gumShadePart1}${product.maxillaryConfig.gumShadePart2 ? ' ' + product.maxillaryConfig.gumShadePart2 : ''}`
                                        : "Select Gum Shade"}
                                    </span>
                                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                              {errors["maxillary.gumShadePart1"] && <span className="text-red-500 text-xs">{errors["maxillary.gumShadePart1"]}</span>}
                              {errors["maxillary.gumShadePart2"] && <span className="text-red-500 text-xs">{errors["maxillary.gumShadePart2"]}</span>}
                            </div>
                          )}

                          {/* Impression */}
                          {(currentVisibility.maxillary?.impression && product.maxillaryConfig.gumShadePart1) && (
                            <div className="relative">
                              {isCaseSubmitted ? (
                                <div className="h-9 mt-1 flex items-center text-sm text-gray-800 pl-3">
                                  {Object.entries(impressionQuantities)
                                    .filter(([key, qty]) => key.startsWith(`${product.id}_maxillary_`) && (qty as number) > 0)
                                    .map(([key, qty]) => {
                                      const name = key.replace(`${product.id}_maxillary_`, "")
                                      return `${qty}x ${name}`
                                    })
                                    .join(", ") || "None"}
                                </div>
                              ) : (
                                <div className="relative">
                                  <button
                                    type="button"
                                    className={`w-full h-9 px-4 py-2 text-left border-2 rounded-md bg-white text-sm focus:outline-none transition-all duration-200 flex items-center justify-between relative ${
                                      Object.entries(impressionQuantities)
                                        .filter(([key, qty]) => key.startsWith(`${product.id}_maxillary_`) && (qty as number) > 0)
                                        .length === 0
                                        ? "border-blue-500 hover:border-blue-600"
                                        : "border-gray-300 hover:border-gray-400"
                                    }`}
                                    onClick={() => handleOpenImpressionModal(product.id, "maxillary")}
                                  >
                                    {Object.entries(impressionQuantities)
                                      .filter(([key, qty]) => key.startsWith(`${product.id}_maxillary_`) && (qty as number) > 0)
                                      .length === 0 && null}
                                    <span className="text-gray-900">
                                      {(() => {
                                        const selectedImpressions = Object.entries(impressionQuantities)
                                          .filter(([key, qty]) => key.startsWith(`${product.id}_maxillary_`) && (qty as number) > 0)
                                          .map(([key, qty]) => {
                                            const name = key.replace(`${product.id}_maxillary_`, "")
                                            return { name, qty }
                                          })

                                        if (selectedImpressions.length === 0) {
                                          return "Select Impression(s)"
                                        }
                                        
                                        const totalCount = selectedImpressions.reduce((sum, imp) => sum + imp.qty, 0)
                                        
                                        if (selectedImpressions.length <= 1) {
                                          return selectedImpressions.map(imp => `${imp.qty}x ${imp.name}`).join(", ")
                                        } else {
                                          const firstOne = selectedImpressions.slice(0, 1).map(imp => `${imp.qty}x ${imp.name}`).join(", ")
                                          return `${firstOne} +${selectedImpressions.length - 1} more (${totalCount} total)`
                                        }
                                      })()}
                                    </span>
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                              {errors["maxillary.impression"] && <span className="text-red-500 text-xs">{errors["maxillary.impression"]}</span>}
                            </div>
                          )}

                          {/* Add-ons button (show when impression has value) */}
                          {!isCaseSubmitted &&
                            product.type.includes("Maxillary") && 
                            product.maxillaryConfig.gumShadePart1 && (
                              <Button variant="outline" className="h-8 px-3 w-full bg-white text-xs" onClick={() => handleOpenMaxillaryAddOnsModalWithFetch(product.id)}>
                                <Plus className="w-3 h-3 mr-1" />
                                Add Maxillary Add-ons
                              </Button>
                          )}
                          
                          {/* Extractions button removed - using product selection for extractions instead */}
                        </div>

                        {/* Middle Column - Labels */}
                        <div className="space-y-2 flex flex-col px-2 md:px-3">
                          {(currentVisibility.maxillary?.restoration || (isBothArches && currentVisibility.mandibular?.restoration)) && (
                            <div className="h-[28px] flex items-center justify-center">
                              <Label className="text-sm font-semibold text-gray-800">Restoration</Label>
                            </div>
                          )}
                          {(currentVisibility.maxillary?.productName || (isBothArches && currentVisibility.mandibular?.productName)) && (
                            <div className="h-[28px] flex items-center justify-center">
                              <Label className="text-sm font-semibold text-gray-800">Product</Label>
                            </div>
                          )}
                          {(currentVisibility.maxillary?.grade || (isBothArches && currentVisibility.mandibular?.grade)) && (
                            <div className="h-[28px] flex items-center justify-center">
                              <Label className="text-sm font-semibold text-gray-800">Grade</Label>
                            </div>
                          )}
                          {(currentVisibility.maxillary?.stage || (isBothArches && currentVisibility.mandibular?.stage)) && (
                            <div className="h-[28px] flex items-center justify-center">
                              <Label className="text-sm font-semibold text-gray-800">Stage</Label>
                            </div>
                          )}
                          {(currentVisibility.maxillary?.teethShadePart1 || (isBothArches && currentVisibility.mandibular?.teethShadePart1)) && (
                            <div className="h-[28px] flex items-center justify-center">
                              <Label className="text-sm font-semibold text-gray-800">Teeth Shade</Label>
                            </div>
                          )}
                          {((currentVisibility.maxillary?.gumShadePart1 && product.maxillaryConfig.teethShadePart1) || (isBothArches && (currentVisibility.mandibular?.gumShadePart1 && product.mandibularConfig.teethShadePart1))) && (
                            <div className="h-[28px] flex items-center justify-center">
                              <Label className="text-sm font-semibold text-gray-800">Gum Shade</Label>
                            </div>
                          )}
                          {((currentVisibility.maxillary?.impression && product.maxillaryConfig.gumShadePart1) || (isBothArches && (currentVisibility.mandibular?.impression && product.mandibularConfig.gumShadePart1))) && (
                            <div className="h-[28px] flex items-center justify-center">
                              <Label className="text-sm font-semibold text-gray-800">Impression</Label>
                            </div>
                          )}
                          {((product.maxillaryConfig.gumShadePart1 && product.type.includes("Maxillary")) || (product.mandibularConfig.gumShadePart1 && product.type.includes("Mandibular"))) && (
                            <div className="h-[28px] flex items-center justify-center">
                              <Label className="text-sm font-semibold text-gray-800">Add-ons</Label>
                            </div>
                          )}
                        </div>

                        {/* Right Column - Mandibular */}
                        <div className="space-y-2 px-2">
                          {/* Restoration */}
                          {isBothArches && currentVisibility.mandibular?.restoration && (
                            <div>
                              {isCaseSubmitted ? (
                                <div className="relative dropdown-container">
                                  <div className="w-full h-[28px] px-3 py-1 text-left border rounded-[6px] bg-white text-sm flex items-center border-gray-300">
                                    <span className="text-gray-900">{product.mandibularConfig.restoration}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative dropdown-container">
                                  <Select value={product.mandibularConfig.restoration} disabled>
                                    <SelectTrigger className="h-[28px] w-full bg-white border border-gray-300 rounded-[6px] text-sm" disabled>
                                      <SelectValue placeholder="Select Restoration" />
                                    </SelectTrigger>
                                    <SelectContent className="z-[50] max-h-[300px] overflow-y-auto">
                                      <SelectItem value={product.mandibularConfig.restoration}>{product.mandibularConfig.restoration}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              {errors["mandibular.restoration"] && <span className="text-red-500 text-xs">{errors["mandibular.restoration"]}</span>}
                            </div>
                          )}

                          {/* Product */}
                          {isBothArches && currentVisibility.mandibular?.productName && (
                            <div>
                              {isCaseSubmitted ? (
                                <div className="relative dropdown-container">
                                  <div className="w-full h-[28px] px-3 py-1 text-left border rounded-[6px] bg-white text-sm flex items-center border-gray-300">
                                    <span className="text-gray-900">{product.mandibularConfig.productName}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative dropdown-container">
                                  <Select value={product.mandibularConfig.productName} disabled>
                                    <SelectTrigger className="h-[28px] w-full bg-white border border-gray-300 rounded-[6px] text-sm" disabled>
                                      <SelectValue placeholder="Select Product Name" />
                                    </SelectTrigger>
                                    <SelectContent className="z-[50] max-h-[300px] overflow-y-auto">
                                      <SelectItem value={product.mandibularConfig.productName}>{product.mandibularConfig.productName}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              {errors["mandibular.productName"] && <span className="text-red-500 text-xs">{errors["mandibular.productName"]}</span>}
                            </div>
                          )}

                          {/* Grade */}
                          {isBothArches && currentVisibility.mandibular?.grade && (
                            <div>
                              {isCaseSubmitted ? (
                                <div className="relative dropdown-container">
                                  <div className="w-full h-[28px] px-3 py-1 text-left border rounded-[6px] bg-white text-sm flex items-center border-gray-300">
                                    <span className="text-gray-900">{product.mandibularConfig.grade}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative dropdown-container">
                                  <button
                                    type="button"
                                    className={`w-full h-[28px] px-3 py-1 text-left border rounded-[6px] bg-white text-sm focus:outline-none transition-all duration-200 flex items-center justify-between relative ${
                                      selectOpen[product.id]?.mandibular === "grade"
                                        ? "border-blue-500 shadow-md"
                                        : !product.mandibularConfig.grade
                                        ? "border-blue-500 hover:border-blue-600"
                                        : "border-gray-300 hover:border-gray-400"
                                    }`}
                                    onClick={() =>
                                      setSelectOpen(prev => ({ ...prev, [product.id]: { ...prev[product.id], mandibular: prev[product.id]?.mandibular === "grade" ? undefined : "grade" } }))
                                    }
                                  >
                                    {!product.mandibularConfig.grade && null}
                                    <span className="text-gray-900">
                                      {product.mandibularConfig.grade || "Select Grade"}
                                    </span>
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                  {selectOpen[product.id]?.mandibular === "grade" && (
                                    <div className="absolute z-[9999] top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                                      <div className="py-1">
                                        {(gradesLoading || contextGradesLoading) ? (
                                          <div className="px-3 py-2 text-sm text-gray-500 flex items-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Loading grades...
                                          </div>
                                        ) : getGradeOptions(product).length > 0 ? (
                                          getGradeOptions(product).map((opt: any, idx: number) => (
                                            <button
                                              key={idx}
                                              type="button"
                                              className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 transition-colors duration-150"
                                              onClick={() => {
                                                handleLocalProductDetailChange(product.id, "mandibular", "grade", opt.value)
                                                setSelectOpen(prev => ({ ...prev, [product.id]: { ...prev[product.id], mandibular: undefined } }))
                                              }}
                                            >
                                              {opt.label}
                                            </button>
                                          ))
                                        ) : (
                                          <div className="px-3 py-2 text-sm text-gray-500">No options available</div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              {errors["mandibular.grade"] && <span className="text-red-500 text-xs">{errors["mandibular.grade"]}</span>}
                            </div>
                          )}

                          {/* Stage */}
                          {isBothArches && currentVisibility.mandibular?.stage && (
                            <div>
                              {isCaseSubmitted ? (
                                <div className="relative dropdown-container">
                                  <div className="w-full h-[28px] px-3 py-1 text-left border rounded-[6px] bg-white text-sm flex items-center border-gray-300">
                                    <span className="text-gray-900">{product.mandibularConfig.stage}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative dropdown-container">
                                  <button
                                    type="button"
                                    className={`w-full h-[28px] px-3 py-1 text-left border rounded-[6px] bg-white text-sm focus:outline-none transition-all duration-200 flex items-center justify-between relative ${
                                      selectOpen[product.id]?.mandibular === "stage"
                                        ? "border-blue-500 shadow-md"
                                        : !product.mandibularConfig.stage
                                        ? "border-blue-500 hover:border-blue-600"
                                        : "border-gray-300 hover:border-gray-400"
                                    }`}
                                    onClick={() =>
                                      setSelectOpen(prev => ({ ...prev, [product.id]: { ...prev[product.id], mandibular: prev[product.id]?.mandibular === "stage" ? undefined : "stage" } }))
                                    }
                                  >
                                    {!product.mandibularConfig.stage && null}
                                    <span className="text-gray-900">
                                      {product.mandibularConfig.stage || "Select Stage"}
                                    </span>
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                  {selectOpen[product.id]?.mandibular === "stage" && (
                                    <div className="absolute z-[9999] top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                                      <div className="py-1">
                                        {(stagesLoading || contextStagesLoading) ? (
                                          <div className="px-3 py-2 text-sm text-gray-500 flex items-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Loading stages...
                                          </div>
                                        ) : getStageOptions(product).length > 0 ? (
                                          getStageOptions(product).map((opt: any, idx: number) => (
                                            <button
                                              key={idx}
                                              type="button"
                                              className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 transition-colors duration-150"
                                              onClick={async () => {
                                                handleLocalProductDetailChange(product.id, "mandibular", "stage", opt.value)
                                                setSelectOpen(prev => ({ ...prev, [product.id]: { ...prev[product.id], mandibular: undefined } }))
                                                const prodId = Number(product.id.split('-')[0]) || Number(product.id)
                                                const labId = slipData?.selectedLab?.lab?.id || slipData?.selectedLab?.id
                                                const stageObj = product.stages?.find((s) => s.name === opt.value)
                                                if (labId && prodId && stageObj?.id) {
                                                  try {
                                                    const deliveryData = await debouncedCalculateDeliveryDate(prodId, stageObj.id) as any
                                                    handleUpdateDatesFromApi?.(deliveryData?.pickup_date || "", deliveryData?.delivery_date || "", deliveryData?.delivery_time || "")
                                                    // Store delivery date for this product
                                                    if (deliveryData?.delivery_date) {
                                                      setProductDeliveryDates(prev => ({
                                                        ...prev,
                                                        [product.id]: deliveryData.delivery_date
                                                      }))
                                                    }
                                                  } catch (error) {
                                                    console.error(`Error calculating delivery date for product ${product.id} mandibular stage change:`, error)
                                                  }
                                                }
                                              }}
                                            >
                                              {opt.label}
                                            </button>
                                          ))
                                        ) : (
                                          <div className="px-3 py-2 text-sm text-gray-500">No options available</div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              {errors["mandibular.stage"] && <span className="text-red-500 text-xs">{errors["mandibular.stage"]}</span>}
                            </div>
                          )}

                          {/* Teeth Shade */}
                          {isBothArches && currentVisibility.mandibular?.teethShadePart1 && (
                            <div className="relative">
                              {isCaseSubmitted ? (
                                <div className="w-full h-[28px] px-3 py-1 text-left border rounded-[6px] bg-white text-sm flex items-center border-gray-300">
                                  <div className="flex items-center gap-2">
                                    {product.mandibularConfig.teethShadePart1 && product.mandibularConfig.teethShadePart2 && (
                                      <div
                                        className="w-4 h-4 rounded border border-gray-300 shadow-sm"
                                        style={{ backgroundColor: getShadeColor(product.mandibularConfig.teethShadePart1, product.mandibularConfig.teethShadePart2, product.productTeethShades) }}
                                        title={getTeethShadeDisplay(product, 'mandibular')}
                                      />
                                    )}
                                    <span className="text-gray-900">
                                      {getTeethShadeDisplay(product, 'mandibular')}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative">
                                  {/* Combined Teeth Shade - Single Field, Clickable to Open Guide */}
                                  <div className="relative">
                                    <button
                                      type="button"
                                      className={`w-full h-[28px] px-3 py-1 text-left border rounded-[6px] bg-white text-sm focus:outline-none transition-all duration-200 flex items-center justify-between cursor-pointer relative ${
                                        !product.mandibularConfig.teethShadePart1 || !product.mandibularConfig.teethShadePart2
                                          ? "border-blue-500 hover:border-blue-600"
                                          : "border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                                      }`}
                                      onClick={() => {
                                        handleOpenTeethShadeSelection(product.id, 'mandibular')
                                      }}
                                      title="Click to open Teeth Shade Selection"
                                    >
                                      {(!product.mandibularConfig.teethShadePart1 || !product.mandibularConfig.teethShadePart2) && null}
                                      <div className="flex items-center gap-2">
                                        {product.mandibularConfig.teethShadePart1 && product.mandibularConfig.teethShadePart2 && (
                                          <div
                                            className="w-4 h-4 rounded border border-gray-300 shadow-sm"
                                            style={{ backgroundColor: getShadeColor(product.mandibularConfig.teethShadePart1, product.mandibularConfig.teethShadePart2) }}
                                            title={`Shade: ${product.mandibularConfig.teethShadePart2}`}
                                          />
                                        )}
                                        <span className="text-gray-900">
                                          {getTeethShadeDisplay(product, 'mandibular')}
                                        </span>
                                      </div>
                                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              )}
                              {errors["mandibular.teethShadePart1"] && <span className="text-red-500 text-xs">{errors["mandibular.teethShadePart1"]}</span>}
                              {errors["mandibular.teethShadePart2"] && <span className="text-red-500 text-xs">{errors["mandibular.teethShadePart2"]}</span>}
                            </div>
                          )}

                          {isBothArches && (currentVisibility.mandibular?.gumShadePart1 && product.mandibularConfig.teethShadePart1) && (
                            <div className="relative">
                              {isCaseSubmitted ? (
                                <div className="w-full h-[28px] px-3 py-1 text-left border rounded-[6px] bg-white text-sm flex items-center border-gray-300">
                                  <span className="text-gray-900">
                                    {product.mandibularConfig.gumShadePart1} {product.mandibularConfig.gumShadePart2}
                                  </span>
                                </div>
                              ) : (
                                <div className="relative">
                                  {/* Gum Shade - Single Selection, Clickable to Open Guide */}
                                  <button
                                    type="button"
                                    className={`w-full h-[28px] px-3 py-1 text-left border rounded-[6px] bg-white text-sm focus:outline-none transition-all duration-200 flex items-center justify-between cursor-pointer relative ${
                                      !product.mandibularConfig.gumShadePart1
                                        ? "border-blue-500 hover:border-blue-600"
                                        : "border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                                    }`}
                                    onClick={() => {
                                      handleOpenGumShadeSelection(product.id, 'mandibular')
                                    }}
                                    title="Click to open Gum Shade Selection"
                                  >
                                    {!product.mandibularConfig.gumShadePart1 && null}
                                    <span className="text-gray-900">
                                      {product.mandibularConfig.gumShadePart1
                                        ? `${product.mandibularConfig.gumShadePart1}${product.mandibularConfig.gumShadePart2 ? ' ' + product.mandibularConfig.gumShadePart2 : ''}`
                                        : "Select Gum Shade"}
                                    </span>
                                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                              {errors["mandibular.gumShadePart1"] && <span className="text-red-500 text-xs">{errors["mandibular.gumShadePart1"]}</span>}
                              {errors["mandibular.gumShadePart2"] && <span className="text-red-500 text-xs">{errors["mandibular.gumShadePart2"]}</span>}
                            </div>
                          )}

                          {/* Impression */}
                          {isBothArches && (currentVisibility.mandibular?.impression && product.mandibularConfig.gumShadePart1) && (
                            <div className="relative">
                              {isCaseSubmitted ? (
                                <div className="h-9 mt-1 flex items-center text-sm text-gray-800 pl-3">
                                  {Object.entries(impressionQuantities)
                                    .filter(([key, qty]) => key.startsWith(`${product.id}_mandibular_`) && (qty as number) > 0)
                                    .map(([key, qty]) => {
                                      const name = key.replace(`${product.id}_mandibular_`, "")
                                      return `${qty}x ${name}`
                                    })
                                    .join(", ") || "None"}
                                </div>
                              ) : (
                                <div className="relative">
                                  <button
                                    type="button"
                                    className={`w-full h-9 px-4 py-2 text-left border-2 rounded-md bg-white text-sm focus:outline-none transition-all duration-200 flex items-center justify-between relative ${
                                      Object.entries(impressionQuantities)
                                        .filter(([key, qty]) => key.startsWith(`${product.id}_mandibular_`) && (qty as number) > 0)
                                        .length === 0
                                        ? "border-blue-500 hover:border-blue-600"
                                        : "border-gray-300 hover:border-gray-400"
                                    }`}
                                    onClick={() => handleOpenImpressionModal(product.id, "mandibular")}
                                  >
                                    {Object.entries(impressionQuantities)
                                      .filter(([key, qty]) => key.startsWith(`${product.id}_mandibular_`) && (qty as number) > 0)
                                      .length === 0 && null}
                                    <span className="text-gray-900">
                                      {(() => {
                                        const selectedImpressions = Object.entries(impressionQuantities)
                                          .filter(([key, qty]) => key.startsWith(`${product.id}_mandibular_`) && (qty as number) > 0)
                                          .map(([key, qty]) => {
                                            const name = key.replace(`${product.id}_mandibular_`, "")
                                            return { name, qty }
                                          })

                                        if (selectedImpressions.length === 0) {
                                          return "Select Impression(s)"
                                        }
                                        
                                        const totalCount = selectedImpressions.reduce((sum, imp) => sum + imp.qty, 0)
                                        
                                        if (selectedImpressions.length <= 1) {
                                          return selectedImpressions.map(imp => `${imp.qty}x ${imp.name}`).join(", ")
                                        } else {
                                          const firstOne = selectedImpressions.slice(0, 1).map(imp => `${imp.qty}x ${imp.name}`).join(", ")
                                          return `${firstOne} +${selectedImpressions.length - 1} more (${totalCount} total)`
                                        }
                                      })()}
                                    </span>
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                              {errors["mandibular.impression"] && <span className="text-red-500 text-xs">{errors["mandibular.impression"]}</span>}
                            </div>
                          )}

                          {/* Add-ons button (mandibular, show when impression has value) */}
                          {!isCaseSubmitted &&
                            product.type.includes("Mandibular") && 
                            product.mandibularConfig.gumShadePart1 && (
                              <Button variant="outline" className="h-8 px-3 w-full bg-white text-xs" onClick={() => handleOpenMandibularAddOnsModalWithFetch(product.id)}>
                                <Plus className="w-3 h-3 mr-1" />
                                Add Mandibular Add-ons
                              </Button>
                          )}
                          
                          {/* Extractions button removed - using product selection for extractions instead */}
                        </div>
                      </div>

                      {((storeAddOns?.maxillary?.length || 0) > 0 || (storeAddOns?.mandibular?.length || 0) > 0) && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                          <h4 className="font-semibold text-xs mb-1">Configured Add-ons:</h4>
                          <div className="mb-2">
                            <div className="font-semibold text-xs text-blue-700 mb-1">Maxillary</div>
                            {Array.isArray(storeAddOns?.maxillary) && storeAddOns.maxillary.length > 0 ? (
                              <ul className="list-disc list-inside text-sm text-gray-700">
                                {storeAddOns.maxillary.map((addOn: any, index: number) => (
                                  <li key={`max-${index}`} className="flex items-center gap-2">
                                    {(addOn.qty ?? addOn.quantity ?? 1)} x {addOn.addOn ?? addOn.name ?? addOn.label ?? "Add-on"}
                                    {addOn.category && <span className="text-gray-400">({addOn.category})</span>}{" "}
                                    {addOn.price !== undefined && <span className="text-gray-400">${typeof addOn.price === 'number' ? Number(addOn.price).toFixed(2) : addOn.price}</span>}
                                    <Button variant="ghost" size="icon" className="ml-2 p-1" onClick={() => handleRemoveAddOn(product.id, "maxillary", index)} disabled={isCaseSubmitted} title="Remove Add-on">
                                      <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="text-xs text-gray-400">No add-ons configured.</div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-blue-700 mb-1">Mandibular</div>
                            {Array.isArray(storeAddOns?.mandibular) && storeAddOns.mandibular.length > 0 ? (
                              <ul className="list-disc list-inside text-sm text-gray-700">
                                {storeAddOns.mandibular.map((addOn: any, index: number) => (
                                  <li key={`man-${index}`} className="flex items-center gap-2">
                                    {(addOn.qty ?? addOn.quantity ?? 1)} x {addOn.addOn ?? addOn.name ?? addOn.label ?? "Add-on"}
                                    {addOn.category && <span className="text-gray-400">({addOn.category})</span>}{" "}
                                    {addOn.price !== undefined && <span className="text-gray-400">${typeof addOn.price === 'number' ? Number(addOn.price).toFixed(2) : addOn.price}</span>}
                                    <Button variant="ghost" size="icon" className="ml-2 p-1" onClick={() => handleRemoveAddOn(product.id, "mandibular", index)} disabled={isCaseSubmitted} title="Remove Add-on">
                                      <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="text-xs text-gray-400">No add-ons configured.</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Extractions Display removed - using product selection for extractions instead */}

                      {/* Action Buttons */}
                      <div className="mt-3 flex flex-col sm:flex-row flex-wrap gap-3 justify-center items-center">
                        {/* Add ons button */}
                        <Button 
                          variant="outline" 
                          className="bg-white h-10 px-4 w-50 text-sm font-medium border-gray-300 hover:bg-gray-50" 
                          disabled={isCaseSubmitted}
                          onClick={() => {
                            // Handle add-ons click - could open a modal or navigate
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add ons ({(() => {
                            const maxAddOnCount = Array.isArray(product.addOns?.maxillary) ? product.addOns.maxillary.length : 0
                            const manAddOnCount = Array.isArray(product.addOns?.mandibular) ? product.addOns.mandibular.length : 0
                            return maxAddOnCount + manAddOnCount
                          })()} selected)
                        </Button>

                        {/* Attach Files button */}
                        <Dialog open={showAttachModal} onOpenChange={setShowAttachModal}>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="bg-white h-10 px-4 text-sm font-medium border-gray-300 hover:bg-gray-50" disabled={isCaseSubmitted}>
                              <Paperclip className="w-4 h-4 mr-2" />
                              Attach Files ({(() => {
                                let count = 0
                                if (typeof window !== "undefined") {
                                  try {
                                    const cacheStr = window.localStorage.getItem("caseDesignCache")
                                    if (cacheStr) {
                                      const cache = JSON.parse(cacheStr)
                                      if (Array.isArray(cache.attachments)) count = cache.attachments.length
                                    }
                                  } catch {}
                                }
                                return count
                              })()} uploads)
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[1000px] w-[95vw] max-h-[min(750px,85vh)] p-0">
                            <FileAttachmentModalContent setShowAttachModal={setShowAttachModal} isCaseSubmitted={isCaseSubmitted} />
                          </DialogContent>
                        </Dialog>

                        {/* Request Rush button */}
                        {rushRequests[product.id] ? (
                          <Button variant="outline" className="h-10 px-4 border-red-500 text-red-600 hover:text-red-700 hover:border-red-600 bg-transparent text-sm font-medium" disabled>
                            <Zap className="w-4 h-4 mr-2" />
                            Rush Requested
                          </Button>
                        ) : (
                          <Button variant="outline" className="h-10 px-4 border-red-500 text-red-600 hover:text-red-700 hover:border-red-600 bg-transparent text-sm font-medium" onClick={() => handleRushRequest(product.id)} disabled={isCaseSubmitted}>
                            <Zap className="w-4 h-4 mr-2" />
                            Request Rush
                          </Button>
                        )}
                      </div>

                      {/* Expert Mode row */}
                      <div className={`mt-3 border-t border-gray-200 pt-3 ml-4 mr-4 ${isCaseSubmitted ? 'opacity-50' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Settings className={`w-5 h-5 ${isCaseSubmitted ? 'text-gray-400' : 'text-gray-600'}`} />
                            <div>
                              <div className="flex items-center space-x-1">
                                <span className={`font-semibold ${isCaseSubmitted ? 'text-gray-400' : 'text-gray-900'}`}>Master Mode</span>
                              </div>
                              <p className={`text-sm ${isCaseSubmitted ? 'text-gray-400' : 'text-gray-800'}`}>
                                {isCaseSubmitted ? 'Expert Mode disabled - Case submitted' : 'Access advanced restoration design options'}
                              </p>
                            </div>
                          </div>
                          {showExpertModeModal ? null : (
                            <div className="relative group">
                              <Button 
                                variant="outline" 
                                className={`h-10 px-4 text-sm font-medium z-10 relative ${
                                  isCaseSubmitted 
                                    ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed' 
                                    : 'border-gray-300 text-gray-700 hover:text-gray-800 hover:border-gray-400 bg-white'
                                }`}
                                onClick={() => !isCaseSubmitted && setShowExpertModeModal(true)}
                                disabled={isCaseSubmitted}
                                aria-label={isCaseSubmitted ? "Expert Mode disabled - Case submitted" : "Configure Expert Mode"}
                              >
                                <Settings className="w-4 h-4 mr-2" />
                                Configure
                              </Button>
                              {/* Tooltip - positioned to the left of the button */}
                              {!isCaseSubmitted && (
                                <div className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-3 w-max opacity-0 group-hover:opacity-100 transition bg-gray-900 text-white text-xs rounded py-1 px-2 shadow-lg z-[9999]"
                                  style={{ marginRight: '1.5rem' }}
                                >
                                  Configure advanced expert mode options
                                  <span className="absolute left-full top-1/2 -translate-y-1/2 ml-0.5 w-0 h-0 border-y-8 border-y-transparent border-l-8 border-l-gray-900"></span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stage Notes - Editable/Read-only based on case submission status */}
                      <div className={`mt-3 bg-white border border-gray-300 rounded-lg shadow-sm mx-4 ${isCaseSubmitted ? 'opacity-75' : ''}`}>
                        <div className="flex items-center justify-center px-4 py-3 border-gray-200">
                          <h3 className={`text-lg font-semibold ${isCaseSubmitted ? 'text-gray-500' : 'text-gray-900'}`}>Stage Notes</h3>
                          {!isCaseSubmitted && !editingStageNotes[product.id] ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => {
                                setEditingStageNotes(prev => ({ ...prev, [product.id]: true }))
                                // Initialize content if not already set
                                if (!stageNotesContent[product.id]) {
                                  const currentContent = (() => {
                                    // Get selected teeth from teeth selection store
                                    const maxillarySelectedTeeth = getExtractionTypeTeeth('Teeth in mouth', 'maxillary')
                                    const mandibularSelectedTeeth = getExtractionTypeTeeth('Teeth in mouth', 'mandibular')
                                    
                                    // Fallback to props if no selection in store
                                    const maxTeeth = maxillarySelectedTeeth.length > 0 
                                      ? maxillarySelectedTeeth.map(t => `#${t}`).join(', ')
                                      : (selectedMaxillaryTeeth.length > 0 ? selectedMaxillaryTeeth.map(t => `#${t}`).join(', ') : '')
                                    const manTeeth = mandibularSelectedTeeth.length > 0
                                      ? mandibularSelectedTeeth.map(t => `#${t}`).join(', ')
                                      : (selectedMandibularTeeth.length > 0 ? selectedMandibularTeeth.map(t => `#${t}`).join(', ') : '')
                                    
                                    let teeth = ''
                                    if (maxTeeth && manTeeth) {
                                      teeth = `${maxTeeth}, ${manTeeth}`
                                    } else if (maxTeeth) {
                                      teeth = maxTeeth
                                    } else if (manTeeth) {
                                      teeth = manTeeth
                                    } else {
                                      const productMaxTeeth = product.maxillaryTeeth || product.teeth || ''
                                      const productManTeeth = product.mandibularTeeth || ''
                                      if (productMaxTeeth && productManTeeth) {
                                        teeth = `${productMaxTeeth}, ${productManTeeth}`
                                      } else if (productMaxTeeth) {
                                        teeth = productMaxTeeth
                                      } else if (productManTeeth) {
                                        teeth = productManTeeth
                                      } else {
                                        teeth = '#4, #5, #6, #26, #27, #28'
                                      }
                                    }
                                    const maxConfig = product.maxillaryConfig
                                    const manConfig = product.mandibularConfig
                                    const config = maxConfig || manConfig
                                    const teethShadeDisplay = getTeethShadeDisplayText(
                                      config?.teethShadePart1,
                                      config?.teethShadePart2,
                                      config?.teethShadeBrandId,
                                      config?.teethShadeId,
                                      config?.teethShadeBrandName,
                                      config?.teethShadeName,
                                      product.productTeethShades
                                    )
                                    const teethShadeBrand = config?.teethShadeBrandName || getTeethShadeDisplayName(config?.teethShadePart1 || 'VITA Classical - VITA Classical')
                                    const teethShadeValue = config?.teethShadeName || config?.teethShadePart2 || 'A1'
                                    const addOnsText = product.addOns?.maxillary?.length || product.addOns?.mandibular?.length ? `, and Add-on ${product.addOns?.maxillary?.[0]?.name || product.addOns?.mandibular?.[0]?.name || 'gold teeth'} on #4, #5, #26` : ''

                                    return `Fabricate a ${product.maxillaryConfig?.grade || product.mandibularConfig?.grade || 'Mid Grade'} ${product.maxillaryConfig?.productName || product.mandibularConfig?.productName || 'Metal Frame Acrylic'} for ${product.type?.includes('Maxillary') && product.type?.includes('Mandibular') ? 'Maxillary & Mandibular' : product.type || 'Maxillary & Mandibular'} teeth ${teeth}, in ${product.maxillaryConfig?.stage || product.mandibularConfig?.stage || 'Try in with teeth'} stage, using ${teethShadeBrand} ${teethShadeValue} shade and ${product.maxillaryConfig?.gumShadePart2 || product.mandibularConfig?.gumShadePart2 || 'St. George - Light Vein'} gum, with ${product.maxillaryConfig?.impressions?.length || product.mandibularConfig?.impressions?.length || '1'}x ${product.maxillaryConfig?.impressions?.[0]?.name || product.mandibularConfig?.impressions?.[0]?.name || 'STL'} impression${addOnsText}.${rushRequests?.[product.id] ? `\n\nRush case for ${rushRequests[product.id].targetDate ? new Date(rushRequests[product.id].targetDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '—'} delivery.` : ''}`
                                  })()
                                  setStageNotesContent(prev => ({ ...prev, [product.id]: currentContent }))
                                }
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                              Edit
                            </Button>
                          ) : !isCaseSubmitted && editingStageNotes[product.id] ? (
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-3 gap-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                                onClick={() => {
                                  setEditingStageNotes(prev => ({ ...prev, [product.id]: false }))
                                  setStageNotesContent(prev => {
                                    const newContent = { ...prev }
                                    delete newContent[product.id]
                                    return newContent
                                  })
                                }}
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                className="h-8 px-3 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={savingStageNotes[product.id]}
                                onClick={async () => {
                                  const notes = stageNotesContent[product.id] || ''
                                  await saveStageNotes(product.id, notes)
                                  setEditingStageNotes(prev => ({ ...prev, [product.id]: false }))
                                  // Keep the content in state so it displays after save
                                }}
                              >
                                <Save className="w-4 h-4" />
                                {savingStageNotes[product.id] ? 'Saving...' : 'Save'}
                              </Button>
                            </div>
                          ) : isCaseSubmitted ? (
                            <div className="ml-2 flex items-center gap-2 text-gray-500 text-sm">
                              <span>Read-only - Case submitted</span>
                            </div>
                          ) : null}
                        </div>
                        {/* Show selected teeth info when not editing - using Zustand store for real-time updates */}
                        {!editingStageNotes[product.id] && (() => {
                          // Get ALL selected teeth from ALL extraction types for comprehensive display
                          const allMaxillaryTeeth: number[] = []
                          const allMandibularTeeth: number[] = []
                          
                          // Get all extraction types from the Zustand store
                          const extractionTypes = Object.keys(extractionTypeTeethSelection)
                          
                          extractionTypes.forEach(extractionTypeName => {
                            const maxTeethForType = getExtractionTypeTeeth(extractionTypeName, "maxillary")
                            const manTeethForType = getExtractionTypeTeeth(extractionTypeName, "mandibular")
                            
                            if (maxTeethForType.length > 0) {
                              allMaxillaryTeeth.push(...maxTeethForType)
                            }
                            if (manTeethForType.length > 0) {
                              allMandibularTeeth.push(...manTeethForType)
                            }
                          })
                          
                          // Remove duplicates and sort
                          const uniqueMaxillaryTeeth = [...new Set(allMaxillaryTeeth)].sort((a, b) => a - b)
                          const uniqueMandibularTeeth = [...new Set(allMandibularTeeth)].sort((a, b) => a - b)
                          
                          // Use all selected teeth from extraction types, fall back to general selection if none
                          const currentMaxillaryTeeth = uniqueMaxillaryTeeth.length > 0 ? uniqueMaxillaryTeeth : zustandMaxillaryTeeth
                          const currentMandibularTeeth = uniqueMandibularTeeth.length > 0 ? uniqueMandibularTeeth : zustandMandibularTeeth
                          
                          if (currentMaxillaryTeeth.length > 0 || currentMandibularTeeth.length > 0) {
                            return null
                          }
                          return null
                        })()}
                        {editingStageNotes[product.id] && !isCaseSubmitted ? (
                          <div className="p-4">
                            {/* Show selected teeth info when editing - using Zustand store for real-time updates */}
                            {(() => {
                              // Get ALL selected teeth from ALL extraction types for comprehensive display
                              const allMaxillaryTeeth: number[] = []
                              const allMandibularTeeth: number[] = []
                              
                              // Get all extraction types from the Zustand store
                              const extractionTypes = Object.keys(extractionTypeTeethSelection)
                              
                              extractionTypes.forEach(extractionTypeName => {
                                const maxTeethForType = getExtractionTypeTeeth(extractionTypeName, "maxillary")
                                const manTeethForType = getExtractionTypeTeeth(extractionTypeName, "mandibular")
                                
                                if (maxTeethForType.length > 0) {
                                  allMaxillaryTeeth.push(...maxTeethForType)
                                }
                                if (manTeethForType.length > 0) {
                                  allMandibularTeeth.push(...manTeethForType)
                                }
                              })
                              
                              // Remove duplicates and sort
                              const uniqueMaxillaryTeeth = [...new Set(allMaxillaryTeeth)].sort((a, b) => a - b)
                              const uniqueMandibularTeeth = [...new Set(allMandibularTeeth)].sort((a, b) => a - b)
                              
                              // Use all selected teeth from extraction types, fall back to general selection if none
                              const currentMaxillaryTeeth = uniqueMaxillaryTeeth.length > 0 ? uniqueMaxillaryTeeth : zustandMaxillaryTeeth
                              const currentMandibularTeeth = uniqueMandibularTeeth.length > 0 ? uniqueMandibularTeeth : zustandMandibularTeeth
                              
                            // No UI block currently; return null to satisfy JSX typing
                            return null
                            })()}
                            <Textarea
                              value={stageNotesContent[product.id] || ''}
                              onChange={(e) => setStageNotesContent(prev => ({ ...prev, [product.id]: e.target.value }))}
                              className="min-h-[100px] text-sm leading-relaxed"
                              placeholder="Enter stage notes..."
                            />
                          </div>
                        ) : (
                          <div className="p-4 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                              {stageNotesContent[product.id] ? (
                                // Show saved edited content
                                stageNotesContent[product.id]
                              ) : (
                                // Always show real-time generated stage notes
                                  <p>
                                    Fabricate a <strong>{product.maxillaryConfig?.grade || product.mandibularConfig?.grade || 'Mid Grade'} {product.maxillaryConfig?.productName || product.mandibularConfig?.productName || 'Metal Frame Acrylic'}</strong> for <strong>{product.type?.includes('Maxillary') && product.type?.includes('Mandibular') ? 'Maxillary & Mandibular' : product.type || 'Maxillary & Mandibular'}</strong> teeth <strong>{(() => {
                                      // Get ALL selected teeth from ALL extraction types for comprehensive display
                                      const allMaxillaryTeeth: number[] = []
                                      const allMandibularTeeth: number[] = []
                                      
                                      // Get all extraction types from the Zustand store
                                      const extractionTypes = Object.keys(extractionTypeTeethSelection)
                                      
                                      extractionTypes.forEach(extractionTypeName => {
                                        const maxTeethForType = getExtractionTypeTeeth(extractionTypeName, "maxillary")
                                        const manTeethForType = getExtractionTypeTeeth(extractionTypeName, "mandibular")
                                        
                                        if (maxTeethForType.length > 0) {
                                          allMaxillaryTeeth.push(...maxTeethForType)
                                        }
                                        if (manTeethForType.length > 0) {
                                          allMandibularTeeth.push(...manTeethForType)
                                        }
                                      })
                                      
                                      // Remove duplicates and sort
                                      const uniqueMaxillaryTeeth = [...new Set(allMaxillaryTeeth)].sort((a, b) => a - b)
                                      const uniqueMandibularTeeth = [...new Set(allMandibularTeeth)].sort((a, b) => a - b)
                                      
                                      // Use all selected teeth from extraction types, fall back to general selection if none
                                      const currentMaxillaryTeeth = uniqueMaxillaryTeeth.length > 0 ? uniqueMaxillaryTeeth : zustandMaxillaryTeeth
                                      const currentMandibularTeeth = uniqueMandibularTeeth.length > 0 ? uniqueMandibularTeeth : zustandMandibularTeeth
                                      
                                      // Format teeth numbers with # prefix
                                      const maxTeeth = currentMaxillaryTeeth.length > 0 ? currentMaxillaryTeeth.map(t => `#${t}`).join(', ') : ''
                                      const manTeeth = currentMandibularTeeth.length > 0 ? currentMandibularTeeth.map(t => `#${t}`).join(', ') : ''
                                      
                                      if (maxTeeth && manTeeth) {
                                        return `${maxTeeth}, ${manTeeth}`
                                      } else if (maxTeeth) {
                                        return maxTeeth
                                      } else if (manTeeth) {
                                        return manTeeth
                                      } else {
                                        // Fallback to product teeth if no selected teeth
                                        const productMaxTeeth = product.maxillaryTeeth || product.teeth || ''
                                        const productManTeeth = product.mandibularTeeth || ''
                                        if (productMaxTeeth && productManTeeth) {
                                          return `${productMaxTeeth}, ${productManTeeth}`
                                        } else if (productMaxTeeth) {
                                          return productMaxTeeth
                                        } else if (productManTeeth) {
                                          return productManTeeth
                                        } else {
                                          return '#4, #5, #6, #26, #27, #28' // Final fallback
                                        }
                                      }
                                    })()}</strong>, in <strong>{product.maxillaryConfig?.stage || product.mandibularConfig?.stage || 'Try in with teeth'}</strong> stage, using <strong>{(() => {
                                      const config = product.maxillaryConfig || product.mandibularConfig
                                      const teethShadeDisplay = getTeethShadeDisplayText(
                                        config?.teethShadePart1,
                                        config?.teethShadePart2,
                                        config?.teethShadeBrandId,
                                        config?.teethShadeId,
                                        config?.teethShadeBrandName,
                                        config?.teethShadeName,
                                        product.productTeethShades
                                      )
                                      return teethShadeDisplay
                                    })()}</strong> shade and <strong>{product.maxillaryConfig?.gumShadePart2 || product.mandibularConfig?.gumShadePart2 || 'St. George - Light Vein'}</strong> gum, with <strong>{product.maxillaryConfig?.impressions?.length || product.mandibularConfig?.impressions?.length || '1'}x {product.maxillaryConfig?.impressions?.[0]?.name || product.mandibularConfig?.impressions?.[0]?.name || 'STL'}</strong> impression{(product.addOns?.maxillary?.length || product.addOns?.mandibular?.length) ? (
                                    <>
                                      <span>, and Add-on </span>
                                      <strong>{product.addOns?.maxillary?.[0]?.name || product.addOns?.mandibular?.[0]?.name || 'gold teeth'}</strong>
                                      <span> on </span>
                                      <strong>#4, #5, #26</strong>
                                    </>
                                  ) : null}.
                                    {rushRequests?.[product.id] && (
                                      <>
                                        <br /><br />
                                        <strong style={{ color: "#dc2626" }}>
                                          Rush case for {rushRequests?.[product.id]?.targetDate
                                            ? new Date(rushRequests[product.id].targetDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
                                            : '—'} delivery.
                                        </strong>
                                      </>
                                    )}
                                  </p>
                              )}
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        onProductSelect={handleProductSelect}
        selectedLabId={selectedLabId}
      />

      {/* Shade Selection Modal */}
      <ShadeSelectionModal
        isOpen={showShadeModal}
        onClose={() => setShowShadeModal(false)}
        selectedSystem={shadeModalSelectedSystem}
        selectedShade={shadeModalSelectedShade}
        onShadeSelect={handleShadeSelect}
        onSetAsDefault={handleSetShadeAsDefault}
      />

      {/* Impression Selection Modal */}
      {impressionModalProductId && (
        <ImpressionSelectionModal
          isOpen={showImpressionModal}
          onClose={handleCloseImpressionModal}
          impressions={getImpressionOptions(products.find(p => p.id === impressionModalProductId) || {})}
          selectedImpressions={impressionQuantities}
          onUpdateQuantity={handleImpressionQuantityUpdate}
          onRemoveImpression={handleImpressionRemove}
          productId={impressionModalProductId}
          arch={impressionModalArch}
        />
      )}

      {/* Extractions Modal removed - using product selection for extractions instead */}

      {/* Teeth Shade Selection Modal */}
      <TeethShadeSelectionModal
        isOpen={teethShadeSelectionOpen}
        onClose={handleCloseTeethShadeSelection}
        onConfirm={handleTeethShadeSelectionConfirm}
        onLiveUpdate={handleTeethShadeLiveUpdate}
        initialShadeSystem={selectedProductForShadeGuide && selectedArchForShadeGuide ?
          (selectedArchForShadeGuide === 'maxillary' ?
            products.find(p => p.id === selectedProductForShadeGuide)?.maxillaryConfig?.teethShadePart1 :
            products.find(p => p.id === selectedProductForShadeGuide)?.mandibularConfig?.teethShadePart1
          ) : undefined
        }
        initialIndividualShade={selectedProductForShadeGuide && selectedArchForShadeGuide ?
          (selectedArchForShadeGuide === 'maxillary' ?
            products.find(p => p.id === selectedProductForShadeGuide)?.maxillaryConfig?.teethShadePart2 :
            products.find(p => p.id === selectedProductForShadeGuide)?.mandibularConfig?.teethShadePart2
          ) : undefined
        }
        type="teeth"
        productId={storeSlipData?.selectedProduct?.id || (selectedProductForShadeGuide ?
          Number(products.find(p => p.id === selectedProductForShadeGuide)?.id.split("-")[0]) ||
          Number(products.find(p => p.id === selectedProductForShadeGuide)?.id) :
          undefined)
        }
        customerId={(() => {
          if (typeof window !== "undefined") {
            const role = localStorage.getItem("role")
            if (role === "lab_admin" || role === "superadmin") {
              const customerId = localStorage.getItem("customerId")
              return customerId ? Number(customerId) : undefined
            }
          }
          return selectedLabId || undefined
        })()}
        modalId="teeth-shade-modal"
      />

      {/* Gum Shade Selection Modal */}
      <TeethShadeSelectionModal
        isOpen={gumShadeSelectionOpen}
        onClose={handleCloseGumShadeSelection}
        onConfirm={handleGumShadeSelectionConfirm}
        onLiveUpdate={handleGumShadeLiveUpdate}
        initialShadeSystem={selectedProductForGumShadeGuide && selectedArchForGumShadeGuide ?
          (selectedArchForGumShadeGuide === 'maxillary' ?
            products.find(p => p.id === selectedProductForGumShadeGuide)?.maxillaryConfig?.gumShadePart1 :
            products.find(p => p.id === selectedProductForGumShadeGuide)?.mandibularConfig?.gumShadePart1
          ) : undefined
        }
        initialIndividualShade={selectedProductForGumShadeGuide && selectedArchForGumShadeGuide ?
          (selectedArchForGumShadeGuide === 'maxillary' ?
            products.find(p => p.id === selectedProductForGumShadeGuide)?.maxillaryConfig?.gumShadePart2 :
            products.find(p => p.id === selectedProductForGumShadeGuide)?.mandibularConfig?.gumShadePart2
          ) : undefined
        }
        type="gum"
        productId={storeSlipData?.selectedProduct?.id || (selectedProductForGumShadeGuide ?
          Number(products.find(p => p.id === selectedProductForGumShadeGuide)?.id.split("-")[0]) ||
          Number(products.find(p => p.id === selectedProductForGumShadeGuide)?.id) :
          undefined)
        }
        customerId={(() => {
          if (typeof window !== "undefined") {
            const role = localStorage.getItem("role")
            if (role === "lab_admin" || role === "superadmin") {
              const customerId = localStorage.getItem("customerId")
              return customerId ? Number(customerId) : undefined
            }
          }
          return selectedLabId || undefined
        })()}
        modalId="gum-shade-modal"
        arch={selectedArchForGumShadeGuide || undefined}
      />

      {/* Expert Mode Modal */}
      <ExpertModeModal
        isOpen={showExpertModeModal}
        onClose={() => setShowExpertModeModal(false)}
      />
    </TooltipProvider>
  )
}