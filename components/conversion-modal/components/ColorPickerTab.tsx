import React from 'react'
import { RotateCcw, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConversionResults } from './ConversionResults'
import { ConversionMatch } from '../types'

interface ColorPickerTabProps {
  // State
  selectedIndividualShade: string
  selectedShade?: { color: string }
  currentSystem?: { name: string }
  selectedCustomColor?: string
  sliderPosition: number
  type: 'teeth' | 'gum'
  
  // Data
  apiColorMatchResults: ConversionMatch[]
  isLoadingColorMatch: boolean
  colorMatchError: string | null
  tempSelectedMatch?: ConversionMatch | null
  
  // Actions
  onSliderChange: (percentage: number) => void
  onPerformColorMatch: (color: string) => void
  onSelectMatch: (match: ConversionMatch) => void
  onClose: () => void
}

export const ColorPickerTab: React.FC<ColorPickerTabProps> = ({
  selectedIndividualShade,
  selectedShade,
  currentSystem,
  selectedCustomColor,
  sliderPosition,
  type,
  apiColorMatchResults,
  isLoadingColorMatch,
  colorMatchError,
  tempSelectedMatch,
  onSliderChange,
  onPerformColorMatch,
  onSelectMatch,
  onClose
}) => {
  return (
    <div className="p-4 space-y-4 flex-1 bg-white flex flex-col overflow-hidden">
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
                  maxHeight: '400px',
                  minHeight: '250px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#cbd5e1 #f1f5f9'
                }}
              >
                {apiColorMatchResults.map((match) => (
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
                      <div className={`text-xs px-2 py-1 rounded ${
                        match.match_percentage > 80 ? 'bg-green-500' : 
                        match.match_percentage > 60 ? 'bg-yellow-500' : 
                        'bg-red-500'
                      } text-white`}>
                        {match.match_percentage}%
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectMatch(match)}
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
    </div>
  )
}
