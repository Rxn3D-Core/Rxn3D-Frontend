"use client"

import React, { useEffect, useMemo, useState } from "react"
import { X, Maximize2, Minimize2, RotateCcw, ArrowLeftRight, Loader2, RefreshCw } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Image from "next/image"
import { TeethShadeGuideImage } from "./teeth-shade-guide-image"
import { shadeApiService, ShadeMatch as ApiShadeMatch, ShadeConversionRequest, TeethShadeColorMatchRequest } from "@/services/shade-api-service"
import { useProductTeethShades, useProductGumShades } from "@/hooks/use-product-data"
import { useTeethShadeSelectionStore } from "@/stores/teeth-shade-selection-store"
import { useSelectedGumShadeStore } from "@/stores/selected-gum-shade-store"

interface TeethShadeOption {
  id: string
  name: string
  color: string
  group: "OM" | "A" | "B" | "C" | "D"
  position: number
  x: number
  y: number
  width: number
  height: number
}

interface GumShadeOption {
  id: string
  name: string
  color: string
  group: "A" | "B" | "C" | "D" | "E" | "F"
  position: number
  x: number
  y: number
  width: number
  height: number
}

interface TeethShadeSystem {
  id: string
  name: string
  shades: TeethShadeOption[]
}

interface GumShadeSystem {
  id: string
  name: string
  shades: GumShadeOption[]
}

interface ShadeMatch {
  shadeId: string
  matchPercentage: number
  system: string
}

interface TeethShadeSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (shadeSystem: string, individualShade: string) => void
  onLiveUpdate?: (shadeSystem: string, individualShade: string) => void
  onShadeGuideClick?: (shadeId: string) => void
  initialShadeSystem?: string
  initialIndividualShade?: string
  isInitialLoad?: boolean
  type?: 'teeth' | 'gum'
  productId?: number
  customerId?: number
  autoOpenShadeMatching?: boolean
  modalId?: string // Add unique identifier for debugging
  arch?: 'maxillary' | 'mandibular' // Add arch prop for gum shade updates
}

