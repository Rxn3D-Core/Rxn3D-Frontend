"use client"

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useQuery } from "@tanstack/react-query"
import { useDebounce } from "@/lib/performance-utils"
import { Search, Pencil, Eye, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Loader2, Trash2, Plus, Paperclip, Zap, Maximize2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { CustomerLogo } from "@/components/customer-logo"
import { useProductCategory, type ProductCategory } from "@/contexts/product-category-context"
import { useSlipCreation } from "@/contexts/slip-creation-context"
import { SlipCreationHeader } from "@/components/slip-creation-header"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { clearSlipCreationStorage } from "@/utils/slip-creation-storage"
import { DynamicProductFields } from "@/components/case-design-center/dynamic-product-fields"
import { ImplantPartsPopover } from "@/components/implant-parts-popover"
import { FooterSection } from "./sections/footer-section"
import { ProductSelectionBadge } from "./components/product-selection-badge"
import type { ProductCategoryApi, Doctor, Lab, PatientData, Product, SavedProduct } from "./sections/types"

const SavedProductsSection = dynamic(
  () => import("./sections/saved-products-section").then((mod) => ({ default: mod.SavedProductsSection })),
  {
    ssr: false,
    loading: () => null
  }
)

// Dynamic imports for heavy components - loaded only when needed
const MandibularTeethSVG = dynamic(
  () => import("@/components/mandibular-teeth-svg").then((mod) => ({ default: mod.MandibularTeethSVG })),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" /></div>
  }
)

const MaxillaryTeethSVG = dynamic(
  () => import("@/components/maxillary-teeth-svg").then((mod) => ({ default: mod.MaxillaryTeethSVG })),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" /></div>
  }
)

const ToothShadeSelectionSVG = dynamic(
  () => import("@/components/tooth-shade-selection-svg").then((mod) => ({ default: mod.ToothShadeSelectionSVG })),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" /></div>
  }
)

const AddOnsModal = dynamic(
  () => import("@/components/add-ons-modal"),
  { 
    ssr: false,
    loading: () => null
  }
)

const RushRequestModal = dynamic(
  () => import("@/components/rush-request-modal"),
  { 
    ssr: false,
    loading: () => null
  }
)

const PrintPreviewModal = dynamic(
  () => import("@/components/print-preview-modal"),
  { 
    ssr: false,
    loading: () => null
  }
)

const CancelSlipCreationModal = dynamic(
  () => import("@/components/cancel-slip-creation-modal"),
  { 
    ssr: false,
    loading: () => null
  }
)

const ImpressionSelectionModal = dynamic(
  () => import("@/components/impression-selection-modal").then((mod) => ({ default: mod.ImpressionSelectionModal })),
  { 
    ssr: false,
    loading: () => null
  }
)

const ToothShadeSelectionModal = dynamic(
  () => import("@/components/tooth-shade-selection-modal").then((mod) => ({ default: mod.ToothShadeSelectionModal })),
  { 
    ssr: false,
    loading: () => null
  }
)

const FileAttachmentModalContent = dynamic(
  () => import("@/components/file-attachment-modal-content"),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" /></div>
  }
)


