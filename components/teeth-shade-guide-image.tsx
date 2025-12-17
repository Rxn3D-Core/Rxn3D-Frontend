"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSelectedGumShadeStore } from "@/stores/selected-gum-shade-store"
import TeethShadeGuide from "./teeth-shade-guide"
import { shadeApiService, PreferredGumShadesResponse } from "@/services/shade-api-service"
import { useAuth } from "@/contexts/auth-context"

interface TeethShadeGuideImageProps {
  className?: string
  onShadeClick?: (shadeId: string) => void
  onShadeConfirm?: (shadeId: string) => void
  hoveredShade?: string | null
  onShadeHover?: (shadeId: string | null) => void
  type?: 'teeth' | 'gum'
  selectedShade?: string | null
  selectedShadeColor?: string
  showInstructions?: boolean
  productId?: number
  arch?: 'maxillary' | 'mandibular'
  gumShadeSystems?: Array<{
    id: number
    name: string
    system_name: string
    sequence: number
    shades: Array<{
      id: number
      name: string
      system_name: string | null
      sequence: number
      price: string
      status: string
    }>
  }>
  preferredBrand?: {
    id: number
    name: string
    system_name: string
    status: string
    sequence: number
    translations: any[]
  } | null
  preferredShades?: Array<{
    name: string
    id?: number
    system_name?: string | null
    sequence?: number
    color_code_incisal?: string
    color_code_body?: string
    color_code_cervical?: string
    // Gum shade color codes
    color_code_top?: string
    color_code_middle?: string
    color_code_bottom?: string
    // Legacy support
    color?: string
  }>
  loading?: boolean
  error?: string | null
}

