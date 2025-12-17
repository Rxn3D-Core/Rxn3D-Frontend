import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface ProductConfig {
  grade?: string
  gradeId?: number
  stage?: string
  stageId?: number
  [key: string]: any
}

interface AddOn {
  addon_id?: number
  qty?: number
  quantity?: number
  category?: string
  addOn?: string
  name?: string
  label?: string
  price?: number | string
  subcategory?: string
  tempId?: string
  [key: string]: any
}

interface ProductAddOns {
  maxillary?: AddOn[]
  mandibular?: AddOn[]
}

interface ProductConfigurations {
  [productId: string]: {
    maxillary: ProductConfig
    mandibular: ProductConfig
  }
}

interface CaseDesignState {
  // Product Configurations State (NEW)
  productConfigurations: ProductConfigurations

  // Add-ons State
  productAddOns: { [productId: string]: ProductAddOns }

  // Stage Notes State
  stageNotesContent: { [productId: string]: string }
  stageNoteIds: { [productId: string]: number }
  savingStageNotes: { [productId: string]: boolean }
  editingStageNotes: { [productId: string]: boolean }
  stageNotesCollapsed: { [productId: string]: boolean }

  // Tooth Selection State
  selectedMaxillaryTeeth: number[]
  selectedMandibularTeeth: number[]

  // Rush Requests State
  rushRequests: { [productId: string]: any }

  // Delivery Dates State
  productDeliveryDates: { [productId: string]: string }
  
  // Modal States
  impressionModalOpen: { productId: string; arch: "maxillary" | "mandibular" } | null
  showAddProductModal: boolean
  selectedLabId: number | null
  showShadeModal: boolean
  shadeModalProductId: string
  shadeModalArch: "maxillary" | "mandibular"
  shadeModalSelectedSystem: string
  shadeModalSelectedShade: string
  showGumShadeModal: boolean
  gumShadeModalProductId: string
  gumShadeModalArch: "maxillary" | "mandibular"
  gumShadeModalSelectedSystem: string
  gumShadeModalSelectedShade: string
  
  // Cache and UI State
  cacheUpdateTrigger: number

  // Actions - Product Configurations (NEW)
  updateProductConfig: (productId: string, arch: "maxillary" | "mandibular", field: string, value: any) => void
  getProductConfig: (productId: string, arch: "maxillary" | "mandibular") => ProductConfig
  initializeProductConfig: (productId: string, maxillaryConfig: ProductConfig, mandibularConfig: ProductConfig) => void
  clearProductConfig: (productId: string) => void

  // Actions - Add-ons
  setProductAddOns: (productId: string, addOns: ProductAddOns) => void
  addAddOn: (productId: string, arch: "maxillary" | "mandibular", addOn: AddOn) => void
  removeAddOn: (productId: string, arch: "maxillary" | "mandibular", index: number) => void
  updateAddOn: (productId: string, arch: "maxillary" | "mandibular", index: number, addOn: AddOn) => void
  getProductAddOns: (productId: string) => ProductAddOns
  clearProductAddOns: (productId: string) => void

  // Actions - Stage Notes
  setStageNotesContent: (productId: string, content: string) => void
  setStageNoteIds: (productId: string, id: number) => void
  setSavingStageNotes: (productId: string, saving: boolean) => void
  setEditingStageNotes: (productId: string, editing: boolean) => void
  setStageNotesCollapsed: (productId: string, collapsed: boolean) => void
  clearStageNotesContent: () => void
  
  // Actions - Tooth Selection
  setSelectedMaxillaryTeeth: (teeth: number[]) => void
  setSelectedMandibularTeeth: (teeth: number[]) => void
  clearSelectedTeeth: () => void
  
  // Actions - Rush Requests
  setRushRequests: (productId: string, rushRequest: any) => void
  clearRushRequests: () => void
  
  // Actions - Delivery Dates
  setProductDeliveryDates: (productId: string, date: string) => void
  clearProductDeliveryDates: () => void
  
