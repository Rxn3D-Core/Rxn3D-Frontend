"use client"

import { useState, useMemo, useEffect, useCallback, Dispatch, SetStateAction, useRef } from "react"
// import { OptimizedDentalSlipPageContent } from "@/components/dental-slip/optimized-dental-slip-page"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { FileText, X, Search, Calendar, Clock, Star, Zap, Filter, Info, Lightbulb, RefreshCw, Edit } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DeliveryDateModal } from "./components/delivery-date-modal"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { useSlipCreation, SlipCreationProvider, ConnectedOffice, ConnectedLab } from "@/contexts/slip-creation-context"
import { useSlipStore } from "./stores/slipStore"
import { useTeethSelectionStore } from "@/stores/teeth-selection-store"
import { AddSlipOnboarding } from "@/components/add-slip-onboarding"
import { useProductCategory } from "@/contexts/product-category-context"
// Removed useProducts import - now using fetchLabProducts from slip creation context
import { useStages, StagesProvider } from "@/contexts/product-stages-context"
import { useGrades, GradesProvider } from "@/contexts/product-grades-context"
import { debounce } from "@/lib/performance-optimizations"
import CancelSlipCreationModal from "@/components/cancel-slip-creation-modal"
import FocusedSpotlight from "@/components/focused-spotlight"
import { useFocusedSpotlight } from "@/hooks/use-focused-spotlight"
import { Eye, EyeOff } from "lucide-react"
import { AddNewLabModal } from "@/components/add-new-lab-modal"
import { AddDoctorModal } from "@/components/add-doctor-modal"
import LoadingOverlay from "@/components/ui/loading-overlay"
import { useArchSelectionStore } from "@/stores/arch-selection-store"
import { CustomerLogo } from "@/components/customer-logo"

// Dynamic Showing Results Component
interface ShowingResultsProps {
  productCategory: string
  selectedSubCategory?: string | null
  selectedProductInModal?: string | null
  sortedProducts?: any[]
  onCategoryClear: () => void
  onSubCategoryClear: () => void
  onProductClear: () => void
}

