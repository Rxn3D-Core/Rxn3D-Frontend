"use client"

import React, { useState, useMemo, useEffect, useCallback, Dispatch, SetStateAction, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { FileText, X, Search, Calendar, Clock, Star, Zap, Filter, Info, Lightbulb, RefreshCw, Edit } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
  import { DeliveryDateModal } from "@/components/delivery-date-modal"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { useSlipCreation, SlipCreationProvider, ConnectedOffice, ConnectedLab } from "@/contexts/slip-creation-context"
import { useSlipStore } from "@/stores/slipStore"
import { AddSlipOnboarding } from "@/components/add-slip-onboarding"
import { useProductCategory } from "@/contexts/product-category-context"
import { useStages, StagesProvider } from "@/contexts/product-stages-context"
import { useGrades, GradesProvider } from "@/contexts/product-grades-context"
import { debounce } from "@/lib/performance-optimizations"
import CancelSlipCreationModal from "@/components/cancel-slip-creation-modal"
import FocusedSpotlight from "@/components/focused-spotlight"
import { useFocusedSpotlight } from "@/hooks/use-focused-spotlight"
import { Eye, EyeOff } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AddNewLabModal } from "@/components/add-new-lab-modal"
import { AddDoctorModal } from "@/components/add-doctor-modal"
import LoadingOverlay from "@/components/ui/loading-overlay"
import { useArchSelectionStore } from "@/stores/arch-selection-store"
import { CustomerLogo } from "@/components/customer-logo"

// Dynamic imports for step components
import { DynamicSteps } from './dynamic-steps'

// Custom hooks
import { useDentalSlipForm } from '@/hooks/use-dental-slip-form'
import { useDentalSlipNavigation } from '@/hooks/use-dental-slip-navigation'

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

// Define interfaces
interface ProductConfiguration {
  restoration: string
  productName: string
  grade: string
  stage: string
  teethShadePart1: string
  gumShadePart1: string
  gumShadePart2: string
  impression: string
}

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
  category_name?: string
  subcategory_name?: string
  category_id?: number
  subcategory_id?: number
  grades?: Array<{ id: number; name: string; code?: string; status?: string }>
  stages?: Array<{ id: number; name: string; code?: string; status?: string }>
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

interface Lab {
  id: string
  name: string
  location: string
  logo: string
  isConnected?: boolean
}