  // Actions - Modals
  setImpressionModalOpen: (modal: { productId: string; arch: "maxillary" | "mandibular" } | null) => void
  setShowAddProductModal: (show: boolean) => void
  setSelectedLabId: (labId: number | null) => void
  setShowShadeModal: (show: boolean) => void
  setShadeModalProductId: (productId: string) => void
  setShadeModalArch: (arch: "maxillary" | "mandibular") => void
  setShadeModalSelectedSystem: (system: string) => void
  setShadeModalSelectedShade: (shade: string) => void
  setShowGumShadeModal: (show: boolean) => void
  setGumShadeModalProductId: (productId: string) => void
  setGumShadeModalArch: (arch: "maxillary" | "mandibular") => void
  setGumShadeModalSelectedSystem: (system: string) => void
  setGumShadeModalSelectedShade: (shade: string) => void
  
  // Actions - Cache and UI
  setCacheUpdateTrigger: (trigger: number) => void
  incrementCacheUpdateTrigger: () => void
  
  // Utility Actions
  clearAllState: () => void
  clearProductState: (productId: string) => void
  
  // Computed Values
  getStageNotesContent: (productId: string) => string
  getSelectedTeeth: () => { maxillary: number[], mandibular: number[] }
  getRushRequest: (productId: string) => any
  getDeliveryDate: (productId: string) => string
  isEditingStageNotes: (productId: string) => boolean
  isSavingStageNotes: (productId: string) => boolean
  hasAddOns: (productId: string) => boolean
}