// Enhanced shade systems with more accurate data
const teethShadeSystems: TeethShadeSystem[] = [
  {
    id: "vita-classical",
    name: "VITA Classical",
    shades: [
      // OM Shades (left guide)
      { id: "OM1", name: "OM1", color: "#F8F3EB", group: "OM", position: 1, x: 70, y: 80, width: 40, height: 120 },
      { id: "OM2", name: "OM2", color: "#F5F0E8", group: "OM", position: 2, x: 130, y: 80, width: 40, height: 120 },
      { id: "OM3", name: "OM3", color: "#F2EDE5", group: "OM", position: 3, x: 190, y: 80, width: 40, height: 120 },

      // A Shades (yellowish-reddish)
      { id: "A1", name: "A1", color: "#F5F0E8", group: "A", position: 4, x: 320, y: 80, width: 35, height: 100 },
      { id: "A2", name: "A2", color: "#F2EDE5", group: "A", position: 5, x: 365, y: 80, width: 35, height: 100 },
      { id: "A3", name: "A3", color: "#EFEBE2", group: "A", position: 6, x: 410, y: 80, width: 35, height: 100 },
      { id: "A3.5", name: "A3.5", color: "#EDE9E0", group: "A", position: 7, x: 455, y: 80, width: 35, height: 100 },
      { id: "A4", name: "A4", color: "#EBE7DE", group: "A", position: 8, x: 500, y: 80, width: 35, height: 100 },

      // B Shades (yellowish)
      { id: "B1", name: "B1", color: "#F3F0E9", group: "B", position: 9, x: 320, y: 200, width: 35, height: 100 },
      { id: "B2", name: "B2", color: "#F0EDE6", group: "B", position: 10, x: 365, y: 200, width: 35, height: 100 },
      { id: "B3", name: "B3", color: "#EDEBE4", group: "B", position: 11, x: 410, y: 200, width: 35, height: 100 },
      { id: "B4", name: "B4", color: "#EAE8E1", group: "B", position: 12, x: 455, y: 200, width: 35, height: 100 },

      // C Shades (grayish)
      { id: "C1", name: "C1", color: "#F4F1EA", group: "C", position: 13, x: 320, y: 320, width: 35, height: 100 },
      { id: "C2", name: "C2", color: "#F1EEE7", group: "C", position: 14, x: 365, y: 320, width: 35, height: 100 },
      { id: "C3", name: "C3", color: "#EEECE5", group: "C", position: 15, x: 410, y: 320, width: 35, height: 100 },
      { id: "C4", name: "C4", color: "#EBEAE3", group: "C", position: 16, x: 455, y: 320, width: 35, height: 100 },

      // D Shades (reddish-gray)
      { id: "D2", name: "D2", color: "#F0EEE7", group: "D", position: 17, x: 320, y: 440, width: 35, height: 100 },
      { id: "D3", name: "D3", color: "#EDECE5", group: "D", position: 18, x: 365, y: 440, width: 35, height: 100 },
      { id: "D4", name: "D4", color: "#EAEAE3", group: "D", position: 19, x: 410, y: 440, width: 35, height: 100 },
    ]
  },
  {
    id: "ivoclar-chromascop",
    name: "Ivoclar Chromascop",
    shades: [
      { id: "110", name: "110", color: "#F8F4EC", group: "A", position: 1, x: 50, y: 100, width: 60, height: 80 },
      { id: "120", name: "120", color: "#F5F1E9", group: "A", position: 2, x: 120, y: 100, width: 60, height: 80 },
      { id: "130", name: "130", color: "#F2EEE6", group: "A", position: 3, x: 190, y: 100, width: 60, height: 80 },
      { id: "140", name: "140", color: "#EFEBE3", group: "A", position: 4, x: 260, y: 100, width: 60, height: 80 },
      { id: "210", name: "210", color: "#F6F2EA", group: "B", position: 5, x: 50, y: 200, width: 60, height: 80 },
      { id: "220", name: "220", color: "#F3EFE7", group: "B", position: 6, x: 120, y: 200, width: 60, height: 80 },
      { id: "230", name: "230", color: "#F0ECE4", group: "B", position: 7, x: 190, y: 200, width: 60, height: 80 },
      { id: "240", name: "240", color: "#EDE9E1", group: "B", position: 8, x: 260, y: 200, width: 60, height: 80 },
    ]
  },
  {
    id: "3d-master",
    name: "VITA 3D-Master",
    shades: [
      { id: "1M1", name: "1M1", color: "#F7F3EB", group: "OM", position: 1, x: 50, y: 80, width: 50, height: 90 },
      { id: "1M2", name: "1M2", color: "#F4F0E8", group: "OM", position: 2, x: 110, y: 80, width: 50, height: 90 },
      { id: "2L1.5", name: "2L1.5", color: "#F5F1E9", group: "A", position: 3, x: 170, y: 80, width: 50, height: 90 },
      { id: "2L2.5", name: "2L2.5", color: "#F2EEE6", group: "A", position: 4, x: 230, y: 80, width: 50, height: 90 },
      { id: "2M1", name: "2M1", color: "#F3EFE7", group: "B", position: 5, x: 50, y: 180, width: 50, height: 90 },
      { id: "2M2", name: "2M2", color: "#F0ECE4", group: "B", position: 6, x: 110, y: 180, width: 50, height: 90 },
      { id: "2M3", name: "2M3", color: "#EDE9E1", group: "B", position: 7, x: 170, y: 180, width: 50, height: 90 },
      { id: "2R1.5", name: "2R1.5", color: "#F1EDE5", group: "C", position: 8, x: 230, y: 180, width: 50, height: 90 },
    ]
  },
]

// Gum shade systems data
const gumShadeSystems: GumShadeSystem[] = [
  {
    id: "st-george",
    name: "St. George",
    shades: [
      { id: "Light Vein", name: "Light Vein", color: "#F5E6D3", group: "A", position: 1, x: 50, y: 50, width: 60, height: 40 },
      { id: "Medium Vein", name: "Medium Vein", color: "#E8D5C4", group: "A", position: 2, x: 120, y: 50, width: 60, height: 40 },
      { id: "Dark Vein", name: "Dark Vein", color: "#D4C4B0", group: "A", position: 3, x: 190, y: 50, width: 60, height: 40 },
    ]
  },
  {
    id: "ivoclar-gum",
    name: "Ivoclar Gum",
    shades: [
      { id: "Light Pink", name: "Light Pink", color: "#F7D7D7", group: "B", position: 1, x: 50, y: 120, width: 60, height: 40 },
      { id: "Medium Pink", name: "Medium Pink", color: "#E8B8B8", group: "B", position: 2, x: 120, y: 120, width: 60, height: 40 },
      { id: "Dark Pink", name: "Dark Pink", color: "#D99999", group: "B", position: 3, x: 190, y: 120, width: 60, height: 40 },
    ]
  },
  {
    id: "vita-gum",
    name: "VITA Gum",
    shades: [
      { id: "Light Coral", name: "Light Coral", color: "#F7C5A0", group: "C", position: 1, x: 50, y: 190, width: 60, height: 40 },
      { id: "Medium Coral", name: "Medium Coral", color: "#E8A87A", group: "C", position: 2, x: 120, y: 190, width: 60, height: 40 },
      { id: "Dark Coral", name: "Dark Coral", color: "#D98B54", group: "C", position: 3, x: 190, y: 190, width: 60, height: 40 },
      { id: "Light Red", name: "Light Red", color: "#F7A0A0", group: "D", position: 4, x: 50, y: 260, width: 60, height: 40 },
      { id: "Medium Red", name: "Medium Red", color: "#E87A7A", group: "D", position: 5, x: 120, y: 260, width: 60, height: 40 },
      { id: "Dark Red", name: "Dark Red", color: "#D95454", group: "D", position: 6, x: 190, y: 260, width: 60, height: 40 },
      { id: "Light Brown", name: "Light Brown", color: "#D4B896", group: "E", position: 7, x: 50, y: 330, width: 60, height: 40 },
      { id: "Medium Brown", name: "Medium Brown", color: "#C4A076", group: "E", position: 8, x: 120, y: 330, width: 60, height: 40 },
      { id: "Dark Brown", name: "Dark Brown", color: "#B49056", group: "E", position: 9, x: 190, y: 330, width: 60, height: 40 },
      { id: "Light Gray", name: "Light Gray", color: "#E0E0E0", group: "F", position: 10, x: 50, y: 400, width: 60, height: 40 },
      { id: "Medium Gray", name: "Medium Gray", color: "#C0C0C0", group: "F", position: 11, x: 120, y: 400, width: 60, height: 40 },
      { id: "Dark Gray", name: "Dark Gray", color: "#A0A0A0", group: "F", position: 12, x: 190, y: 400, width: 60, height: 40 },
    ]
  }
]

