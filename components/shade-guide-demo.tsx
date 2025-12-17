"use client"

import React, { useState } from 'react'
import { Palette, Search } from 'lucide-react'
import { TeethShadeGuideModal } from './teeth-shade-guide-modal'
import { GumShadeGuideModal } from './gum-shade-guide-modal'
import { ShadeMatch } from '../services/shade-api-service'

export function ShadeGuideDemo() {
  const [isTeethModalOpen, setIsTeethModalOpen] = useState(false)
  const [isGumModalOpen, setIsGumModalOpen] = useState(false)
  const [selectedTeethShade, setSelectedTeethShade] = useState<ShadeMatch | null>(null)
  const [selectedGumShade, setSelectedGumShade] = useState<ShadeMatch | null>(null)

  const handleTeethShadeSelect = (shade: ShadeMatch) => {
    setSelectedTeethShade(shade)
  }

  const handleGumShadeSelect = (shade: ShadeMatch) => {
    setSelectedGumShade(shade)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Shade Guide Integration Demo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Teeth Shade Guide */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Search className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Teeth Shade Guide</h2>
          </div>
          
          <p className="text-gray-600 mb-4">
            Select teeth shades, find equivalent shades across brands, or match custom colors.
          </p>
          
          <button
            onClick={() => setIsTeethModalOpen(true)}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <Palette className="w-5 h-5 mr-2" />
            Open Teeth Shade Guide
          </button>
          
          {selectedTeethShade && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900">Selected Teeth Shade:</h3>
              <p className="text-blue-800">
                {selectedTeethShade.name} ({selectedTeethShade.brand.name})
              </p>
              <div className="flex space-x-2 mt-2">
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: selectedTeethShade.color_codes.incisal }}
                  title={`Incisal: ${selectedTeethShade.color_codes.incisal}`}
                />
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: selectedTeethShade.color_codes.body }}
                  title={`Body: ${selectedTeethShade.color_codes.body}`}
                />
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: selectedTeethShade.color_codes.cervical }}
                  title={`Cervical: ${selectedTeethShade.color_codes.cervical}`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Gum Shade Guide */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Search className="w-6 h-6 text-pink-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Gum Shade Guide</h2>
          </div>
          
          <p className="text-gray-600 mb-4">
            Select gum shades, find equivalent shades across brands, or match custom colors.
          </p>
          
          <button
            onClick={() => setIsGumModalOpen(true)}
            className="w-full bg-pink-600 text-white py-3 px-4 rounded-lg hover:bg-pink-700 transition-colors flex items-center justify-center"
          >
            <Palette className="w-5 h-5 mr-2" />
            Open Gum Shade Guide
          </button>
          
          {selectedGumShade && (
            <div className="mt-4 p-4 bg-pink-50 rounded-lg">
              <h3 className="font-semibold text-pink-900">Selected Gum Shade:</h3>
              <p className="text-pink-800">
                {selectedGumShade.name} ({selectedGumShade.brand.name})
              </p>
              <div className="flex space-x-2 mt-2">
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: selectedGumShade.color_codes.top }}
                  title={`Top: ${selectedGumShade.color_codes.top}`}
                />
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: selectedGumShade.color_codes.middle }}
                  title={`Middle: ${selectedGumShade.color_codes.middle}`}
                />
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: selectedGumShade.color_codes.bottom }}
                  title={`Bottom: ${selectedGumShade.color_codes.bottom}`}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Features Overview */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Shade Guide</h4>
            <p className="text-sm text-gray-600">
              Visual shade selection with hover tooltips and click interactions.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Shade Conversion</h4>
            <p className="text-sm text-gray-600">
              Find equivalent shades across different brands with percentage match scores.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Color Matching</h4>
            <p className="text-sm text-gray-600">
              Match custom colors using color picker or image upload with advanced algorithms.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TeethShadeGuideModal
        isOpen={isTeethModalOpen}
        onClose={() => setIsTeethModalOpen(false)}
        onShadeSelect={handleTeethShadeSelect}
        selectedShade={selectedTeethShade}
      />

      <GumShadeGuideModal
        isOpen={isGumModalOpen}
        onClose={() => setIsGumModalOpen(false)}
        onShadeSelect={handleGumShadeSelect}
        selectedShade={selectedGumShade}
      />
    </div>
  )
}