// Helper component for Stage field with auto-open functionality
function StageFieldComponent({
  savedProduct,
  isMaxillary,
  openStageDropdown,
  setOpenStageDropdown,
  handleStageSelect
}: {
  savedProduct: SavedProduct
  isMaxillary: boolean
  openStageDropdown: Record<string, { maxillary?: boolean; mandibular?: boolean }>
  setOpenStageDropdown: React.Dispatch<React.SetStateAction<Record<string, { maxillary?: boolean; mandibular?: boolean }>>>
  handleStageSelect: (productId: string, arch: "maxillary" | "mandibular", stageName: string, stageId?: number) => void
}) {
  const arch = isMaxillary ? "maxillary" : "mandibular"
  const stageValue = isMaxillary ? savedProduct.maxillaryStage : savedProduct.mandibularStage
  
  // Auto-open dropdown when component mounts if value is "Not specified" or empty
  useEffect(() => {
    const isNotSpecified = !stageValue || 
      stageValue.trim() === "" || 
      stageValue.trim().toLowerCase() === "not specified" || 
      stageValue.trim().toLowerCase() === "finish"
    
    if (isNotSpecified) {
      // Small delay to ensure the Select component is ready
      const timer = setTimeout(() => {
        setOpenStageDropdown((prev) => ({
          ...prev,
          [savedProduct.id]: {
            ...prev[savedProduct.id],
            [arch]: true
          }
        }))
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, []) // Only run on mount

  return (
    <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
      <Select
        open={openStageDropdown[savedProduct.id]?.[arch] || false}
        onOpenChange={(open) =>
          setOpenStageDropdown((prev) => ({
            ...prev,
            [savedProduct.id]: {
              ...prev[savedProduct.id],
              [arch]: open
            }
          }))
        }
        value={stageValue || ""}
        onValueChange={(value) => {
          const productDetails = savedProduct.productDetails
          const stages = productDetails?.stages || []
          const selectedStage = stages.find((s: any) => s.name === value || s.id?.toString() === value)
          handleStageSelect(
            savedProduct.id,
            arch,
            value,
            selectedStage?.id
          )
        }}
      >
        <SelectTrigger
          style={{
            padding: '12px 15px 5px 15px',
            gap: '5px',
            width: '100%',
            height: '37px',
            position: 'relative',
            marginTop: '5.27px',
            background: '#FFFFFF',
            border: '0.740384px solid #7F7F7F',
            borderRadius: '7.7px',
            boxSizing: 'border-box',
            fontFamily: 'Verdana',
            fontStyle: 'normal',
            fontWeight: 400,
            fontSize: '14.4px',
            lineHeight: '20px',
            letterSpacing: '-0.02em',
            color: '#000000'
          }}
        >
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent className="z-[50] max-h-[300px] overflow-y-auto">
          {savedProduct.productDetails?.stages?.map((stage: any, idx: number) => (
            <SelectItem key={idx} value={stage.name || stage.id?.toString() || ""}>
              {stage.name || stage}
            </SelectItem>
          )) || []}
        </SelectContent>
      </Select>
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
          color: '#7F7F7F',
          pointerEvents: 'none',
          zIndex: 1
        }}
      >
        Stage
      </label>
    </div>
  )
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

  // Arch selection state - track which arch user wants to configure
  const [selectedArchForProduct, setSelectedArchForProduct] = useState<"maxillary" | "mandibular" | null>(null)
  const [showMaxillaryChart, setShowMaxillaryChart] = useState<boolean>(false)
  const [showMandibularChart, setShowMandibularChart] = useState<boolean>(false)
  const [selectedProductForMaxillary, setSelectedProductForMaxillary] = useState<Product | null>(null)
  const [selectedProductForMandibular, setSelectedProductForMandibular] = useState<Product | null>(null)

  // Dental chart states
  const [maxillaryTeeth, setMaxillaryTeeth] = useState<number[]>([])
  const [mandibularTeeth, setMandibularTeeth] = useState<number[]>([])

  // Retention type state - tracks which retention types are selected for each tooth
  const [maxillaryRetentionTypes, setMaxillaryRetentionTypes] = useState<Record<number, Array<'Implant' | 'Prep' | 'Pontic'>>>({})
  const [mandibularRetentionTypes, setMandibularRetentionTypes] = useState<Record<number, Array<'Implant' | 'Prep' | 'Pontic'>>>({})

  // Retention popover state
  const [retentionPopoverState, setRetentionPopoverState] = useState<{
    arch: 'maxillary' | 'mandibular' | null
    toothNumber: number | null
  }>({ arch: null, toothNumber: null })

  // Form states for MAXILLARY
  const [maxillaryMaterial, setMaxillaryMaterial] = useState<string>("")
  const [maxillaryStumpShade, setMaxillaryStumpShade] = useState<string>("")
  const [maxillaryRetention, setMaxillaryRetention] = useState<string>("")
  const [maxillaryNotes, setMaxillaryNotes] = useState<string>("")
  const [maxillaryMaterialId, setMaxillaryMaterialId] = useState<number | undefined>(undefined)
  const [maxillaryRetentionId, setMaxillaryRetentionId] = useState<number | undefined>(undefined)
  const [maxillaryRetentionOptionId, setMaxillaryRetentionOptionId] = useState<number | undefined>(undefined)
  const [maxillaryGumShadeId, setMaxillaryGumShadeId] = useState<number | undefined>(undefined)
  const [maxillaryShadeId, setMaxillaryShadeId] = useState<number | undefined>(undefined)
  const [maxillaryStageId, setMaxillaryStageId] = useState<number | undefined>(undefined)
  const [maxillaryToothShade, setMaxillaryToothShade] = useState<string>("")
  const [maxillaryStage, setMaxillaryStage] = useState<string>("")

  // Form states for MANDIBULAR
  const [mandibularMaterial, setMandibularMaterial] = useState<string>("")
  const [mandibularRetention, setMandibularRetention] = useState<string>("")
  const [mandibularImplantDetails, setMandibularImplantDetails] = useState<string>("")
  const [mandibularMaterialId, setMandibularMaterialId] = useState<number | undefined>(undefined)
  const [mandibularRetentionId, setMandibularRetentionId] = useState<number | undefined>(undefined)
  const [mandibularRetentionOptionId, setMandibularRetentionOptionId] = useState<number | undefined>(undefined)
  const [mandibularGumShadeId, setMandibularGumShadeId] = useState<number | undefined>(undefined)
  const [mandibularShadeId, setMandibularShadeId] = useState<number | undefined>(undefined)
  const [mandibularStageId, setMandibularStageId] = useState<number | undefined>(undefined)
  const [mandibularToothShade, setMandibularToothShade] = useState<string>("")
  const [mandibularStage, setMandibularStage] = useState<string>("")

  // State to track if advance fields should be shown per product
  const [showAdvanceFields, setShowAdvanceFields] = useState<{ [productId: string]: boolean }>({})
  
  // State to store fetched advance fields per product
  const [productAdvanceFields, setProductAdvanceFields] = useState<{ [productId: string]: any[] }>({})

  // State to store advance field values (for unsaved products in accordion)
  const [advanceFieldValues, setAdvanceFieldValues] = useState<{ [fieldId: string]: any }>({})
  
  // State to track which fields are completed per product (for progressive disclosure)
  const [completedFields, setCompletedFields] = useState<{ [productId: string]: Set<string> }>({})

  // Unified accordion state - tracks which accordion is open (only one at a time)
  const [openAccordion, setOpenAccordion] = useState<string | null>(null)

  // State to track which stage dropdown is open: { [productId]: { [arch]: boolean } }
  const [openStageDropdown, setOpenStageDropdown] = useState<Record<string, { maxillary?: boolean; mandibular?: boolean }>>({})

  // Impression selection modal state
  const [showImpressionModal, setShowImpressionModal] = useState<boolean>(false)
  const [currentImpressionArch, setCurrentImpressionArch] = useState<"maxillary" | "mandibular">("maxillary")
  const [selectedImpressions, setSelectedImpressions] = useState<Record<string, number>>({}) // key: `${productId}_${arch}_${impressionName}`, value: quantity
  const [currentProductForImpression, setCurrentProductForImpression] = useState<SavedProduct | null>(null)

  // Shade selection modal state
  const [showShadeModal, setShowShadeModal] = useState<boolean>(false)
  const [currentShadeField, setCurrentShadeField] = useState<"tooth_shade" | "stump_shade" | null>(null)
  const [currentShadeArch, setCurrentShadeArch] = useState<"maxillary" | "mandibular">("maxillary")
  const [selectedShadesForSVG, setSelectedShadesForSVG] = useState<string[]>([])
  const [selectedShadeOption, setSelectedShadeOption] = useState<"custom" | "stump" | null>(null)

  // Helper function to get field order based on category
  const getFieldOrder = (category: string): string[] => {
    // Handle undefined or null category
    if (!category) {
      return ["product_material", "retention", "stage"]
    }
    
    const categoryLower = category.toLowerCase()
    const isFixedRestoration = categoryLower.includes("fixed")
    const isRemovableOrOrtho = categoryLower.includes("removable") || 
                                categoryLower.includes("orthodontic") || 
                                categoryLower.includes("ortho")
    
    if (isFixedRestoration) {
      return [
        "product_material",
        "retention",
        "implant",
        "stump_shade",
        "crown_third_shade",
        "tooth_shade",
        "stage",
        "pontic_design",
        "embrasures",
        "occlusal_contact",
        "interproximal_contact",
        "gap",
        "impressions",
        "add_ons"
      ]
    } else if (isRemovableOrOrtho) {
      return [
        "product_material",
        "implant",
        "grade",
        "stage",
        "teeth_shade",
        "gum_shade",
        "impression",
        "advance_fields"
      ]
    }
    // Default order (fallback)
    return ["product_material", "retention", "stage"]
  }

  // Helper function to get the correct customer_id based on role
  // For office_admin, use selectedLab.id; for others, use the user's customerId
  const getCustomerIdForApi = (): number | undefined => {
    if (typeof window === "undefined") return undefined
    const role = localStorage.getItem("role")
    if (role === "office_admin") {
      // For office_admin, use the selected lab's ID as customer_id
      // Check state first, then localStorage as fallback
      const lab = selectedLab || (() => {
        const storedLab = localStorage.getItem("selectedLab")
        if (storedLab) {
          try {
            return JSON.parse(storedLab)
          } catch {
            return null
          }
        }
        return null
      })()
      if (lab) {
        return lab.id || lab.customer_id || undefined
      }
    }
    // For other roles, use the user's customerId
    const customerId = localStorage.getItem("customerId")
    return customerId ? Number(customerId) : undefined
  }

  // Helper to check if any tooth in the saved product has a retention type selected from popover
  const hasRetentionTypeSelected = (savedProduct: SavedProduct, arch: "maxillary" | "mandibular"): boolean => {
    const teeth = arch === "maxillary" ? savedProduct.maxillaryTeeth : savedProduct.mandibularTeeth
    const retentionTypes = arch === "maxillary" ? maxillaryRetentionTypes : mandibularRetentionTypes
    
    // If no teeth are selected, don't show the field
    if (!teeth || teeth.length === 0) {
      return false
    }
    
    // Check if any tooth in the product has a retention type selected from popover
    const hasSelection = teeth.some(toothNumber => {
      const types = retentionTypes[toothNumber] || []
      // Only return true if there's actually a retention type selected (Implant, Prep, or Pontic)
      return types.length > 0 && (types.includes('Implant') || types.includes('Prep') || types.includes('Pontic'))
    })
    
    return hasSelection
  }

  // Helper to check if retention value is valid (not empty, not placeholder)
  const hasValidRetentionValue = (retentionValue: string | undefined | null): boolean => {
    if (!retentionValue) return false
    const trimmed = String(retentionValue).trim()
    return trimmed !== '' && 
           trimmed !== 'Not specified' && 
           trimmed !== 'Select' && 
           trimmed !== 'Retention type'
  }

  // Helper function to check if a field is configured for the product
  const isFieldConfigured = (fieldName: string, productDetails: any, savedProduct: SavedProduct, archType?: "maxillary" | "mandibular"): boolean => {
    if (!productDetails) return false

    switch (fieldName) {
      case "retention":
        // Only show retention field if user has selected a retention type from popover
        if (!archType) return false
        return hasRetentionTypeSelected(savedProduct, archType)
      case "implant":
        const implantDetails = archType === "maxillary" ? "" : savedProduct.mandibularImplantDetails
        return !!(productDetails.implant || implantDetails)
      case "grade":
        return !!(productDetails.grades && Array.isArray(productDetails.grades) && productDetails.grades.length > 0)
      case "teeth_shade":
        return !!(productDetails.teeth_shades && Array.isArray(productDetails.teeth_shades) && productDetails.teeth_shades.length > 0)
      case "gum_shade":
        return !!(productDetails.gum_shades && Array.isArray(productDetails.gum_shades) && productDetails.gum_shades.length > 0)
      case "stump_shade":
        // Check if stump_shade exists as an advance field
        const advanceFields = productDetails.advance_fields || productAdvanceFields[savedProduct.id] || []
        const stumpShadeField = getAdvanceFieldByName("stump_shade", advanceFields)
        // If stump_shade exists as an advance field, use that; otherwise, check if it's configured as a regular field
        if (stumpShadeField) {
          return true
        }
        // Fallback: check if advance fields exist (for backward compatibility)
        return advanceFields.length > 0
      case "crown_third_shade":
      case "pontic_design":
      case "embrasures":
      case "occlusal_contact":
      case "interproximal_contact":
      case "gap":
      case "advance_fields":
        const allAdvanceFields = productDetails.advance_fields || productAdvanceFields[savedProduct.id] || []
        return allAdvanceFields.length > 0
      default:
        return true // Always show product_material, stage, impressions, add_ons
    }
  }

  // Helper function to get advance field by name
  const getAdvanceFieldByName = (fieldName: string, advanceFields: any[]): any | null => {
    if (!advanceFields || !Array.isArray(advanceFields)) return null
    
    const nameLower = fieldName.toLowerCase()
    return advanceFields.find(field => {
      const fieldNameLower = (field.name || "").toLowerCase()
      if (nameLower === "stump_shade") {
        return fieldNameLower.includes("stump") && fieldNameLower.includes("shade")
      } else if (nameLower === "crown_third_shade") {
        return fieldNameLower.includes("crown") && (fieldNameLower.includes("third") || fieldNameLower.includes("3rd")) && fieldNameLower.includes("shade")
      } else if (nameLower === "pontic_design") {
        return fieldNameLower.includes("pontic") && fieldNameLower.includes("design")
      } else if (nameLower === "embrasures") {
        return fieldNameLower.includes("embrasure")
      } else if (nameLower === "occlusal_contact") {
        return fieldNameLower.includes("occlusal") && fieldNameLower.includes("contact")
      } else if (nameLower === "interproximal_contact") {
        return (fieldNameLower.includes("interproximal") || fieldNameLower.includes("proximal")) && fieldNameLower.includes("contact")
      } else if (nameLower === "gap") {
        return fieldNameLower.includes("gap")
      }
      return false
    }) || null
  }

  // Helper function to get advance field value from saved product
  const getAdvanceFieldValue = (savedProduct: SavedProduct, fieldId: number, archType: "maxillary" | "mandibular"): any => {
    if (!savedProduct.advanceFields || !Array.isArray(savedProduct.advanceFields)) {
      return null
    }
    
    // Find the advance field data for this field ID
    const savedField = savedProduct.advanceFields.find((af: any) => af.advance_field_id === fieldId)
    if (!savedField) {
      return null
    }
    
    return savedField
  }

  // Helper function to render an advance field for saved products
  const renderSavedAdvanceField = (field: any, savedProduct: SavedProduct, archType: "maxillary" | "mandibular") => {
    const savedField = getAdvanceFieldValue(savedProduct, field.id, archType)
    const fieldValue = savedField?.advance_field_value || ""
    
    // For stump shade, check if we have a value in maxillaryStumpShade and sync it
    const isStumpShade = field.name?.toLowerCase().includes("stump") && field.name?.toLowerCase().includes("shade")
    const stumpShadeValue = archType === "maxillary" ? savedProduct.maxillaryStumpShade : ""
    const displayValue = isStumpShade && stumpShadeValue ? stumpShadeValue : fieldValue
    
    // Check if field is required and value is empty
    const isFieldRequired = field.is_required === "Yes" || field.is_required === true
    const isEmptyOrNotSpecified = !displayValue || 
      displayValue.trim() === "" || 
      displayValue.trim().toLowerCase() === "not specified" ||
      (field.field_type === "dropdown" && displayValue === `Select ${field.name}`)
    
    const showRedBorder = isFieldRequired && isEmptyOrNotSpecified
    
    // Render based on field_type
    if (field.field_type === "dropdown" && field.options && Array.isArray(field.options)) {
      const activeOptions = field.options.filter((opt: any) => opt.status === "Active" || opt.status === undefined)
      const selectedOption = activeOptions.find((opt: any) => 
        opt.id === displayValue || 
        opt.name === displayValue ||
        String(opt.id) === String(displayValue)
      )
      
      return (
        <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
          <div
            className="flex items-center justify-between"
            style={{
              padding: '12px 15px 5px 15px',
              gap: '5px',
              width: '100%',
              height: '37px',
              background: '#FFFFFF',
              border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
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
            }}>{selectedOption ? selectedOption.name : (displayValue || 'Select')}</span>
            {isStumpShade && displayValue && (
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
                }}>{displayValue}</span>
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
            {field.name || "Advanced Field"}
            {isFieldRequired && (
              <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
            )}
          </label>
        </div>
      )
    } else if (field.field_type === "text") {
      return (
        <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
          <div
            className="flex items-center"
            style={{
              padding: '12px 15px 5px 15px',
              gap: '5px',
              width: '100%',
              height: '37px',
              background: '#FFFFFF',
              border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
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
            }}>{displayValue || 'Input'}</span>
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
            {field.name || "Advanced Field"}
            {isFieldRequired && (
              <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
            )}
          </label>
        </div>
      )
    }
    
    // Default rendering for other field types
    return (
      <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
        <div
          className="flex items-center"
          style={{
            padding: '12px 15px 5px 15px',
            gap: '5px',
            width: '100%',
            height: '37px',
            background: '#FFFFFF',
            border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
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
          }}>{displayValue || 'Select'}</span>
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
          {field.name || "Advanced Field"}
          {isFieldRequired && (
            <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
          )}
        </label>
      </div>
    )
  }

  // Field configuration system - defines field metadata
  type FieldType = "select" | "modal" | "shade" | "text"
  
  interface FieldConfig {
    key: string
    label: string
    apiProperty: string // Property name in productDetails API response
    fieldType: FieldType
    sequence: number // Display order
    maxillaryStateKey?: string // State variable name for maxillary
    mandibularStateKey?: string // State variable name for mandibular
    maxillaryIdKey?: string // ID state variable name for maxillary
    mandibularIdKey?: string // ID state variable name for mandibular
    dependsOn?: string // Field that must be selected first (e.g., retention_options depends on retention)
    rowGroup?: number // Fields in same rowGroup appear in same row
  }

  const fieldConfigs: FieldConfig[] = [
    {
      key: "material",
      label: "Product - Material",
      apiProperty: "materials",
      fieldType: "select",
      sequence: 1,
      maxillaryStateKey: "maxillaryMaterial",
      mandibularStateKey: "mandibularMaterial",
      maxillaryIdKey: "maxillaryMaterialId",
      mandibularIdKey: "mandibularMaterialId",
      rowGroup: 1
    },
    {
      key: "retention",
      label: "Retention type",
      apiProperty: "retentions",
      fieldType: "select",
      sequence: 2,
      maxillaryStateKey: "maxillaryRetention",
      mandibularStateKey: "mandibularRetention",
      maxillaryIdKey: "maxillaryRetentionId",
      mandibularIdKey: "mandibularRetentionId",
      rowGroup: 1
    },
    {
      key: "retention_option",
      label: "Retention Option",
      apiProperty: "retention_options",
      fieldType: "select",
      sequence: 3,
      maxillaryIdKey: "maxillaryRetentionOptionId",
      mandibularIdKey: "mandibularRetentionOptionId",
      dependsOn: "retention",
      rowGroup: 1
    },
    {
      key: "stump_shade",
      label: "Stump Shade",
      apiProperty: "gum_shades",
      fieldType: "shade",
      sequence: 4,
      maxillaryStateKey: "maxillaryStumpShade",
      mandibularStateKey: "mandibularStumpShade",
      maxillaryIdKey: "maxillaryGumShadeId",
      mandibularIdKey: "mandibularGumShadeId",
      rowGroup: 2
    },
    {
      key: "tooth_shade",
      label: "Tooth Shade",
      apiProperty: "teeth_shades",
      fieldType: "shade",
      sequence: 5,
      maxillaryStateKey: "maxillaryToothShade",
      mandibularStateKey: "mandibularToothShade",
      maxillaryIdKey: "maxillaryShadeId",
      mandibularIdKey: "mandibularShadeId",
      rowGroup: 2
    },
    {
      key: "stage",
      label: "Stage",
      apiProperty: "stages",
      fieldType: "select",
      sequence: 6,
      maxillaryStateKey: "maxillaryStage",
      mandibularStateKey: "mandibularStage",
      maxillaryIdKey: "maxillaryStageId",
      mandibularIdKey: "mandibularStageId",
      rowGroup: 2
    },
    {
      key: "impression",
      label: "Impression",
      apiProperty: "impressions",
      fieldType: "modal",
      sequence: 7,
      rowGroup: 2
    }
  ]

  // Helper to check if field should be displayed based on productDetails
  const shouldDisplayField = (config: FieldConfig, productDetails: any, savedProduct: SavedProduct, arch: "maxillary" | "mandibular"): boolean => {
    if (!productDetails) return false

    // Check if API property exists and has items
    const apiData = productDetails[config.apiProperty]
    if (!apiData || !Array.isArray(apiData) || apiData.length === 0) {
      return false
    }

    // For retention field, only show if user has selected a retention type from popover
    if (config.key === "retention") {
      return hasRetentionTypeSelected(savedProduct, arch)
    }

    // Check dependencies
    if (config.dependsOn) {
      const dependencyConfig = fieldConfigs.find(f => f.key === config.dependsOn)
      if (dependencyConfig) {
        const dependencyValue = arch === "maxillary" 
          ? savedProduct[dependencyConfig.maxillaryStateKey as keyof SavedProduct] as string
          : savedProduct[dependencyConfig.mandibularStateKey as keyof SavedProduct] as string
        if (!dependencyValue || dependencyValue.trim() === "") {
          return false
        }
        // For retention_options, also check if the selected retention has options
        if (config.key === "retention_option" && productDetails.retention_options) {
          const selectedRetentionId = arch === "maxillary" 
            ? savedProduct.maxillaryRetentionId 
            : savedProduct.mandibularRetentionId
          const hasOptions = productDetails.retention_options.some((opt: any) => 
            opt.retention_id === selectedRetentionId
          )
          return hasOptions
        }
      }
    }

    return true
  }

  // Helper function to check if a field is completed
  const isFieldCompleted = (fieldName: string, savedProduct: SavedProduct, archType: "maxillary" | "mandibular"): boolean => {
    const material = archType === "maxillary" ? savedProduct.maxillaryMaterial : savedProduct.mandibularMaterial
    const retention = archType === "maxillary" ? savedProduct.maxillaryRetention : savedProduct.mandibularRetention
    const implantDetails = archType === "maxillary" ? "" : savedProduct.mandibularImplantDetails
    const stage = archType === "maxillary" ? savedProduct.maxillaryStage : savedProduct.mandibularStage
    const toothShade = archType === "maxillary" ? savedProduct.maxillaryToothShade : savedProduct.mandibularToothShade
    const gumShade = archType === "maxillary" ? savedProduct.maxillaryGumShadeBrand : savedProduct.mandibularGumShadeBrand
    const impression = archType === "maxillary" ? savedProduct.maxillaryImpression : savedProduct.mandibularImpression
    const ponticDesign = archType === "maxillary" ? savedProduct.maxillaryPonticDesign : savedProduct.mandibularPonticDesign
    const embrasure = archType === "maxillary" ? savedProduct.maxillaryEmbrasure : savedProduct.mandibularEmbrasure
    const occlusalContact = archType === "maxillary" ? savedProduct.maxillaryOcclusalContact : savedProduct.mandibularOcclusalContact
    const proximalContact = archType === "maxillary" ? savedProduct.maxillaryProximalContact : savedProduct.mandibularProximalContact
    const gap = archType === "maxillary" ? savedProduct.maxillaryGap : savedProduct.mandibularGap
    const stumpShade = archType === "maxillary" ? savedProduct.maxillaryStumpShade : ""

    switch (fieldName) {
      case "product_material":
        return !!(material && material.trim() !== "")
      case "retention":
        return !!(retention && retention.trim() !== "")
      case "implant":
        return !!(implantDetails && implantDetails.trim() !== "")
      case "grade":
        // Grade is typically stored in material field or separate grade field
        return !!(material && material.trim() !== "")
      case "stage":
        return !!(stage && stage.trim() !== "")
      case "teeth_shade":
        return !!(toothShade && toothShade.trim() !== "")
      case "gum_shade":
        return !!(gumShade)
      case "impression":
      case "impressions":
        return !!(impression && impression.trim() !== "")
      case "stump_shade":
        return !!(stumpShade && stumpShade.trim() !== "")
      case "crown_third_shade":
        // Check if advance field value is set
        return false // Will be checked via advance fields
      case "pontic_design":
        return !!(ponticDesign && ponticDesign.trim() !== "")
      case "embrasures":
        return !!(embrasure && embrasure.trim() !== "")
      case "occlusal_contact":
        return !!(occlusalContact && occlusalContact.trim() !== "")
      case "interproximal_contact":
        return !!(proximalContact && proximalContact.trim() !== "")
      case "gap":
        return !!(gap && gap.trim() !== "")
      case "add_ons":
        const addOns = archType === "maxillary" ? savedProduct.maxillaryAddOns : savedProduct.mandibularAddOns
        return !!(addOns && Array.isArray(addOns) && addOns.length > 0)
      default:
        return false
    }
  }

  // Core visibility check without special cases (used internally)
  const checkFieldVisibilityCore = (
    fieldName: string,
    savedProduct: SavedProduct,
    productDetails: any,
    archType: "maxillary" | "mandibular"
  ): boolean => {
    const fieldOrder = getFieldOrder(savedProduct.category)
    const currentFieldIndex = fieldOrder.indexOf(fieldName)
    
    // If field is not in the order, don't show it
    if (currentFieldIndex === -1) return false
    
    // First field is always visible
    if (currentFieldIndex === 0) return true
    
    // Check if field is configured
    if (!isFieldConfigured(fieldName, productDetails, savedProduct, archType)) {
      return false
    }
    
    // Check if all previous fields are completed
    for (let i = 0; i < currentFieldIndex; i++) {
      const previousField = fieldOrder[i]
      if (!isFieldCompleted(previousField, savedProduct, archType)) {
        return false
      }
    }
    
    return true
  }

  // Helper function to check if a field should be visible (progressive disclosure)
  const isFieldVisible = (
    fieldName: string, 
    productId: string, 
    savedProduct: SavedProduct, 
    productDetails: any,
    archType: "maxillary" | "mandibular"
  ): boolean => {
    // Special case: impression field should ONLY show if stage field is visible in the UI
    // Check this FIRST before other visibility checks
    if (fieldName === "impression" || fieldName === "impressions") {
      // Directly check if stage field is visible using the core visibility logic
      // This ensures impression only shows when stage is actually rendered in the UI
      if (!checkFieldVisibilityCore("stage", savedProduct, productDetails, archType)) {
        return false
      }
      
      // Also verify using isAccordionFieldVisible for consistency (tooth shade must have value)
      if (!isAccordionFieldVisible("stage", savedProduct, archType)) {
        return false // Stage field is not visible (tooth shade not set)
      }
      
      // Explicitly check if stages exist in productDetails (isFieldConfigured returns true by default for stage)
      if (!productDetails || !productDetails.stages || !Array.isArray(productDetails.stages) || productDetails.stages.length === 0) {
        return false
      }
    }
    
    // Use core visibility check for all fields
    return checkFieldVisibilityCore(fieldName, savedProduct, productDetails, archType)
  }

  // Helper function to check if all required fields are filled (for showing advance fields)
  const areAllRequiredFieldsFilled = (archType: "maxillary" | "mandibular"): boolean => {
    const material = archType === "maxillary" ? maxillaryMaterial : mandibularMaterial
    const retention = archType === "maxillary" ? maxillaryRetention : mandibularRetention
    const stumpShade = archType === "maxillary" ? maxillaryStumpShade : ""
    const toothShade = archType === "maxillary" ? maxillaryToothShade : mandibularToothShade
    const stage = archType === "maxillary" ? maxillaryStage : mandibularStage

    // Helper to check if a value is actually set
    const hasValue = (value: string | undefined | null): boolean => {
      if (!value) return false
      const trimmed = String(value).trim()
      return trimmed !== "" && trimmed.toLowerCase() !== "not specified" && trimmed.toLowerCase() !== "finish"
    }

    // Check all required fields
    const hasMaterial = hasValue(material)
    const hasRetention = hasValue(retention)
    const hasStumpShade = archType === "maxillary" ? hasValue(stumpShade) : true // Mandibular doesn't have stump shade
    const hasToothShade = hasValue(toothShade)
    const hasStage = hasValue(stage)

    return hasMaterial && hasRetention && hasStumpShade && hasToothShade && hasStage
  }

  // Helper function to check if product accordion is complete
  const isAccordionComplete = (): boolean => {
    // If there are no saved products, accordion is not complete
    if (savedProducts.length === 0) {
      return false
    }

    // Helper to check if a value is actually set
    const hasValue = (value: string | undefined | null): boolean => {
      if (!value) return false
      const trimmed = String(value).trim()
      return trimmed !== "" && trimmed.toLowerCase() !== "not specified" && trimmed.toLowerCase() !== "finish"
    }

    // Check if all saved products have required fields filled
    return savedProducts.every((product) => {
      const hasMaterial = product.addedFrom === "maxillary" 
        ? hasValue(product.maxillaryMaterial)
        : hasValue(product.mandibularMaterial)
      const hasRetention = product.addedFrom === "maxillary"
        ? hasValue(product.maxillaryRetention)
        : hasValue(product.mandibularRetention)
      const hasToothShade = product.addedFrom === "maxillary"
        ? hasValue(product.maxillaryToothShade)
        : hasValue(product.mandibularToothShade)
      const hasStage = product.addedFrom === "maxillary"
        ? hasValue(product.maxillaryStage)
        : hasValue(product.mandibularStage)

      return hasMaterial && hasRetention && hasToothShade && hasStage
    })
  }

  // Helper function to get shade display text with brand and code
  const getShadeDisplayText = (
    shadeName: string | undefined,
    shadeId: number | undefined,
    shadeBrandId: number | undefined,
    shadeType: "stump_shade" | "tooth_shade",
    productDetails: any
  ): string => {
    if (!shadeName || shadeName.trim() === "" || shadeName === "Select" || shadeName === "Select stump shade" || shadeName === "Select tooth shade") {
      return shadeType === "stump_shade" ? "Select stump shade" : "Select tooth shade"
    }

    if (!productDetails) {
      return shadeName
    }

    // Get the appropriate shade array
    const shades = shadeType === "stump_shade" 
      ? productDetails.gum_shades 
      : productDetails.teeth_shades

    if (!shades || !Array.isArray(shades)) {
      return shadeName
    }

    // Find the shade by ID or name
    const shade = shades.find((s: any) => {
      if (shadeId && (s.id === shadeId || String(s.id) === String(shadeId))) {
        return true
      }
      if (s.name === shadeName || s.system_name === shadeName) {
        return true
      }
      return false
    })

    if (!shade) {
      return shadeName
    }

    // Get brand name
    const brandName = shade.brand?.name || shade.brand_name || ""
    // Get shade code
    const shadeCode = shade.code || shade.shade_code || shade.name || ""

    // Format: "Brand Name - Shade Code" or just "Shade Code" if no brand
    if (brandName && shadeCode) {
      return `${brandName} - ${shadeCode}`
    } else if (shadeCode) {
      return shadeCode
    } else {
      return shadeName
    }
  }

  // Helper function to check if accordion field should be visible (progressive disclosure for accordion)
  // Fields are hidden initially and shown automatically when the previous field has a value
  const isAccordionFieldVisible = (
    fieldName: "stump_shade" | "tooth_shade" | "stage" | "notes" | "implant_details",
    savedProduct: SavedProduct,
    archType: "maxillary" | "mandibular"
  ): boolean => {
    const retention = archType === "maxillary" ? savedProduct.maxillaryRetention : savedProduct.mandibularRetention
    const stumpShade = archType === "maxillary" ? savedProduct.maxillaryStumpShade : ""
    const toothShade = archType === "maxillary" ? savedProduct.maxillaryToothShade : savedProduct.mandibularToothShade
    const stage = archType === "maxillary" ? savedProduct.maxillaryStage : savedProduct.mandibularStage

    // Helper to check if a value is actually set (not empty, not "Not specified", not undefined, not null)
    const hasValue = (value: string | undefined | null): boolean => {
      if (!value) return false
      const trimmed = String(value).trim()
      return trimmed !== "" && trimmed.toLowerCase() !== "not specified" && trimmed.toLowerCase() !== "finish"
    }

    switch (fieldName) {
      case "stump_shade":
        // Show stump shade ONLY after retention has a real value (only for maxillary)
        // Initially hidden, shows automatically when retention is filled
        return archType === "maxillary" && hasValue(retention)
      case "tooth_shade":
        // For maxillary: show tooth shade ONLY after stump shade has a real value
        // For mandibular: show tooth shade ONLY after retention has a real value
        // Initially hidden, shows automatically when previous field is filled
        if (archType === "maxillary") {
          return hasValue(stumpShade)
        } else {
          return hasValue(retention)
        }
      case "stage":
        // Show stage ONLY after tooth shade has a real value
        // Initially hidden, shows automatically when tooth shade is filled
        return hasValue(toothShade)
      case "notes":
        // Show notes ONLY after stage has a real value (for maxillary)
        // Initially hidden, shows automatically when stage is filled
        return archType === "maxillary" && hasValue(stage)
      case "implant_details":
        // Show implant details ONLY after stage has a real value (for mandibular)
        // Initially hidden, shows automatically when stage is filled
        return archType === "mandibular" && hasValue(stage)
      default:
        return false
    }
  }

  // Scroll refs and state for horizontal scrolling
  const subcategoriesScrollRef = useRef<HTMLDivElement>(null)
  const productsScrollRef = useRef<HTMLDivElement>(null)
  const toothSelectionRef = useRef<HTMLDivElement>(null)
  const [showSubcategoriesLeftArrow, setShowSubcategoriesLeftArrow] = useState(false)
  const [showSubcategoriesRightArrow, setShowSubcategoriesRightArrow] = useState(false)
  const [showProductsLeftArrow, setShowProductsLeftArrow] = useState(false)
  const [showProductsRightArrow, setShowProductsRightArrow] = useState(false)

  // Case summary notes expansion state
  const [isCaseSummaryExpanded, setIsCaseSummaryExpanded] = useState<boolean>(false)
  const [showCaseSummaryNotes, setShowCaseSummaryNotes] = useState<boolean>(false)

  // Track previous notes value to prevent unnecessary parsing
  const previousNotesRef = useRef<string>("")
  const isParsingRef = useRef<boolean>(false)
  
  // Refs for scrolling to sections
  const maxillarySectionRef = useRef<HTMLDivElement>(null)
  const mandibularSectionRef = useRef<HTMLDivElement>(null)
  
  // State for info popover - show when product is selected but no arch chosen
  const [showInfoPopover, setShowInfoPopover] = useState<boolean>(false)
  
  // Auto-show and auto-close info popover when product is selected but no arch is chosen
  useEffect(() => {
    if (showProductDetails && selectedProduct && !showMaxillaryChart && !showMandibularChart && !isLoadingProductDetails) {
      // Show popover after a short delay
      const showTimer = setTimeout(() => {
        setShowInfoPopover(true)
      }, 500)
      
      // Auto-close popover after 5 seconds
      const closeTimer = setTimeout(() => {
        setShowInfoPopover(false)
      }, 5500) // 500ms delay + 5 seconds
      
      return () => {
        clearTimeout(showTimer)
        clearTimeout(closeTimer)
      }
    } else {
      setShowInfoPopover(false)
    }
  }, [showProductDetails, selectedProduct, showMaxillaryChart, showMandibularChart, isLoadingProductDetails])

  // Handler to toggle accordion - only opens/closes on click
  const handleAccordionChange = (value: string) => {
    // If clicking the same accordion that's open, close it
    // If clicking a different accordion, open it (which automatically closes the previous one)
    if (value && openAccordion === value) {
      // Same accordion clicked - close it
      setOpenAccordion(null)
      // Close stage dropdowns for this accordion
      setOpenStageDropdown((prev) => {
        const newState = { ...prev }
        delete newState[value]
        return newState
      })
    } else if (value) {
      // Different accordion clicked or opening for first time - open it
      setOpenAccordion(value)
    } else {
      // Empty string means closing
      setOpenAccordion(null)
      // Close all stage dropdowns
      setOpenStageDropdown({})
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

  // Helper function to calculate total add-ons count across all saved products
  const getTotalAddOnsCount = useMemo(() => {
    return savedProducts.reduce((total, product) => {
      const maxillaryCount = product.maxillaryAddOnsStructured?.reduce((sum, addon) => sum + (addon.qty || addon.quantity || 1), 0) || 0
      const mandibularCount = product.mandibularAddOnsStructured?.reduce((sum, addon) => sum + (addon.qty || addon.quantity || 1), 0) || 0
      return total + maxillaryCount + mandibularCount
    }, 0)
  }, [savedProducts])

  // Helper function to calculate add-ons count for a specific product
  const getProductAddOnsCount = (product: SavedProduct) => {
    const maxillaryCount = product.maxillaryAddOnsStructured?.reduce((sum, addon) => sum + (addon.qty || addon.quantity || 1), 0) || 0
    const mandibularCount = product.mandibularAddOnsStructured?.reduce((sum, addon) => sum + (addon.qty || addon.quantity || 1), 0) || 0
    return maxillaryCount + mandibularCount
  }

  // Helper function to get attached files count from localStorage
  const getAttachedFilesCount = () => {
    if (typeof window === "undefined") return 0
    try {
      const cacheStr = localStorage.getItem("caseDesignCache")
      if (cacheStr) {
        const cache = JSON.parse(cacheStr)
        if (Array.isArray(cache.attachments)) {
          return cache.attachments.length
        }
      }
    } catch (error) {
      console.error("Error reading attachments from localStorage:", error)
    }
    return 0
  }

  // Auto-open stage dropdown when accordion opens and stage field is visible with "Not specified" value
  useEffect(() => {
    if (!openAccordion) {
      // Close all dropdowns when accordion closes
      setOpenStageDropdown({})
      return
    }

    // Check if this is a saved product accordion
    const savedProduct = savedProducts.find(p => p.id === openAccordion)
    if (!savedProduct) return

    const productDetails = savedProduct.productDetails
    if (!productDetails?.stages || !Array.isArray(productDetails.stages) || productDetails.stages.length === 0) return

    // Helper to check if value is "Not specified" or empty
    const isNotSpecified = (value: string | undefined | null): boolean => {
      if (!value) return true
      const trimmed = String(value).trim().toLowerCase()
      return trimmed === "" || trimmed === "not specified" || trimmed === "finish"
    }

    // Function to check and open dropdowns
    const checkAndOpenDropdowns = () => {
      // Check if stage field should be visible for maxillary
      const isMaxillaryVisible = isAccordionFieldVisible("stage", savedProduct, "maxillary")
      // Check if stage field should be visible for mandibular
      const isMandibularVisible = isAccordionFieldVisible("stage", savedProduct, "mandibular")

      // Check maxillary stage value
      const maxillaryStageValue = savedProduct.maxillaryStage
      const shouldOpenMaxillary = isMaxillaryVisible && isNotSpecified(maxillaryStageValue)

      // Check mandibular stage value
      const mandibularStageValue = savedProduct.mandibularStage
      const shouldOpenMandibular = isMandibularVisible && isNotSpecified(mandibularStageValue)

      if (shouldOpenMaxillary || shouldOpenMandibular) {
        setOpenStageDropdown((prev) => ({
          ...prev,
          [openAccordion]: {
            ...prev[openAccordion],
            ...(shouldOpenMaxillary && { maxillary: true }),
            ...(shouldOpenMandibular && { mandibular: true })
          }
        }))
      }
    }

    // Use multiple attempts with increasing delays to ensure the accordion content is fully rendered
    const timer1 = setTimeout(checkAndOpenDropdowns, 200)
    const timer2 = setTimeout(checkAndOpenDropdowns, 400)
    const timer3 = setTimeout(checkAndOpenDropdowns, 600)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [openAccordion, savedProducts])

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
    // For office_admin, use selectedLab.id; for others, use customerId
    const customerIdNum = getCustomerIdForApi()
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

  // Debounce unified search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Filtered subcategories based on search query
  // Only show subcategories that belong to the currently selected category
  const filteredSubcategories = useMemo(() => {
    // First, ensure we only show subcategories for the selected category
    let categoryFilteredSubcategories = subcategoriesByCategory
    if (selectedCategoryId) {
      categoryFilteredSubcategories = subcategoriesByCategory.filter(
        (subcategory: ProductCategory) => subcategory.parent_id === selectedCategoryId
      )
    }

    // Then apply search filter if there's a search query
    if (!debouncedSearchQuery.trim()) {
      return categoryFilteredSubcategories
    }
    const query = debouncedSearchQuery.toLowerCase().trim()
    return categoryFilteredSubcategories.filter((subcategory: ProductCategory) =>
      subcategory.sub_name?.toLowerCase().includes(query)
    )
  }, [subcategoriesByCategory, debouncedSearchQuery, selectedCategoryId])

  // Filtered products based on search query
  const filteredProducts = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return products
    }
    const query = debouncedSearchQuery.toLowerCase().trim()
    return products.filter((product: Product) =>
      product.name?.toLowerCase().includes(query)
    )
  }, [products, debouncedSearchQuery])

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

  // Product search with React Query - always search products when there's a search query
  const labId = selectedLab?.id || selectedLab?.customer_id
  const searchTerm = debouncedSearchQuery.trim()
  const shouldSearch = !showProductDetails && !!searchTerm && !!labId

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

  // Scroll to bottom when tooth selection is shown
  useEffect(() => {
    if (showProductDetails && selectedProduct) {
      // Use setTimeout to ensure the DOM has rendered
      setTimeout(() => {
        // Scroll to the bottom of the page to show the tooth selection
        window.scrollTo({ 
          top: document.documentElement.scrollHeight, 
          behavior: 'smooth' 
        })
      }, 100)
    }
  }, [showProductDetails, selectedProduct])

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
  // Check if selected category is Orthodontics or Removable Restoration (extraction should only show for these)
  const isOrthodonticsOrRemovable = selectedCategory?.toLowerCase().includes("orthodontic") || 
                                     selectedCategory?.toLowerCase().includes("ortho") ||
                                     selectedCategory?.toLowerCase().includes("removable") || false

  // Helper function to check if product has implant retention option
  const hasImplantRetentionOption = (productDetails: any): boolean => {
    if (!productDetails?.retention_options) return false
    return productDetails.retention_options.some((opt: any) => 
      opt.name?.toLowerCase() === "implant" || 
      opt.lab_retention_option?.name?.toLowerCase() === "implant"
    )
  }

  // Check if conditions are met for showing implant popover
  const shouldShowImplantPopover = isFixedRestoration && 
    selectedProduct && 
    productDetails && 
    hasImplantRetentionOption(productDetails)

  // State to track which tooth was clicked to show the popover
  const [implantPopoverState, setImplantPopoverState] = useState<{
    arch: 'maxillary' | 'mandibular' | null
    toothNumber: number | null
  }>({ arch: null, toothNumber: null })

  const handleCategorySelect = (category: ProductCategoryApi) => {
    setSelectedCategory(category.name)
    setSelectedCategoryId(category.id)
    setSelectedSubcategory(null)
    setSelectedSubcategoryId(null)
    setShowSubcategories(true)
    localStorage.setItem("selectedCategory", category.name)

    // Fetch subcategories for the selected category
    // For office_admin, use selectedLab.id; for others, use customerId
    const customerIdNum = getCustomerIdForApi()
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
    // Don't show product details/charts immediately - wait for user to choose upper/lower
    setShowProductDetails(true) // Keep this true for other UI elements, but charts will be controlled by showMaxillaryChart/showMandibularChart
    setShowProducts(false)
    setIsLoadingProductDetails(true)
    setProductDetails(null)
    // Keep search query for when user navigates back

    // Reset arch selection state when selecting a new product
    setSelectedArchForProduct(null)
    setShowMaxillaryChart(false)
    setShowMandibularChart(false)
    setSelectedProductForMaxillary(null)
    setSelectedProductForMandibular(null)

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

        // Check if product has extraction data and show MissingTeethCards immediately
        const hasExtractionData = (details.extractions && Array.isArray(details.extractions) && details.extractions.length > 0) ||
                                  (details.data?.extractions && Array.isArray(details.data.extractions) && details.data.extractions.length > 0)
        
        if (hasExtractionData && isFixedRestoration) {
          // Don't set missingTeethCardClicked to false - let extraction cards show immediately
          // The cards will be visible as long as selectedProduct exists and missingTeethCardClicked is false
        }

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

  // Handler for adding upper product
  const handleAddUpperProduct = () => {
    if (!selectedProduct) return
    setSelectedArchForProduct("maxillary")
    setShowMaxillaryChart(true)
    setSelectedProductForMaxillary(selectedProduct)
    // Reset maxillary teeth when starting fresh
    setMaxillaryTeeth([])
    setMaxillaryRetentionTypes({})
    
    // Scroll to maxillary section after state update
    setTimeout(() => {
      maxillarySectionRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      })
    }, 100)
  }

  // Handler for adding lower product
  const handleAddLowerProduct = () => {
    if (!selectedProduct) return
    setSelectedArchForProduct("mandibular")
    setShowMandibularChart(true)
    setSelectedProductForMandibular(selectedProduct)
    // Reset mandibular teeth when starting fresh
    setMandibularTeeth([])
    setMandibularRetentionTypes({})
    
    // Scroll to mandibular section after state update
    setTimeout(() => {
      mandibularSectionRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      })
    }, 100)
  }

  // Handler for deleting upper product
  const handleDeleteUpperProduct = () => {
    setShowMaxillaryChart(false)
    setSelectedProductForMaxillary(null)
    setMaxillaryTeeth([])
    setMaxillaryRetentionTypes({})
    setMaxillaryMaterial("")
    setMaxillaryStumpShade("")
    setMaxillaryRetention("")
    setMaxillaryNotes("")
    setMaxillaryMaterialId(undefined)
    setMaxillaryRetentionId(undefined)
    setMaxillaryRetentionOptionId(undefined)
    setMaxillaryGumShadeId(undefined)
    setMaxillaryShadeId(undefined)
    setMaxillaryStageId(undefined)
    setMaxillaryToothShade("")
    setMaxillaryStage("")
    // If no arch is selected anymore, reset selectedArchForProduct
    if (!showMandibularChart) {
      setSelectedArchForProduct(null)
    }
  }

  // Handler for deleting lower product
  const handleDeleteLowerProduct = () => {
    setShowMandibularChart(false)
    setSelectedProductForMandibular(null)
    setMandibularTeeth([])
    setMandibularRetentionTypes({})
    setMandibularMaterial("")
    setMandibularRetention("")
    setMandibularImplantDetails("")
    setMandibularMaterialId(undefined)
    setMandibularRetentionId(undefined)
    setMandibularRetentionOptionId(undefined)
    setMandibularGumShadeId(undefined)
    setMandibularShadeId(undefined)
    setMandibularStageId(undefined)
    setMandibularToothShade("")
    setMandibularStage("")
    // If no arch is selected anymore, reset selectedArchForProduct
    if (!showMaxillaryChart) {
      setSelectedArchForProduct(null)
    }
  }

  const handleBackToSubcategories = () => {
    setShowProducts(false)
    setShowSubcategories(true)
    setSelectedProduct(null)
    setProducts([])
    // Keep search query for filtering subcategories
  }

  const handleBackToProducts = () => {
    setShowProductDetails(false)
    setShowProducts(true)
    setSelectedProduct(null)
    setMissingTeethCardClicked(false)
    // Reset arch selection state
    setSelectedArchForProduct(null)
    setShowMaxillaryChart(false)
    setShowMandibularChart(false)
    setSelectedProductForMaxillary(null)
    setSelectedProductForMandibular(null)
  }

  const handleBackToCategories = () => {
    setShowSubcategories(false)
    setShowProducts(false)
    setShowProductDetails(false)
    setSelectedCategory(null)
    setSelectedCategoryId(null)
    setSearchQuery("") // Clear search when going back to categories
    setSelectedSubcategory(null)
    setSelectedSubcategoryId(null)
    setSelectedProduct(null)
    setProducts([])
    setMissingTeethCardClicked(false)
  }

  // Function to format teeth numbers for display
  // Formats consecutive teeth as ranges (e.g., #4–5) and non-consecutive as individual numbers
  // Helper function to format advance field values for notes
  const formatAdvanceFields = (product: SavedProduct, arch: "maxillary" | "mandibular"): string => {
    if (!product.advanceFields || product.advanceFields.length === 0) {
      return ""
    }

    // Get advance field definitions from productDetails
    const fieldDefinitions = product.productDetails?.advance_fields || []
    if (!fieldDefinitions || fieldDefinitions.length === 0) {
      return ""
    }

    const fieldTexts: string[] = []

    product.advanceFields.forEach((savedField) => {
      // Find the field definition
      const fieldDef = fieldDefinitions.find((f: any) => f.id === savedField.advance_field_id)
      if (!fieldDef) return

      const fieldName = fieldDef.name || fieldDef.description || "Advanced Field"
      let fieldValue = ""

      // Handle different field types
      if (savedField.advance_field_value) {
        if (fieldDef.field_type === "dropdown" || fieldDef.field_type === "radio") {
          // For dropdown/radio, find the option name
          const option = fieldDef.options?.find((opt: any) => 
            opt.id === savedField.advance_field_value || 
            opt.name === savedField.advance_field_value ||
            String(opt.id) === String(savedField.advance_field_value)
          )
          fieldValue = option?.name || savedField.advance_field_value
        } else if (fieldDef.field_type === "checkbox") {
          // For checkbox, might have multiple values
          if (Array.isArray(savedField.advance_field_value)) {
            const optionNames = savedField.advance_field_value.map((val: any) => {
              const option = fieldDef.options?.find((opt: any) => 
                opt.id === val || opt.name === val || String(opt.id) === String(val)
              )
              return option?.name || val
            })
            fieldValue = optionNames.join(", ")
          } else {
            fieldValue = savedField.advance_field_value
          }
        } else if (fieldDef.field_type === "file") {
          // For file uploads, show file name if available
          fieldValue = savedField.file?.name || savedField.advance_field_value || "File uploaded"
        } else {
          // For text, textarea, number, etc.
          fieldValue = savedField.advance_field_value
        }
      }

      if (fieldValue) {
        // Include teeth number if specified
        const teethInfo = savedField.teeth_number ? ` (tooth #${savedField.teeth_number})` : ""
        fieldTexts.push(`${fieldName}: ${fieldValue}${teethInfo}`)
      }
    })

    return fieldTexts.length > 0 ? fieldTexts.join("; ") : ""
  }

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

        const gapMatch = fullText.match(/gap:\s*([^,\.]+)/i)
        const gap = gapMatch ? gapMatch[1].trim() : ""

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
            // For office_admin, use selectedLab.id; for others, use customerId
            const customerIdNum = getCustomerIdForApi()
            await fetchSubcategoriesByCategory(matchedCategory.id, "en", customerIdNum)
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
            maxillaryGap: currentSection === "maxillary" ? gap : undefined,
            maxillaryImpression: currentSection === "maxillary" ? impression : undefined,
            maxillaryAddOns: currentSection === "maxillary" ? addOns : undefined,
            mandibularPonticDesign: currentSection === "mandibular" ? ponticDesign : undefined,
            mandibularEmbrasure: currentSection === "mandibular" ? embrasure : undefined,
            mandibularOcclusalContact: currentSection === "mandibular" ? occlusalContact : undefined,
            mandibularProximalContact: currentSection === "mandibular" ? proximalContact : undefined,
            mandibularGap: currentSection === "mandibular" ? gap : undefined,
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
          const gap = product.maxillaryGap || ""
          
          // Format impressions with quantities
          let impressionText = "STL file"
          if (product.maxillaryImpressions && product.maxillaryImpressions.length > 0) {
            impressionText = product.maxillaryImpressions
              .map(imp => `${imp.quantity}x ${imp.name || "Impression"}`)
              .join(", ")
          } else if (product.maxillaryImpression) {
            impressionText = product.maxillaryImpression
          }
          
          const addOns = product.maxillaryAddOns && product.maxillaryAddOns.length > 0
            ? product.maxillaryAddOns.join(", ")
            : "selected"

          // Get advance fields for maxillary
          const advanceFieldsText = formatAdvanceFields(product, "maxillary")
          const advanceFieldsSection = advanceFieldsText ? ` Advanced fields: ${advanceFieldsText}.` : ""

          const gapText = gap ? `, gap: ${gap}` : ""
          notes += ` Design specifications: ${ponticDesign}, ${embrasure}, ${contourPonticType}, ${proximalContact}, ${occlusalContact}${gapText}. Impression: ${impressionText}. Add-ons ${addOns}.${advanceFieldsSection}`
        } else if (isRemovable) {
          const teeth = formatTeethNumbers(product.maxillaryTeeth)
          const productName = product.product.name || "removable restoration"
          const grade = product.maxillaryMaterial || "Premium"
          const stage = product.maxillaryStage || "finish"
          const teethShade = product.maxillaryToothShade || "A2"
          const gumShade = product.maxillaryStumpShade || "A2"
          
          // Format impressions with quantities
          let impressionText = "STL file"
          if (product.maxillaryImpressions && product.maxillaryImpressions.length > 0) {
            impressionText = product.maxillaryImpressions
              .map(imp => `${imp.quantity}x ${imp.name || "Impression"}`)
              .join(", ")
          } else if (product.maxillaryImpression) {
            impressionText = product.maxillaryImpression
          }
          
          const addOns = product.maxillaryAddOns && product.maxillaryAddOns.length > 0
            ? product.maxillaryAddOns.join(", ")
            : "selected"

          // Get advance fields for maxillary
          const advanceFieldsText = formatAdvanceFields(product, "maxillary")
          const advanceFieldsSection = advanceFieldsText ? ` Advanced fields: ${advanceFieldsText}.` : ""

          notes += `Fabricate a ${grade} ${productName} replacing teeth ${teeth}, in the ${stage} stage. Use ${teethShade} denture teeth with ${gumShade} gingiva. Impression: ${impressionText}. Add-ons ${addOns}.${advanceFieldsSection}`
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
          const gap = product.mandibularGap || ""
          
          // Format impressions with quantities
          let impressionText = "STL file"
          if (product.mandibularImpressions && product.mandibularImpressions.length > 0) {
            impressionText = product.mandibularImpressions
              .map(imp => `${imp.quantity}x ${imp.name || "Impression"}`)
              .join(", ")
          } else if (product.mandibularImpression) {
            impressionText = product.mandibularImpression
          }
          
          const addOns = product.mandibularAddOns && product.mandibularAddOns.length > 0
            ? product.mandibularAddOns.join(", ")
            : "selected"

          // Get advance fields for mandibular
          const advanceFieldsText = formatAdvanceFields(product, "mandibular")
          const advanceFieldsSection = advanceFieldsText ? ` Advanced fields: ${advanceFieldsText}.` : ""

          const gapText = gap ? `, gap: ${gap}` : ""
          notes += ` Design specifications: ${ponticDesign}, ${embrasure}, ${contourPonticType}, ${proximalContact}, ${occlusalContact}${gapText}. Impression: ${impressionText}. Add-ons ${addOns}.${advanceFieldsSection}`
        } else if (isRemovable) {
          const teeth = formatTeethNumbers(product.mandibularTeeth)
          const productName = product.product.name || "removable restoration"
          const grade = product.mandibularMaterial || "Premium"
          const stage = product.mandibularStage || "finish"
          const teethShade = product.mandibularToothShade || "A2"
          const gumShade = product.maxillaryStumpShade || "A2"
          
          // Format impressions with quantities
          let impressionText = "STL file"
          if (product.mandibularImpressions && product.mandibularImpressions.length > 0) {
            impressionText = product.mandibularImpressions
              .map(imp => `${imp.quantity}x ${imp.name || "Impression"}`)
              .join(", ")
          } else if (product.mandibularImpression) {
            impressionText = product.mandibularImpression
          }
          
          const addOns = product.mandibularAddOns && product.mandibularAddOns.length > 0
            ? product.mandibularAddOns.join(", ")
            : "Selected"

          // Get advance fields for mandibular
          const advanceFieldsText = formatAdvanceFields(product, "mandibular")
          const advanceFieldsSection = advanceFieldsText ? ` Advanced fields: ${advanceFieldsText}.` : ""

          notes += `Fabricate a ${grade} ${productName} replacing teeth ${teeth}, in the ${stage} stage. Use ${teethShade} denture teeth with ${gumShade} gingiva. Impression: ${impressionText}. Add-ons ${addOns}.${advanceFieldsSection}`
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
  // Also update when products are added or modified
  useEffect(() => {
    if (savedProducts.length > 0) {
      const generatedNotes = generateCaseNotes()
      if (generatedNotes) {
        // Only update if notes are empty or if we're adding the first product
        // This preserves user edits while auto-updating when products change
        if (!maxillaryNotes || savedProducts.length === 1) {
          setMaxillaryNotes(generatedNotes)
        } else {
          // If user has edited notes, only update if the generated notes are significantly different
          // This is a simple check - you might want to make it more sophisticated
          const currentNotesLength = maxillaryNotes.length
          const generatedNotesLength = generatedNotes.length
          // If generated notes are much longer (new product added), update them
          if (generatedNotesLength > currentNotesLength * 1.5) {
            setMaxillaryNotes(generatedNotes)
          }
        }
      }
    }
  }, [savedProducts.length, savedProducts]) // Run when savedProducts change

  // Track if we've auto-added the current product to avoid duplicates
  const autoAddedProductRef = useRef<string | null>(null)

  // Impression selection handlers
  const handleImpressionQuantityUpdate = (impressionKey: string, quantity: number) => {
    setSelectedImpressions(prev => ({
      ...prev,
      [impressionKey]: quantity
    }))
  }

  const handleImpressionRemove = (impressionKey: string) => {
    setSelectedImpressions(prev => {
      const updated = { ...prev }
      delete updated[impressionKey]
      return updated
    })
  }

  const handleOpenImpressionModal = (product: SavedProduct, arch: "maxillary" | "mandibular") => {
    setCurrentProductForImpression(product)
    setCurrentImpressionArch(arch)
    setShowImpressionModal(true)
  }

  const handleOpenShadeModal = (fieldKey: string, arch?: "maxillary" | "mandibular") => {
    const actualArch = arch || (maxillaryTeeth.length > 0 ? "maxillary" : "mandibular")
    // Map field key to shade field type
    const shadeFieldType: "tooth_shade" | "stump_shade" =
      fieldKey === "tooth_shade" ? "tooth_shade" : "stump_shade"
    console.log("Opening shade selection:", { fieldKey, shadeFieldType, actualArch, productDetails })
    setCurrentShadeField(shadeFieldType)
    setCurrentShadeArch(actualArch)
    setSelectedShadesForSVG([]) // Reset selected shades
    // No longer opening modal - just setting the field to show SVG inline
  }

  const handleShadeSelect = (shadeId: number, shadeName: string, brandId?: number) => {
    if (!currentShadeField) return

    const config = fieldConfigs.find(f => f.key === currentShadeField)
    if (!config) return

    // Update the field with selected shade
    handleFieldChange(currentShadeField, shadeName, shadeId, undefined, currentShadeArch)

    // Update brand ID if available
    if (brandId) {
      if (currentShadeArch === "maxillary") {
        if (currentShadeField === "tooth_shade") {
          // Store brand ID for tooth shade
          // You may need to add maxillaryToothShadeBrand state if needed
        } else {
          // Store brand ID for stump shade
          // You may need to add maxillaryGumShadeBrand state if needed
        }
      } else {
        // Similar for mandibular
      }
    }

    setShowShadeModal(false)
    setCurrentShadeField(null)
  }

  const handleShadeClickFromSVG = (shade: string) => {
    if (!currentShadeField) return

    // Update the field with selected shade
    handleFieldChange(currentShadeField, shade, undefined, undefined, currentShadeArch)

    // Clear the shade selection mode to show teeth again
    setCurrentShadeField(null)
    setSelectedShadesForSVG([])
  }

  // Helper to get impression selections for a product and arch
  const getImpressionSelections = (productId: string, arch: "maxillary" | "mandibular", impressions: any[]): Array<{ impression_id: number, quantity: number, name?: string }> => {
    const selections: Array<{ impression_id: number, quantity: number, name?: string }> = []
    impressions.forEach(impression => {
      const key = `${productId}_${arch}_${impression.value || impression.name}`
      const quantity = selectedImpressions[key] || 0
      if (quantity > 0) {
        selections.push({
          impression_id: impression.id,
          quantity,
          name: impression.name
        })
      }
    })
    return selections
  }

  // Helper to find default option from API response
  const findDefaultOption = (options: any[]): any | null => {
    if (!options || !Array.isArray(options)) return null
    // Check for is_default === "Yes" or is_default === true
    return options.find((opt: any) => 
      opt.is_default === "Yes" || 
      opt.is_default === true || 
      opt.is_default === "yes"
    ) || null
  }

  // Auto-select default values when productDetails are loaded
  useEffect(() => {
    if (!productDetails || !selectedProduct) return

    // Only auto-select if fields are not already set (to preserve user selections)
    const shouldAutoSelect = (fieldKey: string, arch: "maxillary" | "mandibular"): boolean => {
      const config = fieldConfigs.find(f => f.key === fieldKey)
      if (!config) return false

      const stateKey = arch === "maxillary" ? config.maxillaryStateKey : config.mandibularStateKey
      if (!stateKey) return false

      // Check if field is already set
      if (arch === "maxillary") {
        const currentValue = stateKey === "maxillaryMaterial" ? maxillaryMaterial :
                           stateKey === "maxillaryRetention" ? maxillaryRetention :
                           stateKey === "maxillaryStumpShade" ? maxillaryStumpShade :
                           stateKey === "maxillaryToothShade" ? (savedProducts.find(p => p.maxillaryTeeth.length > 0)?.maxillaryToothShade || "") :
                           stateKey === "maxillaryStage" ? (savedProducts.find(p => p.maxillaryTeeth.length > 0)?.maxillaryStage || "") : ""
        return !currentValue || currentValue.trim() === ""
      } else {
        const currentValue = stateKey === "mandibularMaterial" ? mandibularMaterial :
                           stateKey === "mandibularRetention" ? mandibularRetention :
                           stateKey === "mandibularStumpShade" ? "" : // Mandibular doesn't have stump shade in SavedProduct
                           stateKey === "mandibularToothShade" ? mandibularToothShade :
                           stateKey === "mandibularStage" ? mandibularStage : ""
        return !currentValue || currentValue.trim() === ""
      }
    }

    // Auto-select defaults for maxillary if teeth are selected
    if (maxillaryTeeth.length > 0) {
      fieldConfigs.forEach(config => {
        if (config.maxillaryStateKey && shouldAutoSelect(config.key, "maxillary")) {
          const apiData = productDetails[config.apiProperty]
          if (apiData && Array.isArray(apiData) && apiData.length > 0) {
            // For stages, filter by status if it exists, otherwise include all
            // For other fields, filter active options only
            const activeOptions = config.key === "stage" 
              ? apiData.filter((opt: any) => opt.status === "Active" || opt.status === undefined || !opt.hasOwnProperty("status"))
              : apiData.filter((opt: any) => opt.status === "Active" || opt.status === undefined)
            
            // If only one option, auto-select it
            if (activeOptions.length === 1) {
              const singleOption = activeOptions[0]
              // For retention_options, check if it matches selected retention
              if (config.key === "retention_option") {
                const selectedRetentionId = maxillaryRetentionId || 
                  (productDetails.retentions?.find((r: any) => r.is_default === "Yes" || r.is_default === true)?.id)
                if (singleOption.retention_id === selectedRetentionId) {
                  handleFieldChange(config.key, singleOption.name, singleOption.id, undefined, "maxillary")
                }
              } else {
                handleFieldChange(config.key, singleOption.name, singleOption.id, undefined, "maxillary")
              }
            } else {
              // Otherwise, try to find default option
              const defaultOption = findDefaultOption(activeOptions)
              if (defaultOption) {
                // For retention_options, check if it matches selected retention
                if (config.key === "retention_option") {
                  const selectedRetentionId = maxillaryRetentionId || 
                    (productDetails.retentions?.find((r: any) => r.is_default === "Yes" || r.is_default === true)?.id)
                  if (defaultOption.retention_id === selectedRetentionId) {
                    handleFieldChange(config.key, defaultOption.name, defaultOption.id, undefined, "maxillary")
                  }
                } else {
                  handleFieldChange(config.key, defaultOption.name, defaultOption.id, undefined, "maxillary")
                }
              }
            }
          }
        }
      })
    }

    // Auto-select defaults for mandibular if teeth are selected
    if (mandibularTeeth.length > 0) {
      fieldConfigs.forEach(config => {
        if (config.mandibularStateKey && shouldAutoSelect(config.key, "mandibular")) {
          const apiData = productDetails[config.apiProperty]
          if (apiData && Array.isArray(apiData) && apiData.length > 0) {
            // For stages, filter by status if it exists, otherwise include all
            // For other fields, filter active options only
            const activeOptions = config.key === "stage" 
              ? apiData.filter((opt: any) => opt.status === "Active" || opt.status === undefined || !opt.hasOwnProperty("status"))
              : apiData.filter((opt: any) => opt.status === "Active" || opt.status === undefined)
            
            // If only one option, auto-select it
            if (activeOptions.length === 1) {
              const singleOption = activeOptions[0]
              // For retention_options, check if it matches selected retention
              if (config.key === "retention_option") {
                const selectedRetentionId = mandibularRetentionId || 
                  (productDetails.retentions?.find((r: any) => r.is_default === "Yes" || r.is_default === true)?.id)
                if (singleOption.retention_id === selectedRetentionId) {
                  handleFieldChange(config.key, singleOption.name, singleOption.id, undefined, "mandibular")
                }
              } else {
                handleFieldChange(config.key, singleOption.name, singleOption.id, undefined, "mandibular")
              }
            } else {
              // Otherwise, try to find default option
              const defaultOption = findDefaultOption(activeOptions)
              if (defaultOption) {
                // For retention_options, check if it matches selected retention
                if (config.key === "retention_option") {
                  const selectedRetentionId = mandibularRetentionId || 
                    (productDetails.retentions?.find((r: any) => r.is_default === "Yes" || r.is_default === true)?.id)
                  if (defaultOption.retention_id === selectedRetentionId) {
                    handleFieldChange(config.key, defaultOption.name, defaultOption.id, undefined, "mandibular")
                  }
                } else {
                  handleFieldChange(config.key, defaultOption.name, defaultOption.id, undefined, "mandibular")
                }
              }
            }
          }
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productDetails?.id, maxillaryTeeth.length, mandibularTeeth.length]) // Run when productDetails ID or teeth selections change

  // Auto-open stage dropdown when stage field becomes visible and value is "Not specified"
  useEffect(() => {
    // Check all saved products
    savedProducts.forEach((savedProduct) => {
      const productDetails = savedProduct.productDetails
      if (productDetails?.stages && Array.isArray(productDetails.stages) && productDetails.stages.length > 0) {
        // Helper to check if value is "Not specified" or empty
        const isNotSpecified = (value: string | undefined | null): boolean => {
          if (!value) return true
          const trimmed = String(value).trim().toLowerCase()
          return trimmed === "" || trimmed === "not specified" || trimmed === "finish"
        }

        // Check maxillary
        const isMaxillaryVisible = isAccordionFieldVisible("stage", savedProduct, "maxillary")
        const maxillaryStageValue = savedProduct.maxillaryStage
        const shouldOpenMaxillary = isMaxillaryVisible && isNotSpecified(maxillaryStageValue) && 
          openAccordion === savedProduct.id

        // Check mandibular
        const isMandibularVisible = isAccordionFieldVisible("stage", savedProduct, "mandibular")
        const mandibularStageValue = savedProduct.mandibularStage
        const shouldOpenMandibular = isMandibularVisible && isNotSpecified(mandibularStageValue) && 
          openAccordion === savedProduct.id

        if (shouldOpenMaxillary || shouldOpenMandibular) {
          setOpenStageDropdown((prev) => {
            const currentState = prev[savedProduct.id]
            // Only update if state needs to change
            if ((shouldOpenMaxillary && !currentState?.maxillary) || (shouldOpenMandibular && !currentState?.mandibular)) {
              return {
                ...prev,
                [savedProduct.id]: {
                  ...currentState,
                  ...(shouldOpenMaxillary && { maxillary: true }),
                  ...(shouldOpenMandibular && { mandibular: true })
                }
              }
            }
            return prev
          })
        }
      }
    })

    // Check unsaved products (maxillary-card and mandibular-card)
    if (openAccordion === "maxillary-card" || openAccordion === "mandibular-card") {
      const arch = openAccordion === "maxillary-card" ? "maxillary" : "mandibular"
      const stageValue = arch === "maxillary" ? maxillaryStage : mandibularStage
      const toothShade = arch === "maxillary" ? maxillaryToothShade : mandibularToothShade
      
      // Helper to check if value is "Not specified" or empty
      const isNotSpecified = (value: string | undefined | null): boolean => {
        if (!value) return true
        const trimmed = String(value).trim().toLowerCase()
        return trimmed === "" || trimmed === "not specified" || trimmed === "finish"
      }
      
      // Check if stage field should be visible (tooth shade must be filled)
      const isStageVisible = toothShade && toothShade.trim() !== "" && toothShade.trim().toLowerCase() !== "not specified"
      
      if (isStageVisible && isNotSpecified(stageValue) && productDetails?.stages && Array.isArray(productDetails.stages) && productDetails.stages.length > 0) {
        setOpenStageDropdown((prev) => {
          const currentState = prev[openAccordion]
          if (!currentState?.[arch]) {
            return {
              ...prev,
              [openAccordion]: {
                ...currentState,
                [arch]: true
              }
            }
          }
          return prev
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedProducts, openAccordion, maxillaryStage, mandibularStage, maxillaryToothShade, mandibularToothShade, productDetails])

  // Handler for field changes in dynamic fields
  const handleFieldChange = (fieldKey: string, value: string, id?: number, productId?: string, arch?: "maxillary" | "mandibular") => {
    const actualArch = arch || (maxillaryTeeth.length > 0 ? "maxillary" : "mandibular")
    const config = fieldConfigs.find(f => f.key === fieldKey)
    if (!config) return

    if (!productId) {
      // For card accordion (not yet saved product) - update local state
      if (actualArch === "maxillary") {
        if (config.maxillaryStateKey) {
          switch (fieldKey) {
            case "material":
              setMaxillaryMaterial(value)
              break
            case "retention":
              setMaxillaryRetention(value)
              break
            case "stage":
              setMaxillaryStage(value)
              break
            case "stump_shade":
              setMaxillaryStumpShade(value)
              break
            case "tooth_shade":
              setMaxillaryToothShade(value)
              break
          }
        }
        if (config.maxillaryIdKey && id !== undefined) {
          switch (fieldKey) {
            case "material":
              setMaxillaryMaterialId(id)
              break
            case "retention":
              setMaxillaryRetentionId(id)
              break
            case "retention_option":
              setMaxillaryRetentionOptionId(id)
              // Auto-select retention type based on retention option's tooth_chart_type
              if (id && productDetails?.retention_options && productDetails?.retentions) {
                // Convert id to number for comparison (handle both string and number)
                const numericId = typeof id === 'string' ? parseInt(id, 10) : id
                
                // Find the selected retention option - check multiple possible structures
                const selectedRetentionOption = productDetails.retention_options.find((opt: any) => {
                  // Check direct ID match (handle both string and number)
                  if (opt.id === id || opt.id === numericId || String(opt.id) === String(id)) return true
                  // Check nested lab_retention_option ID
                  if (opt.lab_retention_option?.id === id || 
                      opt.lab_retention_option?.id === numericId ||
                      String(opt.lab_retention_option?.id) === String(id)) return true
                  // Check if retention_option_id matches
                  if (opt.retention_option_id === id || 
                      opt.retention_option_id === numericId ||
                      String(opt.retention_option_id) === String(id)) return true
                  return false
                })
                
                if (selectedRetentionOption) {
                  // Get tooth_chart_type from various possible locations
                  const toothChartType = selectedRetentionOption.tooth_chart_type || 
                                         selectedRetentionOption.lab_retention_option?.tooth_chart_type ||
                                         selectedRetentionOption.retention_option?.tooth_chart_type
                  
                  // Debug logging (can be removed later)
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Retention option selected:', {
                      id,
                      numericId,
                      selectedRetentionOption,
                      toothChartType,
                      allRetentionOptions: productDetails.retention_options
                    })
                  }
                  
                  // Map tooth_chart_type to retention type
                  let targetRetentionName = ""
                  if (toothChartType === "Implant" || toothChartType === "Pontic") {
                    targetRetentionName = "Screwed"
                  } else if (toothChartType === "Prep" || toothChartType === "Prepped") {
                    targetRetentionName = "Cemented"
                  }
                  
                  if (targetRetentionName) {
                    // Find the matching retention by name (case-insensitive)
                    const targetRetention = productDetails.retentions.find((ret: any) => 
                      ret.name === targetRetentionName || 
                      ret.name?.toLowerCase() === targetRetentionName.toLowerCase()
                    )
                    if (targetRetention) {
                      if (process.env.NODE_ENV === 'development') {
                        console.log('Auto-selecting retention type:', targetRetention)
                      }
                      setMaxillaryRetention(targetRetention.name)
                      setMaxillaryRetentionId(targetRetention.id)
                    } else if (process.env.NODE_ENV === 'development') {
                      console.log('Retention not found:', {
                        targetRetentionName,
                        availableRetentions: productDetails.retentions
                      })
                    }
                  } else if (process.env.NODE_ENV === 'development') {
                    console.log('No target retention name mapped for tooth_chart_type:', toothChartType)
                  }
                } else if (process.env.NODE_ENV === 'development') {
                  console.log('Retention option not found:', {
                    id,
                    numericId,
                    availableOptions: productDetails.retention_options.map((opt: any) => ({
                      id: opt.id,
                      name: opt.name,
                      lab_retention_option_id: opt.lab_retention_option?.id,
                      retention_option_id: opt.retention_option_id
                    }))
                  })
                }
              }
              break
            case "stump_shade":
              setMaxillaryGumShadeId(id)
              break
            case "tooth_shade":
              setMaxillaryShadeId(id)
              break
            case "stage":
              setMaxillaryStageId(id)
              break
          }
        }
      } else {
        if (config.mandibularStateKey) {
          switch (fieldKey) {
            case "material":
              setMandibularMaterial(value)
              break
            case "retention":
              setMandibularRetention(value)
              break
            case "stage":
              setMandibularStage(value)
              break
            case "stump_shade":
              // Update mandibular stump shade if needed
              break
            case "tooth_shade":
              setMandibularToothShade(value)
              break
          }
        }
        if (config.mandibularIdKey && id !== undefined) {
          switch (fieldKey) {
            case "material":
              setMandibularMaterialId(id)
              break
            case "retention":
              setMandibularRetentionId(id)
              break
            case "retention_option":
              setMandibularRetentionOptionId(id)
              // Auto-select retention type based on retention option's tooth_chart_type
              if (id && productDetails?.retention_options && productDetails?.retentions) {
                // Convert id to number for comparison (handle both string and number)
                const numericId = typeof id === 'string' ? parseInt(id, 10) : id
                
                // Find the selected retention option - check multiple possible structures
                const selectedRetentionOption = productDetails.retention_options.find((opt: any) => {
                  // Check direct ID match (handle both string and number)
                  if (opt.id === id || opt.id === numericId || String(opt.id) === String(id)) return true
                  // Check nested lab_retention_option ID
                  if (opt.lab_retention_option?.id === id || 
                      opt.lab_retention_option?.id === numericId ||
                      String(opt.lab_retention_option?.id) === String(id)) return true
                  // Check if retention_option_id matches
                  if (opt.retention_option_id === id || 
                      opt.retention_option_id === numericId ||
                      String(opt.retention_option_id) === String(id)) return true
                  return false
                })
                
                if (selectedRetentionOption) {
                  // Get tooth_chart_type from various possible locations
                  const toothChartType = selectedRetentionOption.tooth_chart_type || 
                                         selectedRetentionOption.lab_retention_option?.tooth_chart_type ||
                                         selectedRetentionOption.retention_option?.tooth_chart_type
                  
                  // Debug logging (can be removed later)
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Retention option selected (mandibular):', {
                      id,
                      numericId,
                      selectedRetentionOption,
                      toothChartType
                    })
                  }
                  
                  // Map tooth_chart_type to retention type
                  let targetRetentionName = ""
                  if (toothChartType === "Implant" || toothChartType === "Pontic") {
                    targetRetentionName = "Screwed"
                  } else if (toothChartType === "Prep" || toothChartType === "Prepped") {
                    targetRetentionName = "Cemented"
                  }
                  
                  if (targetRetentionName) {
                    // Find the matching retention by name (case-insensitive)
                    const targetRetention = productDetails.retentions.find((ret: any) => 
                      ret.name === targetRetentionName || 
                      ret.name?.toLowerCase() === targetRetentionName.toLowerCase()
                    )
                    if (targetRetention) {
                      if (process.env.NODE_ENV === 'development') {
                        console.log('Auto-selecting retention type (mandibular):', targetRetention)
                      }
                      setMandibularRetention(targetRetention.name)
                      setMandibularRetentionId(targetRetention.id)
                    }
                  }
                }
              }
              break
            case "stump_shade":
              setMandibularGumShadeId(id)
              break
            case "tooth_shade":
              setMandibularShadeId(id)
              break
            case "stage":
              setMandibularStageId(id)
              break
          }
        }
      }
    } else {
      // For saved products, update the product in the array
      setSavedProducts(prev => prev.map(product => {
        if (product.id === productId) {
          const updated = { ...product }
          if (actualArch === "maxillary") {
            if (config.maxillaryStateKey) {
              (updated as any)[config.maxillaryStateKey] = value
            }
            if (config.maxillaryIdKey && id !== undefined) {
              (updated as any)[config.maxillaryIdKey] = id
              
              // Auto-select retention type based on retention option's tooth_chart_type
              if (fieldKey === "retention_option" && id && updated.productDetails?.retention_options && updated.productDetails?.retentions) {
                // Convert id to number for comparison (handle both string and number)
                const numericId = typeof id === 'string' ? parseInt(id, 10) : id
                
                // Find the selected retention option - check multiple possible structures
                const selectedRetentionOption = updated.productDetails.retention_options.find((opt: any) => {
                  // Check direct ID match (handle both string and number)
                  if (opt.id === id || opt.id === numericId || String(opt.id) === String(id)) return true
                  // Check nested lab_retention_option ID
                  if (opt.lab_retention_option?.id === id || 
                      opt.lab_retention_option?.id === numericId ||
                      String(opt.lab_retention_option?.id) === String(id)) return true
                  // Check if retention_option_id matches
                  if (opt.retention_option_id === id || 
                      opt.retention_option_id === numericId ||
                      String(opt.retention_option_id) === String(id)) return true
                  return false
                })
                
                if (selectedRetentionOption) {
                  // Get tooth_chart_type from various possible locations
                  const toothChartType = selectedRetentionOption.tooth_chart_type || 
                                         selectedRetentionOption.lab_retention_option?.tooth_chart_type ||
                                         selectedRetentionOption.retention_option?.tooth_chart_type
                  
                  // Map tooth_chart_type to retention type
                  let targetRetentionName = ""
                  if (toothChartType === "Implant" || toothChartType === "Pontic") {
                    targetRetentionName = "Screwed"
                  } else if (toothChartType === "Prep" || toothChartType === "Prepped") {
                    targetRetentionName = "Cemented"
                  }
                  
                  if (targetRetentionName) {
                    // Find the matching retention by name (case-insensitive)
                    const targetRetention = updated.productDetails.retentions.find((ret: any) => 
                      ret.name === targetRetentionName || 
                      ret.name?.toLowerCase() === targetRetentionName.toLowerCase()
                    )
                    if (targetRetention) {
                      updated.maxillaryRetention = targetRetention.name
                      updated.maxillaryRetentionId = targetRetention.id
                    }
                  }
                }
              }
            }
          } else {
            if (config.mandibularStateKey) {
              (updated as any)[config.mandibularStateKey] = value
            }
            if (config.mandibularIdKey && id !== undefined) {
              (updated as any)[config.mandibularIdKey] = id
              
              // Auto-select retention type based on retention option's tooth_chart_type
              if (fieldKey === "retention_option" && id && updated.productDetails?.retention_options && updated.productDetails?.retentions) {
                // Convert id to number for comparison (handle both string and number)
                const numericId = typeof id === 'string' ? parseInt(id, 10) : id
                
                // Find the selected retention option - check multiple possible structures
                const selectedRetentionOption = updated.productDetails.retention_options.find((opt: any) => {
                  // Check direct ID match (handle both string and number)
                  if (opt.id === id || opt.id === numericId || String(opt.id) === String(id)) return true
                  // Check nested lab_retention_option ID
                  if (opt.lab_retention_option?.id === id || 
                      opt.lab_retention_option?.id === numericId ||
                      String(opt.lab_retention_option?.id) === String(id)) return true
                  // Check if retention_option_id matches
                  if (opt.retention_option_id === id || 
                      opt.retention_option_id === numericId ||
                      String(opt.retention_option_id) === String(id)) return true
                  return false
                })
                
                if (selectedRetentionOption) {
                  // Get tooth_chart_type from various possible locations
                  const toothChartType = selectedRetentionOption.tooth_chart_type || 
                                         selectedRetentionOption.lab_retention_option?.tooth_chart_type ||
                                         selectedRetentionOption.retention_option?.tooth_chart_type
                  
                  // Map tooth_chart_type to retention type
                  let targetRetentionName = ""
                  if (toothChartType === "Implant" || toothChartType === "Pontic") {
                    targetRetentionName = "Screwed"
                  } else if (toothChartType === "Prep" || toothChartType === "Prepped") {
                    targetRetentionName = "Cemented"
                  }
                  
                  if (targetRetentionName) {
                    // Find the matching retention by name (case-insensitive)
                    const targetRetention = updated.productDetails.retentions.find((ret: any) => 
                      ret.name === targetRetentionName || 
                      ret.name?.toLowerCase() === targetRetentionName.toLowerCase()
                    )
                    if (targetRetention) {
                      updated.mandibularRetention = targetRetention.name
                      updated.mandibularRetentionId = targetRetention.id
                    }
                  }
                }
              }
            }
          }
          return updated
        }
        return product
      }))
    }
  }

  // Auto-save product without resetting form - keeps user on current product details
  const handleAutoSaveProduct = (type: "maxillary" | "mandibular") => {
    // Use the appropriate product based on arch selection
    const productToUse = type === "maxillary" ? selectedProductForMaxillary : selectedProductForMandibular
    
    // Validate that we have a product selected for this arch
    if (!productToUse) {
      return
    }

    // Validate that we have teeth selected for the specified type
    const teethForType = type === "maxillary" ? maxillaryTeeth : mandibularTeeth
    if (teethForType.length === 0) {
      return
    }

    // Validate category and subcategory
    if (!selectedCategory || !selectedCategoryId || !selectedSubcategory || !selectedSubcategoryId) {
      return
    }

    // Create a unique key that includes the arch type and teeth
    const teethForTypeSorted = [...teethForType].sort()
    const currentProductKey = `${productToUse.id}-${selectedCategoryId}-${selectedSubcategoryId}-${type}-${JSON.stringify(teethForTypeSorted)}`

    // Mark that we're processing this product configuration
    autoAddedProductRef.current = currentProductKey

    // Auto-populate product name and retention type if not already set
    const finalMaxillaryMaterial = maxillaryMaterial || (type === "maxillary" ? productToUse.name : "")
    const finalMandibularMaterial = mandibularMaterial || (type === "mandibular" ? productToUse.name : "")
    const finalMaxillaryRetention = maxillaryRetention
    const finalMandibularRetention = mandibularRetention

    // Update existing product or add new one using functional update to get latest state
    setSavedProducts((prevProducts) => {
      // Find existing auto-saved product in the CURRENT state
      const existingIndex = [...prevProducts].reverse().findIndex(p =>
        p.product.id === productToUse.id &&
        p.categoryId === selectedCategoryId &&
        p.subcategoryId === selectedSubcategoryId &&
        p.addedFrom === type
      )

      // Convert reversed index back to original array index
      const actualIndex = existingIndex !== -1
        ? prevProducts.length - 1 - existingIndex
        : -1

      // If we found an existing product, check if teeth are exactly the same
      if (actualIndex !== -1) {
        const existingProduct = prevProducts[actualIndex]
        const existingTeeth = type === "maxillary"
          ? [...(existingProduct.maxillaryTeeth || [])].sort()
          : [...(existingProduct.mandibularTeeth || [])].sort()
        const currentTeeth = type === "maxillary"
          ? [...maxillaryTeeth].sort()
          : [...mandibularTeeth].sort()

        // If teeth are exactly the same, no need to update
        if (JSON.stringify(existingTeeth) === JSON.stringify(currentTeeth)) {
          return prevProducts // No changes
        }
      }

      // Get impression selections for this product
      const productId = actualIndex !== -1 ? prevProducts[actualIndex].id : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const impressions = productDetails?.impressions || []
      const maxillaryImpressions = type === "maxillary"
        ? getImpressionSelections(productId, "maxillary", impressions)
        : []
      const mandibularImpressions = type === "mandibular"
        ? getImpressionSelections(productId, "mandibular", impressions)
        : []

      // Create saved product configuration
      const savedProduct: SavedProduct = {
        id: productId,
        product: productToUse,
        productDetails: productDetails,
        category: selectedCategory,
        categoryId: selectedCategoryId,
        subcategory: selectedSubcategory,
        subcategoryId: selectedSubcategoryId,
        maxillaryTeeth: [...maxillaryTeeth],
        mandibularTeeth: [...mandibularTeeth],
        maxillaryMaterial: finalMaxillaryMaterial,
        maxillaryStumpShade,
        maxillaryRetention: finalMaxillaryRetention,
        maxillaryNotes,
        mandibularMaterial: finalMandibularMaterial,
        mandibularRetention: finalMandibularRetention,
        mandibularImplantDetails,
        createdAt: actualIndex !== -1 ? prevProducts[actualIndex].createdAt : Date.now(),
        addedFrom: type,
        maxillaryImpressions: maxillaryImpressions.length > 0 ? maxillaryImpressions : undefined,
        mandibularImpressions: mandibularImpressions.length > 0 ? mandibularImpressions : undefined,
        // Include ID fields and additional fields
        maxillaryMaterialId: type === "maxillary" ? maxillaryMaterialId : undefined,
        maxillaryRetentionId: type === "maxillary" ? maxillaryRetentionId : undefined,
        maxillaryRetentionOptionId: type === "maxillary" ? maxillaryRetentionOptionId : undefined,
        maxillaryGumShadeId: type === "maxillary" ? maxillaryGumShadeId : undefined,
        maxillaryShadeId: type === "maxillary" ? maxillaryShadeId : undefined,
        maxillaryStageId: type === "maxillary" ? maxillaryStageId : undefined,
        maxillaryToothShade: type === "maxillary" ? maxillaryToothShade : undefined,
        maxillaryStage: type === "maxillary" ? maxillaryStage : undefined,
        mandibularMaterialId: type === "mandibular" ? mandibularMaterialId : undefined,
        mandibularRetentionId: type === "mandibular" ? mandibularRetentionId : undefined,
        mandibularRetentionOptionId: type === "mandibular" ? mandibularRetentionOptionId : undefined,
        mandibularGumShadeId: type === "mandibular" ? mandibularGumShadeId : undefined,
        mandibularShadeId: type === "mandibular" ? mandibularShadeId : undefined,
        mandibularStageId: type === "mandibular" ? mandibularStageId : undefined,
        mandibularToothShade: type === "mandibular" ? mandibularToothShade : undefined,
        mandibularStage: type === "mandibular" ? mandibularStage : undefined,
        // Include advance fields if any are set
        advanceFields: productDetails?.advance_fields && Array.isArray(productDetails.advance_fields)
          ? productDetails.advance_fields
              .map((field: any) => {
                const fieldKey = `advance_${field.id}`
                const value = advanceFieldValues[fieldKey]
                if (value) {
                  const fieldData: any = {
                    advance_field_id: field.id,
                    advance_field_value: typeof value === "object" ? value.advance_field_value : value,
                    teeth_number: null,
                  }

                  if (typeof value === "object" && value.option_id) {
                    fieldData.option_id = value.option_id
                  }

                  if (typeof value === "object" && Array.isArray(value.option_ids)) {
                    fieldData.option_ids = value.option_ids
                  }

                  if (typeof value === "object" && value.file) {
                    fieldData.file = value.file
                  }

                  return fieldData
                }
                return null
              })
              .filter((field: any) => field !== null)
          : undefined,
      }

      // If both material and retention are set, show advance fields and fetch them
      if ((type === "maxillary" && finalMaxillaryMaterial && finalMaxillaryRetention) ||
          (type === "mandibular" && finalMandibularMaterial && finalMandibularRetention)) {
        setShowAdvanceFields(prev => ({ ...prev, [savedProduct.id]: true }))

        if (productDetails?.advance_fields && Array.isArray(productDetails.advance_fields)) {
          setProductAdvanceFields(prev => ({ ...prev, [savedProduct.id]: productDetails.advance_fields }))
        } else if (productToUse?.id) {
          const fetchAdvanceFields = async () => {
            try {
              const labId = selectedLab?.id || selectedLab?.customer_id
              const details = await fetchProductDetails(productToUse.id, labId)
              if (details?.advance_fields && Array.isArray(details.advance_fields)) {
                setProductAdvanceFields(prev => ({ ...prev, [savedProduct.id]: details.advance_fields }))
              }
            } catch (error) {
              console.error("Error fetching advance fields:", error)
            }
          }
          fetchAdvanceFields()
        }
      }

      // Update existing product or add new one
      if (actualIndex !== -1) {
        // Update existing auto-saved product with new teeth selection
        const updated = [...prevProducts]
        updated[actualIndex] = savedProduct
        return updated
      } else {
        // Add to saved products array
        return [...prevProducts, savedProduct]
      }
    })

    // Update case summary notes when product is auto-saved
    const updatedNotes = generateCaseNotes()
    if (updatedNotes) {
      setMaxillaryNotes(updatedNotes)
    }
  }

  // Handler for Add Product button - saves current product and resets to categories
  const handleAddProduct = (type: "maxillary" | "mandibular") => {
    // Use the appropriate product based on arch selection
    const productToUse = type === "maxillary" ? selectedProductForMaxillary : selectedProductForMandibular
    
    // Validate that we have a product selected for this arch
    if (!productToUse) {
      toast({
        title: "No Product Selected",
        description: `Please add a product for ${type === "maxillary" ? "upper" : "lower"} arch first`,
        variant: "destructive",
      })
      return
    }

    // Validate that the chart is visible for this arch
    const chartVisible = type === "maxillary" ? showMaxillaryChart : showMandibularChart
    if (!chartVisible) {
      toast({
        title: "Chart Not Visible",
        description: `Please click "Add ${type === "maxillary" ? "Upper" : "Lower"} Product" first`,
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

    // Auto-populate product name and retention type if not already set
    // Material: Use product name if not set
    const finalMaxillaryMaterial = maxillaryMaterial || (type === "maxillary" ? productToUse.name : "")
    const finalMandibularMaterial = mandibularMaterial || (type === "mandibular" ? productToUse.name : "")
    // Retention: Keep existing value or leave empty (user will select it)
    const finalMaxillaryRetention = maxillaryRetention
    const finalMandibularRetention = mandibularRetention
    
    // Auto-select default stage if not already set
    let finalMaxillaryStage = maxillaryStage
    let finalMaxillaryStageId = maxillaryStageId
    let finalMandibularStage = mandibularStage
    let finalMandibularStageId = mandibularStageId
    
    if (type === "maxillary" && (!finalMaxillaryStage || finalMaxillaryStage.trim() === "")) {
      const stages = productDetails?.stages || []
      const defaultStage = findDefaultOption(stages)
      if (defaultStage) {
        finalMaxillaryStage = defaultStage.name
        finalMaxillaryStageId = defaultStage.id || defaultStage.stage_id
        // Update state so UI reflects the change
        setMaxillaryStage(finalMaxillaryStage)
        if (finalMaxillaryStageId) {
          setMaxillaryStageId(finalMaxillaryStageId)
        }
      }
    }
    
    if (type === "mandibular" && (!finalMandibularStage || finalMandibularStage.trim() === "")) {
      const stages = productDetails?.stages || []
      const defaultStage = findDefaultOption(stages)
      if (defaultStage) {
        finalMandibularStage = defaultStage.name
        finalMandibularStageId = defaultStage.id || defaultStage.stage_id
        // Update state so UI reflects the change
        setMandibularStage(finalMandibularStage)
        if (finalMandibularStageId) {
          setMandibularStageId(finalMandibularStageId)
        }
      }
    }

    // Get impression selections for this product
    const productId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const impressions = productDetails?.impressions || []
    const maxillaryImpressions = type === "maxillary" 
      ? getImpressionSelections(productId, "maxillary", impressions)
      : []
    const mandibularImpressions = type === "mandibular"
      ? getImpressionSelections(productId, "mandibular", impressions)
      : []

    // Create saved product configuration
    const savedProduct: SavedProduct = {
      id: productId,
      product: productToUse,
      productDetails: productDetails, // Include full product details with extractions
      category: selectedCategory,
      categoryId: selectedCategoryId,
      subcategory: selectedSubcategory,
      subcategoryId: selectedSubcategoryId,
      maxillaryTeeth: [...maxillaryTeeth],
      mandibularTeeth: [...mandibularTeeth],
      maxillaryMaterial: finalMaxillaryMaterial,
      maxillaryStumpShade,
      maxillaryRetention: finalMaxillaryRetention,
      maxillaryNotes,
      mandibularMaterial: finalMandibularMaterial,
      mandibularRetention: finalMandibularRetention,
      mandibularImplantDetails,
      createdAt: Date.now(),
      addedFrom: type, // Track which side the product was added from
      maxillaryImpressions: maxillaryImpressions.length > 0 ? maxillaryImpressions : undefined,
      mandibularImpressions: mandibularImpressions.length > 0 ? mandibularImpressions : undefined,
      // Include ID fields and additional fields
      maxillaryMaterialId: type === "maxillary" ? maxillaryMaterialId : undefined,
      maxillaryRetentionId: type === "maxillary" ? maxillaryRetentionId : undefined,
      maxillaryRetentionOptionId: type === "maxillary" ? maxillaryRetentionOptionId : undefined,
      maxillaryGumShadeId: type === "maxillary" ? maxillaryGumShadeId : undefined,
      maxillaryShadeId: type === "maxillary" ? maxillaryShadeId : undefined,
      maxillaryStageId: type === "maxillary" ? finalMaxillaryStageId : undefined,
      maxillaryToothShade: type === "maxillary" ? maxillaryToothShade : undefined,
      maxillaryStage: type === "maxillary" ? finalMaxillaryStage : undefined,
      mandibularMaterialId: type === "mandibular" ? mandibularMaterialId : undefined,
      mandibularRetentionId: type === "mandibular" ? mandibularRetentionId : undefined,
      mandibularRetentionOptionId: type === "mandibular" ? mandibularRetentionOptionId : undefined,
      mandibularGumShadeId: type === "mandibular" ? mandibularGumShadeId : undefined,
      mandibularShadeId: type === "mandibular" ? mandibularShadeId : undefined,
      mandibularStageId: type === "mandibular" ? finalMandibularStageId : undefined,
      mandibularToothShade: type === "mandibular" ? mandibularToothShade : undefined,
      mandibularStage: type === "mandibular" ? finalMandibularStage : undefined,
      // Include advance fields if any are set
      advanceFields: productDetails?.advance_fields && Array.isArray(productDetails.advance_fields)
        ? productDetails.advance_fields
            .map((field: any) => {
              const fieldKey = `advance_${field.id}`
              const value = advanceFieldValues[fieldKey]
              if (value) {
                const fieldData: any = {
                  advance_field_id: field.id,
                  advance_field_value: typeof value === "object" ? value.advance_field_value : value,
                  teeth_number: null, // Can be set per tooth if needed
                }
                
                // Handle option_id for single selection (dropdown, radio)
                if (typeof value === "object" && value.option_id) {
                  fieldData.option_id = value.option_id
                }
                
                // Handle option_ids for multiple selection (checkbox)
                if (typeof value === "object" && Array.isArray(value.option_ids)) {
                  fieldData.option_ids = value.option_ids
                }
                
                // Handle file upload
                if (typeof value === "object" && value.file) {
                  fieldData.file = value.file
                }
                
                return fieldData
              }
              return null
            })
            .filter((field: any) => field !== null)
        : undefined,
    }
    
    // If both material and retention are set, show advance fields and fetch them
    if ((type === "maxillary" && finalMaxillaryMaterial && finalMaxillaryRetention) ||
        (type === "mandibular" && finalMandibularMaterial && finalMandibularRetention)) {
      setShowAdvanceFields(prev => ({ ...prev, [savedProduct.id]: true }))
      
      // Fetch advance fields from productDetails if available, otherwise fetch from API
      if (productDetails?.advance_fields && Array.isArray(productDetails.advance_fields)) {
        setProductAdvanceFields(prev => ({ ...prev, [savedProduct.id]: productDetails.advance_fields }))
      } else if (selectedProduct?.id) {
        // Fetch advance fields from API
        const fetchAdvanceFields = async () => {
          try {
            const labId = selectedLab?.id || selectedLab?.customer_id
            const details = await fetchProductDetails(selectedProduct.id, labId)
            if (details?.advance_fields && Array.isArray(details.advance_fields)) {
              setProductAdvanceFields(prev => ({ ...prev, [savedProduct.id]: details.advance_fields }))
            }
          } catch (error) {
            console.error("Error fetching advance fields:", error)
          }
        }
        fetchAdvanceFields()
      }
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
    // Clear advance field values
    setAdvanceFieldValues({})

    toast({
      title: "Product Added",
      description: `${productToUse.name} has been added to your case`,
    })

    // Update case summary notes when product is added
    const updatedNotes = generateCaseNotes()
    if (updatedNotes) {
      setMaxillaryNotes(updatedNotes)
    }
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

  // Handler for stage selection
  const handleStageSelect = (productId: string, arch: "maxillary" | "mandibular", stageName: string, stageId?: number) => {
    setSavedProducts((prev) =>
      prev.map((product) => {
        if (product.id === productId) {
          return {
            ...product,
            ...(arch === "maxillary" ? { maxillaryStage: stageName, maxillaryStageId: stageId } : { mandibularStage: stageName, mandibularStageId: stageId })
          }
        }
        return product
      })
    )
    // Close the dropdown after selection
    setOpenStageDropdown((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [arch]: false
      }
    }))
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
    
    // Set arch-specific products and show charts based on which arch has teeth
    const hasMaxillaryTeeth = Array.isArray(savedProduct.maxillaryTeeth) && savedProduct.maxillaryTeeth.length > 0
    const hasMandibularTeeth = Array.isArray(savedProduct.mandibularTeeth) && savedProduct.mandibularTeeth.length > 0
    
    if (hasMaxillaryTeeth) {
      setSelectedProductForMaxillary(savedProduct.product)
      setShowMaxillaryChart(true)
      setSelectedArchForProduct("maxillary")
    }
    
    if (hasMandibularTeeth) {
      setSelectedProductForMandibular(savedProduct.product)
      setShowMandibularChart(true)
      if (!hasMaxillaryTeeth) {
        setSelectedArchForProduct("mandibular")
      }
    }
    
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

    // If there's a current product with teeth selected, automatically include it in the submission
    let productsToSubmit = [...savedProducts]
    if (hasCurrentProduct && selectedProduct) {
      // Validate category and subcategory are set
      if (!selectedCategory || !selectedCategoryId || !selectedSubcategory || !selectedSubcategoryId) {
        toast({
          title: "Missing Information",
          description: "Please ensure category and subcategory are selected for the current product",
          variant: "destructive",
        })
        return
      }

      // Determine which arch to use for addedFrom (prefer the one with more teeth, or maxillary if equal)
      const addedFrom: "maxillary" | "mandibular" = maxillaryTeeth.length >= mandibularTeeth.length ? "maxillary" : "mandibular"
      
      // Auto-populate product name and retention type if not already set
      const finalMaxillaryMaterial = maxillaryMaterial || (addedFrom === "maxillary" ? selectedProduct.name : "")
      const finalMandibularMaterial = mandibularMaterial || (addedFrom === "mandibular" ? selectedProduct.name : "")
      
      // Get impression selections for this product
      const productId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const impressions = productDetails?.impressions || []
      const maxillaryImpressions = getImpressionSelections(productId, "maxillary", impressions)
      const mandibularImpressions = getImpressionSelections(productId, "mandibular", impressions)

      // Create saved product configuration for current product
      const currentProductAsSaved: SavedProduct = {
        id: productId,
        product: selectedProduct,
        productDetails: productDetails,
        category: selectedCategory,
        categoryId: selectedCategoryId,
        subcategory: selectedSubcategory,
        subcategoryId: selectedSubcategoryId,
        maxillaryTeeth: [...maxillaryTeeth],
        mandibularTeeth: [...mandibularTeeth],
        maxillaryMaterial: finalMaxillaryMaterial,
        maxillaryStumpShade,
        maxillaryRetention: maxillaryRetention,
        maxillaryNotes,
        mandibularMaterial: finalMandibularMaterial,
        mandibularRetention: mandibularRetention,
        mandibularImplantDetails,
        createdAt: Date.now(),
        addedFrom,
        maxillaryImpressions: maxillaryImpressions.length > 0 ? maxillaryImpressions : undefined,
        mandibularImpressions: mandibularImpressions.length > 0 ? mandibularImpressions : undefined,
        maxillaryMaterialId,
        maxillaryRetentionId,
        maxillaryRetentionOptionId,
        maxillaryGumShadeId,
        maxillaryShadeId,
        maxillaryStageId,
        maxillaryToothShade,
        maxillaryStage,
        mandibularMaterialId,
        mandibularRetentionId,
        mandibularRetentionOptionId,
        mandibularGumShadeId,
        mandibularShadeId,
        mandibularStageId,
        mandibularToothShade,
        mandibularStage,
        advanceFields: productDetails?.advance_fields && Array.isArray(productDetails.advance_fields)
          ? productDetails.advance_fields
              .map((field: any) => {
                const fieldKey = `advance_${field.id}`
                const value = advanceFieldValues[fieldKey]
                if (value) {
                  const fieldData: any = {
                    advance_field_id: field.id,
                    advance_field_value: typeof value === "object" ? value.advance_field_value : value,
                    teeth_number: null,
                  }
                  
                  // Handle option_id for single selection (dropdown, radio)
                  if (typeof value === "object" && value.option_id) {
                    fieldData.option_id = value.option_id
                  }
                  
                  // Handle option_ids for multiple selection (checkbox)
                  if (typeof value === "object" && Array.isArray(value.option_ids)) {
                    fieldData.option_ids = value.option_ids
                  }
                  
                  // Handle file upload
                  if (typeof value === "object" && value.file) {
                    fieldData.file = value.file
                  }
                  
                  return fieldData
                }
                return null
              })
              .filter((field: any) => field !== null)
          : undefined,
      }
      
      productsToSubmit.push(currentProductAsSaved)
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
        savedProducts: productsToSubmit,
        user,
        locationId: undefined, // Could be added from user preferences
      })

      // Extract files from advance fields if any
      const files = extractFilesFromAdvanceFields(productsToSubmit)

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

  // Handler for retention type selection - only one type can be selected at a time
  const handleSelectRetentionType = (arch: 'maxillary' | 'mandibular', toothNumber: number, type: 'Implant' | 'Prep' | 'Pontic') => {
    // Determine if we're deselecting before updating state
    const currentRetentionTypes = arch === 'maxillary' 
      ? maxillaryRetentionTypes[toothNumber] || []
      : mandibularRetentionTypes[toothNumber] || []
    const isDeselecting = currentRetentionTypes.includes(type) && currentRetentionTypes.length === 1 && currentRetentionTypes[0] === type
    
    if (arch === 'maxillary') {
      setMaxillaryRetentionTypes(prev => {
        const current = prev[toothNumber] || []
        // If clicking the same type, deselect it; otherwise, replace with the new selection
        const updated = current.includes(type) && current.length === 1 && current[0] === type
          ? [] // Deselect if already selected
          : [type] // Replace with new selection (only one allowed)
        return { ...prev, [toothNumber]: updated }
      })
    } else {
      setMandibularRetentionTypes(prev => {
        const current = prev[toothNumber] || []
        // If clicking the same type, deselect it; otherwise, replace with the new selection
        const updated = current.includes(type) && current.length === 1 && current[0] === type
          ? [] // Deselect if already selected
          : [type] // Replace with new selection (only one allowed)
        return { ...prev, [toothNumber]: updated }
      })
    }
    
    // Update retention type field based on popover selection
    if (!isDeselecting && productDetails?.retentions) {
      // Determine target retention name based on type
      let targetRetentionName = ""
      if (type === "Implant") {
        targetRetentionName = "Screwed"
      } else if (type === "Prep") {
        targetRetentionName = "Cemented"
      } else {
        // For Pontic or any other type, default to Cemented
        targetRetentionName = "Cemented"
      }
      
      // Find the matching retention by name (case-insensitive)
      const targetRetention = productDetails.retentions.find((ret: any) => 
        ret.name === targetRetentionName || 
        ret.name?.toLowerCase() === targetRetentionName.toLowerCase()
      )
      
      if (targetRetention) {
        if (arch === 'maxillary') {
          setMaxillaryRetention(targetRetention.name)
          setMaxillaryRetentionId(targetRetention.id)
        } else {
          setMandibularRetention(targetRetention.name)
          setMandibularRetentionId(targetRetention.id)
        }
      }
    }
    
    // Close popover after selection
    setRetentionPopoverState({ arch: null, toothNumber: null })
  }

  const handleMaxillaryToothToggle = (toothNumber: number) => {
    const isAlreadySelected = maxillaryTeeth.includes(toothNumber)
    const isAdding = !isAlreadySelected

    // For Fixed Restoration: clicking an already selected tooth shows the popover without deselecting
    if (isFixedRestoration && isAlreadySelected) {
      setRetentionPopoverState({ arch: 'maxillary', toothNumber })
      return
    }

    // Update teeth selection
    setMaxillaryTeeth(prev => {
      const newTeeth = isAdding
        ? [...prev, toothNumber]
        : prev.filter(t => t !== toothNumber)

      return newTeeth
    })

    // Handle popovers and accordions AFTER state update is queued
    if (isAdding && isFixedRestoration) {
      setRetentionPopoverState({ arch: 'maxillary', toothNumber })
    } else if (isAdding && shouldShowImplantPopover) {
      setImplantPopoverState({ arch: 'maxillary', toothNumber })
    } else if (!isAdding) {
      setRetentionPopoverState({ arch: null, toothNumber: null })
      setImplantPopoverState({ arch: null, toothNumber: null })
    }

    // If adding a tooth, automatically open the accordion
    if (isAdding) {
      if (selectedProduct && showProductDetails) {
        setOpenAccordion("maxillary-card")
      } else {
        const maxillaryProducts = savedProducts.filter(p => p.maxillaryTeeth.length > 0)
        if (maxillaryProducts.length > 0) {
          const mostRecentProduct = maxillaryProducts[maxillaryProducts.length - 1]
          setOpenAccordion(mostRecentProduct.id)
        } else {
          setOpenAccordion("maxillary-card")
        }
      }
    }
  }

  const handleMandibularToothToggle = (toothNumber: number) => {
    const isAlreadySelected = mandibularTeeth.includes(toothNumber)
    const isAdding = !isAlreadySelected

    // For Fixed Restoration: clicking an already selected tooth shows the popover without deselecting
    if (isFixedRestoration && isAlreadySelected) {
      setRetentionPopoverState({ arch: 'mandibular', toothNumber })
      return
    }

    // Update teeth selection
    setMandibularTeeth(prev => {
      const newTeeth = isAdding
        ? [...prev, toothNumber]
        : prev.filter(t => t !== toothNumber)

      return newTeeth
    })

    // Handle popovers and accordions AFTER state update is queued
    if (isAdding && isFixedRestoration) {
      setRetentionPopoverState({ arch: 'mandibular', toothNumber })
    } else if (isAdding && shouldShowImplantPopover) {
      setImplantPopoverState({ arch: 'mandibular', toothNumber })
    } else if (!isAdding) {
      setRetentionPopoverState({ arch: null, toothNumber: null })
      setImplantPopoverState({ arch: null, toothNumber: null })
    }

    // If adding a tooth, automatically open the accordion
    if (isAdding) {
      if (selectedProduct && showProductDetails) {
        setOpenAccordion("mandibular-card")
      } else {
        const mandibularProducts = savedProducts.filter(p => p.mandibularTeeth.length > 0)
        if (mandibularProducts.length > 0) {
          const mostRecentProduct = mandibularProducts[mandibularProducts.length - 1]
          setOpenAccordion(mostRecentProduct.id)
        } else {
          setOpenAccordion("mandibular-card")
        }
      }
    }
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
          {showProductDetails ? (
            <Button
              onClick={handleBackToProducts}
              variant="ghost"
              className="text-[#1162a8] hover:text-[#0d4d87] hover:bg-[#dfeefb]"
            >
              ← Back to Products
            </Button>
          ) : showProducts && !showProductDetails ? (
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
        <div className="flex items-center justify-center gap-2">
          <p className="text-base font-bold text-black">CASE DESIGN CENTER</p>
          {/* Info Popover - Show when product is selected but no arch chosen */}
          {showProductDetails && selectedProduct && !showMaxillaryChart && !showMandibularChart && !isLoadingProductDetails && (
            <Popover open={showInfoPopover} onOpenChange={setShowInfoPopover}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-center animate-pulse"
                  style={{
                    width: "24px",
                    height: "24px",
                    cursor: "pointer",
                    background: "transparent",
                    border: "none",
                    borderRadius: "50%",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  aria-label="Information about product selection"
                >
                  <Info className="w-5 h-5 text-[#1162A8]" />
                </button>
              </PopoverTrigger>
              <PopoverContent 
                side="top" 
                align="center"
                className="w-96 p-4"
                style={{
                  background: "transparent",
                  border: "none",
                  boxShadow: "none",
                  padding: 0,
                }}
              >
                <div className="relative bg-orange-100 border border-orange-200 rounded-lg px-4 py-3 shadow-lg max-w-sm">
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-orange-100 border-r border-b border-orange-200 transform rotate-45"></div>
                  <p className="text-sm text-orange-800">
                    Please click <strong>"Add Upper Product"</strong> or <strong>"Add Lower Product"</strong> to proceed with tooth selection for the selected product.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-full" style={{ paddingBottom: "20px" }}>
        <div className="container mx-auto px-5 py-5" style={{ paddingBottom: "20px" }}>
          {/* Search and Category Selection */}
          <div className="flex flex-col items-center">
            {/* Search and Labels Row */}
            <div className="flex items-center w-full max-w-[1400px] gap-4">
              {/* Product Selection Badge - Show when product is selected and details are loaded */}
              {showProductDetails && selectedProduct && !isLoadingProductDetails && productDetails && (
                <div className="w-full">
                  <ProductSelectionBadge
                    product={selectedProduct}
                    onAddUpper={handleAddUpperProduct}
                    onAddLower={handleAddLowerProduct}
                    onDeleteUpper={handleDeleteUpperProduct}
                    onDeleteLower={handleDeleteLowerProduct}
                    hasMaxillaryProduct={!!selectedProductForMaxillary}
                    hasMandibularProduct={!!selectedProductForMandibular}
                    showMaxillaryChart={showMaxillaryChart}
                    showMandibularChart={showMandibularChart}
                  />
                </div>
              )}
              
            </div>

            {/* Unified Search Bar - Show in all views */}
            {!showProductDetails && (
              <div className="flex justify-center mb-4">
                <div className="relative max-w-[373px] w-full">
                  <Input
                    type="text"
                    placeholder="Search Products"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-[34px] pl-3 pr-10 border-[#b4b0b0] rounded"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-[#b4b0b0]" />
                </div>
              </div>
            )}

            {/* Product Search Results - Show when there's a search query, regardless of view */}
            {!showProductDetails && searchQuery.trim() && (
              <div className="w-full mb-6">
                {isSearchingProducts ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-gray-500">Searching products...</div>
                  </div>
                ) : productSearchResults.length === 0 ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="text-center">
                      <p className="text-gray-600">No products found matching "{searchQuery}"</p>
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

            {/* Product Category Cards - Show when no subcategories, products, or product details are shown, and no search query */}
            {!showSubcategories && !showProducts && !showProductDetails && !searchQuery.trim() && (
              <div className="w-full flex flex-col gap-4 mb-6">
                {/* Category Cards */}
                <div className="flex gap-4 justify-center">
                  {mainCategories.map((category: ProductCategoryApi) => {
                    const isSelected = selectedCategory === category.name
                    return (
                      <div
                        key={category.id}
                        onClick={() => handleCategorySelect(category)}
                        className={`bg-white border-2 ${isSelected ? "border-[#1162a8] shadow-lg" : "border-[#b4b0b0] hover:border-[#1162A8]"
                          } rounded-lg h-[220px] w-[200px] p-4 flex flex-col items-center justify-center gap-4 cursor-pointer hover:shadow-md transition-all`}
                      >
                        <div className="w-[150px] h-[150px] rounded overflow-hidden">
                          <img
                            src={category.image_url || getCategoryImage(category.name)}
                            alt={category.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = getCategoryImage(category.name)
                            }}
                          />
                        </div>
                        <p className="text-base text-black text-center">
                          {category.name}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Subcategory Cards - Show when category is selected and no search query */}
            {showSubcategories && !showProducts && !showProductDetails && !searchQuery.trim() && (
              <div className="w-full flex flex-col gap-4">
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
                        {searchQuery.trim()
                          ? `No subcategories found matching "${searchQuery}"`
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
                              } rounded-lg h-[220px] w-[200px] p-4 flex flex-col items-center justify-center gap-4 cursor-pointer hover:shadow-md transition-all flex-shrink-0`}
                          >
                            <div className="w-[150px] h-[150px] rounded overflow-hidden">
                              <img
                                src={subcategory.image_url || getSubcategoryImage(subcategory.sub_name || "")}
                                alt={subcategory.sub_name || ""}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = getSubcategoryImage(subcategory.sub_name || "")
                                }}
                              />
                            </div>
                            <p className="text-base text-black text-center">
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

            {/* Product Cards - Show when subcategory is selected and no search query */}
            {showProducts && !showProductDetails && !searchQuery.trim() && (
              <div className="w-full flex flex-col gap-4">
                {isLoadingProducts ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-gray-500">Loading products...</div>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <p className="text-gray-600 mb-4">
                        {searchQuery.trim()
                          ? `No products found matching "${searchQuery}"`
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
                              } rounded-lg h-[250px] w-[200px] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:shadow-md transition-all flex-shrink-0`}
                          >
                            <div className="w-[150px] h-[150px] rounded overflow-hidden">
                              <img
                                src={product.image_url || "/images/product-default.png"}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "/images/product-default.png"
                                }}
                              />
                            </div>
                            <p className="text-base text-black text-center">
                              {product.name}
                            </p>
                            <div className="flex flex-col gap-1 items-start w-[120px]">
                              <div className="bg-[rgba(17,98,168,0.2)] border border-[#1162a8] rounded-[10px] h-[20px] flex items-center justify-center w-full">
                                <p className="text-[#1162a8] text-xs">
                                  ${product.price || 999}
                                </p>
                              </div>
                              <div className="bg-[rgba(146,147,147,0.2)] border border-[#929393] rounded-[10px] h-[20px] flex items-center justify-center w-full">
                                <p className="text-[#929393] text-xs">
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
              <div ref={toothSelectionRef} className="w-full max-w-[1400px] mx-auto">
                {/* Tooth Shade Selection - Shows in the middle when active */}
                {currentShadeField && (
                  <div className="w-full mb-8">
                    <div className="flex items-center gap-4 w-full justify-center">
                      {/* Left side buttons */}
                      <div className="flex flex-col gap-5">
                        <button
                          onClick={() => {
                            console.log("Set as Stump shade")
                            setSelectedShadeOption("stump")
                            setCurrentShadeField(null)
                            setSelectedShadesForSVG([])
                          }}
                          className={`w-[224px] h-[78px] ${
                            selectedShadeOption === "stump"
                              ? "bg-[#DFEEFB] shadow-[0_1px_4px_rgba(17,98,168,0.7)]"
                              : "bg-white shadow-md"
                          } rounded-lg flex items-center justify-center hover:bg-[#DFEEFB] transition-colors`}
                        >
                          <span className="font-bold text-[15.5px] text-center leading-tight">
                            Set as Stump shades
                          </span>
                        </button>
                      </div>

                      {/* Shade guide SVG */}
                      <div className="bg-white">
                        <ToothShadeSelectionSVG
                          selectedShades={selectedShadesForSVG}
                          onShadeClick={handleShadeClickFromSVG}
                          className="max-w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tooth Selection Interface */}
                <div className={`grid gap-24 lg:gap-24 mb-8 ${showMaxillaryChart && showMandibularChart ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                  {/* MAXILLARY Section - Only show when maxillary chart is visible */}
                  {showMaxillaryChart && (
                  <div ref={maxillarySectionRef} className="flex flex-col w-full">
                    {/* Selected Product Badge */}
                    {selectedProductForMaxillary && (
                      <div
                        className="relative flex items-center justify-center"
                        style={{ width: "100%", height: "32px", flex: "none", order: 0, flexGrow: 0 }}
                      >
                        {/* Delete Button - Left Edge */}
                        <button
                          onClick={handleDeleteUpperProduct}
                          style={{
                            position: "absolute",
                            left: "0",
                            top: "0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "32px",
                            height: "32px",
                            background: "#DC2626",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            zIndex: 10,
                          }}
                          aria-label="Delete upper product"
                        >
                          <Trash2 className="h-4 w-4 text-white" />
                        </button>
                        
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
                              fontSize: "15px",
                              lineHeight: "22px",
                              textAlign: "center",
                              letterSpacing: "-0.02em",
                              color: "#000000",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis"
                            }}
                          >
                            {selectedProductForMaxillary.name}
                            {maxillaryTeeth && maxillaryTeeth.length > 0 && (
                              <>
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
                            )}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* MAXILLARY Label - Below Product Badge */}
                    <div className="flex items-center justify-center gap-3 mt-2 mb-2">
                      <p className="text-base font-bold text-black text-center" style={{ fontWeight: 700, letterSpacing: "0.01em" }}>MAXILLARY</p>
                    </div>

                    {/* Dental Chart - Outside Card */}
                    <div className="rounded-lg p-3 flex items-center justify-center relative">
                      {shouldShowImplantPopover && implantPopoverState.arch === 'maxillary' && implantPopoverState.toothNumber !== null && (
                        <ImplantPartsPopover
                          onImplantPartsIncluded={() => {
                            // Handle implant parts included action
                            setImplantPopoverState({ arch: null, toothNumber: null })
                          }}
                          onEnterManually={() => {
                            // Handle enter manually action
                            setImplantPopoverState({ arch: null, toothNumber: null })
                          }}
                        />
                      )}
                      {!currentShadeField && showMaxillaryChart && (
                        <MaxillaryTeethSVG
                          key={`maxillary-${maxillaryTeeth.join('-')}`}
                          selectedTeeth={maxillaryTeeth}
                          onToothClick={handleMaxillaryToothToggle}
                          className="max-w-full"
                          retentionTypesByTooth={maxillaryRetentionTypes}
                          showRetentionPopover={retentionPopoverState.arch === 'maxillary'}
                          retentionPopoverTooth={retentionPopoverState.toothNumber}
                          onSelectRetentionType={(tooth, type) => handleSelectRetentionType('maxillary', tooth, type)}
                          onClosePopover={() => setRetentionPopoverState({ arch: null, toothNumber: null })}
                        />
                      )}
                    </div>

                    {/* Missing Teeth Cards - Show immediately when product has extraction data, but only for Orthodontics or Removable Restoration */}
                    {showMaxillaryChart && selectedProductForMaxillary && !missingTeethCardClicked && productDetails && isOrthodonticsOrRemovable && (
                      (() => {
                        const hasExtractionData = (productDetails.extractions && Array.isArray(productDetails.extractions) && productDetails.extractions.length > 0) ||
                                                  (productDetails.data?.extractions && Array.isArray(productDetails.data.extractions) && productDetails.data.extractions.length > 0)
                        return hasExtractionData ? (
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
                              productDetails={productDetails}
                              extractionData={productDetails.extractions || productDetails.data?.extractions}
                              productId={selectedProductForMaxillary.id?.toString()}
                              selectedProduct={selectedProductForMaxillary.name}
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
                        ) : null
                      })()
                    )}

                    {/* Summary Card - Single card for all selected teeth */}
                    {showMaxillaryChart && maxillaryTeeth.length > 0 && (
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
                              {/* Delete Button - Moved outside AccordionTrigger to avoid nested buttons */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleClearCurrentProduct()
                                }}
                                className="hover:text-red-600 transition-colors"
                                style={{
                                  position: 'absolute',
                                  width: '16px',
                                  height: '16px',
                                  color: '#999999',
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  right: '34px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  zIndex: 11
                                }}
                              >
                                <Trash2 className="w-full h-full" />
                              </button>
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
                                {/* Dynamic Fields - Rendered based on productDetails */}
                                {productDetails && (
                                  <>
                                    <DynamicProductFields
                                      productDetails={productDetails}
                                      savedProduct={{
                                        maxillaryMaterial,
                                        maxillaryRetention,
                                        maxillaryStumpShade,
                                        maxillaryToothShade,
                                        maxillaryStage,
                                        maxillaryMaterialId,
                                        maxillaryRetentionId,
                                        maxillaryRetentionOptionId,
                                        maxillaryGumShadeId,
                                        maxillaryShadeId,
                                        maxillaryStageId,
                                      }}
                                      arch="maxillary"
                                      fieldConfigs={fieldConfigs}
                                      onFieldChange={(fieldKey, value, id) => {
                                        handleFieldChange(fieldKey, value, id, undefined, "maxillary")
                                      }}
                                      maxillaryRetentionTypes={maxillaryRetentionTypes}
                                      mandibularRetentionTypes={mandibularRetentionTypes}
                                      maxillaryTeeth={maxillaryTeeth}
                                      mandibularTeeth={mandibularTeeth}
                                      onOpenImpressionModal={() => {
                                        if (selectedProduct) {
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
                                            addedFrom: "maxillary",
                                          }
                                          handleOpenImpressionModal(tempProduct, "maxillary")
                                        }
                                      }}
                                      getImpressionCount={() => {
                                        if (!selectedProduct || !productDetails?.impressions) return 0
                                        const productId = selectedProduct.id.toString()
                                        return productDetails.impressions.reduce((sum: number, impression: any) => {
                                          const key = `${productId}_maxillary_${impression.value || impression.name}`
                                          return sum + (selectedImpressions[key] || 0)
                                        }, 0)
                                      }}
                                      onOpenShadeModal={(fieldKey) => {
                                        handleOpenShadeModal(fieldKey, "maxillary")
                                      }}
                                    />
                                    
                                    {/* Advance Fields - Shown only after all required fields are filled */}
                                    {productDetails && 
                                     productDetails.advance_fields && 
                                     Array.isArray(productDetails.advance_fields) && 
                                     productDetails.advance_fields.length > 0 &&
                                     areAllRequiredFieldsFilled("maxillary") && (
                                      <div
                                        className="flex flex-col gap-5"
                                  style={{
                                    display: 'flex',
                                          flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    padding: '0px',
                                    gap: '20px',
                                    flex: 'none',
                                    alignSelf: 'stretch',
                                          flexGrow: 0,
                                          marginTop: '2px'
                                        }}
                                      >
                                        <div className="w-full">
                                          <div className="flex flex-wrap gap-4" style={{ gap: '16px' }}>
                                            {productDetails.advance_fields.map((field: any) => {
                                              const fieldKey = `advance_${field.id}`
                                              const currentValue = advanceFieldValues[fieldKey] || ""
                                              
                                              // Calculate width based on field type and content
                                              const getFieldWidth = (): { minWidth: string; maxWidth: string; width: string; flex: string } => {
                                                if (field.field_type === "multiline_text") {
                                                  return { minWidth: "100%", maxWidth: "100%", width: "100%", flex: "1 1 100%" }
                                                }
                                                
                                                // Radio and checkbox fields need more width to display options
                                                if (field.field_type === "radio" || field.field_type === "checkbox") {
                                                  const minWidth = 250
                                                  const maxWidth = "48%"
                                                  return { 
                                                    minWidth: `${minWidth}px`, 
                                                    maxWidth, 
                                                    width: `${minWidth}px`, 
                                                    flex: '1 1 auto' 
                                                  }
                                                }
                                                
                                                // For other fields, calculate based on content
                                                const displayValue = typeof currentValue === "object" 
                                                  ? currentValue?.advance_field_value || ""
                                                  : currentValue || ""
                                                
                                                // Get the longest possible value for width calculation
                                                let longestText = field.name || ""
                                                if ((field.field_type === "dropdown" || field.field_type === "radio" || field.field_type === "checkbox") && field.options) {
                                                  // Find longest option name
                                                  const longestOption = field.options.reduce((longest: any, opt: any) => {
                                                    return (opt.name?.length || 0) > (longest?.name?.length || 0) ? opt : longest
                                                  }, { name: "" })
                                                  longestText = longestOption.name || longestText
                                                } else if (displayValue) {
                                                  longestText = displayValue
                                                }
                                                
                                                // Calculate width: min 200px, max 48% (for side-by-side), base on content
                                                const minWidth = 200
                                                const maxWidth = "48%"
                                                // Estimate width: ~8px per character + padding (60px) + some buffer
                                                const estimatedWidth = Math.max(minWidth, Math.min(500, longestText.length * 8 + 80))
                                                
                                                return { 
                                                  minWidth: `${minWidth}px`, 
                                                  maxWidth, 
                                                  width: `${estimatedWidth}px`, 
                                                  flex: '1 1 auto' 
                                                }
                                              }
                                              
                                              const fieldWidth = getFieldWidth()
                                              
                                              // Check if field is required and value is "Not specified" or empty
                                              const isFieldRequired = field.is_required === "Yes" || field.is_required === true
                                              const displayValue = typeof currentValue === "object" 
                                                ? currentValue?.advance_field_value || ""
                                                : currentValue || ""
                                              
                                              // For checkbox fields, check if at least one option is selected
                                              let isEmptyOrNotSpecified = false
                                              if (field.field_type === "checkbox") {
                                                const currentSelectedIds = typeof currentValue === "object" 
                                                  ? (Array.isArray(currentValue?.option_ids) ? currentValue.option_ids : 
                                                     currentValue?.option_id ? [currentValue.option_id] : [])
                                                  : []
                                                isEmptyOrNotSpecified = currentSelectedIds.length === 0
                                              } else {
                                                isEmptyOrNotSpecified = !displayValue || 
                                                  displayValue.trim() === "" || 
                                                  displayValue.trim().toLowerCase() === "not specified" ||
                                                  (field.field_type === "dropdown" && displayValue === `Select ${field.name}`)
                                              }
                                              
                                              const showRedBorder = isFieldRequired && isEmptyOrNotSpecified
                                              
                                              // Render based on field_type
                                              const renderAdvanceField = () => {
                                                // Dropdown field
                                                if (field.field_type === "dropdown" && field.options && Array.isArray(field.options)) {
                                                  // Get current selected option
                                                  const currentOptionId = typeof currentValue === "object" 
                                                    ? currentValue?.option_id?.toString() 
                                                    : currentValue?.toString() || ""
                                                  
                                                  // Filter active options only
                                                  const activeOptions = field.options.filter((opt: any) => opt.status === "Active" || opt.status === undefined)
                                                  
                                                  // If only one option and no value is set, auto-select it
                                                  if (!currentOptionId && activeOptions.length === 1) {
                                                    const singleOption = activeOptions[0]
                                                    setTimeout(() => {
                                                      setAdvanceFieldValues(prev => ({
                                                        ...prev,
                                                        [fieldKey]: {
                                                          advance_field_id: field.id,
                                                          advance_field_value: singleOption.name,
                                                          option_id: singleOption.id
                                                        }
                                                      }))
                                                    }, 0)
                                                  }
                                                  
                                                  // Find default option if no value is set and more than one option
                                                  const defaultOption = !currentOptionId && activeOptions.length > 1
                                                    ? activeOptions.find((opt: any) => 
                                                        opt.is_default === "Yes" || opt.is_default === true
                                                      )
                                                    : null
                                                  
                                                  const selectedOptionId = currentOptionId || defaultOption?.id?.toString() || ""
                                                  const selectedOption = activeOptions.find((opt: any) => opt.id?.toString() === selectedOptionId)
                                                  
                                                  // Auto-select default if exists and no value is set
                                                  if (defaultOption && !currentOptionId && activeOptions.length > 1) {
                                                    setTimeout(() => {
                                                      setAdvanceFieldValues(prev => ({
                                                        ...prev,
                                                        [fieldKey]: {
                                                          advance_field_id: field.id,
                                                          advance_field_value: defaultOption.name,
                                                          option_id: defaultOption.id
                                                        }
                                                      }))
                                                    }, 0)
                                                  }
                                                  
                                                  return (
                                                      <Select
                                                      value={selectedOptionId}
                                                      onValueChange={(value) => {
                                                        const selectedOption = activeOptions.find((opt: any) => opt.id?.toString() === value)
                                                        setAdvanceFieldValues(prev => ({
                                                          ...prev,
                                                          [fieldKey]: selectedOption ? {
                                                            advance_field_id: field.id,
                                                            advance_field_value: selectedOption.name,
                                                            option_id: selectedOption.id
                                                          } : null
                                                        }))
                                                      }}
                                                    >
                                                      <SelectTrigger
                                                        className="h-[37px] mt-[5.27px] rounded-[7.7px] text-[14.4px] font-normal"
                                      style={{
                                        padding: '12px 15px 5px 15px',
                                        gap: '5px',
                                        background: '#FFFFFF',
                                        border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                        boxSizing: 'border-box',
                                                          minWidth: fieldWidth.minWidth,
                                                          maxWidth: fieldWidth.maxWidth,
                                                          width: fieldWidth.width,
                                                          flex: fieldWidth.flex,
                                                        }}
                                                      >
                                                        <SelectValue placeholder={`Select ${field.name}`}>
                                                          {selectedOption ? selectedOption.name : `Select ${field.name}`}
                                                        </SelectValue>
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        {activeOptions
                                                          .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
                                                          .map((option: any) => (
                                                            <SelectItem key={option.id} value={option.id.toString()}>
                                                              {option.name}
                                                            </SelectItem>
                                                          ))}
                                                      </SelectContent>
                                                    </Select>
                                                  )
                                                }
                                                
                                                // Text field
                                                if (field.field_type === "text") {
                                                  return (
                                                    <Input
                                                      type="text"
                                                      value={typeof currentValue === "object" ? currentValue?.advance_field_value || "" : currentValue || ""}
                                                      onChange={(e) => {
                                                        setAdvanceFieldValues(prev => ({
                                                          ...prev,
                                                          [fieldKey]: {
                                                            advance_field_id: field.id,
                                                            advance_field_value: e.target.value
                                                          }
                                                        }))
                                                      }}
                                                      className="mt-[5.27px] rounded-[7.7px] text-[14.4px]"
                                      style={{
                                                        padding: '12px 15px 5px 15px',
                                                        minHeight: '80px',
                                                        border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                        minWidth: fieldWidth.minWidth,
                                                        maxWidth: fieldWidth.maxWidth,
                                                        width: fieldWidth.width,
                                                        flex: fieldWidth.flex,
                                                      }}
                                                      placeholder={`Enter ${field.name}`}
                                                    />
                                                  )
                                                }
                                                
                                                // Number field
                                                if (field.field_type === "number") {
                                                  return (
                                                    <Input
                                                      type="number"
                                                      value={typeof currentValue === "object" ? currentValue?.advance_field_value || "" : currentValue || ""}
                                                      onChange={(e) => {
                                                        setAdvanceFieldValues(prev => ({
                                                          ...prev,
                                                          [fieldKey]: {
                                                            advance_field_id: field.id,
                                                            advance_field_value: e.target.value
                                                          }
                                                        }))
                                                      }}
                                                      className="h-[37px] mt-[5.27px] rounded-[7.7px] text-[14.4px]"
                                        style={{
                                                        padding: '12px 15px 5px 15px',
                                                        border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                        minWidth: fieldWidth.minWidth,
                                                        maxWidth: fieldWidth.maxWidth,
                                                        width: fieldWidth.width,
                                                        flex: fieldWidth.flex,
                                                      }}
                                                      placeholder={`Enter ${field.name}`}
                                                    />
                                                  )
                                                }
                                                
                                                // Multiline text (textarea)
                                                if (field.field_type === "multiline_text") {
                                                  return (
                                                    <Textarea
                                                      value={typeof currentValue === "object" ? currentValue?.advance_field_value || "" : currentValue || ""}
                                                      onChange={(e) => {
                                                        setAdvanceFieldValues(prev => ({
                                                          ...prev,
                                                          [fieldKey]: {
                                                            advance_field_id: field.id,
                                                            advance_field_value: e.target.value
                                                          }
                                                        }))
                                                      }}
                                                      className="mt-[5.27px] rounded-[7.7px] text-[14.4px]"
                                      style={{
                                                        padding: '12px 15px 5px 15px',
                                                        minHeight: '80px',
                                                        minWidth: fieldWidth.minWidth,
                                                        maxWidth: fieldWidth.maxWidth,
                                                        width: fieldWidth.width,
                                                        flex: fieldWidth.flex,
                                                      }}
                                                      placeholder={`Enter ${field.name}`}
                                                    />
                                                  )
                                                }
                                                
                                                // Radio field
                                                if (field.field_type === "radio" && field.options && Array.isArray(field.options)) {
                                                  const activeOptions = field.options.filter((opt: any) => opt.status === "Active" || opt.status === undefined)
                                                  const currentOptionId = typeof currentValue === "object" 
                                                    ? currentValue?.option_id?.toString() 
                                                    : currentValue?.toString() || ""
                                                  
                                                  // Find default option if no value is set
                                                  const defaultOption = !currentOptionId
                                                    ? activeOptions.find((opt: any) => 
                                                        opt.is_default === "Yes" || opt.is_default === true
                                                      )
                                                    : null
                                                  
                                                  const selectedOptionId = currentOptionId || defaultOption?.id?.toString() || ""
                                                  
                                                  // Auto-select default if exists and no value is set
                                                  if (defaultOption && !currentOptionId) {
                                                    setTimeout(() => {
                                                      setAdvanceFieldValues(prev => ({
                                                        ...prev,
                                                        [fieldKey]: {
                                                          advance_field_id: field.id,
                                                          advance_field_value: defaultOption.name,
                                                          option_id: defaultOption.id
                                                        }
                                                      }))
                                                    }, 0)
                                                  }
                                                  
                                                  return (
                                                    <div 
                                                      className="mt-[5.27px] rounded-[7.7px]"
                                                      style={{
                                                        padding: '12px 15px 5px 15px',
                                                        minHeight: '37px',
                                                        background: '#FFFFFF',
                                                        border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                        minWidth: fieldWidth.minWidth,
                                                        maxWidth: fieldWidth.maxWidth,
                                                        width: fieldWidth.width,
                                                        flex: fieldWidth.flex,
                                                      }}
                                                    >
                                                      <RadioGroup
                                                        value={selectedOptionId}
                                                        onValueChange={(value) => {
                                                          const selectedOption = activeOptions.find((opt: any) => opt.id?.toString() === value)
                                                          setAdvanceFieldValues(prev => ({
                                                            ...prev,
                                                            [fieldKey]: selectedOption ? {
                                                              advance_field_id: field.id,
                                                              advance_field_value: selectedOption.name,
                                                              option_id: selectedOption.id
                                                            } : null
                                                          }))
                                                        }}
                                                        className="space-y-2"
                                                      >
                                                        {activeOptions
                                                          .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
                                                          .map((option: any) => (
                                                            <div key={option.id} className="flex items-center space-x-2">
                                                              <RadioGroupItem value={option.id.toString()} id={`${fieldKey}-${option.id}`} />
                                                              <Label 
                                                                htmlFor={`${fieldKey}-${option.id}`}
                                                                className="text-[14.4px] font-normal cursor-pointer"
                                                              >
                                                                {option.name}
                                                              </Label>
                                                            </div>
                                                          ))}
                                                      </RadioGroup>
                                                    </div>
                                                  )
                                                }
                                                
                                                // Checkbox field (multiple selection)
                                                if (field.field_type === "checkbox" && field.options && Array.isArray(field.options)) {
                                                  const activeOptions = field.options.filter((opt: any) => opt.status === "Active" || opt.status === undefined)
                                                  
                                                  // For checkbox, value can be an array of selected option IDs
                                                  const currentSelectedIds = typeof currentValue === "object" 
                                                    ? (Array.isArray(currentValue?.option_ids) ? currentValue.option_ids : 
                                                       currentValue?.option_id ? [currentValue.option_id] : [])
                                                    : []
                                                  
                                                  const handleCheckboxChange = (optionId: number, checked: boolean) => {
                                                    setAdvanceFieldValues(prev => {
                                                      const current = prev[fieldKey]
                                                      const currentIds = typeof current === "object" 
                                                        ? (Array.isArray(current?.option_ids) ? current.option_ids : 
                                                           current?.option_id ? [current.option_id] : [])
                                                        : []
                                                      
                                                      let newIds: number[]
                                                      if (checked) {
                                                        newIds = [...currentIds, optionId]
                                                      } else {
                                                        newIds = currentIds.filter((id: number) => id !== optionId)
                                                      }
                                                      
                                                      // Get selected option names
                                                      const selectedOptions = activeOptions.filter((opt: any) => newIds.includes(opt.id))
                                                      const optionNames = selectedOptions.map((opt: any) => opt.name).join(", ")
                                                      
                                                      return {
                                                        ...prev,
                                                        [fieldKey]: {
                                                          advance_field_id: field.id,
                                                          advance_field_value: optionNames || "",
                                                          option_ids: newIds
                                                        }
                                                      }
                                                    })
                                                  }
                                                  
                                                  return (
                                                    <div 
                                                      className="mt-[5.27px] rounded-[7.7px]"
                                                      style={{
                                                        padding: '12px 15px 5px 15px',
                                                        minHeight: '37px',
                                                        background: '#FFFFFF',
                                                        border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                        minWidth: fieldWidth.minWidth,
                                                        maxWidth: fieldWidth.maxWidth,
                                                        width: fieldWidth.width,
                                                        flex: fieldWidth.flex,
                                                      }}
                                                    >
                                                      <div className="space-y-2">
                                                        {activeOptions
                                                          .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
                                                          .map((option: any) => (
                                                            <div key={option.id} className="flex items-center space-x-2">
                                                              <Checkbox
                                                                id={`${fieldKey}-${option.id}`}
                                                                checked={currentSelectedIds.includes(option.id)}
                                                                onCheckedChange={(checked) => handleCheckboxChange(option.id, checked === true)}
                                                                className="border-gray-400"
                                                              />
                                                              <Label 
                                                                htmlFor={`${fieldKey}-${option.id}`}
                                                                className="text-[14.4px] font-normal cursor-pointer"
                                                              >
                                                                {option.name}
                                                              </Label>
                                                            </div>
                                                          ))}
                                                      </div>
                                                    </div>
                                                  )
                                                }
                                                
                                                // File upload field
                                                if (field.field_type === "file_upload") {
                                                  const currentFile = typeof currentValue === "object" && currentValue?.file 
                                                    ? currentValue.file 
                                                    : null
                                                  
                                                  return (
                                                    <div 
                                                      className="mt-[5.27px] rounded-[7.7px]"
                                                      style={{
                                                        padding: '12px 15px 5px 15px',
                                                        minHeight: '37px',
                                                        background: '#FFFFFF',
                                                        border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                        minWidth: fieldWidth.minWidth,
                                                        maxWidth: fieldWidth.maxWidth,
                                                        width: fieldWidth.width,
                                                        flex: fieldWidth.flex,
                                                      }}
                                                    >
                                                      <input
                                                        type="file"
                                                        onChange={(e) => {
                                                          const file = e.target.files?.[0] || null
                                                          setAdvanceFieldValues(prev => ({
                                                            ...prev,
                                                            [fieldKey]: {
                                                              advance_field_id: field.id,
                                                              advance_field_value: file?.name || "",
                                                              file: file
                                                            }
                                                          }))
                                                        }}
                                                        className="text-[14.4px] w-full"
                                                        accept=".jpg,.jpeg,.png,.gif,.svg,.pdf,.stl,.mp4,.avi,.mov,.zip,.rar"
                                                      />
                                                      {currentFile && (
                                                        <div className="mt-2 text-xs text-gray-600">
                                                          Selected: {currentFile.name}
                                                        </div>
                                                      )}
                                                    </div>
                                                  )
                                                }
                                                
                                                // Shade guide field
                                                if (field.field_type === "shade_guide") {
                                                  return (
                                                    <Input
                                                      type="text"
                                                      value={typeof currentValue === "object" ? currentValue?.advance_field_value || "" : currentValue || ""}
                                                      onChange={(e) => {
                                                        setAdvanceFieldValues(prev => ({
                                                          ...prev,
                                                          [fieldKey]: {
                                                            advance_field_id: field.id,
                                                            advance_field_value: e.target.value
                                                          }
                                                        }))
                                                      }}
                                                      className="h-[37px] mt-[5.27px] rounded-[7.7px] text-[14.4px]"
                                                      style={{
                                                        padding: '12px 15px 5px 15px',
                                                        border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                        minWidth: fieldWidth.minWidth,
                                                        maxWidth: fieldWidth.maxWidth,
                                                        width: fieldWidth.width,
                                                        flex: fieldWidth.flex,
                                                      }}
                                                      placeholder={`Enter ${field.name}`}
                                                    />
                                                  )
                                                }
                                                
                                                // Implant library field
                                                if (field.field_type === "implant_library") {
                                                  return (
                                                    <Input
                                                      type="text"
                                                      value={typeof currentValue === "object" ? currentValue?.advance_field_value || "" : currentValue || ""}
                                                      onChange={(e) => {
                                                        setAdvanceFieldValues(prev => ({
                                                          ...prev,
                                                          [fieldKey]: {
                                                            advance_field_id: field.id,
                                                            advance_field_value: e.target.value
                                                          }
                                                        }))
                                                      }}
                                                      className="h-[37px] mt-[5.27px] rounded-[7.7px] text-[14.4px]"
                                                      style={{
                                                        padding: '12px 15px 5px 15px',
                                                        border: showRedBorder ? '0.740384px solid #ef4444' : '0.740384px solid #7F7F7F',
                                                        minWidth: fieldWidth.minWidth,
                                                        maxWidth: fieldWidth.maxWidth,
                                                        width: fieldWidth.width,
                                                        flex: fieldWidth.flex,
                                                      }}
                                                      placeholder={`Enter ${field.name}`}
                                                    />
                                                  )
                                                }
                                                
                                                // Default: display field name
                                                return (
                                    <div
                                      className="flex items-center"
                                      style={{
                                                      padding: '12px 15px 5px 15px',
                                        gap: '5px',
                                        width: '100%',
                                                      minHeight: '37px',
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
                                                    }}>
                                                      {field.name || field.description || "Advanced Field"} ({field.field_type})
                                                    </span>
                                    </div>
                                                )
                                              }
                                              
                                              return (
                                                <div 
                                                  key={field.id} 
                                                  className="relative" 
                                                  style={{ 
                                                    minHeight: '43px',
                                                    minWidth: fieldWidth.minWidth,
                                                    maxWidth: fieldWidth.maxWidth,
                                                    width: fieldWidth.width,
                                                    flex: fieldWidth.flex,
                                                  }}
                                                >
                                                  {renderAdvanceField()}
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
                                                    {field.name || "Advanced Field"}
                                                    {field.is_required === "Yes" && (
                                                      <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                                                    )}
                                    </label>
                                  </div>
                                              )
                                            })}
                                </div>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}

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

                              {/* Action Buttons - Only show if advance fields are showing */}
                              {productDetails && 
                               productDetails.advance_fields && 
                               Array.isArray(productDetails.advance_fields) && 
                               productDetails.advance_fields.length > 0 &&
                               areAllRequiredFieldsFilled("maxillary") && (
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
                                    Add ons ({getTotalAddOnsCount} selected)
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
                                    Attach Files ({getAttachedFilesCount()} uploads)
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
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </Card>
                    )}

                    {/* Saved Maxillary Products - Display below MAXILLARY section */}
                    {showMaxillaryChart && savedProducts.filter(p => p.addedFrom === "maxillary").length > 0 && (
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

                            const productDetails = savedProduct.productDetails
                            const archType: "maxillary" | "mandibular" = "maxillary"
                            const categoryLower = savedProduct.category.toLowerCase()
                            const isFixedRestoration = categoryLower.includes("fixed")
                            const isRemovableOrOrtho = categoryLower.includes("removable") ||
                                                       categoryLower.includes("orthodontic") ||
                                                       categoryLower.includes("ortho")

                            return (
                              <Card
                                key={savedProduct.id}
                                className="overflow-hidden shadow-sm"
                                style={{
                                  border: savedProduct.rushData ? '1px solid #CF0202' : '1px solid #e5e7eb',
                                  borderRadius: '10px'
                                }}
                              >
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
                                        background: savedProduct.rushData ? '#FFE2E2' : (openAccordion === savedProduct.id ? '#DFEEFB' : '#F5F5F5'),
                                        boxShadow: savedProduct.rushData ? '0.9px 0.9px 3.6px 0 rgba(0, 0, 0, 0.25)' : '0.9px 0.9px 3.6px rgba(0, 0, 0, 0.25)',
                                        borderRadius: openAccordion === savedProduct.id ? '5.4px 5.4px 0px 0px' : '10px',
                                        border: savedProduct.rushData ? '1px solid #CF0202' : 'none',
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
                                              <div style={{ position: 'absolute', width: 'auto', height: '20px', left: '0px', top: '0px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                                {/* Rush Icon Indicator */}
                                                {savedProduct.rushData && (
                                                  <Zap
                                                    style={{
                                                      width: '16px',
                                                      height: '16px',
                                                      color: '#CF0202',
                                                      fill: '#CF0202',
                                                      flexShrink: 0
                                                    }}
                                                  />
                                                )}
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

                                                {/* Badge - Stage */}
                                                {savedProduct.maxillaryStage && (
                                                  <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 10px', gap: '10px', width: 'fit-content', height: '17px', background: '#F9F9F9', boxShadow: '1px 1px 3.5px rgba(0, 0, 0, 0.25)', borderRadius: '6px', flex: 'none', order: 2, flexGrow: 0 }}>
                                                    <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', flex: 'none', order: 0, flexGrow: 0 }}>{savedProduct.maxillaryStage}</span>
                                                  </div>
                                                )}

                                                {/* Est days */}
                                                <span style={{ width: 'auto', height: '22px', fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', letterSpacing: '-0.02em', color: '#B4B0B0', flex: 'none', order: 4, flexGrow: 0 }}>
                                                  Est days: {savedProduct.product.estimated_days || 10} work days after submission
                                                </span>
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
                                      {/* Delete Button - Moved outside AccordionTrigger to avoid nested buttons */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteProduct(savedProduct.id)
                                        }}
                                        className="hover:text-red-600 transition-colors"
                                        style={{
                                          position: 'absolute',
                                          width: '16px',
                                          height: '16px',
                                          color: '#999999',
                                          background: 'transparent',
                                          border: 'none',
                                          cursor: 'pointer',
                                          right: '34px',
                                          top: '50%',
                                          transform: 'translateY(-50%)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          zIndex: 11
                                        }}
                                      >
                                        <Trash2 className="w-full h-full" />
                                      </button>
                                    </div>

                                    <AccordionContent className="pt-0" style={{ position: 'relative', minHeight: 'auto' }}>
                                      {/* Summary detail - Progressive field disclosure */}
                                      <div
                                        className="bg-white w-full"
                                        style={{
                                          position: 'relative',
                                          height: 'auto',
                                          minHeight: 'auto',
                                          marginTop: '10px',
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
                                        {/* Field 1: Product - Material (always visible) */}
                                        {isFieldVisible("product_material", savedProduct.id, savedProduct, productDetails, archType) && (
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
                                            <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
                                              <div
                                                className="flex items-center"
                                                style={{
                                                  padding: '12px 15px 5px 15px',
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
                                                }}>{savedProduct.maxillaryMaterial || 'Select'}</span>
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
                                          </div>
                                        )}

                                        {/* Field 2: Retention (Fixed Restoration only, visible after Product/Material) */}
                                        {isFixedRestoration && isFieldVisible("retention", savedProduct.id, savedProduct, productDetails, archType) && (
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
                                            <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
                                              <div
                                                className="flex items-center"
                                                style={{
                                                  padding: '12px 15px 5px 15px',
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
                                                }}>{savedProduct.maxillaryRetention || 'Select'}</span>
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
                                                {hasValidRetentionValue(savedProduct.maxillaryRetention) ? 'Retention type' : 'Select Retention type'}
                                              </label>
                                            </div>
                                          </div>
                                        )}

                                        {/* Field 3: Implant (if configured, visible after previous field) */}
                                        {isFieldVisible("implant", savedProduct.id, savedProduct, productDetails, archType) && (
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
                                            <div className="relative flex-1 min-w-[250px] max-w-[100%]" style={{ minHeight: '43px' }}>
                                              <div
                                                className="flex items-start"
                                                style={{
                                                  padding: '12px 15px 5px 15px',
                                                  gap: '5px',
                                                  width: '100%',
                                                  minHeight: '37px',
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
                                                Implant Details
                                              </label>
                                            </div>
                                          </div>
                                        )}

                                        {/* Field 4: Grade (Removables/Ortho only, visible after Implant) */}
                                        {isRemovableOrOrtho && isFieldVisible("grade", savedProduct.id, savedProduct, productDetails, archType) && (
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
                                            <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
                                              <div
                                                className="flex items-center"
                                                style={{
                                                  padding: '12px 15px 5px 15px',
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
                                                }}>{savedProduct.maxillaryMaterial || 'Select'}</span>
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
                                                Grade
                                              </label>
                                            </div>
                                          </div>
                                        )}

                                        {/* Field 5: Stump Shade (Fixed Restoration only, advance field, visible after Implant) */}
                                        {isFixedRestoration && isFieldVisible("stump_shade", savedProduct.id, savedProduct, productDetails, archType) && (() => {
                                          // Check if stump_shade exists as an advance field
                                          const advanceFields = productDetails?.advance_fields || productAdvanceFields[savedProduct.id] || []
                                          const stumpShadeField = getAdvanceFieldByName("stump_shade", advanceFields)
                                          
                                          // If stump_shade exists as an advance field, render it using advance field logic
                                          if (stumpShadeField) {
                                            return (
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
                                                {renderSavedAdvanceField(stumpShadeField, savedProduct, archType)}
                                              </div>
                                            )
                                          }
                                          
                                          // Otherwise, render the hardcoded stump shade (backward compatibility)
                                          return (
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
                                              <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                                <div
                                                  className="flex items-center justify-between"
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
                                                  }}>{getShadeDisplayText(
                                                    savedProduct.maxillaryStumpShade,
                                                    savedProduct.maxillaryGumShadeId,
                                                    savedProduct.maxillaryGumShadeBrand,
                                                    "stump_shade",
                                                    productDetails
                                                  )}</span>
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
                                            </div>
                                          )
                                        })()}

                                        {/* Field 6: Crown Third Shade (Fixed Restoration only, advance field, visible after Stump Shade) */}
                                        {isFixedRestoration && isFieldVisible("crown_third_shade", savedProduct.id, savedProduct, productDetails, archType) && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 5,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
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
                                                Crown Third Shade
                                              </label>
                                            </div>
                                          </div>
                                        )}

                                        {/* Field 7: Tooth Shade (Fixed Restoration) or Teeth Shade (Removables/Ortho) */}
                                        {isFieldVisible(isFixedRestoration ? "tooth_shade" : "teeth_shade", savedProduct.id, savedProduct, productDetails, archType) && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 6,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                              <div
                                                className="flex items-center justify-between"
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
                                                }}>{getShadeDisplayText(
                                                  savedProduct.maxillaryToothShade,
                                                  savedProduct.maxillaryShadeId,
                                                  savedProduct.maxillaryShadeBrand,
                                                  "tooth_shade",
                                                  productDetails
                                                )}</span>
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
                                                {isFixedRestoration ? "Tooth Shade" : "Teeth Shade"}
                                              </label>
                                            </div>
                                          </div>
                                        )}

                                        {/* Field 8: Gum Shade (Removables/Ortho only, visible after Teeth Shade) */}
                                        {isRemovableOrOrtho && isFieldVisible("gum_shade", savedProduct.id, savedProduct, productDetails, archType) && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 7,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
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
                                                Gum Shade
                                              </label>
                                            </div>
                                          </div>
                                        )}

                                        {/* Field 9: Stage (visible after previous field) */}
                                        {isFieldVisible("stage", savedProduct.id, savedProduct, productDetails, archType) && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 8,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                              <div
                                                className="flex items-center"
                                                style={{
                                                  padding: '12px 15px 5px 15px',
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
                                                }}>{savedProduct.maxillaryStage || 'Finish'}</span>
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
                                        )}

                                        {/* Field 10: Pontic Design (Fixed Restoration only, advance field, visible after Stage) */}
                                        {isFixedRestoration && isFieldVisible("pontic_design", savedProduct.id, savedProduct, productDetails, archType) && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 9,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
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
                                                }}>{savedProduct.maxillaryPonticDesign || 'Not specified'}</span>
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
                                          </div>
                                        )}

                                        {/* Field 11: Embrasures (Fixed Restoration only, advance field, visible after Pontic Design) */}
                                        {isFixedRestoration && isFieldVisible("embrasures", savedProduct.id, savedProduct, productDetails, archType) && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 10,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
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
                                                }}>{savedProduct.maxillaryEmbrasure || 'Not specified'}</span>
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
                                          </div>
                                        )}

                                        {/* Field 12: Occlusal Contact (Fixed Restoration only, advance field, visible after Embrasures) */}
                                        {isFixedRestoration && isFieldVisible("occlusal_contact", savedProduct.id, savedProduct, productDetails, archType) && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 11,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
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
                                                }}>{savedProduct.maxillaryOcclusalContact || 'Not specified'}</span>
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
                                          </div>
                                        )}

                                        {/* Field 13: Interproximal Contact (Fixed Restoration only, advance field, visible after Occlusal Contact) */}
                                        {isFixedRestoration && isFieldVisible("interproximal_contact", savedProduct.id, savedProduct, productDetails, archType) && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 12,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
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
                                                }}>{savedProduct.maxillaryProximalContact || 'Not specified'}</span>
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
                                        )}

                                        {/* Field 14: Gap (Fixed Restoration only, advance field, visible after Interproximal Contact) */}
                                        {isFixedRestoration && isFieldVisible("gap", savedProduct.id, savedProduct, productDetails, archType) && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 13,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
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
                                                }}>{savedProduct.maxillaryGap || 'Not specified'}</span>
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
                                                Gap
                                              </label>
                                            </div>
                                          </div>
                                        )}

                                        {/* Field 15: Impressions (visible after previous field) */}
                                        {isFieldVisible(isFixedRestoration ? "impressions" : "impression", savedProduct.id, savedProduct, productDetails, archType) && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 13,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
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
                                                }}>{savedProduct.maxillaryImpression || 'Not specified'}</span>
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
                                                {isFixedRestoration ? "Impressions" : "Impression"}
                                              </label>
                                            </div>
                                          </div>
                                        )}

                                        {/* Field 15: Add ons (always shown last, visible after Impressions) */}
                                        {isFieldVisible("add_ons", savedProduct.id, savedProduct, productDetails, archType) && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 14,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            {/* Add ons button will be rendered separately below */}
                                          </div>
                                        )}

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
                                            order: 1,
                                            alignSelf: 'stretch',
                                            flexGrow: 0
                                          }}
                                        >
                                          {/* Stump Shade */}
                                          {(() => {
                                            // Check if stump_shade exists as an advance field
                                            const productDetails = savedProduct.productDetails
                                            const advanceFields = productDetails?.advance_fields || productAdvanceFields[savedProduct.id] || []
                                            const stumpShadeField = getAdvanceFieldByName("stump_shade", advanceFields)
                                            
                                            // If stump_shade exists as an advance field, render it using advance field logic
                                            if (stumpShadeField) {
                                              return renderSavedAdvanceField(stumpShadeField, savedProduct, "maxillary")
                                            }
                                            
                                            // Otherwise, render the hardcoded stump shade (backward compatibility)
                                            return (
                                              <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                                <div
                                                  className="flex items-center justify-between"
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
                                                  }}>{getShadeDisplayText(
                                                    savedProduct.maxillaryStumpShade,
                                                    savedProduct.maxillaryGumShadeId,
                                                    savedProduct.maxillaryGumShadeBrand,
                                                    "stump_shade",
                                                    productDetails
                                                  )}</span>
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
                                            )
                                          })()}

                                          {/* Tooth Shade */}
                                          <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                            <div
                                              className="flex items-center justify-between"
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
                                                padding: '12px 15px 5px 15px',
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
                                        )}

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

                                      {/* Action Buttons - Only show if advance fields are showing */}
                                      {(() => {
                                        const productDetails = savedProduct.productDetails
                                        const advanceFields = productDetails?.advance_fields || productAdvanceFields[savedProduct.id] || []
                                        const hasAdvanceFields = advanceFields && Array.isArray(advanceFields) && advanceFields.length > 0
                                        const allFieldsFilled = savedProduct.maxillaryMaterial && savedProduct.maxillaryRetention && savedProduct.maxillaryToothShade && savedProduct.maxillaryStage
                                        return hasAdvanceFields && allFieldsFilled && (showAdvanceFields[savedProduct.id] || (savedProduct.maxillaryMaterial && savedProduct.maxillaryRetention))
                                      })() && (
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
                                            Add ons ({getTotalAddOnsCount} selected)
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
                                            Attach Files ({getAttachedFilesCount()} uploads)
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
                                      )}
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              </Card>
                            )
                          })}
                      </div>
                    )}
                  </div>
                  )}

                  {/* MANDIBULAR Section - Only show when mandibular chart is visible */}
                  {showMandibularChart && (
                  <div ref={mandibularSectionRef} className="flex flex-col w-full">
                    {/* Selected Product Badge */}
                    {selectedProductForMandibular && (
                      <div
                        className="relative flex items-center justify-center"
                        style={{ width: "100%", height: "32px", flex: "none", order: 0, flexGrow: 0 }}
                      >
                        {/* Delete Button - Right Edge */}
                        <button
                          onClick={handleDeleteLowerProduct}
                          style={{
                            position: "absolute",
                            right: "0",
                            top: "0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "32px",
                            height: "32px",
                            background: "#DC2626",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            zIndex: 10,
                          }}
                          aria-label="Delete lower product"
                        >
                          <Trash2 className="h-4 w-4 text-white" />
                        </button>
                        
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
                              fontSize: "15px",
                              lineHeight: "22px",
                              textAlign: "center",
                              letterSpacing: "-0.02em",
                              color: "#000000",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis"
                            }}
                          >
                            {selectedProductForMandibular.name}
                            {mandibularTeeth && mandibularTeeth.length > 0 && (
                              <>
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
                            )}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* MANDIBULAR Label - Below Product Badge */}
                    <div className="flex items-center justify-center gap-3 mt-2 mb-2">
                      <p className="text-base font-bold text-black text-center" style={{ fontWeight: 700, letterSpacing: "0.01em" }}>MANDIBULAR</p>
                    </div>

                    {/* Dental Chart - Outside Card */}
                    <div className="rounded-lg p-3 flex items-center justify-center relative">
                      {shouldShowImplantPopover && implantPopoverState.arch === 'mandibular' && implantPopoverState.toothNumber !== null && (
                        <ImplantPartsPopover
                          onImplantPartsIncluded={() => {
                            // Handle implant parts included action
                            setImplantPopoverState({ arch: null, toothNumber: null })
                          }}
                          onEnterManually={() => {
                            // Handle enter manually action
                            setImplantPopoverState({ arch: null, toothNumber: null })
                          }}
                        />
                      )}
                      {!currentShadeField && showMandibularChart && (
                        <MandibularTeethSVG
                          key={`mandibular-${mandibularTeeth.join('-')}`}
                          selectedTeeth={mandibularTeeth}
                          onToothClick={handleMandibularToothToggle}
                          className="max-w-full"
                          retentionTypesByTooth={mandibularRetentionTypes}
                          showRetentionPopover={retentionPopoverState.arch === 'mandibular'}
                          retentionPopoverTooth={retentionPopoverState.toothNumber}
                          onSelectRetentionType={(tooth, type) => handleSelectRetentionType('mandibular', tooth, type)}
                          onClosePopover={() => setRetentionPopoverState({ arch: null, toothNumber: null })}
                        />
                      )}
                    </div>

                    {/* Missing Teeth Cards - Show immediately when product has extraction data, but only for Orthodontics or Removable Restoration */}
                    {showMandibularChart && selectedProductForMandibular && !missingTeethCardClicked && productDetails && isOrthodonticsOrRemovable && (
                      (() => {
                        const hasExtractionData = (productDetails.extractions && Array.isArray(productDetails.extractions) && productDetails.extractions.length > 0) ||
                                                  (productDetails.data?.extractions && Array.isArray(productDetails.data.extractions) && productDetails.data.extractions.length > 0)
                        return hasExtractionData ? (
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
                              productDetails={productDetails}
                              extractionData={productDetails.extractions || productDetails.data?.extractions}
                              productId={selectedProductForMandibular.id?.toString()}
                              selectedProduct={selectedProductForMandibular.name}
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
                        ) : null
                      })()
                    )}

                    {/* Summary Card - Single card for all selected teeth */}
                    {showMandibularChart && mandibularTeeth.length > 0 && (
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
                              {/* Delete Button - Moved outside AccordionTrigger to avoid nested buttons */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleClearCurrentProduct()
                                }}
                                className="hover:text-red-600 transition-colors"
                                style={{
                                  position: 'absolute',
                                  width: '16px',
                                  height: '16px',
                                  color: '#999999',
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  right: '34px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  zIndex: 11
                                }}
                              >
                                <Trash2 className="w-full h-full" />
                              </button>
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
                                        padding: '12px 15px 5px 15px',
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

                                  {/* Retention Type - Only show if retention type selected from popover */}
                                  {(() => {
                                    // Create a temporary saved product object to check retention types
                                    const tempProduct: SavedProduct = {
                                      id: "mandibular-card",
                                      product: selectedProduct || { id: 0, name: "" },
                                      productDetails: productDetails,
                                      category: selectedCategory || "",
                                      categoryId: selectedCategoryId || 0,
                                      subcategory: selectedSubcategory || "",
                                      subcategoryId: selectedSubcategoryId || 0,
                                      maxillaryTeeth: [],
                                      mandibularTeeth: mandibularTeeth,
                                      maxillaryMaterial: "",
                                      maxillaryStumpShade: "",
                                      maxillaryRetention: "",
                                      maxillaryNotes: "",
                                      mandibularMaterial: "",
                                      mandibularRetention: "",
                                      mandibularImplantDetails: "",
                                      createdAt: Date.now(),
                                      addedFrom: "mandibular"
                                    }
                                    return hasRetentionTypeSelected(tempProduct, "mandibular")
                                  })() && (
                                    <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
                                      <div
                                        className="flex items-center"
                                        style={{
                                          padding: '12px 15px 5px 15px',
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
                                        }}>{mandibularRetention || 'Select'}</span>
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
                                        {hasValidRetentionValue(mandibularRetention) ? 'Retention type' : 'Select Retention type'}
                                      </label>
                                    </div>
                                  )}
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
                                        padding: '12px 15px 5px 15px',
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

                                {/* Row 3: Pontic Design, Embrasures, Occlusal Contact, Interproximal Contact, Gap */}
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
                                  <div className="relative flex-1 min-w-[150px] max-w-[19%]" style={{ minHeight: '43px' }}>
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
                                  <div className="relative flex-1 min-w-[150px] max-w-[19%]" style={{ minHeight: '43px' }}>
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
                                  <div className="relative flex-1 min-w-[150px] max-w-[19%]" style={{ minHeight: '43px' }}>
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
                                  <div className="relative flex-1 min-w-[150px] max-w-[19%]" style={{ minHeight: '43px' }}>
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

                                  {/* Gap */}
                                  {selectedProduct && isFieldVisible("gap", String(selectedProduct.id), {} as SavedProduct, productDetails, currentShadeArch) && (
                                    <div className="relative flex-1 min-w-[150px] max-w-[19%]" style={{ minHeight: '43px' }}>
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
                                        }}>{currentShadeArch === "maxillary" ? (savedProducts.find(p => String(p.id) === String(selectedProduct.id))?.maxillaryGap || "Not specified") : (savedProducts.find(p => String(p.id) === String(selectedProduct.id))?.mandibularGap || "Not specified")}</span>
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
                                        Gap
                                      </label>
                                    </div>
                                  )}
                                </div>

                                {/* Row 4: Impression */}
                                {(() => {
                                  // Create a temporary saved product object to check visibility
                                  const tempProduct: SavedProduct = {
                                    id: "mandibular-card",
                                    product: selectedProduct || { id: 0, name: "" },
                                    productDetails: productDetails,
                                    category: selectedCategory || "",
                                    categoryId: selectedCategoryId || 0,
                                    subcategory: selectedSubcategory || "",
                                    subcategoryId: selectedSubcategoryId || 0,
                                    maxillaryTeeth: [],
                                    mandibularTeeth: mandibularTeeth,
                                    maxillaryMaterial: "",
                                    maxillaryStumpShade: "",
                                    maxillaryRetention: "",
                                    maxillaryNotes: "",
                                    mandibularMaterial: mandibularMaterial,
                                    mandibularRetention: mandibularRetention,
                                    mandibularImplantDetails: "",
                                    mandibularToothShade: mandibularToothShade,
                                    mandibularStage: mandibularStage,
                                    createdAt: Date.now(),
                                    addedFrom: "mandibular"
                                  }
                                  return isFieldVisible(isFixedRestoration ? "impressions" : "impression", tempProduct.id, tempProduct, productDetails, "mandibular")
                                })() && (
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
                                )}
                              </div>

                              {/* Action Buttons - Only show if advance fields are showing */}
                              {productDetails && 
                               productDetails.advance_fields && 
                               Array.isArray(productDetails.advance_fields) && 
                               productDetails.advance_fields.length > 0 &&
                               areAllRequiredFieldsFilled("mandibular") && (
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
                                    Add ons ({getTotalAddOnsCount} selected)
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
                                    Attach Files ({getAttachedFilesCount()} uploads)
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
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </Card>
                    )}

                    {/* Saved Mandibular Products - Display below MANDIBULAR section */}
                    {showMandibularChart && savedProducts.filter(p => p.addedFrom === "mandibular").length > 0 && (
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

                            const productDetails = savedProduct.productDetails
                            const archType: "maxillary" | "mandibular" = "mandibular"
                            const categoryLower = savedProduct.category.toLowerCase()
                            const isFixedRestoration = categoryLower.includes("fixed")
                            const isRemovableOrOrtho = categoryLower.includes("removable") ||
                                                       categoryLower.includes("orthodontic") ||
                                                       categoryLower.includes("ortho")

                            return (
                              <Card
                                key={savedProduct.id}
                                className="overflow-hidden shadow-sm"
                                style={{
                                  border: savedProduct.rushData ? '1px solid #CF0202' : '1px solid #e5e7eb',
                                  borderRadius: '10px'
                                }}
                              >
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
                                        background: savedProduct.rushData ? '#FFE2E2' : (openAccordion === savedProduct.id ? '#DFEEFB' : '#F5F5F5'),
                                        boxShadow: savedProduct.rushData ? '0.9px 0.9px 3.6px 0 rgba(0, 0, 0, 0.25)' : '0.9px 0.9px 3.6px rgba(0, 0, 0, 0.25)',
                                        borderRadius: openAccordion === savedProduct.id ? '5.4px 5.4px 0px 0px' : '10px',
                                        border: savedProduct.rushData ? '1px solid #CF0202' : 'none',
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
                                              <div style={{ position: 'absolute', width: 'auto', height: '20px', left: '0px', top: '0px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                                {/* Rush Icon Indicator */}
                                                {savedProduct.rushData && (
                                                  <Zap
                                                    style={{
                                                      width: '16px',
                                                      height: '16px',
                                                      color: '#CF0202',
                                                      fill: '#CF0202',
                                                      flexShrink: 0
                                                    }}
                                                  />
                                                )}
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

                                                {/* Badge - Stage */}
                                                {savedProduct.mandibularStage && (
                                                  <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px 10px', gap: '10px', width: 'fit-content', height: '17px', background: '#F9F9F9', boxShadow: '1px 1px 3.5px rgba(0, 0, 0, 0.25)', borderRadius: '6px', flex: 'none', order: 2, flexGrow: 0 }}>
                                                    <span style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', textAlign: 'center', letterSpacing: '-0.02em', color: '#000000', flex: 'none', order: 0, flexGrow: 0 }}>{savedProduct.mandibularStage}</span>
                                                  </div>
                                                )}

                                                {/* Est days */}
                                                <span style={{ width: 'auto', height: '22px', fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 400, fontSize: '10px', lineHeight: '22px', letterSpacing: '-0.02em', color: '#B4B0B0', flex: 'none', order: 4, flexGrow: 0 }}>
                                                  Est days: {savedProduct.product.estimated_days || 10} work days after submission
                                                </span>
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
                                      {/* Delete Button - Moved outside AccordionTrigger to avoid nested buttons */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteProduct(savedProduct.id)
                                        }}
                                        className="hover:text-red-600 transition-colors"
                                        style={{
                                          position: 'absolute',
                                          width: '16px',
                                          height: '16px',
                                          color: '#999999',
                                          background: 'transparent',
                                          border: 'none',
                                          cursor: 'pointer',
                                          right: '34px',
                                          top: '50%',
                                          transform: 'translateY(-50%)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          zIndex: 11
                                        }}
                                      >
                                        <Trash2 className="w-full h-full" />
                                      </button>
                                    </div>

                                    <AccordionContent className="pt-0" style={{ position: 'relative', minHeight: 'auto' }}>
                                      {/* Summary detail - Progressive field disclosure */}
                                      <div
                                        className="bg-white w-full"
                                        style={{
                                          position: 'relative',
                                          height: 'auto',
                                          minHeight: 'auto',
                                          marginTop: '10px',
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
                                        {/* Field 1: Product - Material (always visible) */}
                                        {isFieldVisible("product_material", savedProduct.id, savedProduct, productDetails, archType) && (
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
                                            <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
                                              <div
                                                className="flex items-center"
                                                style={{
                                                  padding: '12px 15px 5px 15px',
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
                                                }}>{savedProduct.mandibularMaterial || 'Select'}</span>
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
                                          </div>
                                        )}

                                        {/* Field 2: Retention (Fixed Restoration only, visible after Product/Material) */}
                                        {isFixedRestoration && isFieldVisible("retention", savedProduct.id, savedProduct, productDetails, archType) && (
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
                                            <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
                                              <div
                                                className="flex items-center"
                                                style={{
                                                  padding: '12px 15px 5px 15px',
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
                                                }}>{savedProduct.mandibularRetention || 'Select'}</span>
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
                                                {hasValidRetentionValue(savedProduct.mandibularRetention) ? 'Retention type' : 'Select Retention type'}
                                              </label>
                                            </div>
                                          </div>
                                        )}

                                        {/* Field 3: Implant (if configured, visible after previous field) */}
                                        {isFieldVisible("implant", savedProduct.id, savedProduct, productDetails, archType) && (
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
                                            <div className="relative flex-1 min-w-[250px] max-w-[100%]" style={{ minHeight: '43px' }}>
                                              <div
                                                className="flex items-start"
                                                style={{
                                                  padding: '12px 15px 5px 15px',
                                                  gap: '5px',
                                                  width: '100%',
                                                  minHeight: '37px',
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
                                                }}>{savedProduct.mandibularImplantDetails || 'Not specified'}</span>
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

                                        {/* Field 4: Grade (Removables/Ortho only, visible after Implant) */}
                                        {isRemovableOrOrtho && isFieldVisible("grade", savedProduct.id, savedProduct, productDetails, archType) && (
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
                                            <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
                                              <div
                                                className="flex items-center"
                                                style={{
                                                  padding: '12px 15px 5px 15px',
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
                                                }}>{savedProduct.mandibularMaterial || 'Select'}</span>
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
                                                Grade
                                              </label>
                                            </div>
                                          </div>
                                        )}

                                        {/* Field 5: Stump Shade (Fixed Restoration only, advance field, visible after Implant) */}
                                        {isFixedRestoration && isFieldVisible("stump_shade", savedProduct.id, savedProduct, productDetails, archType) && (() => {
                                          // Check if stump_shade exists as an advance field
                                          const advanceFields = productDetails?.advance_fields || productAdvanceFields[savedProduct.id] || []
                                          const stumpShadeField = getAdvanceFieldByName("stump_shade", advanceFields)
                                          
                                          // If stump_shade exists as an advance field, render it using advance field logic
                                          if (stumpShadeField) {
                                            return (
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
                                                {renderSavedAdvanceField(stumpShadeField, savedProduct, archType)}
                                              </div>
                                            )
                                          }
                                          
                                          // Otherwise, render the hardcoded stump shade (backward compatibility)
                                          return (
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
                                              <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                                <div
                                                  className="flex items-center justify-between"
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
                                                  }}>{getShadeDisplayText(
                                                    savedProduct.maxillaryStumpShade,
                                                    savedProduct.maxillaryGumShadeId,
                                                    savedProduct.maxillaryGumShadeBrand,
                                                    "stump_shade",
                                                    productDetails
                                                  )}</span>
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
                                            </div>
                                          )
                                        })()}

                                        {/* Field 6: Crown Third Shade (Fixed Restoration only, advance field, visible after Stump Shade) */}
                                        {isFixedRestoration && isFieldVisible("crown_third_shade", savedProduct.id, savedProduct, productDetails, archType) && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 5,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
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
                                                Crown Third Shade
                                              </label>
                                            </div>
                                          </div>
                                        )}

                                        {/* Field 7: Tooth Shade (Fixed Restoration) or Teeth Shade (Removables/Ortho) */}
                                        {isFieldVisible(isFixedRestoration ? "tooth_shade" : "teeth_shade", savedProduct.id, savedProduct, productDetails, archType) && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 6,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                              <div
                                                className="flex items-center justify-between"
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
                                                }}>{getShadeDisplayText(
                                                  savedProduct.mandibularToothShade,
                                                  savedProduct.mandibularShadeId,
                                                  savedProduct.mandibularShadeBrand,
                                                  "tooth_shade",
                                                  productDetails
                                                )}</span>
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
                                                {isFixedRestoration ? "Tooth Shade" : "Teeth Shade"}
                                              </label>
                                            </div>
                                          </div>
                                        )}

                                        {/* Field 8: Gum Shade (Removables/Ortho only, visible after Teeth Shade) */}
                                        {isRemovableOrOrtho && isFieldVisible("gum_shade", savedProduct.id, savedProduct, productDetails, archType) && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 7,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
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
                                                Gum Shade
                                              </label>
                                            </div>
                                          </div>
                                        )}

                                        {/* Field 9: Stage (visible after previous field) */}
                                        {isFieldVisible("stage", savedProduct.id, savedProduct, productDetails, archType) && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 8,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
                                              <div
                                                className="flex items-center"
                                                style={{
                                                  padding: '12px 15px 5px 15px',
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
                                                }}>{savedProduct.mandibularStage || 'Finish'}</span>
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
                                        )}

                                        {/* Field 10: Pontic Design (Fixed Restoration only, advance field, visible after Stage) */}
                                        {isFixedRestoration && isFieldVisible("pontic_design", savedProduct.id, savedProduct, productDetails, archType) && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 9,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
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
                                                }}>{savedProduct.mandibularPonticDesign || 'Not specified'}</span>
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
                                          </div>
                                        )}

                                        {/* Field 11: Embrasures (Fixed Restoration only, advance field, visible after Pontic Design) */}
                                        {isFixedRestoration && isFieldVisible("embrasures", savedProduct.id, savedProduct, productDetails, archType) && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 10,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
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
                                                }}>{savedProduct.mandibularEmbrasure || 'Not specified'}</span>
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
                                          </div>
                                        )}

                                        {/* Field 12: Occlusal Contact (Fixed Restoration only, advance field, visible after Embrasures) */}
                                        {isFixedRestoration && isFieldVisible("occlusal_contact", savedProduct.id, savedProduct, productDetails, archType) && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 11,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
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
                                                }}>{savedProduct.mandibularOcclusalContact || 'Not specified'}</span>
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
                                          </div>
                                        )}

                                        {/* Field 13: Interproximal Contact (Fixed Restoration only, advance field, visible after Occlusal Contact) */}
                                        {isFixedRestoration && isFieldVisible("interproximal_contact", savedProduct.id, savedProduct, productDetails, archType) && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 12,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
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
                                                }}>{savedProduct.mandibularProximalContact || 'Not specified'}</span>
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
                                        )}

                                        {/* Field 14: Gap (Fixed Restoration only, advance field, visible after Interproximal Contact) */}
                                        {isFixedRestoration && isFieldVisible("gap", savedProduct.id, savedProduct, productDetails, archType) && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 13,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: '43px' }}>
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
                                                }}>{savedProduct.mandibularGap || 'Not specified'}</span>
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
                                                Gap
                                              </label>
                                            </div>
                                          </div>
                                        )}

                                        {/* Field 15: Impressions (visible after previous field) */}
                                        {isFieldVisible(isFixedRestoration ? "impressions" : "impression", savedProduct.id, savedProduct, productDetails, archType) && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 13,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            <div className="relative flex-1 min-w-[250px] max-w-[48%]" style={{ minHeight: '43px' }}>
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
                                                }}>{savedProduct.mandibularImpression || 'Not specified'}</span>
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
                                                {isFixedRestoration ? "Impressions" : "Impression"}
                                              </label>
                                            </div>
                                          </div>
                                        )}

                                        {/* Field 15: Add ons (always shown last, visible after Impressions) */}
                                        {isFieldVisible("add_ons", savedProduct.id, savedProduct, productDetails, archType) && (
                                          <div
                                            className="flex flex-col sm:flex-row flex-wrap gap-5"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              alignItems: 'flex-start',
                                              padding: '0px',
                                              gap: '20px',
                                              flex: 'none',
                                              order: 14,
                                              alignSelf: 'stretch',
                                              flexGrow: 0
                                            }}
                                          >
                                            {/* Add ons button will be rendered separately below */}
                                          </div>
                                        )}

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
                  )}
                </div>

                {/* Case Summary Notes - Expandable and Responsive - Hidden initially */}
                {showCaseSummaryNotes && (
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
                )}
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

          {/* Saved Products Section */}
          <SavedProductsSection
            savedProducts={savedProducts}
            selectedCategory={selectedCategory}
            showProductDetails={showProductDetails}
            openAccordion={openAccordion}
            handleAccordionChange={handleAccordionChange}
            handleDeleteProduct={handleDeleteProduct}
            handleSavedProductCardClick={handleSavedProductCardClick}
            isAccordionFieldVisible={isAccordionFieldVisible}
            getAdvanceFieldByName={getAdvanceFieldByName}
            renderSavedAdvanceField={renderSavedAdvanceField}
            productAdvanceFields={productAdvanceFields}
            openStageDropdown={openStageDropdown}
            setOpenStageDropdown={setOpenStageDropdown}
            handleStageSelect={handleStageSelect}
            showAdvanceFields={showAdvanceFields}
            getTotalAddOnsCount={getTotalAddOnsCount}
            getAttachedFilesCount={getAttachedFilesCount}
            setCurrentProductForModal={setCurrentProductForModal}
            setCurrentArchForModal={setCurrentArchForModal}
            setShowAddOnsModal={setShowAddOnsModal}
            maxillaryRetentionTypes={maxillaryRetentionTypes}
            mandibularRetentionTypes={mandibularRetentionTypes}
            setShowAttachModal={setShowAttachModal}
            setShowRushModal={setShowRushModal}
          />

          {/* Footer - Consistent across all pages */}
          <FooterSection
            showProductDetails={showProductDetails}
            isSubmitting={isSubmitting}
            confirmDetailsChecked={confirmDetailsChecked}
            showSubmitPopover={showSubmitPopover}
            isAccordionComplete={isAccordionComplete}
            onCancel={handleCancel}
            onPreview={handlePreview}
            onShowCancelModal={() => setShowCancelModal(true)}
            onSubmit={handleSubmit}
            onConfirmDetailsChange={(checked) => setConfirmDetailsChecked(checked)}
            onShowSubmitPopoverChange={(show) => setShowSubmitPopover(show)}
            hasProductAccordions={
              (showMaxillaryChart && maxillaryTeeth.length > 0) ||
              (showMandibularChart && mandibularTeeth.length > 0) ||
              savedProducts.length > 0
            }
          />
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
            doctorName={selectedDoctor ? `${selectedDoctor.first_name} ${selectedDoctor.last_name}` : undefined}
            patientName={patientData?.name}
            savedProducts={savedProducts}
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

      {/* Impression Selection Modal */}
      {currentProductForImpression && productDetails && (
        <ImpressionSelectionModal
          isOpen={showImpressionModal}
          onClose={() => {
            setShowImpressionModal(false)
            setCurrentProductForImpression(null)
            // Update saved product with impression selections when modal closes
            if (currentProductForImpression && productDetails?.impressions) {
              const impressions = productDetails.impressions || []
              const maxillaryImpressions = getImpressionSelections(
                currentProductForImpression.id,
                "maxillary",
                impressions
              )
              const mandibularImpressions = getImpressionSelections(
                currentProductForImpression.id,
                "mandibular",
                impressions
              )
              
              setSavedProducts((prev) =>
                prev.map((product) =>
                  product.id === currentProductForImpression.id
                    ? {
                        ...product,
                        maxillaryImpressions: maxillaryImpressions.length > 0 ? maxillaryImpressions : undefined,
                        mandibularImpressions: mandibularImpressions.length > 0 ? mandibularImpressions : undefined,
                      }
                    : product
                )
              )
            }
          }}
          impressions={(productDetails.impressions || []).map((imp: any) => ({
            id: imp.id,
            name: imp.name,
            code: imp.code,
            description: imp.description,
            image_url: imp.image_url,
            value: imp.value || imp.name,
            label: imp.label || imp.name,
          }))}
          selectedImpressions={selectedImpressions}
          onUpdateQuantity={handleImpressionQuantityUpdate}
          onRemoveImpression={handleImpressionRemove}
          productId={currentProductForImpression.id}
          arch={currentImpressionArch}
        />
      )}

      {/* Tooth Shade Selection Modal */}
      {currentShadeField && (
        <ToothShadeSelectionModal
          isOpen={showShadeModal}
          onClose={() => {
            setShowShadeModal(false)
            setCurrentShadeField(null)
          }}
          shades={
            productDetails
              ? (currentShadeField === "tooth_shade"
                  ? (productDetails.teeth_shades || [])
                  : (productDetails.gum_shades || []))
              : []
          }
          selectedShadeId={
            currentShadeArch === "maxillary"
              ? (currentShadeField === "tooth_shade"
                  ? maxillaryShadeId
                  : maxillaryGumShadeId)
              : (currentShadeField === "tooth_shade"
                  ? mandibularShadeId
                  : mandibularGumShadeId)
          }
          onSelectShade={handleShadeSelect}
          fieldType={currentShadeField}
          title={
            currentShadeField === "tooth_shade"
              ? "Select Tooth Shade"
              : "Select Stump Shade"
          }
          productId={selectedProduct?.id}
          arch={currentShadeArch}
        />
      )}

    </div>
  )
}

