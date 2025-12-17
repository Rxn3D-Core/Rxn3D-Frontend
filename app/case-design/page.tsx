"use client"
// @ts-nocheck
import { Button } from "@/components/ui/button"
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Paperclip, Zap, Trash2, Calendar, Check, ClipboardList, Clipboard, GitFork, X, FileText, Menu, ChevronsRight, ChevronsLeft } from 'lucide-react'
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import Image from "next/image"
// Dynamic imports for heavy components
import { 
  FileAttachmentModalContent,
  RushRequestModal,
  AddOnsModal,
  StageNotesModal,
  DashboardSidebar
} from "@/lib/code-splitting"
import AddSlipFlowModal from "@/components/add-slip-modal"
import CaseHeaderDisplay from "@/components/case-header-display"
import CSDSection from "@/components/case-design-center-section"
import { StagesProvider } from "@/contexts/product-stages-context"
import { GradesProvider } from "@/contexts/product-grades-context"
import SubmitCaseWarningModal from "@/components/submit-case-warning-modal"
import PrintDriverTagsModal from "@/components/print-driver-tags-modal"
import PrintLabelsPreviewModal from "@/components/print-labels-preview-modal"
import PrintStatementModal from "@/components/print-statement-modal"
import DriverHistoryModal from "@/components/driver-history-modal"
import CallLogModal from "@/components/call-log-modal"
import ColorfulActionButtons from "@/components/colorful-action-buttons"
import AddSlipHeader from "@/components/add-slip-header"
import CancelSubmissionWarningModal from "@/components/cancel-submission-warning-modal"
import { useSlipStore } from "@/stores/slipStore"
import { useTeethSelectionStore } from "@/stores/teeth-selection-store"
import DentalSlipPage from "@/dental-slip-page"
import { useSlipCreation } from "@/contexts/slip-creation-context"
import { getCompleteTeethShadeString } from "@/utils/teeth-shade-utils" // already imported
import { useToast } from "@/hooks/use-toast"
import { Header } from "@/components/header"
import dynamic from 'next/dynamic'
import { useQueryClient } from '@tanstack/react-query'
import { useCreateSlip } from '@/components/api-hooks'
import { TeethShadeSelectionModal } from "@/lib/code-splitting"
import { FullPreloadStatus } from "@/components/3d-model-preload-status"
import { usePersistedState, clearPersistedStatePattern } from "@/hooks/use-persisted-state"
import LoadingOverlay from "@/components/ui/loading-overlay"

// Define the ProductConfiguration interface
interface ProductConfiguration {
  restoration: string
  productName: string // Renamed from 'product' to avoid conflict with Product interface 'name'
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
  impression: string
  impressions?: { id: number; name: string; qty: number }[]
  extractions?: { extraction_id: number; teeth_numbers: number[]; notes?: string }[]
}

// Define the Product interface (re-defined here for self-containment, or could be imported from a shared types file)
interface Product {
  id: string
  name: string // This is the overall product name (e.g., "Metal Frame Acrylic")
  type: string // e.g., "Maxillary", "Mandibular", "Maxillary, Mandibular"
  teeth: string // e.g., "#4, #5, #6"
  deliveryDate: string
  image: string
  abbreviation: string
  color: string
  borderColor: string
  addOns: { category: string; addOn: string; qty: number }[]
  stageNotesContent: string // Added field for generated stage notes

  // New: Separate configurations for each arch
  maxillaryConfig: ProductConfiguration
  mandibularConfig: ProductConfiguration

  // --- Pass all dropdown fields for use in CSDSection ---
  category_name?: string
  subcategory_name?: string
  category_id?: number
  subcategory_id?: number
  grades?: any[]
  stages?: any[]
  productTeethShades?: any[] // Add this field for teeth shades
  productGumShades?: any[] // Add this field for gum shades

  // Optional: per-arch teeth selections
  maxillaryTeeth?: string
  mandibularTeeth?: string
  
  // Extractions data
  extractions?: { extraction_id: number; teeth_numbers: number[]; notes?: string }[]
}
// Define the Note interface (copied from dental-slip-page.tsx)
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

// Define a type for the dropdown visibility state for a single arch
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

// Add prop for setAddSlipModalInitialStep
interface CaseDesignCenterSectionProps {
  setAddSlipModalInitialStep?: (step: 1 | 2 | 3) => void
}

const initialNotes: Note[] = [
  {
    id: "1",
    date: "01/03/15",
    time: "7:26pm",
    author: "Maria Gonzales",
    content: "Please rush case. Belen confirmed 1/13 delivery. Please call if there are any questions",
    attachments: 0,
    slipNumber: "123456",
    stage: "Try in with teeth",
    deliveryDate: "01/13/2025 @ 4pm",
    isRush: true,
  },
  {
    id: "2",
    date: "01/01/15",
    time: "8:02pm",
    author: "Dr Cody Mugglestone",
    content:
      "Fabricate a Mid Grade Metal Frame Acrylic for Maxillary & Mandibular teeth #4, #5, #6, #26, #27, and #28, in Try in with teeth stage, using VITA A1 shade and St. George - Light Vein gum, with 1x STL impression, and Add-on gold teeth on #4, #5,and #26. Rush case for 01/15/2025 delivery.",
    attachments: 1,
    slipNumber: "123456",
    stage: "Try in with teeth",
    deliveryDate: "01/13/2025 @ 4pm",
    isRush: true,
  },
  {
    id: "3",
    date: "01/03/15",
    time: "2:10pm",
    author: "Horacio Oliva",
    content: "Please fabricate metal framework with bite block. Send back on 01/08. See attached photo for reference.",
    attachments: 1,
    slipNumber: "123456",
    stage: "Bite Block",
    deliveryDate: "01/08/2025 @ 4pm",
    isRush: false,
  },
  {
    id: "4",
    date: "01/03/15",
    time: "2:07pm",
    author: "Nizam Nizam",
    content: "Please send scan of occluding bite. Case will be sent for shipping on 01/04.",
    attachments: 0,
    slipNumber: "123456",
    stage: "Bite Block",
    deliveryDate: "01/08/2025 @ 4pm",
    isRush: false,
  },
  {
    id: "5",
    date: "01/02/15",
    time: "2:07pm",
    author: "Belen Merida-Cortes",
    content: "Spoke with Greciaa, office requested for this case to be rushed. Horacio approved rush request.",
    attachments: 0,
    slipNumber: "123456",
    stage: "Try in with teeth",
    deliveryDate: "01/13/2025 @ 4pm",
    isRush: true,
  },
]

// Add the loading dots component at the top of the file
function LoadingDots() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="flex flex-col items-center space-y-4">
        <div className="flex space-x-2">
          <div
            className="w-3 h-3 rounded-full animate-bounce [animation-delay:-0.3s]"
            style={{ backgroundColor: "rgb(17, 98, 168)" }}
          ></div>
          <div
            className="w-3 h-3 rounded-full animate-bounce [animation-delay:-0.15s]"
            style={{ backgroundColor: "rgb(17, 98, 168)" }}
          ></div>
          <div
            className="w-3 h-3 rounded-full animate-bounce"
            style={{ backgroundColor: "rgb(17, 98, 168)" }}
          ></div>
        </div>
        <p className="text-gray-600 text-sm text-center">Loading case design...</p>
      </div>
    </div>
  )
}

// Utility to get default grade from product
function getDefaultGrade(product: any) {
  if (!product.grades || product.grades.length === 0) return "";
  const defaultGrade = product.grades.find((g: any) => g.is_default === "Yes");
  return defaultGrade ? defaultGrade.name : product.grades[0].name;
}

// Utility to get default stage (first stage)
function getDefaultStage(product: any) {
  return product.stages && product.stages.length > 0 ? product.stages[0].name : "";
}

const InteractiveDentalChart3D = dynamic(
  () => import('@/components/interactive-dental-chart-3D'),
  { ssr: false }
)

const PrintPreviewModal = dynamic(
  () => import('@/components/print-preview-modal'),
  { ssr: false }
);

