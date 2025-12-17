import React from 'react'
import { Button } from '@/components/ui/button'
import { ConversionMatch } from '../types'

interface ModalFooterProps {
  tempSelectedMatch?: ConversionMatch | null
  tempSelectedSystem: string
  tempSelectedShade: string
  selectedIndividualShade: string
  selectedCustomColor?: string
  selectedShade?: { color: string }
  onClose: () => void
  onConfirm: (shadeSystem: string, individualShade: string) => void
  onSelectConversionMatch: (match: ConversionMatch) => void
  selectedShadeSystem: string
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  tempSelectedMatch,
  tempSelectedSystem,
  tempSelectedShade,
  selectedIndividualShade,
  selectedCustomColor,
  selectedShade,
  onClose,
  onConfirm,
  onSelectConversionMatch,
  selectedShadeSystem
}) => {
  const handleConfirm = () => {
    if (tempSelectedMatch) {
      onSelectConversionMatch(tempSelectedMatch)
      onConfirm(tempSelectedSystem, tempSelectedShade)
    } else {
      onConfirm(selectedShadeSystem, selectedIndividualShade)
    }
  }

  return (
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
          onClick={handleConfirm}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8"
        >
          Confirm Selection
        </Button>
      </div>
    </div>
  )
}