// Shade matching algorithm - generic version for both teeth and gum shades
const calculateShadeMatch = (sourceShade: TeethShadeOption | GumShadeOption, targetSystem: TeethShadeSystem | GumShadeSystem): ShadeMatch[] => {
  return targetSystem.shades.map(shade => {
    // Simple color similarity calculation (in a real app, this would be more sophisticated)
    const sourceRgb = hexToRgb(sourceShade.color)
    const targetRgb = hexToRgb(shade.color)

    if (!sourceRgb || !targetRgb) return { shadeId: shade.id, matchPercentage: 0, system: targetSystem.name }

    const distance = Math.sqrt(
      Math.pow(sourceRgb.r - targetRgb.r, 2) +
      Math.pow(sourceRgb.g - targetRgb.g, 2) +
      Math.pow(sourceRgb.b - targetRgb.b, 2)
    )

    const maxDistance = Math.sqrt(3 * Math.pow(255, 2))
    const similarity = 1 - (distance / maxDistance)
    const matchPercentage = Math.round(similarity * 100)

    return { shadeId: shade.id, matchPercentage, system: targetSystem.name }
  }).sort((a, b) => b.matchPercentage - a.matchPercentage)
}

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

export const TeethShadeSelectionModal = React.memo(function TeethShadeSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  onLiveUpdate,
  onShadeGuideClick,
  initialShadeSystem,
  initialIndividualShade,
  isInitialLoad = false,
  type = 'teeth',
  productId,
  customerId,
  autoOpenShadeMatching = false,
  modalId = 'unknown',
  arch
}: TeethShadeSelectionModalProps) {
  // Local state for manual tab changes
  const [isManualTabChange, setIsManualTabChange] = useState(false)
  
  // State for preferred brand
  const [preferredBrand, setPreferredBrand] = useState<{
    id: number
    name: string
    system_name: string
    status: string
    sequence: number
    translations: any[]
  } | null>(null)
  const [preferredShades, setPreferredShades] = useState<Array<{
    name: string
    color: string
    id?: number
    system_name?: string | null
  }>>([])
  const [loadingPreferredBrand, setLoadingPreferredBrand] = useState(false)

  // Zustand store
  const {
    // Modal state
    isMaximized,

    // Shade selection state
    selectedShadeSystem,
    selectedIndividualShade,
    secondaryShadeSystem,
    hoveredShade,
    activeTab,

    // Color picker state
    sliderPosition,
    selectedCustomColor,

    // API integration state
    apiColorMatchResults,
    isLoadingColorMatch,
    colorMatchError,

    // Actions
    setIsMaximized,
    setSelectedShadeSystem,
    setSelectedIndividualShade,
    setSecondaryShadeSystem,
    setHoveredShade,
    setActiveTab,
    setSliderPosition,
    setSelectedCustomColor,
    setApiColorMatchResults,
    setIsLoadingColorMatch,
    setColorMatchError,
    setType,
    setProductId,
    setAutoOpenShadeMatching,
    resetModal,
    resetSelection,
    resetApiState,
    getDefaultShadeSystem,
    getDefaultIndividualShade,
    getDefaultSecondaryShadeSystem,
  } = useTeethShadeSelectionStore()

  // Zustand gum shade store
  const { updateGumShade, selectedGumShade } = useSelectedGumShadeStore()
  
  // Set default values based on type
  const defaultShadeSystem = getDefaultShadeSystem()
  const defaultIndividualShade = getDefaultIndividualShade()

  // Use appropriate API hook based on type - only when modal is open
  const { data: teethShadeSystems = [], isLoading: isLoadingTeethShades, error: teethShadeSystemsError } = useProductTeethShades(isOpen && type === 'teeth' ? productId || null : null)
  const { data: gumShadeSystems = [], isLoading: isLoadingGumShades, error: gumShadeSystemsError } = useProductGumShades(isOpen && type === 'gum' ? productId || null : null)

  // Debug API calls - only when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log(`🔍 API Debug - Modal opened [${modalId}]:`, { 
        modalId,
        isOpen, 
        type, 
        productId, 
        shouldFetchTeeth: type === 'teeth' && !!productId,
        shouldFetchGum: type === 'gum' && !!productId,
        teethShadeSystems: teethShadeSystems.length,
        gumShadeSystems: gumShadeSystems.length,
        isLoadingTeethShades,
        isLoadingGumShades,
        teethShadeSystemsError,
        gumShadeSystemsError
      })
    }
  }, [isOpen, modalId]) // Include modalId in dependencies

  // Use the appropriate data based on type
  const apiShadeSystems = type === 'gum' ? gumShadeSystems : teethShadeSystems
  const isLoadingShadeSystems = type === 'gum' ? isLoadingGumShades : isLoadingTeethShades
  const shadeSystemsError = type === 'gum' ? gumShadeSystemsError : teethShadeSystemsError

  // Initialize store configuration
  useEffect(() => {
    setType(type)
    setProductId(productId)
    setAutoOpenShadeMatching(autoOpenShadeMatching)
  }, [type, productId, autoOpenShadeMatching, setType, setProductId, setAutoOpenShadeMatching])

  // Update initial values when API data loads (separate from modal open/close)
  useEffect(() => {
    if (apiShadeSystems.length > 0 && !initialShadeSystem) {
      // No initial system provided, use first system from API
      const firstSystem = apiShadeSystems[0]
      const firstShade = firstSystem.shades?.[0]?.name || defaultIndividualShade

      // Use system_name if available, otherwise fall back to name
      const systemName = (firstSystem as any).system_name || firstSystem.name
      setSelectedShadeSystem(systemName)
      setSelectedIndividualShade(firstShade)
    }
  }, [apiShadeSystems, initialShadeSystem, defaultIndividualShade, setSelectedShadeSystem, setSelectedIndividualShade])

  // Helper function to get current shade system from API data
  const getCurrentShadeSystem = () => {
    if (apiShadeSystems.length === 0) return null
    // Try to match by system_name first, then by name (brand)
    const foundSystem = apiShadeSystems.find(system =>
      (system as any).system_name === selectedShadeSystem || system.name === selectedShadeSystem
    )
  
    return foundSystem || null
  }

  // Helper function to get available shades for current system
  const getAvailableShades = () => {
    const currentSystem = getCurrentShadeSystem()
    
    if (!currentSystem?.shades) {
      return []
    }

    // For gum shades, we need to add color information since API doesn't provide it
    if (type === 'gum') {
      const gumShades = currentSystem.shades.map((shade: any) => ({
        id: shade.id.toString(),
        name: shade.name,
        color: getGumShadeColor(shade.name), // Generate color based on shade name
        group: getGumShadeGroup(shade.name),
        position: shade.sequence,
        x: 0, y: 0, width: 0, height: 0 // These will be set by the visual guide
      }))
      return gumShades
    }

    return currentSystem.shades || []
  }

  // Helper function to get color for gum shade based on name
  const getGumShadeColor = (shadeName: string): string => {
    const colorMap: Record<string, string> = {
      // GC America
      'G-Light': '#F7D7D7',
      'G-Dark': '#D99999',
      'G-Intense': '#C47A7A',
      'G-Red': '#E87A7A',
      'G-Violet': '#B8A0D4',
      'G-Mask': '#A0A0A0',
      'G-Orange': '#F7A87A',
      'G-Brown': '#D4B896',

      // Ivoclar Vivadent (GINGIVA)
      'G1': '#F7D7D7',
      'G2': '#E8B8B8',
      'G3': '#D99999',
      'G4': '#C47A7A',
      'G5': '#B85A5A',

      // Kuraray Noritake
      'GP1': '#F7D7D7',
      'GP2': '#E8B8B8',
      'GP3': '#D99999',
      'GE1': '#F7C5A0',
      'GE2': '#E8A87A',

      // Shofu Dental
      'GP': '#F7D7D7',
      'GR': '#E87A7A',
      'GY': '#D4B896',
      'GW': '#F5F0E8',

      // St. George
      'Light Pink': '#F7D7D7',
      'Standard Pink': '#E8B8B8',
      'Dark Pink': '#D99999',
      'Reddish Pink': '#E87A7A',

      // TCS
      'TCS Pink': '#E8B8B8',
      'TCS Light Pink': '#F7D7D7',
      'TCS Medium': '#D99999',
      'TCS Dark (Meharry)': '#B85A5A',
      'TCS Translucent': '#F5F0E8',

      // VITA Zahnfabrik
      'VITA-G2': '#E8B8B8',
      'VITA-G3': '#D99999',
      'VITA-G4': '#C47A7A',
      'VITA-G5': '#B85A5A',

      // Dentsply Trubyte
      'Original': '#E8B8B8',
      'Light': '#F7D7D7',
      'Light Reddish Pink': '#F7A87A',
      'Dentsply Dark Pink': '#D99999',

      // Ivoclar Vivadent (IVOCAP_PLUS)
      'Pink': '#E8B8B8',
      'Fibered Light Pink': '#F7D7D7',
      'Fibered Pink': '#D99999',
      'Preference': '#C47A7A',

      // Ivoclar Vivadent (IPS_GINGIVA)
      'IPS-G1': '#F7D7D7',
      'IPS-G2': '#E8B8B8',
      'IPS-G3': '#D99999',
      'IPS-G4': '#C47A7A',
      'IPS-G5': '#B85A5A'
    }

    return colorMap[shadeName] || '#F7D7D7' // Default light pink
  }

  // Helper function to get group for gum shade based on name
  const getGumShadeGroup = (shadeName: string): string => {
    // Group shades by system for better organization
    if (shadeName.startsWith('G-') || shadeName === 'G-Light' || shadeName === 'G-Dark') return 'GC'
    if (shadeName.startsWith('GP') || shadeName.startsWith('GE')) return 'NORITAKE'
    if (shadeName === 'GP' || shadeName === 'GR' || shadeName === 'GY' || shadeName === 'GW') return 'SHOFU'
    if (shadeName.includes('Light Pink') || shadeName.includes('Standard Pink') || shadeName.includes('Dark Pink') || shadeName.includes('Reddish Pink')) return 'ST_GEORGE'
    if (shadeName.startsWith('TCS')) return 'TCS'
    if (shadeName === 'Original' || shadeName === 'Light' || shadeName.includes('Reddish Pink') || shadeName.includes('Dark Pink')) return 'DENTSPLY'
    if (shadeName === 'Pink' || shadeName.includes('Fibered') || shadeName === 'Preference') return 'IVOCAP'
    return 'VITA'
  }

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      // Check store type BEFORE setting it, to determine if we should reset
      // This prevents gum shade modal from interfering with teeth shade modal state
      // Since both modals share the store, we need to be careful about resets
      const store = useTeethShadeSelectionStore.getState()
      const currentStoreType = store.type
      
      // Now set the type and other config
      setType(type)
      setProductId(productId)
      setAutoOpenShadeMatching(autoOpenShadeMatching)
      
      // Only reset selection if this modal's type matches what was in the store,
      // or if store was empty/unset. This prevents cross-modal interference.
      if (!currentStoreType || currentStoreType === type) {
        resetSelection()
        resetApiState()
      } else {
        // Opening a different type modal - only reset API state, preserve selection
        // to avoid interfering with the other modal's display
        resetApiState()
      }

      // Convert system ID to system name if needed
      const convertSystemIdToName = (systemId: string): string => {
        // Static system mapping - doesn't depend on API data
        const systemMap: Record<string, string> = {
          'vita-classical': 'VITA Zahnfabrik',
          'ivoclar-chromascop': 'Ivoclar Vivadent',
          'st-george': 'St. George',
          'ivoclar-gum': 'Ivoclar Gum',
          'vita-gum': 'VITA Gum'
        }
        return systemMap[systemId] || systemId
      }

      // Always set the selected shade system and individual shade based on initial values
      // This ensures the modal shows the correct initial state
      setSelectedShadeSystem(convertSystemIdToName(initialShadeSystem || defaultShadeSystem))
      setSelectedIndividualShade(initialIndividualShade || defaultIndividualShade)
      setHoveredShade(null)
      setActiveTab('shade')

      // Always start with the main shade guide modal
    }
  }, [isOpen, initialShadeSystem, initialIndividualShade, autoOpenShadeMatching, defaultShadeSystem, defaultIndividualShade, resetSelection, resetApiState, type, productId, setType, setProductId, setAutoOpenShadeMatching, setSelectedShadeSystem, setSelectedIndividualShade, setHoveredShade, setActiveTab])

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey)
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isOpen, onClose])

  const shadeSystems = type === 'gum' ? gumShadeSystems : teethShadeSystems

  const currentSystem = useMemo(() =>
    shadeSystems.find(system => system.name === selectedShadeSystem),
    [selectedShadeSystem, shadeSystems]
  )

  const secondarySystem = useMemo(() =>
    shadeSystems.find(system => system.name === secondaryShadeSystem),
    [secondaryShadeSystem, shadeSystems]
  )

  const selectedShade = useMemo(() => {
    const shade = currentSystem?.shades?.find(shade =>
      shade.id.toString() === selectedIndividualShade ||
      shade.name === selectedIndividualShade
    )
    if (type === 'gum') {
      console.log('🎨 Selected shade lookup:', {
        selectedIndividualShade,
        currentSystemName: currentSystem?.name,
        foundShade: shade,
        foundShadeColor: (shade as any)?.color_code_middle || (shade as any)?.color,
        allShades: currentSystem?.shades?.map(s => ({ id: s.id, name: s.name, color: (s as any)?.color_code_middle || (s as any)?.color }))
      })
    }
    return shade
  }, [currentSystem, selectedIndividualShade, type])

  // Debug: Log selected shade changes for gum type
  useEffect(() => {
    if (type === 'gum' && selectedShade) {
      console.log('🎨 Selected shade changed:', {
        name: selectedShade.name,
        id: selectedShade.id,
        color: (selectedShade as any)?.color_code_middle || (selectedShade as any)?.color,
        fullShade: selectedShade
      })
    }
  }, [selectedShade, type])

  // Trigger color match when custom color changes
  useEffect(() => {
    if (selectedCustomColor && activeTab === 'colorPicker') {
      performColorMatch(selectedCustomColor)
    }
  }, [selectedCustomColor, activeTab])

  // Fetch preferred brand when component mounts
  useEffect(() => {
    const fetchPreferredBrand = async () => {
      if (customerId) {
        console.log(`🔍 Fetching preferred brand for modal [${modalId}]:`, { type, customerId })
        setLoadingPreferredBrand(true)
        try {
          if (type === 'teeth') {
            const response = await shadeApiService.getPreferredTeethShades({ customer_id: customerId })
            console.log(`🔍 Preferred teeth brand response for modal [${modalId}]:`, response)
            if (response.data.preferred_brand) {
              setPreferredBrand(response.data.preferred_brand)
              // Convert preferred shades to the format expected by the component
              const shades = response.data.shades.map(shade => ({
                name: shade.name,
                color: '#FFFFFF', // Default color, could be enhanced with actual color data
                id: shade.id,
                system_name: shade.system_name
              }))
              setPreferredShades(shades)
              console.log(`🔍 Set preferred teeth brand for modal [${modalId}]:`, { brand: response.data.preferred_brand, shadesCount: shades.length })
            }
          } else if (type === 'gum') {
            const response = await shadeApiService.getPreferredGumShades({ customer_id: customerId })
            console.log(`🔍 Preferred gum brand response for modal [${modalId}]:`, response)
            if (response.data.preferred_brand) {
              setPreferredBrand(response.data.preferred_brand)
              // Convert preferred shades to the format expected by the component
              // Use color_code_middle from API response for the actual color
              // Preserve color_code_middle for direct access if needed
              const shades = response.data.shades.map((shade: any) => ({
                name: shade.name,
                color: shade.color_code_middle || getGumShadeColor(shade.name), // Use API color or fallback
                color_code_middle: shade.color_code_middle, // Preserve original for direct access
                color_code_top: shade.color_code_top,
                color_code_bottom: shade.color_code_bottom,
                id: shade.id,
                system_name: shade.system_name,
                sequence: shade.sequence
              }))
              setPreferredShades(shades)
              console.log(`🔍 Set preferred gum brand for modal [${modalId}]:`, { brand: response.data.preferred_brand, shadesCount: shades.length, shades })
            } else {
              // Set fallback brand for gum when no preferred brand is returned
              console.log(`🔍 No preferred gum brand found for modal [${modalId}], using fallback`)
              setPreferredBrand({
                id: 0,
                name: 'GC Initial Gingiva',
                system_name: 'gc_initial_gingiva',
                status: 'Active',
                sequence: 0,
                translations: []
              })
            }
          }
        } catch (error) {
          console.error(`Failed to fetch preferred brand for modal [${modalId}]:`, error)
          // Set fallback brand for gum on error
          if (type === 'gum') {
            console.log(`🔍 Error fetching gum brand for modal [${modalId}], using fallback`)
            setPreferredBrand({
              id: 0,
              name: 'GC Initial Gingiva',
              system_name: 'gc_initial_gingiva',
              status: 'Active',
              sequence: 0,
              translations: []
            })
          }
        } finally {
          setLoadingPreferredBrand(false)
        }
      } else {
        console.log(`🔍 Skipping preferred brand fetch for modal [${modalId}]:`, { type, customerId, reason: 'no customerId' })
        // Set fallback brand for gum when no customerId
        if (type === 'gum') {
          setPreferredBrand({
            id: 0,
            name: 'GC Initial Gingiva',
            system_name: 'gc_initial_gingiva',
            status: 'Active',
            sequence: 0,
            translations: []
          })
        }
      }
    }

    fetchPreferredBrand()
  }, [type, customerId, modalId])

  // Reset manual change flag when selectedShadeSystem changes from conversion modal
  useEffect(() => {
    if (selectedShadeSystem) {
      setIsManualTabChange(false)
    }
  }, [selectedShadeSystem])

  const shadeMatches = useMemo(() => {
    if (!selectedShade || !secondarySystem) return []
    // Convert API shade to TeethShadeOption format for compatibility
    const convertedShade = {
      id: selectedShade.id.toString(),
      name: selectedShade.name,
      color: (selectedShade as any).color || '#F5F0E8',
      group: 'A' as const,
      position: 1,
      x: 0,
      y: 0,
      width: 0,
      height: 0
    }
    return calculateShadeMatch(convertedShade, secondarySystem as any)
  }, [selectedShade, secondarySystem])

  const bestMatch = shadeMatches[0]

  const handleShadeClick = (shadeIdOrName: string) => {
    console.log('🎯 handleShadeClick called:', { shadeIdOrName, type, currentSystem: currentSystem?.name })
    
    // Find the matching shade from the current system to get both ID and name
    let actualShadeId = shadeIdOrName
    let actualShadeName = shadeIdOrName

    if (currentSystem?.shades) {
      const matchingShade = currentSystem.shades.find(
        (shade: any) => shade.name === shadeIdOrName || shade.id.toString() === shadeIdOrName
      )
      if (matchingShade) {
        actualShadeId = matchingShade.id.toString()
        actualShadeName = matchingShade.name
      }
    }

    setSelectedIndividualShade(actualShadeId)

    // Use preferred brand name if available, otherwise fall back to selected shade system
    const brandNameToUse = preferredBrand?.name || selectedShadeSystem

    console.log('🎯 Shade clicked, calling live update and confirm:', {
      selectedShadeSystem,
      preferredBrandName: preferredBrand?.name,
      brandNameToUse,
      actualShadeId,
      actualShadeName,
      hasOnLiveUpdate: !!onLiveUpdate,
      hasOnConfirm: !!onConfirm,
      type,
      arch,
      productId
    })

    // Update gum shade store when gum shade is selected
    if (type === 'gum' && productId && arch) {
      console.log('🎯 Updating gum shade store:', {
        productId: productId.toString(),
        arch,
        brandName: brandNameToUse,
        shadeName: actualShadeName
      })
      updateGumShade(productId.toString(), arch, brandNameToUse, actualShadeName)
    }

    // Trigger live update when shade is selected - use preferred brand name and shade name
    if (onLiveUpdate) {
      onLiveUpdate(brandNameToUse, actualShadeName)
    }

    // Directly confirm the selection and close the modal - use preferred brand name and shade name
    if (onConfirm) {
      // For gum shades, we need to pass the preferred brand ID as well
      if (type === 'gum' && preferredBrand?.id) {
        // Pass the brand ID as part of the shade system parameter
        onConfirm(`${brandNameToUse}|${preferredBrand.id}`, actualShadeName)
      } else {
        onConfirm(brandNameToUse, actualShadeName)
      }
    }

    // If custom shade guide click handler is provided, also call it
    if (onShadeGuideClick) {
      onShadeGuideClick(actualShadeId)
    }

    // Close the modal immediately after shade selection for gum shades
    if (type === 'gum') {
      console.log('🎯 Closing gum shade modal after selection:', { type, hasOnClose: !!onClose })
      onClose()
    }
  }

  // Handle live updates when system or shade changes
  const handleSystemChange = (systemName: string) => {
    setSelectedShadeSystem(systemName)

    // Reset to first shade of new system using API data
    const newSystem = apiShadeSystems.find(s => s.name === systemName)
    const firstShade = newSystem?.shades?.[0]?.name || (type === 'gum' ? "Light Vein" : "A1")
    setSelectedIndividualShade(firstShade)

    // Use preferred brand name if available
    const brandNameToUse = preferredBrand?.name || systemName

    // Trigger live update
    if (onLiveUpdate) {
      onLiveUpdate(brandNameToUse, firstShade)
    }
  }

  const handleShadeChange = (shadeName: string) => {
    setSelectedIndividualShade(shadeName)

    // Use preferred brand name if available
    const brandNameToUse = preferredBrand?.name || selectedShadeSystem

    // Trigger live update
    if (onLiveUpdate) {
      onLiveUpdate(brandNameToUse, shadeName)
    }
  }

  const handleConfirm = () => {
    // Use preferred brand name if available
    const brandNameToUse = preferredBrand?.name || selectedShadeSystem
    onConfirm(brandNameToUse, selectedIndividualShade)
    onClose()
  }

  const handleCloseSelectionModal = () => {
    // This function is no longer needed since we removed the conversion modal
    // The main modal handles closing directly
  }

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized)
  }

  const handleSliderChange = (percentage: number) => {
    setSliderPosition(percentage)
    // Calculate color based on slider position
    const baseColor = (selectedShade as any)?.color || '#F5F0E8'
    const adjustedColor = adjustColorBrightness(baseColor, (percentage - 50) / 50)
    setSelectedCustomColor(adjustedColor)

    // Trigger live update with custom color
    if (onLiveUpdate) {
      onLiveUpdate(selectedShadeSystem, selectedIndividualShade)
    }
  }

  const adjustColorBrightness = (color: string, factor: number): string => {
    const rgb = hexToRgb(color)
    if (!rgb) return color

    const adjust = (value: number) => {
      const adjusted = Math.round(value * (1 + factor * 0.3))
      return Math.max(0, Math.min(255, adjusted))
    }

    const newRgb = {
      r: adjust(rgb.r),
      g: adjust(rgb.g),
      b: adjust(rgb.b)
    }

    return `#${newRgb.r.toString(16).padStart(2, '0')}${newRgb.g.toString(16).padStart(2, '0')}${newRgb.b.toString(16).padStart(2, '0')}`
  }

  // API integration functions

  const performColorMatch = async (color: string) => {
    setIsLoadingColorMatch(true)
    setColorMatchError(null)

    try {
      const request: TeethShadeColorMatchRequest = {
        color: color,
        limit: 10
      }

      const response = type === 'gum'
        ? await shadeApiService.matchGumShadeColor(request)
        : await shadeApiService.matchTeethShadeColor(request)

      setApiColorMatchResults(response.data)
    } catch (err) {
      setColorMatchError(err instanceof Error ? err.message : 'Failed to match color')
      setApiColorMatchResults([])
    } finally {
      setIsLoadingColorMatch(false)
    }
  }

  // Helper function to get brand name from system ID
  const getBrandNameFromSystemId = (systemId: string): string => {
    const systemMap: Record<string, string> = {
      'vita-classical': 'VITA Zahnfabrik',
      'ivoclar-chromascop': 'Ivoclar Vivadent',
      'st-george': 'St. George',
      'ivoclar-gum': 'Ivoclar Gum',
      'vita-gum': 'VITA Gum'
    }
    return systemMap[systemId] || 'VITA Zahnfabrik'
  }


  return (
    <>
      {/* Main Shade Reference Guide Modal */}
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}>
        <DialogContent
          className={`p-0 gap-0 flex flex-col ${isMaximized ? "w-[95vw] h-[95vh] max-w-[95vw]" : "sm:max-w-[1400px] max-h-[95vh]"
            } overflow-visible bg-[#F5F5F5] rounded-lg shadow-xl`}
        >
          <DialogTitle className="sr-only">
            {type === 'gum' ? 'Gum Shade Guide' : 'Teeth Shade Guide'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {type === 'gum' ? 'Select a gum shade for your dental case' : 'Select a teeth shade for your dental case'}
          </DialogDescription>
          <div className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {type === 'gum' ? 'Gum Shade Guide' : 'Teeth Shade Guide'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleMaximize} className="h-9 w-9 hover:bg-gray-200">
                {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-9 w-9 hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-visible">
            <div className="p-3 sm:p-4 h-full flex flex-col">
              <div className="max-w-6xl mx-auto w-full">
                {/* Brand Name Display - Show for both teeth and gum */}
                {preferredBrand && (
                  <div className="text-left mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">{preferredBrand.name}</h3>
                  </div>
                )}

                {/* Loading State */}
                {loadingPreferredBrand && (
                  <div className="text-left mb-3">
                    <div className="text-sm text-gray-500">Loading preferred brand...</div>
                  </div>
                )}

                {/* Interactive Shade Guide */}
                <div className="relative mx-auto overflow-visible flex justify-center items-center">
                <TeethShadeGuideImage
                      onShadeClick={handleShadeClick}
                      onShadeConfirm={handleConfirm}
                      hoveredShade={hoveredShade}
                      onShadeHover={setHoveredShade}
                      type={type}
                      selectedShade={selectedShade?.name}
                      selectedShadeColor={type === 'gum' && selectedShade ? ((selectedShade as any).color_code_middle || (selectedShade as any).color || getGumShadeColor(selectedShade.name)) : undefined}
                      productId={productId}
                      arch={type === 'gum' ? arch : undefined}
                      gumShadeSystems={type === 'gum' ? (apiShadeSystems as any) : undefined}
                      preferredBrand={preferredBrand}
                      preferredShades={preferredShades}
                      loading={loadingPreferredBrand}
                    />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})

export default TeethShadeSelectionModal