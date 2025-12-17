"use client"

import React from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Star } from "lucide-react"

interface Step1LabSelectionProps {
  // Lab/Office selection props
  isLabAdmin: boolean
  isOfficeAdmin: boolean
  selectionData: any[]
  searchTerm: string
  setSearchTerm: (term: string) => void
  sortBy: string
  setSortBy: (sort: string) => void
  selectedLab: string
  defaultLabId: string | null
  labsLoading: boolean
  filteredSelection: any[]
  sortedSelectionWithDefault: any[]
  
  // Handlers
  handleLabSelect: (labId: string) => void
  setShowAddNewLabModal: (show: boolean) => void
  setPendingDefaultLab: (lab: { id: string, name: string } | null) => void
  setShowDefaultLabModal: (show: boolean) => void
}

export const Step1LabSelection: React.FC<Step1LabSelectionProps> = ({
  isLabAdmin,
  isOfficeAdmin,
  selectionData,
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  selectedLab,
  defaultLabId,
  labsLoading,
  filteredSelection,
  sortedSelectionWithDefault,
  handleLabSelect,
  setShowAddNewLabModal,
  setPendingDefaultLab,
  setShowDefaultLabModal,
}) => {
  const chooseLabel = isLabAdmin ? "Choose a Office" : "Choose a Lab"
  const addLabel = isLabAdmin ? "Add New Office" : "Add New Lab"

  return (
    <div className="px-4 sm:px-6 lg:px-8 bg-white flex-1 flex flex-col py-4">
      <div className="space-y-4 flex-1 flex flex-col">
        {/* Lab/Office Selection */}
        <div className="flex-1 flex flex-col">
          <div className="mb-6">
            {/* Header with title */}
            <div className="flex items-center justify-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {chooseLabel}
              </h3>
            </div>

            {/* Search Section */}
            <div className="flex items-center gap-4 mb-2">
              {/* Search bar in the middle - takes up most of the space */}
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={isLabAdmin ? "Search Office" : "Search Dental Lab"}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 py-2 bg-white border border-gray-300 rounded-lg w-full"
                />
              </div>

              {/* Add Lab button on the right */}
              <Button 
                className="bg-[#1162a8] hover:bg-[#0f5490] text-white rounded-lg px-4 py-2 whitespace-nowrap"
                onClick={() => setShowAddNewLabModal(true)}
              >
                + {addLabel}
              </Button>
            </div>

            {/* Sort By and Lab count row */}
            <div className="flex items-center justify-between mb-4">
              {/* Sort By on the left */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort By:</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-36 bg-white border border-gray-300 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-az">Name A-Z</SelectItem>
                    <SelectItem value="name-za">Name Z-A</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Lab count on the right */}
              <p className="text-sm text-gray-500">{filteredSelection.length} {isLabAdmin ? "offices" : "labs"} found</p>
            </div>
          </div>

          {labsLoading ? (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 p-1 content-start">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white h-44 sm:h-48 flex flex-col items-center justify-center shadow-sm">
                    <div className="w-20 h-20 bg-gray-200 rounded-lg mb-4" />
                    <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
                    <div className="h-3 w-1/2 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 p-1 content-start">
                {sortedSelectionWithDefault.map((item) => {
                  const entity = isLabAdmin ? item.office : item.lab
                  const logoSrc =
                    entity.logo_url && entity.logo_url !== "/placeholder.svg"
                      ? entity.logo_url
                      : isLabAdmin
                        ? "/images/office-default.png"
                        : "/images/office-default.png"
                  return (
                    <div key={entity?.id || 'unknown'} className="relative group">
                      <Card 
                        className={`transition-all duration-300 hover:shadow-lg rounded-lg border h-full cursor-pointer transform hover:scale-[1.02] group-hover:border-blue-400 group-hover:ring-2 group-hover:ring-blue-100 ${selectedLab === String(entity?.id)
                          ? 'border-blue-500 shadow-lg ring-2 ring-blue-200 scale-[1.02] bg-white'
                          : 'border-gray-200 hover:border-blue-400 bg-white hover:bg-blue-50/30'
                          }`}
                        onClick={() => handleLabSelect(String(entity?.id))}
                      >
                        <CardContent className="p-3 sm:p-4 text-center flex flex-col items-center h-50 sm:h-50">
                          <div className="mb-4">
                            <img
                              src={logoSrc}
                              alt={entity?.name || 'Lab/Office Logo'}
                              className="mx-auto rounded-lg transition-all duration-300 w-20 h-20 object-contain"
                            />
                          </div>
                          <h4 className="font-semibold text-base mb-2 line-clamp-2 text-gray-900">{entity?.name || 'Unknown Name'}</h4>
                          <p className="text-sm text-gray-600">{entity?.city || 'Unknown City'}, {entity?.state || 'Unknown State'}</p>

                          <div className="mt-auto w-full">
                            {/* Set Default Button Only */}
                            <div className="flex justify-center">
                              <button
                                className={`text-xs font-medium py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg transition-all duration-200 border ${defaultLabId === String(entity?.id)
                                  ? 'bg-green-200 text-green-800 border-green-300 hover:bg-green-300'
                                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border-gray-300 hover:border-gray-400'
                                  }`}
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent card selection
                                  // Show default modal
                                  const item = selectionData.find((l: any) =>
                                    String(isLabAdmin ? l.office?.id : l.lab?.id) === String(entity?.id)
                                  )
                                  let entityName = "Unknown";
                                  if (item) {
                                    if (isLabAdmin && item.office) {
                                      entityName = item.office.name;
                                    } else if (!isLabAdmin && item.lab) {
                                      entityName = item.lab.name;
                                    }
                                  }
                                  setPendingDefaultLab({ id: String(entity?.id), name: entityName })
                                  setShowDefaultLabModal(true)
                                }}
                              >
                                {defaultLabId === String(entity?.id) ? 'Default' : 'Set Default'}
                              </button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Default indicator */}
                      {defaultLabId === String(entity?.id) && (
                        <div className="absolute top-2 right-2 z-10">
                          <div className="bg-green-500 rounded-full p-1 shadow-md">
                            <Star className="w-4 h-4 text-white fill-white" />
                          </div>
                        </div>
                      )}
                      
                      {/* Selection indicator */}
                      {selectedLab === String(entity?.id) && (
                        <div className="absolute top-2 left-2 z-10">
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Step1LabSelection
