// Types for the refactored ConversionModal

export interface ShadeSystem {
  id: string | number
  name: string
  system_name?: string
}

export interface Shade {
  id: string | number
  name: string
  color: string
}

export interface ConversionMatch {
  id: string | number
  name: string
  brand: {
    name: string
  }
  color_codes: {
    incisal?: string
    body?: string
    cervical?: string
    top?: string
    middle?: string
    bottom?: string
  }
  match_percentage: number
}

export interface GumShade {
  productId: string
  arch: 'maxillary' | 'mandibular'
  shadeName: string
}

export interface ConversionModalState {
  isOpen: boolean
  type: 'teeth' | 'gum'
  selectedShadeSystem: string
  selectedIndividualShade: string
  selectedShade?: { color: string }
  currentSystem?: { name: string }
  selectedGumShade?: GumShade | null
  activeTab: 'shade' | 'colorPicker'
  selectedCustomColor?: string
  sliderPosition: number
  tempSelectedMatch?: ConversionMatch | null
  tempSelectedSystem: string
  tempSelectedShade: string
}

export interface ConversionModalActions {
  onClose: () => void
  onConfirm: (shadeSystem: string, individualShade: string) => void
  onLiveUpdate?: (shadeSystem: string, individualShade: string) => void
  onSystemChange: (systemName: string) => void
  onShadeChange: (shadeName: string) => void
  onSliderChange: (percentage: number) => void
  onPerformColorMatch: (color: string) => void
  onSelectConversionMatch: (match: ConversionMatch) => void
  onSelectColorMatch: (match: ConversionMatch) => void
  onPerformShadeConversion?: (systemName: string, shadeName: string) => void
  onTabChange: (tab: 'shade' | 'colorPicker') => void
  getAvailableShades: () => any[]
}

export interface ConversionModalData {
  apiShadeSystems: ShadeSystem[]
  isLoadingShadeSystems: boolean
  shadeSystemsError: any
  apiConversionResults: ConversionMatch[]
  apiColorMatchResults: ConversionMatch[]
  isLoadingConversion: boolean
  isLoadingColorMatch: boolean
  conversionError: string | null
  colorMatchError: string | null
}

export interface ConversionModalProps {
  state: ConversionModalState
  actions: ConversionModalActions
  data: ConversionModalData
}
