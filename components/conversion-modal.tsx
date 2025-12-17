"use client"

import React, { useEffect, useRef } from "react"
import { X, ArrowLeftRight, Loader2, RefreshCw, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ConversionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (shadeSystem: string, individualShade: string) => void
  onLiveUpdate?: (shadeSystem: string, individualShade: string) => void
  type?: 'teeth' | 'gum'
  
  // Shade selection state
  selectedShadeSystem: string
  selectedIndividualShade: string
  selectedShade?: { color: string }
  currentSystem?: { name: string }
  
  // Gum shade circle information
  selectedGumShade?: {
    productId: string
    arch: 'maxillary' | 'mandibular'
    shadeName: string
  } | null
  
  // API data
  apiShadeSystems: any[]
  isLoadingShadeSystems: boolean
  shadeSystemsError: any
  
  // Conversion results
  apiConversionResults: any[]
  apiColorMatchResults: any[]
  isLoadingConversion: boolean
  isLoadingColorMatch: boolean
  conversionError: string | null
  colorMatchError: string | null
  
  // Color picker state
  selectedCustomColor?: string
  sliderPosition: number
  
  // Handlers
  onSystemChange: (systemName: string) => void
  onShadeChange: (shadeName: string) => void
  onSliderChange: (percentage: number) => void
  onPerformColorMatch: (color: string) => void
  onSelectConversionMatch: (match: any) => void
  onSelectColorMatch: (match: any) => void
  onPerformShadeConversion?: (systemName: string, shadeName: string) => void
  
  // Tab state
  activeTab: 'shade' | 'colorPicker'
  onTabChange: (tab: 'shade' | 'colorPicker') => void
  
  // Helper functions
  getAvailableShades: () => any[]
}