export default function CaseDesignCenterSection({ setAddSlipModalInitialStep }: CaseDesignCenterSectionProps) {
  const router = useRouter()
  const { toast } = useToast()
  // Use Zustand store for slip data
  const { slipData, updateSlipData, setFormData, setSelectedProduct, setSelectedProductDetails, setProductExtractions: setSlipProductExtractions, addProduct, updateProduct, removeProduct, setSelectedTeeth: setSlipSelectedTeeth, clearSlipData } = useSlipStore();

  // NEW: On mount, if caseDesignData exists in localStorage, use it to populate addSlipFormData
  useEffect(() => {
    if (typeof window !== "undefined") {
      const caseDesignDataStr = localStorage.getItem("caseDesignData")
      if (caseDesignDataStr) {
        try {
          const caseDesignData = JSON.parse(caseDesignDataStr)
          setAddSlipFormData((prev: any) => ({
            ...prev,
            ...caseDesignData,
          }))
        } catch { }
      }
    }
  }, [])

  // Add: For triggering lab product refetch after adding a product
  const [shouldRefetchLabProducts, setShouldRefetchLabProducts] = useState(false)
  // Add: For hiding slip header in DentalSlipPage
  const [hideSlipHeaderInDentalSlipPage, setHideSlipHeaderInDentalSlipPage] = useState(false)

  // Add state to control showing DentalSlipPage for adding a product
  const [showDentalSlipPage, setShowDentalSlipPage] = useState(false)
  const [dentalSlipStep, setDentalSlipStep] = useState<1 | 2>(2)

  // Add state to control hiding animation before redirect
  const [isHiding, setIsHiding] = useState(false)

  // Reset hiding state when component mounts (in case user navigates back)
  useEffect(() => {
    setIsHiding(false)
  }, [])

  // Add missing state for cancel preview modal
  const [showCancelPreviewModal, setShowCancelPreviewModal] = useState(false)

  // Add state for teeth shade modal
  const [showTeethShadeModal, setShowTeethShadeModal] = useState(false)
  const [teethShadeModalData, setTeethShadeModalData] = useState<{
    productId: string
    arch: "maxillary" | "mandibular"
    currentShadeSystem: string
    currentIndividualShade: string
  } | null>(null)
  const [userClosedTeethShadeModal, setUserClosedTeethShadeModal] = useState(false)

  const [addSlipFormData, setAddSlipFormData] = useState(() => {
    // Try to load from localStorage first
    if (typeof window !== "undefined") {
      const caseDesignDataStr = localStorage.getItem("caseDesignData")
      if (caseDesignDataStr) {
        try {
          const caseDesignData = JSON.parse(caseDesignDataStr)
          // Get createdBy from user object if available
          let createdBy = caseDesignData.createdBy || ""
          if (!createdBy) {
            const userStr = localStorage.getItem("user")
            if (userStr) {
              const userObj = JSON.parse(userStr)
              createdBy = userObj?.display_name || userObj?.name || userObj?.email || ""
            }
          }
          return {
            ...caseDesignData,
            office: caseDesignData.office || "",
            office_id: caseDesignData.office_id || "",
            createdBy,
          }
        } catch { }
      }
      // If not in caseDesignData, get from user object
      let createdBy = ""
      const userStr = localStorage.getItem("user")
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr)
          createdBy = userObj?.display_name || userObj?.name || userObj?.email || ""
        } catch { }
      }
      // Fallback to slipData or empty
      return {
        office: slipData?.formData?.office || slipData?.office || "",
        office_id: slipData?.formData?.office_id || slipData?.office_id || "",
        lab: slipData?.formData?.lab || slipData?.lab || "",
        doctor: slipData?.formData?.doctor || slipData?.doctor || "",
        patient: slipData?.formData?.patient || slipData?.patient || "",
        panNumber: slipData?.formData?.panNumber || slipData?.panNumber || "",
        caseNumber: slipData?.formData?.caseNumber || slipData?.caseNumber || "",
        slipNumber: slipData?.formData?.slipNumber || slipData?.slipNumber || "",
        createdBy,
        location: slipData?.formData?.location || slipData?.location || "",
        caseStatus: slipData?.formData?.caseStatus || slipData?.caseStatus || "",
        pickupDate: slipData?.formData?.pickupDate || slipData?.pickupDate || "",
        deliveryDate: slipData?.formData?.deliveryDate || slipData?.deliveryDate || "",
        deliveryTime: slipData?.formData?.deliveryTime || slipData?.deliveryTime || "",
      }
    }
    // Fallback to slipData or empty
    return {
      office: slipData?.formData?.office || slipData?.office || "",
      office_id: slipData?.formData?.office_id || slipData?.office_id || "",
      lab: slipData?.formData?.lab || slipData?.lab || "",
      doctor: slipData?.formData?.doctor || slipData?.doctor || "",
      patient: slipData?.formData?.patient || slipData?.patient || "",
      panNumber: slipData?.formData?.panNumber || slipData?.panNumber || "",
      caseNumber: slipData?.formData?.caseNumber || slipData?.caseNumber || "",
      slipNumber: slipData?.formData?.slipNumber || slipData?.slipNumber || "",
      createdBy: slipData?.formData?.createdBy || slipData?.createdBy || "",
      location: slipData?.formData?.location || slipData?.location || "",
      caseStatus: slipData?.formData?.caseStatus || slipData?.caseStatus || "",
      pickupDate: slipData?.formData?.pickupDate || slipData?.pickupDate || "",
      deliveryDate: slipData?.formData?.deliveryDate || slipData?.deliveryDate || "",
      deliveryTime: slipData?.formData?.deliveryTime || slipData?.deliveryTime || "",
    }
  })

  // --- NEW: Sync addSlipFormData with slipData when slipData changes ---
  useEffect(() => {
    if (slipData) {
      // Get createdBy from user object if available
      let createdBy = slipData.formData?.createdBy ?? slipData.createdBy ?? ""
      if (!createdBy && typeof window !== "undefined") {
        const userStr = localStorage.getItem("user")
        if (userStr) {
          try {
            const userObj = JSON.parse(userStr)
            createdBy = userObj?.display_name || userObj?.name || userObj?.email || ""
          } catch { }
        }
      }
      setAddSlipFormData((prev: any) => ({
        ...prev,
        // Prefer slipData.formData if present, else slipData fields directly
        office: slipData.formData?.office ?? slipData.office ?? "",
        office_id: slipData.formData?.office_id ?? slipData.office_id ?? "",
        lab: slipData.formData?.lab ?? slipData.lab ?? "",
        lab_id: slipData.formData?.lab_id ?? slipData.lab_id ?? "",
        doctor: slipData.formData?.doctor ?? slipData.doctor ?? "",
        doctor_id: slipData.formData?.doctor_id ?? slipData.doctor_id ?? "",
        patient: slipData.formData?.patient ?? slipData.patient ?? "",
        patient_name: slipData.formData?.patient_name ?? slipData.patient_name ?? "",
        panNumber: slipData.formData?.panNumber ?? slipData.panNumber ?? "",
        caseNumber: slipData.formData?.caseNumber ?? slipData.caseNumber ?? "",
        slipNumber: slipData.formData?.slipNumber ?? slipData.slipNumber ?? "",
        createdBy,
        location: slipData.formData?.location ?? slipData.location ?? "",
        caseStatus: slipData.formData?.caseStatus ?? slipData.caseStatus ?? "",
        pickupDate: slipData.formData?.pickupDate ?? slipData.pickupDate ?? "",
        deliveryDate: slipData.formData?.deliveryDate ?? slipData.deliveryDate ?? "",
        deliveryTime: slipData.formData?.deliveryTime ?? slipData.deliveryTime ?? "",
      }))
    }
  }, [slipData])

  // --- NEW: Track selected product id from slipData ---
  const initialProductId = slipData?.selectedProductId || undefined
  const [openAccordionItem, setOpenAccordionItem] = useState<string | undefined>(initialProductId)

  // --- NEW: Separate state for maxillary and mandibular teeth ---
  // Use persisted state to prevent loss on resize
  const [selectedMaxillaryTeeth, setSelectedMaxillaryTeeth] = usePersistedState<number[]>('case-design-selected-maxillary', [])
  const [selectedMandibularTeeth, setSelectedMandibularTeeth] = usePersistedState<number[]>('case-design-selected-mandibular', [])
  
  // --- Product color selection state ---
  const [selectedProductForColor, setSelectedProductForColor] = useState<string | null>(null)
  
  // --- Will extract color selection state ---
  const [selectedWillExtractForColor, setSelectedWillExtractForColor] = useState<boolean>(false)
  
  // --- Extraction type selection state ---
  const [selectedExtractionType, setSelectedExtractionType] = useState<string | null>(null)
  
  // Use Zustand store for extraction type selection and teeth selection
  const { 
    selectedExtractionType: zustandSelectedExtractionType,
    maxillarySelectedTeeth: zustandMaxillaryTeeth,
    mandibularSelectedTeeth: zustandMandibularTeeth,
    setMaxillarySelectedTeeth: setZustandMaxillaryTeeth,
    setMandibularSelectedTeeth: setZustandMandibularTeeth,
    getExtractionTypeTeeth,
    clearAllSelections,
    clearMaxillarySelection,
    clearMandibularSelection,
    clearSelectedExtractionType,
    setExtractionTypeTeeth,
    setProductExtractions,
    getProductExtractions,
    extractionTypeTeethSelection
  } = useTeethSelectionStore();
  
  // Use Zustand store value as the source of truth for extraction type
  const effectiveSelectedExtractionType = zustandSelectedExtractionType || selectedExtractionType;
  
  // Synchronize local state with Zustand store (only when Zustand changes)
  useEffect(() => {
    setSelectedMaxillaryTeeth(zustandMaxillaryTeeth)
  }, [zustandMaxillaryTeeth, setSelectedMaxillaryTeeth])
  
  useEffect(() => {
    setSelectedMandibularTeeth(zustandMandibularTeeth)
  }, [zustandMandibularTeeth, setSelectedMandibularTeeth])
  
  // Synchronize local state with extraction type teeth from Zustand store
  useEffect(() => {
    if (effectiveSelectedExtractionType) {
      const extractionTypeMaxillaryTeeth = getExtractionTypeTeeth(effectiveSelectedExtractionType, 'maxillary');
      const extractionTypeMandibularTeeth = getExtractionTypeTeeth(effectiveSelectedExtractionType, 'mandibular');
      
      // Update local state with extraction type teeth
      setSelectedMaxillaryTeeth(extractionTypeMaxillaryTeeth);
      setSelectedMandibularTeeth(extractionTypeMandibularTeeth);
    }
  }, [effectiveSelectedExtractionType, getExtractionTypeTeeth, setSelectedMaxillaryTeeth, setSelectedMandibularTeeth]);
  
  // Note: Removed bidirectional synchronization to prevent infinite loops
  // The Zustand store is the source of truth for teeth selection from cards
  // Local state is only updated when needed for 3D chart display
  
  // Debug: Log when selectedExtractionType changes
  useEffect(() => {
  }, [selectedExtractionType, zustandSelectedExtractionType, effectiveSelectedExtractionType]);
  
  
  
  // --- Product color selection handler ---
  const handleProductColorSelect = useCallback((productId: string | null) => {
    setSelectedProductForColor(productId)
    // Clear will extract color selection when product color is selected
    if (productId) {
      setSelectedWillExtractForColor(false)
    }
  }, [])
  
  // --- Will extract color selection handler ---
  const handleWillExtractColorSelect = useCallback((selected: boolean) => {
    setSelectedWillExtractForColor(selected)
    // Clear product color selection when will extract color is selected
    if (selected) {
      setSelectedProductForColor(null)
    }
  }, [])
  
  // --- Extraction type selection handler ---
  const handleExtractionTypeSelect = useCallback((extractionType: string | null) => {
    setSelectedExtractionType(extractionType)
    // Clear other color selections when extraction type is selected
    if (extractionType) {
      setSelectedProductForColor(null)
      setSelectedWillExtractForColor(false)
    }
  }, [])
  
  // --- Teeth selection change handler ---
  const handleTeethSelectionChange = useCallback((teeth: number[], archType?: 'maxillary' | 'mandibular') => {
    // This handler syncs teeth selection between components
    
    // Only update local state, not Zustand store to avoid circular dependency
    // The Zustand store is already being updated by the missing teeth cards component
    if (archType === 'maxillary' || (archType === undefined && teeth.some(tooth => tooth >= 1 && tooth <= 16))) {
      const maxillaryTeeth = teeth.filter(tooth => tooth >= 1 && tooth <= 16)
      setSelectedMaxillaryTeeth(maxillaryTeeth)
    } else if (archType === 'mandibular' || (archType === undefined && teeth.some(tooth => tooth >= 17 && tooth <= 32))) {
      const mandibularTeeth = teeth.filter(tooth => tooth >= 17 && tooth <= 32)
      setSelectedMandibularTeeth(mandibularTeeth)
    }
  }, [setSelectedMaxillaryTeeth, setSelectedMandibularTeeth])

  // --- Tooth mapping toolbar state ---
  const [showToothMappingToolbar, setShowToothMappingToolbar] = useState(true)
  const [selectedToothMappingMode, setSelectedToothMappingMode] = useState<string | null>(null)
  
  // --- Multiple slips state management ---
  const [slips, setSlips] = useState<Array<{
    id: string
    name: string
    products: Product[]
    notes: Note[]
    status: string
    location_id: number
  }>>([{
    id: 'slip-1',
    name: 'Slip 1',
    products: [],
    notes: [],
    status: 'Draft',
    location_id: 1
  }])
  const [currentSlipIndex, setCurrentSlipIndex] = useState<number>(0)
  const processingProductRef = useRef<string | null>(null) // Track which product is being processed

  // --- Legacy products state for backward compatibility ---
  const [products, setProducts] = useState<Product[]>([])

  // --- Initialize slips from existing data ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cacheStr = localStorage.getItem("caseDesignCache")
      if (cacheStr) {
        try {
          const cache = JSON.parse(cacheStr)
          // Check if cache has any meaningful data (products, notes, or slipData)
          // Allow page to show if slipData exists (user has started the flow) even without products
          const hasProducts = cache.products && cache.products.length > 0
          const hasNotes = cache.allNotes && cache.allNotes.length > 0
          // More lenient check - if slipData exists at all, allow page to show
          const hasSlipData = cache.slipData && (
            cache.slipData.formData ||
            cache.slipData.selectedProduct ||
            cache.slipData.selectedLab ||
            cache.slipData.selectedArch
          )
          const hasData = hasProducts || hasNotes || hasSlipData

          console.log('🔍 Case Design Cache Check:', {
            hasProducts,
            hasNotes,
            hasSlipData,
            hasData,
            cacheKeys: Object.keys(cache),
            slipDataKeys: cache.slipData ? Object.keys(cache.slipData) : null,
            formDataKeys: cache.slipData?.formData ? Object.keys(cache.slipData.formData) : null
          })

          if (!hasData) {
            // Cache exists but is empty - redirect to dashboard
            console.log('❌ No data found in cache, redirecting to dashboard')
            router.push('/dashboard')
            return
          }

          console.log('✅ Data found in cache, allowing page to render')

          // Restore slipData if it exists in cache
          if (cache.slipData) {
            console.log('✅ Restoring slipData from cache:', cache.slipData)
            updateSlipData(cache.slipData)
          }

          if (cache.products && cache.products.length > 0) {
            // Migrate existing products to the first slip
            setSlips(prev => prev.map((slip, index) =>
              index === 0
                ? { ...slip, products: cache.products }
                : slip
            ))
            setProducts(cache.products) // Keep legacy products for backward compatibility

            // Restore extraction data for each product from Zustand store
            // This ensures extraction data is properly linked to product IDs after page refresh
            cache.products.forEach((product: any) => {
              const productId = product.id;
              // Try to get extraction data using the full product ID first
              let storedExtractionData = getProductExtractions(productId);

              // If not found, try using the base product ID (without timestamp)
              if (!storedExtractionData && productId.includes('-')) {
                const baseProductId = productId.split('-')[0];
                storedExtractionData = getProductExtractions(baseProductId);
                
                // If found with base ID, also store it with the full product ID for consistency
                if (storedExtractionData) {
                  setProductExtractions(productId, storedExtractionData);
                  console.log('✅ Restored extraction data from base product ID:', baseProductId, 'to full ID:', productId);
                }
              }

              if (storedExtractionData) {
                // Data already exists for this product ID - no need to do anything
                console.log('✅ Extraction data already exists for product:', productId);
              } else {
                // Try to restore from the product object itself if it has extraction data
                const extractionData = product.extractions || product.data?.extractions || [];
                const hasExtraction = product.has_extraction || product.data?.has_extraction;
                const extractionOptions = product.extraction_options || product.data?.extraction_options || [];
                
                if (extractionData.length > 0 || hasExtraction || extractionOptions.length > 0) {
                  setProductExtractions(productId, {
                    extractions: extractionData,
                    has_extraction: hasExtraction,
                    extraction_options: extractionOptions
                  });
                  
                  // Also store with base product ID if available
                  if (productId.includes('-')) {
                    const baseProductId = productId.split('-')[0];
                    setProductExtractions(baseProductId, {
                      extractions: extractionData,
                      has_extraction: hasExtraction,
                      extraction_options: extractionOptions
                    });
                    console.log('✅ Stored extraction data for both full ID and base ID:', productId, baseProductId);
                  } else {
                    console.log('✅ Stored extraction data for product:', productId);
                  }
                } else {
                  console.log('⚠️ No extraction data found in product object:', productId);
                }
              }
            });

            // All extraction data has been restored

            // Auto-open the first product's accordion to ensure extraction cards are displayed
            // Only set if there's no current accordion open to avoid infinite loop
            if (cache.products.length > 0 && !openAccordionItem) {
              const firstProductId = cache.products[0].id;
              console.log('🔓 Auto-opening first product accordion:', firstProductId);
              setOpenAccordionItem(firstProductId);
            }
          }
          if (cache.allNotes && cache.allNotes.length > 0) {
            // Migrate existing notes to the first slip
            setSlips(prev => prev.map((slip, index) =>
              index === 0
                ? { ...slip, notes: cache.allNotes }
                : slip
            ))
          }
          // Restore teeth selection from cache if available
          if (cache.selectedMaxillaryTeeth && Array.isArray(cache.selectedMaxillaryTeeth)) {
            setSelectedMaxillaryTeeth(cache.selectedMaxillaryTeeth)
          }
          if (cache.selectedMandibularTeeth && Array.isArray(cache.selectedMandibularTeeth)) {
            setSelectedMandibularTeeth(cache.selectedMandibularTeeth)
          }
        } catch (error) {
          console.error("Error parsing caseDesignCache:", error)
          // On error parsing cache, redirect to dashboard
          router.push('/dashboard')
          return
        }
      } else {
        // No caseDesignCache found - check if caseDesignData exists (user just came from dental slip page)
        const caseDesignDataStr = localStorage.getItem("caseDesignData")
        if (caseDesignDataStr) {
          try {
            const caseDesignData = JSON.parse(caseDesignDataStr)
            // If caseDesignData exists, create cache with it so page can show
            const newCache = {
              slipData: {
                formData: caseDesignData,
              },
              products: [],
              allNotes: [],
              selectedMaxillaryTeeth: [],
              selectedMandibularTeeth: [],
              rushRequests: {},
            }
            localStorage.setItem("caseDesignCache", JSON.stringify(newCache))
            console.log('✅ Created caseDesignCache from caseDesignData')
            // Restore slipData
            updateSlipData({ formData: caseDesignData })
          } catch (e) {
            console.error("Error creating cache from caseDesignData:", e)
            // Create empty cache as fallback
            const emptyCache = {
              products: [],
              allNotes: [],
              selectedMaxillaryTeeth: [],
              selectedMandibularTeeth: []
            }
            localStorage.setItem("caseDesignCache", JSON.stringify(emptyCache))
          }
        } else {
          // No caseDesignCache or caseDesignData found - create empty one instead of redirecting
          const emptyCache = {
            products: [],
            allNotes: [],
            selectedMaxillaryTeeth: [],
            selectedMandibularTeeth: []
          }
          localStorage.setItem("caseDesignCache", JSON.stringify(emptyCache))
        }
      }
    }
  }, [router])

  // --- Helper functions for multiple slips management ---
  const getCurrentSlip = () => {
    return slips[currentSlipIndex] || null
  }

  // Make getCurrentSlipProducts reactive using useMemo
  // Depend on slips array - when it changes, the products will update
  const currentSlipProducts = useMemo(() => {
    const currentSlip = slips[currentSlipIndex] || null
    const products = currentSlip ? currentSlip.products : []
    
    // Debug: Log when products change
    console.log('🔄 currentSlipProducts updating:', products.map(p => ({
      id: p.id,
      grade: p.maxillaryConfig?.grade,
      stage: p.maxillaryConfig?.stage
    })))
    
    return products
  }, [slips, currentSlipIndex])

  const getCurrentSlipProducts = () => {
    return currentSlipProducts
  }
  
  // Sync products state with currentSlipProducts for backward compatibility
  useEffect(() => {
    console.log('🔄 Syncing products state with currentSlipProducts:', currentSlipProducts.map(p => ({
      id: p.id,
      grade: p.maxillaryConfig?.grade,
      stage: p.maxillaryConfig?.stage
    })))
    // Create a new array reference to ensure React detects the change
    setProducts([...currentSlipProducts])
  }, [currentSlipProducts])

  const addNewSlip = () => {
    const newSlip = {
      id: `slip-${Date.now()}`,
      name: `Slip ${slips.length + 1}`,
      products: [],
      notes: [],
      status: "Draft",
      location_id: 1
    }
    setSlips(prev => [...prev, newSlip])
    setCurrentSlipIndex(slips.length)
    return newSlip
  }

  const removeSlip = (slipIndex: number) => {
    if (slips.length <= 1) return // Don't allow removing the last slip
    
    setSlips(prev => prev.filter((_, index) => index !== slipIndex))
    
    // Adjust current slip index if needed
    if (currentSlipIndex >= slipIndex && currentSlipIndex > 0) {
      setCurrentSlipIndex(prev => prev - 1)
    } else if (currentSlipIndex >= slips.length - 1) {
      setCurrentSlipIndex(slips.length - 2)
    }
  }

  const updateCurrentSlipProducts = (newProducts: Product[]) => {
    console.log('🔄 updateCurrentSlipProducts called:', newProducts.map(p => ({
      id: p.id,
      grade: p.maxillaryConfig?.grade,
      stage: p.maxillaryConfig?.stage
    })))
    setSlips(prev => {
      const updated = prev.map((slip, index) => 
        index === currentSlipIndex 
          ? { ...slip, products: newProducts }
          : slip
      )
      console.log('🔄 setSlips called, new slips array:', updated.map(s => ({
        id: s.id,
        productsCount: s.products.length,
        firstProductGrade: s.products[0]?.maxillaryConfig?.grade,
        firstProductStage: s.products[0]?.maxillaryConfig?.stage
      })))
      return updated
    })
  }

  const updateCurrentSlipNotes = (newNotes: Note[]) => {
    setSlips(prev => prev.map((slip, index) => 
      index === currentSlipIndex 
        ? { ...slip, notes: newNotes }
        : slip
    ))
  }

  // --- Get current selected product ---
  const currentSelectedProduct = useMemo(() => {
    if (!openAccordionItem || !products) return null;
    const product = products.find((p: any) => p.id === openAccordionItem);
    return product?.name || null;
  }, [openAccordionItem, products]);

  // Get the full product object for the currently selected/open product
  const currentSelectedProductDetails = useMemo(() => {
    if (!openAccordionItem || !products) return null;
    const product = products.find((p: any) => p.id === openAccordionItem);
    return product || null;
  }, [openAccordionItem, products]);

  // --- Tooth status tracking ---
  // Use persisted state to prevent loss on resize
  const [maxillaryMissingTeeth, setMaxillaryMissingTeeth] = usePersistedState<number[]>('case-design-maxillary-missing', [])
  const [maxillaryExtractedTeeth, setMaxillaryExtractedTeeth] = usePersistedState<number[]>('case-design-maxillary-extracted', [])
  const [maxillaryWillExtractTeeth, setMaxillaryWillExtractTeeth] = usePersistedState<number[]>('case-design-maxillary-will-extract', [])
  const [maxillaryPreppedTeeth, setMaxillaryPreppedTeeth] = usePersistedState<number[]>('case-design-maxillary-prepped', [])
  const [maxillaryImplantTeeth, setMaxillaryImplantTeeth] = usePersistedState<number[]>('case-design-maxillary-implant', [])
  const [mandibularMissingTeeth, setMandibularMissingTeeth] = usePersistedState<number[]>('case-design-mandibular-missing', [])
  const [mandibularExtractedTeeth, setMandibularExtractedTeeth] = usePersistedState<number[]>('case-design-mandibular-extracted', [])
  const [mandibularWillExtractTeeth, setMandibularWillExtractTeeth] = usePersistedState<number[]>('case-design-mandibular-will-extract', [])
  const [mandibularPreppedTeeth, setMandibularPreppedTeeth] = usePersistedState<number[]>('case-design-mandibular-prepped', [])
  const [mandibularImplantTeeth, setMandibularImplantTeeth] = usePersistedState<number[]>('case-design-mandibular-implant', [])

  // Extraction type selection state
  const [selectedMaxillaryExtractionType, setSelectedMaxillaryExtractionType] = useState<string | null>(null)
  const [selectedMandibularExtractionType, setSelectedMandibularExtractionType] = useState<string | null>(null)

  // Combined tooth statuses for product filtering
  const maxillaryToothStatuses = useMemo(() => {
    const statuses: { [toothNumber: number]: string } = {};

    // Get all teeth in the maxillary arch
    const allMaxillaryTeeth = Array.from({ length: 16 }, (_, i) => i + 1);


    // First, assign specific statuses to teeth in extraction arrays (these take priority)
    maxillaryMissingTeeth.forEach(tooth => {
      statuses[tooth] = 'Missing teeth';
    });
    maxillaryExtractedTeeth.forEach(tooth => {
      statuses[tooth] = 'Has been extracted';
    });
    maxillaryWillExtractTeeth.forEach(tooth => {
      statuses[tooth] = 'Will extract on delivery';
    });
    maxillaryPreppedTeeth.forEach(tooth => {
      statuses[tooth] = 'Prepped';
    });
    maxillaryImplantTeeth.forEach(tooth => {
      statuses[tooth] = 'Implant';
    });

    // Only assign "Teeth in mouth" to teeth that are explicitly selected in the Zustand store
    // This prevents all teeth from being auto-assigned "Teeth in mouth" status on initial load
    const teethInMouthFromZustand = getExtractionTypeTeeth("Teeth in mouth", "maxillary");
    teethInMouthFromZustand.forEach(tooth => {
      if (!statuses[tooth]) {
        statuses[tooth] = 'Teeth in mouth';
      }
    });

    return statuses;
  }, [maxillaryMissingTeeth, maxillaryExtractedTeeth, maxillaryWillExtractTeeth, maxillaryPreppedTeeth, maxillaryImplantTeeth, currentSelectedProduct, getExtractionTypeTeeth]);

  const mandibularToothStatuses = useMemo(() => {
    const statuses: { [toothNumber: number]: string } = {};

    // Get all teeth in the mandibular arch
    const allMandibularTeeth = Array.from({ length: 16 }, (_, i) => i + 17);

    // First, assign specific statuses to teeth in extraction arrays (these take priority)
    mandibularMissingTeeth.forEach(tooth => {
      statuses[tooth] = 'Missing teeth';
    });
    mandibularExtractedTeeth.forEach(tooth => {
      statuses[tooth] = 'Has been extracted';
    });
    mandibularWillExtractTeeth.forEach(tooth => {
      statuses[tooth] = 'Will extract on delivery';
    });
    mandibularPreppedTeeth.forEach(tooth => {
      statuses[tooth] = 'Prepped';
    });
    mandibularImplantTeeth.forEach(tooth => {
      statuses[tooth] = 'Implant';
    });

    // Only assign "Teeth in mouth" to teeth that are explicitly selected in the Zustand store
    // This prevents all teeth from being auto-assigned "Teeth in mouth" status on initial load
    const teethInMouthFromZustand = getExtractionTypeTeeth("Teeth in mouth", "mandibular");
    teethInMouthFromZustand.forEach(tooth => {
      if (!statuses[tooth]) {
        statuses[tooth] = 'Teeth in mouth';
      }
    });

    return statuses;
  }, [mandibularMissingTeeth, mandibularExtractedTeeth, mandibularWillExtractTeeth, mandibularPreppedTeeth, mandibularImplantTeeth, currentSelectedProduct, getExtractionTypeTeeth]);
  
  // Error modal state
  const [showErrorModal, setShowErrorModal] = useState(false)
  // Remove old selectedTeeth state and effect
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([])
  useEffect(() => { setSelectedTeeth([]) }, [slipData])

  // --- Only use the product the user selected, not default/mock products ---
  // (products state and currentSelectedProduct moved above for proper initialization order)

  // --- Product selection handler ---
  const handleProductSelect = useCallback((productName: string | null) => {
    // This would be called when a product is selected/deselected
    // For now, we don't need to implement this as product selection is handled by accordion
  }, []);
  // DISABLED: Initial setup effect - now handled by pendingProductData effect
  // The entire effect has been removed to prevent duplicate products
  //     if (
  //       slipData &&
  //       slipData.selectedProduct &&
  //       products.length === 0
  //     ) {
  //         productName: slipData.selectedProduct.name,
  //         productId: slipData.selectedProduct.id,
  //         arch: slipData.selectedArch,
  //         currentProductsCount: products.length
  //       })
  //       
  //       // Check if this product already exists to prevent duplicates from initial setup
  //       const baseProductId = slipData.selectedProduct.id
  //       const existingProduct = products.find(p => {
  //         const existingBaseId = p.id.split('-')[0] // Extract base ID from composite ID
  //         return existingBaseId === baseProductId.toString() &&
  //                p.name === slipData.selectedProduct.name
  //       })
  //       
  //       if (existingProduct) {
  //         return
  //       }
  //       
  //       const selectedProduct = slipData.selectedProduct
  //       const archType =
  //         slipData.selectedArch === "upper"
  //           ? "Maxillary"
  //           : slipData.selectedArch === "lower"
  //             ? "Mandibular"
  //             : "Maxillary, Mandibular"
  //       const productId = selectedProduct.id + "-" + Date.now()
  //       const teeth = "" // Do not use selectedMaxillaryTeeth here, let user select after
  //       // --- Use default image if missing or placeholder ---
  //       const productImage =
  //         selectedProduct.image && selectedProduct.image !== "/placeholder.svg"
  //           ? selectedProduct.image
  //           : selectedProduct.image_url && selectedProduct.image_url !== "/placeholder.svg"
  //             ? selectedProduct.image_url
  //             : "/images/product-default.png" // <-- Default stock image
  //       const abbreviation = selectedProduct.name
  //         .split(" ")
  //         .map((n: string) => n[0])
  //         .join("")
  //         .toUpperCase()

  //       // --- Fetch teeth shade, gum shade, impression, material, retention ---
  //       let teethShadeBrand = "", teethShade = "", gumShadeBrand = "", gumShade = "", impression = ""
  //       let material = "", retention = ""
  //       const labId = slipData.selectedLab?.lab?.id || slipData.selectedLab?.id
  //       const prodId = selectedProduct.id

  //       // Fetch and set default values from API
  //       if (labId && prodId) {
  //         await fetchProductTeethShades(labId, prodId)
  //         const teethShades = window?.teethShadesCache || localStorage.getItem("teethShadesCache")
  //         if (teethShades) {
  //           const data = typeof teethShades === "string" ? JSON.parse(teethShades) : teethShades
  //           if (data && Array.isArray(data) && data.length > 0) {
  //             teethShadeBrand = data[0].name
  //             teethShade = data[0].shades && data[0].shades.length > 0 ? data[0].shades[0].name : ""
  //           }
  //         }
  //         // Gum shade
  //         await fetchProductGumShades(labId, prodId)
  //         const gumShades = window?.gumShadesCache || localStorage.getItem("gumShadesCache")
  //         if (gumShades) {
  //           const data = typeof gumShades === "string" ? JSON.parse(gumShades) : gumShades
  //           if (data && Array.isArray(data) && data.length > 0) {
  //             gumShadeBrand = data[0].name
  //             gumShade = data[0].shades && data[0].shades.length > 0 ? data[0].shades[0].name : ""
  //           }
  //         }
  //         // Impression
  //         await fetchProductImpressions(labId, prodId)
  //         const impressions = window?.impressionsCache || localStorage.getItem("impressionsCache")
  //         if (impressions) {
  //           const data = typeof impressions === "string" ? JSON.parse(impressions) : impressions
  //           if (data && Array.isArray(data) && data.length > 0) {
  //             impression = data[0].name
  //           }
  //         }
  //         // Material
  //         await fetchProductMaterials(labId, prodId)
  //         const materials = window?.materialsCache || localStorage.getItem("materialsCache")
  //         if (materials) {
  //           const data = typeof materials === "string" ? JSON.parse(materials) : materials
  //           if (data && Array.isArray(data) && data.length > 0) {
  //             material = data[0].name
  //           }
  //         }
  //         // Retention
  //         await fetchProductRetentions(labId, prodId)
  //         const retentions = window?.retentionsCache || localStorage.getItem("retentionsCache")
  //         if (retentions) {
  //           const data = typeof retentions === "string" ? JSON.parse(retentions) : retentions
  //           if (data && Array.isArray(data) && data.length > 0) {
  //             retention = data[0].name
  //           }
  //         }
  //       }

  //       // Use the selected stage from dental slip page, or fall back to default
  //       const selectedStage = slipData.selectedStages && slipData.selectedStages.length > 0 
  //         ? slipData.selectedStages[0] 
  //         : getDefaultStage(selectedProduct)

  //       const config: ProductConfiguration = {
  //         restoration: selectedProduct.category_name || selectedProduct.category || "Removable Restoration",
  //         productName: selectedProduct.name || "Default Product",
  //         grade: getDefaultGrade(selectedProduct),
  //         stage: selectedStage,
  //         teethShadePart1: teethShadeBrand,
  //         teethShadePart2: teethShade,
  //         gumShadePart1: gumShadeBrand,
  //         gumShadePart2: gumShade,
  //         impression: impression,
  //       }
  //       setProducts((prev) => [
  //         ...prev,
  //         {
  //           id: productId,
  //           name: selectedProduct.name,
  //           type: archType,
  //           teeth,
  //           deliveryDate:
  //             slipData.formData?.deliveryDate && slipData.formData?.deliveryTime
  //               ? slipData.formData.deliveryDate + " at " + slipData.formData.deliveryTime
  //               : "",
  //           image: productImage, // <-- Use default if needed
  //           abbreviation,
  //           color: "bg-white-600",
  //           borderColor: "border-blue-600",
  //           addOns: [],
  //           stageNotesContent: "",
  //           maxillaryConfig: { ...config },
  //           mandibularConfig: archType === "Maxillary, Mandibular" ? { ...config } : { ...config },
  //           // --- Pass all dropdown fields for use in CSDSection ---
  //           category_name: selectedProduct.category_name,
  //           subcategory_name: selectedProduct.subcategory_name,
  //           grades: selectedProduct.grades,
  //           stages: selectedProduct.stages,
  //         },
  //       ])
  //       setOpenAccordionItem(productId)
  //     }
  //   }
  //   // setupProductWithApiData()
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [slipData])

  const [rushRequests, setRushRequests] = useState<{ [key: string]: any }>({})
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [isCaseSubmitted, setIsCaseSubmitted] = useState(false) // Mock state
  const [submittedDeliveryDates, setSubmittedDeliveryDates] = useState<{ [productId: string]: string }>({})
  
  // Function to reset case submission state to allow editing
  const resetCaseSubmissionState = () => {
    setIsCaseSubmitted(false)
  }
  
  // Callback to handle delivery date updates from CSDSection
  const handleDeliveryDatesUpdate = useCallback((deliveryDates: { [productId: string]: string }) => {
    setSubmittedDeliveryDates(prev => ({
      ...prev,
      ...deliveryDates
    }))
  }, [])
  
  const [showAddOnsModal, setShowAddOnsModal] = useState(false)
  const [showMaxillaryAddOnsModal, setShowMaxillaryAddOnsModal] = useState(false)
  const [showMandibularAddOnsModal, setShowMandibularAddOnsModal] = useState(false)
  const [currentProductIdForAddOns, setCurrentProductIdForAddOns] = useState<string | null>(null)
  const [currentArch, setCurrentArch] = useState<"maxillary" | "mandibular">("maxillary")
  const [showRushModal, setShowRushModal] = useState(false)
  const [selectedProductForRush, setSelectedProductForRush] = useState<any>(null)
  const [showStageNotesModal, setShowStageNotesModal] = useState(false)
  const [stageNotesModalContext, setStageNotesModalContext] = useState<{
    patientName: string
    stage: string
    deliveryDate: string
    caseNumber: string
    slipNumber: string
  } | null>(null)
  const [allNotes, setAllNotes] = useState<Note[]>(initialNotes)
  const [showAddSlipModal, setShowAddSlipModal] = useState(false)

  // Add missing state and handler for submit popover/checkbox
  const [showSubmitPopover, setShowSubmitPopover] = useState(false)
  const submitPopoverRef = useRef<HTMLDivElement>(null)
  const submitButtonRef = useRef<HTMLButtonElement>(null)
  const [isChecked, setIsChecked] = useState(false)
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [showSubmitWarningModal, setShowSubmitWarningModal] = useState(false)
  const [isSubmittingCase, setIsSubmittingCase] = useState(false)

  // Add missing state for print driver tags and labels preview modals
  const [showPrintDriverTagsModal, setShowPrintDriverTagsModal] = useState(false)
  const [showPrintLabelsPreviewModal, setShowPrintLabelsPreviewModal] = useState(false)
  const [selectedLabelSlots, setSelectedLabelSlots] = useState<boolean[]>(Array(8).fill(false))
  const [showPrintStatementModal, setShowPrintStatementModal] = useState(false)
  const [showDriverHistoryModal, setShowDriverHistoryModal] = useState(false)
  const [showCallLogModal, setShowCallLogModal] = useState(false)

  // Add mobile sidebar state
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)

  // Close mobile sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMobileSidebar) {
        const sidebar = document.getElementById('mobile-sidebar')
        if (sidebar && !sidebar.contains(event.target as Node)) {
          setShowMobileSidebar(false)
        }
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showMobileSidebar) {
        setShowMobileSidebar(false)
      }
    }

    if (showMobileSidebar) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when mobile sidebar is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [showMobileSidebar])

  // Close submit popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSubmitPopover) {
        const target = event.target as Node
        const isClickOnPopover = submitPopoverRef.current?.contains(target)
        const isClickOnButton = submitButtonRef.current?.contains(target)
        
        // Only close if clicking outside both popover and button
        if (!isClickOnPopover && !isClickOnButton) {
          setShowSubmitPopover(false)
          setIsChecked(false) // Reset checkbox when popover closes
        }
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showSubmitPopover) {
        setShowSubmitPopover(false)
        setIsChecked(false) // Reset checkbox when popover closes
      }
    }

    if (showSubmitPopover) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showSubmitPopover])

  // Add handlers for print driver tags and labels preview
  const handlePrintDriverTagsRegularPrint = () => {
    setShowPrintPreview(true)
    setShowPrintDriverTagsModal(false)
  }
  const handleGenerateLabels = (slots: boolean[]) => {
    setSelectedLabelSlots(slots)
    setShowPrintLabelsPreviewModal(true)
    setShowPrintDriverTagsModal(false)
  }

  // Add the missing handler
  const handleSubmitCaseClick = useCallback(async () => {
    if (isSubmittingCase) return; // Prevent multiple submissions

    try {
      setIsSubmittingCase(true);
      // Always read the latest cache from localStorage
      let cache: any = null;
      if (typeof window !== "undefined") {
        const cacheStr = localStorage.getItem("caseDesignCache");
        if (cacheStr) cache = JSON.parse(cacheStr);
      }
      if (!cache) throw new Error("No caseDesignCache found");

      const slipData = cache.slipData || {};
      const products = cache.products || [];
      const allNotes = cache.allNotes || [];
      const rushRequests = cache.rushRequests || {};

      // --- TEETH SELECTION & PRODUCT FIELD VALIDATION ---
      const errors: string[] = [];
      
      products.forEach((product: any) => {
        
        // Validate required fields for both arches
        ["maxillaryConfig", "mandibularConfig"].forEach((archKey) => {
          const config = product[archKey];
          // Only validate if the product type includes the arch
          if (
            (archKey === "maxillaryConfig" && product.type.includes("Maxillary")) ||
            (archKey === "mandibularConfig" && product.type.includes("Mandibular"))
          ) {
            // Restoration
            if (
              !config.restoration ||
              config.restoration === "placeholder" ||
              config.restoration === "Select Restoration"
            ) {
              errors.push(
                `Please select Restoration for ${archKey === "maxillaryConfig" ? "Maxillary" : "Mandibular"} arch of product "${product.name}".`
              );
            }
            // Product
            if (
              !config.productName ||
              config.productName === "placeholder" ||
              config.productName === "Select Product"
            ) {
              errors.push(
                `Please select Product for ${archKey === "maxillaryConfig" ? "Maxillary" : "Mandibular"} arch of product "${product.name}".`
              );
            }
            // Grade
            if (
              !config.grade ||
              config.grade === "placeholder" ||
              config.grade === "Select Grade"
            ) {
              errors.push(
                `Please select Grade for ${archKey === "maxillaryConfig" ? "Maxillary" : "Mandibular"} arch of product "${product.name}".`
              );
            }
            // Stage
            if (
              !config.stage ||
              config.stage === "placeholder" ||
              config.stage === "Select Stage"
            ) {
              errors.push(
                `Please select Stage for ${archKey === "maxillaryConfig" ? "Maxillary" : "Mandibular"} arch of product "${product.name}".`
              );
            }
            // Teeth Shade
            if (
              !config.teethShadePart1 ||
              config.teethShadePart1 === "placeholder" ||
              config.teethShadePart1 === "Select Teeth Shade"
            ) {
              errors.push(
                `Please select Teeth Shade (brand) for ${archKey === "maxillaryConfig" ? "Maxillary" : "Mandibular"} arch of product "${product.name}".`
              );
            }
            if (
              !config.teethShadePart2 ||
              config.teethShadePart2 === "placeholder" ||
              config.teethShadePart2 === "Select Teeth Shade"
            ) {
              errors.push(
                `Please select Teeth Shade (shade) for ${archKey === "maxillaryConfig" ? "Maxillary" : "Mandibular"} arch of product "${product.name}".`
              );
            }
            // Gum Shade Brand - Check both gumShadePart1 and gumShadeBrandName
            const hasGumShadeBrand = (
              (config.gumShadePart1 && 
               config.gumShadePart1 !== "placeholder" && 
               config.gumShadePart1 !== "Select Gum Shade" && 
               config.gumShadePart1 !== "Select Gum Shade Brand" &&
               config.gumShadePart1.trim() !== "") ||
              (config.gumShadeBrandName && 
               config.gumShadeBrandName !== "placeholder" && 
               config.gumShadeBrandName !== "Select Gum Shade" && 
               config.gumShadeBrandName !== "Select Gum Shade Brand" &&
               config.gumShadeBrandName.trim() !== "")
            );
            
            if (!hasGumShadeBrand) {
              errors.push(
                `Please select Gum Shade Brand for ${archKey === "maxillaryConfig" ? "Maxillary" : "Mandibular"} arch of product "${product.name}".`
              );
            }
            
            // Gum Shade (actual shade) - Check both gumShadePart2 and gumShadeName
            const hasGumShade = (
              (config.gumShadePart2 && 
               config.gumShadePart2 !== "placeholder" && 
               config.gumShadePart2 !== "Select Gum Shade Brand" && 
               config.gumShadePart2 !== "Select Gum Shade" &&
               config.gumShadePart2.trim() !== "") ||
              (config.gumShadeName && 
               config.gumShadeName !== "placeholder" && 
               config.gumShadeName !== "Select Gum Shade Brand" && 
               config.gumShadeName !== "Select Gum Shade" &&
               config.gumShadeName.trim() !== "")
            );
            
            if (!hasGumShade) {
              errors.push(
                `Please select Gum Shade for ${archKey === "maxillaryConfig" ? "Maxillary" : "Mandibular"} arch of product "${product.name}".`
              );
            } 
            // Impression
            const hasImpressions =
              (Array.isArray(config.impressions) && config.impressions.length > 0) ||
              (config.impression && config.impression !== "placeholder" && config.impression !== "Select Impression");

            if (!hasImpressions) {
              errors.push(
                `Please select Impression for ${archKey === "maxillaryConfig" ? "Maxillary" : "Mandibular"} arch of product "${product.name}".`
              );
            }
          }
        });
        // Teeth selection validation
        // if (
        //   product.type.includes("Maxillary") &&
        //   (!product.teeth || product.teeth.trim() === "" || product.teeth === "N/A")
        // ) {
        //   errors.push(
        //     `Please select at least one tooth for the Maxillary arch of product "${product.name}".`
        //   );
        // }
        // if (
        //   product.type.includes("Mandibular") &&
        //   (!product.mandibularTeeth || product.mandibularTeeth.trim() === "" || product.mandibularTeeth === "N/A")
        // ) {
        //   errors.push(
        //     `Please select at least one tooth for the Mandibular arch of product "${product.name}".`
        //   );
        // }
      });
      if (errors.length > 0) {
        setErrorMessages(errors)
        return
      }
      

      // Get token
      let token = ""
      if (typeof window !== "undefined") {
        token = localStorage.getItem("token") || ""
      }

      // Use slipData.formData for case fields
      const formData = slipData.formData || {}
      const selectedProduct = slipData.selectedProduct || {}

      // Get lab_id and office_id based on user role
      let lab_id = formData.lab_id || slipData?.lab_id
      let office_id = formData.office_id || slipData?.office_id
      
      if (typeof window !== "undefined") {
        try {
          const role = localStorage.getItem("role")
          const userStr = localStorage.getItem("user")
          
          if (role === "office_admin") {
            // For office_admin, get customerId from localStorage for both lab_id and office_id
            const customerId = localStorage.getItem("customerId")
            if (customerId) {
              lab_id = Number(customerId)
              office_id = Number(customerId) // office_id should also be customerId for office_admin
            }
          } else if (userStr) {
            // For other roles, use existing logic (primary customer)
            const userObj = JSON.parse(userStr)
            if (Array.isArray(userObj.customers)) {
              const primary = userObj.customers.find((c: any) => c.is_primary === 1)
              if (primary) lab_id = primary.id
            }
          }
        } catch { }
      }

      // Build the case object using IDs from formData to match required format
      const caseData = {
        lab_id: Number(lab_id), // Use lab_id from localStorage customerId, ensure it's a number
        office_id: Number(office_id), // Use office_id from localStorage customerId for office_admin
        doctor: Number(formData.doctor_id || slipData?.doctor_id), // Ensure it's a number, fallback to slipData
        patient_name: formData.patient || formData.patient_name || slipData?.patient || slipData?.patient_name, // Use patient field from cache, fallback to patient_name
        case_status: formData.caseStatus || "Draft",
      }

      // Resolve grade_id and stage_id from name
      function getGradeId(name: any, product: any) {
        // First try to find in the individual product's grades array
        if (product.grades && Array.isArray(product.grades)) {
          const found = product.grades.find((g: any) => g.name === name);
          if (found) return found.id;
        }
        // Fallback to selectedProduct grades
        const arr = selectedProduct.grades || [];
        const found = arr.find((g: any) => g.name === name);
        return found ? found.id : null;
      }

      function getStageId(name: any, product: any) {
        // First try to find in the individual product's stages array
        if (product.stages && Array.isArray(product.stages)) {
          const found = product.stages.find((s: any) => s.name === name);
          if (found) return found.id;
        }
        // Fallback to selectedProduct stages
        const arr = selectedProduct.stages || [];
        const found = arr.find((s: any) => s.name === name);
        return found ? found.id : null;
      }
      // Helper to map product UI state to API product object
      function mapProduct(product: any, archType: any) {
        // Use arch-specific config
        const config = archType === "Upper" ? product.maxillaryConfig : product.mandibularConfig;

        // --- Teeth shade brand/shade ---
        let teeth_shade_brand_id = config.teethShadeBrandId;
        let teeth_shade_id = config.teethShadeId;

        // Helper function to extract brand name from various formats
        const extractBrandName = (part1: string): string[] => {
          if (!part1) return [''];
          const candidates: string[] = [part1];
          
          // If format is "Brand - Brand" or "Brand - Shade", extract just "Brand"
          if (part1.includes(' - ')) {
            const parts = part1.split(' - ');
            if (parts.length > 0) {
              candidates.push(parts[0].trim());
              // Also add the display name (part after dash)
              if (parts.length > 1) {
                candidates.push(parts[1].trim());
              }
            }
          }
          
          return candidates;
        };

        if (!teeth_shade_brand_id && Array.isArray(product.productTeethShades) && config.teethShadePart1) {
          // Check if Part1 is an ID (numeric string)
          const isPart1Numeric = /^\d+$/.test(config.teethShadePart1?.toString() || '');
          
          const foundBrand = product.productTeethShades.find((b: any) => {
            // If Part1 is numeric, prioritize ID match
            if (isPart1Numeric) {
              if (b.id?.toString() === config.teethShadePart1?.toString()) return true;
            }
            
            // Try exact match first
            const brandNameCandidates = extractBrandName(config.teethShadePart1);
            if (brandNameCandidates.includes(b.name) || brandNameCandidates.includes(b.system_name)) {
              return true;
            }
            // Try partial match (brand name contains or is contained by part1)
            if (b.name && config.teethShadePart1.includes(b.name)) return true;
            if (b.name && b.name.includes(brandNameCandidates[0])) return true;
            // Try system_name match
            if (b.system_name && brandNameCandidates.includes(b.system_name)) return true;
            // Try normalized match (remove special chars and compare)
            const normalizedPart1 = brandNameCandidates[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            const normalizedBrandName = (b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalizedPart1 && normalizedBrandName === normalizedPart1) return true;
            // Try ID match
            if (b.id?.toString() === config.teethShadePart1?.toString()) return true;
            
            return false;
          });
          
          teeth_shade_brand_id = foundBrand?.id ?? null;
          if (!teeth_shade_id && foundBrand?.shades && config.teethShadePart2) {
            // Check if Part2 is an ID (numeric string)
            const isPart2Numeric = /^\d+$/.test(config.teethShadePart2?.toString() || '');
            
            const foundShade = foundBrand.shades.find((s: any) => {
              // If Part2 is numeric, prioritize ID match
              if (isPart2Numeric) {
                if (s.id?.toString() === config.teethShadePart2?.toString()) return true;
              }
              // Otherwise try name match
              return s.name === config.teethShadePart2 || s.id?.toString() === config.teethShadePart2?.toString();
            });
            teeth_shade_id = foundShade?.id ?? null;
          }
        }

        // Final fallback for teeth shade brand ID: if we have teeth_shade_id but no brand_id, find the brand
        if (!teeth_shade_brand_id && teeth_shade_id && Array.isArray(product.productTeethShades)) {
          for (const brand of product.productTeethShades) {
            if (brand.shades) {
              const foundShade = brand.shades.find((s: any) => s.id === teeth_shade_id);
              if (foundShade) {
                teeth_shade_brand_id = brand.id;
                break;
              }
            }
          }
        }

        // --- Gum shade brand/shade ---
        let gum_shade_brand_id = config.gumShadeBrandId;
        let gum_shade_id = config.gumShadeId;

        

        // If gumShadeId is null but we have gumShadePart1 and gumShadePart2, try to find it
        if (!gum_shade_id && config.gumShadePart1 && config.gumShadePart2 && Array.isArray(product.productGumShades)) {
          const brandNameCandidates = extractBrandName(config.gumShadePart1);
          
          const foundBrand = product.productGumShades.find((b: any) => {
            // Try exact match first
            if (brandNameCandidates.includes(b.name) || brandNameCandidates.includes(b.system_name)) {
              return true;
            }
            // Try partial match
            if (b.name && config.gumShadePart1.includes(b.name)) return true;
            if (b.name && b.name.includes(brandNameCandidates[0])) return true;
            // Try system_name match
            if (b.system_name && brandNameCandidates.includes(b.system_name)) return true;
            // Try normalized match
            const normalizedPart1 = brandNameCandidates[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            const normalizedBrandName = (b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalizedPart1 && normalizedBrandName === normalizedPart1) return true;
            // Try ID match
            if (b.id?.toString() === config.gumShadePart1?.toString()) return true;
            
            return false;
          });
          
          if (foundBrand?.shades) {
            const foundShade = foundBrand.shades.find(
              (s: any) => s.name === config.gumShadePart2 || s.id?.toString() === config.gumShadePart2?.toString()
            );
            if (foundShade) {
              gum_shade_id = foundShade.id;
              // Also set brand ID if not already set
              if (!gum_shade_brand_id) {
                gum_shade_brand_id = foundBrand.id;
              }
            }
          }
        }

        if (!gum_shade_brand_id && Array.isArray(product.productGumShades) && config.gumShadePart1) {
          const brandNameCandidates = extractBrandName(config.gumShadePart1);
          
          const foundBrand = product.productGumShades.find((b: any) => {
            // Try exact match first
            if (brandNameCandidates.includes(b.name) || brandNameCandidates.includes(b.system_name)) {
              return true;
            }
            // Try partial match (brand name contains or is contained by part1)
            if (b.name && config.gumShadePart1.includes(b.name)) return true;
            if (b.name && b.name.includes(brandNameCandidates[0])) return true;
            // Try system_name match
            if (b.system_name && brandNameCandidates.includes(b.system_name)) return true;
            // Try normalized match (remove special chars and compare)
            const normalizedPart1 = brandNameCandidates[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            const normalizedBrandName = (b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalizedPart1 && normalizedBrandName === normalizedPart1) return true;
            // Try ID match
            if (b.id?.toString() === config.gumShadePart1?.toString()) return true;
            
            return false;
          });
          
          gum_shade_brand_id = foundBrand?.id ?? null;
          
          if (!gum_shade_id && foundBrand?.shades) {
            const foundShade = foundBrand.shades.find(
              (s: any) => s.name === config.gumShadePart2 || s.id?.toString() === config.gumShadePart2?.toString()
            );
            gum_shade_id = foundShade?.id ?? null;
          }
        }

        // Final fallback: if gum_shade_id is still null, try multiple strategies
        if (!gum_shade_id && Array.isArray(product.productGumShades)) {
          
          // Strategy 1: Search by shade name in all brands
          if (config.gumShadePart2) {
            for (const brand of product.productGumShades) {
              if (brand.shades) {
                const foundShade = brand.shades.find((s: any) => s.name === config.gumShadePart2);
                if (foundShade) {
                  gum_shade_id = foundShade.id;
                  break;
                }
              }
            }
          }
          
          // Strategy 2: If we have a brand ID, find the first shade in that brand
          if (!gum_shade_id && gum_shade_brand_id) {
            const foundBrand = product.productGumShades.find((b: any) => b.id === gum_shade_brand_id);
            if (foundBrand?.shades && foundBrand.shades.length > 0) {
              gum_shade_id = foundBrand.shades[0].id;
            }
          }
          
          // Strategy 3: Find any shade in any brand as last resort
          if (!gum_shade_id) {
            for (const brand of product.productGumShades) {
              if (brand.shades && brand.shades.length > 0) {
                gum_shade_id = brand.shades[0].id;
                break;
              }
            }
          }
        }

        // Strategy 4: If all else fails and we have a brand ID, use a default shade ID
        if (!gum_shade_id && gum_shade_brand_id) {
          // Use a default shade ID based on the brand ID
          // This is a fallback to ensure we always have a valid gum_shade_id
          gum_shade_id = gum_shade_brand_id * 10 + 1; // Simple formula to generate a unique ID
        }

        // Impressions mapping (if any)
        const impressions = Array.isArray(config.impressions)
          ? config.impressions.map((imp: any) => {
              const impression_id = imp.id || imp.impression_id
              return {
                impression_id,
                quantity: imp.qty || imp.quantity || 1,
                notes: imp.notes || "",
              }
            })
          : [];

        // Addons mapping (if any)
        const addons = Array.isArray(product.addOns)
          ? product.addOns.map((a: any) => ({
            addon_id: a.addon_id || a.id,
            quantity: a.qty || a.quantity,
            notes: a.notes || "",
          }))
          : [];

        // Extractions mapping (if any) - check config, product level, and Zustand store
        let extractions = [];
        
        // First try config level
        if (Array.isArray(config.extractions)) {
          extractions = config.extractions.map((ext: any) => ({
            extraction_id: ext.extraction_id || ext.id,
            teeth_numbers: ext.teeth_numbers || [],
            notes: ext.notes || "",
          }));
        }
        // Then try product level
        else if (Array.isArray(product.extractions)) {
          extractions = product.extractions.map((ext: any) => ({
            extraction_id: ext.extraction_id || ext.id,
            teeth_numbers: ext.teeth_numbers || [],
            notes: ext.notes || "",
          }));
        }
        // Finally try to get from Zustand store if available
        else {
          try {
            // Get extraction type teeth selection from Zustand store
            const extractionTypeTeethSelection = getExtractionTypeTeeth ? 
              (() => {
                const extractionTypes = ["Teeth in mouth", "Missing teeth", "Has been extracted", "Will extract on delivery", "Prepped", "Implant"];
                const archKey = archType === "Upper" ? "maxillary" : "mandibular";
                const result = [];
                
                for (const extractionType of extractionTypes) {
                  const teeth = getExtractionTypeTeeth(extractionType, archKey);
                  if (teeth && teeth.length > 0) {
                    // Map extraction type to proper extraction ID
                    let extractionId = 1; // Default extraction ID
                    if (extractionType === "Teeth in mouth") extractionId = 1;
                    else if (extractionType === "Will extract on delivery") extractionId = 2;
                    else if (extractionType === "Has been extracted") extractionId = 3;
                    else if (extractionType === "Missing teeth") extractionId = 4;
                    else if (extractionType === "Prepped") extractionId = 5;
                    else if (extractionType === "Implant") extractionId = 6;
                    
                    result.push({
                      extraction_id: extractionId,
                      teeth_numbers: teeth,
                      notes: `Extraction for ${extractionType}`,
                    });
                  }
                }
                return result;
              })() : [];
            
            extractions = extractionTypeTeethSelection;
          } catch (error) {
          }
        }

        // Rush mapping (if any)
        // Prefer per-product in-memory value (product.rushRequests) but fall back to the cached rushRequests map
        const productRushSource = product.rushRequests || (typeof rushRequests !== 'undefined' ? rushRequests[product.id] : undefined)
        const rush = productRushSource
          ? {
              is_rush: !!productRushSource.is_rush,
              requested_rush_date:
                productRushSource.requested_rush_date ||
                productRushSource.requestedRushDate ||
                productRushSource.targetDate ||
                null,
              notes: productRushSource.notes || "",
            }
          : undefined;

        // --- Resolve IDs from the product's own data first, then fallback to selectedProduct ---
        const category_id = product.category_id || product.categoryId || selectedProduct.category_id || selectedProduct.categoryId;
        // Ensure product_id is a number - extract from composite ID if needed
        let product_id = product.product_id || selectedProduct.id || selectedProduct.product_id;
        if (!product_id && product.id) {
          // If product.id is a composite string like "31-1234567890", extract the first part
          product_id = Number(product.id.split('-')[0]) || Number(product.id);
        }
        const subcategory_id = product.subcategory_id || product.subcategoryId || selectedProduct.subcategory_id || selectedProduct.subcategoryId;

        const grade_id = getGradeId(config.grade, product);
        const stage_id = getStageId(config.stage, product);

        // Get teeth selection from multiple sources, prioritizing Zustand store
        const getTeethSelection = (archType: string) => {
          const archKey = archType === "Upper" ? "maxillary" : "mandibular";
          const zustandTeeth = archType === "Upper" ? zustandMaxillaryTeeth : zustandMandibularTeeth;
          const localTeeth = archType === "Upper" ? selectedMaxillaryTeeth : selectedMandibularTeeth;
          
          // Try to get teeth from extraction type selection first
          if (effectiveSelectedExtractionType && getExtractionTypeTeeth) {
            const extractionTeeth = getExtractionTypeTeeth(effectiveSelectedExtractionType, archKey);
            if (extractionTeeth && extractionTeeth.length > 0) {
              return extractionTeeth.join(",");
            }
          }
          
          // Then try Zustand store
          if (zustandTeeth && zustandTeeth.length > 0) {
            return zustandTeeth.join(",");
          }
          
          // Then try local state
          if (localTeeth && localTeeth.length > 0) {
            return localTeeth.join(",");
          }
          
          // Finally try product data
          const productTeeth = archType === "Upper" ? product.maxillaryTeeth : product.mandibularTeeth;
          return productTeeth || product.teeth || "";
        };

        const teethSelection = getTeethSelection(archType)
          .split(",")
          .map((s: string) => s.replace(/[^0-9]/g, ""))
          .filter(Boolean)
          .join(",");

        // Build the product object, only including fields with valid values
        const mappedProduct: any = {
          type: archType,
          category_id: Number(category_id), // Ensure it's a number
          product_id: Number(product_id), // Ensure it's a number
          subcategory_id: Number(subcategory_id), // Ensure it's a number
          teeth_selection: teethSelection,
          status: product.status || "Draft",
          notes: config.notes || product.notes || "",
        };

        // Only include stage_id if it's a valid number (not null, undefined, or 0)
        if (stage_id && stage_id !== null && stage_id !== undefined && Number(stage_id) > 0) {
          mappedProduct.stage_id = Number(stage_id);
        }

        // Only include grade_id if it's a valid number (not null, undefined, or 0)
        if (grade_id && grade_id !== null && grade_id !== undefined && Number(grade_id) > 0) {
          mappedProduct.grade_id = Number(grade_id);
        }

        // Only include teeth_shade_brand_id if it's a valid number
        if (teeth_shade_brand_id && teeth_shade_brand_id !== null && teeth_shade_brand_id !== undefined && Number(teeth_shade_brand_id) > 0) {
          mappedProduct.teeth_shade_brand_id = Number(teeth_shade_brand_id);
        }

        // Only include teeth_shade_id if it's a valid number
        if (teeth_shade_id && teeth_shade_id !== null && teeth_shade_id !== undefined && Number(teeth_shade_id) > 0) {
          mappedProduct.teeth_shade_id = Number(teeth_shade_id);
        }

        // Only include gum_shade_brand_id if it's a valid number
        if (gum_shade_brand_id && gum_shade_brand_id !== null && gum_shade_brand_id !== undefined && Number(gum_shade_brand_id) > 0) {
          mappedProduct.gum_shade_brand_id = Number(gum_shade_brand_id);
        }

        // Only include gum_shade_id if it's a valid number
        if (gum_shade_id && gum_shade_id !== null && gum_shade_id !== undefined && Number(gum_shade_id) > 0) {
          mappedProduct.gum_shade_id = Number(gum_shade_id);
        }

        // Only include rush if it exists
        if (rush) {
          mappedProduct.rush = rush;
        }

        // Include arrays only if they have items
        if (impressions && impressions.length > 0) {
          mappedProduct.impressions = impressions;
        }

        if (addons && addons.length > 0) {
          mappedProduct.addons = addons;
        }

        if (extractions && extractions.length > 0) {
          mappedProduct.extractions = extractions;
        }
        
        return mappedProduct;
      }


      // Create slips array from the multiple slips structure
      const submissionSlips = []
      
      // Process each slip in the slips array
      slips.forEach((slip, slipIndex) => {
        const slipProducts: any[] = []
        
        // Process products in this slip
        slip.products.forEach((product: any) => {
          // Handle products that are configured for both arches
          if (product.type === "Maxillary, Mandibular") {
            // Add both maxillary and mandibular versions to the same slip
            slipProducts.push(mapProduct(product, "Upper"))
            slipProducts.push(mapProduct(product, "Lower"))
          } else if (product.type === "Maxillary") {
            slipProducts.push(mapProduct(product, "Upper"))
          } else if (product.type === "Mandibular") {
            slipProducts.push(mapProduct(product, "Lower"))
          }
        })

        // Create slip object if it has products
        if (slipProducts.length > 0) {
          submissionSlips.push({
            status: slip.status || "Draft",
            location_id: slip.location_id || 1,
            products: slipProducts,
            notes: slip.notes.map((n: any) => ({ note: n.content })),
          })
        }
      })

      // Fallback: If no slips exist, create from legacy products array
      if (submissionSlips.length === 0 && products.length > 0) {
        const allProducts: any[] = []
        
        products.forEach((product: any) => {
          // Handle products that are configured for both arches
          if (product.type === "Maxillary, Mandibular") {
            // Add both maxillary and mandibular versions to the same slip
            allProducts.push(mapProduct(product, "Upper"))
            allProducts.push(mapProduct(product, "Lower"))
          } else if (product.type === "Maxillary") {
            allProducts.push(mapProduct(product, "Upper"))
          } else if (product.type === "Mandibular") {
            allProducts.push(mapProduct(product, "Lower"))
          }
        })

        // Create a single slip with all products
        if (allProducts.length > 0) {
          submissionSlips.push({
            status: "Draft",
            location_id: 1,
            products: allProducts,
            notes: allNotes.map((n: any) => ({ note: n.content })),
          })
        }
      }

      // Validate that all mapped products have required IDs
      const missingFields: string[] = []
      
      // Validate case data
      if (!caseData.lab_id) missingFields.push("Lab ID is required for the case.")
      if (!caseData.office_id) missingFields.push("Office ID is required for the case.")
      if (!caseData.doctor) missingFields.push("Doctor ID is required for the case.")
      if (!caseData.patient_name) missingFields.push("Patient name is required for the case.")
      
      // Validate mapped products have required IDs
      submissionSlips.forEach((slip, slipIndex) => {
        slip.products.forEach((mappedProduct: any, productIndex: number) => {
          const archType = mappedProduct.type === "Upper" ? "Maxillary" : "Mandibular";
          const productName = products.find((p: any) => {
            const productId = Number(p.id?.split('-')[0]) || Number(p.id);
            return productId === mappedProduct.product_id;
          })?.name || `Product ${productIndex + 1}`;
          
          if (!mappedProduct.stage_id) {
            missingFields.push(`Stage ID is required for ${archType} arch of product "${productName}". Please ensure a valid stage is selected.`);
          }
          if (!mappedProduct.grade_id) {
            missingFields.push(`Grade ID is required for ${archType} arch of product "${productName}". Please ensure a valid grade is selected.`);
          }
          // Note: teeth_shade_brand_id and gum_shade_brand_id are optional (nullable) but if they're set, they must be valid
          if (mappedProduct.hasOwnProperty('teeth_shade_brand_id') && !mappedProduct.teeth_shade_brand_id) {
            missingFields.push(`Teeth Shade Brand ID is invalid for ${archType} arch of product "${productName}". Please ensure a valid teeth shade brand is selected.`);
          }
          if (mappedProduct.hasOwnProperty('gum_shade_brand_id') && !mappedProduct.gum_shade_brand_id) {
            missingFields.push(`Gum Shade Brand ID is invalid for ${archType} arch of product "${productName}". Please ensure a valid gum shade brand is selected.`);
          }
        });
      });
      
      // Check if any products are missing required IDs
      products.forEach((product: any) => {
        if (!product.category_id) missingFields.push("Category ID is required for the product.")
        if (!product.subcategory_id) missingFields.push("Subcategory ID is required for the product.")
        if (!product.id) missingFields.push("Product ID is required for the product.")
        
        // Check stage and grade IDs for each arch
        ["maxillaryConfig", "mandibularConfig"].forEach(archKey => {
          const config = product[archKey];
          if (config && (config.stageId === null || config.stageId === undefined)) {
            missingFields.push("Stage ID is required for the product.")
          }
          if (config && (config.gradeId === null || config.gradeId === undefined)) {
            missingFields.push("Grade ID is required for the product.")
          }
        });
      })

      // Validate all dropdowns for each product
      products.forEach(product => {
        const arches = ["maxillaryConfig", "mandibularConfig"];
        arches.forEach(archKey => {
          const config = product[archKey];
          if (
            config.restoration === "Select Restoration" ||
            config.productName === "Select Product" ||
            config.grade === "Select Grade" ||
            config.stage === "Select Stage" ||
            config.teethShadePart1 === "Select Teeth Shade" ||
            config.teethShadePart2 === "Select Teeth Shade" ||
            config.gumShadePart1 === "Select Gum Shade" ||
            config.gumShadePart2 === "Select Gum Shade" ||
            config.impression === "Select Impression"
          ) {
            missingFields.push(
              `Please select all required product details for ${archKey === "maxillaryConfig" ? "Maxillary" : "Mandibular"} arch of product "${product.name}".`
            );
          }
        });
      });

      if (missingFields.length > 0) {
        setErrorMessages(missingFields)
        setShowErrorModal(true)
        return
      }

      // 2. POST to API
      const payload = { case: caseData, slips: submissionSlips }

      // Log payload and gum shade config for debugging

      let json
      try {
        json = await createSlipMutation.mutateAsync(payload)
      } catch (err: any) {
        // handle validation errors from server
        if (err && err.status_code === 422 && err.errors) {
          const apiErrors: string[] = []
          Object.entries(err.errors).forEach(([field, msgs]: any) => {
            if (Array.isArray(msgs)) msgs.forEach((m: string) => apiErrors.push(m))
          })
          setErrorMessages(apiErrors)
          setShowErrorModal(true)
          return
        }
        setErrorMessages([err?.message || 'Failed to submit case.'])
        setShowErrorModal(true)
        return
      }

      if (json.success) {
        setIsCaseSubmitted(true)
        setErrorMessages([])
        localStorage.removeItem("mandibularTeethSelections")
        localStorage.removeItem("productTeethSelections")

        // Clear persisted tooth selection state after successful submission
        clearPersistedStatePattern(/^case-design-(maxillary|mandibular|selected)/)

        setShowSubmitWarningModal(false)

        // Update delivery dates from API response before navigation
        if (json.data && Array.isArray(json.data.slips) && json.data.slips.length > 0) {
          // Extract delivery dates from the API response and update local state
          const deliveryDatesFromApi: { [productId: string]: string } = {}
          
          json.data.slips.forEach((slip: any) => {
            if (slip.delivery && slip.delivery.delivery_date) {
              // Map delivery dates to existing products by matching product_id
              if (slip.products && Array.isArray(slip.products)) {
                slip.products.forEach((slipProduct: any) => {
                  // Find matching product in the current products array
                  const matchingProduct = products.find(p => {
                    const productId = Number(p.id.split('-')[0]) || Number(p.id)
                    return productId === slipProduct.product_id
                  })
                  
                  if (matchingProduct) {
                    deliveryDatesFromApi[matchingProduct.id] = slip.delivery.delivery_date
                  }
                })
              }
            }
          })

          // Store delivery dates for later use by CSDSection component
          if (Object.keys(deliveryDatesFromApi).length > 0) {
            // Store in a ref or state that can be accessed by CSDSection
            setSubmittedDeliveryDates(deliveryDatesFromApi)
          }

          // Also update slipData with delivery information
          if (json.data.slips[0].delivery) {
            updateSlipData({
              delivery: {
                delivery_date: json.data.slips[0].delivery.delivery_date,
                delivery_time: json.data.slips[0].delivery.delivery_time,
                pickup_date: json.data.slips[0].delivery.pickup_date,
                pickup_time: json.data.slips[0].delivery.pickup_time,
              }
            })
          }

          const firstSlip = json.data.slips[0];
          // Save the complete response data to localStorage for the virtual slip page
          localStorage.setItem("virtualSlipData", JSON.stringify(json.data));
          // Navigate to the virtual slip page with the slip ID
          router.push(`/virtual-slip/${firstSlip.id}`);
          return; // Exit early to prevent further execution
        }
        // Save slipId to localStorage if available (fallback)
        if (json.data && Array.isArray(json.data.slips) && json.data.slips.length > 0 && json.data.slips[0].id) {
          localStorage.setItem("slipId", String(json.data.slips[0].id));
        }

        // Persist the created response so upload helper can infer slip ids later
        try {
          const cacheStr = localStorage.getItem('caseDesignCache') || '{}'
          const cache = JSON.parse(cacheStr || '{}')
          cache.createdResponse = json.data
          localStorage.setItem('caseDesignCache', JSON.stringify(cache))
        } catch (err) {
          console.error('Failed to persist createdResponse to caseDesignCache', err)
        }

        // Immediately attempt to upload any stashed attachments to the created slips
        try {
          if (json.data && Array.isArray(json.data.slips) && json.data.slips.length > 0) {
            const slipIds = json.data.slips.map((s: any) => Number(s.id)).filter(Boolean)
            if (slipIds.length > 0) {
              // fire-and-forget but await so we can clear stash before returning
              await uploadStashedAttachmentsToSlips(slipIds)
            }
          }
        } catch (err) {
          console.error('Error uploading stashed attachments immediately after create', err)
        }

      } else if (json.status_code === 422 && json.errors) {
        const apiErrors: string[] = []
        Object.entries(json.errors).forEach(([field, msgs]) => {
          if (Array.isArray(msgs)) {
            msgs.forEach(msg => apiErrors.push(msg))
          }
        })
        setErrorMessages(apiErrors)
        setShowErrorModal(true)
      } else {
        setErrorMessages([json.message || "Failed to submit case."])
        setShowErrorModal(true)
      }
    } catch (err) {
      setErrorMessages(["Error submitting case. Please check your data and try again."])
      setShowErrorModal(true)
    } finally {
      setIsSubmittingCase(false)
    }
  }, [slipData, products, allNotes, toast])

  // Parse slipData from URL if present (for direct navigation or reload)
  const searchParams = useSearchParams()
  useEffect(() => {
    if (!slipData) {
      const stored = localStorage.getItem("caseDesignData")
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          updateSlipData(parsed)
          localStorage.removeItem("caseDesignData")
        } catch (e) {
          console.error("Failed to parse stored case design data:", e)
        }
      } else if (searchParams) {
        const formData = searchParams.get("formData")
        const selectedLab = searchParams.get("selectedLab")
        const selectedProduct = searchParams.get("selectedProduct")
        const selectedArch = searchParams.get("selectedArch")
        if (formData && selectedLab && selectedProduct && selectedArch) {
          updateSlipData({
            ...JSON.parse(formData),
            selectedLab: JSON.parse(selectedLab),
            selectedProduct: JSON.parse(selectedProduct),
            selectedArch,
          })
        }
      }
    }
  }, [slipData, searchParams, updateSlipData])

  // State to manage visibility of dropdowns for the currently open product
  const [dropdownVisibility, setDropdownVisibility] = useState<{
    [productId: string]: {
      maxillary: DropdownVisibilityState
      mandibular: DropdownVisibilityState
    }
  }>({})

  // Add state for dental chart and related handlers
  const toggleMaxillaryTooth = (toothNumber: number) => {
    setSelectedMaxillaryTeeth((prev: number[]) => {
      const newTeeth = prev.includes(toothNumber) 
        ? prev.filter((t) => t !== toothNumber) 
        : [...prev, toothNumber];
      return newTeeth.sort((a, b) => a - b); // Sort numerically in ascending order
    })
  }
  const toggleMandibularTooth = (toothNumber: number) => {
    setSelectedMandibularTeeth((prev: number[]) => {
      const newTeeth = prev.includes(toothNumber) 
        ? prev.filter((t) => t !== toothNumber) 
        : [...prev, toothNumber];
      return newTeeth.sort((a, b) => a - b); // Sort numerically in ascending order
    })
  }

  // Auto-select all teeth in mouth for maxillary arch
  const handleMaxillaryAutoSelectTeethInMouth = (teeth: number[]) => {
    setSelectedMaxillaryTeeth(teeth.sort((a, b) => a - b));
  }

  // Auto-select all teeth in mouth for mandibular arch
  const handleMandibularAutoSelectTeethInMouth = (teeth: number[]) => {
    setSelectedMandibularTeeth(teeth.sort((a, b) => a - b));
  }

  // --- Tooth status assignment handlers ---
  const handleMaxillaryStatusAssign = (status: string, teeth: number[]) => {
    
    // Remove teeth from all other status arrays first
    const removeFromAllArrays = (teethToRemove: number[]) => {
      setMaxillaryMissingTeeth(prev => prev.filter(t => !teethToRemove.includes(t)));
      setMaxillaryExtractedTeeth(prev => prev.filter(t => !teethToRemove.includes(t)));
      setMaxillaryWillExtractTeeth(prev => prev.filter(t => !teethToRemove.includes(t)));
      setMaxillaryPreppedTeeth(prev => prev.filter(t => !teethToRemove.includes(t)));
      setMaxillaryImplantTeeth(prev => prev.filter(t => !teethToRemove.includes(t)));
    };
    
    // Remove teeth from all arrays first
    removeFromAllArrays(teeth);
    
    // Then add to the appropriate array
    switch (status) {
      case 'Missing teeth':
        setMaxillaryMissingTeeth(prev => {
          const newTeeth = [...new Set([...prev, ...teeth])];
          return newTeeth;
        });
        break;
      case 'Has been extracted':
        setMaxillaryExtractedTeeth(prev => {
          const newTeeth = [...new Set([...prev, ...teeth])];
          return newTeeth;
        });
        break;
      case 'Will extract on delivery':
        setMaxillaryWillExtractTeeth(prev => {
          const newTeeth = [...new Set([...prev, ...teeth])];
          return newTeeth;
        });
        break;
      case 'Prepped':
        setMaxillaryPreppedTeeth(prev => {
          const newTeeth = [...new Set([...prev, ...teeth])];
          return newTeeth;
        });
        break;
      case 'Implant':
        setMaxillaryImplantTeeth(prev => {
          const newTeeth = [...new Set([...prev, ...teeth])];
          return newTeeth;
        });
        break;
      case 'Teeth in mouth':
        // For "Teeth in mouth", just remove from all other arrays (already done above)
        break;
      default:
    }
  };

  const handleMandibularStatusAssign = (status: string, teeth: number[]) => {
    
    // Remove teeth from all other status arrays first
    const removeFromAllArrays = (teethToRemove: number[]) => {
      setMandibularMissingTeeth(prev => prev.filter(t => !teethToRemove.includes(t)));
      setMandibularExtractedTeeth(prev => prev.filter(t => !teethToRemove.includes(t)));
      setMandibularWillExtractTeeth(prev => prev.filter(t => !teethToRemove.includes(t)));
      setMandibularPreppedTeeth(prev => prev.filter(t => !teethToRemove.includes(t)));
      setMandibularImplantTeeth(prev => prev.filter(t => !teethToRemove.includes(t)));
    };
    
    // Remove teeth from all arrays first
    removeFromAllArrays(teeth);
    
    // Then add to the appropriate array
    switch (status) {
      case 'Missing teeth':
        setMandibularMissingTeeth(prev => {
          const newTeeth = [...new Set([...prev, ...teeth])];
          return newTeeth;
        });
        break;
      case 'Has been extracted':
        setMandibularExtractedTeeth(prev => {
          const newTeeth = [...new Set([...prev, ...teeth])];
          return newTeeth;
        });
        break;
      case 'Will extract on delivery':
        setMandibularWillExtractTeeth(prev => {
          const newTeeth = [...new Set([...prev, ...teeth])];
          return newTeeth;
        });
        break;
      case 'Prepped':
        setMandibularPreppedTeeth(prev => {
          const newTeeth = [...new Set([...prev, ...teeth])];
          return newTeeth;
        });
        break;
      case 'Implant':
        setMandibularImplantTeeth(prev => {
          const newTeeth = [...new Set([...prev, ...teeth])];
          return newTeeth;
        });
        break;
      case 'Teeth in mouth':
        // For "Teeth in mouth", just remove from all other arrays (already done above)
        break;
      default:
    }
  };

  const handleMaxillaryAllTeethMissing = () => {
    const allMaxillaryTeeth = Array.from({ length: 16 }, (_, i) => i + 1);
    setSelectedMaxillaryTeeth(allMaxillaryTeeth);
  };

  const handleMandibularAllTeethMissing = () => {
    const allMandibularTeeth = Array.from({ length: 16 }, (_, i) => i + 17);
    setSelectedMandibularTeeth(allMandibularTeeth);
  };
  // Collapse state for dental charts - ensure they're always visible by default
  const [showMaxillaryChart, setShowMaxillaryChart] = useState<boolean>(true)
  const [showMandibularChart, setShowMandibularChart] = useState<boolean>(true)

  // State to track if user has started interacting with maxillary section
  const [hasMaxillaryInteraction, setHasMaxillaryInteraction] = useState<boolean>(false)

  // Watch for maxillary interactions - remove blur when user interacts
  useEffect(() => {
    const hasMaxillaryTeeth = selectedMaxillaryTeeth.length > 0;
    const hasMaxillaryExtractionType = effectiveSelectedExtractionType &&
      getExtractionTypeTeeth(effectiveSelectedExtractionType, 'maxillary').length > 0;

    if (hasMaxillaryTeeth || hasMaxillaryExtractionType) {
      setHasMaxillaryInteraction(true);
    }
  }, [selectedMaxillaryTeeth, effectiveSelectedExtractionType]);

  // Auto-expand both charts when user selects teeth in extraction type cards (Missing teeth, Has been extracted, etc.)
  useEffect(() => {
    // Check if any teeth are selected across all extraction types
    const extractionTypes = ["Teeth in mouth", "Missing teeth", "Has been extracted", "Will extract on delivery", "Prepped", "Implant"];

    let hasAnyExtractionTypeTeeth = false;

    for (const extractionType of extractionTypes) {
      const maxTeeth = getExtractionTypeTeeth(extractionType, 'maxillary');
      const manTeeth = getExtractionTypeTeeth(extractionType, 'mandibular');

      if (maxTeeth.length > 0 || manTeeth.length > 0) {
        hasAnyExtractionTypeTeeth = true;
        break;
      }
    }

    // If user has selected teeth in any extraction type card, show both charts (Overall view)
    if (hasAnyExtractionTypeTeeth) {
      setShowMaxillaryChart(true);
      setShowMandibularChart(true);
    }
  }, [extractionTypeTeethSelection, getExtractionTypeTeeth]);

  // Function to ensure charts are visible
  const ensureChartsVisible = () => {
    setShowMaxillaryChart(true)
    setShowMandibularChart(true)
  }
  
  // State to control visibility of case design center - visible from start but empty
  const [showCaseDesignCenter, setShowCaseDesignCenter] = useState<boolean>(true)
  
  // Check if any teeth are selected to determine if we should show case design center content
  // Use both local state, Zustand store, and extraction type teeth to ensure we catch all teeth selections
  const getEffectiveHasSelectedTeeth = () => {
    // Check regular teeth selection
    const hasRegularTeeth = selectedMaxillaryTeeth.length > 0 || selectedMandibularTeeth.length > 0 || 
                           zustandMaxillaryTeeth.length > 0 || zustandMandibularTeeth.length > 0;
    
    // Check extraction type teeth selection
    let hasExtractionTypeTeeth = false;
    if (effectiveSelectedExtractionType) {
      const extractionTypeMaxTeeth = getExtractionTypeTeeth(effectiveSelectedExtractionType, 'maxillary');
      const extractionTypeManTeeth = getExtractionTypeTeeth(effectiveSelectedExtractionType, 'mandibular');
      hasExtractionTypeTeeth = extractionTypeMaxTeeth.length > 0 || extractionTypeManTeeth.length > 0;
    }
    
    return hasRegularTeeth || hasExtractionTypeTeeth;
  };
  
  const hasSelectedTeeth = getEffectiveHasSelectedTeeth();
  
  // Reset all teeth selections on initial page load
  useEffect(() => {
    
    // Clear local state
    setSelectedMaxillaryTeeth([])
    setSelectedMandibularTeeth([])
    
    // Clear Zustand store
    clearAllSelections()
    clearMaxillarySelection()
    clearMandibularSelection()
    clearSelectedExtractionType()
    
    // Clear extraction type selection
    setSelectedExtractionType(null)
    
    // Clear teeth cards selection state (per-extraction-type selections)
    // Clear all extraction type teeth selections
    const extractionTypes = ["Teeth in mouth", "Missing teeth", "Has been extracted", "Will extract on delivery", "Prepped", "Implant"]
    extractionTypes.forEach(extractionType => {
      setExtractionTypeTeeth(extractionType, "maxillary", [])
      setExtractionTypeTeeth(extractionType, "mandibular", [])
    })
    
    // Clear any cached teeth selections from localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("productTeethSelections")
      localStorage.removeItem("mandibularTeethSelections")
      // Also clear the persisted state keys
      localStorage.removeItem("case-design-selected-maxillary")
      localStorage.removeItem("case-design-selected-mandibular")
    }
    
  }, [setSelectedMaxillaryTeeth, setSelectedMandibularTeeth, clearAllSelections, clearMaxillarySelection, clearMandibularSelection, clearSelectedExtractionType, setSelectedExtractionType, setExtractionTypeTeeth]) // Dependencies for the reset functions

  // Debug: Log teeth selection state
  useEffect(() => {
    
    if (effectiveSelectedExtractionType) {
      const extractionTypeMaxTeeth = getExtractionTypeTeeth(effectiveSelectedExtractionType, 'maxillary');
      const extractionTypeManTeeth = getExtractionTypeTeeth(effectiveSelectedExtractionType, 'mandibular');
    }
    
  }, [selectedMaxillaryTeeth, selectedMandibularTeeth, zustandMaxillaryTeeth, zustandMandibularTeeth, effectiveSelectedExtractionType, getExtractionTypeTeeth, hasSelectedTeeth]);

  // Responsive grid classes: keep narrow side columns when collapsed so header chevrons remain visible.
  // Center column expands when either side is collapsed.
  const tabletLeftClass = 'col-span-1'
  const tabletRightClass = 'col-span-1'
  const tabletCenterClass = showMaxillaryChart && showMandibularChart ? 'col-span-1' : (showMaxillaryChart || showMandibularChart ? 'col-span-2' : 'col-span-3')

  // Desktop layout now uses fixed widths from Figma specs:
  // Left (Maxillary): 488px, Center (Case Design): 876px, Right (Mandibular): 488px

  // For dental chart product mapping
  const productTeethMap = useMemo(() => {
    const map: { [key: number]: { abbreviation: string; color: string; hasAddOn: boolean }[] } = {}
    products.forEach((product) => {
      const teethNumbers = product.teeth
        .split(",")
        .map((s) => Number.parseInt(s.replace(/[^0-9]/g, ""), 10))
        .filter(Boolean)
      teethNumbers.forEach((toothNum) => {
        if (!map[toothNum]) {
          map[toothNum] = []
        }
        const hasAddOn =
          Array.isArray(product.addOns) &&
          product.addOns.some((addOn) => {
            if (typeof addOn.addOn === "string") {
              return addOn.addOn.includes(`#${toothNum}`)
            }
            return false
          })
        map[toothNum].push({
          abbreviation: product.abbreviation,
          color: product.color,
          hasAddOn,
        })
      })
    })
    return map
  }, [products])

  const maxillaryProductButtons = useMemo(() => {
    return products
      .filter((p) => p.type.includes("Maxillary"))
      .map((p) => {
        // If this product is open, show the current selectedMaxillaryTeeth
        const isOpen = openAccordionItem === p.id
        const teethList = isOpen
          ? selectedMaxillaryTeeth
          : p.teeth
            .split(",")
            .map((s) => Number.parseInt(s.replace(/[^0-9]/g, ""), 10))
            .filter(Boolean)
        return {
          id: p.id,
          name: p.name,
          teeth: teethList.length > 0 ? teethList.map((n) => `#${n}`).join(", ") : "",
          color: p.borderColor,
          maxillaryTeeth: teethList.length > 0 ? teethList.map((n) => `#${n}`).join(", ") : "",
          teethNumbers: teethList,
        }
      })
  }, [products, openAccordionItem, selectedMaxillaryTeeth])

  const mandibularProductButtons = useMemo(() => {
    return products
      .filter((p) => p.type.includes("Mandibular"))
      .map((p) => {
        // If this product is open, show the current selectedMandibularTeeth
        const isOpen = openAccordionItem === p.id
        const teethList = isOpen
          ? selectedMandibularTeeth
          : (p.mandibularTeeth || "")
            .split(",")
            .map((s) => Number.parseInt(s.replace(/[^0-9]/g, ""), 10))
            .filter(Boolean)
        return {
          id: p.id,
          name: p.name,
          teeth: teethList.length > 0 ? teethList.map((n) => `#${n}`).join(", ") : "",
          color: p.borderColor,
          mandibularTeeth: teethList.length > 0 ? teethList.map((n) => `#${n}`).join(", ") : "",
          teethNumbers: teethList,
        }
      })
  }, [products, openAccordionItem, selectedMandibularTeeth])

  // Initialize dropdown visibility when a new accordion item is opened
  useEffect(() => {
    if (openAccordionItem) {
      const product = products.find((p) => p.id === openAccordionItem);

      // Default off for both, but only enable arches that the product supports
      let archVisibility = {
        maxillary: {
          restoration: false,
          productName: false,
          grade: false,
          stage: false,
          teethShadePart1: false,
          teethShadePart2: false,
          gumShadePart1: false,
          gumShadePart2: false,
          impression: false,
        },
        mandibular: {
          restoration: false,
          productName: false,
          grade: false,
          stage: false,
          teethShadePart1: false,
          teethShadePart2: false,
          gumShadePart1: false,
          gumShadePart2: false,
          impression: false,
        }
      };

      if (product?.type.includes("Maxillary")) {
        archVisibility.maxillary.restoration = true;
      }
      if (product?.type.includes("Mandibular")) {
        archVisibility.mandibular.restoration = true;
      }

      setDropdownVisibility((prev) => ({
        ...prev,
        [openAccordionItem]: archVisibility,
      }));
    }
  }, [openAccordionItem, products]);


  const handleProductDetailChange = (
    productId: string,
    arch: "maxillary" | "mandibular",
    field: keyof ProductConfiguration,
    value: string | number | { id: number; name: string; qty: number }[],
  ) => {
    console.log('🔄 handleProductDetailChange called:', { productId, arch, field, value })
    
    // Update current slip products using functional update to ensure we have latest state
    setSlips(prev => {
      const updated = prev.map((slip, index) => {
        if (index === currentSlipIndex) {
          const updatedProducts = slip.products.map((product) => {
            if (product.id === productId) {
              const updatedProduct = { ...product }
              if (arch === "maxillary") {
                updatedProduct.maxillaryConfig = { ...updatedProduct.maxillaryConfig, [field]: value }
                console.log('🔄 Updated maxillary config:', { field, value, newConfig: updatedProduct.maxillaryConfig })
                if (
                  product.type.includes("Mandibular") &&
                  updatedProduct.mandibularConfig[field] === product.maxillaryConfig[field]
                ) {
                  updatedProduct.mandibularConfig = { ...updatedProduct.mandibularConfig, [field]: value }
                }
              } else {
                updatedProduct.mandibularConfig = { ...updatedProduct.mandibularConfig, [field]: value }
                console.log('🔄 Updated mandibular config:', { field, value, newConfig: updatedProduct.mandibularConfig })
              }
              return updatedProduct
            }
            return product
          })
          return { ...slip, products: updatedProducts }
        }
        return slip
      })
      return updated
    })
    
    // Also update legacy products array for backward compatibility
    setProducts((prevProducts) =>
      prevProducts.map((product) => {
        if (product.id === productId) {
          const updatedProduct = { ...product }
          if (arch === "maxillary") {
            updatedProduct.maxillaryConfig = { ...updatedProduct.maxillaryConfig, [field]: value }
            if (
              product.type.includes("Mandibular") &&
              updatedProduct.mandibularConfig[field] === product.maxillaryConfig[field]
            ) {
              updatedProduct.mandibularConfig = { ...updatedProduct.mandibularConfig, [field]: value }
            }
          } else {
            updatedProduct.mandibularConfig = { ...updatedProduct.mandibularConfig, [field]: value }
          }
          return updatedProduct
        }
        return product
      }),
    )
  }

  const handleStageNotesChange = (productId: string, stageNotes: string) => {
    // Update current slip products
    const currentSlip = getCurrentSlip()
    if (currentSlip) {
      const updatedProducts = currentSlip.products.map((product) => {
        if (product.id === productId) {
          return { ...product, stageNotesContent: stageNotes }
        }
        return product
      })
      updateCurrentSlipProducts(updatedProducts)
    }
    
    // Also update legacy products array for backward compatibility
    setProducts((prevProducts) =>
      prevProducts.map((product) => {
        if (product.id === productId) {
          return { ...product, stageNotesContent: stageNotes }
        }
        return product
      }),
    )
  }

  const { calculateDeliveryDate } = useSlipCreation()

  const handleLocalProductDetailChange = async (
    productId: string,
    arch: "maxillary" | "mandibular",
    field: keyof ProductConfiguration,
    value: string | number | { id: number; name: string; qty: number }[],
  ) => {
    handleProductDetailChange(productId, arch, field, value);

    // --- Show next dropdown and auto-select first value if available ---
    let nextField: keyof ProductConfiguration | undefined;
    let nextValue: string | undefined;
    const product = products.find((p) => p.id === productId);

    switch (field) {
      case "restoration":
        nextField = "productName";
        if (product) {
          const opts = product.subcategory_name ? [product.subcategory_name] : [];
          if (opts.length > 0) nextValue = opts[0];
        }
        break;
      case "productName":
        nextField = "grade";
        if (product && product.grades && product.grades.length > 0) {
          nextValue = product.grades[0].name;
        }
        break;
      case "grade":
        nextField = "stage";
        if (product && product.stages && product.stages.length > 0) {
          nextValue = product.stages[0].name;
        }
        break;
      case "stage":
        nextField = "teethShadePart1";
        // No auto-select for shade/gum/impression (usually fetched async)
        break;
      case "teethShadePart1":
        nextField = "teethShadePart2";
        break;
      case "teethShadePart2":
        nextField = "gumShadePart1";
        break;
      case "gumShadePart1":
        nextField = "gumShadePart2";
        break;
      case "gumShadePart2":
        nextField = "impression";
        break;
      default:
        break;
    }

    // If nextField and nextValue, auto-select it
    if (nextField && nextValue !== undefined) {
      handleProductDetailChange(productId, arch, nextField, nextValue);
    }

    setDropdownVisibility((prev) => {
      const newVisibility = { ...prev };
      const currentProductVisibility = newVisibility[productId] || {
        maxillary: {},
        mandibular: {},
      };
      const currentArchVisibility = currentProductVisibility[arch];

      // Show next dropdown
      if (nextField) {
        currentArchVisibility[nextField] = true;
      }

      // ...existing logic for both arches...
      // ...existing code...
      return newVisibility;
    });

    // --- When stage is selected, call calculateDeliveryDate API ---
    if (field === "stage") {
      const product = products.find((p) => p.id === productId)
      if (product) {
        // Get labId, productId, stageId
        const labId = slipData?.selectedLab?.lab?.id || slipData?.selectedLab?.id
        const prodId = Number(product.id.split('-')[0]) || Number(product.id)
        // Find stageId from selected stage value
        let stageId = undefined
        const selectedStageName = value
        const stageObj = product.stages?.find((s: any) => s.name === selectedStageName)
        if (stageObj) stageId = stageObj.id

        if (labId && prodId && stageId) {
          const deliveryData = await calculateDeliveryDate(prodId, stageId)
          if (deliveryData) {
            setAddSlipFormData((prev: any) => ({
              ...prev,
              pickupDate: deliveryData.pickup_date || "",
              deliveryDate: deliveryData.delivery_date || "",
              deliveryTime: deliveryData.delivery_time || "",
            }))
          }
        }
      }
    }
  }

  const generateStageNotes = useCallback(
    (product: Product, currentRushRequests: { [key: string]: any }) => {
      const config = product.maxillaryConfig
      const grade = config.grade || "N/A"
      const productName = config.productName || "N/A"
      const arches = product.type || "N/A"
      
      // Use ALL selected teeth from teeth cards across all extraction types
      let toothNumbers = ""
      
      // Get ALL selected teeth across all extraction types
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
      
      // Debug logging for teeth selection
      
      // Use all selected teeth from extraction types, fall back to general selection if none
      const currentMaxillaryTeeth = uniqueMaxillaryTeeth.length > 0 ? uniqueMaxillaryTeeth : 
                                   (selectedMaxillaryTeeth.length > 0 ? selectedMaxillaryTeeth : zustandMaxillaryTeeth)
      const currentMandibularTeeth = uniqueMandibularTeeth.length > 0 ? uniqueMandibularTeeth : 
                                    (selectedMandibularTeeth.length > 0 ? selectedMandibularTeeth : zustandMandibularTeeth)
      
      // Format teeth numbers with # prefix
      const maxTeethList = currentMaxillaryTeeth.map(t => `#${t}`)
      const manTeethList = currentMandibularTeeth.map(t => `#${t}`)
      
      if (maxTeethList.length > 0 && manTeethList.length > 0) {
        toothNumbers = `Maxillary teeth ${maxTeethList.join(", ")}, Mandibular teeth ${manTeethList.join(", ")}`
      } else if (maxTeethList.length > 0) {
        toothNumbers = `Maxillary teeth ${maxTeethList.join(", ")}`
      } else if (manTeethList.length > 0) {
        toothNumbers = `Mandibular teeth ${manTeethList.join(", ")}`
      } else {
        // Fallback to stored product teeth if no current selection
        const maxTeeth = product.maxillaryTeeth || product.teeth || ""
        const manTeeth = product.mandibularTeeth || ""
        const storedMaxTeethList = maxTeeth.split(",").map(t => t.trim()).filter(t => t.length > 0)
        const storedManTeethList = manTeeth.split(",").map(t => t.trim()).filter(t => t.length > 0)
        
        if (storedMaxTeethList.length > 0 && storedManTeethList.length > 0) {
          toothNumbers = `Maxillary teeth ${storedMaxTeethList.join(", ")}, Mandibular teeth ${storedManTeethList.join(", ")}`
        } else if (storedMaxTeethList.length > 0) {
          toothNumbers = `Maxillary teeth ${storedMaxTeethList.join(", ")}`
        } else if (storedManTeethList.length > 0) {
          toothNumbers = `Mandibular teeth ${storedManTeethList.join(", ")}`
        } else {
          toothNumbers = "N/A"
        }
      }
      
      const stage = config.stage || "N/A"
      const teethShade = getCompleteTeethShadeString(config.teethShadePart1 || "", config.teethShadePart2 || "") || "N/A"
      const gumShade = `${config.gumShadePart1} - ${config.gumShadePart2}`.trim() || "N/A"
      const impression = config.impression || "1x STL"

      let addOnsText = ""
      if (product.addOns && product.addOns.length > 0) {
        addOnsText = product.addOns.map((ao) => `${ao.qty}x ${ao.addOn}`).join(", ")
        addOnsText = ` and Add-on: ${addOnsText} on ${toothNumbers}`
      }

      let rushText = ""
      if (currentRushRequests[product.id]) {
        rushText = `\nRush case for ${currentRushRequests[product.id].targetDate} delivery.`
      }

      return `Fabricate a ${grade} ${productName} for ${arches} ${toothNumbers}, in ${stage} stage, using ${teethShade} shade and ${gumShade} gum, with ${impression}${addOnsText}.${rushText}`
    },
    [selectedMaxillaryTeeth, selectedMandibularTeeth, zustandMaxillaryTeeth, zustandMandibularTeeth, getExtractionTypeTeeth, extractionTypeTeethSelection],
  )

  // Effect to update stageNotesContent whenever products, rushRequests, or teeth selection change
  useEffect(() => {
    setProducts((prevProducts) =>
      prevProducts.map((product) => ({
        ...product,
        stageNotesContent: generateStageNotes(product, rushRequests),
      })),
    )
  }, [
    products
      .map((p) => JSON.stringify(p.maxillaryConfig) + JSON.stringify(p.mandibularConfig) + p.addOns.length + (p.teeth || "") + (p.maxillaryTeeth || "") + (p.mandibularTeeth || ""))
      .join(),
    rushRequests,
    generateStageNotes,
    selectedMaxillaryTeeth,
    selectedMandibularTeeth,
    zustandMaxillaryTeeth,
    zustandMandibularTeeth,
    extractionTypeTeethSelection,
  ])

  const handleOpenStageNotesModal = (product: Product) => {
    setStageNotesModalContext({
      patientName: slipData.patient,
      stage: product.maxillaryConfig.stage,
      deliveryDate: product.deliveryDate,
      caseNumber: slipData.caseNumber,
      slipNumber: slipData.slipNumber,
    })
    setShowStageNotesModal(true)
  }

  const handleRushRequest = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (product) {
      setSelectedProductForRush({
        ...product,
        stage: product.maxillaryConfig.stage,
        price: 100,
      })
      setShowRushModal(true)
    }
  }

  const handleConfirmRush = (productId: string, rushData: any) => {
    setRushRequests((prev) => ({
      ...prev,
      [productId]: rushData,
    }))
  }

  const handleCancelRush = (productId: string) => {
    setRushRequests((prev) => {
      const newRushRequests = { ...prev }
      delete newRushRequests[productId]
      return newRushRequests
    })
  }


  const {
    fetchProductTeethShades,
    fetchProductGumShades,
    fetchProductImpressions,
    fetchProductMaterials,
    fetchProductRetentions,
    fetchConnectedLabs,
    labProducts,
    uploadSlipAttachment, // added so we can upload stashed attachments after slip creation
  } = useSlipCreation()

  // Ensure we have access to the QueryClient for invalidation
  const queryClient = useQueryClient()

  // Mutation for creating slip/case (use shared hook)
  const createSlipMutation = useCreateSlip()

  // Add effect to upload any stashed attachments after a case/slip is submitted
  useEffect(() => {
    if (isCaseSubmitted) {
      // Fire-and-forget upload; don't block the UI
      (async () => {
        try {
          // Prefer slip ids in slipData (if your submit code updated slipData with created slips)
          let inferSlipIds: number[] = []
          if (slipData) {
            try {
              if (Array.isArray((slipData as any).slips) && (slipData as any).slips.length > 0) {
                inferSlipIds = (slipData as any).slips.map((s: any) => Number(s.id)).filter(Boolean)
              } else if ((slipData as any).id) {
                inferSlipIds = [Number((slipData as any).id)]
              } else if ((slipData as any).slipId) {
                inferSlipIds = [Number((slipData as any).slipId)]
              }
            } catch (err) {
              // ignore
            }
          }

          await uploadStashedAttachmentsToSlips(inferSlipIds)
        } catch (err) {
          console.error('Error uploading stashed attachments after submit', err)
        }
      })()
    }
  }, [isCaseSubmitted, slipData, uploadSlipAttachment])

  // Helper: upload stashed attachments (saved by the attachment modal when slip did not exist yet)
  const uploadStashedAttachmentsToSlips = async (slipIds: number[] = []) => {
    if (typeof window === 'undefined') return
    const stash = (window as any).__caseDesignAttachments as Array<{ file: File; url: string; type: string; description?: string }> | undefined
    if (!stash || stash.length === 0) return

    // If no slipIds provided, try to infer one from slipData
    if ((!slipIds || slipIds.length === 0) && slipData) {
      try {
        if (Array.isArray((slipData as any).slips) && (slipData as any).slips.length > 0) {
          slipIds = (slipData as any).slips.map((s: any) => Number(s.id)).filter(Boolean)
        } else if ((slipData as any).id) {
          slipIds = [Number((slipData as any).id)]
        } else if ((slipData as any).slipId) {
          slipIds = [Number((slipData as any).slipId)]
        }
      } catch (e) {
        // ignore and fallback to manual slipIds
      }
    }

    // Also try reading a created response stored in localStorage (if your submit flow writes it)
    try {
      const cacheStr = localStorage.getItem('caseDesignCache')
      if (cacheStr) {
        const cache = JSON.parse(cacheStr)
        const created = cache?.createdResponse
        if (!slipIds.length && created?.slips?.length) {
          slipIds = created.slips.map((s: any) => Number(s.id)).filter(Boolean)
        }
      }
    } catch (e) {
      // ignore
    }

    if (!slipIds || slipIds.length === 0) {
      console.warn('No slip id available to attach files to. Attachments remain stashed in window.__caseDesignAttachments')
      return
    }

    try {
      // Upload all stashed files to each slip (usually there's 1 slip)
      for (const slipId of slipIds) {
        for (const item of stash) {
          try {
            await uploadSlipAttachment(Number(slipId), item.file, item.type || 'other', item.description || '')
          } catch (err) {
            console.error('Failed to upload attachment for slip', slipId, item.file.name, err)
          }
        }
      }

      // Clear stash and localStorage metadata after attempted upload
      try {
        delete (window as any).__caseDesignAttachments
      } catch {}
      try {
        const cacheStr = localStorage.getItem('caseDesignCache') || '{}'
        const cache = JSON.parse(cacheStr || '{}')
        if (cache.attachments) delete cache.attachments
        // Optionally keep a record of the create response under createdResponse if the submit flow wrote it
        localStorage.setItem('caseDesignCache', JSON.stringify(cache))
      } catch (e) {
        console.error('Failed clearing attachments from localStorage', e)
      }
    } catch (e) {
      console.error('uploadStashedAttachmentsToSlips error', e)
    }
  }

  // Add state for selectedLabId
  const [selectedLabId, setSelectedLabId] = useState<number | null>(null)

  const handleOpenAddProductModal = () => {
    setDentalSlipStep(2)
    setHideSlipHeaderInDentalSlipPage(true)
    // Fetch lab products before showing modal
    let labId: number | null = null
    if (typeof window !== "undefined") {
      try {
        const userStr = localStorage.getItem("user")
        if (userStr) {
          const userObj = JSON.parse(userStr)
          if (Array.isArray(userObj.customers)) {
            const primary = userObj.customers.find((c: any) => c.is_primary === 1)
            if (primary) labId = primary.id
          }
        }
      } catch { }
    }
    if (labId) {
      setSelectedLabId(labId) // <-- Save labId for DentalSlipPage
      // Also fetch connected labs and offices for the dental slip page
      fetchConnectedLabs()
    }
    setShouldRefetchLabProducts(true)
    setShowDentalSlipPage(true)
  }

  // Add state to store the product selected from DentalSlipPage
  const [pendingProductData, setPendingProductData] = useState<any>(null)

  // Handler for when DentalSlipPage completes adding a product
  const handleDentalSlipComplete = (data: any) => {
    setShowDentalSlipPage(false)
    
    // Flatten the selectedProduct to include category_id and subcategory_id
    const flattenedData = {
      ...data,
      selectedProduct: {
        ...data.selectedProduct,
        // Flatten nested category and subcategory data
        category_name: data.selectedProduct?.category_name || data.selectedProduct?.subcategory?.category?.name,
        subcategory_name: data.selectedProduct?.subcategory_name || data.selectedProduct?.subcategory?.name,
        category_id: data.selectedProduct?.category_id || data.selectedProduct?.subcategory?.category?.id,
        subcategory_id: data.selectedProduct?.subcategory_id || data.selectedProduct?.subcategory?.id,
      }
    }
    
    setPendingProductData(flattenedData)
    setShouldRefetchLabProducts(true)
    setHideSlipHeaderInDentalSlipPage(false)
    
    // Update form data with the data from the modal
    if (data.formData) {
      setAddSlipFormData((prev: any) => ({
        ...prev,
        ...data.formData,
      }))
    }
    
    // Update slipData with the new data
    if (data.selectedLab && data.selectedProduct) {
      updateSlipData({
        selectedLab: data.selectedLab,
        selectedProduct: data.selectedProduct,
        selectedArch: data.selectedArch,
        selectedStages: data.selectedStages,
        ...data.formData,
      })
    }
    
  }

  // When pendingProductData is set, add the product to products state
  useEffect(() => {
    async function addPendingProductWithApiData() {
      if (pendingProductData && pendingProductData.selectedProduct) {
        const productKey = `${pendingProductData.selectedProduct.id}-${pendingProductData.selectedArch}`
        
        // Check if we're already processing this product
        if (processingProductRef.current === productKey) {
          return
        }
        
        // Mark this product as being processed
        processingProductRef.current = productKey
        
        // Check if this product already exists to prevent duplicates
        // Use a more robust check that includes the base product ID (without timestamp)
        const baseProductId = pendingProductData.selectedProduct.id
        const existingProduct = products.find(p => {
          const existingBaseId = p.id.split('-')[0] // Extract base ID from composite ID
          return existingBaseId === baseProductId.toString() &&
                 p.name === pendingProductData.selectedProduct.name && 
                 p.type === (pendingProductData.selectedArch === "upper" ? "Maxillary" : 
                            pendingProductData.selectedArch === "lower" ? "Mandibular" : 
                            "Maxillary, Mandibular")
        })
        
        if (existingProduct) {
   
          setPendingProductData(null)
          processingProductRef.current = null // Clear the processing flag
          return
        }
        
        const selectedProduct = pendingProductData.selectedProduct;
        let teethShadeBrand = "", teethShade = "", gumShadeBrand = "", gumShade = "", impression = ""
        let material = "", retention = ""
        const labId = pendingProductData.selectedLab?.lab?.id || pendingProductData.selectedLab?.id
        const prodId = selectedProduct.id

        // --- Fetch and attach product-specific shade/gum arrays ---
        let productTeethShades: any[] = []
        let productGumShades: any[] = []

        if (labId && prodId) {
          await fetchProductTeethShades(labId, prodId)
          const teethShadesRaw = window?.teethShadesCache || localStorage.getItem("teethShadesCache")
          if (teethShadesRaw) {
            productTeethShades = typeof teethShadesRaw === "string" ? JSON.parse(teethShadesRaw) : teethShadesRaw
            if (productTeethShades.length > 0) {
              teethShadeBrand = productTeethShades[0].name
              teethShade = productTeethShades[0].shades && productTeethShades[0].shades.length > 0 ? productTeethShades[0].shades[0].name : ""
            }
          }
          await fetchProductGumShades(labId, prodId)
          const gumShadesRaw = window?.gumShadesCache || localStorage.getItem("gumShadesCache")
          if (gumShadesRaw) {
            productGumShades = typeof gumShadesRaw === "string" ? JSON.parse(gumShadesRaw) : gumShadesRaw
            if (productGumShades.length > 0) {
              gumShadeBrand = productGumShades[0].name
              gumShade = productGumShades[0].shades && productGumShades[0].shades.length > 0 ? productGumShades[0].shades[0].name : ""
            }
          }
          await fetchProductImpressions(labId, prodId)
          const impressions = window?.impressionsCache || localStorage.getItem("impressionsCache")
          if (impressions) {
            const data = typeof impressions === "string" ? JSON.parse(impressions) : impressions
            if (data && Array.isArray(data) && data.length > 0) {
              impression = data[0].name
            }
          }
          await fetchProductMaterials(labId, prodId)
          const materials = window?.materialsCache || localStorage.getItem("materialsCache")
          if (materials) {
            const data = typeof materials === "string" ? JSON.parse(materials) : materials
            if (data && Array.isArray(data) && data.length > 0) {
              material = data[0].name
            }
          }
          await fetchProductRetentions(labId, prodId)
          const retentions = window?.retentionsCache || localStorage.getItem("retentionsCache")
          if (retentions) {
            const data = typeof retentions === "string" ? JSON.parse(retentions) : retentions
            if (data && Array.isArray(data) && data.length > 0) {
              retention = data[0].name
            }
          }
        }

        // Use the selected stage from dental slip page, or fall back to default
        const selectedStage = pendingProductData.selectedStages && pendingProductData.selectedStages.length > 0 
          ? (() => {
              const stageValue = pendingProductData.selectedStages[0];
              // If it's a number (ID), convert to name; if it's already a name, use as is
              if (typeof stageValue === 'number' || /^\d+$/.test(stageValue)) {
                const stageObj = selectedProduct.stages?.find((s: any) => s.id?.toString() === stageValue.toString());
                return stageObj?.name || getDefaultStage(selectedProduct);
              }
              return stageValue;
            })()
          : getDefaultStage(selectedProduct)

        const defaultProductConfig: ProductConfiguration = {
          restoration: selectedProduct.category_name || selectedProduct.category || "Removable Restoration",
          productName: selectedProduct.name || "Default Product",
          grade: getDefaultGrade(selectedProduct),
          stage: selectedStage,
          teethShadePart1: teethShadeBrand,
          teethShadePart2: teethShade,
          gumShadePart1: gumShadeBrand,
          gumShadePart2: gumShade,
          impression: impression,
          extractions: [],
        };
        const formattedTeeth = selectedMaxillaryTeeth.length > 0 ? selectedMaxillaryTeeth.map((tooth) => `#${tooth}`).join(", ") : "N/A";
        // --- Use default image if missing or placeholder ---
        const productImage =
          selectedProduct.image && selectedProduct.image !== "/placeholder.svg"
            ? selectedProduct.image
            : selectedProduct.image_url && selectedProduct.image_url !== "/placeholder.svg"
              ? selectedProduct.image_url
              : "/images/product-default.png" // <-- Default stock image
        const newProduct: Product = {
          id: selectedProduct.id + "-" + Date.now(),
          name: selectedProduct.name,
          type:
            pendingProductData.selectedArch === "upper"
              ? "Maxillary"
              : pendingProductData.selectedArch === "lower"
                ? "Mandibular"
                : "Maxillary, Mandibular",
          teeth: formattedTeeth,
          deliveryDate:
            pendingProductData.formData?.deliveryDate && pendingProductData.formData?.deliveryTime
              ? pendingProductData.formData.deliveryDate + " at " + pendingProductData.formData.deliveryTime
              : "",
          image: productImage,
          abbreviation: selectedProduct.name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase(),
          color: "bg-blue-600",
          borderColor: "bg-blue-600",
          addOns: [],
          stageNotesContent: "",
          maxillaryConfig: { ...defaultProductConfig },
          mandibularConfig: pendingProductData.selectedArch === "both" ? { ...defaultProductConfig } : { ...defaultProductConfig },
          // --- Attach the correct shade/gum arrays - extract from nested structure ---
          category_name: selectedProduct.category_name || selectedProduct.subcategory?.category?.name,
          subcategory_name: selectedProduct.subcategory_name || selectedProduct.subcategory?.name,
          category_id: selectedProduct.category_id || selectedProduct.subcategory?.category?.id,
          subcategory_id: selectedProduct.subcategory_id || selectedProduct.subcategory?.id,
          grades: selectedProduct.grades && selectedProduct.grades.length > 0 ? selectedProduct.grades : [
            { id: 1, name: "Economy", code: "ECO", status: "Active" },
            { id: 2, name: "Mid Grade", code: "MID", status: "Active" },
            { id: 3, name: "Premium", code: "PREM", status: "Active" }
          ],
          stages: selectedProduct.stages && selectedProduct.stages.length > 0 ? selectedProduct.stages : [
            { id: 1, name: "Bisque/Try In", code: "BISQUE", status: "Active" },
            { id: 2, name: "Die trim", code: "DIE", status: "Active" },
            { id: 3, name: "Finish", code: "FINISH", status: "Active" },
            { id: 4, name: "Digital design", code: "DIGITAL", status: "Active" }
          ],
          productTeethShades,
          productGumShades,
          extractions: [],
        }
        // Add product to current slip instead of global products array
        const currentSlip = getCurrentSlip()
        if (currentSlip) {
          const updatedProducts = [...currentSlip.products, newProduct]
          updateCurrentSlipProducts(updatedProducts)
        }
        
        // Also update legacy products array for backward compatibility
        setProducts((prev) => {
          const updated = [...prev, newProduct]
          return updated
        })
        setOpenAccordionItem(newProduct.id)
        setPendingProductData(null)
        
        // Reset case submission state to allow editing of new product
        setIsCaseSubmitted(false)
        
        // Clear the processing flag
        processingProductRef.current = null
      }
    }
    addPendingProductWithApiData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingProductData, selectedMaxillaryTeeth, fetchProductTeethShades, fetchProductGumShades, fetchProductImpressions, fetchProductMaterials, fetchProductRetentions])
  // Optionally, you can use useEffect to reset the refetch flag after it's used
  useEffect(() => {
    if (shouldRefetchLabProducts) {
      setShouldRefetchLabProducts(false)
    }
  }, [shouldRefetchLabProducts])

  const handleDeleteProduct = (productId: string) => {
    // Remove from current slip
    const currentSlip = getCurrentSlip()
    if (currentSlip) {
      const updatedProducts = currentSlip.products.filter((product) => product.id !== productId)
      updateCurrentSlipProducts(updatedProducts)
    }
    
    // Also remove from legacy products array for backward compatibility
    setProducts((prevProducts) => prevProducts.filter((product) => product.id !== productId))
    
    if (openAccordionItem === productId) {
      setOpenAccordionItem(undefined)
    }
  }

  const handleOpenAddOnsModal = (productId: string) => {
    setCurrentProductIdForAddOns(productId)
    setShowAddOnsModal(true)
  }

  const handleOpenMaxillaryAddOnsModal = (productId: string) => {
    setCurrentProductIdForAddOns(productId)
    setCurrentArch("maxillary")
    setShowMaxillaryAddOnsModal(true)
  }

  const handleOpenMandibularAddOnsModal = (productId: string) => {
    setCurrentProductIdForAddOns(productId)
    setCurrentArch("mandibular")
    setShowMandibularAddOnsModal(true)
  }

  const handleAddAddOnsToProduct = (productId: string, addOns: any[], arch: "maxillary" | "mandibular") => {
    
    setProducts((prevProducts) => {
      const updatedProducts = prevProducts.map((product) => {
        if (product.id === productId) {
          // Initialize addOns object if it doesn't exist
          const currentAddOns = product.addOns || {}
          
          const updatedProduct = {
            ...product,
            addOns: {
              ...currentAddOns,
              [arch]: addOns, // Replace the entire array for this arch
            },
          }
          
          return updatedProduct
        }
        return product
      })
      
      // Log the final state to verify
      const updatedProduct = updatedProducts.find(p => p.id === productId)
      if (updatedProduct) {
      }
      
      return updatedProducts
    })
    
    // Clear any cached data for this product/arch combination
    if (typeof window !== "undefined") {
      try {
        const cacheKey = `addons_${productId}_${arch}`
        localStorage.removeItem(cacheKey)
      } catch (error) {
        console.error("Error clearing cache:", error)
      }
    }
    
    setCurrentProductIdForAddOns(null)
  }

  // Removed handleAddExtractionsToProduct function - using product selection for extractions instead

  // Wrapper function for the add-ons modal (expects different signature)
  const handleAddOnsModalSubmit = (addOns: any[]) => {
    if (currentProductIdForAddOns && currentArch) {
      handleAddAddOnsToProduct(currentProductIdForAddOns, addOns, currentArch)
    } else {
      console.error(`Missing required data: currentProductIdForAddOns=${currentProductIdForAddOns}, currentArch=${currentArch}`)
    }
  }

  // Separate submit handlers for maxillary and mandibular modals
  const handleMaxillaryAddOnsModalSubmit = (addOns: any[]) => {
    if (currentProductIdForAddOns) {
      handleAddAddOnsToProduct(currentProductIdForAddOns, addOns, "maxillary")
    } else {
      console.error(`Missing required data: currentProductIdForAddOns=${currentProductIdForAddOns}`)
    }
  }

  const handleMandibularAddOnsModalSubmit = (addOns: any[]) => {
    if (currentProductIdForAddOns) {
      handleAddAddOnsToProduct(currentProductIdForAddOns, addOns, "mandibular")
    } else {
      console.error(`Missing required data: currentProductIdForAddOns=${currentProductIdForAddOns}`)
    }
  }

  const handleProductButtonClick = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (product) {
      // For maxillary
      const maxTeeth = (product.maxillaryTeeth || product.teeth || "")
        .split(",")
        .map((s) => Number.parseInt(s.replace(/[^0-9]/g, ""), 10))
        .filter(Boolean)
      setSelectedMaxillaryTeeth(maxTeeth)
      // For mandibular
      const manTeeth = (product.mandibularTeeth || "")
        .split(",")
        .map((s) => Number.parseInt(s.replace(/[^0-9]/g, ""), 10))
        .filter(Boolean)
      setSelectedMandibularTeeth(manTeeth)
    }
    setOpenAccordionItem((prev) => (prev === productId ? undefined : productId))
  }

  // Handler for when a product is selected from the modal in CSDSection
  const handleProductSelectedFromModal = async (selectedProduct: any, arch: string) => {
    try {
      // Generate unique product ID
      const timestamp = Date.now()
      const productId = `${selectedProduct.id}-${timestamp}`

      // Determine arch type based on selection
      let archType = ""
      if (arch === "maxillary") {
        archType = "Maxillary"
      } else if (arch === "mandibular") {
        archType = "Mandibular"
      } else if (arch === "both") {
        archType = "Maxillary, Mandibular"
      }

      // Get current selected teeth for the appropriate arch
      let teeth = ""
      if (arch === "maxillary" || arch === "both") {
        const maxTeeth = selectedMaxillaryTeeth.map(t => `#${t}`).join(", ")
        if (arch === "both") {
          const manTeeth = selectedMandibularTeeth.map(t => `#${t}`).join(", ")
          teeth = maxTeeth && manTeeth ? `${maxTeeth}, ${manTeeth}` : maxTeeth || manTeeth
        } else {
          teeth = maxTeeth
        }
      } else if (arch === "mandibular") {
        teeth = selectedMandibularTeeth.map(t => `#${t}`).join(", ")
      }

      // Get default values for configuration
      const defaultGrade = selectedProduct.grades?.find((g: any) => g.is_default === "Yes")?.name ||
        selectedProduct.grades?.[0]?.name || ""
      const defaultStage = selectedProduct.stages?.[0]?.name || ""

      // Create configuration object
      const config = {
        restoration: selectedProduct.category_name || "",
        productName: selectedProduct.name || "",
        grade: defaultGrade,
        stage: defaultStage,
        teethShadePart1: "",
        teethShadePart2: "",
        gumShadePart1: "",
        gumShadePart2: "",
        impression: "",
        extractions: selectedProduct.extractions || [],
      }

      // Create new product object
      const newProduct: Product = {
        id: productId,
        name: selectedProduct.name,
        type: archType,
        teeth,
        maxillaryTeeth: arch === "maxillary" || arch === "both" ? selectedMaxillaryTeeth.map(t => `#${t}`).join(", ") : "",
        mandibularTeeth: arch === "mandibular" || arch === "both" ? selectedMandibularTeeth.map(t => `#${t}`).join(", ") : "",
        deliveryDate: slipData.formData?.deliveryDate && slipData.formData?.deliveryTime
          ? slipData.formData.deliveryDate + " at " + slipData.formData.deliveryTime
          : "",
        image: selectedProduct.image_url || "/images/product-default.png",
        abbreviation: selectedProduct.name.split(" ").map((w: string) => w[0]).join("").toUpperCase(),
        color: "bg-white-600",
        borderColor: "border-blue-600",
        addOns: [],
        stageNotesContent: "",
        maxillaryConfig: { ...config },
        mandibularConfig: archType === "Maxillary, Mandibular" ? { ...config } : { ...config },
        // Pass all dropdown fields for use in CSDSection - extract from nested structure
        category_name: selectedProduct.category_name || selectedProduct.subcategory?.category?.name,
        subcategory_name: selectedProduct.subcategory_name || selectedProduct.subcategory?.name,
        category_id: selectedProduct.category_id || selectedProduct.subcategory?.category?.id,
        subcategory_id: selectedProduct.subcategory_id || selectedProduct.subcategory?.id,
        grades: selectedProduct.grades,
        stages: selectedProduct.stages,
        extractions: selectedProduct.extractions || [],
      }

     

      // Add product to current slip instead of global products array
      const currentSlip = getCurrentSlip()
      if (currentSlip) {
        const updatedProducts = [...currentSlip.products, newProduct]
        updateCurrentSlipProducts(updatedProducts)
      }
      
      // Also update legacy products array for backward compatibility
      setProducts((prev) => {
        const updated = [...prev, newProduct]
        return updated
      })

      // Debug: Check if extractions exist in selectedProduct
      console.log('🔍 [handleProductSelectedFromModal] selectedProduct.extractions:', selectedProduct.extractions);
      console.log('🔍 [handleProductSelectedFromModal] selectedProduct.data?.extractions:', selectedProduct.data?.extractions);
      console.log('🔍 [handleProductSelectedFromModal] selectedProduct.has_extraction:', selectedProduct.has_extraction);
      console.log('🔍 [handleProductSelectedFromModal] Full selectedProduct:', selectedProduct);

      // Save full product details to Zustand store (needed for MissingTeethCards)
      setSelectedProductDetails(selectedProduct);

      // Save extraction data to Zustand store
      // Check if extraction data exists in selectedProduct or if it needs to be fetched
      if (selectedProduct.extractions || selectedProduct.has_extraction || selectedProduct.extraction_options) {
        setProductExtractions(productId, {
          extractions: selectedProduct.extractions || [],
          has_extraction: selectedProduct.has_extraction,
          extraction_options: selectedProduct.extraction_options || []
        });
        console.log('🔍 Stored extraction data for product:', productId, selectedProduct.extractions);
        // Verify the data was stored correctly
        const storedData = getProductExtractions(productId);
        console.log('🔍 Verification - stored data:', storedData);
      } else if (selectedProduct.data?.extractions) {
        // Store extraction data from the detailed product data
        setProductExtractions(productId, {
          extractions: selectedProduct.data.extractions,
          has_extraction: selectedProduct.data.has_extraction,
          extraction_options: selectedProduct.data.extraction_options || []
        });
        console.log('🔍 Stored detailed extraction data for product:', productId, selectedProduct.data.extractions);
        // Verify the data was stored correctly
        const storedData = getProductExtractions(productId);
        console.log('🔍 Verification - stored detailed data:', storedData);
      } else {
        console.log('🔍 No extraction data found in selectedProduct:', selectedProduct);

        // Try to get extraction data from the original product ID (before timestamp)
        const originalProductId = selectedProduct.id;
        console.log('🔍 Attempting to retrieve extraction data for originalProductId:', originalProductId);

        // Log all stored extractions BEFORE attempting to retrieve
        const storeBefore = useTeethSelectionStore.getState();
        console.log('🔍 All stored product extractions BEFORE retrieval:', storeBefore.productExtractions);
        console.log('🔍 Keys in productExtractions:', Object.keys(storeBefore.productExtractions));
        console.log('🔍 Looking for key:', originalProductId, 'Type:', typeof originalProductId);

        const originalExtractionData = getProductExtractions(originalProductId);
        console.log('🔍 Retrieved extraction data:', originalExtractionData);

        if (originalExtractionData && originalExtractionData.extractions && originalExtractionData.extractions.length > 0) {
          // Copy extraction data from original product ID to generated product ID
          setProductExtractions(productId, originalExtractionData);
          console.log('🔍 Copied extraction data from original product ID:', originalProductId, 'to generated product ID:', productId, originalExtractionData);
          // Verify the data was stored correctly
          const storedData = getProductExtractions(productId);
          console.log('🔍 Verification - copied data:', storedData);
        } else {
          console.log('🔍 No extraction data found for original product ID either:', originalProductId);
          console.log('🔍 originalExtractionData was:', originalExtractionData);
        }
      }

      // Set as the active accordion item
      setOpenAccordionItem(productId)
      
      // Reset case submission state to allow editing of new product
      setIsCaseSubmitted(false)

    } catch (error) {
      console.error("Error adding product:", error)
    }
  }

  // Handler for updating stage notes
  const handleUpdateStageNotes = (productId: string, stageNotes: string) => {
    setProducts(prev => prev.map(p => 
      p.id === productId 
        ? { ...p, stageNotesContent: stageNotes }
        : p
    ))
  }

  function getTeethNumbers(teethString: string): number[] {
    return teethString
      .split(",")
      .map(s => parseInt(s.replace(/[^0-9]/g, ""), 10))
      .filter(Boolean);
  }

  function splitTeethByArch(teethString: string) {
    const all = getTeethNumbers(teethString);
    return {
      maxillaryTeeth: all.filter(n => n >= 1 && n <= 16),
      mandibularTeeth: all.filter(n => n >= 17 && n <= 32),
    };
  }

  // Add loading state - set to false to show page immediately
  const [loading, setLoading] = useState(false)

  // Wait for slipData and products to be ready before showing the design center
  useEffect(() => {
    // Only set loading to true if slipData is missing or products is empty
    // setLoading(!(slipData && (products.length > 0 || (labProducts && labProducts.length > 0))))
  }, [slipData, products.length, labProducts])

  // --- Persist slipData and products to localStorage for reload resilience ---
  useEffect(() => {
    // Only persist if slipData exists AND (products are present OR teeth are selected)
    // This prevents saving empty state when user hasn't interacted yet
    if (slipData && (products.length > 0 || selectedMaxillaryTeeth.length > 0 || selectedMandibularTeeth.length > 0)) {
      // Ensure doctor_id is present in slipData.formData and not null
      let doctorId =
        slipData.formData?.doctor_id ||
        slipData.formData?.doctorId ||
        slipData.formData?.doctor_info?.id ||
        slipData.formData?.doctor?.id ||
        null

      // If doctor_id is null, try to resolve from doctor name and officeDoctors in localStorage
      if (!doctorId && slipData.formData?.doctor) {
        try {
          const officeDoctorsStr = localStorage.getItem("officeDoctors")
          if (officeDoctorsStr) {
            const officeDoctors = JSON.parse(officeDoctorsStr)
            const foundDoc = officeDoctors.find(
              (doc: any) =>
                doc.full_name === slipData.formData.doctor ||
                `${doc.first_name} ${doc.last_name}` === slipData.formData.doctor
            )
            if (foundDoc) {
              doctorId = foundDoc.doctor_info?.id || foundDoc.id
            }
          }
        } catch { }
      }

      // Patch doctor_id into slipData.formData if missing or null
      const patchedSlipData = {
        ...slipData,
        formData: {
          ...slipData.formData,
          doctor_id: doctorId,
        },
      }

      // Ensure gumShadePart2 is present in maxillaryConfig and mandibularConfig for each product
      // Also include extraction data from Zustand store
      const patchedProducts = products.map(product => {
        const extractionData = getProductExtractions(product.id);
        return {
          ...product,
          maxillaryConfig: {
            ...product.maxillaryConfig,
            gumShadePart2: product.maxillaryConfig.gumShadePart2 ?? "",
          },
          mandibularConfig: {
            ...product.mandibularConfig,
            gumShadePart2: product.mandibularConfig.gumShadePart2 ?? "",
          },
          // Include extraction data in the product object so it can be restored on page refresh
          extractions: extractionData?.extractions || product.extractions || [],
          has_extraction: extractionData?.has_extraction || product.has_extraction,
          extraction_options: extractionData?.extraction_options || product.extraction_options || [],
        };
      });

      const cache = {
        slipData: patchedSlipData,
        products: patchedProducts,
        selectedMaxillaryTeeth,
        selectedMandibularTeeth,
        rushRequests,
        allNotes,
      }
      localStorage.setItem("caseDesignCache", JSON.stringify(cache))
    }
  }, [slipData, products, selectedMaxillaryTeeth, selectedMandibularTeeth, rushRequests, allNotes])

  // On initial load, only clear selected teeth from cache if there are no products
  // This allows users to continue working on existing cases with selected teeth
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cacheStr = localStorage.getItem("caseDesignCache")
      if (cacheStr) {
        try {
          const cache = JSON.parse(cacheStr)
          // Only clear teeth selection if there are no products in the cache
          // This prevents clearing teeth when user is continuing work on an existing case
          if (!cache.products || cache.products.length === 0) {
            delete cache.selectedMaxillaryTeeth
            delete cache.selectedMandibularTeeth
            localStorage.setItem("caseDesignCache", JSON.stringify(cache))
          }
        } catch { }
      }
    }
  }, [])

  // --- On mount, clear all cached data to ensure clean initial state ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      const shouldShowModal = localStorage.getItem("showDentalSlipModal")
      
      if (shouldShowModal === "true") {
        // Clear all cached data to ensure clean start
        localStorage.removeItem("caseDesignCache")
        localStorage.removeItem("productTeethSelections")
        localStorage.removeItem("showDentalSlipModal")

        // Clear persisted tooth selection state
        clearPersistedStatePattern(/^case-design-(maxillary|mandibular|selected)/)

        // Reset all state to ensure clean start
        clearSlipData()
        setProducts([])
        setSelectedMaxillaryTeeth([])
        setSelectedMandibularTeeth([])
        setRushRequests({})
        setAllNotes([])
        
        // Fetch lab products and connected labs before showing modal
        let labId: number | null = null
        try {
          const userStr = localStorage.getItem("user")
          if (userStr) {
            const userObj = JSON.parse(userStr)
            if (Array.isArray(userObj.customers)) {
              const primary = userObj.customers.find((c: any) => c.is_primary === 1)
              if (primary) labId = primary.id
            }
          }
        } catch { }
        
        if (labId) {
          setSelectedLabId(labId) // <-- Save labId for DentalSlipPage
          // Also fetch connected labs and offices for the dental slip page
          fetchConnectedLabs()
        }
        
        // Show the dental slip modal
        setDentalSlipStep(1)
        setHideSlipHeaderInDentalSlipPage(false)
        setShowDentalSlipPage(true)
        setIsCaseSubmitted(false) // Reset case submission state for new case
      } else {
        // For initial load, check if we should restore from persisted state
        // If there's persisted data, keep it (this prevents loss on resize)
        // Only clear if explicitly starting fresh
        setIsCaseSubmitted(false) // Ensure case submission state is false for editing

        // Don't clear persisted state on mount - let the hook restore it
        // This allows teeth selections to persist across page refreshes and resizes
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-show teeth shade modal when "both arch" is selected on initial load - DISABLED
  /*
  useEffect(() => {
      shouldShowTeethShadeModal: slipData?.shouldShowTeethShadeModal,
      selectedArch: slipData?.selectedArch,
      productsLength: products.length,
      showTeethShadeModal,
      slipData: slipData
    })

    // Check if we should show teeth shade modal based on slipData flag or "both arch" selection
    const shouldShowModal = slipData?.shouldShowTeethShadeModal || 
                          (slipData?.selectedArch === "both" && products.length > 0 && !showTeethShadeModal)
    
    if (shouldShowModal && products.length > 0 && !showTeethShadeModal) {
      const firstProduct = products[0]
      
      if (firstProduct) {
        // Check if teeth shade is not set for either arch
        const maxillaryShadeEmpty = !firstProduct.maxillaryConfig.teethShadePart1 || !firstProduct.maxillaryConfig.teethShadePart2
        const mandibularShadeEmpty = !firstProduct.mandibularConfig.teethShadePart1 || !firstProduct.mandibularConfig.teethShadePart2
        
        
        // Only show the modal if it's not already open and user hasn't explicitly closed it
        if (!showTeethShadeModal && (slipData?.shouldShowTeethShadeModal || maxillaryShadeEmpty || mandibularShadeEmpty) && !userClosedTeethShadeModal) {
          setTeethShadeModalData({
            productId: firstProduct.id,
            arch: maxillaryShadeEmpty ? "maxillary" : "mandibular",
            currentShadeSystem: firstProduct.maxillaryConfig.teethShadePart1 || "vita-classical",
            currentIndividualShade: firstProduct.maxillaryConfig.teethShadePart2 || "A1"
          })
          setShowTeethShadeModal(true)
          // Clear the flag after showing the modal
          if (slipData?.shouldShowTeethShadeModal) {
            updateSlipData({
              shouldShowTeethShadeModal: false
            })
          }
        } else {
          // Reset user closed flag when slip data changes (new case)
          setUserClosedTeethShadeModal(false)
        }
      }
    }
  }, [slipData?.selectedArch, slipData?.shouldShowTeethShadeModal, products, userClosedTeethShadeModal, showTeethShadeModal])
  */

  // --- Clear cache on successful submission or explicit cancel ---
  useEffect(() => {
    if (isCaseSubmitted) {
      localStorage.removeItem("caseDesignCache")
    }
  }, [isCaseSubmitted])

  // --- Per-product teeth selection state ---
  const [productTeethSelections, setProductTeethSelections] = useState<{ [productId: string]: number[] }>(() => {
    if (typeof window !== "undefined") {
      const str = localStorage.getItem("productTeethSelections")
      if (str) {
        try {
          return JSON.parse(str)
        } catch { }
      }
    }
    return {}
  })

  // --- When a product is selected, restore its teeth selection ---
  useEffect(() => {
    if (openAccordionItem) {
      // Restore both arches' teeth selection for the open product
      const teeth = productTeethSelections[openAccordionItem] || []
      setSelectedMaxillaryTeeth(teeth)
      // For mandibular, if you have a similar mapping, restore here as well
      const mandibularTeethSelections = JSON.parse(
        typeof window !== "undefined"
          ? localStorage.getItem("mandibularTeethSelections") || "{}"
          : "{}"
      )
      const manTeeth = mandibularTeethSelections[openAccordionItem] || []
      setSelectedMandibularTeeth(manTeeth)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAccordionItem])

  // --- When teeth are toggled, update localStorage for the current product ---
  useEffect(() => {
    if (openAccordionItem) {
      setProductTeethSelections((prev) => {
        const newSelections = { ...prev, [openAccordionItem]: selectedMaxillaryTeeth }
        if (typeof window !== "undefined") {
          localStorage.setItem("productTeethSelections", JSON.stringify(newSelections))
        }
        return newSelections
      })
      // Update the product's teeth property in products state for real-time display
      setProducts((prev) =>
        prev.map((p) =>
          p.id === openAccordionItem
            ? { ...p, teeth: selectedMaxillaryTeeth.length > 0 ? selectedMaxillaryTeeth.map((n) => `#${n}`).join(", ") : "" }
            : p
        )
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMaxillaryTeeth, openAccordionItem])

  // When mandibular teeth are toggled, update localStorage for the current product
  useEffect(() => {
    if (openAccordionItem) {
      const mandibularTeethSelections =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("mandibularTeethSelections") || "{}")
          : {}
      mandibularTeethSelections[openAccordionItem] = selectedMandibularTeeth
      if (typeof window !== "undefined") {
        localStorage.setItem("mandibularTeethSelections", JSON.stringify(mandibularTeethSelections))
      }
      setProducts((prev) =>
        prev.map((p) =>
          p.id === openAccordionItem
            ? { ...p, mandibularTeeth: selectedMandibularTeeth.length > 0 ? selectedMandibularTeeth.map((n) => `#${n}`).join(", ") : "" }
            : p
        )
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMandibularTeeth, openAccordionItem])

  // Error modal state
  const [errorMessages, setErrorMessages] = useState<string[]>([])
  // Add fade-out state for error box
  const [showErrorBox, setShowErrorBox] = useState(false)

  // Show error box when errorMessages changes
  useEffect(() => {
    if (errorMessages.length > 0) {
      setShowErrorBox(true)
      const fadeTimer = setTimeout(() => setShowErrorBox(false), 3000)
      const removeTimer = setTimeout(() => setErrorMessages([]), 3700) // 700ms after fade starts to allow animation to complete
      return () => {
        clearTimeout(fadeTimer)
        clearTimeout(removeTimer)
      }
    }
  }, [errorMessages])

  // Add handler to update pickup/delivery date/time from API
  interface HandleUpdateDatesFromApi {
    (pickupDate: string, deliveryDate: string, deliveryTime: string): void;
  }

  const handleUpdateDatesFromApi: HandleUpdateDatesFromApi = useCallback(
    (pickupDate, deliveryDate, deliveryTime) => {
      setAddSlipFormData((prev: any) => ({
        ...prev,
        pickupDate: pickupDate || "",
        deliveryDate: deliveryDate || "",
        deliveryTime: deliveryTime || "",
      }))
    },
    []
  )

  // Reusable function to hide case design page with loading overlay before redirecting to dashboard
  const handleRedirectToDashboard = useCallback(() => {
    // Trigger hiding state which shows loading overlay
    setIsHiding(true)

    // Wait for user to see the loading overlay before redirecting
    setTimeout(() => {
      router.push("/dashboard")
    }, 1000) // 1 second delay to show loading overlay properly
  }, [router])

  // Modal close handler - redirect to dashboard without closing the modal
  const handleModalClose = useCallback(() => {
    // Don't close the dental slip page modal, just redirect to dashboard
    handleRedirectToDashboard()
  }, [handleRedirectToDashboard])

  // Handler for teeth shade modal confirmation
  const handleTeethShadeConfirm = useCallback((shadeSystem: string, individualShade: string) => {
    if (teethShadeModalData) {
      const { productId, arch } = teethShadeModalData
      
      // Map system ID back to full brand name for dropdown compatibility
      const mapSystemIdToBrandName = (systemId: string): string => {
        switch (systemId) {
          case "vita-classical":
            return "VITA Classical - VITA Classical"
          case "ivoclar-chromascop":
            return "Ivoclar Chromascop - Ivoclar Chromascop"
          case "3d-master":
            return "VITA 3D-Master - VITA 3D-Master"
          default:
            return "VITA Classical - VITA Classical"
        }
      }
      
      const fullBrandName = mapSystemIdToBrandName(shadeSystem)
      
      // Find the current product to get teeth shade data
      const currentProduct = products.find(p => p.id === productId);
      if (!currentProduct) {
        console.error('❌ No current product found for teeth shade confirmation');
        return;
      }

      // Get the teeth shade data for the current product
      const teethShadeData = currentProduct.productTeethShades;
      if (!teethShadeData || teethShadeData.length === 0) {
        console.error('❌ No teeth shade data found for current product');
        return;
      }

      // Find the brand object using the shade system - try multiple matching strategies
      let brandObj = teethShadeData.find(brand => 
        brand.systemId === shadeSystem || 
        brand.name === shadeSystem ||
        brand.system_name === shadeSystem
      );

      // Fallback: try to find by partial name match or normalized match
      if (!brandObj) {
        brandObj = teethShadeData.find(brand => {
          // Partial match
          if (brand.name && shadeSystem && (brand.name.toLowerCase().includes(shadeSystem.toLowerCase()) || shadeSystem.toLowerCase().includes(brand.name.toLowerCase()))) {
            return true;
          }
          // Normalized match (remove special chars)
          const normalizedBrandName = (brand.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const normalizedSystem = shadeSystem.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normalizedBrandName && normalizedSystem && normalizedBrandName === normalizedSystem) {
            return true;
          }
          return false;
        });
      }

      if (!brandObj) {
        console.error('❌ Brand not found for shade system:', shadeSystem, 'Available brands:', teethShadeData.map(b => ({ id: b.id, name: b.name, system_name: b.system_name, systemId: b.systemId })));
        return;
      }

      // Find the shade object using the individual shade
      const shadeObj = brandObj.shades.find(shade => 
        shade.name === individualShade ||
        shade.shade_name === individualShade
      );

      if (!shadeObj) {
        console.error('❌ Shade not found for individual shade:', individualShade);
        return;
      }

     
      
      // Update the product configuration with the selected teeth shade
      setProducts((prevProducts) =>
        prevProducts.map((product) => {
          if (product.id === productId) {
            const updatedProduct = { ...product }
            // Store IDs in Part1 and Part2 instead of names
            if (arch === "maxillary") {
              updatedProduct.maxillaryConfig = {
                ...updatedProduct.maxillaryConfig,
                teethShadePart1: brandObj.id.toString(),
                teethShadePart2: shadeObj.id.toString(),
                teethShadeBrandId: brandObj.id,
                teethShadeBrandName: brandObj.name,
                teethShadeId: shadeObj.id,
                teethShadeName: shadeObj.name
              }
              // If it's a "both arch" product, also update mandibular with the same values
              if (product.type.includes("Mandibular")) {
                updatedProduct.mandibularConfig = {
                  ...updatedProduct.mandibularConfig,
                  teethShadePart1: brandObj.id.toString(),
                  teethShadePart2: shadeObj.id.toString(),
                  teethShadeBrandId: brandObj.id,
                  teethShadeBrandName: brandObj.name,
                  teethShadeId: shadeObj.id,
                  teethShadeName: shadeObj.name
                }
              }
            } else {
              updatedProduct.mandibularConfig = {
                ...updatedProduct.mandibularConfig,
                teethShadePart1: brandObj.id.toString(),
                teethShadePart2: shadeObj.id.toString(),
                teethShadeBrandId: brandObj.id,
                teethShadeBrandName: brandObj.name,
                teethShadeId: shadeObj.id,
                teethShadeName: shadeObj.name
              }
            }
            return updatedProduct
          }
          return product
        })
      )
      
      setTeethShadeModalData(null)
      setShowTeethShadeModal(false)
    }
  }, [teethShadeModalData, products])

  return (
    <StagesProvider>
      <GradesProvider>
        <div className={`case-design-page min-h-screen bg-gray-50 relative ${
          showDentalSlipPage ? 'opacity-50 pointer-events-none' : ''
        }`}>
      <LoadingOverlay
        isLoading={loading}
        title="Loading case design..."
        message="Please wait while we prepare your case design"
        zIndex={99999}
      />
      {!loading && (
        <div
          className={`min-h-screen bg-white flex flex-col md:flex-row transition-all duration-200 ${showAddSlipModal ? "blur-sm pointer-events-none" : ""
            }`}
        >
          {/* Mobile Sidebar Overlay */}
          {showMobileSidebar && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden"
              onClick={() => setShowMobileSidebar(false)}
            >
              <div
                id="mobile-sidebar"
                className="w-64 sm:w-72 md:w-80 h-full bg-white shadow-2xl transform transition-transform duration-300 ease-in-out"
                onClick={(e) => e.stopPropagation()}
              >
                <DashboardSidebar 
                  onClose={() => setShowMobileSidebar(false)}
                  isMobileOverlay={true}
                />
              </div>
            </div>
          )}

          {/* Desktop/Tablet Sidebar - hidden on mobile, visible on tablet+ */}
          <div className="hidden md:block md:flex-shrink-0">
            <DashboardSidebar />
          </div>

          {/* Main Case Design Center */}
          <div className="flex-1 flex flex-col min-h-screen overflow-hidden pb-safe mb-6 md:mb-0">
            {/* Header Section - Compact */}
            <div className="bg-gray-50 px-2 sm:px-3 md:px-4 lg:px-6 py-1.5 sm:py-2 flex-shrink-0">
              {/* Header row */}
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  {/* Mobile menu button */}
                  <button
                    type="button"
                    className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-200 transition md:hidden"
                    onClick={() => setShowMobileSidebar(true)}
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  {/* 3D Model Preload Status */}
                  {/* <FullPreloadStatus /> */}
                  <button
                    type="button"
                    className="h-7 w-7 ml-2 flex items-center justify-center rounded-md hover:bg-gray-200 transition"
                    onClick={handleRedirectToDashboard}
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {/* Error display */}
              {errorMessages.length > 0 && (
                <div className="mb-2">
                  <div
                    className={`bg-red-100 border border-red-300 text-red-700 rounded-lg px-3 py-2 text-sm transition-opacity duration-700 ${showErrorBox ? "opacity-100" : "opacity-0"}`}
                  >
                    <div className="font-semibold mb-1">Submission Errors:</div>
                    <ul className="list-disc list-inside">
                      {errorMessages.map((msg, idx) => (
                        <li key={idx}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              <AddSlipHeader
                formData={addSlipFormData}
                setFormData={setAddSlipFormData}
                selectedLabObj={null}
                selectedOfficeObj={null}
                doctorOptions={[]}
                officeOptions={[]}
                createdBy=""
                onOpenDeliveryDateModal={() => { }}
                formErrors={{}}
                doctorDropdownOpen={false}
                setDoctorDropdownOpen={() => {}}
                isSubmitted={isCaseSubmitted}
                onContinue={() => {}}
                onOfficeSelect={() => {}}
                onRefreshOffices={() => {}}
              />
            </div>

            {/* Main Content Area - Responsive scrolling */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
              <div className="p-3 md:p-4 lg:p-5 pb-16 md:pb-20 lg:pb-5 max-w-[2000px] mx-auto">
                {/* Mobile Layout - Single Column (below md) */}
                <div className="block md:hidden space-y-4">
                  {/* Case Design Center - Full width on mobile and tablet - Always visible but starts empty */}
                  <div>
                    <CSDSection
                      products={currentSlipProducts}
                      rushRequests={rushRequests}
                      openAccordionItem={openAccordionItem}
                      setOpenAccordionItem={setOpenAccordionItem}
                      handleProductButtonClick={handleProductButtonClick}
                      onUpdateDeliveryDates={handleDeliveryDatesUpdate}
                      handleAddProductClick={handleOpenAddProductModal}
                      handleDeleteProduct={handleDeleteProduct}
                      handleProductDetailChange={handleProductDetailChange}
                      handleUpdateStageNotes={handleUpdateStageNotes}
                      handleStageNotesChange={handleStageNotesChange}
                      handleOpenAddOnsModal={handleOpenAddOnsModal}
                      handleOpenMaxillaryAddOnsModal={handleOpenMaxillaryAddOnsModal}
                      handleOpenMandibularAddOnsModal={handleOpenMandibularAddOnsModal}
                      handleRushRequest={handleRushRequest}
                      handleCancelRush={handleCancelRush}
                      setShowAttachModal={setShowAttachModal}
                      showAttachModal={showAttachModal}
                      isCaseSubmitted={isCaseSubmitted}
                      setShowStageNotesModal={handleOpenStageNotesModal}
                      allNotes={allNotes}
                      setAllNotes={setAllNotes}
                      slipData={slipData}
                      handleAddAddOnsToProduct={handleAddAddOnsToProduct}
                      // Removed handleAddExtractionsToProduct prop - using product selection for extractions instead
                      handleUpdateDatesFromApi={handleUpdateDatesFromApi}
                      onProductSelected={handleProductSelectedFromModal}
                      setCurrentArch={setCurrentArch}
                      onAddNewStage={(productId: string, arch: string) => {
                      }}
                      onRefreshRestoration={(productId: string, arch: string) => {
                      }}
                      onRefreshProduct={(productId: string, arch: string) => {
                      }}
                      onTeethShadeSelect={(productId: string, arch: "maxillary" | "mandibular", shadeSystem: string, individualShade: string) => {
                        setTeethShadeModalData({
                          productId,
                          arch,
                          currentShadeSystem: shadeSystem,
                          currentIndividualShade: individualShade
                        })
                        setShowTeethShadeModal(true)
                      }}
                      hasSelectedTeeth={hasSelectedTeeth}
                      selectedMaxillaryTeeth={selectedMaxillaryTeeth}
                      selectedMandibularTeeth={selectedMandibularTeeth}
                      selectedExtractionType={effectiveSelectedExtractionType}
                      onExtractionTypeSelect={handleExtractionTypeSelect}
                      onTeethSelectionChange={handleTeethSelectionChange}
                      onClearTeethSelection={() => {
                        setSelectedMaxillaryTeeth([]);
                        setSelectedMandibularTeeth([]);
                      }}
                    />
                  </div>
                  
                  {/* Dental Charts - Single column stack on mobile and tablet */}
                  <div className={`space-y-4 ${showDentalSlipPage ? 'hidden' : ''}`}>
                      {(slipData?.selectedArch === "upper" || !slipData) && (
                      <div>
                          <InteractiveDentalChart3D
                            type="maxillary"
                            selectedTeeth={selectedMaxillaryTeeth}
                            onToothToggle={isCaseSubmitted ? () => {} : toggleMaxillaryTooth}
                            title="MAXILLARY"
                            productTeethMap={productTeethMap}
                            productButtons={maxillaryProductButtons}
                            visibleArch={slipData?.selectedArch || "upper"}
                            onProductButtonClick={handleProductButtonClick}
                            openAccordionItem={openAccordionItem}
                            isCaseSubmitted={isCaseSubmitted}
                            selectedProduct={currentSelectedProduct}
                            onProductSelect={handleProductSelect}
                            productDetails={currentSelectedProductDetails}
                            getProductExtractions={getProductExtractions}
                            showToothMappingToolbar={showToothMappingToolbar}
                            onToothMappingModeSelect={setSelectedToothMappingMode}
                            selectedExtractionType={effectiveSelectedExtractionType}
                            onExtractionTypeSelect={setSelectedMaxillaryExtractionType}
                            selectedToothMappingMode={selectedToothMappingMode}
                            missingTeeth={maxillaryMissingTeeth}
                            extractedTeeth={maxillaryExtractedTeeth}
                            willExtractTeeth={maxillaryWillExtractTeeth}
                            onAllTeethMissing={handleMaxillaryAllTeethMissing}
                            onAutoSelectTeethInMouth={handleMaxillaryAutoSelectTeethInMouth}
                            onStatusAssign={handleMaxillaryStatusAssign}
                            currentToothStatuses={maxillaryToothStatuses}
                            selectedProductForColor={selectedProductForColor}
                            onProductColorSelect={handleProductColorSelect}
                            selectedWillExtractForColor={selectedWillExtractForColor}
                            onWillExtractColorSelect={handleWillExtractColorSelect}
                            onClearTeethSelection={() => setSelectedMaxillaryTeeth([])}
                            isCollapsed={!showMaxillaryChart}
                            onToggleCollapse={() => setShowMaxillaryChart((s) => !s)}
                          />
                      </div>
                    )}
                    {(slipData?.selectedArch === "lower" || !slipData) && (
                      <div>
                          <InteractiveDentalChart3D
                            type="mandibular"
                            selectedTeeth={selectedMandibularTeeth}
                            onToothToggle={isCaseSubmitted ? () => { } : toggleMandibularTooth}
                            title="MANDIBULAR"
                            productTeethMap={productTeethMap}
                            productButtons={mandibularProductButtons}
                            visibleArch={slipData?.selectedArch || "upper"}
                            onProductButtonClick={handleProductButtonClick}
                            openAccordionItem={openAccordionItem}
                            isCaseSubmitted={isCaseSubmitted}
                            selectedProduct={currentSelectedProduct}
                            onProductSelect={handleProductSelect}
                            productDetails={currentSelectedProductDetails}
                            getProductExtractions={getProductExtractions}
                            showToothMappingToolbar={showToothMappingToolbar}
                            onToothMappingModeSelect={setSelectedToothMappingMode}
                            selectedExtractionType={effectiveSelectedExtractionType}
                            onExtractionTypeSelect={setSelectedMandibularExtractionType}
                            selectedToothMappingMode={selectedToothMappingMode}
                            missingTeeth={mandibularMissingTeeth}
                            extractedTeeth={mandibularExtractedTeeth}
                            willExtractTeeth={mandibularWillExtractTeeth}
                            onAllTeethMissing={handleMandibularAllTeethMissing}
                            onAutoSelectTeethInMouth={handleMandibularAutoSelectTeethInMouth}
                            onStatusAssign={handleMandibularStatusAssign}
                            currentToothStatuses={mandibularToothStatuses}
                            selectedProductForColor={selectedProductForColor}
                            onProductColorSelect={handleProductColorSelect}
                            selectedWillExtractForColor={selectedWillExtractForColor}
                            onWillExtractColorSelect={handleWillExtractColorSelect}
                            onClearTeethSelection={() => setSelectedMandibularTeeth([])}
                            isCollapsed={!showMandibularChart}
                            onToggleCollapse={() => setShowMandibularChart((s) => !s)}
                          />
                      </div>
                    )}
                    {slipData?.selectedArch === "both" && (
                      <>
                        <div>
                            <InteractiveDentalChart3D
                              type="maxillary"
                              selectedTeeth={selectedMaxillaryTeeth}
                              onToothToggle={isCaseSubmitted ? () => {} : toggleMaxillaryTooth}
                              title="MAXILLARY"
                              productTeethMap={productTeethMap}
                              productButtons={maxillaryProductButtons}
                              visibleArch={slipData?.selectedArch || "upper"}
                              onProductButtonClick={handleProductButtonClick}
                              openAccordionItem={openAccordionItem}
                              isCaseSubmitted={isCaseSubmitted}
                            selectedExtractionType={effectiveSelectedExtractionType}
                              selectedProduct={currentSelectedProduct}
                              onProductSelect={handleProductSelect}
                              productDetails={currentSelectedProductDetails}
                              showToothMappingToolbar={showToothMappingToolbar}
                              onToothMappingModeSelect={setSelectedToothMappingMode}
                              selectedToothMappingMode={selectedToothMappingMode}
                              missingTeeth={maxillaryMissingTeeth}
                              extractedTeeth={maxillaryExtractedTeeth}
                              willExtractTeeth={maxillaryWillExtractTeeth}
                              onAllTeethMissing={handleMaxillaryAllTeethMissing}
                              onAutoSelectTeethInMouth={handleMaxillaryAutoSelectTeethInMouth}
                              onStatusAssign={handleMaxillaryStatusAssign}
                              currentToothStatuses={maxillaryToothStatuses}
                              selectedProductForColor={selectedProductForColor}
                              onProductColorSelect={handleProductColorSelect}
                              onClearTeethSelection={() => setSelectedMaxillaryTeeth([])}
                              onExtractionTypeSelect={handleExtractionTypeSelect}
                              onTeethSelectionChange={handleTeethSelectionChange}
                              isCollapsed={!showMaxillaryChart}
                              onToggleCollapse={() => setShowMaxillaryChart((s) => !s)}
                            />
                        </div>
                        <div>
                            <InteractiveDentalChart3D
                              type="mandibular"
                              selectedTeeth={selectedMandibularTeeth}
                              onToothToggle={isCaseSubmitted ? () => { } : toggleMandibularTooth}
                              title="MANDIBULAR"
                              productTeethMap={productTeethMap}
                              productButtons={mandibularProductButtons}
                              visibleArch={slipData?.selectedArch || "upper"}
                              onProductButtonClick={handleProductButtonClick}
                              openAccordionItem={openAccordionItem}
                              isCaseSubmitted={isCaseSubmitted}
                            selectedExtractionType={effectiveSelectedExtractionType}
                              selectedProduct={currentSelectedProduct}
                              onProductSelect={handleProductSelect}
                              productDetails={currentSelectedProductDetails}
                              showToothMappingToolbar={showToothMappingToolbar}
                              onToothMappingModeSelect={setSelectedToothMappingMode}
                              selectedToothMappingMode={selectedToothMappingMode}
                              missingTeeth={mandibularMissingTeeth}
                              extractedTeeth={mandibularExtractedTeeth}
                              willExtractTeeth={mandibularWillExtractTeeth}
                              onAllTeethMissing={handleMandibularAllTeethMissing}
                              onAutoSelectTeethInMouth={handleMandibularAutoSelectTeethInMouth}
                              onStatusAssign={handleMandibularStatusAssign}
                              selectedProductForColor={selectedProductForColor}
                              onProductColorSelect={handleProductColorSelect}
                              onClearTeethSelection={() => setSelectedMandibularTeeth([])}
                              onExtractionTypeSelect={handleExtractionTypeSelect}
                              onTeethSelectionChange={handleTeethSelectionChange}
                              isCollapsed={!showMandibularChart}
                              onToggleCollapse={() => setShowMandibularChart((s) => !s)}
                            />
                        </div>
                      </>
                    )}
                    </div>
                </div>

                {/* Tablet Layout - 2 Column Grid (md to lg) */}
                <div className="hidden md:block lg:hidden">
                  <div className="grid grid-cols-2 gap-5">
                    {/* Left Column: Charts */}
                    <div className="space-y-4">
                      {(slipData?.selectedArch === "upper" || !slipData) && (
                        <div>
                          <InteractiveDentalChart3D
                            type="maxillary"
                            selectedTeeth={selectedMaxillaryTeeth}
                            onToothToggle={isCaseSubmitted ? () => {} : toggleMaxillaryTooth}
                            title="MAXILLARY"
                            productTeethMap={productTeethMap}
                            productButtons={maxillaryProductButtons}
                            visibleArch={slipData?.selectedArch || "upper"}
                            onProductButtonClick={handleProductButtonClick}
                            openAccordionItem={openAccordionItem}
                            isCaseSubmitted={isCaseSubmitted}
                            selectedProduct={currentSelectedProduct}
                            onProductSelect={handleProductSelect}
                            productDetails={currentSelectedProductDetails}
                            getProductExtractions={getProductExtractions}
                            showToothMappingToolbar={showToothMappingToolbar}
                            onToothMappingModeSelect={setSelectedToothMappingMode}
                            selectedExtractionType={effectiveSelectedExtractionType}
                            onExtractionTypeSelect={setSelectedMaxillaryExtractionType}
                            selectedToothMappingMode={selectedToothMappingMode}
                            missingTeeth={maxillaryMissingTeeth}
                            extractedTeeth={maxillaryExtractedTeeth}
                            willExtractTeeth={maxillaryWillExtractTeeth}
                            onAllTeethMissing={handleMaxillaryAllTeethMissing}
                            onAutoSelectTeethInMouth={handleMaxillaryAutoSelectTeethInMouth}
                            onStatusAssign={handleMaxillaryStatusAssign}
                            currentToothStatuses={maxillaryToothStatuses}
                            selectedProductForColor={selectedProductForColor}
                            onProductColorSelect={handleProductColorSelect}
                            selectedWillExtractForColor={selectedWillExtractForColor}
                            onWillExtractColorSelect={handleWillExtractColorSelect}
                            isCollapsed={!showMaxillaryChart}
                            onToggleCollapse={() => setShowMaxillaryChart((s) => !s)}
                          />
                        </div>
                      )}
                      {(slipData?.selectedArch === "lower" || !slipData) && (
                        <div>
                          <InteractiveDentalChart3D
                            type="mandibular"
                            selectedTeeth={selectedMandibularTeeth}
                            onToothToggle={isCaseSubmitted ? () => { } : toggleMandibularTooth}
                            title="MANDIBULAR"
                            productTeethMap={productTeethMap}
                            productButtons={mandibularProductButtons}
                            visibleArch={slipData?.selectedArch || "upper"}
                            onProductButtonClick={handleProductButtonClick}
                            openAccordionItem={openAccordionItem}
                            isCaseSubmitted={isCaseSubmitted}
                            selectedProduct={currentSelectedProduct}
                            onProductSelect={handleProductSelect}
                            productDetails={currentSelectedProductDetails}
                            getProductExtractions={getProductExtractions}
                            showToothMappingToolbar={showToothMappingToolbar}
                            onToothMappingModeSelect={setSelectedToothMappingMode}
                            selectedExtractionType={effectiveSelectedExtractionType}
                            onExtractionTypeSelect={setSelectedMandibularExtractionType}
                            selectedToothMappingMode={selectedToothMappingMode}
                            missingTeeth={mandibularMissingTeeth}
                            extractedTeeth={mandibularExtractedTeeth}
                            willExtractTeeth={mandibularWillExtractTeeth}
                            onAllTeethMissing={handleMandibularAllTeethMissing}
                            onAutoSelectTeethInMouth={handleMandibularAutoSelectTeethInMouth}
                            onStatusAssign={handleMandibularStatusAssign}
                            currentToothStatuses={mandibularToothStatuses}
                            selectedProductForColor={selectedProductForColor}
                            onProductColorSelect={handleProductColorSelect}
                            selectedWillExtractForColor={selectedWillExtractForColor}
                            onWillExtractColorSelect={handleWillExtractColorSelect}
                            isCollapsed={!showMandibularChart}
                            onToggleCollapse={() => setShowMandibularChart((s) => !s)}
                          />
                        </div>
                      )}
                      {slipData?.selectedArch === "both" && (
                        <>
                            <div>
                              <InteractiveDentalChart3D
                                type="maxillary"
                                selectedTeeth={selectedMaxillaryTeeth}
                                onToothToggle={isCaseSubmitted ? () => {} : toggleMaxillaryTooth}
                                title="MAXILLARY"
                                productTeethMap={productTeethMap}
                                productButtons={maxillaryProductButtons}
                                visibleArch={slipData?.selectedArch || "upper"}
                                onProductButtonClick={handleProductButtonClick}
                                openAccordionItem={openAccordionItem}
                                isCaseSubmitted={isCaseSubmitted}
                            selectedExtractionType={effectiveSelectedExtractionType}
                                selectedProduct={currentSelectedProduct}
                                onProductSelect={handleProductSelect}
                                productDetails={currentSelectedProductDetails}
                                showToothMappingToolbar={showToothMappingToolbar}
                                onToothMappingModeSelect={setSelectedToothMappingMode}
                                selectedToothMappingMode={selectedToothMappingMode}
                                missingTeeth={maxillaryMissingTeeth}
                                extractedTeeth={maxillaryExtractedTeeth}
                                willExtractTeeth={maxillaryWillExtractTeeth}
                                onAllTeethMissing={handleMaxillaryAllTeethMissing}
                                onAutoSelectTeethInMouth={handleMaxillaryAutoSelectTeethInMouth}
                                onStatusAssign={handleMaxillaryStatusAssign}
                                currentToothStatuses={maxillaryToothStatuses}
                                selectedProductForColor={selectedProductForColor}
                                onProductColorSelect={handleProductColorSelect}
                                isCollapsed={!showMaxillaryChart}
                                onToggleCollapse={() => setShowMaxillaryChart((s) => !s)}
                              />
                            </div>
                            <div>
                              <InteractiveDentalChart3D
                                type="mandibular"
                                selectedTeeth={selectedMandibularTeeth}
                                onToothToggle={isCaseSubmitted ? () => { } : toggleMandibularTooth}
                                title="MANDIBULAR"
                                productTeethMap={productTeethMap}
                                productButtons={mandibularProductButtons}
                                visibleArch={slipData?.selectedArch || "upper"}
                                onProductButtonClick={handleProductButtonClick}
                                openAccordionItem={openAccordionItem}
                                isCaseSubmitted={isCaseSubmitted}
                            selectedExtractionType={effectiveSelectedExtractionType}
                                selectedProduct={currentSelectedProduct}
                                onProductSelect={handleProductSelect}
                                productDetails={currentSelectedProductDetails}
                                showToothMappingToolbar={showToothMappingToolbar}
                                onToothMappingModeSelect={setSelectedToothMappingMode}
                                selectedToothMappingMode={selectedToothMappingMode}
                                missingTeeth={mandibularMissingTeeth}
                                extractedTeeth={mandibularExtractedTeeth}
                                willExtractTeeth={mandibularWillExtractTeeth}
                                onAllTeethMissing={handleMandibularAllTeethMissing}
                                onAutoSelectTeethInMouth={handleMandibularAutoSelectTeethInMouth}
                                onStatusAssign={handleMandibularStatusAssign}
                                selectedProductForColor={selectedProductForColor}
                                onProductColorSelect={handleProductColorSelect}
                                isCollapsed={!showMandibularChart}
                                onToggleCollapse={() => setShowMandibularChart((s) => !s)}
                              />
                            </div>
                        </>
                      )}
                    </div>

                    {/* Right Column: CSD Section */}
                    <div className="pl-4 w-full h-full flex flex-col">
                      <CSDSection
                        products={currentSlipProducts}
                        rushRequests={rushRequests}
                        openAccordionItem={openAccordionItem}
                        setOpenAccordionItem={setOpenAccordionItem}
                        handleProductButtonClick={handleProductButtonClick}
                        onUpdateDeliveryDates={handleDeliveryDatesUpdate}
                        submittedDeliveryDates={submittedDeliveryDates}
                        handleAddProductClick={handleOpenAddProductModal}
                        handleDeleteProduct={handleDeleteProduct}
                        handleProductDetailChange={handleProductDetailChange}
                        handleUpdateStageNotes={handleUpdateStageNotes}
                        handleStageNotesChange={handleStageNotesChange}
                        handleOpenAddOnsModal={handleOpenAddOnsModal}
                        handleOpenMaxillaryAddOnsModal={handleOpenMaxillaryAddOnsModal}
                        handleOpenMandibularAddOnsModal={handleOpenMandibularAddOnsModal}
                        handleRushRequest={handleRushRequest}
                        handleCancelRush={handleCancelRush}
                        setShowAttachModal={setShowAttachModal}
                        showAttachModal={showAttachModal}
                        isCaseSubmitted={isCaseSubmitted}
                        setShowStageNotesModal={handleOpenStageNotesModal}
                        allNotes={allNotes}
                        setAllNotes={setAllNotes}
                        slipData={slipData}
                        handleAddAddOnsToProduct={handleAddAddOnsToProduct}
                        handleUpdateDatesFromApi={handleUpdateDatesFromApi}
                        onProductSelected={handleProductSelectedFromModal}
                        setCurrentArch={setCurrentArch}
                        onAddNewStage={(productId: string, arch: string) => {
                        }}
                        onRefreshRestoration={(productId: string, arch: string) => {
                        }}
                        onRefreshProduct={(productId: string, arch: string) => {
                        }}
                        onTeethShadeSelect={(productId: string, arch: "maxillary" | "mandibular", shadeSystem: string, individualShade: string) => {
                          setTeethShadeModalData({
                            productId,
                            arch,
                            currentShadeSystem: shadeSystem,
                            currentIndividualShade: individualShade
                          })
                          setShowTeethShadeModal(true)
                        }}
                        hasSelectedTeeth={hasSelectedTeeth}
                        selectedMaxillaryTeeth={selectedMaxillaryTeeth}
                        selectedMandibularTeeth={selectedMandibularTeeth}
                        selectedExtractionType={effectiveSelectedExtractionType}
                        onExtractionTypeSelect={handleExtractionTypeSelect}
                        onTeethSelectionChange={handleTeethSelectionChange}
                        onClearTeethSelection={() => {
                          setSelectedMaxillaryTeeth([]);
                          setSelectedMandibularTeeth([]);
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Desktop Layout - Three column layout for large screens only */}
                <div className={`hidden lg:block ${showDentalSlipPage ? 'hidden' : ''}`}>
                  <div className={`${!hasMaxillaryInteraction ? 'flex justify-center items-start' : 'grid grid-cols-[1fr_1.8fr_1fr] gap-2 w-full'} transition-all duration-500`}>
                    {/* Maxillary Section - 2 column layout when centered, single column in 3-col layout */}
                    <div className={`${!hasMaxillaryInteraction ? 'w-full max-w-6xl' : 'min-w-0'} mb-10 transition-all duration-500`}>
                      <InteractiveDentalChart3D
                          type="maxillary"
                          selectedTeeth={selectedMaxillaryTeeth}
                          onToothToggle={isCaseSubmitted ? undefined : toggleMaxillaryTooth}
                          title="MAXILLARY"
                          layoutMode={!hasMaxillaryInteraction ? '2-column' : 'default'}
                          productTeethMap={productTeethMap}
                          productButtons={maxillaryProductButtons}
                          visibleArch={slipData?.selectedArch || "upper"}
                          onProductButtonClick={handleProductButtonClick}
                          openAccordionItem={openAccordionItem}
                          isCaseSubmitted={isCaseSubmitted}
                          selectedExtractionType={effectiveSelectedExtractionType}
                          selectedProduct={currentSelectedProduct}
                          onProductSelect={handleProductSelect}
                          productDetails={currentSelectedProductDetails}
                          showToothMappingToolbar={showToothMappingToolbar}
                          onToothMappingModeSelect={setSelectedToothMappingMode}
                          selectedToothMappingMode={selectedToothMappingMode}
                          missingTeeth={maxillaryMissingTeeth}
                          extractedTeeth={maxillaryExtractedTeeth}
                          willExtractTeeth={maxillaryWillExtractTeeth}
                          onAllTeethMissing={handleMaxillaryAllTeethMissing}
                          onAutoSelectTeethInMouth={handleMaxillaryAutoSelectTeethInMouth}
                          onStatusAssign={handleMaxillaryStatusAssign}
                          selectedProductForColor={selectedProductForColor}
                          onProductColorSelect={handleProductColorSelect}
                          isCollapsed={!showMaxillaryChart}
                          onToggleCollapse={() => setShowMaxillaryChart((s) => !s)}
                        />
                    </div>
                    {/* Case Design Center - Hidden initially, shown after maxillary interaction */}
                    {hasMaxillaryInteraction && (
                    <div className="min-w-0 w-full h-full flex flex-col transition-all duration-500">
                      <CSDSection
                        products={currentSlipProducts}
                        rushRequests={rushRequests}
                        openAccordionItem={openAccordionItem}
                        setOpenAccordionItem={setOpenAccordionItem}
                        handleProductButtonClick={handleProductButtonClick}
                        onUpdateDeliveryDates={handleDeliveryDatesUpdate}
                        submittedDeliveryDates={submittedDeliveryDates}
                        handleAddProductClick={handleOpenAddProductModal}
                        handleDeleteProduct={handleDeleteProduct}
                        handleProductDetailChange={handleProductDetailChange}
                        handleUpdateStageNotes={handleUpdateStageNotes}
                        handleStageNotesChange={handleStageNotesChange}
                        handleOpenAddOnsModal={handleOpenAddOnsModal}
                      handleOpenMaxillaryAddOnsModal={handleOpenMaxillaryAddOnsModal}
                      handleOpenMandibularAddOnsModal={handleOpenMandibularAddOnsModal}
                        handleRushRequest={handleRushRequest}
                        handleCancelRush={handleCancelRush}
                        setShowAttachModal={setShowAttachModal}
                        showAttachModal={showAttachModal}
                        isCaseSubmitted={isCaseSubmitted}
                        setShowStageNotesModal={handleOpenStageNotesModal}
                        allNotes={allNotes}
                        setAllNotes={setAllNotes}
                        slipData={slipData}
                        handleAddAddOnsToProduct={handleAddAddOnsToProduct}
                        // Removed handleAddExtractionsToProduct prop - using product selection for extractions instead
                        handleUpdateDatesFromApi={handleUpdateDatesFromApi}
                        onProductSelected={handleProductSelectedFromModal}
                        onAddNewStage={(productId: string, arch: string) => {
                        }}
                        onRefreshRestoration={(productId: string, arch: string) => {
                        }}
                        onRefreshProduct={(productId: string, arch: string) => {
                        }}
                        onTeethShadeSelect={(productId: string, arch: "maxillary" | "mandibular", shadeSystem: string, individualShade: string) => {
                          setTeethShadeModalData({
                            productId,
                            arch,
                            currentShadeSystem: shadeSystem,
                            currentIndividualShade: individualShade
                          })
                          setShowTeethShadeModal(true)
                        }}
                        hasSelectedTeeth={hasSelectedTeeth}
                        selectedMaxillaryTeeth={selectedMaxillaryTeeth}
                        selectedMandibularTeeth={selectedMandibularTeeth}
                      />
                    </div>
                    )}
                    {/* Mandibular Section - Hidden initially, shown after maxillary interaction */}
                    {hasMaxillaryInteraction && (
                    <div className="min-w-0 mb-10 transition-all duration-500">
                      <InteractiveDentalChart3D
                          type="mandibular"
                          selectedTeeth={selectedMandibularTeeth}
                          onToothToggle={isCaseSubmitted ? () => { } : toggleMandibularTooth}
                          title="MANDIBULAR"
                          productTeethMap={productTeethMap}
                          productButtons={mandibularProductButtons}
                          visibleArch={slipData?.selectedArch || "upper"}
                          onProductButtonClick={handleProductButtonClick}
                          openAccordionItem={openAccordionItem}
                          isCaseSubmitted={isCaseSubmitted}
                          selectedExtractionType={effectiveSelectedExtractionType}
                          selectedProduct={currentSelectedProduct}
                          onProductSelect={handleProductSelect}
                          productDetails={currentSelectedProductDetails}
                          showToothMappingToolbar={showToothMappingToolbar}
                          onToothMappingModeSelect={setSelectedToothMappingMode}
                          selectedToothMappingMode={selectedToothMappingMode}
                          missingTeeth={mandibularMissingTeeth}
                          extractedTeeth={mandibularExtractedTeeth}
                          willExtractTeeth={mandibularWillExtractTeeth}
                          onAllTeethMissing={handleMandibularAllTeethMissing}
                          onAutoSelectTeethInMouth={handleMandibularAutoSelectTeethInMouth}
                          onStatusAssign={handleMandibularStatusAssign}
                          selectedProductForColor={selectedProductForColor}
                          onProductColorSelect={handleProductColorSelect}
                          isCollapsed={!showMandibularChart}
                          onToggleCollapse={() => setShowMandibularChart((s) => !s)}
                        />
                    </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Bar - Modern & Aesthetic Design */}
            {!isCaseSubmitted && (
              <div className="bottom-0 left-0 w-full z-40 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-t border-gray-300 px-4 sm:px-6 md:px-8 lg:px-10 py-4 shadow-2xl">
                <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
                  {/* Left Side - Preview Button */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        if (!isCaseSubmitted) {
                          setShowSubmitWarningModal(true)
                        } else {
                          setShowPrintPreview(true)
                        }
                      }}
                      className="group relative overflow-hidden border-2 border-blue-200 hover:border-blue-400 bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-700 font-semibold transition-all duration-300 shadow-md hover:shadow-xl px-6 py-3"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-100/0 via-blue-100/50 to-blue-100/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <FileText className="w-5 h-5 mr-2 relative z-10" />
                      <span className="relative z-10">Preview</span>
                    </Button>
                  </div>

                  {/* Right Side - Cancel & Submit Buttons */}
                  <div className="flex items-center gap-3 relative">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        setShowCancelPreviewModal(true)
                      }}
                      className="group relative overflow-hidden border-2 border-red-200 hover:border-red-400 bg-white hover:bg-red-50 text-gray-700 hover:text-red-700 font-semibold transition-all duration-300 shadow-md hover:shadow-xl px-6 py-3"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-100/0 via-red-100/50 to-red-100/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <X className="w-5 h-5 mr-2 relative z-10" />
                      <span className="relative z-10">Cancel</span>
                    </Button>

                    <Button
                      ref={submitButtonRef}
                      size="lg"
                      onClick={() => {
                        if (!showSubmitPopover) {
                          setShowSubmitPopover(true)
                          return
                        }
                        if (isChecked) {
                          setShowSubmitPopover(false)
                          setIsChecked(false)
                          handleSubmitCaseClick()
                        }
                      }}
                      disabled={isCaseSubmitted || isSubmittingCase}
                      className="group relative overflow-hidden bg-gradient-to-r from-[#1162A8] via-[#0e5299] to-[#1162A8] hover:from-[#0f5490] hover:via-[#0d4a82] hover:to-[#0f5490] text-white font-bold transition-all duration-300 shadow-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 text-base"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <Check className="w-5 h-5 mr-2 relative z-10" />
                      <span className="relative z-10">
                        {isSubmittingCase ? (
                          <span className="flex items-center gap-2">
                            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Submitting...
                          </span>
                        ) : (
                          "Submit Case"
                        )}
                      </span>
                    </Button>

                    {/* Confirmation Popover - Compact Horizontal Design */}
                    {showSubmitPopover && (
                      <div
                        ref={submitPopoverRef}
                        className="absolute bottom-full right-0 mb-3 bg-white border-2 border-amber-200 rounded-lg shadow-xl p-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
                        style={{ minWidth: '400px' }}
                      >
                        {/* Arrow */}
                        <div className="absolute bottom-[-10px] right-8 w-4 h-4 bg-white border-r-2 border-b-2 border-amber-200 transform rotate-45" />

                        {/* Horizontal Content */}
                        <div className="relative z-10 flex items-center gap-3">
                          {/* Icon */}
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </div>
                          </div>

                          {/* Checkbox and Label - Horizontal Layout */}
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="checkbox"
                              id="confirm-details"
                              checked={isChecked}
                              onChange={(e) => setIsChecked(e.target.checked)}
                              className="rounded border-gray-300 text-[#1162A8] focus:ring-[#1162A8] focus:ring-offset-0 w-4 h-4 cursor-pointer flex-shrink-0"
                            />
                            <Label
                              htmlFor="confirm-details"
                              className="text-xs text-gray-700 cursor-pointer select-none leading-tight"
                            >
                              You confirm all details are correct by submitting case.
                            </Label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ... existing modals ... */}
            {/* Rush Request Modal */}
            {selectedProductForRush && (
              <RushRequestModal
                isOpen={showRushModal}
                onClose={() => {
                  setShowRushModal(false)
                  setSelectedProductForRush(null)
                }}
                onConfirm={(rushData) => handleConfirmRush(selectedProductForRush.id, rushData)}
                product={selectedProductForRush}
              />
            )}
            {/* Cancel Submission Warning Modal */}
            <CancelSubmissionWarningModal
              isOpen={showCancelPreviewModal}
              onClose={() => setShowCancelPreviewModal(false)}
              onConfirm={() => {
                setShowCancelPreviewModal(false)
                handleRedirectToDashboard()
              }}
            />
            {/* Submit Case Warning Modal */}
            <SubmitCaseWarningModal
              isOpen={showSubmitWarningModal}
              onClose={() => setShowSubmitWarningModal(false)}
              onConfirmSubmitAndPrint={() => {
                setIsCaseSubmitted(true)
                setShowSubmitWarningModal(false)
                setShowPrintPreview(true)
              }}
            />

            {/* Print Preview Modal */}
            <PrintPreviewModal
              isOpen={showPrintPreview}
              onClose={() => setShowPrintPreview(false)}
              caseData={{
                lab: addSlipFormData.lab || "",
                address: addSlipFormData.location || "",
                qrCode: addSlipFormData.qrCode || "",
                office: addSlipFormData.office || "",
                doctor: addSlipFormData.doctor || "",
                patient: addSlipFormData.patient || "",
                pickupDate: addSlipFormData.pickupDate || "",
                panNumber: addSlipFormData.panNumber || "",
                caseNumber: addSlipFormData.caseNumber || "",
                slipNumber: addSlipFormData.slipNumber || "",
                contact: addSlipFormData.contact || "",
                email: addSlipFormData.email || "",
                products: products.map(product => {
                  const { maxillaryTeeth, mandibularTeeth } = splitTeethByArch(product.teeth || "");
                  return {
                    ...product,
                    maxillaryTeeth,
                    mandibularTeeth,
                  }
                }),
              }}
            />

            {/* Add Ons Modal */}
            <AddOnsModal
              isOpen={showAddOnsModal}
              onClose={() => setShowAddOnsModal(false)}
              onAddAddOns={handleAddOnsModalSubmit}
              labId={slipData?.selectedLab?.lab?.id || slipData?.selectedLab?.id || null}
              productId={currentProductIdForAddOns || ""}
              arch="maxillary"
            />

            {/* Maxillary Add Ons Modal */}
            <AddOnsModal
              isOpen={showMaxillaryAddOnsModal}
              onClose={() => setShowMaxillaryAddOnsModal(false)}
              onAddAddOns={handleMaxillaryAddOnsModalSubmit}
              labId={slipData?.selectedLab?.lab?.id || slipData?.selectedLab?.id || null}
              productId={currentProductIdForAddOns || ""}
              arch="maxillary"
            />

            {/* Mandibular Add Ons Modal */}
            <AddOnsModal
              isOpen={showMandibularAddOnsModal}
              onClose={() => setShowMandibularAddOnsModal(false)}
              onAddAddOns={handleMandibularAddOnsModalSubmit}
              labId={slipData?.selectedLab?.lab?.id || slipData?.selectedLab?.id || null}
              productId={currentProductIdForAddOns || ""}
              arch="mandibular"
            />

            {/* Stage Notes Modal */}
            {showStageNotesModal && stageNotesModalContext && (
              <StageNotesModal
                isOpen={showStageNotesModal}
                onClose={() => setShowStageNotesModal(false)}
                patientName={stageNotesModalContext.patientName}
                stage={stageNotesModalContext.stage}
                deliveryDate={stageNotesModalContext.deliveryDate}
                caseNumber={stageNotesModalContext.caseNumber}
                slipNumber={stageNotesModalContext.slipNumber}
                allNotes={allNotes}
                setAllNotes={setAllNotes}
              />
            )}

            {/* Print Driver Tags Modal */}
            <PrintDriverTagsModal
              isOpen={showPrintDriverTagsModal}
              onClose={() => setShowPrintDriverTagsModal(false)}
              slip={slipData}
              onRegularPrint={(slip, allSlots) => {
                setShowPrintPreview(true)
                setShowPrintDriverTagsModal(false)
              }}
              onGenerateLabels={(slip, selectedSlots) => {
                setSelectedLabelSlots(selectedSlots)
                setShowPrintLabelsPreviewModal(true)
                setShowPrintDriverTagsModal(false)
              }}
            />

            {/* Print Labels Preview Modal */}
            {showPrintLabelsPreviewModal && (
              <PrintLabelsPreviewModal
                isOpen={showPrintLabelsPreviewModal}
                onClose={() => setShowPrintLabelsPreviewModal(false)}
                slipData={slipData}
                selectedSlots={selectedLabelSlots}
              />
            )}

            {/* Print Statement Modal */}
            {showPrintStatementModal && (
              <PrintStatementModal
                isOpen={showPrintStatementModal}
                onClose={() => setShowPrintStatementModal(false)}
                slipData={slipData}
                products={products}
                rushRequests={rushRequests}
              />
            )}

            {/* Driver History Modal */}
            <DriverHistoryModal isOpen={showDriverHistoryModal} onClose={() => setShowDriverHistoryModal(false)} />

            {/* Call Log Modal */}
            {slipData && (
              <CallLogModal
                isOpen={showCallLogModal}
                onClose={() => setShowCallLogModal(false)}
                slipNumber={slipData.slipNumber}
              />
            )}

            {/* Teeth Shade Selection Modal */}
            
            <TeethShadeSelectionModal
              isOpen={showTeethShadeModal}
              onClose={() => {
                setShowTeethShadeModal(false)
                setTeethShadeModalData(null)
                setUserClosedTeethShadeModal(true)
              }}
              onConfirm={handleTeethShadeConfirm}
              initialShadeSystem={teethShadeModalData?.currentShadeSystem || "vita-classical"}
              initialIndividualShade={teethShadeModalData?.currentIndividualShade || "A1"}
              isInitialLoad={!teethShadeModalData} // Show full guide on initial load, small modal when triggered manually
              type="teeth"
              productId={teethShadeModalData?.productId ? Number(teethShadeModalData.productId) : undefined}
              customerId={localStorage.getItem("customerId") ? Number(localStorage.getItem("customerId")) : undefined}
              modalId="case-design-teeth-shade-modal"
            />

            <ColorfulActionButtons
              isCaseSubmitted={isCaseSubmitted}
              setShowSubmitWarningModal={setShowSubmitWarningModal}
              setShowPrintPreview={setShowPrintPreview}
              relatedSlipNumbers={["665479", "458731", "568794"]}
              setShowPrintDriverTagsModal={setShowPrintDriverTagsModal}
              setShowPrintStatementModal={setShowPrintStatementModal}
              setShowDriverHistoryModal={setShowDriverHistoryModal}
              setShowCallLogModal={setShowCallLogModal}
              slipId={
                (typeof window !== "undefined" && localStorage.getItem("slipId")) ||
                (slipData && slipData.createdSlip && slipData.createdSlip.id) ||
                ""
              }
            />
          </div>
        </div>
      )}

        </div>
        
        {/* Show DentalSlipPage as modal for adding product, but NOT after submission */}
        {showDentalSlipPage && !isCaseSubmitted && (
          <div 
            className="fixed inset-0 z-[99999] bg-black bg-opacity-50 flex items-center justify-center p-4"
            style={{ zIndex: 99999 }}
          >
            <div className="bg-white rounded-lg shadow-xl w-full h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Add Slip</h2>
                <button
                  onClick={handleModalClose}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="h-full overflow-y-auto">
                <DentalSlipPage
                  slipData={{
                    ...slipData,
                    ...addSlipFormData,
                  }}
                  setSlipData={updateSlipData}
                  showAddSlipModal={true}
                  setShowAddSlipModal={setShowDentalSlipPage}
                  addSlipModalInitialStep={dentalSlipStep}
                  setAddSlipModalInitialStep={setDentalSlipStep}
                  visible={true}
                  hideBackButton={true}
                  onAddSlipComplete={handleDentalSlipComplete}
                  shouldRefetchLabProducts={shouldRefetchLabProducts}
                  hideSlipHeader={hideSlipHeaderInDentalSlipPage}
                  isModal={true}
                  onClose={handleModalClose}
                  selectedLabId={selectedLabId}
                />
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay when submitting case */}
        <LoadingOverlay
          isLoading={isSubmittingCase}
          title="Submitting case..."
          message="Please wait while we process your submission"
          zIndex={99999}
        />

        {/* Loading Overlay when closing case design page */}
        <LoadingOverlay
          isLoading={isHiding}
          title="Closing case design..."
          message="Please wait..."
          zIndex={99999}
        />
      </GradesProvider>
    </StagesProvider>
  )
}

