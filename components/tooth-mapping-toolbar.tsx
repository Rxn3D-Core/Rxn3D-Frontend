"use client"

import React from 'react';
import { X } from 'lucide-react';
import { PNGToothIcon } from './png-tooth-icon';

export interface ToothMappingMode {
  id: string;
  name: string;
  description: string;
  outlineColor: string;
  fillColor: string;
  visualStyle: 'solid' | 'wireframe' | 'original' | 'mesh';
}

export interface ToothMappingToolbarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMode: string | null;
  onModeSelect: (modeId: string | null) => void;
  selectedTeethCount: number;
  archType: 'maxillary' | 'mandibular';
  isCaseSubmitted?: boolean;
}

const TOOTH_MAPPING_MODES: ToothMappingMode[] = [
  {
    id: 'teeth_in_mouth',
    name: 'Teeth in Mouth',
    description: 'Keep original color #F3EBD7',
    outlineColor: '#E4DCC8',
    fillColor: '#F3EBD7', // Matches API: "Teeth in mouth"
    visualStyle: 'original'
  },
  {
    id: 'missing_teeth',
    name: 'Missing Teeth',
    description: 'Keep original color #D3D3D3 30% opacity + add mesh',
    outlineColor: '#B0AFAE',
    fillColor: '#D3D3D3', // Updated to match API: "Missing teeth"
    visualStyle: 'mesh'
  },
  {
    id: 'will_extract',
    name: 'Will Extract on Delivery',
    description: 'Tooth color overlay #E92520',
    outlineColor: '#C40026',
    fillColor: '#E92520', // Updated to match API: "Will extract on delivery"
    visualStyle: 'solid'
  },
  {
    id: 'extracted',
    name: 'Has Been Extracted',
    description: 'Tooth color overlay #595652',
    outlineColor: '#AFAEAD',
    fillColor: '#AFAEAD', // Updated to match API: "Has been extracted"
    visualStyle: 'solid'
  },
  {
    id: 'prepped',
    name: 'Prepped',
    description: 'Tooth color overlay #AFAA9D',
    outlineColor: '#C68E04',
    fillColor: '#AFAA9D', // Updated to match API: "Prepped"
    visualStyle: 'solid'
  },
  {
    id: 'repair',
    name: 'Repair',
    description: 'Tooth color overlay #A0F69A',
    outlineColor: '#62B85C',
    fillColor: '#A0F69A',
    visualStyle: 'solid'
  },
  {
    id: 'clasp',
    name: 'Clasp',
    description: 'No color overlay Pink clasp on tooth',
    outlineColor: '#B95DAD',
    fillColor: '#FFD1F9',
    visualStyle: 'solid'
  },
  {
    id: 'implant',
    name: 'Implant',
    description: 'Implant',
    outlineColor: '#2E688B',
    fillColor: '#90BDD8', // Updated to match API: "Implant"
    visualStyle: 'solid'
  }
];

// PNG Tooth Icon Component
const ToothIcon: React.FC<{
  mode: ToothMappingMode;
  isSelected: boolean;
  onClick: () => void;
}> = ({ mode, isSelected, onClick }) => {
  // Map mode IDs to status types for the PNG component
  const getStatusFromMode = (modeId: string) => {
    switch (modeId) {
      case 'teeth_in_mouth': return 'teeth_in_mouth';
      case 'missing_teeth': return 'missing_teeth';
      case 'prepped': return 'prepped';
      case 'will_extract': return 'will_extract';
      case 'extracted': return 'extracted';
      case 'repair': return 'repair';
      case 'clasp': return 'clasp';
      case 'implant': return 'implant';
      default: return 'teeth_in_mouth';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`p-1 rounded transition-all duration-200 flex items-center justify-center ${
        isSelected 
          ? 'ring-1 ring-blue-500 bg-blue-50' 
          : 'hover:bg-gray-50'
      }`}
      title={mode.description}
    >
      <PNGToothIcon
        status={getStatusFromMode(mode.id) as any}
        size="medium"
        isSelected={isSelected}
      />
    </button>
  );
};

export const ToothMappingToolbar: React.FC<ToothMappingToolbarProps> = ({
  isOpen,
  onClose,
  selectedMode,
  onModeSelect,
  selectedTeethCount,
  archType,
  isCaseSubmitted = false
}) => {
  // Position toolbar on left for maxillary, right for mandibular
  const positionClass = archType === 'maxillary' 
    ? 'fixed left-4 top-1/2 transform -translate-y-1/2 z-50'
    : 'fixed right-4 top-1/2 transform -translate-y-1/2 z-50';

  if (!isOpen) return null;

  return (
    <div className={positionClass}>
      <div className={`bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[10px] ${
        archType === 'maxillary' ? 'border-l-4 border-l-white-500' : 'border-r-4 border-r-white-500'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Tooth Mapping</h3>
            <p className="text-xs text-gray-500 capitalize">{archType} Arch</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-3 h-3 text-gray-500" />
          </button>
        </div>

        {/* Active Mode Display */}
        {selectedMode && (
          <div className="mb-3 p-2 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-500 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
              <span className="text-xs font-bold text-blue-800">ACTIVE</span>
            </div>
            <p className="text-xs text-blue-700 mt-1">
              🦷 Click teeth in 3D chart to assign to this type
            </p>
            <button
              onClick={() => onModeSelect(null)}
              className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors font-medium border border-red-300 mt-1"
            >
              ✕ Clear Selection
            </button>
          </div>
        )}

        {/* Tooth Mapping Modes */}
        <div className="flex flex-col gap-1 mb-3 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {TOOTH_MAPPING_MODES.map((mode) => (
            <ToothIcon
              key={mode.id}
              mode={mode}
              isSelected={selectedMode === mode.id}
              onClick={() => {
                if (isCaseSubmitted) return;
                onModeSelect(selectedMode === mode.id ? null : mode.id);
              }}
            />
          ))}
        </div>

        {/* Instructions */}
        {!selectedMode && (
          <div className="text-center">
            <p className="text-xs text-gray-600">Click a mode above to activate it, then click teeth in the 3D chart</p>
          </div>
        )}
      </div>
    </div>
  );
};