export const ConversionModal: React.FC<ConversionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onLiveUpdate,
  type = 'teeth',
  selectedShadeSystem,
  selectedIndividualShade,
  selectedShade,
  currentSystem,
  selectedGumShade,
  apiShadeSystems,
  isLoadingShadeSystems,
  shadeSystemsError,
  apiConversionResults,
  apiColorMatchResults,
  isLoadingConversion,
  isLoadingColorMatch,
  conversionError,
  colorMatchError,
  selectedCustomColor,
  sliderPosition,
  onSystemChange,
  onShadeChange,
  onSliderChange,
  onPerformColorMatch,
  onSelectConversionMatch,
  onSelectColorMatch,
  onPerformShadeConversion,
  activeTab,
  onTabChange,
  getAvailableShades
}) => {
  // State for temporarily selected match (before confirmation)
  const [tempSelectedMatch, setTempSelectedMatch] = React.useState<any>(null)
  const [tempSelectedSystem, setTempSelectedSystem] = React.useState<string>('')
  const [tempSelectedShade, setTempSelectedShade] = React.useState<string>('')

  if (!isOpen) return null

  // Debug: Log API data
  
  // Check if we're in full screen mode
  const isFullScreen = document.fullscreenElement || 
    (document as any).webkitFullscreenElement || 
    (document as any).mozFullScreenElement
  
  // Handle full screen mode changes
  useEffect(() => {
    const handleFullScreenChange = () => {
      const isCurrentlyFullScreen = document.fullscreenElement || 
        (document as any).webkitFullscreenElement || 
        (document as any).mozFullScreenElement
    }
    
    document.addEventListener('fullscreenchange', handleFullScreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange)
    document.addEventListener('mozfullscreenchange', handleFullScreenChange)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullScreenChange)
    }
  }, [])
  
  // Log when conversion results change
  useEffect(() => {
    if (apiConversionResults.length > 0) {
    }
  }, [apiConversionResults])
  
  // Log when color match results change
  useEffect(() => {
    if (apiColorMatchResults.length > 0) {
    }
  }, [apiColorMatchResults])
  
  // Debug: Check if we can find the current system
  const foundSystem = apiShadeSystems.find(system => 
    (system as any).system_name === selectedShadeSystem || system.name === selectedShadeSystem
  )

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm conversion-modal-overlay"
      style={{
        position: 'fixed',
        zIndex: 2147483647, // Maximum z-index value
        display: 'flex',
        visibility: 'visible',
        userSelect: 'text',
        WebkitUserSelect: 'text',
        MozUserSelect: 'text',
        msUserSelect: 'text'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="w-[95vw] sm:w-[500px] max-w-[50vw] sm:max-w-[500px] max-h-[81vh] p-0 flex flex-col bg-white rounded-lg shadow-lg border border-gray-200 relative z-[2147483647] pointer-events-auto conversion-modal-content"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2147483647, // Maximum z-index value
          display: 'flex',
          visibility: 'visible',
          margin: '0 auto',
          userSelect: 'text',
          WebkitUserSelect: 'text',
          MozUserSelect: 'text',
          msUserSelect: 'text'
        }}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        {/* Tabs */}
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => onTabChange(value as 'shade' | 'colorPicker')} 
          className="w-full flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-2 rounded-lg bg-gray-100 p-1">
            <TabsTrigger 
              value="shade" 
              className="text-sm font-medium transition-all duration-200 hover:bg-blue-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold"
            >
              Shade Matching
            </TabsTrigger>
            <TabsTrigger 
              value="colorPicker" 
              className="text-sm font-medium transition-all duration-200 hover:bg-blue-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold"
            >
              Color Picker
            </TabsTrigger>
          </TabsList>

          {/* Shade Matching Tab */}
          <TabsContent
            value="shade"
            className="p-4 space-y-4 flex-1 bg-white flex flex-col overflow-hidden"
          >
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
                  <Select value={selectedShadeSystem} onValueChange={(value) => {
                      onSystemChange(value)
                    }}>
                    <SelectTrigger 
                      onClick={(e) => {
                        e.stopPropagation()
                      }}
                      className="pointer-events-auto"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent 
                      onCloseAutoFocus={(e) => e.preventDefault()}
                      onClick={(e) => e.stopPropagation()}
                      className="z-[2147483647]"
                    >
                      {isLoadingShadeSystems ? (
                        <SelectItem value="loading" disabled>
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading systems...
                          </div>
                        </SelectItem>
                      ) : shadeSystemsError ? (
                        <SelectItem value="error" disabled>
                          Error loading systems
                        </SelectItem>
                      ) : apiShadeSystems.length > 0 ? (
                        apiShadeSystems.map((system) => {
                          const systemName = (system as any).system_name || system.name
                          return (
                            <SelectItem key={system.id} value={systemName}>
                              {system.name} - {(system as any).system_name || 'No system name'}
                            </SelectItem>
                          )
                        })
                      ) : (
                        <SelectItem value="no-data" disabled>
                          No shade systems available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Individual Shades
                  </label>
                  <Select value={type === 'gum' && selectedGumShade ? selectedGumShade.shadeName : selectedIndividualShade} onValueChange={(value) => {
                      onShadeChange(value)
                    }}>
                    <SelectTrigger 
                      onClick={(e) => {
                        e.stopPropagation()
                      }}
                      className="pointer-events-auto"
                    >
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
                    <SelectContent 
                      onCloseAutoFocus={(e) => e.preventDefault()}
                      onClick={(e) => e.stopPropagation()}
                      className="z-[2147483647]"
                    >
                      {getAvailableShades().length > 0 ? (
                        getAvailableShades().map((shade) => (
                          <SelectItem key={shade.id} value={shade.name}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: shade.color || '#F5F0E8' }}
                              />
                              {shade.name}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-shades" disabled>
                          No shades available for this system
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
                  // Trigger shade conversion API call
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

            {/* API-Powered Shade Conversion Results */}
            {isLoadingConversion ? (
              <div className="flex items-center justify-center py-8 flex-shrink-0">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Converting shade...</span>
              </div>
            ) : conversionError ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md flex-shrink-0">
                <p className="text-sm text-red-600">{conversionError}</p>
              </div>
            ) : apiConversionResults.length > 0 ? (
              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                <h3 className="text-lg font-semibold text-gray-900 flex-shrink-0">Shade Conversion Results</h3>
                <p className="text-sm text-gray-600 flex-shrink-0">
                  Found {apiConversionResults.length} matching shades:
                </p>
                <div
                  className="grid gap-3 conversion-results-scroll overflow-y-auto overflow-x-hidden"
                  style={{ 
                    maxHeight: '300px',
                    minHeight: '200px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#cbd5e1 #f1f5f9'
                  }}
                >
                  {apiConversionResults.map((match, index) => (
                    <div key={match.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          {type === 'teeth' ? (
                            <>
                              <div 
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: match.color_codes.incisal || '#FFFFFF' }}
                                title="Incisal"
                              />
                              <div 
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: match.color_codes.body || '#FFFFFF' }}
                                title="Body"
                              />
                              <div 
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: match.color_codes.cervical || '#FFFFFF' }}
                                title="Cervical"
                              />
                            </>
                          ) : (
                            <>
                              <div 
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: match.color_codes.top || '#FFFFFF' }}
                                title="Top"
                              />
                              <div 
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: match.color_codes.middle || '#FFFFFF' }}
                                title="Middle"
                              />
                              <div 
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: match.color_codes.bottom || '#FFFFFF' }}
                                title="Bottom"
                              />
                            </>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{match.name}</p>
                          <p className="text-sm text-gray-600">{match.brand.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${
                          match.match_percentage > 80 ? 'bg-green-500' : 
                          match.match_percentage > 60 ? 'bg-yellow-500' : 
                          'bg-red-500'
                        } text-white`}>
                          {match.match_percentage}%
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Set temporary selection instead of immediately applying
                            setTempSelectedMatch(match)
                            setTempSelectedSystem(match.brand.name)
                            setTempSelectedShade(match.name)
                            // Update live preview if available
                            if (onLiveUpdate) {
                              onLiveUpdate(match.brand.name, match.name)
                            }
                          }}
                          className={`text-blue-600 hover:text-blue-700 hover:bg-blue-50 ${
                            tempSelectedMatch?.id === match.id ? 'bg-blue-100 border-blue-300' : ''
                          }`}
                        >
                          {tempSelectedMatch?.id === match.id ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 flex-1 flex flex-col">
                <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-6">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Matching Shades Found</h3>
                  <p className="text-gray-600 mb-4">
                    We couldn't find any shades matching <span className="font-semibold">{selectedIndividualShade}</span> from <span className="font-semibold">{selectedShadeSystem}</span>.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Color Picker Tab */}
          <TabsContent
            value="colorPicker"
            className="p-4 space-y-4 flex-1 bg-white flex flex-col overflow-hidden"
          >
            {/* Selected Shade Display */}
            <div className="flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-xl border-2 border-gray-300 shadow-sm"
                  style={{ backgroundColor: selectedCustomColor || selectedShade?.color || '#F5F0E8' }}
                />
                <div>
                  <span className="text-2xl font-bold text-gray-900">{selectedIndividualShade}</span>
                  <button className="ml-2 p-1 rounded-full hover:bg-orange-50">
                    <RotateCcw className="w-4 h-4 text-orange-600" />
                  </button>
                  <p className="text-sm text-gray-600">{currentSystem?.name}</p>
                </div>
              </div>
            </div>

            {/* Enhanced Gradient Slider */}
            <div className="space-y-4 flex-shrink-0">
              <label className="text-sm font-medium text-gray-700">Brightness Adjustment</label>
              <div className="relative">
                <div 
                  className="h-10 rounded-lg relative cursor-pointer border shadow-sm"
                  style={{
                    background: "linear-gradient(to right, #FFF8EC 0%, #F5E2C0 25%, #E6C89C 50%, #C9A36B 75%, #A67C4F 100%)"
                  }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = e.clientX - rect.left
                    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
                    onSliderChange(percentage)
                  }}
                >
                  <div
                    className="absolute top-1/2 transform -translate-y-1/2 w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg cursor-pointer transition-all hover:scale-110"
                    style={{ left: `calc(${sliderPosition}% - 12px)` }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      const sliderElement = e.currentTarget.parentElement as HTMLElement
                      const handleMouseMove = (e: MouseEvent) => {
                        const rect = sliderElement?.getBoundingClientRect()
                        if (rect) {
                          const x = e.clientX - rect.left
                          const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
                          onSliderChange(percentage)
                        }
                      }
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove)
                        document.removeEventListener('mouseup', handleMouseUp)
                      }
                      document.addEventListener('mousemove', handleMouseMove)
                      document.addEventListener('mouseup', handleMouseUp)
                    }}
                  />
                </div>
              </div>
              
              {/* Slider Labels */}
              <div className="flex justify-between text-xs text-gray-400 px-2">
                <span>Lightest</span>
                <span>Light</span>
                <span>Medium</span>
                <span>Dark</span>
                <span>Darkest</span>
              </div>
            </div>

            {/* Color Information */}
            <div className="grid grid-cols-2 gap-4 flex-shrink-0">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Original Color</label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div 
                    className="w-8 h-8 rounded border-2 border-gray-300"
                    style={{ backgroundColor: selectedShade?.color || '#F5F0E8' }}
                  />
                  <div className="text-sm">
                    <p className="font-medium">{selectedShade?.color || '#F5F0E8'}</p>
                    <p className="text-gray-500">Base shade</p>
                  </div>
                </div>
              </div>

              {selectedCustomColor && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Adjusted Color</label>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div
                      className="w-8 h-8 rounded border-2 border-blue-300"
                      style={{ backgroundColor: selectedCustomColor }}
                    />
                    <div className="text-sm">
                      <p className="font-medium">{selectedCustomColor}</p>
                      <p className="text-blue-600">Custom adjusted</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Color Match Results */}
            {selectedCustomColor ? (
              <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between flex-shrink-0">
                  <h3 className="text-lg font-semibold text-gray-900">Color Match Results</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onPerformColorMatch(selectedCustomColor)
                    }}
                    disabled={isLoadingColorMatch}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    {isLoadingColorMatch ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Match Color
                  </Button>
                </div>

                {colorMatchError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md flex-shrink-0">
                    <p className="text-sm text-red-600">{colorMatchError}</p>
                  </div>
                )}

                {isLoadingColorMatch ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Matching color to shades...</span>
                  </div>
                ) : apiColorMatchResults.length > 0 ? (
                  <div className="space-y-3 flex-1 flex flex-col min-h-0">
                    <p className="text-sm text-gray-600 flex-shrink-0">
                      Found {apiColorMatchResults.length} matching shades for your color:
                    </p>
                    <div
                      className="grid gap-3 conversion-results-scroll overflow-y-auto overflow-x-hidden"
                      style={{ 
                        maxHeight: '300px',
                        minHeight: '200px',
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#cbd5e1 #f1f5f9'
                      }}
                    >
                      {apiColorMatchResults.map((match, index) => (
                        <div key={match.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                              {type === 'teeth' ? (
                                <>
                                  <div 
                                    className="w-4 h-4 rounded border"
                                    style={{ backgroundColor: match.color_codes.incisal || '#FFFFFF' }}
                                    title="Incisal"
                                  />
                                  <div 
                                    className="w-4 h-4 rounded border"
                                    style={{ backgroundColor: match.color_codes.body || '#FFFFFF' }}
                                    title="Body"
                                  />
                                  <div 
                                    className="w-4 h-4 rounded border"
                                    style={{ backgroundColor: match.color_codes.cervical || '#FFFFFF' }}
                                    title="Cervical"
                                  />
                                </>
                              ) : (
                                <>
                                  <div 
                                    className="w-4 h-4 rounded border"
                                    style={{ backgroundColor: match.color_codes.top || '#FFFFFF' }}
                                    title="Top"
                                  />
                                  <div 
                                    className="w-4 h-4 rounded border"
                                    style={{ backgroundColor: match.color_codes.middle || '#FFFFFF' }}
                                    title="Middle"
                                  />
                                  <div 
                                    className="w-4 h-4 rounded border"
                                    style={{ backgroundColor: match.color_codes.bottom || '#FFFFFF' }}
                                    title="Bottom"
                                  />
                                </>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{match.name}</p>
                              <p className="text-sm text-gray-600">{match.brand.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs ${
                              match.match_percentage > 80 ? 'bg-green-500' : 
                              match.match_percentage > 60 ? 'bg-yellow-500' : 
                              'bg-red-500'
                            } text-white`}>
                              {match.match_percentage}%
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                // Set temporary selection instead of immediately applying
                                setTempSelectedMatch(match)
                                setTempSelectedSystem(match.brand.name)
                                setTempSelectedShade(match.name)
                                // Update live preview if available
                                if (onLiveUpdate) {
                                  onLiveUpdate(match.brand.name, match.name)
                                }
                              }}
                              className={`text-blue-600 hover:text-blue-700 hover:bg-blue-50 ${
                                tempSelectedMatch?.id === match.id ? 'bg-blue-100 border-blue-300' : ''
                              }`}
                            >
                              {tempSelectedMatch?.id === match.id ? 'Selected' : 'Select'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-6">
                      <div className="text-gray-400 mb-4">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Matching Shades Found</h3>
                      <p className="text-gray-600 mb-4">
                        We couldn't find any shades matching the color <span className="font-mono font-semibold">{selectedCustomColor}</span>.
                      </p>
                      <div className="text-sm text-gray-500">
                        <p>Try:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Adjusting the color slightly</li>
                          <li>Using a different shade as a starting point</li>
                          <li>Selecting from the shade guide instead</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 flex-1 flex flex-col">
                <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-6">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Adjust Color to Find Matches</h3>
                  <p className="text-gray-600 mb-4">
                    Use the brightness slider above to adjust the color, then click "Match Color" to find matching shades.
                  </p>
                  <div className="text-sm text-gray-500">
                    <p>Tips:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Drag the slider to adjust brightness</li>
                      <li>Click anywhere on the gradient to set a specific brightness</li>
                      <li>Use the "Match Color" button to find similar shades</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Back to Guide Button */}
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Back to Guide
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t flex-shrink-0 bg-white border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div 
              className="w-4 h-4 rounded border"
              style={{ 
                backgroundColor: tempSelectedMatch?.color_codes?.body || 
                               tempSelectedMatch?.color_codes?.top || 
                               selectedCustomColor || 
                               selectedShade?.color || 
                               '#F5F0E8' 
              }}
            />
            <span>
              {tempSelectedShade || selectedIndividualShade} 
              {tempSelectedMatch ? ' (Selected)' : selectedCustomColor ? ' (Custom)' : ''}
            </span>
            {tempSelectedMatch && (
              <span className="text-xs text-blue-600 font-medium">
                - {tempSelectedSystem}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Apply the temporarily selected match if one is selected
                if (tempSelectedMatch) {
                  onSelectConversionMatch(tempSelectedMatch)
                  // Pass the selected shade information to onConfirm
                  onConfirm(tempSelectedSystem, tempSelectedShade)
                } else {
                  // If no temporary selection, use the current selection
                  onConfirm(selectedShadeSystem, selectedIndividualShade)
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            >
              Confirm Selection
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConversionModal
