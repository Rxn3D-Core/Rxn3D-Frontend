import React from 'react'
import { ArrowLeftRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConversionResults } from './ConversionResults'
import { ShadeSystem, Shade, ConversionMatch } from '../types'

interface ShadeMatchingTabProps {
  // State
  selectedShadeSystem: string
  selectedIndividualShade: string
  selectedShade?: { color: string }
  currentSystem?: { name: string }
  type: 'teeth' | 'gum'
  selectedGumShade?: {
    productId: string
    arch: 'maxillary' | 'mandibular'
    shadeName: string
  } | null
  
  // Data
  apiShadeSystems: ShadeSystem[]
  isLoadingShadeSystems: boolean
  shadeSystemsError: any
  apiConversionResults: ConversionMatch[]
  isLoadingConversion: boolean
  conversionError: string | null
  tempSelectedMatch?: ConversionMatch | null
  
  // Actions
  onSystemChange: (systemName: string) => void
  onShadeChange: (shadeName: string) => void
  onPerformShadeConversion?: (systemName: string, shadeName: string) => void
  onSelectMatch: (match: ConversionMatch) => void
  getAvailableShades: () => any[]
  isFullScreen: boolean
}

export const ShadeMatchingTab: React.FC<ShadeMatchingTabProps> = ({
  selectedShadeSystem,
  selectedIndividualShade,
  selectedShade,
  currentSystem,
  type,
  selectedGumShade,
  apiShadeSystems,
  isLoadingShadeSystems,
  shadeSystemsError,
  apiConversionResults,
  isLoadingConversion,
  conversionError,
  tempSelectedMatch,
  onSystemChange,
  onShadeChange,
  onPerformShadeConversion,
  onSelectMatch,
  getAvailableShades,
  isFullScreen
}) => {
  // Map the selectedShadeSystem to the correct dropdown value
  const getMappedShadeSystem = (system: string) => {
    if (!system) return ''
    
    // Map common system names to our hardcoded options
    const systemMap: Record<string, string> = {
      // Add other system mappings as needed
    }
    
    return systemMap[system] || system
  }
  
  const mappedShadeSystem = getMappedShadeSystem(selectedShadeSystem)
  return (
    <div className="p-4 space-y-4 flex-1 bg-white flex flex-col overflow-hidden">
      {/* Primary Shade Selection */}
      <div className="space-y-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-lg border-2 border-gray-300 shadow-sm"
            style={{ backgroundColor: selectedShade?.color || '#F5F0E8' }}
          />
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {type === 'gum' && selectedGumShade ? selectedGumShade.shadeName : selectedIndividualShade}
            </h3>
            <p className="text-xs text-gray-600">{currentSystem?.name}</p>
            {type === 'gum' && selectedGumShade && (
              <p className="text-xs text-blue-600 mt-1">
                Converting from: {selectedGumShade.shadeName}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Primary System
            </label>
            <Select value={mappedShadeSystem} onValueChange={onSystemChange}>
              <SelectTrigger className="pointer-events-auto">
                <SelectValue placeholder="Select a system" />
              </SelectTrigger>
              <SelectContent className="z-[10002]">
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Individual Shades
            </label>
            <Select value={type === 'gum' && selectedGumShade ? selectedGumShade.shadeName : selectedIndividualShade} onValueChange={onShadeChange}>
              <SelectTrigger className="pointer-events-auto">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: selectedShade?.color || '#F5F0E8' }}
                    />
                    {type === 'gum' && selectedGumShade ? selectedGumShade.shadeName : selectedIndividualShade}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="z-[10002]">
                {false ? (
                  <>
                    <SelectItem value="OM1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#F8F6F0' }} />
                        OM1
                      </div>
                    </SelectItem>
                    <SelectItem value="OM2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#F5F0E8' }} />
                        OM2
                      </div>
                    </SelectItem>
                    <SelectItem value="OM3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#F0E6D0' }} />
                        OM3
                      </div>
                    </SelectItem>
                    <SelectItem value="OM4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#E8D9BA' }} />
                        OM4
                      </div>
                    </SelectItem>
                    <SelectItem value="1M1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#F5EFE0' }} />
                        1M1.5
                      </div>
                    </SelectItem>
                    <SelectItem value="1M2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#F0E6D0' }} />
                        1M2.5
                      </div>
                    </SelectItem>
                    <SelectItem value="1M3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#E8D9BA' }} />
                        1M3
                      </div>
                    </SelectItem>
                    <SelectItem value="1M3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#D4B890' }} />
                        1M3.5
                      </div>
                    </SelectItem>
                    <SelectItem value="2M3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#E0D0B0' }} />
                        2M3
                      </div>
                    </SelectItem>
                    <SelectItem value="2M1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#F0E6D0' }} />
                        2M1.5
                      </div>
                    </SelectItem>
                    <SelectItem value="2M2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#E8D9BA' }} />
                        2M2.5
                      </div>
                    </SelectItem>
                    <SelectItem value="2M3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#D4B890' }} />
                        2M3.5
                      </div>
                    </SelectItem>
                    <SelectItem value="3M1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#E8D9BA' }} />
                        3M1.5
                      </div>
                    </SelectItem>
                    <SelectItem value="3M2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#D4B890' }} />
                        3M2.5
                      </div>
                    </SelectItem>
                    <SelectItem value="3M3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#C4A880' }} />
                        3M3.5
                      </div>
                    </SelectItem>
                  </>
                ) : false ? (
                  <>
                    <SelectItem value="OM1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#F8F6F0' }} />
                        OM1
                      </div>
                    </SelectItem>
                    <SelectItem value="OM2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#F5F0E8' }} />
                        OM2
                      </div>
                    </SelectItem>
                    <SelectItem value="OM3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#F0E6D0' }} />
                        OM3
                      </div>
                    </SelectItem>
                    <SelectItem value="A1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#F5F0E8' }} />
                        A1
                      </div>
                    </SelectItem>
                    <SelectItem value="A2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#F0E6D0' }} />
                        A2
                      </div>
                    </SelectItem>
                    <SelectItem value="A3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#E8D9BA' }} />
                        A3
                      </div>
                    </SelectItem>
                    <SelectItem value="A3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#D4B890' }} />
                        A3.5
                      </div>
                    </SelectItem>
                    <SelectItem value="A4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#C4A880' }} />
                        A4
                      </div>
                    </SelectItem>
                    <SelectItem value="B1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#F5F0E8' }} />
                        B1
                      </div>
                    </SelectItem>
                    <SelectItem value="B2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#F0E6D0' }} />
                        B2
                      </div>
                    </SelectItem>
                    <SelectItem value="B3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#E8D9BA' }} />
                        B3
                      </div>
                    </SelectItem>
                    <SelectItem value="B4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#D4B890' }} />
                        B4
                      </div>
                    </SelectItem>
                    <SelectItem value="C1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#F0E6D0' }} />
                        C1
                      </div>
                    </SelectItem>
                    <SelectItem value="C2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#E8D9BA' }} />
                        C2
                      </div>
                    </SelectItem>
                    <SelectItem value="C3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#D4B890' }} />
                        C3
                      </div>
                    </SelectItem>
                    <SelectItem value="C4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#C4A880' }} />
                        C4
                      </div>
                    </SelectItem>
                    <SelectItem value="D2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#E0D0B0' }} />
                        D2
                      </div>
                    </SelectItem>
                    <SelectItem value="D3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#D4B890' }} />
                        D3
                      </div>
                    </SelectItem>
                    <SelectItem value="D4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#C4A880' }} />
                        D4
                      </div>
                    </SelectItem>
                  </>
                ) : false ? (
                  <>
                    <SelectItem value="1M1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#F8F6F0' }} />
                        1M1
                      </div>
                    </SelectItem>
                    <SelectItem value="1M2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#F5F0E8' }} />
                        1M2
                      </div>
                    </SelectItem>
                    <SelectItem value="2L1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#F2EADF' }} />
                        2L1.5
                      </div>
                    </SelectItem>
                    <SelectItem value="2R1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#F0E8D8' }} />
                        2R1.5
                      </div>
                    </SelectItem>
                    <SelectItem value="2M1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#EEDFCF' }} />
                        2M1
                      </div>
                    </SelectItem>
                    <SelectItem value="2L2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#E8D8C8' }} />
                        2L2.5
                      </div>
                    </SelectItem>
                    <SelectItem value="2R2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#E5D2C0' }} />
                        2R2.5
                      </div>
                    </SelectItem>
                    <SelectItem value="2M2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#E0CBAF' }} />
                        2M2
                      </div>
                    </SelectItem>
                    <SelectItem value="2M3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#D8C0A0' }} />
                        2M3
                      </div>
                    </SelectItem>
                    <SelectItem value="3L1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#D0B590' }} />
                        3L1.5
                      </div>
                    </SelectItem>
                    <SelectItem value="3R1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#C8AE88' }} />
                        3R1.5
                      </div>
                    </SelectItem>
                    <SelectItem value="3M1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#C0A578' }} />
                        3M1
                      </div>
                    </SelectItem>
                    <SelectItem value="3L2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#B89C68' }} />
                        3L2.5
                      </div>
                    </SelectItem>
                    <SelectItem value="3R2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#B09558' }} />
                        3R2.5
                      </div>
                    </SelectItem>
                    <SelectItem value="3M2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#A88E48' }} />
                        3M2
                      </div>
                    </SelectItem>
                    <SelectItem value="3L3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#A08538' }} />
                        3L3.5
                      </div>
                    </SelectItem>
                    <SelectItem value="3R3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#987E28' }} />
                        3R3.5
                      </div>
                    </SelectItem>
                    <SelectItem value="3M3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#907518' }} />
                        3M3
                      </div>
                    </SelectItem>
                    <SelectItem value="4L1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#886C10' }} />
                        4L1.5
                      </div>
                    </SelectItem>
                    <SelectItem value="4R1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#806508' }} />
                        4R1.5
                      </div>
                    </SelectItem>
                    <SelectItem value="4M1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#785E00' }} />
                        4M1
                      </div>
                    </SelectItem>
                    <SelectItem value="4L2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#705700' }} />
                        4L2.5
                      </div>
                    </SelectItem>
                    <SelectItem value="4R2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#685000' }} />
                        4R2.5
                      </div>
                    </SelectItem>
                    <SelectItem value="4M2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#604900' }} />
                        4M2
                      </div>
                    </SelectItem>
                    <SelectItem value="4L3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#584200' }} />
                        4L3.5
                      </div>
                    </SelectItem>
                    <SelectItem value="4R3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#503B00' }} />
                        4R3.5
                      </div>
                    </SelectItem>
                    <SelectItem value="4M3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#483400' }} />
                        4M3
                      </div>
                    </SelectItem>
                    <SelectItem value="5M1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#402D00' }} />
                        5M1
                      </div>
                    </SelectItem>
                    <SelectItem value="5M2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#382600' }} />
                        5M2
                      </div>
                    </SelectItem>
                    <SelectItem value="5M3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#301F00' }} />
                        5M3
                      </div>
                    </SelectItem>
                  </>
                ) : (
                  <SelectItem value="no-shades" disabled>
                    Please select a primary system first
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Matching Icon */}
      <div className="flex justify-center flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (onPerformShadeConversion && selectedShadeSystem && selectedIndividualShade) {
              onPerformShadeConversion(selectedShadeSystem, selectedIndividualShade)
            }
          }}
          disabled={isLoadingConversion}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors ${
            isLoadingConversion 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
          }`}
          title={isLoadingConversion ? "Converting shades..." : "Click to convert shades"}
        >
          {isLoadingConversion ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <ArrowLeftRight className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* Conversion Results */}
      <ConversionResults
        results={apiConversionResults}
        isLoading={isLoadingConversion}
        error={conversionError}
        type={type}
        tempSelectedMatch={tempSelectedMatch}
        onSelectMatch={onSelectMatch}
        selectedShadeSystem={selectedShadeSystem}
        selectedIndividualShade={selectedIndividualShade}
      />
    </div>
  )
}
