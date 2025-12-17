import { create } from "zustand"
import { persist } from "zustand/middleware"

// Types for better type safety
interface FormData {
  office: string
  office_id: string | number
  lab: string
  lab_id: string | number
  doctor: string
  doctor_id: string
  patient: string
  panNumber: string
  caseNumber: string
  slipNumber: string
  createdBy: string
  location: string | number
  caseStatus: string
  pickupDate: string
  deliveryDate: string
  deliveryTime: string
  patient_name: string
}

interface ProductDetails {
  id: number
  name: string
  image_url?: string
  price?: string
  grades?: Array<{
    id: number
    name: string
    code: string
    price: string
    is_default: string
  }>
  stages?: Array<{
    id: number
    name: string
    stage_configurations: any
    price: string
    days: number | null
    is_releasing_stage: string
    grade_pricing: any[]
  }>
  category_id?: number
  category_name?: string
  subcategory_id?: number
  subcategory_name?: string
  stage_type?: string
}

interface Extraction {
  id: number
  extraction_id: number
  name: string
  code: string
  color: string
  url?: string
  is_default: string
  is_required: string
  is_optional: string
  min_teeth?: number
  max_teeth?: number
  is_image_extraction: string
  image_url?: string
  sequence: number
  status: string
  created_at: string
  updated_at: string
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
  addOns: any[]
  stageNotesContent: string
  maxillaryConfig: any
  mandibularConfig: any
  category_name?: string
  subcategory_name?: string
  category_id?: number
  subcategory_id?: number
  grades?: any[]
  stages?: any[]
  productTeethShades?: any[]
  productGumShades?: any[]
  extractions?: any[]
  mandibularTeeth?: string
}

interface SlipData {
  // Form data
  office: string
  office_id: string | number
  lab: string
  lab_id: string | number
  doctor: string
  doctor_id: string
  patient: string
  panNumber: string
  caseNumber: string
  slipNumber: string
  createdBy: string
  location: string | number
  caseStatus: string
  pickupDate: string
  deliveryDate: string
  deliveryTime: string
  patient_name: string
  
  // Selection data
  selectedArch?: string
  selectedStages?: string[]
  selectedLab?: any
  selectedProduct?: ProductDetails
  selectedProductDetails?: {
    data?: {
      extractions?: Extraction[]
      stages?: any[]
    }
    extractions?: Extraction[]
  }
  productExtractions?: Extraction[]
  
  // Products array
  products?: Product[]
  
  // Teeth selection
  selectedMaxillaryTeeth?: number[]
  selectedMandibularTeeth?: number[]
  
  // Other data
  rushRequests?: Record<string, any>
  allNotes?: any[]
}

interface SlipStoreState {
  slipData: SlipData | null
  setSlipData: (data: SlipData) => void
  updateSlipData: (updates: Partial<SlipData>) => void
  setFormData: (formData: Partial<FormData>) => void
  setSelectedProduct: (product: ProductDetails) => void
  setSelectedProductDetails: (details: any) => void
  setProductExtractions: (extractions: Extraction[]) => void
  addProduct: (product: Product) => void
  updateProduct: (productId: string, updates: Partial<Product>) => void
  removeProduct: (productId: string) => void
  setSelectedTeeth: (arch: 'maxillary' | 'mandibular', teeth: number[]) => void
  clearSlipData: () => void
  resetForm: () => void
}

const initialSlipData: SlipData = {
  office: "",
  office_id: "",
  lab: "",
  lab_id: "",
  doctor: "",
  doctor_id: "",
  patient: "",
  panNumber: "",
  caseNumber: "",
  slipNumber: "",
  createdBy: "",
  location: "",
  caseStatus: "Draft",
  pickupDate: "",
  deliveryDate: "",
  deliveryTime: "",
  patient_name: "",
  products: [],
  selectedMaxillaryTeeth: [],
  selectedMandibularTeeth: [],
  rushRequests: {},
  allNotes: []
}

export const useSlipStore = create<SlipStoreState>()(
  persist(
    (set, get) => ({
      slipData: null,
      
      setSlipData: (data) => set({ slipData: data }),
      
      updateSlipData: (updates) => set((state) => ({
        slipData: state.slipData ? { ...state.slipData, ...updates } : { ...initialSlipData, ...updates }
      })),
      
      setFormData: (formData) => set((state) => ({
        slipData: state.slipData ? { ...state.slipData, ...formData } : { ...initialSlipData, ...formData }
      })),
      
      setSelectedProduct: (product) => set((state) => ({
        slipData: state.slipData ? { ...state.slipData, selectedProduct: product } : { ...initialSlipData, selectedProduct: product }
      })),
      
      setSelectedProductDetails: (details) => set((state) => ({
        slipData: state.slipData ? { ...state.slipData, selectedProductDetails: details } : { ...initialSlipData, selectedProductDetails: details }
      })),
      
      setProductExtractions: (extractions) => set((state) => ({
        slipData: state.slipData ? { ...state.slipData, productExtractions: extractions } : { ...initialSlipData, productExtractions: extractions }
      })),
      
      addProduct: (product) => set((state) => ({
        slipData: state.slipData ? {
          ...state.slipData,
          products: [...(state.slipData.products || []), product]
        } : {
          ...initialSlipData,
          products: [product]
        }
      })),
      
      updateProduct: (productId, updates) => set((state) => ({
        slipData: state.slipData ? {
          ...state.slipData,
          products: state.slipData.products?.map(p => 
            p.id === productId ? { ...p, ...updates } : p
          ) || []
        } : state.slipData
      })),
      
      removeProduct: (productId) => set((state) => ({
        slipData: state.slipData ? {
          ...state.slipData,
          products: state.slipData.products?.filter(p => p.id !== productId) || []
        } : state.slipData
      })),
      
      setSelectedTeeth: (arch, teeth) => set((state) => ({
        slipData: state.slipData ? {
          ...state.slipData,
          [`selected${arch.charAt(0).toUpperCase() + arch.slice(1)}Teeth`]: teeth
        } : {
          ...initialSlipData,
          [`selected${arch.charAt(0).toUpperCase() + arch.slice(1)}Teeth`]: teeth
        }
      })),
      
      clearSlipData: () => set({ slipData: null }),
      
      resetForm: () => set({ slipData: initialSlipData }),
    }),
    {
      name: 'slip-store',
      partialize: (state) => ({ slipData: state.slipData }),
    }
  )
)
