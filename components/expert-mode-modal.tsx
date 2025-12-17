"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Settings, X, Save, Info, Layers, Wrench, Calendar, Palette, Crown, ChevronDown, ChevronUp } from "lucide-react"

interface ExpertModeModalProps {
  isOpen: boolean
  onClose: () => void
}

const ExpertModeModal: React.FC<ExpertModeModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null)
  
  // Design step states
  const [marginType, setMarginType] = useState('chamfer')
  const [marginWidth, setMarginWidth] = useState('0.5')
  const [embrasureType, setEmbrasureType] = useState('')
  const [contourAdjustments, setContourAdjustments] = useState<string[]>([])
  const [ponticType, setPonticType] = useState('')
  const [ponticDepth, setPonticDepth] = useState('1.0')
  const [ridgeDesign, setRidgeDesign] = useState('')
  const [inadequateClearanceOptions, setInadequateClearanceOptions] = useState<string[]>([])
  
  // Occlusion step states
  const [occlusionLevel, setOcclusionLevel] = useState<string>('')
  const [contactTypes, setContactTypes] = useState<string[]>([])
  const [excursiveGuidance, setExcursiveGuidance] = useState<string>('')
  const [verticalDimension, setVerticalDimension] = useState<string>('')
  const [specialConsiderations, setSpecialConsiderations] = useState<string[]>([])
  
  // Shade step states
  const [finalShade, setFinalShade] = useState<string>('')
  const [stumpShade, setStumpShade] = useState<string>('')
  const [characterization, setCharacterization] = useState<string[]>([])
  const [occlusalStainingIntensity, setOcclusalStainingIntensity] = useState<number>(1)
  const [additionalStaining, setAdditionalStaining] = useState<string[]>([])
  const [surfaceTexture, setSurfaceTexture] = useState<string>('none')
  const [incisalShape, setIncisalShape] = useState<string>('rounded')
  
  // Implant step states
  const [abutmentType, setAbutmentType] = useState<string>('')
  const [gingivalHeight, setGingivalHeight] = useState<string>('')
  const [emergenceProfile, setEmergenceProfile] = useState<string>('')
  const [screwAccess, setScrewAccess] = useState<string>('')
  const [specialFeatures, setSpecialFeatures] = useState<string[]>([])
  
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    marginMetal: true,
    embrasures: true,
    pontic: true,
    ridge: true,
    inadequateClearance: true,
    occlusionLevel: true,
    contactSpecs: true,
    verticalDimension: true,
    specialConsiderations: true
  })

  const steps = [
    { id: 1, name: 'Material', icon: Layers },
    { id: 2, name: 'Design', icon: Wrench },
    { id: 3, name: 'Occlusion', icon: Calendar },
    { id: 4, name: 'Shade', icon: Palette },
    { id: 5, name: 'Implant', icon: Crown },
  ]

  const materials = [
    {
      id: 'solid-zirconia',
      name: 'Solid Zirconia',
      description: 'High strength, aesthetic',
      badge: { text: 'Popular', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      borderColor: 'border-blue-300',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'lithium-disilicate',
      name: 'Lithium Disilicate',
      description: 'Excellent translucency',
      badge: { text: 'Premium', color: 'bg-purple-100 text-purple-800 border-purple-200' },
      borderColor: 'border-purple-300',
      bgColor: 'bg-purple-50'
    },
    {
      id: 'porcelain-fused-metal',
      name: 'Porcelain Fused Metal',
      description: 'Traditional, reliable',
      borderColor: 'border-gray-300',
      bgColor: 'bg-gray-50'
    },
    {
      id: 'pmma',
      name: 'PMMA',
      description: 'Temporary restoration',
      badge: { text: 'Temp', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      borderColor: 'border-yellow-300',
      bgColor: 'bg-yellow-50'
    },
    {
      id: 'layered-zirconia',
      name: 'Layered Zirconia',
      description: 'Enhanced',
      borderColor: 'border-green-300',
      bgColor: 'bg-green-50'
    },
    {
      id: 'gold-alloy',
      name: 'Gold Alloy',
      description: 'Biocompatible',
      badge: { text: 'Premium', color: 'bg-orange-100 text-orange-800 border-orange-200' },
      borderColor: 'border-orange-300',
      bgColor: 'bg-orange-50'
    }
  ]

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleContourAdjustment = (adjustment: string) => {
    setContourAdjustments(prev => 
      prev.includes(adjustment) 
        ? prev.filter(item => item !== adjustment)
        : [...prev, adjustment]
    )
  }

  const handleInadequateClearanceOption = (option: string) => {
    setInadequateClearanceOptions(prev => 
      prev.includes(option) 
        ? prev.filter(item => item !== option)
        : [...prev, option]
    )
  }

  const handleContactType = (contactType: string) => {
    setContactTypes(prev => 
      prev.includes(contactType) 
        ? prev.filter(item => item !== contactType)
        : [...prev, contactType]
    )
  }

  const handleSpecialConsideration = (consideration: string) => {
    setSpecialConsiderations(prev => 
      prev.includes(consideration) 
        ? prev.filter(item => item !== consideration)
        : [...prev, consideration]
    )
  }

  const handleAdditionalStaining = (staining: string) => {
    setAdditionalStaining(prev => 
      prev.includes(staining) 
        ? prev.filter(item => item !== staining)
        : [...prev, staining]
    )
  }

  const handleCharacterization = (characteristic: string) => {
    setCharacterization(prev => 
      prev.includes(characteristic) 
        ? prev.filter(item => item !== characteristic)
        : [...prev, characteristic]
    )
  }


  const handleSpecialFeature = (feature: string) => {
    setSpecialFeatures(prev => 
      prev.includes(feature) 
        ? prev.filter(item => item !== feature)
        : [...prev, feature]
    )
  }

  const handleSave = () => {
    // Handle save logic here
    onClose()
  }

  // Check if any advanced options are configured
  const hasConfiguredOptions = () => {
    return (
      selectedMaterial !== null ||
      marginType !== 'chamfer' ||
      marginWidth !== '0.5' ||
      embrasureType !== '' ||
      contourAdjustments.length > 0 ||
      ponticType !== '' ||
      ponticDepth !== '1.0' ||
      ridgeDesign !== '' ||
      inadequateClearanceOptions.length > 0 ||
      occlusionLevel !== '' ||
      contactTypes.length > 0 ||
      excursiveGuidance !== '' ||
      verticalDimension !== '' ||
      specialConsiderations.length > 0 ||
      finalShade !== '' ||
      stumpShade !== '' ||
      characterization.length > 0 ||
      occlusalStainingIntensity !== 1 ||
      additionalStaining.length > 0 ||
      surfaceTexture !== 'none' ||
      incisalShape !== 'rounded' ||
      abutmentType !== '' ||
      gingivalHeight !== '' ||
      emergenceProfile !== '' ||
      screwAccess !== '' ||
      specialFeatures.length > 0
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
                <Settings className="w-5 h-5" />
                Master Mode Configuration
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Steps Navigation */}
          <div className="px-6 py-4 border-b flex-shrink-0">
            <div className="flex gap-1">
              {steps.map((step) => {
                const Icon = step.icon
                const isActive = step.id === currentStep
                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {step.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto min-h-0">
            {currentStep === 1 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Material Selection</h2>
                  <p className="text-gray-600">
                    Choose the primary material for your restoration. Each material has unique properties that affect strength, aesthetics, and clinical requirements.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {materials.map((material) => (
                    <div
                      key={material.id}
                      onClick={() => setSelectedMaterial(material.id)}
                      className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                        selectedMaterial === material.id
                          ? `${material.borderColor} ${material.bgColor} ring-2 ring-offset-2 ring-blue-500`
                          : `${material.borderColor} ${material.bgColor} hover:shadow-sm`
                      }`}
                    >
                      <div className="absolute top-2 right-2">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full">
                          <Info className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <div className="pr-6">
                        <h3 className="font-semibold text-gray-900 mb-1">{material.name}</h3>
                        {material.badge && (
                          <Badge className={`text-xs ${material.badge.color} mb-2`}>
                            {material.badge.text}
                          </Badge>
                        )}
                        <p className="text-sm text-gray-600">{material.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Design Details</h2>
                  <p className="text-gray-600">
                    Specify detailed design parameters for optimal fit and function. These settings ensure your restoration meets precise clinical requirements.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Margin / Metal Design Section */}
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleSection('marginMetal')}
                      className="w-full px-4 py-3 text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg"
                    >
                      <h3 className="font-semibold text-gray-900">Margin / Metal Design</h3>
                      {expandedSections.marginMetal ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {expandedSections.marginMetal && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Margin Type</h4>
                          <div className="space-y-2">
                            {['shoulder', 'chamfer', 'knife-edge', 'feather-edge'].map((type) => (
                              <label key={type} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="marginType"
                                  value={type}
                                  checked={marginType === type}
                                  onChange={(e) => setMarginType(e.target.value)}
                                  className="text-blue-600"
                                />
                                <span className="text-sm text-gray-700 capitalize">
                                  {type === 'knife-edge' ? 'Knife Edge' : 
                                   type === 'feather-edge' ? 'Feather Edge' :
                                   type === 'shoulder' ? 'Shoulder Margin' : 
                                   'Chamfer'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Margin Specifications</h4>
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">Margin Width (mm)</label>
                            <input
                              type="number"
                              value={marginWidth}
                              onChange={(e) => setMarginWidth(e.target.value)}
                              step="0.1"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Recommended: 0.5-1.0mm for optimal strength and fit</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Embrasures / Contour Section */}
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleSection('embrasures')}
                      className="w-full px-4 py-3 text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg"
                    >
                      <h3 className="font-semibold text-gray-900">Embrasures / Contour</h3>
                      {expandedSections.embrasures ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {expandedSections.embrasures && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Embrasure Type</h4>
                          <div className="space-y-2">
                            {['closed', 'open'].map((type) => (
                              <label key={type} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="embrasureType"
                                  value={type}
                                  checked={embrasureType === type}
                                  onChange={(e) => setEmbrasureType(e.target.value)}
                                  className="text-blue-600"
                                />
                                <span className="text-sm text-gray-700 capitalize">
                                  {type === 'closed' ? 'Closed Embrasures' : 'Open Embrasures'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Contour Adjustments</h4>
                          <div className="space-y-2">
                            {['full-contour', 'reduced-lingual', 'enhanced-facial'].map((adjustment) => (
                              <label key={adjustment} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={contourAdjustments.includes(adjustment)}
                                  onChange={() => handleContourAdjustment(adjustment)}
                                  className="text-blue-600"
                                />
                                <span className="text-sm text-gray-700 capitalize">
                                  {adjustment === 'full-contour' ? 'Full Contour' :
                                   adjustment === 'reduced-lingual' ? 'Reduced Lingual' :
                                   'Enhanced Facial'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pontic Design Section */}
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleSection('pontic')}
                      className="w-full px-4 py-3 text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg"
                    >
                      <h3 className="font-semibold text-gray-900">Pontic Design</h3>
                      {expandedSections.pontic ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {expandedSections.pontic && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Pontic Type</h4>
                          <div className="space-y-2">
                            {['ridge-lap', 'full-ridge'].map((type) => (
                              <label key={type} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="ponticType"
                                  value={type}
                                  checked={ponticType === type}
                                  onChange={(e) => setPonticType(e.target.value)}
                                  className="text-blue-600"
                                />
                                <span className="text-sm text-gray-700 capitalize">
                                  {type === 'ridge-lap' ? 'Ridge Lap' : 'Full Ridge'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Pontic Specifications</h4>
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">Pontic Depth (mm)</label>
                            <input
                              type="number"
                              value={ponticDepth}
                              onChange={(e) => setPonticDepth(e.target.value)}
                              step="0.1"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ridge Design Section */}
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleSection('ridge')}
                      className="w-full px-4 py-3 text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg"
                    >
                      <h3 className="font-semibold text-gray-900">Ridge Design Options</h3>
                      {expandedSections.ridge ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {expandedSections.ridge && (
                      <div className="p-4">
                        <div className="space-y-3">
                          {['full-ridge', 'sanitary', 'ovate'].map((type) => (
                            <div key={type} className="flex items-center justify-between">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="ridgeDesign"
                                  value={type}
                                  checked={ridgeDesign === type}
                                  onChange={(e) => setRidgeDesign(e.target.value)}
                                  className="text-blue-600"
                                />
                                <span className="text-sm text-gray-700 capitalize">
                                  {type === 'full-ridge' ? 'Full Ridge' : 
                                   type === 'sanitary' ? 'Sanitary' : 'Ovate'}
                                </span>
                              </label>
                              {type === 'full-ridge' && (
                                <input
                                  type="number"
                                  value="1.0"
                                  step="0.1"
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              )}
                            </div>
                          ))}
                          <p className="text-xs text-gray-500 mt-2">Typical range: 0.5-2.0mm depending on tissue health</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Inadequate Clearance Options Section */}
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleSection('inadequateClearance')}
                      className="w-full px-4 py-3 text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg"
                    >
                      <h3 className="font-semibold text-gray-900">Inadequate Clearance Options</h3>
                      {expandedSections.inadequateClearance ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {expandedSections.inadequateClearance && (
                      <div className="p-4">
                        <h4 className="font-medium text-gray-900 mb-3">Special Instructions for Limited Space</h4>
                        <div className="space-y-2">
                          {['call-me', 'spot-prep', 'reduction-coping', 'adjust-opposing'].map((option) => (
                            <label key={option} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={inadequateClearanceOptions.includes(option)}
                                onChange={() => handleInadequateClearanceOption(option)}
                                className="text-blue-600"
                              />
                              <span className="text-sm text-gray-700 capitalize">
                                {option === 'call-me' ? 'Call Me' :
                                 option === 'spot-prep' ? 'Spot Prep' :
                                 option === 'reduction-coping' ? 'Reduction Coping' :
                                 'Adjust Opposing'}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Occlusion & Contacts</h2>
                  <p className="text-gray-600">
                    Define occlusal relationships and contact patterns to ensure proper function and patient comfort.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Occlusion Level Section */}
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleSection('occlusionLevel')}
                      className="w-full px-4 py-3 text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg"
                    >
                      <h3 className="font-semibold text-gray-900">Occlusion Level</h3>
                      {expandedSections.occlusionLevel ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {expandedSections.occlusionLevel && (
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            { id: 'light', name: 'Light Contact', description: 'Minimal occlusal pressure' },
                            { id: 'medium', name: 'Medium Contact', description: 'Moderate occlusal pressure' },
                            { id: 'heavy', name: 'Heavy Contact', description: 'Strong occlusal pressure' }
                          ].map((level) => (
                            <div
                              key={level.id}
                              onClick={() => setOcclusionLevel(level.id)}
                              className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                                occlusionLevel === level.id
                                  ? 'border-blue-300 bg-blue-50 ring-2 ring-offset-2 ring-blue-500'
                                  : 'border-gray-200 bg-white hover:shadow-sm'
                              }`}
                            >
                              <h4 className="font-semibold text-gray-900 mb-1">{level.name}</h4>
                              <p className="text-sm text-gray-600">{level.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contact Specifications Section */}
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleSection('contactSpecs')}
                      className="w-full px-4 py-3 text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg"
                    >
                      <h3 className="font-semibold text-gray-900">Contact Specifications</h3>
                      {expandedSections.contactSpecs ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {expandedSections.contactSpecs && (
                      <div className="p-4 space-y-6">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Contact Types</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              { id: 'centric', name: 'Centric Only' },
                              { id: 'working', name: 'Working Side' },
                              { id: 'balancing', name: 'Balancing Side' },
                              { id: 'protrusive', name: 'Protrusive' }
                            ].map((contact) => (
                              <button
                                key={contact.id}
                                onClick={() => handleContactType(contact.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  contactTypes.includes(contact.id)
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {contact.name}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Excursive Guidance</h4>
                          <select
                            value={excursiveGuidance}
                            onChange={(e) => setExcursiveGuidance(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select guidance type</option>
                            <option value="anterior">Anterior Guidance</option>
                            <option value="posterior">Posterior Guidance</option>
                            <option value="mutual">Mutual Protection</option>
                            <option value="group">Group Function</option>
                            <option value="canine">Canine Guidance</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Vertical Dimension Section */}
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleSection('verticalDimension')}
                      className="w-full px-4 py-3 text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg"
                    >
                      <h3 className="font-semibold text-gray-900">Vertical Dimension</h3>
                      {expandedSections.verticalDimension ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {expandedSections.verticalDimension && (
                      <div className="p-4">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">VDO Change</label>
                            <select
                              value={verticalDimension}
                              onChange={(e) => setVerticalDimension(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select VDO change</option>
                              <option value="increase">Increase VDO</option>
                              <option value="decrease">Decrease VDO</option>
                              <option value="maintain">Maintain Current VDO</option>
                              <option value="restore">Restore Original VDO</option>
                            </select>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              { id: 'bruxer', name: 'Bruxer', description: 'Heavy grinding patient' }
                            ].map((consideration) => (
                              <div
                                key={consideration.id}
                                onClick={() => handleSpecialConsideration(consideration.id)}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                                  specialConsiderations.includes(consideration.id)
                                    ? 'border-orange-300 bg-orange-50 ring-2 ring-offset-2 ring-orange-500'
                                    : 'border-gray-200 bg-white hover:shadow-sm'
                                }`}
                              >
                                <h4 className="font-semibold text-gray-900 mb-1">{consideration.name}</h4>
                                <p className="text-sm text-gray-600">{consideration.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Special Occlusal Considerations Section */}
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleSection('specialConsiderations')}
                      className="w-full px-4 py-3 text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg"
                    >
                      <h3 className="font-semibold text-gray-900">Special Occlusal Considerations</h3>
                      {expandedSections.specialConsiderations ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {expandedSections.specialConsiderations && (
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            { id: 'tmj', name: 'TMJ Considerations', description: 'Special joint care' },
                            { id: 'night-guard', name: 'Night Guard Use', description: 'Patient wears guard' },
                            { id: 'clenching', name: 'Clenching/Grinding', description: 'Parafunctional habits' }
                          ].map((consideration) => (
                            <div
                              key={consideration.id}
                              onClick={() => handleSpecialConsideration(consideration.id)}
                              className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                                specialConsiderations.includes(consideration.id)
                                  ? 'border-green-300 bg-green-50 ring-2 ring-offset-2 ring-green-500'
                                  : 'border-gray-200 bg-white hover:shadow-sm'
                              }`}
                            >
                              <h4 className="font-semibold text-gray-900 mb-1">{consideration.name}</h4>
                              <p className="text-sm text-gray-600">{consideration.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Shade & Characterization</h2>
                  <p className="text-gray-600">
                    Configure aesthetic properties and surface characteristics for optimal visual results.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Shade Selection Card */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Shade Selection</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Final Shade</label>
                        <Select value={finalShade} onValueChange={setFinalShade}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A1">A1</SelectItem>
                            <SelectItem value="A2">A2</SelectItem>
                            <SelectItem value="A3">A3</SelectItem>
                            <SelectItem value="A3.5">A3.5</SelectItem>
                            <SelectItem value="A4">A4</SelectItem>
                            <SelectItem value="B1">B1</SelectItem>
                            <SelectItem value="B2">B2</SelectItem>
                            <SelectItem value="B3">B3</SelectItem>
                            <SelectItem value="B4">B4</SelectItem>
                            <SelectItem value="C1">C1</SelectItem>
                            <SelectItem value="C2">C2</SelectItem>
                            <SelectItem value="C3">C3</SelectItem>
                            <SelectItem value="C4">C4</SelectItem>
                            <SelectItem value="D2">D2</SelectItem>
                            <SelectItem value="D3">D3</SelectItem>
                            <SelectItem value="D4">D4</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Stump Shade</label>
                        <Select value={stumpShade} onValueChange={setStumpShade}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A1">A1</SelectItem>
                            <SelectItem value="A2">A2</SelectItem>
                            <SelectItem value="A3">A3</SelectItem>
                            <SelectItem value="A3.5">A3.5</SelectItem>
                            <SelectItem value="A4">A4</SelectItem>
                            <SelectItem value="B1">B1</SelectItem>
                            <SelectItem value="B2">B2</SelectItem>
                            <SelectItem value="B3">B3</SelectItem>
                            <SelectItem value="B4">B4</SelectItem>
                            <SelectItem value="C1">C1</SelectItem>
                            <SelectItem value="C2">C2</SelectItem>
                            <SelectItem value="C3">C3</SelectItem>
                            <SelectItem value="C4">C4</SelectItem>
                            <SelectItem value="D2">D2</SelectItem>
                            <SelectItem value="D3">D3</SelectItem>
                            <SelectItem value="D4">D4</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Characterization Card */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Characterization</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'gingival-staining', name: 'Gingival Staining' },
                        { id: 'body-staining', name: 'Body Staining' },
                        { id: 'incisal-staining', name: 'Incisal Staining' },
                        { id: 'white-spots', name: 'White Spots' },
                        { id: 'crack-lines', name: 'Crack Lines' },
                        { id: 'fluorescence-match', name: 'Fluorescence Match' },
                        { id: 'opalescence', name: 'Opalescence' },
                        { id: 'halo-effect', name: 'Halo Effect' }
                      ].map((characteristic) => (
                        <label key={characteristic.id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={characterization.includes(characteristic.id)}
                            onChange={() => handleCharacterization(characteristic.id)}
                            className="text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{characteristic.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Occlusal Staining Intensity Card */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Occlusal Staining Intensity</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">None (0)</span>
                        <span className="text-sm text-gray-600">Light (1)</span>
                        <span className="text-sm text-gray-600">Medium (2)</span>
                        <span className="text-sm text-gray-600">Heavy (3)</span>
                      </div>
                      <div className="relative">
                        <input
                          type="range"
                          min="0"
                          max="3"
                          step="1"
                          value={occlusalStainingIntensity}
                          onChange={(e) => setOcclusalStainingIntensity(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <div className="flex justify-between mt-2">
                          {[0, 1, 2, 3].map((value) => (
                            <div
                              key={value}
                              className={`w-3 h-3 rounded-full cursor-pointer ${
                                occlusalStainingIntensity === value
                                  ? 'bg-blue-600'
                                  : 'bg-gray-300'
                              }`}
                              onClick={() => setOcclusalStainingIntensity(value)}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        Current: {occlusalStainingIntensity} - {
                          occlusalStainingIntensity === 0 ? 'None' :
                          occlusalStainingIntensity === 1 ? 'Light' :
                          occlusalStainingIntensity === 2 ? 'Medium' : 'Heavy'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Surface Texture Card */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Surface Texture</h3>
                    <div className="space-y-2">
                      {[
                        { id: 'none', name: 'None' },
                        { id: 'light', name: 'Light' },
                        { id: 'moderate', name: 'Moderate' },
                        { id: 'heavy', name: 'Heavy' }
                      ].map((texture) => (
                        <label key={texture.id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="surfaceTexture"
                            value={texture.id}
                            checked={surfaceTexture === texture.id}
                            onChange={(e) => setSurfaceTexture(e.target.value)}
                            className="text-blue-600"
                          />
                          <span className="text-sm text-gray-700">{texture.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Incisal Shape Card */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Incisal Shape</h3>
                    <div className="space-y-2">
                      {[
                        { id: 'rounded', name: 'Rounded', icon: '○' },
                        { id: 'squared', name: 'Squared', icon: '□' },
                        { id: 'pointed', name: 'Pointed', icon: '△' }
                      ].map((shape) => (
                        <label key={shape.id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="incisalShape"
                            value={shape.id}
                            checked={incisalShape === shape.id}
                            onChange={(e) => setIncisalShape(e.target.value)}
                            className="text-blue-600"
                          />
                          <span className="text-2xl mr-2">{shape.icon}</span>
                          <span className="text-sm text-gray-700">{shape.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Implant Configuration</h2>
                  <p className="text-gray-600">
                    Configure implant-specific parameters and abutment specifications for optimal fit and function.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Abutment Specifications Section */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-6">Abutment Specifications</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Abutment Type</label>
                        <select
                          value={abutmentType}
                          onChange={(e) => setAbutmentType(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select abutment type</option>
                          <option value="stock">Stock Abutment</option>
                          <option value="custom">Custom Abutment</option>
                          <option value="titanium">Titanium Abutment</option>
                          <option value="zirconia">Zirconia Abutment</option>
                          <option value="hybrid">Hybrid Abutment</option>
                          <option value="angled">Angled Abutment</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gingival Height</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={gingivalHeight}
                            onChange={(e) => setGingivalHeight(e.target.value)}
                            step="0.1"
                            placeholder="0.0"
                            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="absolute right-3 top-2 text-sm text-gray-500">mm</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">above platform</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Emergence Profile</label>
                        <select
                          value={emergenceProfile}
                          onChange={(e) => setEmergenceProfile(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select profile</option>
                          <option value="straight">Straight Profile</option>
                          <option value="convex">Convex Profile</option>
                          <option value="concave">Concave Profile</option>
                          <option value="custom">Custom Profile</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Screw Access</label>
                        <select
                          value={screwAccess}
                          onChange={(e) => setScrewAccess(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select access type</option>
                          <option value="occlusal">Occlusal Access</option>
                          <option value="lingual">Lingual Access</option>
                          <option value="facial">Facial Access</option>
                          <option value="angled">Angled Access</option>
                        </select>
                      </div>
                    </div>

                    {/* Special Features */}
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-900 mb-3">Special Features</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { id: 'anti-rotation', name: 'Anti-Rotation' },
                          { id: 'tissue-level', name: 'Tissue Level' },
                          { id: 'bone-level', name: 'Bone Level' }
                        ].map((feature) => (
                          <label key={feature.id} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={specialFeatures.includes(feature.id)}
                              onChange={() => handleSpecialFeature(feature.id)}
                              className="text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{feature.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Additional Measurements Section */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Additional Measurements</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Platform Diameter</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0.0"
                            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="absolute right-3 top-2 text-sm text-gray-500">mm</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Abutment Height</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0.0"
                            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="absolute right-3 top-2 text-sm text-gray-500">mm</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Crown Height</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0.0"
                            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="absolute right-3 top-2 text-sm text-gray-500">mm</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 pt-4 border-t bg-gray-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              {hasConfiguredOptions() ? (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-sm text-gray-700">Configuration saved</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No advanced options configured</p>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ExpertModeModal