const ShowingResultsSection = ({
  productCategory,
  selectedSubCategory,
  selectedProductInModal,
  sortedProducts,
  onCategoryClear,
  onSubCategoryClear,
  onProductClear
}: ShowingResultsProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
      <span className="text-sm font-medium text-gray-700 flex-shrink-0">Showing results for:</span>
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 flex-shrink-0">
          <span className="text-sm text-gray-700 truncate max-w-[120px] sm:max-w-[150px] md:max-w-[200px]">{productCategory}</span>
          <button
            onClick={onCategoryClear}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        {selectedSubCategory && (
          <>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <path d="M6 12L10 8L6 4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 flex-shrink-0">
              <span className="text-sm text-gray-700 truncate max-w-[120px] sm:max-w-[150px] md:max-w-[200px]">{selectedSubCategory}</span>
              <button
                onClick={onSubCategoryClear}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
        {selectedProductInModal && sortedProducts && (
          <>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <path d="M6 12L10 8L6 4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 flex-shrink-0">
              <span className="text-sm text-gray-700 truncate max-w-[120px] sm:max-w-[150px] md:max-w-[200px]">
                {sortedProducts.find((p: any) => String(p.id) === selectedProductInModal)?.name || "Product"}
              </span>
              <button
                onClick={onProductClear}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Define the Stage interface based on product detail API response
interface Stage {
  id: number
  stage_id: number
  name: string
  code: string
  sequence: number
  status: string
  price: number | null
  days: number
  is_common: string
  days_to_pickup: number
  days_to_process: number
  days_to_deliver: number
  is_releasing_stage: string
  is_stage_with_addons: string
  stage_configurations: {
    grade?: string
    material?: string
    gum_shade?: string
    retention?: string
    impression?: string
    teeth_shade?: string
  }
  image_url: string | null
  created_at?: string
  updated_at?: string
  grade_pricing?: any // Optional field that may be present in some responses
}

// Define the ProductConfiguration interface
interface ProductConfiguration {
  restoration: string
  productName: string
  grade: string
  stage: string
  gradeId?: number
  stageId?: number
  teethShadePart1: string
  gumShadePart1: string
  gumShadePart2: string
  impression: string
}

// Define the Product interface with new fields
interface Product {
  id: string
  name: string
  type: string
  teeth: string
  deliveryDate: string
  image: string
  abbreviation: string
  color: string
  borderColor: string
  addOns: { category: string; addOn: string; qty: number }[]
  stageNotesContent: string

  maxillaryConfig: ProductConfiguration
  mandibularConfig: ProductConfiguration
  
  // Additional fields for product data
  category_name?: string
  subcategory_name?: string
  category_id?: number
  subcategory_id?: number
  grades?: Array<{ id: number; name: string; code?: string; status?: string }>
  stages?: Stage[]
  // Extraction data fields for missing-teeth-cards component
  extractions?: any[]
  has_extraction?: string
  extraction_options?: any[]
  data?: {
    extractions?: any[]
    has_extraction?: string
    extraction_options?: any[]
  }
}

// Define the Note interface
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

interface Lab {
  id: string
  name: string
  location: string
  logo: string
  isConnected?: boolean
}

// Move the main content into a new component
export function DentalSlipPageContent({
  slipData,
  setSlipData,
  showAddSlipModal,
  setShowAddSlipModal,
  addSlipModalInitialStep,
  setAddSlipModalInitialStep,
  visible,
  hideBackButton = false,
  onAddSlipComplete,
  shouldRefetchLabProducts = false, // <-- Add prop with default
  hideSlipHeader = false, // <-- Add prop with default
  isModal = false, // <-- Add modal prop
  onClose, // <-- Add onClose prop for modal
  selectedLabId: propSelectedLabId, // <-- Add selectedLabId prop
}: {
  slipData?: any
  setSlipData?: Dispatch<SetStateAction<any>>
  showAddSlipModal?: boolean
  setShowAddSlipModal?: Dispatch<SetStateAction<boolean>>
  addSlipModalInitialStep?: 1 | 2 | 3 | 4 | 5 | 6 | 7
  setAddSlipModalInitialStep?: Dispatch<SetStateAction<1 | 2 | 3 | 4 | 5 | 6 | 7>>
  visible?: boolean
  hideBackButton?: boolean
  onAddSlipComplete?: (data: any) => void
  shouldRefetchLabProducts?: boolean // <-- Add prop type
  hideSlipHeader?: boolean // <-- Add prop type
  isModal?: boolean // <-- Add modal prop type
  onClose?: () => void // <-- Add onClose prop type
  selectedLabId?: number | null // <-- Add selectedLabId prop type
}) {
  // Initialize modal-specific state when used as modal
  const [modalSlipData, setModalSlipData] = useState<any>({})
  const [modalShowAddSlipModal, setModalShowAddSlipModal] = useState(true)
  const [modalAddSlipModalInitialStep, setModalAddSlipModalInitialStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1)

  // Use provided props or fallback to modal-specific state
  // For modal mode, use parent's slipData but keep modal-specific state for form data
  const effectiveSlipData = isModal ? { ...slipData, ...modalSlipData } : slipData
  const effectiveSetSlipData = isModal ? setSlipData : setSlipData
  const effectiveShowAddSlipModal = isModal ? modalShowAddSlipModal : (showAddSlipModal ?? false)
  const effectiveSetShowAddSlipModal = isModal ? setModalShowAddSlipModal : (setShowAddSlipModal ?? (() => { }))
  const effectiveAddSlipModalInitialStep = isModal ? modalAddSlipModalInitialStep : (addSlipModalInitialStep ?? 1)
  const effectiveSetAddSlipModalInitialStep = isModal ? setModalAddSlipModalInitialStep : (setAddSlipModalInitialStep ?? (() => { }))
  const effectiveVisible = isModal ? true : (visible ?? false)

  // Subscribe to store's selectedProductDetails to react to changes
  const storeSelectedProductDetails = useSlipStore((state) => state.slipData?.selectedProductDetails)

  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([4, 5, 6, 13, 26, 27, 28])
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])

  const [allNotes, setAllNotes] = useState<Note[]>([])

  const maxillaryTeethRange = [1, 16]
  const mandibularTeethRange = [17, 32]

  const toggleTooth = (toothNumber: number) => {
    setSelectedTeeth((prev) =>
      prev.includes(toothNumber) ? prev.filter((t) => t !== toothNumber) : [...prev, toothNumber],
    )
  }

  const [showSTLViewer, setShowSTLViewer] = useState(false)
  const handleViewSTL = () => {
    setShowSTLViewer(true)
  }

  const [showRushModal, setShowRushModal] = useState(false)
  const [selectedProductForRush, setSelectedProductForRush] = useState<any>(null)
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [rushRequests, setRushRequests] = useState<{ [key: string]: any }>({})
  const [isCaseSubmitted, setIsCaseSubmitted] = useState(false)
  const [showSubmitWarningModal, setShowSubmitWarningModal] = useState(false)
  const [showSubmitPopover, setShowSubmitPopover] = useState(false)
  const [isChecked, setIsChecked] = useState(false)
  const [showAddOnsModal, setShowAddOnsModal] = useState(false)
  const [currentProductIdForAddOns, setCurrentProductIdForAddOns] = useState<string | null>(null)
  const [openAccordionItem, setOpenAccordionItem] = useState<string | undefined>(undefined)
  const [showStageNotesModal, setShowStageNotesModal] = useState(false)
  const [stageNotesModalContext, setStageNotesModalContext] = useState<{
    patientName: string
    stage: string
    deliveryDate: string
    caseNumber: string
    slipNumber: string
  } | null>(null)
  const [showPrintDriverTagsModal, setShowPrintDriverTagsModal] = useState(false)
  const [showPrintLabelsPreviewModal, setShowPrintLabelsPreviewModal] = useState(false)
  const [selectedLabelSlots, setSelectedLabelSlots] = useState<boolean[]>(Array(8).fill(false))
  const [showPrintStatementModal, setShowPrintStatementModal] = useState(false)
  const [showDriverHistoryModal, setShowDriverHistoryModal] = useState(false)
  const [isPatientNameInputFocused, setIsPatientNameInputFocused] = useState(false)
  const [showCallLogModal, setShowCallLogModal] = useState(false)
  const [showGetStarted, setShowGetStarted] = useState(true)
  const [showAddNewLabModal, setShowAddNewLabModal] = useState(false)

  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false)

  // --- AddSlipModal states and functions merged here ---
  const [selectedLab, setSelectedLab] = useState<string>("")
  const [selectedDoctor, setSelectedDoctor] = useState<string>("")
  const [showDefaultLabModal, setShowDefaultLabModal] = useState(false)
  const [pendingDefaultLab, setPendingDefaultLab] = useState<{ id: string, name: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name-az")
  const [addSlipFormData, setAddSlipFormData] = useState({
    office: "",
    office_id: "",
    lab: "",
    lab_id: "",
    doctor: "",
    doctor_id: "",
    patient: "",
    patient_name: "",
    gender: "",
    panNumber: "",
    caseNumber: "",
    slipNumber: "",
    createdBy: "",
    location: "",
    caseStatus: "Draft",
    pickupDate: "",
    deliveryDate: "",
    deliveryTime: "",
  })
  const [defaultLabId, setDefaultLabId] = useState<string | null>(() => {
    // For modal mode, start fresh without default lab
    if (isModal) {
      return null
    }
    // Initialize from localStorage if available
    if (typeof window !== "undefined") {
      return localStorage.getItem("defaultLabId")
    }
    return null
  })
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState<boolean>(() => {
    // For modal mode, always start with first time setup
    if (isModal) {
      return true
    }
    // First time setup if no default lab is set
    if (typeof window !== "undefined") {
      return !localStorage.getItem("defaultLabId")
    }
    return true
  })
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1) // Internal step for the add slip flow - now supports 7 steps
  const [productSearch, setProductSearch] = useState("")
  const [productSort, setProductSort] = useState("name-az")
  const [productCategory, setProductCategory] = useState("all")
  const [selectedProductInModal, setSelectedProductInModal] = useState<string | null>(null)
  const [selectedStages, setSelectedStages] = useState<string[]>([])
  const [showAdvanceFilter, setShowAdvanceFilter] = useState(false)
  const [advanceFilterState, setAdvanceFilterState] = useState<{
    category: string[];
    grades: string[];
    stages: string[];
    subCategory: string[];
  }>({
    category: [],
    grades: [],
    stages: [],
    subCategory: [],
  })
  const [showArchModal, setShowArchModal] = useState(false)
  const [selectedArch, setSelectedArch] = useState<string | null>(null)
  const setGlobalArchType = useArchSelectionStore((s) => s.setArchType)
  const [showDeliveryDateModal, setShowDeliveryDateModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showHintsButton, setShowHintsButton] = useState(true)
  const [labProductsLoading, setLabProductsLoading] = useState(false)
  const [labsLoading, setLabsLoading] = useState(false)
  const [productDetailsLoading, setProductDetailsLoading] = useState(false)
  const [doctorDropdownOpen, setDoctorDropdownOpen] = useState(false)
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null)
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<number | null>(null)
  const [showCancelSubmissionWarningModal, setShowCancelSubmissionWarningModal] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [forceProductsRefresh, setForceProductsRefresh] = useState(0)
  const { connectedLabs, connectedOffices, fetchConnectedLabs, fetchConnectedOffices, labProducts: rawLabProducts, fetchLabProducts, officeDoctors, officeDoctorsLoading, fetchOfficeDoctors, fetchProductDetails } = useSlipCreation()
  // Removed useProducts context - now using fetchLabProducts from slip creation context
  // Removed stages and grades context - now using product data from API response
  const { stages, fetchStages, isLoading: stagesLoading } = useStages()
  const { grades, fetchGrades, isLoading: gradesLoading } = useGrades()
  
  // Use lab products loading state as primary loading indicator
  const isLoadingProducts = labProductsLoading

  // Ref for patient name input auto-focus
  const patientInputRef = useRef<HTMLInputElement>(null)
  // Ref for inline patient name editing at the top
  const inlinePatientInputRef = useRef<HTMLInputElement>(null)
  // State for inline editing mode
  const [isInlineEditingPatient, setIsInlineEditingPatient] = useState(false)
  
  // Ref to track if products are being fetched to prevent multiple concurrent calls
  const isFetchingProductsRef = useRef(false)

  // Create debounced versions of API calls that return Promises
  const debouncedFetchLabProducts = useMemo(() => {
    let timeoutId: NodeJS.Timeout | null = null
    return (labId: number, params: any): Promise<any> => {
      return new Promise((resolve, reject) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        timeoutId = setTimeout(async () => {
          try {
            const result = await fetchLabProducts(labId, params)
            resolve(result)
          } catch (error) {
            reject(error)
          }
        }, 300)
      })
    }
  }, [fetchLabProducts])

  const debouncedFetchConnectedLabs = useMemo(() => {
    let timeoutId: NodeJS.Timeout | null = null
    return (): Promise<any> => {
      return new Promise((resolve, reject) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        timeoutId = setTimeout(async () => {
          try {
            const result = await fetchConnectedLabs()
            resolve(result)
          } catch (error) {
            reject(error)
          }
        }, 300)
      })
    }
  }, [fetchConnectedLabs])

  const debouncedFetchConnectedOffices = useMemo(() => {
    let timeoutId: NodeJS.Timeout | null = null
    return (): Promise<any> => {
      return new Promise((resolve, reject) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        timeoutId = setTimeout(async () => {
          try {
            const result = await fetchConnectedOffices()
            resolve(result)
          } catch (error) {
            reject(error)
          }
        }, 300)
      })
    }
  }, [fetchConnectedOffices])

  const debouncedFetchOfficeDoctors = useMemo(() => {
    let timeoutId: NodeJS.Timeout | null = null
    return (customerId: number): Promise<any> => {
      return new Promise((resolve, reject) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        timeoutId = setTimeout(async () => {
          try {
            const result = await fetchOfficeDoctors(customerId)
            resolve(result)
          } catch (error) {
            reject(error)
          }
        }, 300)
      })
    }
  }, [fetchOfficeDoctors])

  const debouncedFetchProductDetails = useMemo(() => {
    let timeoutId: NodeJS.Timeout | null = null
    return (productId: number, labId?: number): Promise<any> => {
      return new Promise((resolve, reject) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        timeoutId = setTimeout(async () => {
          try {
            const result = await fetchProductDetails(productId, labId)
            resolve(result)
          } catch (error) {
            reject(error)
          }
        }, 300)
      })
    }
  }, [fetchProductDetails])

  // Spotlight functionality
  const [showSpotlight, setShowSpotlight] = useState(false)
  const {
    isSpotlightActive,
    targetElement,
    activateSpotlight,
    deactivateSpotlight
  } = useFocusedSpotlight()


  const labProducts = useMemo(() => {
    // Use rawLabProducts from slip creation context (fetchLabProducts)
    // Only log when products actually change, not on every step change
    if (rawLabProducts && Array.isArray(rawLabProducts) && rawLabProducts.length > 0) {
      return rawLabProducts
    }
    
    return []
  }, [rawLabProducts, forceProductsRefresh]) // Removed 'step' dependency

  // --- Compute advance filter options from labProducts ---
  const advanceFilterOptions = useMemo(() => {
    // Defensive: ensure labProducts is always defined as an array
    const products = Array.isArray(labProducts) ? labProducts : []
    const categories = new Set<string>()
    const subCategories = new Set<string>()
    const grades = new Set<string>()
    const stages = new Set<string>()
    products.forEach((p: any) => {
      if (p.category_name) categories.add(p.category_name)
      if (p.subcategory_name) subCategories.add(p.subcategory_name)
      if (Array.isArray(p.grades)) {
        p.grades.forEach((g: any) => {
          if (g.name) grades.add(g.name)
        })
      }
      if (p.stage_type) {
        stages.add(p.stage_type === "multiple" ? "Multi Stage" : "Single Stage")
      }
    })
    return {
      category: Array.from(categories),
      subCategory: Array.from(subCategories),
      grades: Array.from(grades),
      stages: Array.from(stages),
    }
  }, [labProducts])

  const router = useRouter()

  

  const resetAddSlipForm = useCallback(() => {
    setSelectedLab("")
    setSearchTerm("")
    setSortBy("name-az")
    setIsInlineEditingPatient(false)
    setAddSlipFormData({
      office: "",
      office_id: "",
      lab: "",
      lab_id: "",
      doctor: "",
      doctor_id: "",
      patient: "",
      patient_name: "",
      gender: "",
      panNumber: "",
      caseNumber: "",
      slipNumber: "",
      createdBy: "",
      location: "",
      caseStatus: "Draft",
      pickupDate: "",
      deliveryDate: "",
      deliveryTime: "",
    })
    
    // Clear selected lab ID from localStorage when form is reset
    if (typeof window !== "undefined") {
      localStorage.removeItem("selectedLabId")
    }
    setDefaultLabId(null)
    setStep(addSlipModalInitialStep || 1) // Reset to initial step set by parent
    setProductSearch("")
    setProductSort("name-az")
    setProductCategory("all")
    setSelectedProductInModal(null)
    setSelectedStages([])
    setShowAdvanceFilter(false)
    setAdvanceFilterState({
      category: [],
      grades: [],
      stages: [],
      subCategory: [],
    })
    setShowArchModal(false)
    setSelectedArch(null)
    setShowDeliveryDateModal(false)
  }, [addSlipModalInitialStep])

  // Determine user role and which data to use
  let user: any = null
  let isLabAdmin = false
  let isOfficeAdmin = false
  let userDisplayName = ""
  if (typeof window !== "undefined") {
    try {
      user = JSON.parse(localStorage.getItem("user") || "null")
      isLabAdmin = user?.roles?.includes("lab_admin")
      isOfficeAdmin = user?.roles?.includes("office_admin")
      userDisplayName = user?.display_name || user?.name || user?.email || ""
    } catch (e) {
      user = null
      isLabAdmin = false
      isOfficeAdmin = false
      userDisplayName = ""
    }
  }

  // Fetch doctors when step is 1 (doctor selection step)
  useEffect(() => {
    if (step === 1 && effectiveShowAddSlipModal) {
      const role = localStorage.getItem("role");
      console.log("Step 1 - Fetching doctors, role:", role, "step:", step, "modal:", effectiveShowAddSlipModal);
      
      if (role === "office_admin") {
        // For office_admin role, fetch doctors using customerId
        const customerId = localStorage.getItem("customerId");
        console.log("office_admin - customerId:", customerId);
        if (customerId) {
          console.log("Calling fetchOfficeDoctors for office_admin with customerId:", customerId);
          fetchOfficeDoctors(Number(customerId));
        } else {
          console.warn("office_admin: No customerId found in localStorage");
        }
      } else if (role === "doctor") {
        // For doctor role, fetch doctors using customerId (doctor's office)
        const customerId = localStorage.getItem("customerId");
        console.log("doctor - customerId:", customerId);
        if (customerId) {
          console.log("Calling fetchOfficeDoctors for doctor with customerId:", customerId);
          fetchOfficeDoctors(Number(customerId));
        } else {
          console.warn("doctor: No customerId found in localStorage");
        }
      } else if (role === "lab_admin") {
        // For lab_admin role, fetch doctors once connected offices are loaded
        if (connectedOffices && connectedOffices.length > 0) {
          console.log("lab_admin - Connected offices ready, checking list", connectedOffices);
          const firstOffice = connectedOffices[0] as ConnectedOffice;
          const officeId = firstOffice?.office?.id;
          if (officeId) {
            console.log("lab_admin - Using first connected office:", officeId);
            fetchOfficeDoctors(Number(officeId));
          } else {
            console.warn("lab_admin: No office ID found in first connected office");
          }
        } else {
          console.log("lab_admin: Waiting for connected offices before fetching doctors");
        }
      } else {
        console.log("Role not recognized, skipping doctor fetch at step 1. Role:", role);
      }
    }
  }, [step, effectiveShowAddSlipModal, fetchOfficeDoctors, connectedOffices]);

  // Fetch labs or offices when step is 1 (for lab_admin) or step 2 (for all)
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (effectiveShowAddSlipModal) {
      // For lab_admin, fetch offices at step 1 so we can get doctors
      if (role === "lab_admin" && step === 1) {
        console.log("lab_admin at step 1 - Fetching connected offices...");
        fetchConnectedOffices();
      }
      // For step 2, fetch labs/offices for selection
      else if (step === 2) {
        setLabsLoading(true)
        Promise.resolve(debouncedFetchConnectedLabs()).finally(() => setLabsLoading(false))
      }
    }
  }, [step, effectiveShowAddSlipModal, debouncedFetchConnectedLabs, fetchConnectedOffices])

  // Reset the form on mount only if not in modal mode or if it's a fresh start
  useEffect(() => {
    // Only reset if we're not in modal mode or if we're starting fresh
    if (!isModal && !showAddSlipModal) {
      resetAddSlipForm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-focus patient name input when step changes to 3
  useEffect(() => {
    if (step === 3 && patientInputRef.current) {
      // Ensure inline editing is disabled when entering step 3
      setIsInlineEditingPatient(false)
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        patientInputRef.current?.focus()
      }, 100)
    }
  }, [step])

  // Auto-focus inline patient input when editing mode is activated
  useEffect(() => {
    if (isInlineEditingPatient && inlinePatientInputRef.current) {
      setTimeout(() => {
        inlinePatientInputRef.current?.focus()
      }, 50)
    }
  }, [isInlineEditingPatient])

  // Handle Enter key in arch modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (showArchModal && event.key === 'Enter' && selectedArch && !isCompleting) {
        event.preventDefault()
        handleArchContinue()
      }
    }

    if (showArchModal) {
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [showArchModal, selectedArch, isCompleting])

  // Use correct data for selection
  const selectionData = isLabAdmin ? (connectedOffices || []) : (connectedLabs || [])

  // Filtering and sorting for labs/offices
  const filteredSelection = selectionData.filter((item: any) => {
    const name = isLabAdmin ? (item as ConnectedOffice).office?.name : (item as ConnectedLab).lab?.name
    return name?.toLowerCase()?.includes(searchTerm.toLowerCase())
  })

  // Move default lab to top of list
  const sortedSelectionWithDefault = useMemo(() => {
    const filtered = filteredSelection.slice();
    return filtered.sort((a, b) => {
      const aId = isLabAdmin ? String((a as ConnectedOffice)?.office?.id) : String((a as ConnectedLab)?.lab?.id);
      const bId = isLabAdmin ? String((b as ConnectedOffice)?.office?.id) : String((b as ConnectedLab)?.lab?.id);

      // Default lab goes to top
      if (defaultLabId === aId) return -1;
      if (defaultLabId === bId) return 1;

      // Then apply normal sorting
      const aName = isLabAdmin ? (a as ConnectedOffice)?.office?.name || "" : (a as ConnectedLab)?.lab?.name || "";
      const bName = isLabAdmin ? (b as ConnectedOffice)?.office?.name || "" : (b as ConnectedLab)?.lab?.name || "";

      if (sortBy === "name-za") return bName.localeCompare(aName);
      if (sortBy === "location") {
        const aLoc = isLabAdmin ? `${(a as ConnectedOffice)?.office?.city || ""}, ${(a as ConnectedOffice)?.office?.state || ""}` : `${(a as ConnectedLab)?.lab?.city || ""}, ${(a as ConnectedLab)?.lab?.state || ""}`;
        const bLoc = isLabAdmin ? `${(b as ConnectedOffice)?.office?.city || ""}, ${(b as ConnectedOffice)?.office?.state || ""}` : `${(b as ConnectedLab)?.lab?.city || ""}, ${(b as ConnectedLab)?.lab?.state || ""}`;
        return aLoc.localeCompare(bLoc);
      }
      return aName.localeCompare(bName); // default name-az
    });
  }, [filteredSelection, defaultLabId, isLabAdmin, sortBy])


  // Fetch products when a lab/office is selected and step is 5, with filters/search
  useEffect(() => {
    if (step === 4 && selectedLab) {
      setLabProductsLoading(true)
      // Get labId based on user role
      let labId: number | null = null
      if (typeof window !== "undefined") {
        try {
          const role = localStorage.getItem("role");
          
          if (role === "doctor" || role === "office_admin") {
            // For doctor and office_admin roles, use selectedLabId from localStorage
            const storedLabId = localStorage.getItem("selectedLabId");
            if (storedLabId) {
              labId = Number(storedLabId);
            }
          } else {
            // For other roles, use the user's primary customer id as labId
            const userStr = localStorage.getItem("user")
            if (userStr) {
              const userObj = JSON.parse(userStr)
              // Find primary customer (is_primary === 1)
              if (Array.isArray(userObj.customers)) {
                const primary = userObj.customers.find((c: any) => c.is_primary === 1)
                if (primary) labId = primary.id
              }
            }
          }
        } catch { }
      }
      if (labId) {
        const params: Record<string, any> = {}
        if (productSearch) params.search = productSearch
        if (productSort === "name-az") {
          params.sort_by = "name"
          params.sort_order = "asc"
        } else if (productSort === "name-za") {
          params.sort_by = "name"
          params.sort_order = "desc"
        }
        if (productCategory !== "all") params.category = productCategory
        if (advanceFilterState.category.length > 0) params.category = advanceFilterState.category.join(",")
        if (advanceFilterState.subCategory.length > 0) params.sub_category = advanceFilterState.subCategory.join(",")
        if (advanceFilterState.grades.length > 0) params.grade = advanceFilterState.grades.join(",")
        if (advanceFilterState.stages.length > 0) params.stage = advanceFilterState.stages.join(",")
        params.customer_id = labId
      } else {
        setLabProductsLoading(false)
      }
    }
  }, [
    step,
    selectedLab,
    productSearch,
    productSort,
    productCategory,
    advanceFilterState.category,
    advanceFilterState.subCategory,
    advanceFilterState.grades,
    advanceFilterState.stages,
  ])

  // Add effect to refetch lab products when shouldRefetchLabProducts is true
  useEffect(() => {
    if (shouldRefetchLabProducts && selectedLab && (step === 4 || step >= 2) && !isFetchingProductsRef.current) {
      // Get labId based on user role
      let labId: number | null = null
      if (typeof window !== "undefined") {
        try {
          const role = localStorage.getItem("role");
          
          if (role === "doctor" || role === "office_admin") {
            // For doctor and office_admin roles, use selectedLabId from localStorage
            const storedLabId = localStorage.getItem("selectedLabId");
            if (storedLabId) {
              labId = Number(storedLabId);
            }
          } else {
            // For other roles, use the user's primary customer id as labId
            const userStr = localStorage.getItem("user")
            if (userStr) {
              const userObj = JSON.parse(userStr)
              if (Array.isArray(userObj.customers)) {
                const primary = userObj.customers.find((c: any) => c.is_primary === 1)
                if (primary) labId = primary.id
              }
            }
          }
        } catch { }
      }
      if (labId) {
        // Prevent concurrent calls
        isFetchingProductsRef.current = true
        
        // Build parameters for fetchLabProducts similar to add product modal
        const params: Record<string, any> = {
          per_page: 10,
          page: 1
        }

        // Add search parameter
        if (productSearch.trim()) {
          params.search = productSearch.trim()
        }

        // Add subcategory filter
        if (selectedSubCategoryId) {
          params.subcategory_id = selectedSubCategoryId
        }

        // Add sort parameters
        if (productSort === "name-az") {
          params.sort_by = "name"
          params.sort_order = "asc"
        } else if (productSort === "name-za") {
          params.sort_by = "name"
          params.sort_order = "desc"
        }
        
        // Fetch products using debounced fetchLabProducts from slip creation context
        debouncedFetchLabProducts(labId, params)
          .finally(() => {
            isFetchingProductsRef.current = false
          })
      }
    }
  }, [shouldRefetchLabProducts, selectedLab, step, productSearch, productSort, selectedSubCategoryId, debouncedFetchLabProducts])

  // Note: Removed stages and grades API calls - now using product data from fetchProductDetails response

  // --- Always fetch lab products when step 6 is entered ---
  useEffect(() => {
    if (step === 6 && selectedLab && selectedSubCategoryId && !isFetchingProductsRef.current) {
      setLabProductsLoading(true);

      let labId: number | null = null;
      if (typeof window !== "undefined") {
        try {
          const role = localStorage.getItem("role");
          
          if (role === "doctor" || role === "office_admin") {
            // For doctor and office_admin roles, use selectedLabId from localStorage
            const storedLabId = localStorage.getItem("selectedLabId");
            if (storedLabId) {
              labId = Number(storedLabId);
            }
          } else {
            // For other roles, use the user's primary customer id as labId
            const userStr = localStorage.getItem("user");
            if (userStr) {
              const userObj = JSON.parse(userStr);
              if (Array.isArray(userObj.customers)) {
                const primary = userObj.customers.find((c: any) => c.is_primary === 1);
                if (primary) labId = primary.id;
              }
            }
          }
        } catch { }
      }
      if (!labId) {
        setLabProductsLoading(false);
        return;
      }

      // Prevent concurrent calls
      isFetchingProductsRef.current = true;

      // Build parameters for fetchLabProducts similar to add product modal
      const params: Record<string, any> = {
        per_page: 25,
        page: 1
      }

      // Add search parameter
      if (productSearch.trim()) {
        params.search = productSearch.trim()
      }

      // Add subcategory filter
      if (selectedSubCategoryId) {
        params.subcategory_id = selectedSubCategoryId
      }

      // Add sort parameters
      if (productSort === "name-az") {
        params.sort_by = "name"
        params.sort_order = "asc"
      } else if (productSort === "name-za") {
        params.sort_by = "name"
        params.sort_order = "desc"
      }
      
      // Fetch products using debounced fetchLabProducts from slip creation context
      debouncedFetchLabProducts(labId, params)
        .finally(() => {
          setLabProductsLoading(false);
          isFetchingProductsRef.current = false;
        });
    }
  }, [
    step,
    selectedLab,
    selectedSubCategoryId,
    productSearch,
    productSort,
    debouncedFetchLabProducts,
  ]);

  // Set selectedLab automatically when opening modal for Add Product (step 3)
  useEffect(() => {
    if (
      step === 3 &&
      !selectedLab // Only set if not already set
    ) {
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
        setSelectedLab(String(labId))
      }
    }
  }, [step, selectedLab])


  // Use labProducts for product selection
  const normalize = (str: string | undefined) =>
    (str || "").toLowerCase().replace(/s\b/, "").replace(/\s+/g, " ").trim();

  const filteredProducts = (labProducts || []).filter((p: any) => {
    const productCategoryName = normalize(p.category_name || p.category);
    const filterCategoryNames = advanceFilterState.category.map(normalize);
    const matchesCategory =
      advanceFilterState.category.length === 0 ||
      filterCategoryNames.includes(productCategoryName);

    const productSubCategoryName = normalize(p.subcategory_name || p.subCategory);
    const filterSubCategoryNames = advanceFilterState.subCategory.map(normalize);
    const matchesSubCategory =
      advanceFilterState.subCategory.length === 0 ||
      filterSubCategoryNames.includes(productSubCategoryName) ||
      productSubCategoryName === ""; // Allow products without subcategory data

    const matchesGrades =
      advanceFilterState.grades.length === 0 ||
      (p.grades && p.grades.some((g: any) => advanceFilterState.grades.includes(g.name)));

    const matchesStages =
      advanceFilterState.stages.length === 0 ||
      (p.stage_type &&
        advanceFilterState.stages.includes(
          p.stage_type === "multiple" ? "Multi Stage" : "Single Stage"
        ));

    const matchesSearch =
      (p.name || "").toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.code || "").toLowerCase().includes(productSearch.toLowerCase());

    const matchesProductCategory =
      productCategory === "all" ||
      normalize(productCategory) === productCategoryName ||
      productCategoryName === ""; // Allow products without category data

    // Debug each filter condition (only log when debugging is needed)
    //   productCategoryName,
    //   filterCategoryNames,
    //   matchesCategory,
    //   productSubCategoryName,
    //   filterSubCategoryNames,
    //   matchesSubCategory,
    //   matchesGrades,
    //   matchesStages,
    //   matchesSearch,
    //   productCategory,
    //   matchesProductCategory,
    //   advanceFilterState,
    //   productSearch
    // });

    return (
      matchesCategory &&
      matchesGrades &&
      matchesStages &&
      matchesSubCategory &&
      matchesSearch &&
      matchesProductCategory
    );
  });

  // Reduced console logging to prevent spam
  //   advanceFilterState,
  //   productSearch,
  //   productCategory,
  //   labProductsCount: labProducts?.length
  // });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (productSort) {
      case "name-az":
        return (a.name || "").localeCompare(b.name || "")
      case "name-za":
        return (b.name || "").localeCompare(a.name || "")
      default:
        return 0
    }
  })

  // Memoized stages list for step 7
  const stagesList = useMemo(() => {
    const selectedProduct = sortedProducts.find((p: any) => String(p.id) === selectedProductInModal)
    
    // Try multiple sources for product data
    // Check store first (subscribed via hook), then effectiveSlipData
    const effectiveProductDetails = effectiveSlipData?.selectedProductDetails
    
    // Try to get detailed product data from multiple sources
    // The API response has stages at the root level, so check both root and nested data
    const detailedProductData = 
      storeSelectedProductDetails || 
      effectiveProductDetails?.data || 
      effectiveProductDetails

    let stagesList: any[] = []

    // Helper function to map stages
    const mapStages = (stages: any[]) => {
      return stages.map((stage: any) => ({
        id: stage.id || stage.stage_id,
        stage_id: stage.stage_id || stage.id,
        name: stage.name,
        code: stage.code,
        sequence: stage.sequence,
        status: stage.status,
        price: stage.price ?? null,
        days: stage.days ?? 0,
        is_common: stage.is_common,
        days_to_pickup: stage.days_to_pickup ?? 0,
        days_to_process: stage.days_to_process ?? 0,
        days_to_deliver: stage.days_to_deliver ?? 0,
        is_releasing_stage: stage.is_releasing_stage,
        is_stage_with_addons: stage.is_stage_with_addons,
        stage_configurations: stage.stage_configurations || {},
        image_url: stage.image_url || null,
        created_at: stage.created_at,
        updated_at: stage.updated_at,
        grade_pricing: stage.grade_pricing
      }))
    }

    // Priority 1: Use stages from the selected product in sortedProducts (already fetched from lab products API)
    if (selectedProduct?.stages && Array.isArray(selectedProduct.stages) && selectedProduct.stages.length > 0) {
      stagesList = mapStages(selectedProduct.stages)
    }
    // Priority 2: Use stages from detailed product data (fetchProductDetails response)
    // Check root level first (API response structure)
    else if (detailedProductData?.stages && Array.isArray(detailedProductData.stages) && detailedProductData.stages.length > 0) {
      stagesList = mapStages(detailedProductData.stages)
    }
    // Priority 3: Check nested data structure (if API wraps response in data property)
    else if (effectiveProductDetails?.data?.stages && Array.isArray(effectiveProductDetails.data.stages) && effectiveProductDetails.data.stages.length > 0) {
      stagesList = mapStages(effectiveProductDetails.data.stages)
    }
    // Only use stages from product detail - no fallbacks
    // If no stages are available from product detail, return empty array

    return stagesList
  }, [sortedProducts, selectedProductInModal, effectiveSlipData, storeSelectedProductDetails])


  // Debug rendering

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})

  const [selectedLabId, setSelectedLabId] = useState<string | null>(null)
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null)
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null)

  // Fetch doctors when lab/office is selected (for step 2+)
  useEffect(() => {
    const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    if (selectedOfficeId) {
      // For step 2+, fetch when both lab and office are selected
      if (selectedLabId && selectedOfficeId && step >= 2) {
        console.log("Step 2+ - Calling fetchOfficeDoctors with selectedOfficeId:", selectedOfficeId);
        fetchOfficeDoctors(Number(selectedOfficeId));
      }
    }
  }, [selectedLabId, selectedOfficeId, step, fetchOfficeDoctors])

  // Auto-select doctor if only one is available and advance to step 2
  useEffect(() => {
    if (officeDoctors && officeDoctors.length === 1 && !addSlipFormData.doctor && !selectedDoctorId && step === 1) {
      const singleDoctor = officeDoctors[0];
      const doctorName = singleDoctor.full_name || `${singleDoctor.first_name || ""} ${singleDoctor.last_name || ""}`.trim() || "Unknown Doctor";
      const doctorId = String(singleDoctor.id);

      setAddSlipFormData((prev) => ({
        ...prev,
        doctor: doctorName,
        doctor_id: doctorId,
      }));

      setDoctorDropdownOpen(false);
      setSelectedDoctor(doctorId);
      setSelectedDoctorId(doctorId);
      
      // Auto-advance to step 2 (lab/office selection) when only one doctor is available
      setStep(2);
    }
  }, [officeDoctors, addSlipFormData.doctor, selectedDoctorId, step])

  // Auto-select current user as doctor if role is "doctor" and advance to step 2
  useEffect(() => {
    if (step === 1 && !addSlipFormData.doctor && !selectedDoctorId) {
      const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
      
      if (role === "doctor") {
        // Get current user data from localStorage
        const userData = typeof window !== "undefined" ? localStorage.getItem("user") : null;
        
        if (userData) {
          try {
            const user = JSON.parse(userData);
            const doctorName = user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Unknown Doctor";
            const doctorId = String(user.id);

            setAddSlipFormData((prev) => ({
              ...prev,
              doctor: doctorName,
              doctor_id: doctorId,
            }));

            setDoctorDropdownOpen(false);
            setSelectedDoctor(doctorId);
            setSelectedDoctorId(doctorId);
            
            // Auto-advance to step 2 (lab/office selection) when user is a doctor
            setStep(2);
          } catch (error) {
            console.error("Error parsing user data:", error);
          }
        }
      }
    }
  }, [step, addSlipFormData.doctor, selectedDoctorId])

  const handleLabSelect = (labId: string) => {
    const item = selectionData.find((l: any) =>
      String(isLabAdmin ? (l as ConnectedOffice).office?.id : (l as ConnectedLab).lab?.id) === labId
    )

    // Normal selection: update selection only (don't auto-proceed)
    setSelectedLab(labId)
    setSelectedLabId(labId)
    if (item) {
      let labName = "";
      let labIdVal = "";
      let officeIdVal = undefined;
      let officeName = "";
      
      // Get user role to determine office_id logic
      const role = typeof window !== "undefined" ? localStorage.getItem("role") : null
      
      if (isLabAdmin && (item as ConnectedOffice).office) {
        labName = (item as ConnectedOffice).office.name;
        labIdVal = String((item as ConnectedOffice).office.id);
        officeIdVal = String((item as ConnectedOffice).office.id);
        officeName = (item as ConnectedOffice).office.name;
      } else if (!isLabAdmin && (item as ConnectedLab).lab) {
        labName = (item as ConnectedLab).lab.name;
        labIdVal = String((item as ConnectedLab).lab.id);
        
        // For office_admin role, set office_id to customerId from localStorage
        if (role === "office_admin") {
          const customerId = typeof window !== "undefined" ? localStorage.getItem("customerId") : null
          if (customerId) {
            officeIdVal = customerId
            officeName = "Office" // Default office name for office_admin
          }
        }
      }
      
      setAddSlipFormData((prev) => ({
        ...prev,
        lab: labName,
        lab_id: labIdVal,
        office_id: officeIdVal || "",
        office: officeName || (isLabAdmin ? labName : prev.office), // Set office name
      }))
      if (isLabAdmin && (item as ConnectedOffice).office) setSelectedOfficeId(String((item as ConnectedOffice).office.id))
      
      // Save selected lab ID to localStorage when role is office
      if (role === "office_admin" && typeof window !== "undefined") {
        localStorage.setItem("selectedLabId", labIdVal)
      }
      
      // Auto-advance to step 3 (patient name entry) when lab/office is selected
      if (step === 2) {
        setStep(3)
      }
    }
  }

  const handleConfirmDefaultLab = () => {
    if (pendingDefaultLab) {
      setDefaultLabId(pendingDefaultLab.id)
      setShowDefaultLabModal(false)
      setPendingDefaultLab(null)

      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("defaultLabId", pendingDefaultLab.id)
      }

      // If this is first time setup, also select the lab and move to next step
      if (isFirstTimeSetup) {
        setIsFirstTimeSetup(false)
        
        // Properly set all lab selection states
        const item = selectionData.find((l: any) =>
          String(isLabAdmin ? (l as ConnectedOffice).office?.id : (l as ConnectedLab).lab?.id) === pendingDefaultLab.id
        )

        if (item) {
          setSelectedLab(pendingDefaultLab.id)
          setSelectedLabId(pendingDefaultLab.id)

          let labName = "";
          let labIdVal = "";
          let officeIdVal = undefined;
          let officeName = "";
          
          // Get user role to determine office_id logic
          const role = typeof window !== "undefined" ? localStorage.getItem("role") : null
          
          if (isLabAdmin && (item as ConnectedOffice).office) {
            labName = (item as ConnectedOffice).office.name;
            labIdVal = String((item as ConnectedOffice).office.id);
            officeIdVal = String((item as ConnectedOffice).office.id);
            officeName = (item as ConnectedOffice).office.name;
          } else if (!isLabAdmin && (item as ConnectedLab).lab) {
            labName = (item as ConnectedLab).lab.name;
            labIdVal = String((item as ConnectedLab).lab.id);
            
            // For office_admin role, set office_id to customerId from localStorage
            if (role === "office_admin") {
              const customerId = typeof window !== "undefined" ? localStorage.getItem("customerId") : null
              if (customerId) {
                officeIdVal = customerId
                officeName = "Office" // Default office name for office_admin
              }
            }
          }

          setAddSlipFormData((prev) => ({
            ...prev,
            lab: labName,
            lab_id: labIdVal,
            office_id: officeIdVal || "",
            office: officeName || (isLabAdmin ? labName : prev.office),
          }))

          if (isLabAdmin && (item as ConnectedOffice).office) {
            setSelectedOfficeId(String((item as ConnectedOffice).office.id))
          }

          // Save selected lab ID to localStorage when role is office
          if (role === "office_admin" && typeof window !== "undefined") {
            localStorage.setItem("selectedLabId", labIdVal)
          }
        }

        setStep(3) // Move to next step (patient name entry) after confirming default lab
      }
    }
  }

  const handleCancelDefaultLab = () => {
    // Just close the modal and stay on lab selection step
    setShowDefaultLabModal(false)
    setPendingDefaultLab(null)
    setIsFirstTimeSetup(true) // Allow user to proceed without setting as default
  }

  const handleDoctorSelect = (doctorValue: string) => {
    setAddSlipFormData((prev) => {
      let doctorId = doctorValue
      let doctorInfo = {}

      if (Array.isArray(officeDoctors)) {
        const foundDoc = officeDoctors.find(
          (doc: any) =>
            doc.full_name === doctorValue ||
            `${doc.first_name} ${doc.last_name}` === doctorValue
        )
        if (foundDoc) {
          doctorId = String(foundDoc.id)
          doctorInfo = (foundDoc as any).doctor_info || {}
        }
      }
      setSelectedDoctorId(String(doctorId))
      return { ...prev, doctor: doctorValue, doctor_id: doctorId, doctor_info: doctorInfo }
    })
  }

  const handlePatientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    
    setAddSlipFormData((prev) => ({
      ...prev,
      patient: value,
      patient_name: value,
    }))
  }

  const handleInlinePatientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setAddSlipFormData((prev) => ({
      ...prev,
      patient: value,
      patient_name: value,
    }))
  }

  const handleInlinePatientBlur = () => {
    setIsInlineEditingPatient(false)
  }

  const handleInlinePatientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsInlineEditingPatient(false)
      // If we're on step 3 and have a valid patient name, proceed to next step
      if (step === 3 && addSlipFormData.patient.trim()) {
        setStep(4)
      }
    }
    if (e.key === 'Escape') {
      setIsInlineEditingPatient(false)
    }
  }

  const validateForm = () => {
    const errors: { [key: string]: string } = {}


    // Step 1: Only validate doctor selection
    if (step === 1) {
      if (!selectedDoctorId) errors.doctor = "Doctor is required."
    }
    // Step 2: Validate lab/office selection
    else if (step === 2) {
      if (!selectedDoctorId) errors.doctor = "Doctor is required."
      if (!selectedLabId) errors.lab = "Lab/Office is required."
    }
    // Step 3: Validate patient name
    else if (step === 3) {
      if (!selectedDoctorId) errors.doctor = "Doctor is required."
      if (!selectedLabId) errors.lab = "Lab/Office is required."
      if (!addSlipFormData.patient) errors.patient = "Patient name is required."
    }
    // Other steps: Full validation
    else {
      if (!selectedLabId) errors.lab = "Lab/Office is required."
      if (isLabAdmin && !selectedOfficeId) errors.office = "Office is required."
      if (!addSlipFormData.office_id) errors.office = "Office is required."
      if (!selectedDoctorId) errors.doctor = "Doctor is required."
      if (!addSlipFormData.patient) errors.patient = "Patient name is required."
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Get subcategories for the selected category
  const getSubcategoriesForCategory = useMemo(() => {
    if (!productCategory || productCategory === "all") return []

    const subcategories = new Set<string>()
    labProducts.forEach((p: any) => {
      if (p.category_name === productCategory && p.subcategory_name) {
        subcategories.add(p.subcategory_name)
      }
    })
    return Array.from(subcategories)
  }, [labProducts, productCategory])

  const handleContinueModal = () => {
    if (step === 1) {
      if (!validateForm()) {
        return;
      }
      setStep(2) // Go to lab/office selection
    }
    else if (step === 2) {
      if (!validateForm()) {
        return;
      }
      setStep(3) // Go to patient name input
    }
    else if (step === 3) {
      setStep(4) // Go to product categories selection
    }
    else if (step === 4) {
      setStep(5) // Go to subcategory selection after category is selected
    }
    else if (step === 5) {
      setStep(6) // Go to product selection after subcategory is selected
    }
    else if (step === 6 && selectedProductInModal) {
      setStep(7) // Go to stage selection after product is selected
    }
    else if (step === 7 && selectedStages.length > 0) {
      if (selectedProductInModal) {
        setSelectedArch('') // Reset arch selection when opening modal
        setShowArchModal(true) // Show arch modal after stage is selected
      } else {
        console.error("Cannot show arch modal: no product selected")
      }
    }
  }

  const handleBackModal = () => {
    if (step === 7) setStep(6)
    else if (step === 6) setStep(5)
    else if (step === 5) setStep(4)
    else if (step === 4) setStep(3)
    else if (step === 3) setStep(2)
    else if (step === 2) setStep(1)
  }

  // Unified function to handle category and subcategory clearing
  const handleCategorySelectionChange = () => {
    // Clear all category and subcategory selections
    setProductCategory("all")
    setSelectedSubCategory(null)
    setSelectedSubCategoryId(null)
    setSelectedProductInModal(null)
    
    // Clear advance filter state
    setAdvanceFilterState(prev => ({
      ...prev,
      category: [],
      subCategory: []
    }))
    
    // Go back to categories step (step 4)
    setStep(4)
  }

  const handleDismissOnboarding = () => {
    setShowOnboarding(false)
    setShowHintsButton(true)
  }

  const handleNewLabSelect = (lab: any) => {
    // Handle lab selection from the Add New Lab modal
    // You can add logic here to handle the selected lab
    setShowAddNewLabModal(false)
  }

  const handleInviteLab = (labName: string) => {
    // Handle inviting a new lab
    // You can add logic here to send an invitation
    setShowAddNewLabModal(false)
  }

  const handleArchContinue = async () => {
    setIsCompleting(true)

    try {
      setShowArchModal(false)

      // Validate required fields before proceeding
      if (!addSlipFormData.patient || !addSlipFormData.patient.trim()) {
        console.error("Patient name is required for the case.")
        alert("Patient name is required for the case.")
        setIsCompleting(false)
        return
      }
      
      if (!addSlipFormData.doctor || !addSlipFormData.doctor.trim()) {
        console.error("Doctor is required for the case.")
        alert("Doctor is required for the case.")
        setIsCompleting(false)
        return
      }
      
      if (!addSlipFormData.lab || !addSlipFormData.lab.trim()) {
        console.error("Lab/Office is required for the case.")
        alert("Lab/Office is required for the case.")
        setIsCompleting(false)
        return
      }
      
      // Check if lab products are loaded
      if (!labProducts || labProducts.length === 0) {
        console.error("Lab products not loaded yet, attempting to fetch...")
        
        // Try to fetch lab products if we have a selected lab
        let labId: number | null = null
        
        // Use prop selectedLabId if available, otherwise try to get from localStorage
        if (propSelectedLabId) {
          labId = propSelectedLabId
        } else if (selectedLab) {
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
        }
        
        if (labId && !isFetchingProductsRef.current) {
          // Prevent concurrent calls
          isFetchingProductsRef.current = true
          
          try {
            // Use debounced fetchLabProducts from slip creation context
            await debouncedFetchLabProducts(labId, { per_page: 25, page: 1 })
            // Force re-evaluation of labProducts useMemo
            setForceProductsRefresh(prev => prev + 1)
            // Wait a bit for the products to be loaded and re-evaluated
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Check again if products are loaded after fetch
            if (!labProducts || labProducts.length === 0) {
              console.error("Lab products still not loaded after fetch attempt")
              setIsCompleting(false)
              return
            }
          } finally {
            isFetchingProductsRef.current = false
          }
        }
      }
      
      // Also check if connected labs are loaded, fetch if needed
      if (!connectedLabs || connectedLabs.length === 0) {
        await debouncedFetchConnectedLabs()
        // Wait a bit for the labs to be loaded
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      const selectedProductData = labProducts.find((p: any) => String(p.id) === selectedProductInModal)
      
      // Check if we have a valid selected product
      if (!selectedProductData) {
        console.error("No product selected or product not found:", {
          selectedProductInModal,
          labProducts: labProducts.map(p => ({ id: p.id, name: p.name })),
          availableProductIds: labProducts.map(p => String(p.id)),
          rawLabProducts: rawLabProducts,
          step: step
        })
        setIsCompleting(false)
        return
      }
      
      // Check if we have a valid selected lab
      let selectedLabData = null
      
      // First try to find in connectedLabs
      if (connectedLabs && connectedLabs.length > 0) {
        selectedLabData = connectedLabs.find((l: any) => String(l.lab.id) === selectedLab)
      }
      
      // If not found in connectedLabs, create a mock lab data using the selectedLabId prop or selectedLab
      if (!selectedLabData && (propSelectedLabId || selectedLab)) {
        const labId = propSelectedLabId || Number(selectedLab)
        selectedLabData = {
          lab: {
            id: labId,
            name: "Selected Lab" // We don't have the name, but we have the ID
          }
        }
      }
      
      if (!selectedLabData) {
        console.error("No lab selected or lab not found:", {
          selectedLab,
          propSelectedLabId,
          connectedLabs: connectedLabs?.map(l => ({ id: l.lab?.id, name: l.lab?.name })) || [],
          connectedLabsLength: connectedLabs?.length || 0
        })
        setIsCompleting(false)
        return
      }
      
      // Fetch product details to get actual grades and stages
      let detailedProductData = selectedProductData
      const labId = propSelectedLabId || selectedLabData?.lab?.id || Number(selectedLab)
      if (labId && selectedProductData?.id) {
        try {
          console.log('🔍 Fetching product details for product:', selectedProductData.id, 'lab:', labId)
          const fetchedProductDetails = await fetchProductDetails(selectedProductData.id, labId)
          if (fetchedProductDetails) {
            // Merge the detailed product data with the selected product data
            detailedProductData = {
              ...selectedProductData,
              ...fetchedProductDetails,
              // Ensure grades and stages from detailed data take precedence
              grades: fetchedProductDetails.grades || selectedProductData.grades || [],
              stages: fetchedProductDetails.stages || selectedProductData.stages || [],
            }
            console.log('✅ Fetched product details:', {
              hasGrades: !!detailedProductData.grades && detailedProductData.grades.length > 0,
              hasStages: !!detailedProductData.stages && detailedProductData.stages.length > 0,
              gradesCount: detailedProductData.grades?.length || 0,
              stagesCount: detailedProductData.stages?.length || 0,
            })
          } else {
            console.warn('⚠️ Failed to fetch product details, using product data from list')
          }
        } catch (error) {
          console.error('❌ Error fetching product details:', error)
          // Continue with selectedProductData if fetch fails
        }
      }
      
      const data = {
        ...addSlipFormData,
        doctor_id: addSlipFormData.doctor_id,
        selectedLab: selectedLabData,
        selectedProduct: detailedProductData, // Use detailed product data
        selectedArch,
        selectedStages,
      }
      handleAddSlipComplete(data)
      
      // Store the slip data with a flag to show teeth shade modal
      const slipDataWithTeethShadeFlag = {
        ...data,
        selectedProductId: detailedProductData?.id || null,
        shouldShowTeethShadeModal: selectedArch === "both", // Add flag for teeth shade modal
        selectedArch: selectedArch || undefined, // Convert null to undefined
      }

      useSlipStore.getState().setSlipData(slipDataWithTeethShadeFlag)

      // Save caseDesignData and caseDesignCache to localStorage BEFORE redirecting
      // This ensures the case-design page has all the necessary data
      let cacheSaved = false
      if (typeof window !== "undefined") {
        try {
          // Get createdBy from user object if not already set
          let createdBy = addSlipFormData.createdBy || ""
          if (!createdBy) {
            try {
              const userStr = localStorage.getItem("user")
              if (userStr) {
                const userObj = JSON.parse(userStr)
                createdBy = userObj?.display_name || userObj?.name || userObj?.email || ""
              }
            } catch { }
          }

          const caseDesignData = {
            office: addSlipFormData.office || "",
            office_id: addSlipFormData.office_id || "",
            lab: addSlipFormData.lab || "",
            lab_id: addSlipFormData.lab_id || "",
            doctor: addSlipFormData.doctor || "",
            doctor_id: addSlipFormData.doctor_id || "",
            patient: addSlipFormData.patient || "",
            patient_name: addSlipFormData.patient_name || "",
            panNumber: addSlipFormData.panNumber || "",
            caseNumber: addSlipFormData.caseNumber || "",
            slipNumber: addSlipFormData.slipNumber || "",
            createdBy,
            location: addSlipFormData.location || "",
            caseStatus: addSlipFormData.caseStatus || "Draft",
            pickupDate: addSlipFormData.pickupDate || "",
            deliveryDate: addSlipFormData.deliveryDate || "",
            deliveryTime: addSlipFormData.deliveryTime || "",
          }
          
          // Save caseDesignData first
          localStorage.setItem("caseDesignData", JSON.stringify(caseDesignData))
          console.log('💾 Saved caseDesignData to localStorage')

          // Create product object from selected product data
          // Use detailed product data which includes actual grades and stages
          const productGrades = detailedProductData?.grades || []
          const productStages = detailedProductData?.stages || []
          
          console.log('📦 Product data for cache:', {
            productId: detailedProductData?.id,
            productName: detailedProductData?.name,
            hasGrades: productGrades.length > 0,
            hasStages: productStages.length > 0,
            gradesCount: productGrades.length,
            stagesCount: productStages.length,
            grades: productGrades.map((g: any) => g.name),
            stages: productStages.map((s: any) => s.name),
          })

          // Get the default grade from the product's grades (where is_default === "Yes")
          const defaultGrade = productGrades.find((g: any) => g.is_default === "Yes")
          const availableGrade = defaultGrade?.name ||
            (productGrades.length > 0 ? productGrades[0]?.name : null) ||
            "Mid Grade"

          // Get the selected stage name and ID
          let selectedStageName = productStages.length > 0 ? productStages[0]?.name : "Try in with teeth"
          let selectedStageId: number | undefined = undefined
          if (selectedStages?.[0]) {
            const selectedStageValue = selectedStages[0]
            
            // Try to find in product stages first
            const stageInProduct = productStages.find((stage: any) => 
              stage.id?.toString() === selectedStageValue || 
              stage.name === selectedStageValue ||
              stage.stage_id?.toString() === selectedStageValue
            )
            
            if (stageInProduct) {
              selectedStageName = stageInProduct.name
              selectedStageId = stageInProduct.id || stageInProduct.stage_id
            } else {
              // If it's already a name string, use it directly
              if (typeof selectedStageValue === 'string' && !selectedStageValue.match(/^\d+$/)) {
                selectedStageName = selectedStageValue
              }
            }
          } else if (productStages.length > 0) {
            // If no stage selected but we have stages, use the first one
            selectedStageName = productStages[0].name
            selectedStageId = productStages[0].id || productStages[0].stage_id
          }

          // Get the grade ID for the selected grade
          const selectedGradeObj = productGrades.find((g: any) => g.name === availableGrade)
          const selectedGradeId = selectedGradeObj?.id

          // Create product configuration
          const defaultProductConfig: ProductConfiguration = {
            restoration: detailedProductData?.category_name || detailedProductData?.subcategory?.category?.name || "Removable Restoration",
            productName: detailedProductData?.name || "Default Product",
            grade: availableGrade,
            stage: selectedStageName,
            gradeId: selectedGradeId,
            stageId: selectedStageId,
            teethShadePart1: "",
            gumShadePart1: "",
            gumShadePart2: "",
            impression: "",
          }

          // Determine arch type
          const archType = selectedArch === "upper"
            ? "Maxillary"
            : selectedArch === "lower"
              ? "Mandibular"
              : "Maxillary, Mandibular"

          // Format teeth - use empty for now, will be selected in case-design page
          const formattedTeeth = ""

          // Get product image
          const productImage =
            (detailedProductData?.image_url && detailedProductData?.image_url !== "/placeholder.svg" && detailedProductData?.image_url !== null)
              ? detailedProductData.image_url
              : "/images/product-default.png"

          // Get extraction data from detailed product data
          // Try multiple sources: direct extractions, data.extractions, or extraction_options
          const productExtractions = detailedProductData?.extractions || 
                                     detailedProductData?.data?.extractions || 
                                     detailedProductData?.extraction_options || 
                                     []
          const hasExtraction = detailedProductData?.has_extraction || 
                                detailedProductData?.data?.has_extraction || 
                                (productExtractions.length > 0 ? "Yes" : "No")
          const extractionOptions = detailedProductData?.extraction_options || 
                                    detailedProductData?.data?.extraction_options || 
                                    []

          console.log('📦 Extraction data for product:', {
            productId: detailedProductData?.id,
            hasExtractions: productExtractions.length > 0,
            extractionsCount: productExtractions.length,
            hasExtraction,
            extractionOptionsCount: extractionOptions.length,
            extractionNames: productExtractions.map((e: any) => e.name || e.extraction_name),
          })

          // Store extraction data in Zustand store for missing-teeth-cards component
          // Use both the base product ID and the generated product ID
          if (typeof window !== "undefined" && detailedProductData?.id && productExtractions.length > 0) {
            try {
              const { setProductExtractions } = useTeethSelectionStore.getState()
              const baseProductIdStr = String(detailedProductData.id)
              
              // Store with base product ID (for lookup by missing-teeth-cards)
              setProductExtractions(baseProductIdStr, {
                extractions: productExtractions,
                has_extraction: hasExtraction,
                extraction_options: extractionOptions,
              })
              
              console.log('💾 Stored extraction data in Zustand store for base product ID:', baseProductIdStr, {
                extractionsCount: productExtractions.length,
                hasExtraction,
                extractionNames: productExtractions.map((e: any) => e.name || e.extraction_name),
              })
            } catch (error) {
              console.error('❌ Error storing extraction data in Zustand:', error)
            }
          }

          // Create the product object
          const newProduct: Product = {
            id: (detailedProductData?.id || 'unknown') + "-" + Date.now(),
            name: detailedProductData?.name || 'Unknown Product',
            type: archType,
            teeth: formattedTeeth,
            deliveryDate: caseDesignData.deliveryDate && caseDesignData.deliveryTime
              ? caseDesignData.deliveryDate + " at " + caseDesignData.deliveryTime
              : "",
            image: productImage,
            abbreviation: (detailedProductData?.name || 'Unknown')
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase(),
            color: "bg-blue-600",
            borderColor: "border-blue-600",
            addOns: [],
            stageNotesContent: "",
            maxillaryConfig: { ...defaultProductConfig },
            mandibularConfig: selectedArch === "both" ? { ...defaultProductConfig } : { ...defaultProductConfig },
            // Add category and subcategory IDs and names - extract from nested structure
            category_name: detailedProductData?.category_name || detailedProductData?.subcategory?.category?.name,
            subcategory_name: detailedProductData?.subcategory_name || detailedProductData?.subcategory?.name,
            category_id: detailedProductData?.category_id || detailedProductData?.subcategory?.category?.id,
            subcategory_id: detailedProductData?.subcategory_id || detailedProductData?.subcategory?.id,
            // Use actual grades and stages from product details - only use fallback if truly empty
            grades: productGrades.length > 0 ? productGrades : [
              { id: 1, name: "Economy", code: "ECO", status: "Active" },
              { id: 2, name: "Mid Grade", code: "MID", status: "Active" },
              { id: 3, name: "Premium", code: "PREM", status: "Active" }
            ],
            stages: productStages.length > 0 ? productStages : [
              { id: 1, name: "Bisque/Try In", code: "BISQUE", status: "Active" },
              { id: 2, name: "Die trim", code: "DIE", status: "Active" },
              { id: 3, name: "Finish", code: "FINISH", status: "Active" },
              { id: 4, name: "Digital design", code: "DIGITAL", status: "Active" }
            ],
            // Add extraction data to product object for missing-teeth-cards component
            // Store as a data property to match the structure expected by missing-teeth-cards
            data: {
              extractions: productExtractions,
              has_extraction: hasExtraction,
              extraction_options: extractionOptions,
            },
            // Also add at top level for backward compatibility
            extractions: productExtractions,
            has_extraction: hasExtraction,
            extraction_options: extractionOptions,
          }

         

          // Save caseDesignCache to localStorage for case-design page
          const caseDesignCache = {
            slipData: {
              formData: caseDesignData,
              selectedLab: selectedLabData,
              selectedProduct: detailedProductData, // Use detailed product data with grades/stages
              selectedArch: selectedArch || undefined,
              selectedStages,
              selectedProductId: detailedProductData?.id || null,
              shouldShowTeethShadeModal: selectedArch === "both",
            },
            products: [newProduct], // Add the created product to the array
            allNotes: [],
            selectedMaxillaryTeeth: [],
            selectedMandibularTeeth: [],
            rushRequests: {},
          }
          
        
          
          // Save to localStorage
          localStorage.setItem("caseDesignCache", JSON.stringify(caseDesignCache))
          
          // Verify the data was saved successfully
          const verifyCache = localStorage.getItem("caseDesignCache")
          if (verifyCache) {
            try {
              const verifyData = JSON.parse(verifyCache)
              const hasValidData = verifyData.slipData && (
                verifyData.slipData.formData ||
                verifyData.slipData.selectedProduct ||
                verifyData.slipData.selectedLab
              )
              const hasProducts = verifyData.products && Array.isArray(verifyData.products) && verifyData.products.length > 0
              
              if (hasValidData) {
                cacheSaved = true
                console.log('✅ Verified caseDesignCache saved successfully:', {
                  hasSlipData: !!verifyData.slipData,
                  hasFormData: !!verifyData.slipData?.formData,
                  hasPatient: !!verifyData.slipData?.formData?.patient,
                  hasLab: !!verifyData.slipData?.formData?.lab,
                  hasSelectedProduct: !!verifyData.slipData?.selectedProduct,
                  hasSelectedLab: !!verifyData.slipData?.selectedLab,
                  hasProducts,
                  productsCount: verifyData.products?.length || 0,
                  firstProductName: verifyData.products?.[0]?.name || null,
                })
                
                if (!hasProducts) {
                  console.warn('⚠️ caseDesignCache saved but products array is empty')
                }
              } else {
                console.error('❌ caseDesignCache saved but data is invalid')
              }
            } catch (parseError) {
              console.error('❌ Failed to parse verified caseDesignCache:', parseError)
            }
          } else {
            console.error('❌ Failed to save caseDesignCache to localStorage - verification failed')
          }
        } catch (saveError) {
          console.error('❌ Error saving to localStorage:', saveError)
        }
      }

      // Only proceed with callbacks and redirect if cache was saved successfully
      // If cache wasn't saved, retry synchronously before proceeding
      if (!cacheSaved && typeof window !== "undefined") {
        console.error('❌ Cannot proceed - caseDesignCache was not saved. Retrying...')
        try {
          // Re-create product for retry (same logic as above, using detailedProductData)
          const retryProductGrades = detailedProductData?.grades || []
          const retryProductStages = detailedProductData?.stages || []
          const retryDefaultGrade = retryProductGrades.find((g: any) => g.is_default === "Yes")
          const retryAvailableGrade = retryDefaultGrade?.name ||
            (retryProductGrades.length > 0 ? retryProductGrades[0]?.name : null) ||
            "Mid Grade"
          
          let retrySelectedStageName = retryProductStages.length > 0 ? retryProductStages[0]?.name : "Try in with teeth"
          if (selectedStages?.[0]) {
            const retryStageValue = selectedStages[0]
            const retryStageInProduct = retryProductStages.find((stage: any) => 
              stage.id?.toString() === retryStageValue || 
              stage.name === retryStageValue ||
              stage.stage_id?.toString() === retryStageValue
            )
            if (retryStageInProduct) {
              retrySelectedStageName = retryStageInProduct.name
            } else if (typeof retryStageValue === 'string' && !retryStageValue.match(/^\d+$/)) {
              retrySelectedStageName = retryStageValue
            }
          } else if (retryProductStages.length > 0) {
            retrySelectedStageName = retryProductStages[0].name
          }

          const retryArchType = selectedArch === "upper" ? "Maxillary" : selectedArch === "lower" ? "Mandibular" : "Maxillary, Mandibular"
          const retryProductImage = (detailedProductData?.image_url && detailedProductData?.image_url !== "/placeholder.svg" && detailedProductData?.image_url !== null)
            ? detailedProductData.image_url
            : "/images/product-default.png"

          // Get extraction data for retry
          const retryProductExtractions = detailedProductData?.extractions || 
                                         detailedProductData?.data?.extractions || 
                                         detailedProductData?.extraction_options || 
                                         []
          const retryHasExtraction = detailedProductData?.has_extraction || 
                                    detailedProductData?.data?.has_extraction || 
                                    (retryProductExtractions.length > 0 ? "Yes" : "No")
          const retryExtractionOptions = detailedProductData?.extraction_options || 
                                         detailedProductData?.data?.extraction_options || 
                                         []

          const retryProductConfig: ProductConfiguration = {
            restoration: detailedProductData?.category_name || detailedProductData?.subcategory?.category?.name || "Removable Restoration",
            productName: detailedProductData?.name || "Default Product",
            grade: retryAvailableGrade,
            stage: retrySelectedStageName,
            gradeId: retryProductGrades.find((g: any) => g.name === retryAvailableGrade)?.id,
            stageId: retryProductStages.find((s: any) => s.name === retrySelectedStageName)?.id,
            teethShadePart1: "",
            gumShadePart1: "",
            gumShadePart2: "",
            impression: "",
          }

          const retryProduct: Product = {
            id: (detailedProductData?.id || 'unknown') + "-" + Date.now(),
            name: detailedProductData?.name || 'Unknown Product',
            type: retryArchType,
            teeth: "",
            deliveryDate: "",
            image: retryProductImage,
            abbreviation: (detailedProductData?.name || 'Unknown').split(" ").map((n: string) => n[0]).join("").toUpperCase(),
            color: "bg-blue-600",
            borderColor: "border-blue-600",
            addOns: [],
            stageNotesContent: "",
            maxillaryConfig: { ...retryProductConfig },
            mandibularConfig: selectedArch === "both" ? { ...retryProductConfig } : { ...retryProductConfig },
            category_name: detailedProductData?.category_name || detailedProductData?.subcategory?.category?.name,
            subcategory_name: detailedProductData?.subcategory_name || detailedProductData?.subcategory?.name,
            category_id: detailedProductData?.category_id || detailedProductData?.subcategory?.category?.id,
            subcategory_id: detailedProductData?.subcategory_id || detailedProductData?.subcategory?.id,
            grades: retryProductGrades.length > 0 ? retryProductGrades : [
              { id: 1, name: "Economy", code: "ECO", status: "Active" },
              { id: 2, name: "Mid Grade", code: "MID", status: "Active" },
              { id: 3, name: "Premium", code: "PREM", status: "Active" }
            ],
            stages: retryProductStages.length > 0 ? retryProductStages : [
              { id: 1, name: "Bisque/Try In", code: "BISQUE", status: "Active" },
              { id: 2, name: "Die trim", code: "DIE", status: "Active" },
              { id: 3, name: "Finish", code: "FINISH", status: "Active" },
              { id: 4, name: "Digital design", code: "DIGITAL", status: "Active" }
            ],
            // Add extraction data to retry product
            extractions: retryProductExtractions,
            has_extraction: retryHasExtraction,
            extraction_options: retryExtractionOptions,
            data: {
              extractions: retryProductExtractions,
              has_extraction: retryHasExtraction,
              extraction_options: retryExtractionOptions,
            },
          }

          const retryCache = {
            slipData: {
              formData: {
                office: addSlipFormData.office || "",
                office_id: addSlipFormData.office_id || "",
                lab: addSlipFormData.lab || "",
                lab_id: addSlipFormData.lab_id || "",
                doctor: addSlipFormData.doctor || "",
                doctor_id: addSlipFormData.doctor_id || "",
                patient: addSlipFormData.patient || "",
                patient_name: addSlipFormData.patient_name || "",
                panNumber: addSlipFormData.panNumber || "",
                caseNumber: addSlipFormData.caseNumber || "",
                slipNumber: addSlipFormData.slipNumber || "",
                createdBy: addSlipFormData.createdBy || "",
                location: addSlipFormData.location || "",
                caseStatus: addSlipFormData.caseStatus || "Draft",
                pickupDate: addSlipFormData.pickupDate || "",
                deliveryDate: addSlipFormData.deliveryDate || "",
                deliveryTime: addSlipFormData.deliveryTime || "",
              },
              selectedLab: selectedLabData,
              selectedProduct: detailedProductData, // Use detailed product data with grades/stages
              selectedArch: selectedArch || undefined,
              selectedStages,
              selectedProductId: detailedProductData?.id || null,
              shouldShowTeethShadeModal: selectedArch === "both",
            },
            products: [retryProduct], // Include product in retry
            allNotes: [],
            selectedMaxillaryTeeth: [],
            selectedMandibularTeeth: [],
            rushRequests: {},
          }
          localStorage.setItem("caseDesignCache", JSON.stringify(retryCache))
          console.log('✅ Retry: caseDesignCache saved with product')
          cacheSaved = true
        } catch (retryError) {
          console.error('❌ Retry failed:', retryError)
          // Even if retry fails, we should still try to redirect to avoid blank page
          // The case-design page should handle missing cache gracefully
        }
      }

      // Call the parent callback to handle modal closing and data processing
      if (onAddSlipComplete) {
        onAddSlipComplete(data)
      }
      
      // Only close modal if not in modal mode (let parent handle closing in modal mode)
      if (!isModal) {
        effectiveSetShowAddSlipModal(false)
      }
      
      // Reset completing state
      setIsCompleting(false)

      // Always redirect to case-design page after arch selection
      // Use setTimeout to ensure modal closes first and localStorage is saved
      // This ensures the modal state updates and data is persisted before navigation
      setTimeout(() => {
        // Double-check that cache is saved before redirecting
        if (typeof window !== "undefined") {
          const finalCheck = localStorage.getItem("caseDesignCache")
          if (!finalCheck) {
            console.error('❌ caseDesignCache still not saved, but proceeding with redirect anyway')
            // Don't abort - let case-design page handle missing cache gracefully
            // This prevents blank page issues
          }
        }
        
        console.log('🚀 Redirecting to case-design page')
        // Check if we're already on case-design page
        if (typeof window !== "undefined") {
          const currentPath = window.location.pathname
          if (currentPath === "/case-design") {
            // If already on case-design, force a refresh to reload the page with new data
            console.log('📍 Already on case-design page, forcing refresh')
            window.location.reload()
          } else {
            // Navigate to case-design page
            // Using replace to avoid adding to history stack
            router.replace("/case-design")
          }
        } else {
          router.replace("/case-design")
        }
      }, isModal ? 300 : 100)
    } catch (error) {
      console.error("Error completing slip creation:", error)
      setIsCompleting(false)
    }
  }

  const handleAdvanceFilterApply = () => {
    setShowAdvanceFilter(false)
  }

  const handleAdvanceFilterReset = () => {
    setAdvanceFilterState({
      category: [],
      grades: [],
      stages: [],
      subCategory: [],
    })
  }

  const handleStageToggle = (stage: string) => {
    setSelectedStages([stage]) // Only select one stage at a time
  }

  const handleSaveDeliveryDate = ({
    deliveryDate,
    deliveryTime,
    notes,
  }: { deliveryDate: string; deliveryTime: string; notes: string }) => {
    setAddSlipFormData((prev) => ({
      ...prev,
      deliveryDate,
      deliveryTime,
    }))
  }

  const handleAddSlipComplete = (data: any) => {
    // Get grades and stages from the selected product's data first, then fall back to context
    const productGrades = data.selectedProduct?.grades || []
    const productStages = data.selectedProduct?.stages || []

    // Get the default grade from the product's grades (where is_default === "Yes")
    const defaultGrade = productGrades.find((g: any) => g.is_default === "Yes")
    const availableGrade = defaultGrade?.name ||
      (productGrades.length > 0 ? productGrades[0]?.name : null) ||
      (grades && grades.length > 0 ? grades.find(g => g.status === "Active")?.name : null) ||
      "Mid Grade"

    // Get the selected stage name and ID - try multiple sources
    let selectedStageName = "Try in with teeth"
    let selectedStageId: number | undefined = undefined
    if (data.selectedStages?.[0]) {
      const selectedStageValue = data.selectedStages[0]
      
      // Try to find in product stages first
      const stageInProduct = productStages.find((stage: any) => 
        stage.id?.toString() === selectedStageValue || 
        stage.name === selectedStageValue ||
        stage.stage_id?.toString() === selectedStageValue
      )
      
      if (stageInProduct) {
        selectedStageName = stageInProduct.name
        selectedStageId = stageInProduct.id || stageInProduct.stage_id
      } else {
        // Try to find in stagesList (from useMemo)
        const stageInList = stagesList.find((stage: any) => 
          stage.id?.toString() === selectedStageValue || 
          stage.name === selectedStageValue
        )
        
        if (stageInList) {
          selectedStageName = stageInList.name
          selectedStageId = stageInList.id
        } else {
          // If it's already a name string, use it directly
          if (typeof selectedStageValue === 'string' && !selectedStageValue.match(/^\d+$/)) {
            selectedStageName = selectedStageValue
          }
        }
      }
    }

    // Get the grade ID for the selected grade
    const selectedGradeObj = productGrades.find((g: any) => g.name === availableGrade) ||
      grades?.find((g: any) => g.name === availableGrade)
    const selectedGradeId = selectedGradeObj?.id

    const defaultProductConfig: ProductConfiguration = {
      restoration: data.selectedProduct?.restoration || "Crown",
      productName: data.selectedProduct?.name || "Default Product",
      grade: availableGrade, // Always use availableGrade since products don't have a grade property
      stage: selectedStageName,
      gradeId: selectedGradeId, // Set grade ID if available
      stageId: selectedStageId, // Set stage ID if available
      teethShadePart1: data.selectedProduct?.teethShade?.split(" ")[0] || "VITA",
      gumShadePart1: data.selectedProduct?.gumShade?.split(" - ")[0] || "St. George",
      gumShadePart2: data.selectedProduct?.gumShade?.split(" - ")[1] || "Light Vein",
      impression: data.selectedProduct?.impression || "1x STL",
    }

    if (effectiveAddSlipModalInitialStep === 1 || (effectiveAddSlipModalInitialStep === 2 && data.selectedProduct)) {
      // Use Zustand store to update slip data
      const { updateSlipData } = useSlipStore.getState();
      updateSlipData({
        ...data,
        createdBy: userDisplayName,
        location: 1,
      });
      const formattedTeeth = selectedTeeth.length > 0 ? selectedTeeth.map((tooth) => `#${tooth}`).join(", ") : "N/A"
      const productImage =
        ((data.selectedProduct?.image_url && data.selectedProduct?.image_url !== "/placeholder.svg" && data.selectedProduct?.image_url !== null)
        || (data.selectedProduct?.image_url_url && data.selectedProduct?.image_url_url !== "/placeholder.svg" && data.selectedProduct?.image_url_url !== null))
          ? (data.selectedProduct.image_url || data.selectedProduct.image_url_url)
          : "/images/product-default.png"
      const newProduct: Product = {
        id: (data.selectedProduct?.id || 'unknown') + "-" + Date.now(),
        name: data.selectedProduct?.name || 'Unknown Product',
        type:
          data.selectedArch === "upper"
            ? "Maxillary"
            : data.selectedArch === "lower"
              ? "Mandibular"
              : "Maxillary, Mandibular",
        teeth: formattedTeeth,
        deliveryDate: data.deliveryDate + " at " + data.deliveryTime,
        image: productImage,
        abbreviation: (data.selectedProduct?.name || 'Unknown')
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase(),
        color: "bg-red-600",
        borderColor: "border-blue-600",
        addOns: [],
        stageNotesContent: "",
        maxillaryConfig: { ...defaultProductConfig },
        mandibularConfig: data.selectedArch === "both" ? { ...defaultProductConfig } : { ...defaultProductConfig },
        // Add category and subcategory IDs and names - extract from nested structure
        category_name: data.selectedProduct?.category_name || data.selectedProduct?.subcategory?.category?.name,
        subcategory_name: data.selectedProduct?.subcategory_name || data.selectedProduct?.subcategory?.name,
        category_id: data.selectedProduct?.category_id || data.selectedProduct?.subcategory?.category?.id,
        subcategory_id: data.selectedProduct?.subcategory_id || data.selectedProduct?.subcategory?.id,

        // Add grades and stages data for the case design center section - USE PRODUCT'S OWN DATA
        grades: productGrades.length > 0 ? productGrades : (grades && grades.length > 0 ? grades : [
          { id: 1, name: "Economy", code: "ECO", status: "Active" },
          { id: 2, name: "Mid Grade", code: "MID", status: "Active" },
          { id: 3, name: "Premium", code: "PREM", status: "Active" }
        ]),
        stages: productStages.length > 0 ? productStages : (stages && stages.length > 0 ? stages : [
          { id: 1, name: "Bisque/Try In", code: "BISQUE", status: "Active" },
          { id: 2, name: "Die trim", code: "DIE", status: "Active" },
          { id: 3, name: "Finish", code: "FINISH", status: "Active" },
          { id: 4, name: "Digital design", code: "DIGITAL", status: "Active" }
        ]),
      }
      // Use Zustand store to add product
      const { addProduct } = useSlipStore.getState();
      addProduct(newProduct);
      setOpenAccordionItem(newProduct.id)
    }
    effectiveSetShowAddSlipModal(false)
    effectiveSetAddSlipModalInitialStep(1)
  }

  // Use allCategories API for step 2
  const {
    allCategories,
    allCategoriesLoading,
    fetchAllCategories,
    subcategoriesByCategory,
    subcategoriesLoading,
    subcategoriesError,
    fetchSubcategoriesByCategory,
  } = useProductCategory()

  // Debug useEffect to monitor subcategory state changes
  useEffect(() => {
    // Monitor subcategory state changes
  }, [subcategoriesLoading, subcategoriesError, subcategoriesByCategory]);

  useEffect(() => {
    if (step === 4) {
      // Fetch all categories for restoration type selection
      // Pass customer_id from localStorage if available
      const customerId = typeof window !== "undefined" ? localStorage.getItem("customerId") : null
      const customerIdNum = customerId ? Number(customerId) : undefined
      fetchAllCategories("en", customerIdNum)
    }
  }, [step, fetchAllCategories])

  // Helper for image by category name
  const getCategoryImage = (name: string) => {
    if (!name) return "/images/product-default.png"
    const lower = name.toLowerCase()
    if (lower.includes("fixed")) return "/images/fixed-restoration.png"
    if (lower.includes("removable")) return "/images/removable-restoration.png"
    if (lower.includes("ortho")) return "/images/orthodontics.png"
    // fallback
    return "/images/product-default.png"
  }

  const containerClasses = `flex flex-col ${!isModal ? 'lg:flex-row min-h-screen' : 'fixed inset-0 z-[10001] h-full max-h-[100vh]'} ${isModal ? 'bg-black/50' : 'bg-gray-50'}`

  return (
    <div className={containerClasses}>
      {/* Sidebar - Only show when not in modal mode */}
      {!isModal && (
        <div className="hidden lg:block">
          <DashboardSidebar />
        </div>
      )}
      {/* Main Content */}
      <main className={`flex-1 flex flex-col ${!isModal ? 'h-full lg:h-screen' : 'h-full max-h-[100vh]'} max-w-full ${isModal ? 'bg-white rounded-lg shadow-2xl mx-2 my-2' : ''}`}>
        {/* Modal Header - Only show when in modal mode */}
        {isModal && (
          <div className="flex items-center justify-between p-2 md:p-3 border-b border-gray-200 rounded-t-lg flex-shrink-0" style={{ backgroundColor: "#1162A8"}}>
            <h2 className="text-base md:text-lg font-semibold text-white">Add Slip</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        )}
        {/* Integrated Header - Show for all steps */}
        {/* Main Scrollable Content */}
        <div className={`flex-1 overflow-y-auto min-h-0 flex flex-col pb-20 sm:pb-0`}>
       

          {/* Header Section - Two Row Layout */}
          {effectiveShowAddSlipModal && (
            <div className="bg-white border border-[#D9D9D9]">
              {/* Top Row - Sending to (Left) + Center Logo */}
              <div
                className="relative flex flex-row justify-between items-center px-5 py-2.5 bg-white border-b border-[#D9D9D9]"
                style={{ height: '95px' }}
              >
                {/* Left: Sending to Lab/Office */}
                <div className="flex flex-row items-center" style={{ gap: '7px' }}>
                  <span
                    className="font-bold whitespace-nowrap"
                    style={{
                      fontSize: '15.99px',
                      lineHeight: '22px',
                      letterSpacing: '-0.02em',
                      color: '#080808',
                      fontFamily: 'Verdana'
                    }}
                  >
                    Sending to
                  </span>
                  {addSlipFormData.lab && (
                    <div className="flex items-center" style={{ gap: '7px' }}>
                      <div style={{ width: '83.61px', height: '33.24px' }}>
                        {(() => {
                          const selectedEntity = isLabAdmin
                            ? (selectionData.find((l: any) => String((l as ConnectedOffice).office?.id) === addSlipFormData.lab_id) as ConnectedOffice)?.office
                            : (selectionData.find((l: any) => String((l as ConnectedLab).lab?.id) === addSlipFormData.lab_id) as ConnectedLab)?.lab

                          return (
                            <>
                              {selectedEntity && (
                                <CustomerLogo
                                  customerId={selectedEntity?.id || null}
                                  alt={addSlipFormData.lab}
                                  className="w-full h-full object-contain"
                                />
                              )}
                              {!selectedEntity && typeof window !== "undefined" && (() => {
                                try {
                                  const userStr = localStorage.getItem("user");
                                  if (userStr) {
                                    const userObj = JSON.parse(userStr);
                                    if (Array.isArray(userObj.customers) && userObj.customers.length > 0) {
                                      const primary = userObj.customers.find((c: any) => c.is_primary === 1);
                                      const customer = primary || userObj.customers[0];
                                      if (customer?.id) {
                                        return (
                                          <CustomerLogo
                                            customerId={customer.id}
                                            alt={addSlipFormData.lab}
                                            className="w-full h-full object-contain"
                                          />
                                        );
                                      }
                                    }
                                  }
                                } catch (e) {
                                  // fallback
                                }
                                return (
                                  <img
                                    src="/images/office-default.png"
                                    alt={addSlipFormData.lab}
                                    className="w-full h-full object-contain"
                                  />
                                );
                              })()}
                            </>
                          )
                        })()}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setStep(2)
                        }}
                        className="p-0 text-[#B4B0B0] hover:text-gray-600"
                        style={{ width: '13.99px', height: '13.99px' }}
                      >
                        <Edit style={{ width: '13.99px', height: '13.99px' }} />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Center: Practice Logo */}
                <div className="absolute left-1/2 transform -translate-x-1/2" style={{ width: '343.75px', height: '75px' }}>
                  {(() => {
                    const selectedEntity = isLabAdmin
                      ? (selectionData.find((l: any) => String((l as ConnectedOffice).office?.id) === addSlipFormData.lab_id) as ConnectedOffice)?.office
                      : (selectionData.find((l: any) => String((l as ConnectedLab).lab?.id) === addSlipFormData.lab_id) as ConnectedLab)?.lab

                    return (
                      <>
                        {selectedEntity && (
                          <CustomerLogo
                            customerId={selectedEntity?.id || null}
                            alt={addSlipFormData.lab || "Practice Logo"}
                            className="w-full h-full object-contain"
                          />
                        )}
                        {!selectedEntity && typeof window !== "undefined" && (() => {
                          try {
                            const userStr = localStorage.getItem("user");
                            if (userStr) {
                              const userObj = JSON.parse(userStr);
                              if (Array.isArray(userObj.customers) && userObj.customers.length > 0) {
                                const primary = userObj.customers.find((c: any) => c.is_primary === 1);
                                const customer = primary || userObj.customers[0];
                                if (customer?.id) {
                                  return (
                                    <CustomerLogo
                                      customerId={customer.id}
                                      alt="Practice Logo"
                                      className="w-full h-full object-contain"
                                    />
                                  );
                                }
                              }
                            }
                          } catch (e) {
                            // fallback
                          }
                          return (
                            <img
                              src="/images/office-default.png"
                              alt="Practice Logo"
                              className="w-full h-full object-contain"
                            />
                          );
                        })()}
                      </>
                    )
                  })()}
                </div>

                {/* Right: Empty space for balance */}
                <div style={{ width: '200px' }}></div>
              </div>

              {/* Bottom Row - Doctor + Patient Info (Left), Creator (Right) */}
              <div
                className="flex flex-row justify-between items-center px-5 py-2.5 bg-white"
                style={{ minHeight: '154.92px' }}
              >
                {/* Left Section - Doctor Image + Patient Fields */}
                <div className="flex flex-row items-center gap-4">
                  {/* Doctor Image and Name */}
                  {addSlipFormData.doctor && (
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative">
                        {(() => {
                          const selectedDoctor = officeDoctors?.find((doc: any) =>
                            String(doc.id) === addSlipFormData.doctor_id
                          )

                          return (
                            <div className="rounded-full bg-gray-200 flex items-center justify-center overflow-hidden" style={{ width: '103.92px', height: '103.92px' }}>
                              {(selectedDoctor as any)?.profile_image ? (
                                <img
                                  src={(selectedDoctor as any).profile_image}
                                  alt={addSlipFormData.doctor}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <img
                                  src="/images/doctor-image.png"
                                  alt="Default Doctor"
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                          )
                        })()}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setStep(1)
                          }}
                          className="absolute -bottom-1 -right-1 p-0 bg-white rounded-full shadow-sm text-[#B4B0B0] hover:text-gray-600"
                          style={{ width: '14px', height: '14px' }}
                        >
                          <Edit style={{ width: '14px', height: '14px' }} />
                        </Button>
                      </div>
                      <p
                        style={{
                          fontFamily: 'Verdana',
                          fontSize: '17px',
                          lineHeight: '22px',
                          letterSpacing: '-0.02em',
                          color: '#000000',
                          textAlign: 'center'
                        }}
                      >
                        {addSlipFormData.doctor}
                      </p>
                    </div>
                  )}

                  {/* Patient Name and Gender with Floating Labels */}
                  <div className="flex flex-col" style={{ gap: '10px' }}>
                  {/* Patient Name Field with Floating Label */}
                  <div style={{ width: '330px' }}>
                    <Input
                      label="Patient name"
                      value={addSlipFormData.patient || ""}
                      onChange={(e) => {
                        setAddSlipFormData((prev) => ({
                          ...prev,
                          patient: e.target.value,
                          patient_name: e.target.value,
                        }))
                      }}
                      placeholder=""
                      validationState={addSlipFormData.patient ? "valid" : "default"}
                      className="w-full"
                    />
                  </div>

                  {/* Gender Field with Dropdown */}
                  <div style={{ width: '330px' }}>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Gender</label>
                      <Select
                        value={addSlipFormData.gender || ""}
                        onValueChange={(value) => {
                          setAddSlipFormData((prev) => ({
                            ...prev,
                            gender: value,
                          }))
                        }}
                      >
                        <SelectTrigger className="h-14 w-full">
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                </div>

                {/* Right Section - Creator */}
                {userDisplayName && (
                  <div className="flex flex-col items-end" style={{ width: '330px' }}>
                    <Input
                      label="Created By"
                      value={userDisplayName}
                      readOnly
                      validationState="default"
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

        

          {/* Step 1: Doctor Selection */}
          {step === 1 && (
            <div className="px-4 sm:px-6 lg:px-8 py-3 bg-white relative">
              {/* Loading Overlay */}
              <LoadingOverlay
                isLoading={officeDoctorsLoading}
                title="Loading Doctors"
                message="Please wait while we load available doctors..."
                zIndex={10000}
              />
              <div className="space-y-4">
                {/* Doctor Selection Header */}
                <div className="mb-6">
                  {/* Header with title */}
                  <div className="flex items-center justify-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">
                      Choose a Doctor
                    </h3>
                  </div>

                  {/* Search Section */}
                  <div className="flex items-center gap-4 mb-2">
                    {/* Search bar in the middle - takes up most of the space */}
                    <div className="relative flex-1">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search Doctors"
                        className="pr-10 py-2 bg-white border border-gray-300 rounded-lg w-full"
                      />
                    </div>

                    {/* Add Doctor button on the right */}
                    <Button
                      className="bg-[#1162a8] hover:bg-[#0f5490] text-white rounded-lg px-4 py-2 whitespace-nowrap"
                      onClick={() => {
                        setShowAddDoctorModal(true)
                      }}
                    >
                      + Add Doctor
                    </Button>
                  </div>

                  {/* Sort By and Doctor count row */}
                  <div className="flex items-center justify-between mb-4">
                    {/* Sort By on the left */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort By:</Label>
                      <Select>
                        <SelectTrigger className="w-36 bg-white border border-gray-300 rounded-lg">
                          <SelectValue placeholder="Name A-Z" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name-az">Name A-Z</SelectItem>
                          <SelectItem value="name-za">Name Z-A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Doctor count on the right */}
                    <p className="text-sm text-gray-500">
                      {officeDoctorsLoading ? "Loading..." : `${officeDoctors?.length || 0} doctors found`}
                    </p>
                  </div>
                </div>

                {/* Doctor Selection - Horizontal Layout */}
                {!officeDoctorsLoading && officeDoctors && officeDoctors.length > 0 ? (
                  <div className="flex flex-wrap justify-center gap-8 py-8">
                    {officeDoctors.map((doctor) => {
                      const doctorName = doctor.full_name || `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim();
                      const isSelected = selectedDoctor === String(doctor.id);

                      return (
                        <div
                          key={doctor.id}
                          className={`group flex flex-col items-center cursor-pointer transition-all duration-200 ${isSelected ? 'scale-105' : 'hover:scale-105'
                            }`}
                          onClick={() => {
                            const doctorId = String(doctor.id);
                            setAddSlipFormData((prev) => ({
                              ...prev,
                              doctor: doctorName,
                              doctor_id: doctorId,
                            }));
                            setSelectedDoctor(doctorId);
                            setSelectedDoctorId(doctorId);
                            // Automatically proceed to next step (lab/office selection)
                            setStep(2);
                          }}
                        >
                          {/* Profile Image */}
                          <div className="relative mb-3">
                            <div className={`w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center transition-all duration-200 group-hover:border-4 group-hover:border-blue-500 group-hover:shadow-lg ${isSelected ? 'border-4 border-blue-500' : 'border-2 border-gray-200'
                              }`}>
                              {(doctor as any).profile_image ? (
                                <img
                                  src={(doctor as any).profile_image}
                                  alt={doctorName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <img
                                  src="/images/doctor-image.png"
                                  alt="Default Doctor"
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            {/* Selection indicator */}
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>

                          {/* Doctor Name */}
                          <h4 className={`text-sm font-medium text-center max-w-24 mb-2 transition-colors duration-200 group-hover:text-blue-600 ${isSelected ? 'text-blue-600 font-semibold' : 'text-gray-900'
                            }`}>
                            {doctorName}
                          </h4>

                          {/* Select Button */}
                          <button
                            className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 group-hover:bg-blue-500 group-hover:text-white ${isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const doctorId = String(doctor.id);
                              setAddSlipFormData((prev) => ({
                                ...prev,
                                doctor: doctorName,
                                doctor_id: doctorId,
                              }));
                              setSelectedDoctor(doctorId);
                              setSelectedDoctorId(doctorId);
                              setStep(2);
                            }}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : !officeDoctorsLoading && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      {isLabAdmin && !selectedOfficeId 
                        ? "Please select an office in the next step to view doctors." 
                        : "No doctors found. Please select a lab/office in the next step."}
                    </p>
                    {isLabAdmin && !selectedOfficeId && (
                      <Button
                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => setStep(2)}
                      >
                        Go to Office Selection
                      </Button>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}

          {/* Step 2: Lab/Office Selection */}
          {step === 2 && isFirstTimeSetup && (
            <div className={`px-4 sm:px-6 lg:px-8 bg-white flex-1 flex flex-col ${isModal ? 'py-3' : 'py-4'}`}>
              <div className="space-y-4 flex-1 flex flex-col">
                {/* Lab/Office Selection */}
                <div className="flex-1 flex flex-col">
                  {(() => {
                    let chooseLabel = "Choose a Lab"
                    let addLabel = "Add New Lab"
                    if (isLabAdmin) {
                      chooseLabel = "Choose a Office"
                      addLabel = "Add New Office"
                    } else if (isOfficeAdmin) {
                      chooseLabel = "Choose a Lab"
                      addLabel = "Add New Lab"
                    }
                    return (
                      <div className="mb-6">
                        {/* Header with title */}
                        <div className="flex items-center justify-center mb-6">
                          <h3 className="text-2xl font-bold text-gray-900">
                            {chooseLabel}
                          </h3>
                        </div>

                        {/* Search Section */}
                        <div className="flex items-center gap-4 mb-2">
                          {/* Search bar in the middle - takes up most of the space */}
                          <div className="relative flex-1">
                            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder={isLabAdmin ? "Search Office" : "Search Dental Lab"}
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pr-10 py-2 bg-white border border-gray-300 rounded-lg w-full"
                            />
                          </div>

                          {/* Add Lab button on the right */}
                          <Button 
                            className="bg-[#1162a8] hover:bg-[#0f5490] text-white rounded-lg px-4 py-2 whitespace-nowrap"
                            onClick={() => setShowAddNewLabModal(true)}
                          >
                            + {addLabel}
                          </Button>
                        </div>

                    

                        {/* Sort By and Lab count row */}
                        <div className="flex items-center justify-between mb-4">
                          {/* Sort By on the left */}
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort By:</Label>
                            <Select value={sortBy} onValueChange={setSortBy}>
                              <SelectTrigger className="w-36 bg-white border border-gray-300 rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="name-az">Name A-Z</SelectItem>
                                <SelectItem value="name-za">Name Z-A</SelectItem>
                                <SelectItem value="location">Location</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Lab count on the right */}
                          <p className="text-sm text-gray-500">{filteredSelection.length} {isLabAdmin ? "offices" : "labs"} found</p>
                        </div>
                      </div>
                    )
                  })()}
                  {labsLoading ? (
                    <div className="flex-1 flex flex-col">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 p-1 content-start">
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white h-44 sm:h-48 flex flex-col items-center justify-center shadow-sm">
                          <div className="w-20 h-20 bg-gray-200 rounded-lg mb-4" />
                          <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
                          <div className="h-3 w-1/2 bg-gray-200 rounded" />
                        </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 p-1 content-start">
                      {sortedSelectionWithDefault.map((item) => {
                        const entity = isLabAdmin ? (item as ConnectedOffice).office : (item as ConnectedLab).lab
                        const logoSrc =
                          entity?.name === "HMC innovs LLC"
                            ? "/images/hmc2.png"
                            : "/images/office-default.png"
                        return (
                          <div key={entity?.id || 'unknown'} className="relative group">
                            <Card 
                              className={`transition-all duration-300 hover:shadow-lg rounded-lg border h-full cursor-pointer transform hover:scale-[1.02] group-hover:border-blue-600 group-hover:ring-2 group-hover:ring-blue-100 ${selectedLab === String(entity?.id)
                                ? 'border-blue-500 shadow-lg ring-2 ring-blue-200 scale-[1.02] bg-white'
                                : 'border-gray-200 hover:border-blue-600 bg-white hover:bg-blue-50/30'
                                }`}
                              onClick={() => handleLabSelect(String(entity?.id))}
                            >
                              <CardContent className="p-3 sm:p-4 text-center flex flex-col items-center h-50 sm:h-50">
                                <div className="mb-4">
                                  <img
                                    src={logoSrc}
                                    alt={entity?.name || 'Lab/Office Logo'}
                                    className="mx-auto rounded-lg transition-all duration-300 w-25 h-25 object-contain"
                                  />
                                </div>
                                <h4 className="font-semibold text-base mb-2 line-clamp-2 text-gray-900">{entity?.name || 'Unknown Name'}</h4>
                                <p className="text-sm text-gray-600">{entity?.city || 'Unknown City'}, {entity?.state || 'Unknown State'}</p>

                                <div className="mt-auto w-full">
                                  {/* Set Default Button Only */}
                                  <div className="flex justify-center">
                                    <button
                                      className={`text-xs font-medium py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg transition-all duration-200 border ${defaultLabId === String(entity?.id)
                                        ? 'bg-green-200 text-green-800 border-green-300 hover:bg-green-300'
                                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border-gray-300 hover:border-gray-400'
                                        }`}
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent card selection
                                        // Show default modal
                                        const item = selectionData.find((l: any) =>
                                          String(isLabAdmin ? (l as ConnectedOffice).office?.id : (l as ConnectedLab).lab?.id) === String(entity?.id)
                                        )
                                        let entityName = "Unknown";
                                        if (item) {
                                          if (isLabAdmin && (item as ConnectedOffice).office) {
                                            entityName = (item as ConnectedOffice).office.name;
                                          } else if (!isLabAdmin && (item as ConnectedLab).lab) {
                                            entityName = (item as ConnectedLab).lab.name;
                                          }
                                        }
                                        setPendingDefaultLab({ id: String(entity?.id), name: entityName })
                                        setShowDefaultLabModal(true)
                                      }}
                                    >
                                      {defaultLabId === String(entity?.id) ? 'Default' : 'Set Default'}
                                    </button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            
                            {/* Default indicator */}
                            {defaultLabId === String(entity?.id) && (
                              <div className="absolute top-2 right-2 z-10">
                                <div className="bg-green-500 rounded-full p-1 shadow-md">
                                  <Star className="w-4 h-4 text-white fill-white" />
                                </div>
                              </div>
                            )}
                            
                            {/* Selection indicator */}
                            {selectedLab === String(entity?.id) && (
                              <div className="absolute top-2 left-2 z-10">
                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Next Button for Step 1 */}
                {/* <div className="flex justify-end mt-6">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg font-semibold"
                    onClick={() => {
                      if (selectedLab) {
                        setStep(2)
                      }
                    }}
                    disabled={!selectedLab}
                  >
                    Next
                  </Button>
                </div> */}
              </div>
            </div>
          )}

          {step === 2 && !isFirstTimeSetup && (
            <div className="px-4 sm:px-6 lg:px-8 py-3 lg:py-4 bg-white flex-1 flex flex-col">
              <div className="flex items-center justify-center flex-1">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Complete Header Information
                  </h3>
                  <p className="text-gray-600">
                    {!addSlipFormData.doctor ? "Please select a doctor to continue" :
                      !addSlipFormData.lab ? "Please select a lab to continue" :
                        !addSlipFormData.patient ? "Please enter patient name to continue" :
                          "All set! Ready to select products"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Patient Name Input */}
          {step === 3 && (
            <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 bg-white flex items-center justify-center min-h-[40vh]">
              <div className="max-w-2xl w-full">
                <div className="space-y-4 sm:space-y-6">
                  {/* Patient Name Input Field - Text box with border */}
                  <div className="space-y-2">
                    <div className="flex-1 relative">
                      {/* Floating label that appears when input has value */}
                      {addSlipFormData.patient && (
                        <label
                          htmlFor="patient-input"
                          className={`absolute -top-2 left-2 sm:left-3 bg-white px-1 text-[10px] sm:text-xs transition-all max-w-[calc(100%-1rem)] sm:max-w-none ${
                            addSlipFormData.patient.trim().split(/\s+/).length >= 2 && addSlipFormData.patient.trim().split(/\s+/).every(word => word.length > 0) && addSlipFormData.patient.trim().split(/\s+/)[1].length >= 2
                              ? 'text-green-600'
                              : addSlipFormData.patient.trim().split(/\s+/).length === 1 && addSlipFormData.patient.trim().split(/\s+/)[0].length > 0
                              ? 'text-red-600'
                              : 'text-gray-500'
                          }`}
                        >
                          <span className="block sm:hidden">
                            {addSlipFormData.patient.trim().split(/\s+/).length >= 2 && addSlipFormData.patient.trim().split(/\s+/).every(word => word.length > 0) && addSlipFormData.patient.trim().split(/\s+/)[1].length >= 2
                              ? 'Press enter when done'
                              : addSlipFormData.patient.trim().split(/\s+/).length === 1 && addSlipFormData.patient.trim().split(/\s+/)[0].length > 0
                              ? "Enter last name"
                              : 'Enter patient full name'
                            }
                          </span>
                          <span className="hidden sm:block">
                            {addSlipFormData.patient.trim().split(/\s+/).length >= 2 && addSlipFormData.patient.trim().split(/\s+/).every(word => word.length > 0) && addSlipFormData.patient.trim().split(/\s+/)[1].length >= 2
                              ? 'Hit enter button after you are finished entering patient name'
                              : addSlipFormData.patient.trim().split(/\s+/).length === 1 && addSlipFormData.patient.trim().split(/\s+/)[0].length > 0
                              ? "Please enter patient's last name"
                              : 'Enter patient full name'
                            }
                          </span>
                        </label>
                      )}
                      <Input
                        ref={patientInputRef}
                        id="patient-input"
                        placeholder={addSlipFormData.patient ? "" : "Enter patient name"}
                        value={addSlipFormData.patient}
                        onChange={handlePatientChange}
                        onFocus={() => setIsPatientNameInputFocused(true)}
                        onBlur={() => setIsPatientNameInputFocused(false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && addSlipFormData.patient.trim().split(/\s+/).length >= 2 && addSlipFormData.patient.trim().split(/\s+/).every(word => word.length > 0) && addSlipFormData.patient.trim().split(/\s+/)[1].length >= 2) {
                            setStep(4)
                          }
                        }}
                        className={`text-base sm:text-lg py-2.5 sm:py-3 px-3 sm:px-4 border-2 rounded-md w-full transition-colors bg-white ${
                          addSlipFormData.patient.trim().split(/\s+/).length >= 2 && addSlipFormData.patient.trim().split(/\s+/).every(word => word.length > 0) && addSlipFormData.patient.trim().split(/\s+/)[1].length >= 2
                            ? 'border-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-100'
                            : addSlipFormData.patient.trim().split(/\s+/).length === 1 && addSlipFormData.patient.trim().split(/\s+/)[0].length > 0
                            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                            : 'border-gray-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-100'
                        }`}
                        style={{
                          boxShadow: "none"
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Next Button removed - using Enter key to proceed */}
              </div>
            </div>
          )}

          {/* Step 4: Product Categories Selection */}
          {step === 4 && (
            <div className="flex flex-col bg-white">
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row items-center px-3 sm:px-4 md:px-6 py-3 sm:py-2 gap-3 sm:gap-0">
                {/* Center label and text */}
                <div className="flex-1 flex flex-col items-center justify-center order-2 sm:order-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 text-center">
                    Let's start building your case
                  </h1>
                  <p className="text-xs sm:text-sm lg:text-base text-gray-600 text-center px-2">
                    Select a restoration type to begin or search directly by product name.
                  </p>
                </div>
                {/* Search box - Right side on desktop, top on mobile */}
                <div className="flex items-center flex-shrink-0 order-1 sm:order-2 w-full sm:w-auto sm:mr-4">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                    <Input
                      placeholder="Search Product"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pr-8 sm:pr-10 py-2 text-xs sm:text-sm bg-gray-50 border-gray-200 rounded-lg w-full"
                    />
                  </div>
                </div>
                {/* Invisible spacer for desktop layout balance */}
                <div className="hidden sm:block w-64" />
              </div>

              {/* Category Cards Section */}
              <div className="flex items-center justify-center px-3 sm:px-4 md:px-6 py-4">
                <LoadingOverlay
                  isLoading={allCategoriesLoading}
                  title="Loading Categories"
                  message="Please wait while we load available restoration types..."
                  zIndex={10000}
                />
                {!allCategoriesLoading && (
                  <div className="w-full max-w-6xl">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center flex-wrap">
                      {(() => {
                        // Desired order
                        const order = [
                          "Fixed Restoration",
                          "Removable Restoration",
                          "Orthodontics"
                        ];
                        // Filter and sort categories by desired order
                        const sortedCats = [...allCategories.filter((cat) => cat.status === "Active")].sort((a, b) => {
                          const aIdx = order.indexOf(a.name);
                          const bIdx = order.indexOf(b.name);
                          if (aIdx === -1 && bIdx === -1) return 0;
                          if (aIdx === -1) return 1;
                          if (bIdx === -1) return -1;
                          return aIdx - bIdx;
                        });
                        return sortedCats.map((cat) => (
                          <div
                            key={cat.id}
                            className="cursor-pointer flex flex-col items-center w-full sm:w-[227.3px] max-w-[280px] sm:max-w-none h-auto sm:h-[267.04px] min-h-[240px] sm:min-h-0"
                            style={{
                              boxSizing: 'border-box',
                              background: '#FFFFFF',
                              border: productCategory === cat.name 
                                ? '3px solid #1162A8' 
                                : '1px solid #B4B0B0',
                              borderRadius: '6px',
                              padding: '16px',
                              transition: 'all 0.3s ease',
                              boxShadow: productCategory === cat.name ? '0 4px 12px rgba(17, 98, 168, 0.2)' : 'none',
                            }}
                            onMouseEnter={(e) => {
                              if (productCategory !== cat.name) {
                                e.currentTarget.style.border = '3px solid #1162A8';
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(17, 98, 168, 0.15)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (productCategory !== cat.name) {
                                e.currentTarget.style.border = '1px solid #B4B0B0';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                              }
                            }}
                            onClick={(e) => {
                              if (showSpotlight) {
                                activateSpotlight(e.currentTarget as HTMLElement);
                              }
                              setProductCategory(cat.name);
                              // Fetch subcategories for the selected category
                              const customerId = typeof window !== "undefined" ? localStorage.getItem("customerId") : null
                              const customerIdNum = customerId ? Number(customerId) : undefined
                              fetchSubcategoriesByCategory(cat.id, "en", customerIdNum);
                              setStep(5);
                            }}
                          >
                            <div className="flex items-center justify-center mb-3">
                              <img
                                src={getCategoryImage(cat.name)}
                                alt={cat.name}
                                className="w-24 h-24 sm:w-32 md:w-40 sm:h-32 md:h-40 object-contain"
                              />
                            </div>
                            <h3 className="font-semibold text-sm sm:text-base md:text-xl text-center text-gray-900">{cat.name}</h3>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Subcategory Selection */}
          {step === 5 && (
            <div className="flex flex-col bg-white relative">
              {/* Header Section */}
              <div className="flex flex-col items-center px-4 sm:px-6 py-2 border-b border-gray-200">
                <div className="text-center mb-4">
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Let's start building your case</h1>
                  <p className="text-xs sm:text-sm lg:text-base text-gray-600">What type of product are you working on?</p>
                </div>
              
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full mb-4 gap-4">
                  {/* Showing Results Section - Left side */}
                  <div className="flex-shrink-0 w-full sm:w-auto">
                    <ShowingResultsSection
                      productCategory={productCategory}
                      selectedSubCategory={selectedSubCategory}
                      selectedProductInModal={selectedProductInModal}
                      sortedProducts={sortedProducts}
                      onCategoryClear={handleCategorySelectionChange}
                      onSubCategoryClear={() => {
                        setSelectedSubCategory("");
                        setSelectedSubCategoryId(null);
                        setAdvanceFilterState(prev => ({
                          ...prev,
                          subCategory: []
                        }));
                        setStep(5);
                      }}
                      onProductClear={() => setSelectedProductInModal(null)}
                    />
                  </div>
                  
                  {/* Search Section - Right side */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search Product"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pr-10 py-2 text-sm bg-gray-50 border-gray-200 rounded-lg w-full"
                    />
                  </div>
                </div>
              </div>
              {/* Subcategories Cards Section */}
              <div className="flex items-center justify-center px-3 sm:px-4 md:px-6 py-4">
                <LoadingOverlay
                  isLoading={subcategoriesLoading}
                  title="Loading Sub-Categories"
                  message="Please wait while we load available subcategories..."
                  zIndex={10000}
                />
                {!subcategoriesLoading && subcategoriesError ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <p className="text-red-600 mb-4">Error loading subcategories: {subcategoriesError}</p>
                      <button
                        onClick={() => {
                          const selectedCategory = allCategories.find(cat => cat.name === productCategory);
                          if (selectedCategory) {
                            const customerId = typeof window !== "undefined" ? localStorage.getItem("customerId") : null
                            const customerIdNum = customerId ? Number(customerId) : undefined
                            fetchSubcategoriesByCategory(selectedCategory.id, "en", customerIdNum);
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : subcategoriesByCategory.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <p className="text-gray-600 mb-4">No subcategories available for this category.</p>
                      <button
                        onClick={handleCategorySelectionChange}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Back to Categories
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-w-6xl">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center flex-wrap">
                      {subcategoriesByCategory.map((subcategory) => (
                        <div
                          key={subcategory.id}
                          className="cursor-pointer flex flex-col items-center w-full sm:w-[227.3px] max-w-[280px] sm:max-w-none h-auto sm:h-[267.04px] min-h-[240px] sm:min-h-0"
                          style={{
                            boxSizing: 'border-box',
                            background: '#FFFFFF',
                            border: selectedSubCategory === subcategory.sub_name 
                              ? '3px solid #1162A8' 
                              : '1px solid #B4B0B0',
                            borderRadius: '6px',
                            padding: '16px',
                            transition: 'all 0.3s ease',
                            boxShadow: selectedSubCategory === subcategory.sub_name 
                              ? '9px 7px 21.7px 0px #00000040' 
                              : 'none',
                          }}
                          onMouseEnter={(e) => {
                            if (selectedSubCategory !== subcategory.sub_name) {
                              e.currentTarget.style.border = '3px solid #1162A8';
                              e.currentTarget.style.transform = 'translateY(-4px)';
                              e.currentTarget.style.boxShadow = '9px 7px 21.7px 0px #00000040';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedSubCategory !== subcategory.sub_name) {
                              e.currentTarget.style.border = '1px solid #B4B0B0';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }
                          }}
                          onClick={(e) => {
                            if (showSpotlight) {
                              activateSpotlight(e.currentTarget as HTMLElement);
                            }
                            setSelectedSubCategory(subcategory.sub_name || null);
                            setSelectedSubCategoryId(subcategory.id);
                            setAdvanceFilterState(prev => ({
                              ...prev,
                              subCategory: subcategory.sub_name ? [subcategory.sub_name] : []
                            }));
                            setStep(6);
                          }}
                        >
                          <div className="flex items-center justify-center mb-3">
                            <img
                              src={getCategoryImage(subcategory.sub_name || "")}
                              alt={subcategory.sub_name || ""}
                              className="w-32 h-32 sm:w-[170.89px] sm:h-[170.89px] object-contain"
                            />
                          </div>
                          <h3 
                            className="text-sm sm:text-base text-center text-black"
                            style={{
                              fontFamily: 'Verdana',
                              fontStyle: 'normal',
                              fontWeight: 400,
                              lineHeight: '22px',
                              letterSpacing: '-0.02em',
                            }}
                          >
                            {subcategory.sub_name || ""}
                          </h3>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 6: Product Selection */}
          {step === 6 && (
            <div className="flex flex-col bg-white" style={{ minHeight: "75vh" }}>
              {/* Header Section */}
              <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-gray-200">
                <div className="text-center mb-4 sm:mb-6">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">Let's start building your case</h1>
                  <p className="text-sm sm:text-base md:text-lg text-gray-600">Choose a dental product to continue.</p>
                </div>

                {/* Controls Section */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="w-full sm:w-auto sm:flex-1">
                    <ShowingResultsSection
                      productCategory={productCategory}
                      selectedSubCategory={selectedSubCategory}
                      selectedProductInModal={selectedProductInModal}
                      sortedProducts={sortedProducts}
                      onCategoryClear={handleCategorySelectionChange}
                      onSubCategoryClear={() => {
                        setSelectedSubCategory("");
                        setSelectedSubCategoryId(null);
                        setAdvanceFilterState(prev => ({
                          ...prev,
                          subCategory: []
                        }));
                        setStep(5);
                      }}
                      onProductClear={() => setSelectedProductInModal(null)}
                    />
                  </div>

                  {/* Search and Sort Controls */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                    <button 
                      onClick={handleCategorySelectionChange}
                      className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                    >
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="hidden sm:inline">Change Selection</span>
                      <span className="sm:hidden">Change</span>
                    </button>

                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      <Input
                        placeholder="Search Product"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pl-8 sm:pl-10 pr-4 py-2 text-xs sm:text-sm bg-white border-gray-200 rounded-lg w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Cards Section */}
              <div className="flex-1 flex flex-col px-3 sm:px-4 md:px-6 py-4 relative">
                {/* Loading Overlay for Products */}
                <LoadingOverlay
                  isLoading={isLoadingProducts}
                  title="Loading Products"
                  message="Please wait while we load available products..."
                  zIndex={10000}
                />
                
                {/* Loading Overlay for Product Details */}
                <LoadingOverlay
                  isLoading={productDetailsLoading}
                  title="Loading Stages"
                  message="Please wait while we load available stages..."
                  zIndex={10000}
                />
                {!isLoadingProducts && !productDetailsLoading && (
                  <div className="w-full max-w-7xl mx-auto">
                    {sortedProducts.length === 0 ? (
                      <div className="flex justify-center items-center py-8">
                        <span className="text-lg text-gray-400">No products found</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 justify-items-center">
                        {sortedProducts.map((product: any) => (
                          <div
                            key={product.id}
                            className="cursor-pointer flex flex-col overflow-hidden relative w-full max-w-[307.65px] sm:w-[307.65px] h-auto sm:h-[335.71px] min-h-[300px] sm:min-h-0"
                            style={{
                              boxSizing: 'border-box',
                              background: '#FFFFFF',
                              borderRadius: '6px',
                              border: selectedProductInModal === String(product.id) ? '3px solid #1162A8' : '1px solid #B4B0B0',
                              transition: 'all 0.3s ease',
                              boxShadow: selectedProductInModal === String(product.id) ? '0 4px 12px rgba(17, 98, 168, 0.2)' : 'none',
                            }}
                            onMouseEnter={(e) => {
                              if (selectedProductInModal !== String(product.id)) {
                                e.currentTarget.style.border = '3px solid #1162A8';
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(17, 98, 168, 0.15)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (selectedProductInModal !== String(product.id)) {
                                e.currentTarget.style.border = '1px solid #B4B0B0';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                              }
                            }}
                            onClick={async (e) => {
                              if (showSpotlight) {
                                activateSpotlight(e.currentTarget as HTMLElement);
                              }

                            

                              setSelectedProductInModal(String(product.id))
                              setProductDetailsLoading(true)

                              // Fetch detailed product information from the library API
                                try {
                                  const productDetails = await debouncedFetchProductDetails(product.id, propSelectedLabId || undefined);

                                  // Debug: Log the full product object and API response to understand the structure
                                  console.log('🔍 Full product object:', product);
                                  console.log('🔍 Full productDetails from API:', productDetails);
                                  console.log('🔍 Product extractions:', productDetails?.extractions);
                                  console.log('🔍 ProductDetails.data.extractions:', productDetails?.extractions);
                                  console.log('🔍 ProductDetails.extractions:', productDetails?.extractions);

                                  if (productDetails) {
                                  // Store the detailed product data using Zustand store
                                  const { setSelectedProductDetails } = useSlipStore.getState();
                                  setSelectedProductDetails(productDetails);

                                  // Store extraction data in teeth selection store
                                  // First try to get extraction data from the product object itself
                                  if (productDetails?.extractions && Array.isArray(productDetails?.extractions)) {
                                    const { setProductExtractions } = useTeethSelectionStore.getState();
                                    setProductExtractions(product.id, {
                                      extractions: productDetails?.extractions,
                                      has_extraction: product.has_extraction || "Yes",
                                      extraction_options: product.extraction_options || []
                                    });
                                    console.log('🔍 Stored extraction data from product object for product:', product.id, productDetails?.extractions);
                                  } else if (productDetails?.extractions) {
                                    // Fallback to API response data
                                    console.log('🔍 ================================ for product:', product.id, productDetails?.extractions);
                                    const { setProductExtractions } = useTeethSelectionStore.getState();
                                    setProductExtractions(product.id, {
                                      extractions: productDetails.data.extractions,
                                      has_extraction: productDetails.data.has_extraction,
                                      extraction_options: productDetails.data.extraction_options || []
                                    });
                                    console.log('🔍 Stored extraction data from API response for product:', product.id, productDetails.data.extractions);
                                  } else if (productDetails?.extractions && Array.isArray(productDetails.extractions) && productDetails.extractions.length > 0) {
                                    // Try direct extractions property on productDetails
                                    // Only store if extractions array is not empty
                                    const { setProductExtractions } = useTeethSelectionStore.getState();
                                    setProductExtractions(product.id, {
                                      extractions: productDetails.extractions,
                                      has_extraction: productDetails.has_extraction || "Yes",
                                      extraction_options: productDetails.extraction_options || []
                                    });
                                    console.log('🔍 Stored extraction data from productDetails.extractions for product:', product.id, productDetails.extractions);
                                  } else {
                                    console.log('🔍 No extraction data found in product or productDetails:', {
                                      productExtractions: productDetails?.extractions,
                                      productDetailsDataExtractions: productDetails?.data?.extractions,
                                      productDetailsExtractions: productDetails?.extractions,
                                      fullProduct: product,
                                      fullProductDetails: productDetails
                                    });

                                    // Try to find extraction data from the base product ID (without timestamp)
                                    // The product ID format is like "4-1761560476372" where "4" is the base product ID
                                    const baseProductId = String(product.id).split('-')[0];
                                    const { getProductExtractions, setProductExtractions } = useTeethSelectionStore.getState();
                                    const baseExtractionData = getProductExtractions(baseProductId);

                                    if (baseExtractionData && baseExtractionData.extractions && baseExtractionData.extractions.length > 0) {
                                      console.log('🔧 Found extraction data from base product ID:', baseProductId, baseExtractionData);
                                      // Copy the extraction data to the new product ID
                                      setProductExtractions(product.id, baseExtractionData);
                                      console.log('✅ Copied extraction data from base product to new product:', product.id);
                                    } else {
                                      console.log('❌ No extraction data found even from base product ID:', baseProductId);
                                    }
                                  }
                                }
                              } catch (error) {
                                console.error('Error fetching product details:', error);
                              } finally {
                                setProductDetailsLoading(false)
                                // Go to step 7 (stage selection) after product is selected
                                setStep(7)
                              }
                            }}
                          >
                            {/* Product Image Section */}
                            <div
                              className="flex items-center justify-center w-full sm:w-[307.65px] h-[180px] sm:h-[205.1px]"
                              style={{
                                background: '#E2DFE1',
                                borderRadius: '6px 6px 0px 0px',
                              }}
                            >
                              <img
                                src={
                                  (product.image_url && product.image_url !== "/placeholder.svg" && product.image_url !== null)
                                    ? (product.image_url)
                                    : "/images/product-default.png"
                                }
                                alt={product.name}
                                className="w-[150px] h-[150px] sm:w-[205.1px] sm:h-[205.1px] object-contain"
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
                            <div
                              className="flex flex-col flex-1 bg-white"
                              style={{
                                padding: '17.8px',
                              }}
                            >
                              <h3
                                style={{
                                  fontFamily: 'Verdana',
                                  fontStyle: 'normal',
                                  fontWeight: 700,
                                  fontSize: '17px',
                                  lineHeight: '22px',
                                  letterSpacing: '-0.02em',
                                  color: '#000000',
                                  marginBottom: '13.47px',
                                }}
                              >
                                {product.name}
                              </h3>

                              <div className="space-y-1" style={{ marginBottom: '13.36px' }}>
                                {product.category_name && (
                                  <div
                                    style={{
                                      fontFamily: 'Verdana',
                                      fontStyle: 'normal',
                                      fontWeight: 400,
                                      fontSize: '12px',
                                      lineHeight: '22px',
                                      letterSpacing: '-0.02em',
                                      color: '#B4B0B0',
                                    }}
                                  >
                                    Category: {product.category_name}
                                  </div>
                                )}
                                {product.subcategory_name && (
                                  <div
                                    style={{
                                      fontFamily: 'Verdana',
                                      fontStyle: 'normal',
                                      fontWeight: 400,
                                      fontSize: '12px',
                                      lineHeight: '22px',
                                      letterSpacing: '-0.02em',
                                      color: '#B4B0B0',
                                    }}
                                  >
                                    Sub Category: {product.subcategory_name}
                                  </div>
                                )}
                              </div>

                              {/* Tags Section */}
                              <div className="flex flex-wrap gap-2 mt-auto">
                                <span
                                  style={{
                                    boxSizing: 'border-box',
                                    height: '18.53px',
                                    padding: '0 14.98px',
                                    background: '#AAE3F9',
                                    border: '1px solid #2ABBF2',
                                    borderRadius: '6px',
                                    fontFamily: 'Verdana',
                                    fontStyle: 'normal',
                                    fontWeight: 400,
                                    fontSize: '10px',
                                    lineHeight: '22px',
                                    textAlign: 'center',
                                    letterSpacing: '-0.02em',
                                    color: '#2ABBF2',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  {product.stage_type === "multiple" ? "Multi Stage" : "Single Stage"}
                                </span>
                                <span
                                  style={{
                                    boxSizing: 'border-box',
                                    height: '18.53px',
                                    padding: '0 13.71px',
                                    background: '#D9D9D9',
                                    border: '1px solid #929393',
                                    borderRadius: '6px',
                                    fontFamily: 'Verdana',
                                    fontStyle: 'normal',
                                    fontWeight: 400,
                                    fontSize: '10px',
                                    lineHeight: '22px',
                                    textAlign: 'center',
                                    letterSpacing: '-0.02em',
                                    color: '#929393',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  {product.daysToFinish ? `${product.daysToFinish} days to Finish` : "----"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 7: Stage Selection */}
          {step === 7 && (
            <div className="flex flex-col bg-white" style={{ minHeight: "75vh" }}>
              {/* Header Section */}
              <div className="flex flex-col items-center px-3 sm:px-4 md:px-6 py-4 sm:py-6 border-b border-gray-200">
                <div className="text-center mb-3 sm:mb-4">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Let's start building your case</h1>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600">Choose stages to continue.</p>
                </div>

              </div>

              {/* Breadcrumb */}
              <div className="px-3 sm:px-4 md:px-6 py-2 md:py-3 bg-gray-50 border-b">
                <div className="flex items-center gap-2 md:gap-3 min-w-0 overflow-x-auto">
                  {/* Back button - Left side */}
                  <button
                    onClick={() => {
                      // Go back to the appropriate step based on current state
                      if (selectedStages.length > 0) {
                        setSelectedStages([])
                        // Stay on step 7
                      } else if (selectedProductInModal) {
                        setSelectedProductInModal(null)
                        setStep(6)
                      } else if (selectedSubCategory) {
                        setSelectedSubCategory("")
                        setSelectedSubCategoryId(null)
                        setStep(5)
                      } else {
                        handleCategorySelectionChange()
                      }
                    }}
                    className="p-1.5 hover:bg-gray-200 rounded flex-shrink-0"
                    aria-label="Go back"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 15L1 8L8 1" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {/* Breadcrumb items - Using consistent ShowingResultsSection format */}
                  <ShowingResultsSection
                    productCategory={productCategory}
                    selectedSubCategory={selectedSubCategory}
                    selectedProductInModal={selectedProductInModal}
                    sortedProducts={sortedProducts}
                    onCategoryClear={handleCategorySelectionChange}
                    onSubCategoryClear={() => {
                      setSelectedSubCategory("");
                      setSelectedSubCategoryId(null);
                      setAdvanceFilterState(prev => ({
                        ...prev,
                        subCategory: []
                      }));
                      setStep(5)
                    }}
                    onProductClear={() => {
                      setSelectedProductInModal(null)
                      setStep(6)
                    }}
                  />
                </div>
              </div>

              {/* Stages Cards Section */}
              <div className="flex-1 flex items-center justify-center px-3 sm:px-4 md:px-6 py-4">
                {/* Loading overlay for stages */}
                <LoadingOverlay
                  isLoading={stagesLoading}
                  title="Loading Stages"
                  message="Please wait while we load available stages..."
                  zIndex={10000}
                />
                <div className="w-full max-w-6xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 justify-items-center">
                    {(() => {
                      return null
                    })()}
                    {stagesList.length > 0 ? stagesList.map((stage: any) => (
                        <div
                          key={stage.name || stage}
                          className={`cursor-pointer transition-all duration-200 w-full max-w-[227.3px] sm:w-[227.3px] h-auto sm:h-[267.04px] min-h-[240px] sm:min-h-0 ${selectedStages.includes(stage.id?.toString() || stage.name || stage) ? "border-blue-600 border-2 shadow-md" : ""}`}
                          style={{
                            boxSizing: 'border-box',
                            position: 'relative',
                            background: '#FFFFFF',
                            border: selectedStages.includes(stage.id?.toString() || stage.name || stage) ? '2px solid #2563EB' : '1px solid #B4B0B0',
                            borderRadius: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            padding: '0',
                            margin: '0 auto'
                          }}
                          onClick={(e) => {
                            if (showSpotlight) {
                              activateSpotlight(e.currentTarget as HTMLElement);
                            }
                            handleStageToggle(stage.id?.toString() || stage.name || stage)
                            // Automatically advance to arch modal when stage is selected
                            setTimeout(() => {
                              if (selectedProductInModal) {
                                setSelectedArch('') // Reset arch selection when opening modal
                                setShowArchModal(true)
                              } else {
                                console.error("Cannot show arch modal: no product selected")
                              }
                            }, 100)
                          }}
                        >
                          {/* Image Container */}
                          <div
                            className="relative w-[130px] h-[130px] sm:w-[170px] sm:h-[170px] mt-6 sm:mt-[37.64px] flex items-center justify-center overflow-hidden"
                          >
                            {/* Background Rectangle */}
                            <div
                              className="absolute w-full h-full bg-[#FBFCFD] rounded-md"
                              style={{ zIndex: 0 }}
                            />
                            {/* Image */}
                            <img
                              src={stage.image_url || "/images/stages-placeholder.png"}
                              alt={stage.name || stage}
                              className="relative w-[115px] sm:w-[152.5px] h-auto max-h-[180px] sm:max-h-[228.75px] object-contain rounded-md"
                              onError={(e) => {
                                // Fallback to placeholder if image fails to load
                                e.currentTarget.src = "/images/stages-placeholder.png"
                              }}
                            />
                          </div>
                          
                          {/* Stage Name Label */}
                          <h3
                            className="absolute w-[calc(100%-20px)] max-w-[200px] min-h-[22px] left-1/2 -translate-x-1/2 bottom-8 sm:bottom-[50px] text-xs sm:text-base text-center text-black px-1 pt-2 m-0 break-words"
                            style={{
                              fontFamily: "'Verdana', sans-serif",
                              fontStyle: 'normal',
                              fontWeight: 400,
                              lineHeight: '22px',
                              letterSpacing: '-0.02em',
                              whiteSpace: 'normal',
                              overflow: 'visible'
                            }}
                          >
                            {stage.name || stage}
                          </h3>
                          
                          {/* Show additional stage information if available */}
                          {(stage.price || stage.days !== undefined) && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '20px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                textAlign: 'center',
                                fontSize: '12px',
                                color: '#6B7280'
                              }}
                            >
                              {stage.price && (
                                <div style={{ fontWeight: 500, color: '#059669' }}>${stage.price}</div>
                              )}
                              {stage.days !== undefined && stage.days > 0 && (
                                <div>{stage.days} day{stage.days !== 1 ? 's' : ''}</div>
                              )}
                            </div>
                          )}
                          {selectedStages.includes(stage.id?.toString() || stage.name || stage) && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                zIndex: 10
                              }}
                            >
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  fontSize: '10px',
                                  background: '#DBEAFE',
                                  color: '#1E40AF',
                                  fontWeight: 500
                                }}
                              >
                                Selected
                              </span>
                            </div>
                          )}
                        </div>
                      )) : (
                        <div className="col-span-full text-center py-8">
                          <p className="text-gray-500">No stages available for this product.</p>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}


          {showArchModal && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-2 sm:p-4 overflow-y-auto">
              <div
                className="bg-white rounded-2xl shadow-2xl mx-auto p-3 sm:p-4 md:p-6 relative flex flex-col items-center my-4"
                style={{
                  maxWidth: "600px",
                  width: "40%",
                  minHeight: "fit-content",
                  maxHeight: "calc(100vh - 2rem)",
                }}
              >
                {/* Header */}
                <div className="relative text-center mb-4 sm:mb-6 w-full">
                  <button
                    onClick={() => setShowArchModal(false)}
                    className="absolute right-0 top-0 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close modal"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                  <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-gray-900 mb-1">Select Arch for treatment</h2>
                  {selectedArch && (
                    <p className="text-sm text-gray-500 mt-2">Press Enter to continue</p>
                  )}
                </div>

                {/* Combined Dental Arches Display - Main Focal Point */}
                <div className="flex flex-col items-center justify-center mb-3 sm:mb-4 md:mb-6 w-full">
                  {/* Dental Arches Container - Properly Aligned */}
                  <div className="flex flex-col items-center">
                    {/* Aligned Upper and Lower Arches Only */}
                    <div className="relative flex flex-col items-center">
                      {/* Upper Arch */}
                      <div
                        className={`flex justify-center items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg transition-all p-3 ${
                          selectedArch === 'upper' || selectedArch === 'both' ? 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50' : ''
                        }`}
                        onClick={() => { setSelectedArch('upper'); setGlobalArchType('upper') }}
                        tabIndex={0}
                        role="button"
                        aria-label="Select Upper Arch"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedArch('upper')
                            setGlobalArchType('upper')
                          }
                        }}
                      >
                        <div className="flex justify-center items-center w-32 h-24 sm:w-40 sm:h-32 md:w-48 md:h-36 lg:w-56 lg:h-42">
                          <img
                            src="/images/upper-arch.png"
                            alt="Upper Arch"
                            className="max-w-full max-h-full object-contain"
                            draggable={false}
                          />
                        </div>
                      </div>
                       {/* Both Arches Selection - Completely separate from arches */}
                  <div className="flex justify-center items-center w-full mt-4 mb-4 sm:mt-6">
                    <div
                      className={`w-32 h-8 sm:w-40 sm:h-10 md:w-48 md:h-12 flex items-center justify-center rounded-lg border-2 text-xs sm:text-sm md:text-base font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                        ${selectedArch === 'both' ? 'border-blue-600 bg-blue-600 text-white shadow-lg' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'}
                      `}
                      onClick={() => { setSelectedArch('both'); setGlobalArchType('both') }}
                      tabIndex={0}
                      role="button"
                      aria-pressed={selectedArch === 'both'}
                      aria-label="Select Both Arches"
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedArch('both');
                          setGlobalArchType('both')
                        }
                      }}
                    >
                      Both Arches
                    </div>
                  </div>
                        
                      {/* Lower Arch - Positioned to align with upper arch */}
                      <div
                        className={`flex justify-center items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg transition-all p-3 mt-1 sm:mt-2 ${
                          selectedArch === 'lower' || selectedArch === 'both' ? 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50' : ''
                        }`}
                        onClick={() => { setSelectedArch('lower'); setGlobalArchType('lower') }}
                        tabIndex={0}
                        role="button"
                        aria-label="Select Lower Arch"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedArch('lower')
                            setGlobalArchType('lower')
                          }
                        }}
                      >
                        <div className="flex justify-center items-center w-32 h-24 sm:w-40 sm:h-32 md:w-48 md:h-36 lg:w-56 lg:h-42 ml-2 sm:ml-3 md:ml-4">
                          <img
                            src="/images/lower-arch.png"
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
                <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-3 md:gap-4 mt-3 sm:mt-4 md:mt-6 w-full">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowArchModal(false)
                      setStep(6) // Go back to product selection (step 6)
                    }}
                    className="w-full sm:w-auto px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 border-gray-300 text-gray-700 hover:bg-gray-50 min-w-[120px] sm:min-w-[140px] text-xs sm:text-sm rounded-lg"
                  >
                    Change Product
                  </Button>
                  <Button
                    className={`w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 min-w-[120px] sm:min-w-[140px] text-xs sm:text-sm transition-all rounded-lg ${
                      selectedArch && (selectedArch === 'upper' || selectedArch === 'lower' || selectedArch === 'both')
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-600/60 text-white cursor-not-allowed'
                    }`}
                    onClick={() => {
                      if (selectedArch) {
                        handleArchContinue()
                      }
                    }}
                    disabled={isCompleting || !selectedArch}
                  >
                    {isCompleting ? "Creating Slip..." : "Next"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {showDeliveryDateModal && (
            <DeliveryDateModal
              open={showDeliveryDateModal}
              onOpenChange={setShowDeliveryDateModal}
              patientName={addSlipFormData.patient}
              caseStage="Try in with teeth"
              pickupDate={addSlipFormData.pickupDate}
              deliveryDate={addSlipFormData.deliveryDate}
              deliveryTime={addSlipFormData.deliveryTime}
              isRush={true}
              onSave={handleSaveDeliveryDate}
            />
          )}

          {showOnboarding && <AddSlipOnboarding onDismiss={handleDismissOnboarding} showInitially={showOnboarding} />}

          {/* Default Lab Confirmation Modal */}
          {showDefaultLabModal && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6 relative">
                {/* Lab/Office Info */}
                <div className="text-center mb-6">
                  {(() => {
                    const entity = isLabAdmin
                      ? (selectionData.find((l: any) => String((l as ConnectedOffice).office?.id) === pendingDefaultLab?.id) as ConnectedOffice)?.office
                      : (selectionData.find((l: any) => String((l as ConnectedLab).lab?.id) === pendingDefaultLab?.id) as ConnectedLab)?.lab

                    const logoSrc = entity?.logo_url && entity.logo_url !== "/placeholder.svg"
                      ? entity.logo_url
                      : isLabAdmin
                        ? "/images/office-default.png"
                        : "/images/office-default.png"

                    return (
                      <>
                        <img
                          src={logoSrc}
                          alt={entity?.name || pendingDefaultLab?.name}
                          className="w-16 h-16 mx-auto rounded-lg object-contain border bg-gray-100 shadow-sm mb-4"
                        />
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {entity?.name || pendingDefaultLab?.name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                          {entity?.city && entity?.state ? `${entity.city}, ${entity.state}` : ''}
                        </p>
                      </>
                    )
                  })()}
                </div>

                {/* Checkbox with text */}
                <div className="flex items-start gap-3 mb-6">
                  <div className="w-5 h-5 bg-[#1162a8] rounded flex items-center justify-center mt-0.5 flex-shrink-0">
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 2L4.5 8L2 5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-base font-medium text-gray-900 leading-tight">
                      Make this my default {isLabAdmin ? "office" : "lab"} for future slip.
                      <div className="w-4 h-4 text-gray-400 mt-1 ml-2 inline-block relative group">
                        <svg viewBox="0 0 16 16" fill="currentColor">
                          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1" fill="none" />
                          <text x="8" y="11" textAnchor="middle" fontSize="10" fill="currentColor">?</text>
                        </svg>
                        <div className="absolute left-1/2 -translate-x-1/2 top-7 z-20 bg-gray-900 text-white text-xs rounded px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap">
                          This will set your default {isLabAdmin ? "office" : "lab"} for future slips.
                        </div>
                      </div>
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleCancelDefaultLab}
                    className="flex-1 px-4 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmDefaultLab}
                    className="flex-1 px-4 py-2 bg-[#1162a8] hover:bg-[#0f5490] text-white rounded-lg"
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer - Fixed at bottom, outside scroll area */}
        <div className="border-t bg-white flex-shrink-0 p-2 md:p-3 rounded-b-lg fixed sm:relative bottom-0 left-0 right-0 z-50 sm:z-auto">
          <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2 md:gap-3">
            {/* Left side - Empty for now, Back button moved to right side */}
            <div className="flex">
              {/* Back button moved to right side for better UX */}
            </div>

            {/* Right side - Cancel/Back and Next buttons */}
            <div className="flex gap-2 md:gap-3">
              {step === 1 ? (
                <Button
                  onClick={() => setShowCancelSubmissionWarningModal(true)}
                  className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white px-4 md:px-6 h-10 text-sm rounded-lg font-semibold"
                >
                  Cancel
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleBackModal}
                  className="flex-1 sm:flex-none px-4 md:px-6 h-10 text-sm rounded-lg"
                >
                  Back
                </Button>
              )}
              {!(step === 3 && (!addSlipFormData.patient?.trim() || addSlipFormData.patient.trim().split(/\s+/).length < 2 || addSlipFormData.patient.trim().split(/\s+/).length === 2 && addSlipFormData.patient.trim().split(/\s+/)[1].length < 2)) && (
                <Button
                  onClick={handleContinueModal}
                  disabled={
                    (step === 1 && !selectedDoctorId) ||
                    (step === 2 && !selectedLab) ||
                    (step === 3 && (!addSlipFormData.patient?.trim() || addSlipFormData.patient.trim().split(/\s+/).length < 2 || addSlipFormData.patient.trim().split(/\s+/).length === 2 && addSlipFormData.patient.trim().split(/\s+/)[1].length < 2)) ||
                    (step === 4 && !productCategory) ||
                    (step === 5 && !selectedSubCategory) ||
                    (step === 6 && !selectedProductInModal) ||
                    (step === 7 && selectedStages.length === 0)
                  }
                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 md:px-8 h-10 text-sm rounded-lg font-semibold"
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
      {/* Cancel Slip Creation Modal - always render at root for overlay */}
      {showCancelSubmissionWarningModal && (
        <CancelSlipCreationModal
          open={showCancelSubmissionWarningModal}
          onCancel={() => setShowCancelSubmissionWarningModal(false)}
          onConfirm={() => {
            setShowCancelSubmissionWarningModal(false)
            effectiveSetShowAddSlipModal(false)
            // Use setTimeout to avoid blocking the modal close animation
            setTimeout(() => {
              if (isModal && onClose) {
                onClose()
              } else {
                router.replace("/dashboard")
              }
            }, 100)
          }}
        />
      )}

      {/* Loading Overlay */}
      <LoadingOverlay
        isLoading={isCompleting}
        title="Preparing Your Slip"
        message="Please wait while we prepare your case design..."
        zIndex={10000}
      />

      {/* Focused Spotlight Overlay */}
      <FocusedSpotlight
        isActive={isSpotlightActive && showSpotlight}
        targetElement={targetElement}
        onClose={deactivateSpotlight}
      />

      {/* Add New Lab Modal */}
      <AddNewLabModal
        open={showAddNewLabModal}
        onOpenChange={setShowAddNewLabModal}
        onLabSelect={handleNewLabSelect}
        onInviteLab={handleInviteLab}
      />

      {/* Add Doctor Modal */}
      <AddDoctorModal
        isOpen={showAddDoctorModal}
        onClose={() => setShowAddDoctorModal(false)}
        onDoctorConnect={(doctorId: string) => {
          // Handle doctor connection
          setShowAddDoctorModal(false)
        }}
      />
    </div>
  )
}

export default function DentalSlipPage(props: any) {
  const {
    showAddSlipModal,
    setShowAddSlipModal,
    shouldRefetchLabProducts,
    hideSlipHeader,
    isModal,
    ...rest
  } = props

  // For modal mode, always show content; for regular page mode, check showAddSlipModal
  if (!isModal && !showAddSlipModal) return null

  return (
    <SlipCreationProvider>
      <StagesProvider>
        <GradesProvider>
          <DentalSlipPageContent
            showAddSlipModal={showAddSlipModal}
            setShowAddSlipModal={setShowAddSlipModal}
            shouldRefetchLabProducts={shouldRefetchLabProducts}
            hideSlipHeader={hideSlipHeader}
            isModal={isModal}
            {...rest}
          />
        </GradesProvider>
      </StagesProvider>
    </SlipCreationProvider>
  )
}