export function TeethShadeGuideImage({
  className = "",
  onShadeClick,
  onShadeConfirm,
  hoveredShade,
  onShadeHover,
  type,
  selectedShade,
  selectedShadeColor,
  showInstructions = true,
  productId,
  arch,
  gumShadeSystems = [],
  preferredBrand,
  preferredShades = [],
  loading = false,
  error = null
}: TeethShadeGuideImageProps) {
  // Mouse position state for tooltip
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [clickedShade, setClickedShade] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // State for preferred gum shades from API
  const [preferredGumShades, setPreferredGumShades] = useState<Array<{
    name: string
    color: string
    id?: number
    system_name?: string | null
  }>>([])
  const [gumShadesLoading, setGumShadesLoading] = useState(false)
  const [gumShadesError, setGumShadesError] = useState<string | null>(null)

  // Get auth context for customer ID
  const { user } = useAuth()

  // Helper function to get customer ID
  const getCustomerId = (): number | null => {
    // First try to get from localStorage (set during login)
    const storedCustomerId = localStorage.getItem("customerId")
    if (storedCustomerId) {
      return parseInt(storedCustomerId, 10)
    }

    // Then try to get from user's customers array
    if (user?.customers && user.customers.length > 0) {
      return user.customers[0].id
    }

    // If user has a customer_id property
    if (user?.customer_id) {
      return user.customer_id
    }

    return null
  }

  // Fetch preferred gum shades only when component is actually needed (type is 'gum' and no preferredShades provided)
  useEffect(() => {
    // Only fetch if:
    // 1. Type is 'gum' (not needed for teeth shades)
    // 2. We don't have preferredShades passed from parent
    // 3. Component is actually being used (not just mounted)
    if (type !== 'gum' || preferredShades.length > 0) {
      return
    }

    const fetchPreferredGumShades = async () => {
      const customerId = getCustomerId()
      if (!customerId) {
        console.warn("No customer ID found for fetching preferred gum shades")
        return
      }

      setGumShadesLoading(true)
      setGumShadesError(null)

      try {
        const response = await shadeApiService.getPreferredGumShades({ customer_id: customerId })

        if (response.data && response.data.shades) {
          console.log('Raw API response shades:', response.data.shades)

          // Transform API response to match component format
          // Use color_code_middle from API response for the circle color
          const transformedShades = response.data.shades.map(shade => {
            console.log('Processing shade:', shade.name, 'color_code_middle:', shade.color_code_middle)
            return {
              name: shade.name,
              color: shade.color_code_middle,
              id: shade.id,
              system_name: shade.system_name
            }
          })

          console.log('Transformed shades:', transformedShades)
          setPreferredGumShades(transformedShades)
        }
      } catch (error) {
        console.error("Failed to fetch preferred gum shades:", error)
        setGumShadesError(error instanceof Error ? error.message : "Failed to fetch gum shades")
      } finally {
        setGumShadesLoading(false)
      }
    }

    fetchPreferredGumShades()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, preferredShades.length])


  // Default static mapping (VITA Classical layout) used as fallback only when no API data
  // Note: OM shades are removed as they don't exist in the API response
  // Updated to match the current SVG filter IDs (604_110231 format)
  const defaultTeethFilterToShadeMap: { [key: string]: string } = {
    'filter0_d_604_110231': 'Bleach',  // First position (was OM2)
    'filter1_d_604_110231': 'A1',
    'filter2_d_604_110231': 'A2',
    'filter3_d_604_110231': 'A3',
    'filter4_d_604_110231': 'A3.5',
    'filter5_d_604_110231': 'A4',
    'filter6_d_604_110231': 'B1',
    'filter7_d_604_110231': 'B2',
    'filter8_d_604_110231': 'B3',
    'filter9_d_604_110231': 'B4',
    'filter10_d_604_110231': 'C1',
    'filter11_d_604_110231': 'C2',
    'filter12_d_604_110231': 'C3',
    'filter13_d_604_110231': 'C4',
    'filter14_d_604_110231': 'D2',
    'filter15_d_604_110231': 'D3',
    'filter16_d_604_110231': 'D4',
    'filter17_d_604_110231': '',  // Unused position
    'filter18_d_604_110231': ''   // Unused position
  }

  // Left-to-right filter order on the SVG to align shades visually
  // This order will be used to map API shades (which come in sequence order)
  // API shades are mapped in their natural sequence: Bleach, A1, A2, A3, A3.5, A4, B1, B2, B3, B4, C1, C2, C3, C4, D2, D3, D4
  const teethFilterIdsInOrder: string[] = [
    'filter0_d_604_110231',  // Position 0 - Bleach (first in API)
    'filter1_d_604_110231',  // Position 1 - A1
    'filter2_d_604_110231',  // Position 2 - A2
    'filter3_d_604_110231',  // Position 3 - A3
    'filter4_d_604_110231',  // Position 4 - A3.5
    'filter5_d_604_110231',  // Position 5 - A4
    'filter6_d_604_110231',  // Position 6 - B1
    'filter7_d_604_110231',  // Position 7 - B2
    'filter8_d_604_110231',  // Position 8 - B3
    'filter9_d_604_110231',  // Position 9 - B4
    'filter10_d_604_110231', // Position 10 - C1
    'filter11_d_604_110231', // Position 11 - C2
    'filter12_d_604_110231', // Position 12 - C3
    'filter13_d_604_110231', // Position 13 - C4
    'filter14_d_604_110231', // Position 14 - D2
    'filter15_d_604_110231', // Position 15 - D3
    'filter16_d_604_110231', // Position 16 - D4
    'filter17_d_604_110231', // Unused position
    'filter18_d_604_110231'  // Unused position
  ]

  // Build dynamic map from preferred shades when provided; otherwise fall back to default
  // This maps each filter ID to the actual shade name from the API response
  // When API provides shades, they are mapped to filter positions in sequence order
  // API shades come in sequence order (Bleach, A1, A2, etc.) and are mapped to filter positions
  // Only shades present in preferredShades will be visible (controlled by isShadeVisible)
  const teethFilterToShadeMap: { [key: string]: string } = React.useMemo(() => {
    if (type !== 'teeth' || !preferredShades || preferredShades.length === 0) {
      return defaultTeethFilterToShadeMap
    }
    const dynamicMap: { [key: string]: string } = {}
    // Sort API shades by sequence to ensure correct order (API may not always send in order)
    const sortedShades = [...preferredShades].sort((a, b) => {
      const seqA = a.sequence ?? 0
      const seqB = b.sequence ?? 0
      return seqA - seqB
    })
    
    // Map API shades to filter positions in sequence order (left-to-right)
    const max = Math.min(teethFilterIdsInOrder.length, sortedShades.length)
    for (let i = 0; i < max; i++) {
      // Map the filter position to the shade name from API (in sequence order)
      dynamicMap[teethFilterIdsInOrder[i]] = sortedShades[i].name
    }
    return dynamicMap
  }, [type, preferredShades])

  // Helper function to get color from API response for a specific shade
  // Uses color_code_body as primary, falls back to color for legacy support
  const getShadeColor = (shadeName: string): string | null => {
    if (!preferredShades || preferredShades.length === 0) return null
    const shade = preferredShades.find(s => s.name === shadeName)
    if (!shade) return null
    // Prefer color_code_body from API, fall back to legacy color field
    return shade.color_code_body || shade.color || null
  }

  const gumFilterToShadeMap: { [key: string]: string } = {
    'filter0_gum_001': 'Light Vein',
    'filter1_gum_002': 'Medium Vein',
    'filter2_gum_002': 'Dark Vein',
    'filter3_gum_004': 'Light Pink',
    'filter4_gum_005': 'Medium Pink',
    'filter5_gum_006': 'Dark Pink',
    'filter6_gum_007': 'Light Coral',
    'filter7_gum_008': 'Medium Coral',
    'filter8_gum_009': 'Dark Coral',
    'filter9_gum_010': 'Light Red',
    'filter10_gum_011': 'Medium Red',
    'filter11_gum_012': 'Dark Red',
    'filter12_gum_013': 'Light Brown',
    'filter13_gum_014': 'Medium Brown',
    'filter14_gum_015': 'Dark Brown',
    'filter15_gum_016': 'Light Gray',
    'filter16_gum_017': 'Medium Gray',
    'filter17_gum_018': 'Dark Gray'
  }

  const filterToShadeMap = type === 'gum' ? gumFilterToShadeMap : teethFilterToShadeMap

  // Helper function to generate dynamic gradient ID based on filter ID
  const getDynamicGradientId = (filterId: string, gradientType: 'main' | 'shine1' | 'shine2' | 'shine3'): string => {
    const shadeName = filterToShadeMap[filterId]
    if (!shadeName) return '' // Return empty if no shade mapped
    
    // Generate unique ID based on shade name and gradient type
    const baseId = `paint_${shadeName.replace(/[^a-zA-Z0-9]/g, '_')}_${gradientType}_dynamic`
    return baseId
  }

  // Helper function to generate gradient colors from base color
  // This creates variations of the base color for the 3D effect
  const generateGradientColors = (baseColor: string): { main: string[], shine: string[] } => {
    // Parse hex color
    const hex = baseColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)

    // Generate lighter and darker variations
    const lighten = (amount: number) => {
      const newR = Math.min(255, r + amount)
      const newG = Math.min(255, g + amount)
      const newB = Math.min(255, b + amount)
      return `#${Math.round(newR).toString(16).padStart(2, '0')}${Math.round(newG).toString(16).padStart(2, '0')}${Math.round(newB).toString(16).padStart(2, '0')}`
    }

    const darken = (amount: number) => {
      const newR = Math.max(0, r - amount)
      const newG = Math.max(0, g - amount)
      const newB = Math.max(0, b - amount)
      return `#${Math.round(newR).toString(16).padStart(2, '0')}${Math.round(newG).toString(16).padStart(2, '0')}${Math.round(newB).toString(16).padStart(2, '0')}`
    }

    return {
      main: [
        darken(30), // 0%
        darken(20), // 0.08
        darken(10), // 0.25
        baseColor,  // 0.5
        lighten(5), // 0.75
        lighten(10), // 0.87
        lighten(20), // 0.97
        lighten(30)  // 1
      ],
      shine: [
        baseColor,  // base
        lighten(5), // 0.07
        lighten(15), // 0.25
        lighten(20), // 0.5
        lighten(25), // 0.81
        lighten(30), // 0.98
        lighten(35)  // 1
      ]
    }
  }


  // Helper function to check if a shade should be visible based on preferred shades
  const isShadeVisible = (shadeName: string): boolean => {
    // If no preferred shades are provided or it's not teeth type, show all shades
    if (type !== 'teeth' || !preferredShades || preferredShades.length === 0) {
      return true
    }
    // Check if the shade name exists in the preferred shades array
    return preferredShades.some(shade => shade.name === shadeName)
  }

  // Handle mouse movement for tooltip positioning
  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement | HTMLDivElement>) => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      setMousePosition({ x, y })
    }
  }

  const addHoverToFilterGroup = (filterId: string) => {
    const shadeId = filterToShadeMap[filterId]

    // Hide if no shade mapped or shade name is empty
    if (!shadeId || shadeId.trim() === '') {
      return {
        style: {
          display: 'none', // Hide sticks without shade values
        }
      }
    }

    const isClicked = clickedShade === shadeId
    const isSelected = selectedShade === shadeId
    const isVisible = isShadeVisible(shadeId)

    return {
      onMouseEnter: () => !isClicked && !isSelected && onShadeHover?.(shadeId),
      onMouseLeave: () => !isClicked && !isSelected && onShadeHover?.(null),
      onClick: () => {
        // Toggle the clicked state and call onShadeClick
        if (isClicked) {
          setClickedShade(null)
        } else {
          setClickedShade(shadeId)
        }
        onShadeClick?.(shadeId)
      },
      style: {
        cursor: 'pointer',
        display: isVisible ? undefined : 'none' // Hide shade if not in preferred list
      },
      className: `shade-stick-hover ${(isClicked || isSelected) ? 'shade-stick-clicked' : ''}`
    }
  }

  // Tooltip position mapping for teeth shades (based on actual SVG filter positions)
  const teethShadeTooltipPositions: { [key: string]: { x: number, y: number, group: string } } = {
    // Bleach shade (first position, filter0)
    'Bleach': { x: 112, y: 50, group: 'Bleach' },     // filter0: x=84.56 + 27.87 = 112
    // A group
    'A1': { x: 281, y: 50, group: 'A' },       // filter18: x=253.14 + 27.87 = 281
    'A2': { x: 325, y: 50, group: 'A' },       // filter17: x=297.19 + 27.87 = 325
    'A3': { x: 369, y: 50, group: 'A' },       // filter15: x=341.23 + 27.87 = 369
    'A3.5': { x: 413, y: 50, group: 'A' },     // filter12: x=385.28 + 27.87 = 413
    'A4': { x: 457, y: 50, group: 'A' },       // filter11: x=429.33 + 27.87 = 457
    // B group
    'B1': { x: 501, y: 50, group: 'B' },       // filter10: x=473.38 + 27.87 = 501
    'B2': { x: 545, y: 50, group: 'B' },       // filter9: x=517.42 + 27.87 = 545
    'B3': { x: 589, y: 50, group: 'B' },       // filter8: x=561.47 + 27.87 = 589
    'B4': { x: 633, y: 50, group: 'B' },       // filter7: x=605.52 + 27.87 = 633
    // C group
    'C1': { x: 677, y: 50, group: 'C' },       // filter6: x=649.56 + 27.87 = 677
    'C2': { x: 721, y: 50, group: 'C' },       // filter5: x=693.61 + 27.87 = 721
    'C3': { x: 765, y: 50, group: 'C' },       // filter4: x=737.66 + 27.87 = 765
    'C4': { x: 809, y: 50, group: 'C' },       // filter3: x=781.70 + 27.87 = 809
    // D group
    'D2': { x: 853, y: 50, group: 'D' },       // filter2: x=825.75 + 27.87 = 853
    'D3': { x: 897, y: 50, group: 'D' },       // filter1: x=869.79 + 27.87 = 897
    'D4': { x: 941, y: 50, group: 'D' },       // filter16: x=913.84 + 27.87 = 941

  }

  // Tooltip position mapping for gum shades
  const gumShadeTooltipPositions: { [key: string]: { x: number, y: number, group: string } } = {
    'Light Vein': { x: 80, y: 50, group: 'St. George' },
    'Medium Vein': { x: 150, y: 50, group: 'St. George' },
    'Dark Vein': { x: 220, y: 50, group: 'St. George' },
    'Light Pink': { x: 80, y: 120, group: 'Ivoclar Gum' },
    'Medium Pink': { x: 150, y: 120, group: 'Ivoclar Gum' },
    'Dark Pink': { x: 220, y: 120, group: 'Ivoclar Gum' },
    'Light Coral': { x: 80, y: 190, group: 'VITA Gum' },
    'Medium Coral': { x: 150, y: 190, group: 'VITA Gum' },
    'Dark Coral': { x: 220, y: 190, group: 'VITA Gum' },
    'Light Red': { x: 80, y: 260, group: 'VITA Gum' },
    'Medium Red': { x: 150, y: 260, group: 'VITA Gum' },
    'Dark Red': { x: 220, y: 260, group: 'VITA Gum' },
    'Light Brown': { x: 80, y: 330, group: 'VITA Gum' },
    'Medium Brown': { x: 150, y: 330, group: 'VITA Gum' },
    'Dark Brown': { x: 220, y: 330, group: 'VITA Gum' },
    'Light Gray': { x: 80, y: 400, group: 'VITA Gum' },
    'Medium Gray': { x: 150, y: 400, group: 'VITA Gum' },
    'Dark Gray': { x: 220, y: 400, group: 'VITA Gum' }
  }

  const shadeTooltipPositions = type === 'gum' ? gumShadeTooltipPositions : teethShadeTooltipPositions

  // Render gum shade guide (dynamic based on API data)
  if (type === 'gum') {
    // Use Zustand store for gum shade selection
    const { tempSelectedShadeName, setTempSelectedShade, setSelectedGumShade } = useSelectedGumShadeStore()

    // Render appropriate jaw component based on arch prop
    if (arch === 'maxillary') {
      return (
        <TeethShadeGuide
          className={className}
          archType="maxillary"
          onShadeClick={onShadeClick}
          onShadeConfirm={onShadeConfirm}
          hoveredShade={hoveredShade}
          onShadeHover={onShadeHover}
          type={type}
          selectedShade={selectedShade}
          selectedShadeColor={selectedShadeColor}
          showInstructions={showInstructions}
          productId={productId}
          gumShadeSystems={gumShadeSystems}
          preferredBrand={preferredBrand}
          preferredShades={preferredShades}
          loading={loading}
          error={error}
        />
      )
    } else if (arch === 'mandibular') {
      return (
        <TeethShadeGuide
          className={className}
          archType="mandibular"
          onShadeClick={onShadeClick}
          onShadeConfirm={onShadeConfirm}
          hoveredShade={hoveredShade}
          onShadeHover={onShadeHover}
          type={type}
          selectedShade={selectedShade}
          showInstructions={showInstructions}
          productId={productId}
          gumShadeSystems={gumShadeSystems}
          preferredBrand={preferredBrand}
          preferredShades={preferredShades}
          loading={loading}
          error={error}
        />
      )
    }

    // Fallback to combined jaw view if no arch specified
    // Use preferredShades prop if provided, otherwise use preferredGumShades from internal fetch
    // Transform preferredShades to ensure they have the color property
    const gumShades = preferredShades.length > 0 
      ? preferredShades.map(shade => ({
          name: shade.name,
          color: shade.color || (shade as any).color_code_middle || '#C98686',
          id: shade.id,
          system_name: shade.system_name
        }))
      : preferredGumShades

    console.log('Rendering gum shades:', gumShades)

    return (
      <div className={`relative ${className} h-full flex flex-col`} ref={svgRef as any} onMouseMove={handleMouseMove}>
        <style dangerouslySetInnerHTML={{
          __html: `
          .gum-shade-circle[data-gum-shade-color] {
            background-color: var(--gum-shade-bg-color) !important;
            background: var(--gum-shade-bg-color) !important;
          }
          .gum-shade-circle {
            background-color: var(--gum-shade-bg-color) !important;
            background: var(--gum-shade-bg-color) !important;
          }
          div[data-gum-shade-color] {
            background-color: var(--gum-shade-bg-color) !important;
            background: var(--gum-shade-bg-color) !important;
          }
        `}} />
        {/* Shade Swatches - Single horizontal row */}
        <div className="flex justify-center items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 px-2 sm:px-4 py-2 overflow-x-auto">
          {gumShadesLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="text-sm text-gray-500">Loading gum shades...</div>
            </div>
          ) : gumShadesError ? (
            <div className="flex items-center justify-center py-4">
              <div className="text-sm text-red-500">Error loading gum shades: {gumShadesError}</div>
            </div>
          ) : (
            gumShades.map((shade) => {
              const isSelected = tempSelectedShadeName === shade.name
              const colorValue = shade.color || '#C98686'
              console.log(`Rendering shade ${shade.name} with color: ${colorValue}`, 'Full shade object:', shade)
              return (
                <div key={shade.name} className="flex items-center flex-col gap-0.5 sm:gap-1 flex-shrink-0">
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full cursor-pointer transition-all shadow-sm gum-shade-circle ${isSelected
                      ? 'border-3 sm:border-4 border-white ring-3 sm:ring-4 ring-blue-600'
                      : 'border-3 sm:border-4 border-gray-200 hover:border-blue-400'
                      }`}
                    style={{
                      '--gum-shade-bg-color': colorValue,
                      backgroundColor: colorValue,
                      background: colorValue,
                    } as React.CSSProperties}
                    data-gum-shade-color={colorValue}
                    onClick={() => {
                      // Update Zustand store
                      setTempSelectedShade(shade.name)

                      // Set the full selectedGumShade object if we have productId and arch
                      if (productId && arch) {
                        // Get brand name from gumShadeSystems or use default
                        const brandName = gumShadeSystems.length > 0
                          ? gumShadeSystems[0].system_name
                          : 'VITA Gum'

                        setSelectedGumShade({
                          productId: productId.toString(),
                          arch: arch,
                          brandName: brandName,
                          shadeName: shade.name
                        })
                      }

                      // Call onShadeClick to trigger modal close for gum shades
                      console.log('🎯 Gum shade circle clicked, calling onShadeClick:', { shadeName: shade.name, hasOnShadeClick: !!onShadeClick })
                      onShadeClick?.(shade.name)
                    }}
                  />
                  <span className={`text-[10px] sm:text-[11px] md:text-sm lg:text-base font-medium text-center whitespace-nowrap ${isSelected ? 'text-blue-600 font-semibold' : 'text-gray-800'
                    }`}>{shade.name}</span>
                </div>
              )
            })
          )}
        </div>

      </div>
    );
  }

  // Build helper map: filterId -> x position for label centering using default layout
  const filterIdToLabelX: { [key: string]: number } = React.useMemo(() => {
    const map: { [key: string]: number } = {}
    Object.entries(defaultTeethFilterToShadeMap).forEach(([filterId, shadeName]) => {
      const pos = teethShadeTooltipPositions[shadeName]
      if (pos) map[filterId] = pos.x
    })
    return map
  }, [])

  // Get the actual shades to render - use API response if available, otherwise use default mapping
  const shadesToRender = React.useMemo(() => {
    if (type !== 'teeth' || !preferredShades || preferredShades.length === 0) {
      // Fallback to default: map all default shades
      return Object.entries(defaultTeethFilterToShadeMap).map(([filterId, shadeName]) => ({
        filterId,
        shadeName,
        apiShade: null
      }))
    }
    
    // Sort API shades by sequence to ensure correct order (API may not always send in order)
    const sortedShades = [...preferredShades].sort((a, b) => {
      const seqA = a.sequence ?? 0
      const seqB = b.sequence ?? 0
      return seqA - seqB
    })
    
    // Use API shades, mapping them to filter positions in sequence order
    return sortedShades.map((apiShade, index) => {
      const filterId = index < teethFilterIdsInOrder.length 
        ? teethFilterIdsInOrder[index]
        : null
      return {
        filterId: filterId || `filter${index}_dynamic`,
        shadeName: apiShade.name,
        apiShade
      }
    }).filter(item => item.filterId) // Filter out any without valid filterId
  }, [type, preferredShades, teethFilterIdsInOrder])

  return (
    <svg ref={svgRef} width="924" height="374" viewBox="0 0 924 374" fill="none" xmlns="http://www.w3.org/2000/svg">
      <style>{`
        .shade-stick-hover {
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          transform-origin: center bottom;
          will-change: transform;
        }
        .shade-stick-hover:hover:not(.shade-stick-clicked) {
          transform: translateY(-20px);
        }
        .shade-stick-clicked {
          transform: translateY(-20px);
        }
      `}</style>
      <g clipPath="url(#clip0_604_110231)">
        <path d="M17.069 119.424H906.944C915.808 119.424 923 125.702 923 133.44V333.576C923 354.446 903.587 371.393 879.679 371.393H43.3439C19.4245 371.393 0 354.436 0 333.557V134.334C0 126.109 7.64691 119.424 17.069 119.424Z" fill="#616263" />
        <path d="M923 130.075V181.604H878.029V137.033C878.029 131.154 870.382 126.382 860.96 126.382H62.0401C52.618 126.382 44.9711 131.154 44.9711 137.033V181.604H0V130.075C0 124.195 7.64691 119.424 17.069 119.424H905.931C915.353 119.424 923 124.195 923 130.075Z" fill="url(#paint0_linear_604_110231)" />
      </g>
      <g filter="url(#filter0_d_604_110231)" {...addHoverToFilterGroup('filter0_d_604_110231')}>
        <path d="M128.82 151.194V336.232H91.5811V151.194C91.5811 142.357 97.5382 134.96 105.585 132.871V101.871L114.817 102.04V132.899C122.863 134.988 128.82 142.385 128.82 151.222V151.194Z" fill="#8F8C88" />
        <path d="M114.819 98.0312V102.012L105.587 101.871V98.0312H114.819Z" fill="#8F8C88" />
        <path d="M129.727 89.1935C129.981 96.28 125.125 102.181 119.083 102.096L114.82 102.04L105.588 101.87L100.167 101.785C94.6052 101.701 90.2573 96.1106 90.709 89.5888L92.6853 60.7066C93.4476 49.5828 101.353 41 110.839 41C115.639 41 120.015 43.2304 123.233 46.8724C126.452 50.5145 128.513 55.5682 128.71 61.2147L129.699 89.1935H129.727Z" fill="url(#paint1_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M121.401 92.6369C120.47 93.5968 120.046 95.0367 120.329 96.3637C120.78 96.6178 121.373 96.5895 121.853 96.3637C122.333 96.1378 122.757 95.799 123.124 95.4602C123.858 94.7826 128.544 90.096 126.54 89.136C125.834 88.7973 124.648 89.8983 124.196 90.3218C123.293 91.1123 122.248 91.7899 121.401 92.6369Z" fill="url(#paint2_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M124.786 84.5645C125.745 84.2257 126.028 83.0117 126.141 81.9953C126.395 80.019 127.072 77.111 126.282 75.1912C125.83 74.0901 125.068 73.4972 124.588 74.6265C124.164 75.5865 124.814 77.5628 124.87 78.5791C124.927 79.285 125.153 84.3951 124.757 84.5363L124.786 84.5645Z" fill="url(#paint3_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M118.517 49.2154C118.856 49.7236 119.223 50.3447 119.844 50.4012C120.352 50.4577 120.832 50.0624 121.002 49.5824C121.171 49.1025 121.114 48.5661 121.002 48.0861C120.634 46.8721 119.731 45.8275 118.602 45.2628C117.642 44.8111 115.722 44.3594 115.976 45.9686C116.145 47.0697 117.952 48.2273 118.545 49.1872L118.517 49.2154Z" fill="url(#paint4_linear_604_110231)" />
      </g>
      <g filter="url(#filter1_d_604_110231)" {...addHoverToFilterGroup('filter1_d_604_110231')} style={{ cursor: 'pointer' }}>
        <path d="M832.411 151.192V336.23H795.172V151.192C795.172 142.355 801.129 134.958 809.175 132.869V101.869L818.408 102.039V132.897C826.454 134.986 832.411 142.383 832.411 151.22V151.192Z" fill="#8F8C88" />
        <path d="M818.41 98.0312V102.012L809.178 101.871V98.0312H818.41Z" fill="#8F8C88" />
        <path d="M833.318 89.1935C833.572 96.28 828.716 102.181 822.674 102.096L818.411 102.04L809.179 101.87L803.758 101.785C798.196 101.701 793.848 96.1106 794.3 89.5888L796.276 60.7066C797.038 49.5828 804.944 41 814.43 41C819.229 41 823.606 43.2304 826.824 46.8724C830.043 50.5145 832.104 55.5682 832.301 61.2147L833.289 89.1935H833.318Z" fill="url(#paint5_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M824.992 92.6369C824.061 93.5968 823.637 95.0367 823.919 96.3637C824.371 96.6178 824.964 96.5895 825.444 96.3637C825.924 96.1378 826.347 95.799 826.714 95.4602C827.448 94.7826 832.135 90.096 830.131 89.136C829.425 88.7973 828.239 89.8983 827.787 90.3218C826.884 91.1123 825.839 91.7899 824.992 92.6369Z" fill="url(#paint6_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M828.342 84.5626C829.302 84.2238 829.584 83.0098 829.697 81.9934C829.951 80.0171 830.629 77.1091 829.838 75.1892C829.386 74.0882 828.624 73.4953 828.144 74.6246C827.721 75.5845 828.37 77.5608 828.426 78.5772C828.483 79.283 828.709 84.3932 828.313 84.5343L828.342 84.5626Z" fill="url(#paint7_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M822.107 49.2154C822.446 49.7236 822.813 50.3447 823.434 50.4012C823.942 50.4577 824.422 50.0624 824.591 49.5824C824.761 49.1025 824.704 48.5661 824.591 48.0861C824.224 46.8721 823.321 45.8275 822.192 45.2628C821.232 44.8111 819.312 44.3594 819.566 45.9686C819.735 47.0697 821.542 48.2273 822.135 49.1872L822.107 49.2154Z" fill="url(#paint8_linear_604_110231)" />
      </g>
      <g filter="url(#filter2_d_604_110231)" {...addHoverToFilterGroup('filter2_d_604_110231')}>
        <path d="M788.436 151.192V336.23H751.197V151.192C751.197 142.355 757.154 134.958 765.201 132.869V101.869L774.433 102.039V132.897C782.479 134.986 788.436 142.383 788.436 151.22V151.192Z" fill="#8F8C88" />
        <path d="M774.435 98.0312V102.012L765.203 101.871V98.0312H774.435Z" fill="#8F8C88" />
        <path d="M789.343 89.1935C789.597 96.28 784.741 102.181 778.699 102.096L774.436 102.04L765.204 101.87L759.783 101.785C754.221 101.701 749.874 96.1106 750.325 89.5888L752.302 60.7066C753.064 49.5828 760.969 41 770.455 41C775.255 41 779.631 43.2304 782.85 46.8724C786.068 50.5145 788.129 55.5682 788.327 61.2147L789.315 89.1935H789.343Z" fill="url(#paint9_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M781.018 92.6369C780.086 93.5968 779.662 95.0367 779.945 96.3637C780.396 96.6178 780.989 96.5895 781.469 96.3637C781.949 96.1378 782.373 95.799 782.74 95.4602C783.474 94.7826 788.161 90.096 786.156 89.136C785.45 88.7973 784.264 89.8983 783.813 90.3218C782.909 91.1123 781.865 91.7899 781.018 92.6369Z" fill="url(#paint10_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M784.367 84.5626C785.327 84.2238 785.609 83.0098 785.722 81.9934C785.976 80.0171 786.654 77.1091 785.863 75.1892C785.412 74.0882 784.649 73.4953 784.169 74.6246C783.746 75.5845 784.395 77.5608 784.452 78.5772C784.508 79.283 784.734 84.3932 784.339 84.5343L784.367 84.5626Z" fill="url(#paint11_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M778.132 49.2154C778.471 49.7236 778.838 50.3447 779.459 50.4012C779.967 50.4577 780.447 50.0624 780.617 49.5824C780.786 49.1025 780.73 48.5661 780.617 48.0861C780.25 46.8721 779.346 45.8275 778.217 45.2628C777.257 44.8111 775.337 44.3594 775.591 45.9686C775.761 47.0697 777.568 48.2273 778.16 49.1872L778.132 49.2154Z" fill="url(#paint12_linear_604_110231)" />
      </g>
      <g filter="url(#filter3_d_604_110231)" {...addHoverToFilterGroup('filter3_d_604_110231')}>
        <path d="M744.462 151.192V336.23H707.223V151.192C707.223 142.355 713.18 134.958 721.226 132.869V101.869L730.458 102.039V132.897C738.505 134.986 744.462 142.383 744.462 151.22V151.192Z" fill="#8F8C88" />
        <path d="M730.461 98.0312V102.012L721.229 101.871V98.0312H730.461Z" fill="#8F8C88" />
        <path d="M745.368 89.1935C745.623 96.28 740.767 102.181 734.725 102.096L730.462 102.04L721.229 101.87L715.809 101.785C710.247 101.701 705.899 96.1106 706.351 89.5888L708.327 60.7066C709.089 49.5828 716.994 41 726.481 41C731.28 41 735.656 43.2304 738.875 46.8724C742.093 50.5145 744.154 55.5682 744.352 61.2147L745.34 89.1935H745.368Z" fill="url(#paint13_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M737.043 92.6369C736.111 93.5968 735.688 95.0367 735.97 96.3637C736.422 96.6178 737.015 96.5895 737.495 96.3637C737.975 96.1378 738.398 95.799 738.765 95.4602C739.499 94.7826 744.186 90.096 742.181 89.136C741.476 88.7973 740.29 89.8983 739.838 90.3218C738.935 91.1123 737.89 91.7899 737.043 92.6369Z" fill="url(#paint14_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M740.392 84.5626C741.352 84.2238 741.635 83.0098 741.748 81.9934C742.002 80.0171 742.679 77.1091 741.889 75.1892C741.437 74.0882 740.675 73.4953 740.195 74.6246C739.771 75.5845 740.421 77.5608 740.477 78.5772C740.534 79.283 740.759 84.3932 740.364 84.5343L740.392 84.5626Z" fill="url(#paint15_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M734.158 49.2154C734.496 49.7236 734.863 50.3447 735.485 50.4012C735.993 50.4577 736.473 50.0624 736.642 49.5824C736.812 49.1025 736.755 48.5661 736.642 48.0861C736.275 46.8721 735.372 45.8275 734.242 45.2628C733.282 44.8111 731.363 44.3594 731.617 45.9686C731.786 47.0697 733.593 48.2273 734.186 49.1872L734.158 49.2154Z" fill="url(#paint16_linear_604_110231)" />
      </g>
      <g filter="url(#filter4_d_604_110231)" {...addHoverToFilterGroup('filter4_d_604_110231')}>
        <path d="M700.487 151.192V336.23H663.248V151.192C663.248 142.355 669.205 134.958 677.252 132.869V101.869L686.484 102.039V132.897C694.53 134.986 700.487 142.383 700.487 151.22V151.192Z" fill="#8F8C88" />
        <path d="M686.487 98.0312V102.012L677.255 101.871V98.0312H686.487Z" fill="#8F8C88" />
        <path d="M701.394 89.1935C701.648 96.28 696.792 102.181 690.75 102.096L686.487 102.04L677.255 101.87L671.834 101.785C666.272 101.701 661.924 96.1106 662.376 89.5888L664.352 60.7066C665.115 49.5828 673.02 41 682.506 41C687.306 41 691.682 43.2304 694.9 46.8724C698.119 50.5145 700.18 55.5682 700.377 61.2147L701.366 89.1935H701.394Z" fill="url(#paint17_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M693.072 92.6369C692.141 93.5968 691.717 95.0367 691.999 96.3637C692.451 96.6178 693.044 96.5895 693.524 96.3637C694.004 96.1378 694.427 95.799 694.794 95.4602C695.529 94.7826 700.215 90.096 698.211 89.136C697.505 88.7973 696.319 89.8983 695.867 90.3218C694.964 91.1123 693.919 91.7899 693.072 92.6369Z" fill="url(#paint18_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M696.422 84.5626C697.382 84.2238 697.664 83.0098 697.777 81.9934C698.031 80.0171 698.709 77.1091 697.918 75.1892C697.466 74.0882 696.704 73.4953 696.224 74.6246C695.801 75.5845 696.45 77.5608 696.506 78.5772C696.563 79.283 696.789 84.3932 696.394 84.5343L696.422 84.5626Z" fill="url(#paint19_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M690.187 49.2154C690.526 49.7236 690.893 50.3447 691.514 50.4012C692.022 50.4577 692.502 50.0624 692.671 49.5824C692.841 49.1025 692.784 48.5661 692.671 48.0861C692.304 46.8721 691.401 45.8275 690.272 45.2628C689.312 44.8111 687.392 44.3594 687.646 45.9686C687.815 47.0697 689.622 48.2273 690.215 49.1872L690.187 49.2154Z" fill="url(#paint20_linear_604_110231)" />
      </g>
      <g filter="url(#filter5_d_604_110231)" {...addHoverToFilterGroup('filter5_d_604_110231')}>
        <path d="M656.513 151.192V336.23H619.273V151.192C619.273 142.355 625.231 134.958 633.277 132.869V101.869L642.509 102.039V132.897C650.555 134.986 656.513 142.383 656.513 151.22V151.192Z" fill="#8F8C88" />
        <path d="M642.512 98.0312V102.012L633.28 101.871V98.0312H642.512Z" fill="#8F8C88" />
        <path d="M657.419 89.1935C657.673 96.28 652.817 102.181 646.775 102.096L642.512 102.04L633.28 101.87L627.859 101.785C622.298 101.701 617.95 96.1106 618.401 89.5888L620.378 60.7066C621.14 49.5828 629.045 41 638.531 41C643.331 41 647.707 43.2304 650.926 46.8724C654.144 50.5145 656.205 55.5682 656.403 61.2147L657.391 89.1935H657.419Z" fill="url(#paint21_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M649.098 92.6369C648.166 93.5968 647.742 95.0367 648.025 96.3637C648.477 96.6178 649.069 96.5895 649.549 96.3637C650.029 96.1378 650.453 95.799 650.82 95.4602C651.554 94.7826 656.241 90.096 654.236 89.136C653.53 88.7973 652.344 89.8983 651.893 90.3218C650.989 91.1123 649.945 91.7899 649.098 92.6369Z" fill="url(#paint22_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M652.447 84.5626C653.407 84.2238 653.689 83.0098 653.802 81.9934C654.056 80.0171 654.734 77.1091 653.943 75.1892C653.492 74.0882 652.729 73.4953 652.25 74.6246C651.826 75.5845 652.475 77.5608 652.532 78.5772C652.588 79.283 652.814 84.3932 652.419 84.5343L652.447 84.5626Z" fill="url(#paint23_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M646.212 49.2154C646.551 49.7236 646.918 50.3447 647.539 50.4012C648.047 50.4577 648.527 50.0624 648.697 49.5824C648.866 49.1025 648.81 48.5661 648.697 48.0861C648.33 46.8721 647.426 45.8275 646.297 45.2628C645.337 44.8111 643.417 44.3594 643.671 45.9686C643.841 47.0697 645.648 48.2273 646.241 49.1872L646.212 49.2154Z" fill="url(#paint24_linear_604_110231)" />
      </g>
      <g filter="url(#filter6_d_604_110231)" {...addHoverToFilterGroup('filter6_d_604_110231')}>
        <path d="M612.538 151.192V336.23H575.299V151.192C575.299 142.355 581.256 134.958 589.302 132.869V101.869L598.534 102.039V132.897C606.581 134.986 612.538 142.383 612.538 151.22V151.192Z" fill="#8F8C88" />
        <path d="M598.538 98.0312V102.012L589.306 101.871V98.0312H598.538Z" fill="#8F8C88" />
        <path d="M613.445 89.1935C613.699 96.28 608.843 102.181 602.801 102.096L598.538 102.04L589.306 101.87L583.885 101.785C578.323 101.701 573.975 96.1106 574.427 89.5888L576.403 60.7066C577.165 49.5828 585.071 41 594.557 41C599.356 41 603.733 43.2304 606.951 46.8724C610.17 50.5145 612.231 55.5682 612.428 61.2147L613.416 89.1935H613.445Z" fill="url(#paint25_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M605.123 92.6369C604.191 93.5968 603.768 95.0367 604.05 96.3637C604.502 96.6178 605.095 96.5895 605.575 96.3637C606.055 96.1378 606.478 95.799 606.845 95.4602C607.579 94.7826 612.266 90.096 610.261 89.136C609.556 88.7973 608.37 89.8983 607.918 90.3218C607.015 91.1123 605.97 91.7899 605.123 92.6369Z" fill="url(#paint26_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M608.474 84.5626C609.433 84.2238 609.716 83.0098 609.829 81.9934C610.083 80.0171 610.76 77.1091 609.97 75.1892C609.518 74.0882 608.756 73.4953 608.276 74.6246C607.852 75.5845 608.502 77.5608 608.558 78.5772C608.615 79.283 608.841 84.3932 608.445 84.5343L608.474 84.5626Z" fill="url(#paint27_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M602.238 49.2154C602.577 49.7236 602.944 50.3447 603.565 50.4012C604.073 50.4577 604.553 50.0624 604.722 49.5824C604.892 49.1025 604.835 48.5661 604.722 48.0861C604.355 46.8721 603.452 45.8275 602.322 45.2628C601.363 44.8111 599.443 44.3594 599.697 45.9686C599.866 47.0697 601.673 48.2273 602.266 49.1872L602.238 49.2154Z" fill="url(#paint28_linear_604_110231)" />
      </g>
      <g filter="url(#filter7_d_604_110231)" {...addHoverToFilterGroup('filter7_d_604_110231')}>
        <path d="M568.563 151.192V336.23H531.324V151.192C531.324 142.355 537.281 134.958 545.328 132.869V101.869L554.56 102.039V132.897C562.606 134.986 568.563 142.383 568.563 151.22V151.192Z" fill="#8F8C88" />
        <path d="M554.563 98.0312V102.012L545.331 101.871V98.0312H554.563Z" fill="#8F8C88" />
        <path d="M569.47 89.1935C569.724 96.28 564.868 102.181 558.826 102.096L554.563 102.04L545.331 101.87L539.91 101.785C534.348 101.701 530 96.1106 530.452 89.5888L532.428 60.7066C533.191 49.5828 541.096 41 550.582 41C555.382 41 559.758 43.2304 562.976 46.8724C566.195 50.5145 568.256 55.5682 568.454 61.2147L569.442 89.1935H569.47Z" fill="url(#paint29_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M561.148 92.6369C560.217 93.5968 559.793 95.0367 560.076 96.3637C560.527 96.6178 561.12 96.5895 561.6 96.3637C562.08 96.1378 562.504 95.799 562.871 95.4602C563.605 94.7826 568.291 90.096 566.287 89.136C565.581 88.7973 564.395 89.8983 563.944 90.3218C563.04 91.1123 561.995 91.7899 561.148 92.6369Z" fill="url(#paint30_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M564.499 84.5626C565.459 84.2238 565.741 83.0098 565.854 81.9934C566.108 80.0171 566.786 77.1091 565.995 75.1892C565.544 74.0882 564.781 73.4953 564.301 74.6246C563.878 75.5845 564.527 77.5608 564.584 78.5772C564.64 79.283 564.866 84.3932 564.471 84.5343L564.499 84.5626Z" fill="url(#paint31_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M558.263 49.2154C558.602 49.7236 558.969 50.3447 559.59 50.4012C560.098 50.4577 560.578 50.0624 560.748 49.5824C560.917 49.1025 560.861 48.5661 560.748 48.0861C560.381 46.8721 559.477 45.8275 558.348 45.2628C557.388 44.8111 555.468 44.3594 555.722 45.9686C555.892 47.0697 557.698 48.2273 558.291 49.1872L558.263 49.2154Z" fill="url(#paint32_linear_604_110231)" />
      </g>
      <g filter="url(#filter8_d_604_110231)" {...addHoverToFilterGroup('filter8_d_604_110231')}>
        <path d="M510.589 98.0312V102.012L501.356 101.871V98.0312H510.589Z" fill="#8F8C88" />
        <path d="M525.495 89.1935C525.75 96.28 520.893 102.181 514.852 102.096L510.588 102.04L501.356 101.87L495.936 101.785C490.374 101.701 486.026 96.1106 486.478 89.5888L488.454 60.7066C489.216 49.5828 497.121 41 506.608 41C511.407 41 515.783 43.2304 519.002 46.8724C522.22 50.5145 524.281 55.5682 524.479 61.2147L525.467 89.1935H525.495Z" fill="url(#paint33_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M517.174 92.6369C516.242 93.5968 515.819 95.0367 516.101 96.3637C516.553 96.6178 517.146 96.5895 517.626 96.3637C518.106 96.1378 518.529 95.799 518.896 95.4602C519.63 94.7826 524.317 90.096 522.312 89.136C521.606 88.7973 520.421 89.8983 519.969 90.3218C519.065 91.1123 518.021 91.7899 517.174 92.6369Z" fill="url(#paint34_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M520.524 84.5626C521.484 84.2238 521.767 83.0098 521.879 81.9934C522.134 80.0171 522.811 77.1091 522.021 75.1892C521.569 74.0882 520.807 73.4953 520.327 74.6246C519.903 75.5845 520.553 77.5608 520.609 78.5772C520.665 79.283 520.891 84.3932 520.496 84.5343L520.524 84.5626Z" fill="url(#paint35_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M514.289 49.2154C514.627 49.7236 514.994 50.3447 515.615 50.4012C516.124 50.4577 516.604 50.0624 516.773 49.5824C516.942 49.1025 516.886 48.5661 516.773 48.0861C516.406 46.8721 515.503 45.8275 514.373 45.2628C513.413 44.8111 511.493 44.3594 511.748 45.9686C511.917 47.0697 513.724 48.2273 514.317 49.1872L514.289 49.2154Z" fill="url(#paint36_linear_604_110231)" />
      </g>
      <path d="M524.593 151.192V336.23H487.354V151.192C487.354 142.355 493.311 134.958 501.357 132.869V101.869L510.589 102.039V132.897C518.636 134.986 524.593 142.383 524.593 151.22V151.192Z" fill="#8F8C88" />
      <g filter="url(#filter9_d_604_110231)" {...addHoverToFilterGroup('filter9_d_604_110231')}>
        <path d="M480.614 151.192V336.23H443.375V151.192C443.375 142.355 449.332 134.958 457.379 132.869V101.869L466.611 102.039V132.897C474.657 134.986 480.614 142.383 480.614 151.22V151.192Z" fill="#8F8C88" />
        <path d="M466.614 98.0312V102.012L457.382 101.871V98.0312H466.614Z" fill="#8F8C88" />
        <path d="M481.521 89.1935C481.775 96.28 476.919 102.181 470.877 102.096L466.614 102.04L457.382 101.87L451.961 101.785C446.399 101.701 442.051 96.1106 442.503 89.5888L444.479 60.7066C445.242 49.5828 453.147 41 462.633 41C467.433 41 471.809 43.2304 475.027 46.8724C478.246 50.5145 480.307 55.5682 480.504 61.2147L481.493 89.1935H481.521Z" fill="url(#paint37_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M473.199 92.6369C472.268 93.5968 471.844 95.0367 472.126 96.3637C472.578 96.6178 473.171 96.5895 473.651 96.3637C474.131 96.1378 474.554 95.799 474.921 95.4602C475.655 94.7826 480.342 90.096 478.338 89.136C477.632 88.7973 476.446 89.8983 475.994 90.3218C475.091 91.1123 474.046 91.7899 473.199 92.6369Z" fill="url(#paint38_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M476.582 84.5626C477.542 84.2238 477.824 83.0098 477.937 81.9934C478.191 80.0171 478.869 77.1091 478.078 75.1892C477.627 74.0882 476.864 73.4953 476.384 74.6246C475.961 75.5845 476.61 77.5608 476.667 78.5772C476.723 79.283 476.949 84.3932 476.554 84.5343L476.582 84.5626Z" fill="url(#paint39_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M470.314 49.2154C470.653 49.7236 471.02 50.3447 471.641 50.4012C472.149 50.4577 472.629 50.0624 472.798 49.5824C472.968 49.1025 472.911 48.5661 472.798 48.0861C472.431 46.8721 471.528 45.8275 470.399 45.2628C469.439 44.8111 467.519 44.3594 467.773 45.9686C467.942 47.0697 469.749 48.2273 470.342 49.1872L470.314 49.2154Z" fill="url(#paint40_linear_604_110231)" />
      </g>
      <g filter="url(#filter10_d_604_110231)" {...addHoverToFilterGroup('filter10_d_604_110231')}>
        <path d="M436.64 151.192V336.23H399.4V151.192C399.4 142.355 405.358 134.958 413.404 132.869V101.869L422.636 102.039V132.897C430.682 134.986 436.64 142.383 436.64 151.22V151.192Z" fill="#8F8C88" />
        <path d="M422.639 98.0312V102.012L413.407 101.871V98.0312H422.639Z" fill="#8F8C88" />
        <path d="M437.546 89.1935C437.8 96.28 432.944 102.181 426.902 102.096L422.639 102.04L413.407 101.87L407.986 101.785C402.425 101.701 398.077 96.1106 398.528 89.5888L400.505 60.7066C401.267 49.5828 409.172 41 418.658 41C423.458 41 427.834 43.2304 431.053 46.8724C434.271 50.5145 436.332 55.5682 436.53 61.2147L437.518 89.1935H437.546Z" fill="url(#paint41_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M429.225 92.6369C428.293 93.5968 427.869 95.0367 428.152 96.3637C428.604 96.6178 429.196 96.5895 429.676 96.3637C430.156 96.1378 430.58 95.799 430.947 95.4602C431.681 94.7826 436.368 90.096 434.363 89.136C433.657 88.7973 432.471 89.8983 432.02 90.3218C431.116 91.1123 430.072 91.7899 429.225 92.6369Z" fill="url(#paint42_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M432.607 84.5626C433.567 84.2238 433.85 83.0098 433.962 81.9934C434.217 80.0171 434.894 77.1091 434.104 75.1892C433.652 74.0882 432.89 73.4953 432.41 74.6246C431.986 75.5845 432.636 77.5608 432.692 78.5772C432.748 79.283 432.974 84.3932 432.579 84.5343L432.607 84.5626Z" fill="url(#paint43_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M426.339 49.2154C426.678 49.7236 427.045 50.3447 427.666 50.4012C428.174 50.4577 428.654 50.0624 428.824 49.5824C428.993 49.1025 428.937 48.5661 428.824 48.0861C428.457 46.8721 427.553 45.8275 426.424 45.2628C425.464 44.8111 423.544 44.3594 423.798 45.9686C423.968 47.0697 425.775 48.2273 426.368 49.1872L426.339 49.2154Z" fill="url(#paint44_linear_604_110231)" />
      </g>
      <g filter="url(#filter11_d_604_110231)" {...addHoverToFilterGroup('filter11_d_604_110231')}>
        <path d="M392.666 151.192V336.23H355.427V151.192C355.427 142.355 361.384 134.958 369.43 132.869V101.869L378.662 102.039V132.897C386.709 134.986 392.666 142.383 392.666 151.22V151.192Z" fill="#8F8C88" />
        <path d="M378.665 98.0312V102.012L369.433 101.871V98.0312H378.665Z" fill="#8F8C88" />
        <path d="M393.572 89.1935C393.826 96.28 388.97 102.181 382.928 102.096L378.665 102.04L369.432 101.87L364.012 101.785C358.45 101.701 354.102 96.1106 354.554 89.5888L356.53 60.7066C357.292 49.5828 365.198 41 374.684 41C379.483 41 383.859 43.2304 387.078 46.8724C390.297 50.5145 392.358 55.5682 392.555 61.2147L393.543 89.1935H393.572Z" fill="url(#paint45_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M385.25 92.6369C384.318 93.5968 383.895 95.0367 384.177 96.3637C384.629 96.6178 385.222 96.5895 385.702 96.3637C386.182 96.1378 386.605 95.799 386.972 95.4602C387.706 94.7826 392.393 90.096 390.388 89.136C389.683 88.7973 388.497 89.8983 388.045 90.3218C387.142 91.1123 386.097 91.7899 385.25 92.6369Z" fill="url(#paint46_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M388.633 84.5626C389.593 84.2238 389.875 83.0098 389.988 81.9934C390.242 80.0171 390.92 77.1091 390.129 75.1892C389.677 74.0882 388.915 73.4953 388.435 74.6246C388.012 75.5845 388.661 77.5608 388.717 78.5772C388.774 79.283 389 84.3932 388.604 84.5343L388.633 84.5626Z" fill="url(#paint47_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M382.365 49.2154C382.703 49.7236 383.071 50.3447 383.692 50.4012C384.2 50.4577 384.68 50.0624 384.849 49.5824C385.019 49.1025 384.962 48.5661 384.849 48.0861C384.482 46.8721 383.579 45.8275 382.449 45.2628C381.489 44.8111 379.57 44.3594 379.824 45.9686C379.993 47.0697 381.8 48.2273 382.393 49.1872L382.365 49.2154Z" fill="url(#paint48_linear_604_110231)" />
      </g>
      <g filter="url(#filter12_d_604_110231)" {...addHoverToFilterGroup('filter12_d_604_110231')}>
        <path d="M348.69 151.192V336.23H311.451V151.192C311.451 142.355 317.408 134.958 325.455 132.869V101.869L334.687 102.039V132.897C342.733 134.986 348.69 142.383 348.69 151.22V151.192Z" fill="#8F8C88" />
        <path d="M334.689 98.0312V102.012L325.457 101.871V98.0312H334.689Z" fill="#8F8C88" />
        <path d="M349.597 89.1935C349.851 96.28 344.995 102.181 338.953 102.096L334.69 102.04L325.458 101.87L320.037 101.785C314.475 101.701 310.127 96.1106 310.579 89.5888L312.555 60.7066C313.318 49.5828 321.223 41 330.709 41C335.509 41 339.885 43.2304 343.103 46.8724C346.322 50.5145 348.383 55.5682 348.581 61.2147L349.569 89.1935H349.597Z" fill="url(#paint49_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M341.273 92.6369C340.342 93.5968 339.918 95.0367 340.201 96.3637C340.652 96.6178 341.245 96.5895 341.725 96.3637C342.205 96.1378 342.629 95.799 342.996 95.4602C343.73 94.7826 348.416 90.096 346.412 89.136C345.706 88.7973 344.52 89.8983 344.069 90.3218C343.165 91.1123 342.12 91.7899 341.273 92.6369Z" fill="url(#paint50_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M344.656 84.5626C345.616 84.2238 345.898 83.0098 346.011 81.9934C346.265 80.0171 346.943 77.1091 346.152 75.1892C345.701 74.0882 344.938 73.4953 344.458 74.6246C344.035 75.5845 344.684 77.5608 344.741 78.5772C344.797 79.283 345.023 84.3932 344.628 84.5343L344.656 84.5626Z" fill="url(#paint51_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M338.388 49.2154C338.727 49.7236 339.094 50.3447 339.715 50.4012C340.223 50.4577 340.703 50.0624 340.873 49.5824C341.042 49.1025 340.986 48.5661 340.873 48.0861C340.506 46.8721 339.602 45.8275 338.473 45.2628C337.513 44.8111 335.593 44.3594 335.847 45.9686C336.017 47.0697 337.823 48.2273 338.416 49.1872L338.388 49.2154Z" fill="url(#paint52_linear_604_110231)" />
      </g>
      <g filter="url(#filter13_d_604_110231)" {...addHoverToFilterGroup('filter13_d_604_110231')}>
        <path d="M172.792 151.196V336.234H135.553V151.196C135.553 142.359 141.51 134.962 149.556 132.873V101.873L158.788 102.042V132.901C166.835 134.99 172.792 142.387 172.792 151.224V151.196Z" fill="#8F8C88" />
        <path d="M158.791 98.0332V102.014L149.559 101.873V98.0332H158.791Z" fill="#8F8C88" />
        <path d="M173.699 89.1955C173.953 96.2819 169.097 102.183 163.055 102.098L158.792 102.041L149.559 101.872L144.139 101.787C138.577 101.703 134.229 96.1125 134.681 89.5907L136.657 60.7085C137.419 49.5848 145.325 41.002 154.811 41.002C159.61 41.002 163.986 43.2324 167.205 46.8744C170.424 50.5164 172.485 55.5701 172.682 61.2167L173.67 89.1955H173.699Z" fill="url(#paint53_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M165.376 92.6389C164.444 93.5988 164.021 95.0387 164.303 96.3656C164.755 96.6197 165.348 96.5915 165.828 96.3656C166.308 96.1398 166.731 95.801 167.098 95.4622C167.832 94.7846 172.519 90.0979 170.514 89.138C169.809 88.7992 168.623 89.9003 168.171 90.3238C167.268 91.1143 166.223 91.7919 165.376 92.6389Z" fill="url(#paint54_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M168.758 84.5665C169.718 84.2277 170 83.0137 170.113 81.9973C170.367 80.021 171.045 77.113 170.254 75.1932C169.802 74.0921 169.04 73.4992 168.56 74.6285C168.137 75.5884 168.786 77.5647 168.842 78.5811C168.899 79.2869 169.125 84.3971 168.729 84.5382L168.758 84.5665Z" fill="url(#paint55_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M162.49 49.2174C162.828 49.7256 163.196 50.3467 163.817 50.4031C164.325 50.4596 164.805 50.0644 164.974 49.5844C165.144 49.1044 165.087 48.568 164.974 48.0881C164.607 46.874 163.704 45.8294 162.574 45.2648C161.614 44.813 159.695 44.3613 159.949 45.9706C160.118 47.0717 161.925 48.2292 162.518 49.1891L162.49 49.2174Z" fill="url(#paint56_linear_604_110231)" />
      </g>
      <g filter="url(#filter14_d_604_110231)" {...addHoverToFilterGroup('filter14_d_604_110231')}>
        <path d="M84.8407 151.196V336.234H47.6016V151.196C47.6016 142.359 53.5587 134.962 61.6051 132.873V101.873L70.8372 102.042V132.901C78.8836 134.99 84.8407 142.387 84.8407 151.224V151.196Z" fill="#8F8C88" />
        <path d="M70.8396 98.0332V102.014L61.6074 101.873V98.0332H70.8396Z" fill="#8F8C88" />
        <path d="M85.7474 89.1955C86.0015 96.2819 81.1454 102.183 75.1036 102.098L70.8404 102.041L61.6083 101.872L56.1876 101.787C50.6257 101.703 46.2778 96.1125 46.7295 89.5907L48.7058 60.7085C49.4681 49.5848 57.3733 41.002 66.8596 41.002C71.6592 41.002 76.0353 43.2324 79.2538 46.8744C82.4724 50.5164 84.5334 55.5701 84.731 61.2167L85.7192 89.1955H85.7474Z" fill="url(#paint57_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M77.4214 92.6389C76.4897 93.5988 76.0662 95.0387 76.3486 96.3656C76.8003 96.6197 77.3932 96.5915 77.8731 96.3656C78.3531 96.1398 78.7766 95.801 79.1436 95.4622C79.8777 94.7846 84.5643 90.0979 82.5598 89.138C81.854 88.7992 80.6682 89.9003 80.2165 90.3238C79.313 91.1143 78.2684 91.7919 77.4214 92.6389Z" fill="url(#paint58_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M80.805 84.5665C81.765 84.2277 82.0473 83.0137 82.1602 81.9973C82.4143 80.021 83.0919 77.113 82.3014 75.1932C81.8497 74.0921 81.0874 73.4992 80.6074 74.6285C80.1839 75.5884 80.8333 77.5647 80.8897 78.5811C80.9462 79.2869 81.1721 84.3971 80.7768 84.5382L80.805 84.5665Z" fill="url(#paint59_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M74.5366 49.2174C74.8754 49.7256 75.2424 50.3467 75.8635 50.4031C76.3717 50.4596 76.8517 50.0644 77.0211 49.5844C77.1905 49.1044 77.134 48.568 77.0211 48.0881C76.654 46.874 75.7506 45.8294 74.6213 45.2648C73.6613 44.813 71.7415 44.3613 71.9956 45.9706C72.165 47.0717 73.9719 48.2292 74.5648 49.1891L74.5366 49.2174Z" fill="url(#paint60_linear_604_110231)" />
      </g>
      <g filter="url(#filter15_d_604_110231)" {...addHoverToFilterGroup('filter15_d_604_110231')}>
        <path d="M304.716 151.192V336.23H267.477V151.192C267.477 142.355 273.434 134.958 281.48 132.869V101.869L290.712 102.039V132.897C298.759 134.986 304.716 142.383 304.716 151.22V151.192Z" fill="#8F8C88" />
        <path d="M290.715 98.0312V102.012L281.482 101.871V98.0312H290.715Z" fill="#8F8C88" />
        <path d="M305.622 89.1935C305.876 96.28 301.02 102.181 294.979 102.096L290.715 102.04L281.483 101.87L276.063 101.785C270.501 101.701 266.153 96.1106 266.605 89.5888L268.581 60.7066C269.343 49.5828 277.248 41 286.735 41C291.534 41 295.91 43.2304 299.129 46.8724C302.347 50.5145 304.408 55.5682 304.606 61.2147L305.594 89.1935H305.622Z" fill="url(#paint61_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M297.299 92.6369C296.367 93.5968 295.944 95.0367 296.226 96.3637C296.678 96.6178 297.271 96.5895 297.751 96.3637C298.231 96.1378 298.654 95.799 299.021 95.4602C299.755 94.7826 304.442 90.096 302.437 89.136C301.731 88.7973 300.546 89.8983 300.094 90.3218C299.19 91.1123 298.146 91.7899 297.299 92.6369Z" fill="url(#paint62_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M300.682 84.5626C301.642 84.2238 301.924 83.0098 302.037 81.9934C302.291 80.0171 302.969 77.1091 302.178 75.1892C301.727 74.0882 300.964 73.4953 300.484 74.6246C300.061 75.5845 300.71 77.5608 300.767 78.5772C300.823 79.283 301.049 84.3932 300.654 84.5343L300.682 84.5626Z" fill="url(#paint63_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M294.414 49.2154C294.752 49.7236 295.119 50.3447 295.74 50.4012C296.249 50.4577 296.729 50.0624 296.898 49.5824C297.067 49.1025 297.011 48.5661 296.898 48.0861C296.531 46.8721 295.628 45.8275 294.498 45.2628C293.538 44.8111 291.618 44.3594 291.873 45.9686C292.042 47.0697 293.849 48.2273 294.442 49.1872L294.414 49.2154Z" fill="url(#paint64_linear_604_110231)" />
      </g>
      <g filter="url(#filter16_d_604_110231)" {...addHoverToFilterGroup('filter16_d_604_110231')} style={{ cursor: 'pointer' }}>
        <path d="M876.386 151.192V336.23H839.146V151.192C839.146 142.355 845.104 134.958 853.15 132.869V101.869L862.382 102.039V132.897C870.429 134.986 876.386 142.383 876.386 151.22V151.192Z" fill="#8F8C88" />
        <path d="M862.384 98.0312V102.012L853.152 101.871V98.0312H862.384Z" fill="#8F8C88" />
        <path d="M877.292 89.1935C877.546 96.28 872.69 102.181 866.649 102.096L862.385 102.04L853.153 101.87L847.732 101.785C842.171 101.701 837.823 96.1106 838.274 89.5888L840.251 60.7066C841.013 49.5828 848.918 41 858.405 41C863.204 41 867.58 43.2304 870.799 46.8724C874.017 50.5145 876.078 55.5682 876.276 61.2147L877.264 89.1935H877.292Z" fill="url(#paint65_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M868.967 92.6369C868.035 93.5968 867.612 95.0367 867.894 96.3637C868.346 96.6178 868.939 96.5895 869.419 96.3637C869.899 96.1378 870.322 95.799 870.689 95.4602C871.423 94.7826 876.11 90.096 874.105 89.136C873.399 88.7973 872.214 89.8983 871.762 90.3218C870.858 91.1123 869.814 91.7899 868.967 92.6369Z" fill="url(#paint66_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M872.316 84.5626C873.276 84.2238 873.559 83.0098 873.671 81.9934C873.926 80.0171 874.603 77.1091 873.813 75.1892C873.361 74.0882 872.599 73.4953 872.119 74.6246C871.695 75.5845 872.345 77.5608 872.401 78.5772C872.457 79.283 872.683 84.3932 872.288 84.5343L872.316 84.5626Z" fill="url(#paint67_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M866.081 49.2154C866.419 49.7236 866.786 50.3447 867.407 50.4012C867.916 50.4577 868.396 50.0624 868.565 49.5824C868.734 49.1025 868.678 48.5661 868.565 48.0861C868.198 46.8721 867.295 45.8275 866.165 45.2628C865.205 44.8111 863.285 44.3594 863.54 45.9686C863.709 47.0697 865.516 48.2273 866.109 49.1872L866.081 49.2154Z" fill="url(#paint68_linear_604_110231)" />
      </g>
      <g filter="url(#filter17_d_604_110231)" {...addHoverToFilterGroup('filter17_d_604_110231')}>
        <path d="M260.741 151.192V336.23H223.502V151.192C223.502 142.355 229.459 134.958 237.505 132.869V101.869L246.738 102.039V132.897C254.784 134.986 260.741 142.383 260.741 151.22V151.192Z" fill="#8F8C88" />
        <path d="M246.74 98.0312V102.012L237.508 101.871V98.0312H246.74Z" fill="#8F8C88" />
        <path d="M261.648 89.1935C261.902 96.28 257.046 102.181 251.004 102.096L246.741 102.04L237.509 101.87L232.088 101.785C226.526 101.701 222.178 96.1106 222.63 89.5888L224.606 60.7066C225.369 49.5828 233.274 41 242.76 41C247.56 41 251.936 43.2304 255.154 46.8724C258.373 50.5145 260.434 55.5682 260.631 61.2147L261.62 89.1935H261.648Z" fill="url(#paint69_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M253.324 92.6369C252.393 93.5968 251.969 95.0367 252.251 96.3637C252.703 96.6178 253.296 96.5895 253.776 96.3637C254.256 96.1378 254.679 95.799 255.046 95.4602C255.78 94.7826 260.467 90.096 258.463 89.136C257.757 88.7973 256.571 89.8983 256.119 90.3218C255.216 91.1123 254.171 91.7899 253.324 92.6369Z" fill="url(#paint70_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M256.708 84.5626C257.668 84.2238 257.95 83.0098 258.063 81.9934C258.317 80.0171 258.995 77.1091 258.204 75.1892C257.752 74.0882 256.99 73.4953 256.51 74.6246C256.087 75.5845 256.736 77.5608 256.793 78.5772C256.849 79.283 257.075 84.3932 256.68 84.5343L256.708 84.5626Z" fill="url(#paint71_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M250.439 49.2154C250.778 49.7236 251.145 50.3447 251.766 50.4012C252.274 50.4577 252.754 50.0624 252.923 49.5824C253.093 49.1025 253.036 48.5661 252.923 48.0861C252.556 46.8721 251.653 45.8275 250.524 45.2628C249.564 44.8111 247.644 44.3594 247.898 45.9686C248.067 47.0697 249.874 48.2273 250.467 49.1872L250.439 49.2154Z" fill="url(#paint72_linear_604_110231)" />
      </g>
      <g filter="url(#filter18_d_604_110231)" {...addHoverToFilterGroup('filter18_d_604_110231')}>
        <path d="M216.768 151.192V336.23H179.529V151.192C179.529 142.355 185.486 134.958 193.533 132.869V101.869L202.765 102.039V132.897C210.811 134.986 216.768 142.383 216.768 151.22V151.192Z" fill="#8F8C88" />
        <path d="M202.767 98.0312V102.012L193.535 101.871V98.0312H202.767Z" fill="#8F8C88" />
        <path d="M217.675 89.1935C217.929 96.28 213.073 102.181 207.031 102.096L202.768 102.04L193.536 101.87L188.115 101.785C182.553 101.701 178.206 96.1106 178.657 89.5888L180.634 60.7066C181.396 49.5828 189.301 41 198.787 41C203.587 41 207.963 43.2304 211.182 46.8724C214.4 50.5145 216.461 55.5682 216.659 61.2147L217.647 89.1935H217.675Z" fill="url(#paint73_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M209.352 92.6369C208.42 93.5968 207.996 95.0367 208.279 96.3637C208.73 96.6178 209.323 96.5895 209.803 96.3637C210.283 96.1378 210.707 95.799 211.074 95.4602C211.808 94.7826 216.495 90.096 214.49 89.136C213.784 88.7973 212.598 89.8983 212.147 90.3218C211.243 91.1123 210.199 91.7899 209.352 92.6369Z" fill="url(#paint74_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M212.735 84.5626C213.695 84.2238 213.977 83.0098 214.09 81.9934C214.345 80.0171 215.022 77.1091 214.232 75.1892C213.78 74.0882 213.018 73.4953 212.538 74.6246C212.114 75.5845 212.763 77.5608 212.82 78.5772C212.876 79.283 213.102 84.3932 212.707 84.5343L212.735 84.5626Z" fill="url(#paint75_linear_604_110231)" />
        <path style={{ mixBlendMode: "screen" }} opacity="0.42" d="M206.466 49.2154C206.805 49.7236 207.172 50.3447 207.793 50.4012C208.301 50.4577 208.781 50.0624 208.951 49.5824C209.12 49.1025 209.064 48.5661 208.951 48.0861C208.584 46.8721 207.68 45.8275 206.551 45.2628C205.591 44.8111 203.671 44.3594 203.925 45.9686C204.095 47.0697 205.902 48.2273 206.494 49.1872L206.466 49.2154Z" fill="url(#paint76_linear_604_110231)" />
      </g>
      <g clipPath="url(#clip1_604_110231)">
        <path d="M-0.00488281 182.028V327.628C-0.00488281 351.476 19.3692 370.822 43.2765 370.822H880.566C904.473 370.822 923.847 351.476 923.847 327.628V182.028H-0.00488281Z" fill="#BDCAD1" />
        <path d="M375.859 297.972V329.754C375.859 339.873 384.08 348.077 394.22 348.077H584.464C594.604 348.077 602.825 339.873 602.825 329.754V297.972C602.825 287.852 594.604 279.648 584.464 279.648H394.22C384.08 279.648 375.859 287.852 375.859 297.972Z" fill="url(#paint77_linear_604_110231)" />
        <path d="M622.142 297.972V329.754C622.142 339.873 630.362 348.077 640.502 348.077H871.055C881.195 348.077 889.415 339.873 889.415 329.754V297.972C889.415 287.852 881.195 279.648 871.055 279.648H640.502C630.362 279.648 622.142 287.852 622.142 297.972Z" fill="url(#paint78_linear_604_110231)" />
        <path d="M7.83132 182.028H-0.00488281V226.678H7.83132V182.028Z" fill="url(#paint79_linear_604_110231)" />
        <path d="M15.6677 182.028H7.83154V226.678H15.6677V182.028Z" fill="url(#paint80_linear_604_110231)" />
        <path d="M23.4925 182.028H15.6562V226.678H23.4925V182.028Z" fill="url(#paint81_linear_604_110231)" />
        <path d="M31.3284 182.028H23.4922V226.678H31.3284V182.028Z" fill="url(#paint82_linear_604_110231)" />
        <path d="M39.1536 182.028H31.3174V226.678H39.1536V182.028Z" fill="url(#paint83_linear_604_110231)" />
        <path d="M46.9895 182.028H39.1533V226.678H46.9895V182.028Z" fill="url(#paint84_linear_604_110231)" />
        <path d="M54.8142 182.028H46.978V226.678H54.8142V182.028Z" fill="url(#paint85_linear_604_110231)" />
        <path d="M62.6507 182.028H54.8145V226.678H62.6507V182.028Z" fill="url(#paint86_linear_604_110231)" />
        <path d="M70.4754 182.028H62.6392V226.678H70.4754V182.028Z" fill="url(#paint87_linear_604_110231)" />
        <path d="M78.3118 182.028H70.4756V226.678H78.3118V182.028Z" fill="url(#paint88_linear_604_110231)" />
        <path d="M86.1365 182.028H78.3003V226.678H86.1365V182.028Z" fill="url(#paint89_linear_604_110231)" />
        <path d="M93.9724 182.028H86.1362V226.678H93.9724V182.028Z" fill="url(#paint90_linear_604_110231)" />
        <path d="M101.798 182.028H93.9614V226.678H101.798V182.028Z" fill="url(#paint91_linear_604_110231)" />
        <path d="M109.634 182.028H101.797V226.678H109.634V182.028Z" fill="url(#paint92_linear_604_110231)" />
        <path d="M117.458 182.028H109.622V226.678H117.458V182.028Z" fill="url(#paint93_linear_604_110231)" />
        <path d="M125.295 182.028H117.458V226.678H125.295V182.028Z" fill="url(#paint94_linear_604_110231)" />
        <path d="M133.119 182.028H125.283V226.678H133.119V182.028Z" fill="url(#paint95_linear_604_110231)" />
        <path d="M140.956 182.028H133.12V226.678H140.956V182.028Z" fill="url(#paint96_linear_604_110231)" />
        <path d="M148.781 182.028H140.944V226.678H148.781V182.028Z" fill="url(#paint97_linear_604_110231)" />
        <path d="M156.616 182.028H148.78V226.678H156.616V182.028Z" fill="url(#paint98_linear_604_110231)" />
        <path d="M164.442 182.028H156.605V226.678H164.442V182.028Z" fill="url(#paint99_linear_604_110231)" />
        <path d="M172.278 182.028H164.441V226.678H172.278V182.028Z" fill="url(#paint100_linear_604_110231)" />
        <path d="M180.102 182.028H172.266V226.678H180.102V182.028Z" fill="url(#paint101_linear_604_110231)" />
        <path d="M187.939 182.028H180.103V226.678H187.939V182.028Z" fill="url(#paint102_linear_604_110231)" />
        <path d="M195.763 182.028H187.927V226.678H195.763V182.028Z" fill="url(#paint103_linear_604_110231)" />
        <path d="M203.6 182.028H195.764V226.678H203.6V182.028Z" fill="url(#paint104_linear_604_110231)" />
        <path d="M211.425 182.028H203.588V226.678H211.425V182.028Z" fill="url(#paint105_linear_604_110231)" />
        <path d="M219.261 182.028H211.424V226.678H219.261V182.028Z" fill="url(#paint106_linear_604_110231)" />
        <path d="M227.086 182.028H219.25V226.678H227.086V182.028Z" fill="url(#paint107_linear_604_110231)" />
        <path d="M234.922 182.028H227.085V226.678H234.922V182.028Z" fill="url(#paint108_linear_604_110231)" />
        <path d="M242.746 182.028H234.91V226.678H242.746V182.028Z" fill="url(#paint109_linear_604_110231)" />
        <path d="M250.583 182.028H242.747V226.678H250.583V182.028Z" fill="url(#paint110_linear_604_110231)" />
        <path d="M258.407 182.028H250.571V226.678H258.407V182.028Z" fill="url(#paint111_linear_604_110231)" />
        <path d="M266.244 182.028H258.408V226.678H266.244V182.028Z" fill="url(#paint112_linear_604_110231)" />
        <path d="M274.069 182.028H266.232V226.678H274.069V182.028Z" fill="url(#paint113_linear_604_110231)" />
        <path d="M281.905 182.028H274.069V226.678H281.905V182.028Z" fill="url(#paint114_linear_604_110231)" />
        <path d="M289.73 182.028H281.894V226.678H289.73V182.028Z" fill="url(#paint115_linear_604_110231)" />
        <path d="M297.566 182.028H289.729V226.678H297.566V182.028Z" fill="url(#paint116_linear_604_110231)" />
        <path d="M305.39 182.028H297.554V226.678H305.39V182.028Z" fill="url(#paint117_linear_604_110231)" />
        <path d="M313.227 182.028H305.391V226.678H313.227V182.028Z" fill="url(#paint118_linear_604_110231)" />
        <path d="M321.052 182.028H313.215V226.678H321.052V182.028Z" fill="url(#paint119_linear_604_110231)" />
        <path d="M328.888 182.028H321.052V226.678H328.888V182.028Z" fill="url(#paint120_linear_604_110231)" />
        <path d="M336.713 182.028H328.876V226.678H336.713V182.028Z" fill="url(#paint121_linear_604_110231)" />
        <path d="M344.549 182.028H336.713V226.678H344.549V182.028Z" fill="url(#paint122_linear_604_110231)" />
        <path d="M352.374 182.028H344.538V226.678H352.374V182.028Z" fill="url(#paint123_linear_604_110231)" />
        <path d="M360.21 182.028H352.374V226.678H360.21V182.028Z" fill="url(#paint124_linear_604_110231)" />
        <path d="M368.035 182.028H360.199V226.678H368.035V182.028Z" fill="url(#paint125_linear_604_110231)" />
        <path d="M375.871 182.028H368.035V226.678H375.871V182.028Z" fill="url(#paint126_linear_604_110231)" />
        <path d="M383.696 182.028H375.859V226.678H383.696V182.028Z" fill="url(#paint127_linear_604_110231)" />
        <path d="M391.532 182.028H383.696V226.678H391.532V182.028Z" fill="url(#paint128_linear_604_110231)" />
        <path d="M399.357 182.028H391.521V226.678H399.357V182.028Z" fill="url(#paint129_linear_604_110231)" />
        <path d="M407.193 182.028H399.357V226.678H407.193V182.028Z" fill="url(#paint130_linear_604_110231)" />
        <path d="M415.018 182.028H407.182V226.678H415.018V182.028Z" fill="url(#paint131_linear_604_110231)" />
        <path d="M422.854 182.028H415.018V226.678H422.854V182.028Z" fill="url(#paint132_linear_604_110231)" />
        <path d="M430.679 182.028H422.843V226.678H430.679V182.028Z" fill="url(#paint133_linear_604_110231)" />
        <path d="M438.515 182.028H430.679V226.678H438.515V182.028Z" fill="url(#paint134_linear_604_110231)" />
        <path d="M446.34 182.028H438.503V226.678H446.34V182.028Z" fill="url(#paint135_linear_604_110231)" />
        <path d="M454.176 182.028H446.34V226.678H454.176V182.028Z" fill="url(#paint136_linear_604_110231)" />
        <path d="M462.001 182.028H454.165V226.678H462.001V182.028Z" fill="url(#paint137_linear_604_110231)" />
        <path d="M469.837 182.028H462.001V226.678H469.837V182.028Z" fill="url(#paint138_linear_604_110231)" />
        <path d="M477.662 182.028H469.826V226.678H477.662V182.028Z" fill="url(#paint139_linear_604_110231)" />
        <path d="M485.498 182.028H477.662V226.678H485.498V182.028Z" fill="url(#paint140_linear_604_110231)" />
        <path d="M493.323 182.028H485.487V226.678H493.323V182.028Z" fill="url(#paint141_linear_604_110231)" />
        <path d="M501.159 182.028H493.323V226.678H501.159V182.028Z" fill="url(#paint142_linear_604_110231)" />
        <path d="M508.984 182.028H501.147V226.678H508.984V182.028Z" fill="url(#paint143_linear_604_110231)" />
        <path d="M516.82 182.028H508.984V226.678H516.82V182.028Z" fill="url(#paint144_linear_604_110231)" />
        <path d="M524.645 182.028H516.809V226.678H524.645V182.028Z" fill="url(#paint145_linear_604_110231)" />
        <path d="M532.481 182.028H524.645V226.678H532.481V182.028Z" fill="url(#paint146_linear_604_110231)" />
        <path d="M540.306 182.028H532.47V226.678H540.306V182.028Z" fill="url(#paint147_linear_604_110231)" />
        <path d="M548.142 182.028H540.306V226.678H548.142V182.028Z" fill="url(#paint148_linear_604_110231)" />
        <path d="M555.967 182.028H548.131V226.678H555.967V182.028Z" fill="url(#paint149_linear_604_110231)" />
        <path d="M563.803 182.028H555.967V226.678H563.803V182.028Z" fill="url(#paint150_linear_604_110231)" />
        <path d="M571.628 182.028H563.792V226.678H571.628V182.028Z" fill="url(#paint151_linear_604_110231)" />
        <path d="M579.464 182.028H571.628V226.678H579.464V182.028Z" fill="url(#paint152_linear_604_110231)" />
        <path d="M587.289 182.028H579.453V226.678H587.289V182.028Z" fill="url(#paint153_linear_604_110231)" />
        <path d="M595.125 182.028H587.289V226.678H595.125V182.028Z" fill="url(#paint154_linear_604_110231)" />
        <path d="M602.95 182.028H595.114V226.678H602.95V182.028Z" fill="url(#paint155_linear_604_110231)" />
        <path d="M610.786 182.028H602.95V226.678H610.786V182.028Z" fill="url(#paint156_linear_604_110231)" />
        <path d="M618.611 182.028H610.775V226.678H618.611V182.028Z" fill="url(#paint157_linear_604_110231)" />
        <path d="M626.447 182.028H618.611V226.678H626.447V182.028Z" fill="url(#paint158_linear_604_110231)" />
        <path d="M634.272 182.028H626.436V226.678H634.272V182.028Z" fill="url(#paint159_linear_604_110231)" />
        <path d="M642.108 182.028H634.272V226.678H642.108V182.028Z" fill="url(#paint160_linear_604_110231)" />
        <path d="M649.933 182.028H642.097V226.678H649.933V182.028Z" fill="url(#paint161_linear_604_110231)" />
        <path d="M657.769 182.028H649.933V226.678H657.769V182.028Z" fill="url(#paint162_linear_604_110231)" />
        <path d="M665.594 182.028H657.758V226.678H665.594V182.028Z" fill="url(#paint163_linear_604_110231)" />
        <path d="M673.43 182.028H665.594V226.678H673.43V182.028Z" fill="url(#paint164_linear_604_110231)" />
        <path d="M681.255 182.028H673.419V226.678H681.255V182.028Z" fill="url(#paint165_linear_604_110231)" />
        <path d="M689.091 182.028H681.255V226.678H689.091V182.028Z" fill="url(#paint166_linear_604_110231)" />
        <path d="M696.916 182.028H689.08V226.678H696.916V182.028Z" fill="url(#paint167_linear_604_110231)" />
        <path d="M704.752 182.028H696.916V226.678H704.752V182.028Z" fill="url(#paint168_linear_604_110231)" />
        <path d="M712.577 182.028H704.741V226.678H712.577V182.028Z" fill="url(#paint169_linear_604_110231)" />
        <path d="M720.413 182.028H712.577V226.678H720.413V182.028Z" fill="url(#paint170_linear_604_110231)" />
        <path d="M728.238 182.028H720.402V226.678H728.238V182.028Z" fill="url(#paint171_linear_604_110231)" />
        <path d="M736.074 182.028H728.238V226.678H736.074V182.028Z" fill="url(#paint172_linear_604_110231)" />
        <path d="M743.899 182.028H736.063V226.678H743.899V182.028Z" fill="url(#paint173_linear_604_110231)" />
        <path d="M751.735 182.028H743.899V226.678H751.735V182.028Z" fill="url(#paint174_linear_604_110231)" />
        <path d="M759.56 182.028H751.724V226.678H759.56V182.028Z" fill="url(#paint175_linear_604_110231)" />
        <path d="M767.396 182.028H759.56V226.678H767.396V182.028Z" fill="url(#paint176_linear_604_110231)" />
        <path d="M775.221 182.028H767.385V226.678H775.221V182.028Z" fill="url(#paint177_linear_604_110231)" />
        <path d="M783.057 182.028H775.221V226.678H783.057V182.028Z" fill="url(#paint178_linear_604_110231)" />
        <path d="M790.882 182.028H783.046V226.678H790.882V182.028Z" fill="url(#paint179_linear_604_110231)" />
        <path d="M798.719 182.028H790.882V226.678H798.719V182.028Z" fill="url(#paint180_linear_604_110231)" />
        <path d="M806.543 182.028H798.707V226.678H806.543V182.028Z" fill="url(#paint181_linear_604_110231)" />
        <path d="M814.38 182.028H806.543V226.678H814.38V182.028Z" fill="url(#paint182_linear_604_110231)" />
        <path d="M822.204 182.028H814.368V226.678H822.204V182.028Z" fill="url(#paint183_linear_604_110231)" />
        <path d="M830.04 182.028H822.204V226.678H830.04V182.028Z" fill="url(#paint184_linear_604_110231)" />
        <path d="M837.865 182.028H830.029V226.678H837.865V182.028Z" fill="url(#paint185_linear_604_110231)" />
        <path d="M845.701 182.028H837.865V226.678H845.701V182.028Z" fill="url(#paint186_linear_604_110231)" />
        <path d="M853.526 182.028H845.69V226.678H853.526V182.028Z" fill="url(#paint187_linear_604_110231)" />
        <path d="M861.363 182.028H853.526V226.678H861.363V182.028Z" fill="url(#paint188_linear_604_110231)" />
        <path d="M869.187 182.028H861.351V226.678H869.187V182.028Z" fill="url(#paint189_linear_604_110231)" />
        <path d="M877.023 182.028H869.187V226.678H877.023V182.028Z" fill="url(#paint190_linear_604_110231)" />
        <path d="M884.848 182.028H877.012V226.678H884.848V182.028Z" fill="url(#paint191_linear_604_110231)" />
        <path d="M892.684 182.028H884.848V226.678H892.684V182.028Z" fill="url(#paint192_linear_604_110231)" />
        <path d="M900.51 182.028H892.673V226.678H900.51V182.028Z" fill="url(#paint193_linear_604_110231)" />
        <path d="M908.345 182.028H900.509V226.678H908.345V182.028Z" fill="url(#paint194_linear_604_110231)" />
        <path d="M916.17 182.028H908.334V226.678H916.17V182.028Z" fill="url(#paint195_linear_604_110231)" />
        <path d="M924.007 182.028H916.17V226.678H924.007V182.028Z" fill="url(#paint196_linear_604_110231)" />
        <path d="M39.5862 280.75C40.1101 280.978 40.5429 281.307 40.9074 281.739C41.2035 282.092 41.4427 282.49 41.6136 282.922C41.7844 283.353 41.8755 283.854 41.8755 284.399C41.8755 285.07 41.7047 285.729 41.363 286.377C41.0213 287.025 40.4632 287.48 39.6887 287.753C40.3379 288.014 40.8049 288.389 41.0783 288.866C41.3516 289.344 41.4883 290.083 41.4883 291.072V292.015C41.4883 292.663 41.5111 293.095 41.568 293.322C41.6477 293.686 41.83 293.948 42.1147 294.129V294.482H38.8572C38.7661 294.175 38.7092 293.913 38.6636 293.732C38.5839 293.334 38.5497 292.936 38.5383 292.515L38.5155 291.208C38.5042 290.31 38.3447 289.708 38.0486 289.412C37.7524 289.117 37.1943 288.957 36.3629 288.957H33.4812V294.482H30.5996V280.387H37.3538C38.3219 280.409 39.0623 280.523 39.5862 280.75ZM33.4926 282.842V286.627H36.6704C37.2968 286.627 37.7752 286.548 38.0941 286.4C38.6522 286.127 38.937 285.604 38.937 284.808C38.937 283.956 38.6636 283.376 38.1283 283.092C37.8208 282.922 37.3652 282.842 36.7615 282.842H33.504H33.4926Z" fill="#685E5C" />
        <path d="M43.0601 294.482L46.6251 289.208L43.2195 284.081H46.5681L48.3108 287.105L50.0192 284.081H53.2653L49.837 289.162L53.402 294.482H50.0079L48.2083 291.345L46.3973 294.482H43.0828H43.0601Z" fill="#685E5C" />
        <path d="M63.0263 284.66C63.7097 285.228 64.0514 286.161 64.0514 287.468V294.481H61.2495V288.138C61.2495 287.593 61.1811 287.172 61.0331 286.877C60.7711 286.342 60.2586 286.07 59.5068 286.07C58.5843 286.07 57.9578 286.456 57.6161 287.24C57.4339 287.65 57.3542 288.184 57.3542 288.832V294.47H54.6206V284.069H57.263V285.592C57.6161 285.058 57.9464 284.672 58.254 284.433C58.8121 284.012 59.5182 283.808 60.3839 283.808C61.4545 283.808 62.3429 284.092 63.0263 284.649V284.66Z" fill="#685E5C" />
        <path d="M68.1289 290.23C68.1289 290.787 68.22 291.242 68.3909 291.606C68.7212 292.276 69.3249 292.606 70.2019 292.606C70.7372 292.606 71.2042 292.424 71.6028 292.06C72.0015 291.697 72.1951 291.162 72.1951 290.48C72.1951 289.571 71.8306 288.957 71.0903 288.65C70.6688 288.48 70.0082 288.389 69.1084 288.389V286.434C69.9969 286.422 70.6119 286.331 70.965 286.172C71.5686 285.899 71.8762 285.365 71.8762 284.547C71.8762 284.012 71.7167 283.592 71.4092 283.251C71.1017 282.921 70.6688 282.751 70.0994 282.751C69.4615 282.751 68.9832 282.955 68.6756 283.365C68.3681 283.774 68.2314 284.319 68.2428 285.001H65.6915C65.7143 284.308 65.8396 283.66 66.0446 283.046C66.2724 282.501 66.6141 282.001 67.0924 281.546C67.4455 281.216 67.8783 280.977 68.3681 280.796C68.8579 280.614 69.4615 280.534 70.1791 280.534C71.5117 280.534 72.571 280.875 73.391 281.557C74.1997 282.239 74.6097 283.16 74.6097 284.319C74.6097 285.138 74.3705 285.82 73.8808 286.388C73.5733 286.741 73.2543 286.979 72.924 287.104C73.1746 287.104 73.5277 287.32 73.9947 287.741C74.6895 288.389 75.0425 289.264 75.0425 290.378C75.0425 291.549 74.6325 292.583 73.8238 293.47C73.0152 294.356 71.8078 294.8 70.2133 294.8C68.2428 294.8 66.8874 294.163 66.1129 292.879C65.7143 292.197 65.4865 291.31 65.4409 290.207H68.1175L68.1289 290.23Z" fill="#685E5C" />
        <path d="M85.2138 280.693C86.2048 281.023 87.002 281.614 87.6171 282.478C88.1069 283.183 88.4486 283.933 88.6194 284.751C88.8016 285.57 88.8928 286.343 88.8928 287.082C88.8928 288.957 88.5169 290.537 87.7652 291.844C86.7401 293.595 85.1683 294.47 83.027 294.47H76.9448V280.375H83.027C83.904 280.386 84.633 280.489 85.2138 280.682V280.693ZM79.8037 282.842V292.038H82.5258C83.9154 292.038 84.8949 291.355 85.4416 289.98C85.7378 289.23 85.8972 288.332 85.8972 287.297C85.8972 285.865 85.6694 284.763 85.2252 283.99C84.7696 283.228 83.8812 282.842 82.5372 282.842H79.8151H79.8037Z" fill="#685E5C" />
        <g filter="url(#filter19_d_604_110231)">
          <path d="M30.9298 307.554C33.0027 305.44 35.6338 304.383 38.8229 304.383C43.0941 304.383 46.2263 305.804 48.2081 308.623C49.3016 310.214 49.8824 311.805 49.9622 313.408H44.5976C44.2559 312.181 43.823 311.248 43.2877 310.623C42.331 309.509 40.9186 308.952 39.0393 308.952C37.16 308.952 35.6224 309.737 34.5176 311.305C33.4127 312.874 32.866 315.102 32.866 317.978C32.866 320.854 33.4469 323.013 34.6087 324.445C35.7704 325.878 37.2511 326.594 39.0507 326.594C40.8503 326.594 42.2968 325.98 43.2649 324.752C43.8003 324.093 44.2445 323.104 44.5976 321.774H49.928C49.4724 324.571 48.2879 326.844 46.3972 328.594C44.5064 330.345 42.0804 331.22 39.1304 331.22C35.4743 331.22 32.6041 330.038 30.5083 327.674C28.4126 325.298 27.3647 322.036 27.3647 317.898C27.3647 313.42 28.5493 309.975 30.9298 307.543V307.554Z" fill="#184554" />
          <path d="M65.5892 311.657C66.5459 312.067 67.3318 312.68 67.9355 313.522C68.4594 314.226 68.7784 314.954 68.8922 315.704C69.0061 316.454 69.0631 317.67 69.0631 319.364V330.504H63.9946V318.955C63.9946 317.932 63.8238 317.113 63.4707 316.477C63.0265 315.59 62.1722 315.147 60.908 315.147C59.6437 315.147 58.6186 315.59 57.9352 316.466C57.2632 317.341 56.9215 318.591 56.9215 320.217V330.492H51.9556V304.939H56.9215V313.988C57.6391 312.885 58.4705 312.112 59.4159 311.68C60.3613 311.248 61.3522 311.032 62.3887 311.032C63.5618 311.032 64.6211 311.237 65.5778 311.646L65.5892 311.657Z" fill="#184554" />
          <path d="M82.3661 311.112C82.4345 311.112 82.5712 311.123 82.799 311.134V316.215C82.48 316.181 82.2067 316.159 81.9561 316.147C81.7169 316.147 81.5119 316.124 81.3638 316.124C79.3706 316.124 78.0266 316.772 77.3318 318.068C76.9446 318.796 76.7623 319.921 76.7623 321.444V330.504H71.7622V311.544H76.5004V314.851C77.2635 313.59 77.9355 312.726 78.505 312.26C79.439 311.487 80.6463 311.089 82.127 311.089C82.2181 311.089 82.2978 311.089 82.3661 311.089V311.112Z" fill="#184554" />
          <path d="M99.6217 328.196C98.0157 330.174 95.5783 331.163 92.3208 331.163C89.0633 331.163 86.6259 330.174 85.02 328.196C83.414 326.219 82.6167 323.843 82.6167 321.058C82.6167 318.273 83.414 315.954 85.02 313.954C86.6259 311.953 89.0633 310.941 92.3208 310.941C95.5783 310.941 98.0157 311.942 99.6217 313.954C101.228 315.954 102.025 318.33 102.025 321.058C102.025 323.786 101.228 326.219 99.6217 328.196ZM95.6467 325.457C96.4212 324.423 96.8198 322.956 96.8198 321.058C96.8198 319.16 96.4326 317.693 95.6467 316.67C94.8608 315.647 93.756 315.136 92.2981 315.136C90.8402 315.136 89.7239 315.647 88.938 316.67C88.1522 317.693 87.7649 319.16 87.7649 321.058C87.7649 322.956 88.1522 324.423 88.938 325.457C89.7239 326.491 90.8402 327.003 92.2981 327.003C93.756 327.003 94.8608 326.491 95.6467 325.457Z" fill="#184554" />
          <path d="M127.356 311.624C128.165 311.953 128.905 312.522 129.566 313.329C130.101 313.988 130.465 314.807 130.648 315.761C130.762 316.398 130.819 317.33 130.819 318.558L130.784 330.504H125.693V318.433C125.693 317.717 125.579 317.125 125.34 316.659C124.896 315.773 124.087 315.341 122.903 315.341C121.536 315.341 120.579 315.909 120.055 317.046C119.793 317.648 119.656 318.376 119.656 319.217V330.504H114.656V319.217C114.656 318.092 114.542 317.273 114.303 316.762C113.882 315.841 113.062 315.386 111.843 315.386C110.419 315.386 109.474 315.841 108.984 316.762C108.711 317.285 108.586 318.058 108.586 319.092V330.504H103.551V311.578H108.381V314.341C108.996 313.352 109.576 312.647 110.123 312.238C111.091 311.499 112.333 311.124 113.87 311.124C115.328 311.124 116.502 311.442 117.39 312.078C118.107 312.67 118.654 313.431 119.03 314.352C119.679 313.238 120.488 312.42 121.456 311.897C122.481 311.374 123.62 311.112 124.873 311.112C125.704 311.112 126.536 311.271 127.345 311.601L127.356 311.624Z" fill="#184554" />
          <path d="M140.99 318.989C141.912 318.876 142.573 318.728 142.971 318.557C143.689 318.25 144.042 317.784 144.042 317.148C144.042 316.375 143.769 315.829 143.222 315.534C142.675 315.238 141.867 315.09 140.807 315.09C139.623 315.09 138.78 315.375 138.279 315.954C137.926 316.386 137.687 316.966 137.573 317.693H132.777C132.88 316.034 133.347 314.67 134.178 313.601C135.5 311.93 137.766 311.101 140.967 311.101C143.051 311.101 144.908 311.51 146.536 312.34C148.154 313.158 148.974 314.715 148.974 317V325.696C148.974 326.298 148.985 327.026 149.008 327.89C149.042 328.538 149.145 328.981 149.304 329.208C149.464 329.436 149.714 329.629 150.033 329.777V330.504H144.634C144.486 330.118 144.384 329.765 144.315 329.424C144.258 329.083 144.213 328.708 144.179 328.276C143.484 329.015 142.698 329.651 141.798 330.174C140.728 330.788 139.509 331.095 138.153 331.095C136.422 331.095 134.999 330.606 133.871 329.629C132.743 328.651 132.174 327.264 132.174 325.457C132.174 323.127 133.085 321.433 134.896 320.399C135.887 319.83 137.356 319.421 139.292 319.182L141.001 318.978L140.99 318.989ZM144.031 321.297C143.712 321.49 143.393 321.649 143.063 321.774C142.744 321.899 142.299 322.013 141.73 322.115L140.602 322.32C139.543 322.502 138.78 322.729 138.324 323.002C137.538 323.456 137.151 324.15 137.151 325.105C137.151 325.957 137.39 326.56 137.869 326.935C138.347 327.31 138.928 327.503 139.611 327.503C140.693 327.503 141.696 327.185 142.607 326.56C143.518 325.934 143.996 324.786 144.031 323.138V321.297Z" fill="#184554" />
          <path d="M166.856 305.44C168.655 306.032 170.113 307.111 171.23 308.691C172.129 309.964 172.733 311.351 173.063 312.829C173.394 314.318 173.553 315.728 173.553 317.069C173.553 320.479 172.87 323.366 171.492 325.73C169.635 328.925 166.753 330.516 162.869 330.516H151.787V304.872H162.869C164.464 304.895 165.785 305.077 166.844 305.429L166.856 305.44ZM157.004 309.328V326.06H161.958C164.498 326.06 166.264 324.81 167.266 322.32C167.813 320.956 168.086 319.319 168.086 317.433C168.086 314.818 167.676 312.818 166.856 311.419C166.036 310.021 164.407 309.328 161.958 309.328H157.004Z" fill="#184554" />
          <path d="M187.631 311.942C188.952 312.533 190.046 313.465 190.911 314.75C191.686 315.875 192.198 317.182 192.426 318.671C192.563 319.546 192.62 320.797 192.586 322.434H178.747C178.827 324.332 179.487 325.673 180.74 326.435C181.503 326.912 182.415 327.151 183.474 327.151C184.601 327.151 185.524 326.867 186.23 326.276C186.617 325.957 186.959 325.525 187.255 324.968H192.324C192.187 326.094 191.572 327.23 190.479 328.39C188.781 330.231 186.39 331.152 183.326 331.152C180.797 331.152 178.565 330.379 176.629 328.822C174.692 327.265 173.724 324.741 173.724 321.229C173.724 317.944 174.601 315.42 176.344 313.67C178.086 311.919 180.353 311.044 183.132 311.044C184.784 311.044 186.276 311.339 187.597 311.931L187.631 311.942ZM180.194 316.227C179.487 316.955 179.055 317.932 178.872 319.16H187.426C187.335 317.841 186.891 316.841 186.105 316.159C185.319 315.477 184.328 315.136 183.155 315.136C181.879 315.136 180.888 315.5 180.194 316.216V316.227Z" fill="#184554" />
          <path d="M208.497 312.646C209.739 313.669 210.365 315.374 210.365 317.75V330.515H205.274V318.978C205.274 317.977 205.137 317.216 204.875 316.681C204.386 315.704 203.463 315.215 202.108 315.215C200.433 315.215 199.283 315.931 198.668 317.352C198.349 318.102 198.19 319.068 198.19 320.239V330.504H193.224V311.578H198.03V314.34C198.668 313.362 199.272 312.669 199.83 312.237C200.843 311.475 202.142 311.089 203.702 311.089C205.661 311.089 207.256 311.6 208.497 312.623V312.646Z" fill="#184554" />
          <path d="M211.105 315.261V311.726H213.759V306.44H218.68V311.726H221.766V315.261H218.68V325.287C218.68 326.06 218.782 326.549 218.976 326.742C219.169 326.935 219.773 327.026 220.787 327.026C220.935 327.026 221.094 327.026 221.265 327.026C221.436 327.026 221.596 327.015 221.766 327.003V330.709L219.409 330.8C217.062 330.879 215.456 330.47 214.602 329.584C214.044 329.015 213.771 328.14 213.771 326.958V315.284H211.117L211.105 315.261Z" fill="#184554" />
          <path d="M224.238 307.975V304.883H235.651V307.975H231.801V317.784H228.031V307.975H224.227H224.238ZM242.177 304.883L244.535 312.317L246.858 304.883H252.223V317.796H248.783V308.452L245.981 317.796H243.054L240.252 308.475V317.796H236.812V304.883H242.177Z" fill="#184554" />
          <path d="M267.633 307.554C269.706 305.44 272.337 304.383 275.526 304.383C279.797 304.383 282.93 305.804 284.911 308.623C286.005 310.214 286.586 311.805 286.665 313.408H281.301C280.959 312.181 280.526 311.248 279.991 310.623C279.034 309.509 277.622 308.952 275.743 308.952C273.863 308.952 272.326 309.737 271.221 311.305C270.116 312.874 269.569 315.102 269.569 317.978C269.569 320.854 270.15 323.013 271.323 324.445C272.485 325.878 273.966 326.594 275.765 326.594C277.565 326.594 279.012 325.98 279.98 324.752C280.515 324.093 280.959 323.104 281.312 321.774H286.643C286.187 324.571 285.003 326.844 283.112 328.594C281.221 330.345 278.795 331.22 275.845 331.22C272.189 331.22 269.319 330.038 267.223 327.674C265.127 325.298 264.091 322.036 264.091 317.898C264.091 313.42 265.275 309.975 267.656 307.543L267.633 307.554Z" fill="#184554" />
          <path d="M304.479 328.196C302.873 330.174 300.436 331.163 297.178 331.163C293.921 331.163 291.483 330.174 289.877 328.196C288.271 326.219 287.474 323.843 287.474 321.058C287.474 318.273 288.271 315.954 289.877 313.954C291.483 311.953 293.909 310.941 297.178 310.941C300.447 310.941 302.873 311.942 304.479 313.954C306.085 315.966 306.882 318.33 306.882 321.058C306.882 323.786 306.085 326.219 304.479 328.196ZM300.504 325.457C301.279 324.423 301.677 322.956 301.677 321.058C301.677 319.16 301.29 317.693 300.504 316.67C299.718 315.647 298.613 315.136 297.155 315.136C295.698 315.136 294.581 315.647 293.795 316.67C293.01 317.693 292.622 319.16 292.622 321.058C292.622 322.956 293.01 324.423 293.795 325.457C294.581 326.491 295.698 327.003 297.155 327.003C298.613 327.003 299.718 326.491 300.504 325.457Z" fill="#184554" />
          <path d="M319.07 311.112C319.138 311.112 319.275 311.123 319.502 311.134V316.215C319.183 316.181 318.91 316.159 318.671 316.147C318.432 316.147 318.227 316.124 318.079 316.124C316.085 316.124 314.741 316.772 314.047 318.068C313.659 318.796 313.477 319.921 313.477 321.444V330.504H308.477V311.544H313.215V314.851C313.978 313.59 314.65 312.726 315.22 312.26C316.154 311.487 317.361 311.089 318.842 311.089C318.933 311.089 319.013 311.089 319.081 311.089L319.07 311.112Z" fill="#184554" />
          <path d="M332.863 311.942C334.184 312.533 335.277 313.465 336.143 314.75C336.917 315.875 337.43 317.182 337.658 318.671C337.794 319.546 337.851 320.797 337.817 322.434H323.978C324.058 324.332 324.719 325.673 325.972 326.435C326.735 326.912 327.646 327.151 328.705 327.151C329.833 327.151 330.755 326.867 331.462 326.276C331.849 325.957 332.191 325.525 332.487 324.968H337.555C337.418 326.094 336.803 327.23 335.71 328.39C334.013 330.231 331.621 331.152 328.557 331.152C326.029 331.152 323.796 330.379 321.86 328.822C319.924 327.265 318.956 324.741 318.956 321.229C318.956 317.944 319.833 315.42 321.575 313.67C323.318 311.919 325.584 311.044 328.364 311.044C330.015 311.044 331.507 311.339 332.828 311.931L332.863 311.942ZM325.425 316.227C324.719 316.955 324.286 317.932 324.104 319.16H332.658C332.566 317.841 332.122 316.841 331.336 316.159C330.55 315.477 329.559 315.136 328.386 315.136C327.111 315.136 326.12 315.5 325.425 316.216V316.227Z" fill="#184554" />
        </g>
      </g>
      {/* Dynamic text labels for each shade stick */}
      {type === 'teeth' && Object.entries(teethFilterToShadeMap).map(([filterId, shadeName]) => {
        if (!shadeName || !isShadeVisible(shadeName)) return null

        // Map each filter ID to its actual center x position in the SVG (calculated from stick body paths)
        const filterPositions: { [key: string]: number } = {
          'filter0_d_604_110231': 110.2,   // Bleach: (91.5811 + 128.82) / 2
          'filter1_d_604_110231': 813.8,   // A1: (795.172 + 832.411) / 2
          'filter2_d_604_110231': 769.8,   // A2: (751.197 + 788.436) / 2
          'filter3_d_604_110231': 725.8,   // A3: (707.223 + 744.462) / 2
          'filter4_d_604_110231': 681.9,   // A3.5: (663.248 + 700.487) / 2
          'filter5_d_604_110231': 637.9,   // A4: (619.273 + 656.513) / 2
          'filter6_d_604_110231': 594.0,   // B1: (575.299 + 612.538) / 2
          'filter7_d_604_110231': 550.0,   // B2: (531.324 + 568.563) / 2
          'filter8_d_604_110231': 506.0,   // B3: (487.354 + 524.593) / 2
          'filter9_d_604_110231': 462.0,   // B4: (443.375 + 480.614) / 2
          'filter10_d_604_110231': 418.0,  // C1: (399.4 + 436.64) / 2
          'filter11_d_604_110231': 374.0,  // C2: (355.425 + 392.665) / 2
          'filter12_d_604_110231': 330.1,  // C3: (311.45 + 348.69) / 2
          'filter13_d_604_110231': 286.1,  // C4: (267.477 + 304.716) / 2
          'filter14_d_604_110231': 242.1,  // D2: (223.5 + 260.74) / 2
          'filter15_d_604_110231': 198.1,  // D3: (179.529 + 216.768) / 2
          'filter16_d_604_110231': 154.2,  // D4: (135.564 + 172.794) / 2
        }

        const textX = filterPositions[filterId]
        if (!textX) return null

        const textY = 243  // Position in the middle of stick body (151 to 336)

        return (
          <text
            key={filterId}
            x={textX}
            y={textY}
            fill="#1F2937"
            fontSize="13"
            fontWeight="600"
            textAnchor="middle"
            style={{ pointerEvents: 'none' }}
          >
            {shadeName}
          </text>
        )
      })}
      <defs>
        <filter id="filter0_d_604_110231" x="84.6768" y="40" width="55.0596" height="311.232" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="2" dy="7" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_604_110231" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_604_110231" result="shape" />
        </filter>
        <filter id="filter1_d_604_110231" x="788.268" y="40" width="55.0596" height="311.23" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="2" dy="7" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_604_110231" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_604_110231" result="shape" />
        </filter>
        <filter id="filter2_d_604_110231" x="744.293" y="40" width="55.0596" height="311.23" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="2" dy="7" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_604_110231" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_604_110231" result="shape" />
        </filter>
        <filter id="filter3_d_604_110231" x="700.318" y="40" width="55.0596" height="311.23" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="2" dy="7" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_604_110231" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_604_110231" result="shape" />
        </filter>
        <filter id="filter4_d_604_110231" x="656.344" y="40" width="55.0596" height="311.23" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="2" dy="7" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_604_110231" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_604_110231" result="shape" />
        </filter>
        <filter id="filter5_d_604_110231" x="612.369" y="40" width="55.0596" height="311.23" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="2" dy="7" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_604_110231" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_604_110231" result="shape" />
        </filter>
        <filter id="filter6_d_604_110231" x="568.395" y="40" width="55.0596" height="311.23" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="2" dy="7" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_604_110231" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_604_110231" result="shape" />
        </filter>
        <filter id="filter7_d_604_110231" x="524.42" y="40" width="55.0596" height="311.23" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="2" dy="7" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_604_110231" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_604_110231" result="shape" />
        </filter>
        <filter id="filter8_d_604_110231" x="480.445" y="40" width="55.0596" height="77.0967" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="2" dy="7" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_604_110231" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_604_110231" result="shape" />
        </filter>
        <filter id="filter9_d_604_110231" x="436.471" y="40" width="55.0596" height="311.23" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="2" dy="7" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_604_110231" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_604_110231" result="shape" />
        </filter>
        <filter id="filter10_d_604_110231" x="392.496" y="40" width="55.0596" height="311.23" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="2" dy="7" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_604_110231" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_604_110231" result="shape" />
        </filter>
        <filter id="filter11_d_604_110231" x="348.521" y="40" width="55.0596" height="311.23" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="2" dy="7" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_604_110231" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_604_110231" result="shape" />
        </filter>
        <filter id="filter12_d_604_110231" x="304.547" y="40" width="55.0596" height="311.23" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="2" dy="7" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_604_110231" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_604_110231" result="shape" />
        </filter>
        <filter id="filter13_d_604_110231" x="128.648" y="40.002" width="55.0596" height="311.232" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="2" dy="7" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_604_110231" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_604_110231" result="shape" />
        </filter>
        <filter id="filter14_d_604_110231" x="40.6973" y="40.002" width="55.0596" height="311.232" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="2" dy="7" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_604_110231" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_604_110231" result="shape" />
        </filter>
        <filter id="filter15_d_604_110231" x="260.572" y="40" width="55.0596" height="311.23" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="2" dy="7" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_604_110231" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_604_110231" result="shape" />
        </filter>
        <filter id="filter16_d_604_110231" x="832.242" y="40" width="55.0596" height="311.23" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="2" dy="7" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_604_110231" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_604_110231" result="shape" />
        </filter>
        <filter id="filter17_d_604_110231" x="216.598" y="0" width="55.0596" height="311.23" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="2" dy="7" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_604_110231" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_604_110231" result="shape" />
        </filter>
        <filter id="filter18_d_604_110231" x="172.625" y="40" width="55.0596" height="311.23" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="2" dy="7" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_604_110231" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_604_110231" result="shape" />
        </filter>
        <filter id="filter19_d_604_110231" x="27.3647" y="304.383" width="314.462" height="30.8379" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="2" dy="2" />
          <feGaussianBlur stdDeviation="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.4 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_604_110231" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_604_110231" result="shape" />
        </filter>
        <linearGradient id="paint0_linear_604_110231" x1="461.5" y1="181.604" x2="461.5" y2="119.424" gradientUnits="userSpaceOnUse">
          <stop offset="0.06" stop-color="#616263" />
          <stop offset="0.2" stop-color="#878787" />
          <stop offset="0.33" stop-color="#878684" />
          <stop offset="0.44" stop-color="#6B696A" />
          <stop offset="0.53" stop-color="#8D8D8B" />
          <stop offset="0.68" stop-color="#707276" />
          <stop offset="0.82" stop-color="#616263" />
          <stop offset="1" stop-color="#878686" />
        </linearGradient>
        <linearGradient id="paint1_linear_604_110231" x1="110.19" y1="102.068" x2="110.19" y2="41" gradientUnits="userSpaceOnUse">
          <stop stop-color="#E1DDD4" />
          <stop offset="0.02" stop-color="#E2DED5" />
          <stop offset="0.22" stop-color="#ECE5DC" />
          <stop offset="0.5" stop-color="#EFE8DF" />
          <stop offset="0.8" stop-color="#EFE9E1" />
          <stop offset="0.96" stop-color="#F1EDE9" />
          <stop offset="1" stop-color="#F3EFED" />
        </linearGradient>
        <linearGradient id="paint2_linear_604_110231" x1="120.244" y1="92.7781" x2="127.048" y2="92.7781" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint3_linear_604_110231" x1="124.447" y1="79.285" x2="126.649" y2="79.285" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint4_linear_604_110231" x1="115.92" y1="47.6344" x2="121.114" y2="47.6344" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint5_linear_604_110231" x1="813.781" y1="102.068" x2="813.781" y2="41" gradientUnits="userSpaceOnUse">
          <stop stop-color="#D4CBBB" />
          <stop offset="0.08" stop-color="#DACDB6" />
          <stop offset="0.25" stop-color="#E4D0AF" />
          <stop offset="0.5" stop-color="#E7D1AE" />
          <stop offset="0.75" stop-color="#E7D2B0" />
          <stop offset="0.87" stop-color="#E9D6B8" />
          <stop offset="0.97" stop-color="#EDDEC5" />
          <stop offset="1" stop-color="#EFE2CB" />
        </linearGradient>
        <linearGradient id="paint6_linear_604_110231" x1="823.835" y1="92.7781" x2="830.639" y2="92.7781" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint7_linear_604_110231" x1="828.031" y1="79.283" x2="830.233" y2="79.283" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint8_linear_604_110231" x1="819.509" y1="47.6344" x2="824.704" y2="47.6344" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint9_linear_604_110231" x1="769.806" y1="102.068" x2="769.806" y2="41" gradientUnits="userSpaceOnUse">
          <stop stop-color="#D3C7BC" />
          <stop offset="0.07" stop-color="#D8CBBC" />
          <stop offset="0.25" stop-color="#E2D3BC" />
          <stop offset="0.5" stop-color="#E5D6BD" />
          <stop offset="0.8" stop-color="#E6D7BF" />
          <stop offset="0.95" stop-color="#EDDEC7" />
          <stop offset="1" stop-color="#F1E2CC" />
        </linearGradient>
        <linearGradient id="paint10_linear_604_110231" x1="779.86" y1="92.7781" x2="786.664" y2="92.7781" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint11_linear_604_110231" x1="784.057" y1="79.283" x2="786.259" y2="79.283" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint12_linear_604_110231" x1="775.535" y1="47.6344" x2="780.73" y2="47.6344" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint13_linear_604_110231" x1="725.831" y1="102.068" x2="725.831" y2="41" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFBBA0" />
          <stop offset="0.07" stop-color="#D2BB9A" />
          <stop offset="0.25" stop-color="#D9BC90" />
          <stop offset="0.5" stop-color="#DBBD8E" />
          <stop offset="0.75" stop-color="#DCBE90" />
          <stop offset="0.87" stop-color="#E0C398" />
          <stop offset="0.97" stop-color="#E8CDA5" />
          <stop offset="1" stop-color="#ECD1AB" />
        </linearGradient>
        <linearGradient id="paint14_linear_604_110231" x1="735.885" y1="92.7781" x2="742.69" y2="92.7781" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint15_linear_604_110231" x1="740.082" y1="79.283" x2="742.284" y2="79.283" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint16_linear_604_110231" x1="731.56" y1="47.6344" x2="736.755" y2="47.6344" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint17_linear_604_110231" x1="681.857" y1="102.068" x2="681.857" y2="41" gradientUnits="userSpaceOnUse">
          <stop stop-color="#D2BEAB" />
          <stop offset="0.02" stop-color="#D3BEA9" />
          <stop offset="0.22" stop-color="#DDC4A0" />
          <stop offset="0.5" stop-color="#E0C69E" />
          <stop offset="0.73" stop-color="#E0C7A0" />
          <stop offset="0.85" stop-color="#E2CBA8" />
          <stop offset="0.95" stop-color="#E4D1B5" />
          <stop offset="1" stop-color="#E7D8C1" />
        </linearGradient>
        <linearGradient id="paint18_linear_604_110231" x1="691.915" y1="92.7781" x2="698.719" y2="92.7781" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint19_linear_604_110231" x1="696.111" y1="79.283" x2="698.313" y2="79.283" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint20_linear_604_110231" x1="687.59" y1="47.6344" x2="692.784" y2="47.6344" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint21_linear_604_110231" x1="637.882" y1="102.068" x2="637.882" y2="41" gradientUnits="userSpaceOnUse">
          <stop stop-color="#D1C4B1" />
          <stop offset="0.08" stop-color="#D7C7B0" />
          <stop offset="0.25" stop-color="#E1CCAF" />
          <stop offset="0.5" stop-color="#E4CEAF" />
          <stop offset="0.78" stop-color="#E5D0B1" />
          <stop offset="0.92" stop-color="#E8D6B9" />
          <stop offset="1" stop-color="#ECDEC1" />
        </linearGradient>
        <linearGradient id="paint22_linear_604_110231" x1="647.94" y1="92.7781" x2="654.744" y2="92.7781" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint23_linear_604_110231" x1="652.137" y1="79.283" x2="654.339" y2="79.283" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint24_linear_604_110231" x1="643.615" y1="47.6344" x2="648.81" y2="47.6344" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint25_linear_604_110231" x1="593.907" y1="102.068" x2="593.907" y2="41" gradientUnits="userSpaceOnUse">
          <stop stop-color="#D8CCBE" />
          <stop offset="0.07" stop-color="#DDCFBE" />
          <stop offset="0.25" stop-color="#E7D6C0" />
          <stop offset="0.5" stop-color="#EAD8C1" />
          <stop offset="0.81" stop-color="#EBDAC3" />
          <stop offset="0.98" stop-color="#EFE2CB" />
          <stop offset="1" stop-color="#F0E4CD" />
        </linearGradient>
        <linearGradient id="paint26_linear_604_110231" x1="603.966" y1="92.7781" x2="610.77" y2="92.7781" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint27_linear_604_110231" x1="608.163" y1="79.283" x2="610.365" y2="79.283" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint28_linear_604_110231" x1="599.64" y1="47.6344" x2="604.835" y2="47.6344" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint29_linear_604_110231" x1="549.933" y1="102.068" x2="549.933" y2="41" gradientUnits="userSpaceOnUse">
          <stop stop-color="#D9C9B1" />
          <stop offset="0.11" stop-color="#E4CCA9" />
          <stop offset="0.28" stop-color="#EED0A3" />
          <stop offset="0.5" stop-color="#F1D1A2" />
          <stop offset="0.77" stop-color="#F1D2A4" />
          <stop offset="0.9" stop-color="#F2D6AC" />
          <stop offset="1" stop-color="#F4DDB8" />
        </linearGradient>
        <linearGradient id="paint30_linear_604_110231" x1="559.991" y1="92.7781" x2="566.795" y2="92.7781" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint31_linear_604_110231" x1="564.188" y1="79.283" x2="566.391" y2="79.283" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint32_linear_604_110231" x1="555.666" y1="47.6344" x2="560.861" y2="47.6344" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint33_linear_604_110231" x1="505.958" y1="102.068" x2="505.958" y2="41" gradientUnits="userSpaceOnUse">
          <stop stop-color="#D8CAAA" />
          <stop offset="0.05" stop-color="#DBCBA9" />
          <stop offset="0.24" stop-color="#E5CEA8" />
          <stop offset="0.5" stop-color="#E8D0A8" />
          <stop offset="0.76" stop-color="#E9D1AA" />
          <stop offset="0.89" stop-color="#ECD6B2" />
          <stop offset="0.99" stop-color="#F2DEBF" />
          <stop offset="1" stop-color="#F3E0C1" />
        </linearGradient>
        <linearGradient id="paint34_linear_604_110231" x1="516.016" y1="92.7781" x2="522.82" y2="92.7781" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint35_linear_604_110231" x1="520.214" y1="79.283" x2="522.416" y2="79.283" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint36_linear_604_110231" x1="511.691" y1="47.6344" x2="516.886" y2="47.6344" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint37_linear_604_110231" x1="461.984" y1="102.068" x2="461.984" y2="41" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.02" stop-color="#DED4C9" />
          <stop offset="0.22" stop-color="#E8D8C2" />
          <stop offset="0.5" stop-color="#EBDAC0" />
          <stop offset="0.78" stop-color="#EBDBC2" />
          <stop offset="0.92" stop-color="#EFE0CA" />
          <stop offset="1" stop-color="#F3E7D3" />
        </linearGradient>
        <linearGradient id="paint38_linear_604_110231" x1="472.042" y1="92.7781" x2="478.846" y2="92.7781" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint39_linear_604_110231" x1="476.243" y1="79.283" x2="478.445" y2="79.283" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint40_linear_604_110231" x1="467.716" y1="47.6344" x2="472.911" y2="47.6344" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint41_linear_604_110231" x1="418.009" y1="102.068" x2="418.009" y2="41" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DAD3C4" />
          <stop offset="0.08" stop-color="#E1D9C9" />
          <stop offset="0.26" stop-color="#EBE0CF" />
          <stop offset="0.5" stop-color="#EEE3D1" />
          <stop offset="0.81" stop-color="#EEE4D3" />
          <stop offset="0.96" stop-color="#F1E9DB" />
          <stop offset="1" stop-color="#F2EBDE" />
        </linearGradient>
        <linearGradient id="paint42_linear_604_110231" x1="428.067" y1="92.7781" x2="434.871" y2="92.7781" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint43_linear_604_110231" x1="432.269" y1="79.283" x2="434.471" y2="79.283" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint44_linear_604_110231" x1="423.742" y1="47.6344" x2="428.937" y2="47.6344" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint45_linear_604_110231" x1="374.034" y1="102.068" x2="374.034" y2="41" gradientUnits="userSpaceOnUse">
          <stop stop-color="#D7C4AC" />
          <stop offset="0.11" stop-color="#DCC3A1" />
          <stop offset="0.27" stop-color="#E1C397" />
          <stop offset="0.5" stop-color="#E3C395" />
          <stop offset="0.74" stop-color="#E3C497" />
          <stop offset="0.86" stop-color="#E4C89F" />
          <stop offset="0.96" stop-color="#E7CFAC" />
          <stop offset="1" stop-color="#E9D4B4" />
        </linearGradient>
        <linearGradient id="paint46_linear_604_110231" x1="384.092" y1="92.7781" x2="390.897" y2="92.7781" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint47_linear_604_110231" x1="388.294" y1="79.283" x2="390.496" y2="79.283" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint48_linear_604_110231" x1="379.767" y1="47.6344" x2="384.962" y2="47.6344" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint49_linear_604_110231" x1="330.06" y1="102.068" x2="330.06" y2="41" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DAC6B2" />
          <stop offset="0.09" stop-color="#E2C9AE" />
          <stop offset="0.26" stop-color="#ECCDAA" />
          <stop offset="0.5" stop-color="#EFCFA9" />
          <stop offset="0.76" stop-color="#EFD0AB" />
          <stop offset="0.89" stop-color="#F0D6B3" />
          <stop offset="1" stop-color="#F3E2C1" />
        </linearGradient>
        <linearGradient id="paint50_linear_604_110231" x1="340.116" y1="92.7781" x2="346.92" y2="92.7781" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint51_linear_604_110231" x1="344.317" y1="79.283" x2="346.519" y2="79.283" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint52_linear_604_110231" x1="335.791" y1="47.6344" x2="340.986" y2="47.6344" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint53_linear_604_110231" x1="154.161" y1="102.07" x2="154.161" y2="41.002" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DBD8D3" />
          <stop offset="0.07" stop-color="#E0DCD5" />
          <stop offset="0.25" stop-color="#EAE3DA" />
          <stop offset="0.5" stop-color="#EDE6DC" />
          <stop offset="0.78" stop-color="#EEE7DE" />
          <stop offset="0.92" stop-color="#F2ECE6" />
          <stop offset="1" stop-color="#F6F1EE" />
        </linearGradient>
        <linearGradient id="paint54_linear_604_110231" x1="164.218" y1="92.78" x2="171.023" y2="92.78" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint55_linear_604_110231" x1="168.419" y1="79.2869" x2="170.621" y2="79.2869" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint56_linear_604_110231" x1="159.892" y1="47.6363" x2="165.087" y2="47.6363" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint57_linear_604_110231" x1="66.2102" y1="102.07" x2="66.2102" y2="41.002" gradientUnits="userSpaceOnUse">
          <stop stop-color="#E2DEDB" />
          <stop offset="0.19" stop-color="#E9E3E0" />
          <stop offset="0.5" stop-color="#ECE6E3" />
          <stop offset="0.81" stop-color="#EDE8E5" />
          <stop offset="0.96" stop-color="#F1EFED" />
          <stop offset="1" stop-color="#F3F2F0" />
        </linearGradient>
        <linearGradient id="paint58_linear_604_110231" x1="76.2639" y1="92.78" x2="83.068" y2="92.78" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint59_linear_604_110231" x1="80.4663" y1="79.2869" x2="82.6684" y2="79.2869" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint60_linear_604_110231" x1="71.9391" y1="47.6363" x2="77.134" y2="47.6363" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint61_linear_604_110231" x1="286.085" y1="102.068" x2="286.085" y2="41" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DECFBD" />
          <stop offset="0.09" stop-color="#E6D4BB" />
          <stop offset="0.26" stop-color="#F0DABA" />
          <stop offset="0.5" stop-color="#F3DCBA" />
          <stop offset="0.75" stop-color="#F2DCBC" />
          <stop offset="0.88" stop-color="#F2DFC4" />
          <stop offset="0.97" stop-color="#F1E4D1" />
          <stop offset="1" stop-color="#F1E6D6" />
        </linearGradient>
        <linearGradient id="paint62_linear_604_110231" x1="296.141" y1="92.7781" x2="302.945" y2="92.7781" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint63_linear_604_110231" x1="300.343" y1="79.283" x2="302.545" y2="79.283" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint64_linear_604_110231" x1="291.816" y1="47.6344" x2="297.011" y2="47.6344" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint65_linear_604_110231" x1="857.755" y1="102.068" x2="857.755" y2="41" gradientUnits="userSpaceOnUse">
          <stop stop-color="#D6CBBA" />
          <stop offset="0.08" stop-color="#DDCDB4" />
          <stop offset="0.26" stop-color="#E7D0AD" />
          <stop offset="0.5" stop-color="#EAD1AB" />
          <stop offset="0.75" stop-color="#EAD2AD" />
          <stop offset="0.87" stop-color="#EBD6B5" />
          <stop offset="0.97" stop-color="#EEDEC2" />
          <stop offset="1" stop-color="#EFE2C8" />
        </linearGradient>
        <linearGradient id="paint66_linear_604_110231" x1="867.809" y1="92.7781" x2="874.613" y2="92.7781" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint67_linear_604_110231" x1="872.006" y1="79.283" x2="874.208" y2="79.283" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint68_linear_604_110231" x1="863.483" y1="47.6344" x2="868.678" y2="47.6344" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint69_linear_604_110231" x1="242.111" y1="62.0677" x2="242.111" y2="1" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DED2C7" />
          <stop offset="0.07" stop-color="#E3D4C4" />
          <stop offset="0.25" stop-color="#EDD9C1" />
          <stop offset="0.5" stop-color="#F0DBC0" />
          <stop offset="0.76" stop-color="#F0DCC2" />
          <stop offset="0.9" stop-color="#F1E0CA" />
          <stop offset="1" stop-color="#F3E7D7" />
        </linearGradient>
        <linearGradient id="paint70_linear_604_110231" x1="252.167" y1="52.7781" x2="258.971" y2="52.7781" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint71_linear_604_110231" x1="256.369" y1="39.283" x2="258.571" y2="39.283" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint72_linear_604_110231" x1="247.841" y1="7.63437" x2="253.036" y2="7.63437" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint73_linear_604_110231" x1="198.138" y1="102.068" x2="198.138" y2="41" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint74_linear_604_110231" x1="208.194" y1="92.7781" x2="214.998" y2="92.7781" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint75_linear_604_110231" x1="212.396" y1="79.283" x2="214.599" y2="79.283" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint76_linear_604_110231" x1="203.869" y1="47.6344" x2="209.064" y2="47.6344" gradientUnits="userSpaceOnUse">
          <stop stop-color="#DDD4CB" />
          <stop offset="0.07" stop-color="#E2D9CB" />
          <stop offset="0.25" stop-color="#ECE1CD" />
          <stop offset="0.5" stop-color="#EFE4CE" />
          <stop offset="0.81" stop-color="#EFE5D0" />
          <stop offset="0.98" stop-color="#F1E9D8" />
          <stop offset="1" stop-color="#F2EADA" />
        </linearGradient>
        <linearGradient id="paint77_linear_604_110231" x1="489.336" y1="348.089" x2="489.336" y2="279.659" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint78_linear_604_110231" x1="755.778" y1="348.089" x2="755.778" y2="279.659" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint79_linear_604_110231" x1="7.83132" y1="204.353" x2="-0.00488281" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint80_linear_604_110231" x1="15.6564" y1="204.353" x2="7.83154" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint81_linear_604_110231" x1="23.4925" y1="204.353" x2="15.6562" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint82_linear_604_110231" x1="31.317" y1="204.353" x2="23.4922" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint83_linear_604_110231" x1="39.1536" y1="204.353" x2="31.3174" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint84_linear_604_110231" x1="46.9781" y1="204.353" x2="39.1533" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint85_linear_604_110231" x1="54.8142" y1="204.353" x2="46.978" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint86_linear_604_110231" x1="62.6393" y1="204.353" x2="54.8145" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint87_linear_604_110231" x1="70.4754" y1="204.353" x2="62.6392" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint88_linear_604_110231" x1="78.3004" y1="204.353" x2="70.4756" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint89_linear_604_110231" x1="86.1365" y1="204.353" x2="78.3003" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint90_linear_604_110231" x1="93.961" y1="204.353" x2="86.1362" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint91_linear_604_110231" x1="101.798" y1="204.353" x2="93.9614" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint92_linear_604_110231" x1="109.622" y1="204.353" x2="101.797" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint93_linear_604_110231" x1="117.458" y1="204.353" x2="109.622" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint94_linear_604_110231" x1="125.283" y1="204.353" x2="117.458" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint95_linear_604_110231" x1="133.119" y1="204.353" x2="125.283" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint96_linear_604_110231" x1="140.944" y1="204.353" x2="133.12" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint97_linear_604_110231" x1="148.781" y1="204.353" x2="140.944" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint98_linear_604_110231" x1="156.605" y1="204.353" x2="148.78" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint99_linear_604_110231" x1="164.442" y1="204.353" x2="156.605" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint100_linear_604_110231" x1="172.266" y1="204.353" x2="164.441" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint101_linear_604_110231" x1="180.102" y1="204.353" x2="172.266" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint102_linear_604_110231" x1="187.927" y1="204.353" x2="180.103" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint103_linear_604_110231" x1="195.763" y1="204.353" x2="187.927" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint104_linear_604_110231" x1="203.588" y1="204.353" x2="195.764" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint105_linear_604_110231" x1="211.425" y1="204.353" x2="203.588" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint106_linear_604_110231" x1="219.249" y1="204.353" x2="211.424" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint107_linear_604_110231" x1="227.086" y1="204.353" x2="219.25" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint108_linear_604_110231" x1="234.91" y1="204.353" x2="227.085" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint109_linear_604_110231" x1="242.746" y1="204.353" x2="234.91" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint110_linear_604_110231" x1="250.571" y1="204.353" x2="242.747" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint111_linear_604_110231" x1="258.407" y1="204.353" x2="250.571" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint112_linear_604_110231" x1="266.233" y1="204.353" x2="258.408" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint113_linear_604_110231" x1="274.069" y1="204.353" x2="266.232" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint114_linear_604_110231" x1="281.894" y1="204.353" x2="274.069" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint115_linear_604_110231" x1="289.73" y1="204.353" x2="281.894" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint116_linear_604_110231" x1="297.554" y1="204.353" x2="289.729" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint117_linear_604_110231" x1="305.39" y1="204.353" x2="297.554" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint118_linear_604_110231" x1="313.215" y1="204.353" x2="305.391" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint119_linear_604_110231" x1="321.052" y1="204.353" x2="313.215" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint120_linear_604_110231" x1="328.877" y1="204.353" x2="321.052" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint121_linear_604_110231" x1="336.713" y1="204.353" x2="328.876" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint122_linear_604_110231" x1="344.538" y1="204.353" x2="336.713" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint123_linear_604_110231" x1="352.374" y1="204.353" x2="344.538" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint124_linear_604_110231" x1="360.198" y1="204.353" x2="352.374" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint125_linear_604_110231" x1="368.035" y1="204.353" x2="360.199" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint126_linear_604_110231" x1="375.859" y1="204.353" x2="368.035" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint127_linear_604_110231" x1="383.696" y1="204.353" x2="375.859" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint128_linear_604_110231" x1="391.521" y1="204.353" x2="383.696" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint129_linear_604_110231" x1="399.357" y1="204.353" x2="391.521" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint130_linear_604_110231" x1="407.182" y1="204.353" x2="399.357" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint131_linear_604_110231" x1="415.018" y1="204.353" x2="407.182" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint132_linear_604_110231" x1="422.842" y1="204.353" x2="415.018" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint133_linear_604_110231" x1="430.679" y1="204.353" x2="422.843" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint134_linear_604_110231" x1="438.504" y1="204.353" x2="430.679" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint135_linear_604_110231" x1="446.34" y1="204.353" x2="438.503" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint136_linear_604_110231" x1="454.165" y1="204.353" x2="446.34" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint137_linear_604_110231" x1="462.001" y1="204.353" x2="454.165" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint138_linear_604_110231" x1="469.826" y1="204.353" x2="462.001" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint139_linear_604_110231" x1="477.662" y1="204.353" x2="469.826" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint140_linear_604_110231" x1="485.486" y1="204.353" x2="477.662" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint141_linear_604_110231" x1="493.323" y1="204.353" x2="485.487" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint142_linear_604_110231" x1="501.148" y1="204.353" x2="493.323" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint143_linear_604_110231" x1="508.984" y1="204.353" x2="501.147" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint144_linear_604_110231" x1="516.809" y1="204.353" x2="508.984" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint145_linear_604_110231" x1="524.645" y1="204.353" x2="516.809" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint146_linear_604_110231" x1="532.47" y1="204.353" x2="524.645" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint147_linear_604_110231" x1="540.306" y1="204.353" x2="532.47" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint148_linear_604_110231" x1="548.131" y1="204.353" x2="540.306" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint149_linear_604_110231" x1="555.967" y1="204.353" x2="548.131" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint150_linear_604_110231" x1="563.792" y1="204.353" x2="555.967" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint151_linear_604_110231" x1="571.628" y1="204.353" x2="563.792" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint152_linear_604_110231" x1="579.453" y1="204.353" x2="571.628" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint153_linear_604_110231" x1="587.289" y1="204.353" x2="579.453" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint154_linear_604_110231" x1="595.114" y1="204.353" x2="587.289" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint155_linear_604_110231" x1="602.95" y1="204.353" x2="595.114" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint156_linear_604_110231" x1="610.775" y1="204.353" x2="602.95" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint157_linear_604_110231" x1="618.611" y1="204.353" x2="610.775" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint158_linear_604_110231" x1="626.436" y1="204.353" x2="618.611" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint159_linear_604_110231" x1="634.272" y1="204.353" x2="626.436" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint160_linear_604_110231" x1="642.097" y1="204.353" x2="634.272" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint161_linear_604_110231" x1="649.933" y1="204.353" x2="642.097" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint162_linear_604_110231" x1="657.758" y1="204.353" x2="649.933" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint163_linear_604_110231" x1="665.594" y1="204.353" x2="657.758" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint164_linear_604_110231" x1="673.419" y1="204.353" x2="665.594" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint165_linear_604_110231" x1="681.255" y1="204.353" x2="673.419" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint166_linear_604_110231" x1="689.08" y1="204.353" x2="681.255" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint167_linear_604_110231" x1="696.916" y1="204.353" x2="689.08" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint168_linear_604_110231" x1="704.741" y1="204.353" x2="696.916" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint169_linear_604_110231" x1="712.577" y1="204.353" x2="704.741" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint170_linear_604_110231" x1="720.402" y1="204.353" x2="712.577" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint171_linear_604_110231" x1="728.238" y1="204.353" x2="720.402" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint172_linear_604_110231" x1="736.063" y1="204.353" x2="728.238" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint173_linear_604_110231" x1="743.899" y1="204.353" x2="736.063" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint174_linear_604_110231" x1="751.724" y1="204.353" x2="743.899" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint175_linear_604_110231" x1="759.56" y1="204.353" x2="751.724" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint176_linear_604_110231" x1="767.385" y1="204.353" x2="759.56" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint177_linear_604_110231" x1="775.221" y1="204.353" x2="767.385" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint178_linear_604_110231" x1="783.046" y1="204.353" x2="775.221" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint179_linear_604_110231" x1="790.882" y1="204.353" x2="783.046" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint180_linear_604_110231" x1="798.707" y1="204.353" x2="790.882" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint181_linear_604_110231" x1="806.543" y1="204.353" x2="798.707" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint182_linear_604_110231" x1="814.368" y1="204.353" x2="806.543" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint183_linear_604_110231" x1="822.204" y1="204.353" x2="814.368" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint184_linear_604_110231" x1="830.029" y1="204.353" x2="822.204" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint185_linear_604_110231" x1="837.865" y1="204.353" x2="830.029" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint186_linear_604_110231" x1="845.69" y1="204.353" x2="837.865" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint187_linear_604_110231" x1="853.526" y1="204.353" x2="845.69" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint188_linear_604_110231" x1="861.351" y1="204.353" x2="853.526" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint189_linear_604_110231" x1="869.187" y1="204.353" x2="861.351" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint190_linear_604_110231" x1="877.012" y1="204.353" x2="869.187" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint191_linear_604_110231" x1="884.848" y1="204.353" x2="877.012" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint192_linear_604_110231" x1="892.673" y1="204.353" x2="884.848" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint193_linear_604_110231" x1="900.51" y1="204.353" x2="892.673" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint194_linear_604_110231" x1="908.334" y1="204.353" x2="900.509" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint195_linear_604_110231" x1="916.17" y1="204.353" x2="908.334" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <linearGradient id="paint196_linear_604_110231" x1="923.995" y1="204.353" x2="916.17" y2="204.353" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CFDCE2" />
          <stop offset="0.99" stop-color="#ACB8BF" />
        </linearGradient>
        <clipPath id="clip0_604_110231">
          <rect width="923" height="215" fill="white" transform="translate(0 119.424)" />
        </clipPath>
        <clipPath id="clip1_604_110231">
          <rect width="924" height="194" fill="white" transform="translate(0 179.424)" />
        </clipPath>
      </defs>

      {/* Hover Tooltip */}
      {hoveredShade && teethShadeTooltipPositions[hoveredShade] && (
        <g>
          {/* Triangle arrow pointing up */}
          <polygon
            points={`${teethShadeTooltipPositions[hoveredShade].x},${teethShadeTooltipPositions[hoveredShade].y + 15} ${teethShadeTooltipPositions[hoveredShade].x - 6},${teethShadeTooltipPositions[hoveredShade].y + 23} ${teethShadeTooltipPositions[hoveredShade].x + 6},${teethShadeTooltipPositions[hoveredShade].y + 23}`}
            fill="#FED7AA"
          />
          {/* Tooltip background */}
          <rect
            x={teethShadeTooltipPositions[hoveredShade].x - 35}
            y={teethShadeTooltipPositions[hoveredShade].y + 23}
            width="70"
            height="32"
            rx="8"
            fill="#FED7AA"
          />
          {/* Shadow effect */}
          <rect
            x={teethShadeTooltipPositions[hoveredShade].x - 35}
            y={teethShadeTooltipPositions[hoveredShade].y + 23}
            width="70"
            height="32"
            rx="8"
            fill="black"
            fillOpacity="0.1"
            filter="blur(4)"
          />
          {/* Tooltip text */}
          <text
            x={teethShadeTooltipPositions[hoveredShade].x}
            y={teethShadeTooltipPositions[hoveredShade].y + 43}
            fill="#1F2937"
            fontSize="14"
            fontWeight="500"
            textAnchor="middle"
          >
            {hoveredShade}
          </text>
        </g>
      )}
    </svg>
  )
}