export const useCaseDesignStore = create<CaseDesignState>()(
  devtools(
    (set, get) => ({
      // Initial state
      productConfigurations: {},
      productAddOns: {},
      stageNotesContent: {},
      stageNoteIds: {},
      savingStageNotes: {},
      editingStageNotes: {},
      stageNotesCollapsed: {},
      selectedMaxillaryTeeth: [],
      selectedMandibularTeeth: [],
      rushRequests: {},
      productDeliveryDates: {},
      impressionModalOpen: null,
      showAddProductModal: false,
      selectedLabId: null,
      showShadeModal: false,
      shadeModalProductId: "",
      shadeModalArch: "maxillary",
      shadeModalSelectedSystem: "",
      shadeModalSelectedShade: "",
      showGumShadeModal: false,
      gumShadeModalProductId: "",
      gumShadeModalArch: "maxillary",
      gumShadeModalSelectedSystem: "",
      gumShadeModalSelectedShade: "",
      cacheUpdateTrigger: 0,

      // Product Configuration Actions
      updateProductConfig: (productId: string, arch: "maxillary" | "mandibular", field: string, value: any) =>
        set((state) => {
          const currentConfig = state.productConfigurations[productId] || {
            maxillary: {},
            mandibular: {}
          }

          return {
            productConfigurations: {
              ...state.productConfigurations,
              [productId]: {
                ...currentConfig,
                [arch]: {
                  ...currentConfig[arch],
                  [field]: value
                }
              }
            }
          }
        }),

      getProductConfig: (productId: string, arch: "maxillary" | "mandibular") => {
        const state = get()
        return state.productConfigurations[productId]?.[arch] || {}
      },

      initializeProductConfig: (productId: string, maxillaryConfig: ProductConfig, mandibularConfig: ProductConfig) =>
        set((state) => ({
          productConfigurations: {
            ...state.productConfigurations,
            [productId]: {
              maxillary: maxillaryConfig,
              mandibular: mandibularConfig
            }
          }
        })),

      clearProductConfig: (productId: string) =>
        set((state) => {
          const newConfigurations = { ...state.productConfigurations }
          delete newConfigurations[productId]
          return { productConfigurations: newConfigurations }
        }),

      // Add-ons Actions
      setProductAddOns: (productId: string, addOns: ProductAddOns) =>
        set((state) => ({
          productAddOns: {
            ...state.productAddOns,
            [productId]: addOns
          }
        })),

      addAddOn: (productId: string, arch: "maxillary" | "mandibular", addOn: AddOn) =>
        set((state) => {
          const currentAddOns = state.productAddOns[productId] || { maxillary: [], mandibular: [] }
          const archAddOns = currentAddOns[arch] || []
          
          return {
            productAddOns: {
              ...state.productAddOns,
              [productId]: {
                ...currentAddOns,
                [arch]: [...archAddOns, addOn]
              }
            }
          }
        }),

      removeAddOn: (productId: string, arch: "maxillary" | "mandibular", index: number) =>
        set((state) => {
          const currentAddOns = state.productAddOns[productId]
          if (!currentAddOns || !currentAddOns[arch]) return state
          
          const archAddOns = [...currentAddOns[arch]]
          archAddOns.splice(index, 1)
          
          return {
            productAddOns: {
              ...state.productAddOns,
              [productId]: {
                ...currentAddOns,
                [arch]: archAddOns
              }
            }
          }
        }),

      updateAddOn: (productId: string, arch: "maxillary" | "mandibular", index: number, addOn: AddOn) =>
        set((state) => {
          const currentAddOns = state.productAddOns[productId]
          if (!currentAddOns || !currentAddOns[arch]) return state
          
          const archAddOns = [...currentAddOns[arch]]
          archAddOns[index] = addOn
          
          return {
            productAddOns: {
              ...state.productAddOns,
              [productId]: {
                ...currentAddOns,
                [arch]: archAddOns
              }
            }
          }
        }),

      getProductAddOns: (productId: string) => {
        const state = get()
        return state.productAddOns[productId] || { maxillary: [], mandibular: [] }
      },

      clearProductAddOns: (productId: string) =>
        set((state) => {
          const newAddOns = { ...state.productAddOns }
          delete newAddOns[productId]
          return { productAddOns: newAddOns }
        }),

      // Stage Notes Actions
      setStageNotesContent: (productId: string, content: string) =>
        set((state) => ({
          stageNotesContent: {
            ...state.stageNotesContent,
            [productId]: content
          }
        })),
      
      setStageNoteIds: (productId: string, id: number) =>
        set((state) => ({
          stageNoteIds: {
            ...state.stageNoteIds,
            [productId]: id
          }
        })),
      
      setSavingStageNotes: (productId: string, saving: boolean) =>
        set((state) => ({
          savingStageNotes: {
            ...state.savingStageNotes,
            [productId]: saving
          }
        })),
      
      setEditingStageNotes: (productId: string, editing: boolean) =>
        set((state) => ({
          editingStageNotes: {
            ...state.editingStageNotes,
            [productId]: editing
          }
        })),
      
      setStageNotesCollapsed: (productId: string, collapsed: boolean) =>
        set((state) => ({
          stageNotesCollapsed: {
            ...state.stageNotesCollapsed,
            [productId]: collapsed
          }
        })),
      
      clearStageNotesContent: () =>
        set({ stageNotesContent: {} }),
      
      // Tooth Selection Actions
      setSelectedMaxillaryTeeth: (teeth: number[]) =>
        set({ selectedMaxillaryTeeth: teeth }),
      
      setSelectedMandibularTeeth: (teeth: number[]) =>
        set({ selectedMandibularTeeth: teeth }),
      
      clearSelectedTeeth: () =>
        set({ 
          selectedMaxillaryTeeth: [], 
          selectedMandibularTeeth: [] 
        }),
      
      // Rush Requests Actions
      setRushRequests: (productId: string, rushRequest: any) =>
        set((state) => ({
          rushRequests: {
            ...state.rushRequests,
            [productId]: rushRequest
          }
        })),
      
      clearRushRequests: () =>
        set({ rushRequests: {} }),
      
      // Delivery Dates Actions
      setProductDeliveryDates: (productId: string, date: string) =>
        set((state) => ({
          productDeliveryDates: {
            ...state.productDeliveryDates,
            [productId]: date
          }
        })),
      
      clearProductDeliveryDates: () =>
        set({ productDeliveryDates: {} }),
      
      // Modal Actions
      setImpressionModalOpen: (modal) =>
        set({ impressionModalOpen: modal }),
      
      setShowAddProductModal: (show: boolean) =>
        set({ showAddProductModal: show }),
      
      setSelectedLabId: (labId: number | null) =>
        set({ selectedLabId: labId }),
      
      setShowShadeModal: (show: boolean) =>
        set({ showShadeModal: show }),
      
      setShadeModalProductId: (productId: string) =>
        set({ shadeModalProductId: productId }),
      
      setShadeModalArch: (arch: "maxillary" | "mandibular") =>
        set({ shadeModalArch: arch }),
      
      setShadeModalSelectedSystem: (system: string) =>
        set({ shadeModalSelectedSystem: system }),
      
      setShadeModalSelectedShade: (shade: string) =>
        set({ shadeModalSelectedShade: shade }),
      
      setShowGumShadeModal: (show: boolean) =>
        set({ showGumShadeModal: show }),
      
      setGumShadeModalProductId: (productId: string) =>
        set({ gumShadeModalProductId: productId }),
      
      setGumShadeModalArch: (arch: "maxillary" | "mandibular") =>
        set({ gumShadeModalArch: arch }),
      
      setGumShadeModalSelectedSystem: (system: string) =>
        set({ gumShadeModalSelectedSystem: system }),
      
      setGumShadeModalSelectedShade: (shade: string) =>
        set({ gumShadeModalSelectedShade: shade }),
      
      // Cache and UI Actions
      setCacheUpdateTrigger: (trigger: number) =>
        set({ cacheUpdateTrigger: trigger }),
      
      incrementCacheUpdateTrigger: () =>
        set((state) => ({ 
          cacheUpdateTrigger: state.cacheUpdateTrigger + 1 
        })),
      
      // Utility Actions
      clearAllState: () =>
        set({
          productConfigurations: {},
          productAddOns: {},
          stageNotesContent: {},
          stageNoteIds: {},
          savingStageNotes: {},
          editingStageNotes: {},
          stageNotesCollapsed: {},
          selectedMaxillaryTeeth: [],
          selectedMandibularTeeth: [],
          rushRequests: {},
          productDeliveryDates: {},
          impressionModalOpen: null,
          showAddProductModal: false,
          selectedLabId: null,
          showShadeModal: false,
          shadeModalProductId: "",
          shadeModalArch: "maxillary",
          shadeModalSelectedSystem: "",
          shadeModalSelectedShade: "",
          showGumShadeModal: false,
          gumShadeModalProductId: "",
          gumShadeModalArch: "maxillary",
          gumShadeModalSelectedSystem: "",
          gumShadeModalSelectedShade: "",
          cacheUpdateTrigger: 0
        }),
      
      clearProductState: (productId: string) =>
        set((state) => {
          const newState = { ...state }
          delete newState.productConfigurations[productId]
          delete newState.productAddOns[productId]
          delete newState.stageNotesContent[productId]
          delete newState.stageNoteIds[productId]
          delete newState.savingStageNotes[productId]
          delete newState.editingStageNotes[productId]
          delete newState.stageNotesCollapsed[productId]
          delete newState.rushRequests[productId]
          delete newState.productDeliveryDates[productId]
          return newState
        }),
      
      // Computed Values
      getStageNotesContent: (productId: string) => {
        const state = get()
        return state.stageNotesContent[productId] || ''
      },
      
      getSelectedTeeth: () => {
        const state = get()
        return {
          maxillary: state.selectedMaxillaryTeeth,
          mandibular: state.selectedMandibularTeeth
        }
      },
      
      getRushRequest: (productId: string) => {
        const state = get()
        return state.rushRequests[productId] || null
      },
      
      getDeliveryDate: (productId: string) => {
        const state = get()
        return state.productDeliveryDates[productId] || ''
      },
      
      isEditingStageNotes: (productId: string) => {
        const state = get()
        return state.editingStageNotes[productId] || false
      },
      
      isSavingStageNotes: (productId: string) => {
        const state = get()
        return state.savingStageNotes[productId] || false
      },

      hasAddOns: (productId: string) => {
        const state = get()
        const addOns = state.productAddOns[productId]
        if (!addOns) return false
        return (addOns.maxillary && addOns.maxillary.length > 0) || 
               (addOns.mandibular && addOns.mandibular.length > 0)
      }
    }),
    {
      name: 'case-design-store'
    }
  )
)
