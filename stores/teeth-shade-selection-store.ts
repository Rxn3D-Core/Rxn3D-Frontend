import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { ShadeMatch as ApiShadeMatch } from '@/services/shade-api-service'

interface TeethShadeSelectionState {
  // Modal state
  isOpen: boolean
  showSelectionModal: boolean
  isMaximized: boolean
  
  // Shade selection state
  selectedShadeSystem: string
  selectedIndividualShade: string
  secondaryShadeSystem: string
  hoveredShade: string | null
  activeTab: 'shade' | 'colorPicker'
  
  // Color picker state
  sliderPosition: number
  selectedCustomColor: string | null
  
  // API integration state
  apiConversionResults: ApiShadeMatch[]
  apiColorMatchResults: ApiShadeMatch[]
  isLoadingConversion: boolean
  isLoadingColorMatch: boolean
  conversionError: string | null
  colorMatchError: string | null
  
  // Modal configuration
  type: 'teeth' | 'gum'
  productId: number | undefined
  autoOpenShadeMatching: boolean
  
  // Actions for modal state
  setIsOpen: (isOpen: boolean) => void
  setShowSelectionModal: (show: boolean) => void
  setIsMaximized: (maximized: boolean) => void
  
  // Actions for shade selection
  setSelectedShadeSystem: (system: string) => void
  setSelectedIndividualShade: (shade: string) => void
  setSecondaryShadeSystem: (system: string) => void
  setHoveredShade: (shade: string | null) => void
  setActiveTab: (tab: 'shade' | 'colorPicker') => void
  
  // Actions for color picker
  setSliderPosition: (position: number) => void
  setSelectedCustomColor: (color: string | null) => void
  
  // Actions for API integration
  setApiConversionResults: (results: ApiShadeMatch[]) => void
  setApiColorMatchResults: (results: ApiShadeMatch[]) => void
  setIsLoadingConversion: (loading: boolean) => void
  setIsLoadingColorMatch: (loading: boolean) => void
  setConversionError: (error: string | null) => void
  setColorMatchError: (error: string | null) => void
  
  // Actions for modal configuration
  setType: (type: 'teeth' | 'gum') => void
  setProductId: (productId: number | undefined) => void
  setAutoOpenShadeMatching: (autoOpen: boolean) => void
  
  // Utility actions
  resetModal: () => void
  resetSelection: () => void
  resetApiState: () => void
  resetAll: () => void
  
  // Computed values
  getDefaultShadeSystem: () => string
  getDefaultIndividualShade: () => string
  getDefaultSecondaryShadeSystem: () => string
}

const initialState = {
  // Modal state
  isOpen: false,
  showSelectionModal: false,
  isMaximized: false,
  
  // Shade selection state
  selectedShadeSystem: '',
  selectedIndividualShade: '',
  secondaryShadeSystem: '',
  hoveredShade: null,
  activeTab: 'shade' as const,
  
  // Color picker state
  sliderPosition: 50,
  selectedCustomColor: null,
  
  // API integration state
  apiConversionResults: [],
  apiColorMatchResults: [],
  isLoadingConversion: false,
  isLoadingColorMatch: false,
  conversionError: null,
  colorMatchError: null,
  
  // Modal configuration
  type: 'teeth' as const,
  productId: undefined,
  autoOpenShadeMatching: false,
}

export const useTeethShadeSelectionStore = create<TeethShadeSelectionState>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // Actions for modal state
      setIsOpen: (isOpen: boolean) => {
        set({ isOpen })
      },
      
      setShowSelectionModal: (show: boolean) => {
        set({ showSelectionModal: show })
      },
      
      setIsMaximized: (maximized: boolean) => {
        set({ isMaximized: maximized })
      },
      
      // Actions for shade selection
      setSelectedShadeSystem: (system: string) => {
        set({ selectedShadeSystem: system })
      },
      
      setSelectedIndividualShade: (shade: string) => {
        set({ selectedIndividualShade: shade })
      },
      
      setSecondaryShadeSystem: (system: string) => {
        set({ secondaryShadeSystem: system })
      },
      
      setHoveredShade: (shade: string | null) => {
        set({ hoveredShade: shade })
      },
      
      setActiveTab: (tab: 'shade' | 'colorPicker') => {
        set({ activeTab: tab })
      },
      
      // Actions for color picker
      setSliderPosition: (position: number) => {
        set({ sliderPosition: position })
      },
      
      setSelectedCustomColor: (color: string | null) => {
        set({ selectedCustomColor: color })
      },
      
      // Actions for API integration
      setApiConversionResults: (results: ApiShadeMatch[]) => {
        set({ apiConversionResults: results })
      },
      
      setApiColorMatchResults: (results: ApiShadeMatch[]) => {
        set({ apiColorMatchResults: results })
      },
      
      setIsLoadingConversion: (loading: boolean) => {
        set({ isLoadingConversion: loading })
      },
      
      setIsLoadingColorMatch: (loading: boolean) => {
        set({ isLoadingColorMatch: loading })
      },
      
      setConversionError: (error: string | null) => {
        set({ conversionError: error })
      },
      
      setColorMatchError: (error: string | null) => {
        set({ colorMatchError: error })
      },
      
      // Actions for modal configuration
      setType: (type: 'teeth' | 'gum') => {
        set({ type })
      },
      
      setProductId: (productId: number | undefined) => {
        set({ productId })
      },
      
      setAutoOpenShadeMatching: (autoOpen: boolean) => {
        set({ autoOpenShadeMatching: autoOpen })
      },
      
      // Utility actions
      resetModal: () => {
        set({
          isOpen: false,
          showSelectionModal: false,
          isMaximized: false,
          hoveredShade: null,
          activeTab: 'shade',
        })
      },
      
      resetSelection: () => {
        const state = get()
        set({
          selectedShadeSystem: state.getDefaultShadeSystem(),
          selectedIndividualShade: state.getDefaultIndividualShade(),
          secondaryShadeSystem: state.getDefaultSecondaryShadeSystem(),
          sliderPosition: 50,
          selectedCustomColor: null,
        })
      },
      
      resetApiState: () => {
        set({
          apiConversionResults: [],
          apiColorMatchResults: [],
          isLoadingConversion: false,
          isLoadingColorMatch: false,
          conversionError: null,
          colorMatchError: null,
        })
      },
      
      resetAll: () => {
        set(initialState)
      },
      
      // Computed values
      getDefaultShadeSystem: () => {
        const state = get()
        return state.type === 'gum' ? "st-george" : "vita-classical"
      },
      
      getDefaultIndividualShade: () => {
        const state = get()
        return state.type === 'gum' ? "Light Vein" : "A1"
      },
      
      getDefaultSecondaryShadeSystem: () => {
        const state = get()
        return state.type === 'gum' ? "ivoclar-gum" : "ivoclar-chromascop"
      },
    }),
    {
      name: 'teeth-shade-selection-store',
    }
  )
)
