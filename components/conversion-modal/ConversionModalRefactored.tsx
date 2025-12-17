"use client"

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ShadeMatchingTab } from './components/ShadeMatchingTab'
import { ColorPickerTab } from './components/ColorPickerTab'
import { ModalFooter } from './components/ModalFooter'
import { useConversionModal } from './hooks/useConversionModal'
import { ConversionModalProps } from './types'

export const ConversionModalRefactored: React.FC<ConversionModalProps> = ({
  state,
  actions,
  data
}) => {
  const {
    tempSelectedMatch,
    tempSelectedSystem,
    tempSelectedShade,
    isFullScreen,
    selectMatch,
    clearTempSelection
  } = useConversionModal(state)

  if (!state.isOpen) return null

  const handleSelectMatch = (match: any) => {
    selectMatch(match)
    if (actions.onLiveUpdate) {
      actions.onLiveUpdate(match.brand.name, match.name)
    }
  }

  const handleConfirm = (shadeSystem: string, individualShade: string) => {
    if (tempSelectedMatch) {
      actions.onSelectConversionMatch(tempSelectedMatch)
    }
    actions.onConfirm(shadeSystem, individualShade)
    clearTempSelection()
  }

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-[10000]"
      style={{
        position: 'fixed',
        display: 'flex',
        visibility: 'visible',
        userSelect: 'text',
        WebkitUserSelect: 'text',
        MozUserSelect: 'text',
        msUserSelect: 'text'
      }}
      onClick={(e) => {
        e.stopPropagation()
        if (e.target === e.currentTarget) {
          actions.onClose()
        }
      }}
    >
      <div
        className="w-[95vw] sm:w-[600px] max-w-[60vw] sm:max-w-[600px] max-h-[90vh] p-0 flex flex-col bg-white rounded-lg shadow-lg border border-gray-200 relative pointer-events-auto z-[10001]"
        style={{
          position: 'relative',
          display: 'flex',
          visibility: 'visible',
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
          value={state.activeTab} 
          onValueChange={(value) => actions.onTabChange(value as 'shade' | 'colorPicker')} 
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
          <TabsContent value="shade" className="flex-1 bg-white flex flex-col overflow-hidden">
            <ShadeMatchingTab
              selectedShadeSystem={state.selectedShadeSystem}
              selectedIndividualShade={state.selectedIndividualShade}
              selectedShade={state.selectedShade}
              currentSystem={state.currentSystem}
              type={state.type}
              selectedGumShade={state.selectedGumShade}
              apiShadeSystems={data.apiShadeSystems}
              isLoadingShadeSystems={data.isLoadingShadeSystems}
              shadeSystemsError={data.shadeSystemsError}
              apiConversionResults={data.apiConversionResults}
              isLoadingConversion={data.isLoadingConversion}
              conversionError={data.conversionError}
              tempSelectedMatch={tempSelectedMatch}
              onSystemChange={actions.onSystemChange}
              onShadeChange={actions.onShadeChange}
              onPerformShadeConversion={actions.onPerformShadeConversion}
              onSelectMatch={handleSelectMatch}
              getAvailableShades={actions.getAvailableShades}
              isFullScreen={isFullScreen}
            />
          </TabsContent>

          {/* Color Picker Tab */}
          <TabsContent value="colorPicker" className="flex-1 bg-white flex flex-col overflow-hidden">
            <ColorPickerTab
              selectedIndividualShade={state.selectedIndividualShade}
              selectedShade={state.selectedShade}
              currentSystem={state.currentSystem}
              selectedCustomColor={state.selectedCustomColor}
              sliderPosition={state.sliderPosition}
              type={state.type}
              apiColorMatchResults={data.apiColorMatchResults}
              isLoadingColorMatch={data.isLoadingColorMatch}
              colorMatchError={data.colorMatchError}
              tempSelectedMatch={tempSelectedMatch}
              onSliderChange={actions.onSliderChange}
              onPerformColorMatch={actions.onPerformColorMatch}
              onSelectMatch={handleSelectMatch}
              onClose={actions.onClose}
            />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <ModalFooter
          tempSelectedMatch={tempSelectedMatch}
          tempSelectedSystem={tempSelectedSystem}
          tempSelectedShade={tempSelectedShade}
          selectedIndividualShade={state.selectedIndividualShade}
          selectedCustomColor={state.selectedCustomColor}
          selectedShade={state.selectedShade}
          onClose={actions.onClose}
          onConfirm={handleConfirm}
          onSelectConversionMatch={actions.onSelectConversionMatch}
          selectedShadeSystem={state.selectedShadeSystem}
        />
      </div>
    </div>
  )
}