// Main optimized component
export function OptimizedDentalSlipPageContent({
  slipData,
  setSlipData,
  showAddSlipModal,
  setShowAddSlipModal,
  addSlipModalInitialStep,
  setAddSlipModalInitialStep,
  visible,
  hideBackButton = false,
  onAddSlipComplete,
  shouldRefetchLabProducts = false,
  hideSlipHeader = false,
  isModal = false,
  onClose,
  selectedLabId: propSelectedLabId,
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
  shouldRefetchLabProducts?: boolean
  hideSlipHeader?: boolean
  isModal?: boolean
  onClose?: () => void
  selectedLabId?: number | null
}) {
  // Initialize modal-specific state when used as modal
  const [modalSlipData, setModalSlipData] = useState<any>({})
  const [modalShowAddSlipModal, setModalShowAddSlipModal] = useState(true)
  const [modalAddSlipModalInitialStep, setModalAddSlipModalInitialStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1)

  // Use provided props or fallback to modal-specific state
  const effectiveSlipData = isModal ? { ...slipData, ...modalSlipData } : slipData
  const effectiveSetSlipData = isModal ? setSlipData : setSlipData
  const effectiveShowAddSlipModal = isModal ? modalShowAddSlipModal : (showAddSlipModal ?? false)
  const effectiveSetShowAddSlipModal = isModal ? setModalShowAddSlipModal : (setShowAddSlipModal ?? (() => { }))
  const effectiveAddSlipModalInitialStep = isModal ? modalAddSlipModalInitialStep : (addSlipModalInitialStep ?? 1)
  const effectiveSetAddSlipModalInitialStep = isModal ? setModalAddSlipModalInitialStep : (setAddSlipModalInitialStep ?? (() => { }))
  const effectiveVisible = isModal ? true : (visible ?? false)

  // Custom hooks
  const {
    addSlipFormData,
    setAddSlipFormData,
    defaultLabId,
    setDefaultLabId,
    isFirstTimeSetup,
    setIsFirstTimeSetup,
    resetAddSlipForm,
    handlePatientChange,
    handleInlinePatientChange,
  } = useDentalSlipForm(isModal)

  const {
    step,
    setStep,
    handleContinueModal,
    handleBackModal,
  } = useDentalSlipNavigation(effectiveAddSlipModalInitialStep)

  // State management
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([4, 5, 6, 13, 26, 27, 28])
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [allNotes, setAllNotes] = useState<Note[]>([])
  const [showSTLViewer, setShowSTLViewer] = useState(false)
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

  // AddSlipModal states and functions
  const [selectedLab, setSelectedLab] = useState<string>("")
  const [selectedDoctor, setSelectedDoctor] = useState<string>("")
  const [showDefaultLabModal, setShowDefaultLabModal] = useState(false)
  const [pendingDefaultLab, setPendingDefaultLab] = useState<{ id: string, name: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name-az")
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
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null)
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null)
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null)
  const [isInlineEditingPatient, setIsInlineEditingPatient] = useState(false)
  
  // Additional state for new steps
  const [sortedProducts, setSortedProducts] = useState<any[]>([])

  // Context hooks
  const { connectedLabs, connectedOffices, fetchConnectedLabs, fetchConnectedOffices, labProducts: rawLabProducts, fetchLabProducts, officeDoctors, officeDoctorsLoading, fetchOfficeDoctors, fetchProductDetails } = useSlipCreation()
  const { stages, fetchStages, isLoading: stagesLoading } = useStages()
  const { grades, fetchGrades, isLoading: gradesLoading } = useGrades()
  const {
    allCategories,
    allCategoriesLoading,
    fetchAllCategories,
    subcategoriesByCategory: subcategoriesData,
    subcategoriesLoading,
    subcategoriesError,
    fetchSubcategoriesByCategory,
  } = useProductCategory()

  // Memoized stages list for step 7
  const stagesList = useMemo(() => {
    const selectedProduct = sortedProducts.find((p: any) => String(p.id) === selectedProductInModal)
    const detailedProductData = effectiveSlipData?.selectedProductDetails?.data || effectiveSlipData?.selectedProductDetails

    let stagesList: any[] = []

    // Priority 1: Use stages from the selected product in sortedProducts
    if (selectedProduct?.stages && Array.isArray(selectedProduct.stages) && selectedProduct.stages.length > 0) {
      stagesList = selectedProduct.stages.map((stage: any) => ({
        id: stage.id || stage.stage_id,
        name: stage.name,
        code: stage.code,
        image_url: stage.image_url || null,
        status: stage.status,
        sequence: stage.sequence,
        price: stage.price,
        days: stage.days,
        is_releasing_stage: stage.is_releasing_stage,
        grade_pricing: stage.grade_pricing,
        stage_configurations: stage.stage_configurations
      }))
    }
    // Priority 2: Use stages from detailed product data
    else if (detailedProductData?.stages && Array.isArray(detailedProductData.stages) && detailedProductData.stages.length > 0) {
      stagesList = detailedProductData.stages.map((stage: any) => ({
        id: stage.id || stage.stage_id,
        name: stage.name,
        code: stage.code,
        image_url: stage.image_url || null,
        status: stage.status,
        sequence: stage.sequence,
        price: stage.price,
        days: stage.days,
        is_releasing_stage: stage.is_releasing_stage,
        grade_pricing: stage.grade_pricing,
        stage_configurations: stage.stage_configurations
      }))
    }
    // Priority 3: Fallback to stages context
    else if (stages && stages.length > 0) {
      stagesList = stages
        .filter(stage => stage.status === "Active")
        .sort((a, b) => a.sequence - b.sequence)
    }
    // Priority 4: Default stages
    else {
      stagesList = [
        { id: 1, name: "Try in with teeth", code: "TRY_TEETH", image_url: null, status: "Active" },
        { id: 2, name: "Try in without teeth", code: "TRY_NO_TEETH", image_url: null, status: "Active" },
        { id: 3, name: "Final delivery", code: "FINAL", image_url: null, status: "Active" },
        { id: 4, name: "Wax try-in", code: "WAX", image_url: null, status: "Active" },
        { id: 5, name: "Framework try-in", code: "FRAMEWORK", image_url: null, status: "Active" },
        { id: 6, name: "Bisque try-in", code: "BISQUE", image_url: null, status: "Active" }
      ]
    }

    return stagesList
  }, [sortedProducts, selectedProductInModal, stages, effectiveSlipData])

  // Spotlight functionality
  const [showSpotlight, setShowSpotlight] = useState(false)
  const {
    isSpotlightActive,
    targetElement,
    activateSpotlight,
    deactivateSpotlight
  } = useFocusedSpotlight()

  // Refs
  const patientInputRef = useRef<HTMLInputElement>(null)
  const inlinePatientInputRef = useRef<HTMLInputElement>(null)
  const isFetchingProductsRef = useRef(false)

  // Memoized values
  const labProducts = useMemo(() => {
    if (rawLabProducts && Array.isArray(rawLabProducts) && rawLabProducts.length > 0) {
      return rawLabProducts
    }
    return []
  }, [rawLabProducts, forceProductsRefresh])

  const isLoadingProducts = labProductsLoading

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

  // Fetch connected labs/offices on component mount
  useEffect(() => {
    setLabsLoading(true)
    if (isLabAdmin) {
      fetchConnectedOffices().finally(() => setLabsLoading(false))
    } else {
      fetchConnectedLabs().finally(() => setLabsLoading(false))
    }
  }, [isLabAdmin, fetchConnectedOffices, fetchConnectedLabs])

  // Fetch categories when step 4 is reached
  useEffect(() => {
    if (step === 4) {
      fetchAllCategories("en")
    }
  }, [step, fetchAllCategories])

  // Use correct data for selection
  const selectionData = isLabAdmin ? (connectedOffices || []) : (connectedLabs || [])
  
  // Debug logging
  console.log('OptimizedDentalSlipPageContent Debug:', {
    isLabAdmin,
    connectedLabs: connectedLabs?.length || 0,
    connectedOffices: connectedOffices?.length || 0,
    selectionData: selectionData.length,
    officeDoctors: officeDoctors?.length || 0,
    officeDoctorsLoading,
    allCategories: allCategories?.length || 0,
    allCategoriesLoading,
    step
  })

  // Auto-select doctor if only one is available and advance to step 3
  useEffect(() => {
    if (officeDoctors && officeDoctors.length === 1 && !addSlipFormData.doctor && addSlipFormData.lab && step === 2) {
      const singleDoctor = officeDoctors[0];
      const doctorName = singleDoctor.full_name || `${singleDoctor.first_name || ""} ${singleDoctor.last_name || ""}`.trim() || "Unknown Doctor";
      const doctorId = String(singleDoctor.id);

      setAddSlipFormData((prev) => ({
        ...prev,
        doctor: doctorName,
        doctor_id: doctorId,
      }));

      setDoctorDropdownOpen(false);
      
      // Auto-advance to step 3 (patient name entry) when only one doctor is available
      setStep(3);
    }
  }, [officeDoctors, addSlipFormData.doctor, addSlipFormData.lab, step])

  // Auto-select current user as doctor if role is "doctor" and advance to step 3
  useEffect(() => {
    if (step === 2 && !addSlipFormData.doctor && addSlipFormData.lab) {
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
            
            // Auto-advance to step 3 (patient name entry) when user is a doctor
            setStep(3);
          } catch (error) {
            console.error("Error parsing user data:", error);
          }
        }
      }
    }
  }, [step, addSlipFormData.doctor, addSlipFormData.lab])

  // Filtering and sorting for labs/offices
  const filteredSelection = selectionData.filter((item: ConnectedOffice | ConnectedLab) => {
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

  const router = useRouter()

  // Handlers
  const handleLabSelect = useCallback((labId: string) => {
    const item = selectionData.find((l: any) =>
      String(isLabAdmin ? l.office?.id : l.lab?.id) === labId
    )

    setSelectedLab(labId)
    setSelectedLabId(labId)
    if (item) {
      let labName = "";
      let labIdVal = "";
      let officeIdVal = undefined;
      let officeName = "";
      
      const role = typeof window !== "undefined" ? localStorage.getItem("role") : null
      
      if (isLabAdmin && (item as ConnectedOffice).office) {
        labName = (item as ConnectedOffice).office.name;
        labIdVal = String((item as ConnectedOffice).office.id);
        officeIdVal = String((item as ConnectedOffice).office.id);
        officeName = (item as ConnectedOffice).office.name;
      } else if (!isLabAdmin && (item as ConnectedLab).lab) {
        labName = (item as ConnectedLab).lab.name;
        labIdVal = String((item as ConnectedLab).lab.id);
        
        if (role === "office_admin") {
          const customerId = typeof window !== "undefined" ? localStorage.getItem("customerId") : null
          if (customerId) {
            officeIdVal = customerId
            officeName = "Office"
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
      if (isLabAdmin && (item as ConnectedOffice).office) setSelectedOfficeId(String((item as ConnectedOffice).office.id))
      
      if (role === "office_admin" && typeof window !== "undefined") {
        localStorage.setItem("selectedLabId", labIdVal)
      }
      
      if (step === 1) {
        setStep(2)
      }
      
      // Fetch doctors for the selected lab/office
      if (officeIdVal) {
        fetchOfficeDoctors(parseInt(officeIdVal))
    }
    }
  }, [selectionData, isLabAdmin, step, setStep, setAddSlipFormData, fetchOfficeDoctors])

  const handleCategorySelectionChange = useCallback(() => {
    setProductCategory("all")
    setSelectedSubCategory(null)
    setSelectedSubCategoryId(null)
    setSelectedProductInModal(null)
    
    setAdvanceFilterState(prev => ({
      ...prev,
      category: [],
      subCategory: []
    }))
    
    setStep(4)
  }, [setStep])

  const handleConfirmDefaultLab = useCallback(() => {
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

        setStep(2) // Move to next step after confirming default lab
      }
    }
  }, [pendingDefaultLab, isFirstTimeSetup, selectionData, isLabAdmin, setAddSlipFormData, setStep])

  const handleCancelDefaultLab = useCallback(() => {
    // Just close the modal and stay on lab selection step
    setShowDefaultLabModal(false)
    setPendingDefaultLab(null)
    setIsFirstTimeSetup(true) // Allow user to proceed without setting as default
  }, [])

  // Additional handlers for new steps
  const handleStageToggle = useCallback((stage: string) => {
    setSelectedStages([stage]) // Only select one stage at a time
  }, [])

  const handleArchContinue = useCallback(async () => {
    setIsCompleting(true)
    try {
      setShowArchModal(false)
      
      // Validate required fields
      if (!addSlipFormData.patient?.trim()) {
        console.error("Patient name is required for the case.")
        alert("Patient name is required for the case.")
        setIsCompleting(false)
        return
      }
      
      if (!addSlipFormData.doctor?.trim()) {
        console.error("Doctor is required for the case.")
        alert("Doctor is required for the case.")
        setIsCompleting(false)
        return
      }
      
      if (!addSlipFormData.lab?.trim()) {
        console.error("Lab/Office is required for the case.")
        alert("Lab/Office is required for the case.")
        setIsCompleting(false)
        return
      }
      
      const selectedProductData = sortedProducts.find((p: any) => String(p.id) === selectedProductInModal)
      
      if (!selectedProductData) {
        console.error("No product selected or product not found")
        setIsCompleting(false)
        return
      }
      
      const data = {
        ...addSlipFormData,
        doctor_id: addSlipFormData.doctor_id,
        selectedProduct: selectedProductData,
        selectedArch,
        selectedStages,
      }
      
      // Call the parent callback to handle modal closing and data processing
      if (onAddSlipComplete) {
        onAddSlipComplete(data)
      }
      
      // Only close modal if not in modal mode
      if (!isModal && setShowAddSlipModal) {
        setShowAddSlipModal(false)
      }
      
      setIsCompleting(false)

      // Store the slip data with a flag to show teeth shade modal
      const slipDataWithTeethShadeFlag = {
        ...data,
        selectedProductId: selectedProductData?.id || null,
        shouldShowTeethShadeModal: selectedArch === "both",
        selectedArch: selectedArch || undefined,
        patient_name: data.patient,
      }

      useSlipStore.getState().setSlipData(slipDataWithTeethShadeFlag)

      // Only navigate if there's no parent callback to handle it
      // (standalone page will handle navigation via onAddSlipComplete)
      if (!onAddSlipComplete) {
        router.push("/case-design")
      }
      
    } catch (error) {
      console.error("Error completing slip creation:", error)
      setIsCompleting(false)
    }
  }, [addSlipFormData, selectedProductInModal, selectedArch, selectedStages, sortedProducts, onAddSlipComplete, isModal, setShowAddSlipModal, router])

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

  // Render step components
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <DynamicSteps.Step1LabSelection
            isLabAdmin={isLabAdmin}
            isOfficeAdmin={isOfficeAdmin}
            selectionData={selectionData}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            sortBy={sortBy}
            setSortBy={setSortBy}
            selectedLab={selectedLab}
            defaultLabId={defaultLabId}
            labsLoading={labsLoading}
            filteredSelection={filteredSelection}
            sortedSelectionWithDefault={sortedSelectionWithDefault}
            handleLabSelect={handleLabSelect}
            setShowAddNewLabModal={setShowAddNewLabModal}
            setPendingDefaultLab={setPendingDefaultLab}
            setShowDefaultLabModal={setShowDefaultLabModal}
          />
        )
      case 2:
        return (
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
                          setAddSlipFormData((prev) => ({
                            ...prev,
                            doctor: doctorName,
                            doctor_id: String(doctor.id),
                          }));
                          setSelectedDoctor(String(doctor.id));
                          // Automatically proceed to next step (patient name input)
                          setStep(3);
                        }}
                      >
                        {/* Profile Image */}
                        <div className="relative mb-3">
                          <div className={`w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center transition-all duration-200 group-hover:border-4 group-hover:border-blue-500 group-hover:shadow-lg ${isSelected ? 'border-4 border-blue-500' : 'border-2 border-gray-200'
                            }`}>
                            <img
                              src="/images/doctor-image.png"
                              alt="Default Doctor"
                              className="w-full h-full object-cover"
                            />
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
                            setAddSlipFormData((prev) => ({
                              ...prev,
                              doctor: doctorName,
                              doctor_id: String(doctor.id),
                            }));
                            setSelectedDoctor(String(doctor.id));
                            setStep(3);
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
                  <p className="text-gray-500">No doctors found for the selected lab/office.</p>
                </div>
              )}
            </div>
          </div>
        )
      case 3:
        return (
          <div className="px-4 sm:px-6 lg:px-8 py-3 bg-white">
            <div className="space-y-4">
              {/* Patient Input Header */}
              <div className="mb-6">
                <div className="flex items-center justify-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">
                    Enter Patient Name
                  </h3>
                </div>
                <p className="text-center text-gray-600 mb-8">
                  Please enter the patient's name to continue
                </p>
              </div>

              {/* Patient Name Input with Floating Label */}
              <div className="flex justify-center">
                <div className="relative w-full max-w-md">
                  <Input
                    ref={patientInputRef}
                    type="text"
                    value={addSlipFormData.patient || ""}
                    onChange={handlePatientChange}
                    onFocus={() => setIsPatientNameInputFocused(true)}
                    onBlur={() => setIsPatientNameInputFocused(false)}
                    className={`w-full px-4 py-3 text-lg border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      addSlipFormData.patient && addSlipFormData.patient.trim().length > 0
                        ? 'border-green-500 bg-green-50'
                        : isPatientNameInputFocused
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-orange-400 bg-orange-50'
                    }`}
                    placeholder=" "
                  />
                  <label
                    className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      isPatientNameInputFocused || (addSlipFormData.patient && addSlipFormData.patient.trim().length > 0)
                        ? 'top-1 text-sm text-blue-600 font-medium'
                        : 'top-1/2 -translate-y-1/2 text-lg text-gray-500'
                    }`}
                  >
                    Patient Name
                  </label>
                  
                  {/* Validation Tooltip */}
                  {!addSlipFormData.patient || addSlipFormData.patient.trim().length === 0 ? (
                    <div className="absolute -bottom-8 left-0 right-0 flex justify-center">
                      <div className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-md">
                        Please enter patient name and press Enter to continue
                      </div>
                    </div>
                  ) : (
                    <div className="absolute -bottom-8 left-0 right-0 flex justify-center">
                      <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-md">
                        ✓ Patient name entered successfully
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Continue Button */}
              <div className="flex justify-center mt-12">
                <Button
                  onClick={() => setStep(4)}
                  disabled={!addSlipFormData.patient || addSlipFormData.patient.trim().length === 0}
                  className={`px-8 py-3 text-lg font-medium rounded-lg transition-all duration-200 ${
                    addSlipFormData.patient && addSlipFormData.patient.trim().length > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Continue to Categories
                </Button>
              </div>
            </div>
          </div>
        )
      case 4:
        return (
          <div className="flex flex-col bg-white relative">
            {/* Header Section */}
            <div className="flex flex-col items-center px-4 sm:px-6 py-2 border-b border-gray-200">
              <div className="text-center mb-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Let's start building your case</h1>
                <p className="text-xs sm:text-sm lg:text-base text-gray-600">What type of product are you working on?</p>
              </div>
              
              {/* Search Section */}
              <div className="relative w-64">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search Categories"
                  className="pr-10 py-2 text-sm bg-gray-50 border-gray-200 rounded-lg w-full"
                />
              </div>
            </div>

            {/* Categories Section */}
            <div className="flex items-center justify-center px-4 sm:px-6 py-4">
              <LoadingOverlay
                isLoading={allCategoriesLoading}
                title="Loading Categories"
                message="Please wait while we load available categories..."
                zIndex={10000}
              />
              {!allCategoriesLoading && allCategories && allCategories.length > 0 ? (
                <div className="w-full max-w-6xl">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center flex-wrap">
                    {/* Fixed Restoration */}
                    {allCategories
                      .filter(category => category.name === "Fixed Restoration")
                      .map((category) => (
                        <div
                          key={category.id}
                          className="cursor-pointer transition-all duration-200 rounded-2xl border-2 bg-white flex flex-col items-center p-4 sm:p-6 w-full sm:w-auto sm:min-w-[240px] border-gray-200 hover:border-blue-500 hover:shadow-lg"
                          onClick={() => {
                            setProductCategory(category.name);
                            setStep(5);
                          }}
                        >
                          <div className="flex items-center justify-center mb-3">
                            <img
                              src={getCategoryImage(category.name)}
                              alt={category.name}
                              className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
                            />
                          </div>
                          <h3 className="font-semibold text-base sm:text-xl text-center text-gray-900">
                            {category.name}
                          </h3>
                        </div>
                      ))}

                    {/* Removable Restoration */}
                    {allCategories
                      .filter(category => category.name === "Removable Restoration")
                      .map((category) => (
                        <div
                          key={category.id}
                          className="cursor-pointer transition-all duration-200 rounded-2xl border-2 bg-white flex flex-col items-center p-4 sm:p-6 w-full sm:w-auto sm:min-w-[240px] border-gray-200 hover:border-blue-500 hover:shadow-lg"
                          onClick={() => {
                            setProductCategory(category.name);
                            setStep(5);
                          }}
                        >
                          <div className="flex items-center justify-center mb-3">
                            <img
                              src={getCategoryImage(category.name)}
                              alt={category.name}
                              className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
                            />
                          </div>
                          <h3 className="font-semibold text-base sm:text-xl text-center text-gray-900">
                            {category.name}
                          </h3>
                        </div>
                      ))}

                    {/* Orthodontics */}
                    {allCategories
                      .filter(category => category.name === "Orthodontics")
                      .map((category) => (
                        <div
                          key={category.id}
                          className="cursor-pointer transition-all duration-200 rounded-2xl border-2 bg-white flex flex-col items-center p-4 sm:p-6 w-full sm:w-auto sm:min-w-[240px] border-gray-200 hover:border-blue-500 hover:shadow-lg"
                          onClick={() => {
                            setProductCategory(category.name);
                            setStep(5);
                          }}
                        >
                          <div className="flex items-center justify-center mb-3">
                            <img
                              src={getCategoryImage(category.name)}
                              alt={category.name}
                              className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
                            />
                          </div>
                          <h3 className="font-semibold text-base sm:text-xl text-center text-gray-900">
                            {category.name}
                          </h3>
                        </div>
                      ))}

                    {/* Other categories */}
                    {allCategories
                      .filter(category => !["Fixed Restoration", "Removable Restoration", "Orthodontics"].includes(category.name))
                      .map((category) => (
                        <div
                          key={category.id}
                          className="cursor-pointer transition-all duration-200 rounded-2xl border-2 bg-white flex flex-col items-center p-4 sm:p-6 w-full sm:w-auto sm:min-w-[240px] border-gray-200 hover:border-blue-500 hover:shadow-lg"
                          onClick={() => {
                            setProductCategory(category.name);
                            setStep(5);
                          }}
                        >
                          <div className="flex items-center justify-center mb-3">
                            <img
                              src={getCategoryImage(category.name)}
                              alt={category.name}
                              className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
                            />
                          </div>
                          <h3 className="font-semibold text-base sm:text-xl text-center text-gray-900">
                            {category.name}
                          </h3>
                        </div>
                      ))}
                  </div>
                </div>
              ) : !allCategoriesLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">No categories available.</p>
                    <button
                      onClick={() => fetchAllCategories("en")}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      case 5:
        return (
          <div className="flex flex-col bg-white relative">
            {/* Header Section */}
            <div className="flex flex-col items-center px-4 sm:px-6 py-2 border-b border-gray-200">
              <div className="text-center mb-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Let's start building your case</h1>
                <p className="text-xs sm:text-sm lg:text-base text-gray-600">What type of product are you working on?</p>
              </div>
            
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full mb-4 gap-4">
                {/* Showing Results Section - Left side */}
                <div className="flex-shrink-0">
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
                <div className="relative w-64">
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
            <div className="flex items-center justify-center px-4 sm:px-6 py-4">
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
                          fetchSubcategoriesByCategory(selectedCategory.id, "en");
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : subcategoriesData.length === 0 ? (
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
                    {subcategoriesData.map((subcategory) => (
                      <div
                        key={subcategory.id}
                        className={`cursor-pointer transition-all duration-200 rounded-2xl border-2 bg-white flex flex-col items-center p-4 sm:p-6 w-full sm:w-auto sm:min-w-[240px] ${
                          selectedSubCategory === subcategory.sub_name
                            ? "border-blue-500 shadow-lg"
                            : "border-gray-200 hover:border-blue-500 hover:shadow-lg"
                          }`}
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
                            className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
                          />
                        </div>
                        <h3 className="font-semibold text-base sm:text-xl text-center text-gray-900">
                          {subcategory.sub_name || ""}
                        </h3>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      case 6:
        return (
          <div className="flex flex-col bg-white" style={{ minHeight: "75vh" }}>
            {/* Header Section */}
            <div className="px-4 py-4 border-b border-gray-200">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-3">Let's start building your case</h1>
                <p className="text-lg text-gray-600">Choose a dental product to continue.</p>
              </div>

              {/* Controls Section */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
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

                {/* Search and Sort Controls */}
                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleCategorySelectionChange}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Change Selection
                  </button>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search Product"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 text-sm bg-white border-gray-200 rounded-lg w-64"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Products Cards Section */}
            <div className="flex-1 flex flex-col px-4 py-4 relative">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                      {sortedProducts.map((product: any) => (
                        <div
                          key={product.id}
                          className={`cursor-pointer transition-all duration-200 rounded-lg border-2 bg-white flex flex-col overflow-hidden ${
                            selectedProductInModal === String(product.id)
                              ? "border-blue-500 shadow-lg"
                              : "border-gray-200 hover:border-blue-500 hover:shadow-lg"
                          }`}
                          onClick={async (e) => {
                            if (showSpotlight) {
                              activateSpotlight(e.currentTarget as HTMLElement);
                            }
                            setSelectedProductInModal(String(product.id))
                            setProductDetailsLoading(true)

                            // Fetch detailed product information from the library API
                            try {
                              const productDetails = await fetchProductDetails(product.id, propSelectedLabId || undefined);
                              if (productDetails) {
                                // Store the detailed product data using Zustand store
                                const { setSelectedProductDetails, setProductExtractions } = useSlipStore.getState();
                                setSelectedProductDetails(productDetails);
                                setProductExtractions(productDetails?.data?.extractions || []);
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
                          {/* Product Image Section - Larger */}
                          <div className="flex items-center justify-center bg-gray-100 p-6 h-48">
                            <img
                              src={
                                (product.image_url && product.image_url !== "/placeholder.svg" && product.image_url !== null)
                                || (product.image_url_url && product.image_url_url !== "/placeholder.svg" && product.image_url_url !== null)
                                  ? (product.image_url || product.image_url_url)
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
                              {product.category_name && (
                                <div className="truncate">Category: {product.category_name}</div>
                              )}
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
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
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
        )
      case 7:
        return (
          <div className="flex flex-col bg-white" style={{ minHeight: "75vh" }}>
            {/* Header Section */}
            <div className="flex flex-col items-center px-6 py-6 border-b border-gray-200">
              <div className="text-center mb-4">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Let's start building your case</h1>
                <p className="text-base lg:text-lg text-gray-600">Choose stages to continue.</p>
              </div>
            </div>

            {/* Breadcrumb */}
            <div className="px-3 md:px-6 py-2 md:py-3 bg-gray-50 border-b">
              <div className="flex items-center gap-2 md:gap-3 min-w-max">
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
            <div className="flex-1 flex items-center justify-center px-4 py-4">
              {/* Loading overlay for stages */}
              <LoadingOverlay
                isLoading={stagesLoading}
                title="Loading Stages"
                message="Please wait while we load available stages..."
                zIndex={10000}
              />
              <div className="w-full max-w-6xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 justify-center items-center">
                  {stagesList.length > 0 ? stagesList.map((stage: any) => (
                      <div
                        key={stage.name || stage}
                        className={`cursor-pointer transition-all duration-200 hover:shadow-lg rounded-xl border-2 bg-white flex flex-col items-center p-4 w-full max-w-sm mx-auto ${selectedStages.includes(stage.id?.toString() || stage.name || stage) ? "border-blue-600 border-4 shadow-md" : "border-gray-200 hover:border-gray-300"}`}
                        style={{
                          minHeight: '200px'
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
                        <div className="flex items-center justify-center mb-4 flex-1">
                          <div className="flex items-center justify-center">
                            <img
                              src={stage.image_url || "/images/stages-placeholder.png"}
                              alt={stage.name || stage}
                              className="w-32 h-32 object-contain"
                              onError={(e) => {
                                // Fallback to placeholder if image fails to load
                                e.currentTarget.src = "/images/stages-placeholder.png"
                              }}
                            />
                          </div>
                        </div>
                        <h3 className="font-medium text-base text-center text-gray-900 leading-tight px-2">
                          {stage.name || stage}
                        </h3>
                        {/* Show additional stage information if available */}
                        {(stage.price || stage.days !== undefined) && (
                          <div className="mt-2 text-xs text-gray-500 text-center">
                            {stage.price && (
                              <div className="font-medium text-green-600">${stage.price}</div>
                            )}
                            {stage.days !== undefined && stage.days > 0 && (
                              <div>{stage.days} day{stage.days !== 1 ? 's' : ''}</div>
                            )}
                          </div>
                        )}
                        {selectedStages.includes(stage.id?.toString() || stage.name || stage) && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">
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
        )
      default:
        return <div>Step {step} not implemented yet</div>
    }
  }

  return (
    <div className={`flex flex-col ${!isModal ? 'lg:flex-row min-h-screen' : 'fixed inset-0 z-[10001] h-full max-h-[100vh]'} ${isModal ? 'bg-black/50' : 'bg-gray-50'}`}>
      {/* Sidebar - Only show when not in modal mode */}
      {!isModal && (
        <div className="hidden lg:block">
          <DashboardSidebar />
        </div>
      )}
      
      {/* Main Content */}
      <main className={`flex-1 flex flex-col ${!isModal ? 'h-full lg:h-screen' : 'h-full max-h-[100vh]'} max-w-full ${isModal ? 'bg-white rounded-lg shadow-2xl mx-4 my-4' : ''}`}>
        {/* Modal Header - Only show when in modal mode */}
        {isModal && (
          <div className="flex items-center justify-between p-3 md:p-4 border-b border-gray-200 rounded-t-lg flex-shrink-0" style={{ backgroundColor: "#1162A8"}}>
            <h2 className="text-lg md:text-xl font-semibold text-white">Add Slip</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        )}

        {/* Main Scrollable Content */}
        <div className={`flex-1 overflow-y-auto min-h-0 flex flex-col`}>
          {/* Lab Selection Header - Show when lab and doctor are selected */}
          {addSlipFormData.lab && addSlipFormData.doctor && step >= 3 && (
            <div className="px-6 py-6 bg-white border-b border-gray-200">
              <div className="flex items-start gap-6">
                {/* Doctor Profile Image */}
                <div className="flex-shrink-0">
                  {(() => {
                    const selectedDoctor = officeDoctors?.find((doc: any) =>
                      String(doc.id) === addSlipFormData.doctor_id
                    )

                    return (
                      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-gray-100">
                          <img
                            src="/images/doctor-image.png"
                            alt="Default Doctor"
                            className="w-full h-full object-cover"
                          />
                      </div>
                    )
                  })()}
                </div>

                {/* Information Section */}
                <div className="space-y-3">
                  {/* Office/Lab Logo and Name */}
                  <div className="flex items-center gap-3">
                    {(() => {
                      const selectedEntity = isLabAdmin
                        ? (selectionData as ConnectedOffice[]).find((l: ConnectedOffice) => String(l.office?.id) === addSlipFormData.lab_id)?.office
                        : (selectionData as ConnectedLab[]).find((l: ConnectedLab) => String(l.lab?.id) === addSlipFormData.lab_id)?.lab

                      return (
                        <CustomerLogo
                          customerId={selectedEntity?.id}
                          fallbackLogo={selectedEntity?.logo_url}
                          alt={addSlipFormData.lab}
                          className="w-12 h-12 rounded"
                        />
                      )
                    })()}
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide" style={{ color: '#2E5C8A' }}>
                        {(() => {
                          if (typeof window !== "undefined") {
                            try {
                              const userStr = localStorage.getItem("user");
                              if (userStr) {
                                const userObj = JSON.parse(userStr);
                                if (Array.isArray(userObj.customers) && userObj.customers.length > 0) {
                                  const primary = userObj.customers.find((c: any) => c.is_primary === 1);
                                  return (primary ? primary.name : userObj.customers[0].name) || addSlipFormData.lab;
                                }
                              }
                            } catch (e) {
                              // fallback to addSlipFormData.lab
                            }
                          }
                          return addSlipFormData.lab;
                        })()}
                      </h2>
                      <p className="text-sm text-gray-500 uppercase tracking-wider">Modern Dentistry</p>
                    </div>
                  </div>

                  {/* Doctor Name with Edit */}
                  <div className="relative">
                    <Input
                      value={addSlipFormData.doctor}
                      readOnly
                      className="h-8 text-base font-medium bg-gray-50 border-gray-300 pr-12"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStep(2)
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Lab Field */}
                  <div className="flex items-center gap-3">
                    <Label className="font-semibold text-sm text-gray-700 min-w-[40px]">Lab:</Label>
                    <div className="relative flex-1">
                      <Input
                        value={addSlipFormData.lab}
                        readOnly
                        className="h-8 text-base font-medium bg-gray-50 border-gray-300 pr-12"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsFirstTimeSetup(true)
                          setStep(1)
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Patient Field */}
                  <div className="flex items-center gap-3">
                    <Label className="font-semibold text-sm text-gray-700 min-w-[40px]">Patient:</Label>
                    <div className="relative flex-1">
                      <div className="relative">
                        {isInlineEditingPatient ? (
                          <Input
                            ref={inlinePatientInputRef}
                            defaultValue={addSlipFormData.patient}
                            onChange={handleInlinePatientChange}
                            onBlur={() => setIsInlineEditingPatient(false)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setIsInlineEditingPatient(false)
                                if (step === 3 && addSlipFormData.patient.trim()) {
                                  setStep(4)
                                }
                              }
                              if (e.key === 'Escape') {
                                setIsInlineEditingPatient(false)
                              }
                            }}
                            className="h-8 text-base font-medium bg-gray-50 border-gray-300 pr-12"
                          />
                        ) : (
                          <Input
                            value={addSlipFormData.patient || ""}
                            placeholder={!addSlipFormData.patient ? "Click to enter patient name" : ""}
                            readOnly
                            onClick={() => setIsInlineEditingPatient(true)}
                            className={`h-8 text-base font-medium bg-gray-50 border-gray-300 pr-12 cursor-pointer ${
                              !addSlipFormData.patient ? "text-gray-400" : ""
                            }`}
                          />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setStep(3)
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Render current step */}
          {renderStep()}
        </div>

        {/* Footer - Fixed at bottom, outside scroll area */}
        <div className="border-t bg-white flex-shrink-0 p-3 md:p-4 rounded-b-lg">
          <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2 md:gap-3">
            {/* Left side - Back button */}
            <div className="flex">
              {(step === 2 || step === 3 || step === 4 || step === 5 || step === 6 || step === 7) && !hideBackButton && (
                <Button
                  variant="outline"
                  onClick={handleBackModal}
                  className="w-full sm:w-auto px-4 md:px-6 h-10 text-sm rounded-lg"
                >
                  Back
                </Button>
              )}
            </div>

            {/* Right side - Cancel and Next buttons */}
            <div className="flex gap-2 md:gap-3">
              <Button
                onClick={() => setShowCancelSubmissionWarningModal(true)}
                className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white px-4 md:px-6 h-10 text-sm rounded-lg font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleContinueModal(
                  selectedLab,
                  selectedDoctorId || "",
                  addSlipFormData,
                  productCategory,
                  selectedSubCategory || "",
                  selectedProductInModal || "",
                  selectedStages,
                  setShowArchModal
                )}
                disabled={
                  (step === 1 && !selectedLab) ||
                  (step === 2 && !selectedDoctorId?.trim()) ||
                  (step === 3 && !addSlipFormData.patient?.trim()) ||
                  (step === 4 && !productCategory)
                }
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 md:px-8 h-10 text-sm rounded-lg font-semibold"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showCancelSubmissionWarningModal && (
        <CancelSlipCreationModal
          open={showCancelSubmissionWarningModal}
          onCancel={() => setShowCancelSubmissionWarningModal(false)}
          onConfirm={() => {
            setShowCancelSubmissionWarningModal(false)
            effectiveSetShowAddSlipModal(false)
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

      {/* Add New Lab Modal */}
      <AddNewLabModal
        open={showAddNewLabModal}
        onOpenChange={setShowAddNewLabModal}
        onLabSelect={(lab: any) => {
          setShowAddNewLabModal(false)
        }}
        onInviteLab={(labName: string) => {
          setShowAddNewLabModal(false)
        }}
      />

      {/* Add Doctor Modal */}
      <AddDoctorModal
        isOpen={showAddDoctorModal}
        onClose={() => setShowAddDoctorModal(false)}
        onDoctorConnect={(doctorId: string, doctorData?: any) => {
          // Handle doctor connection - set doctor in form data
          if (doctorData) {
            const doctorName = doctorData.name || `${doctorData.first_name || ""} ${doctorData.last_name || ""}`.trim()
            setAddSlipFormData((prev: any) => ({
              ...prev,
              doctor: doctorName,
              doctor_id: doctorId,
            }))
          } else {
            // If no doctor data provided, just set the ID
            setAddSlipFormData((prev: any) => ({
              ...prev,
              doctor_id: doctorId,
            }))
          }
          setShowAddDoctorModal(false)
        }}
      />

      {/* Arch Selection Modal */}
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
            <div className="text-center mb-4 sm:mb-6 w-full">
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
    </div>
  )
}

export default function OptimizedDentalSlipPage(props: any) {
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
          <OptimizedDentalSlipPageContent
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
