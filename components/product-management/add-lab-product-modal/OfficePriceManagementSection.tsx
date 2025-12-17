import React, { useState, useEffect } from "react"
import { ChevronDown, Info, AlertCircle, Search, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ValidationError } from "@/components/ui/validation-error"
import { Controller } from "react-hook-form"

interface OfficePriceManagementSectionProps {
  control: any
  watch: any
  setValue: any
  sections: any
  toggleSection: (section: string) => void
  getValidationError: (field: string) => string | undefined
  sectionHasErrors: (fields: string[]) => boolean
  expandedSections: Record<string, boolean>
  toggleExpanded: (section: string) => void
  offices: any[]
  stages: any
  grades?: any[]
  customGradeNames?: Record<number, string>
}

export function OfficePriceManagementSection({
  control,
  watch,
  setValue,
  getValidationError,
  sectionHasErrors,
  expandedSections,
  toggleExpanded,
  offices,
  stages,
  grades,
  customGradeNames = {},
}: OfficePriceManagementSectionProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedOffices, setExpandedOffices] = useState<Record<number, boolean>>({})
  // Track which stages are selected per office: { officeId: [stageId1, stageId2, ...] }
  const [selectedStagesPerOffice, setSelectedStagesPerOffice] = useState<Record<number, (string | number)[]>>({})
  
  // Get watched values - only show selected stages from form
  const selectedStages = watch("stages") || []
  const samePriceForAllOffice = watch("same_price_for_all_office") || "No"
  const officeStageGradePricing = watch("office_stage_grade_pricing") || []
  
  // Handle nested stage data structure
  const allStages = stages?.data?.data || stages?.data || stages || []

  // Get only the stages that are selected in the stages section, sorted by sequence
  const selectedStageDetails = allStages
    .filter((stage: any) =>
      selectedStages.some((s: any) => s.stage_id === stage.id)
    )
    .map((stage: any) => {
      // Find the corresponding stage from selectedStages to get sequence
      const stageData = selectedStages.find((s: any) => s.stage_id === stage.id)
      return {
        ...stage,
        sequence: stageData?.sequence ?? 0
      }
    })
    .sort((a: any, b: any) => {
      // Sort by sequence, ensuring proper numeric comparison
      const seqA = a.sequence ?? 0
      const seqB = b.sequence ?? 0
      return seqA - seqB
    })

  // Initialize selected stages per office - default to all stages selected
  useEffect(() => {
    if (selectedStageDetails.length > 0 && offices.length > 0) {
      setSelectedStagesPerOffice(prev => {
        const initial: Record<number, (string | number)[]> = { ...prev }
        let hasChanges = false
        
        offices.forEach(office => {
          // If office doesn't have selections yet, initialize with all stages
          if (!initial[office.id] || initial[office.id].length === 0) {
            initial[office.id] = selectedStageDetails.map((s: any) => s.id)
            hasChanges = true
          }
        })
        
        return hasChanges ? initial : prev
      })
    }
  }, [selectedStageDetails.length, offices.length])

  // Helper: check if a stage is selected for an office
  const isStageSelectedForOffice = (officeId: number, stageId: string | number) => {
    const selected = selectedStagesPerOffice[officeId] || []
    return selected.some(id => id.toString() === stageId.toString())
  }

  // Helper: toggle stage selection for an office
  const toggleStageForOffice = (officeId: number, stageId: string | number) => {
    setSelectedStagesPerOffice(prev => {
      const current = prev[officeId] || []
      const isSelected = current.some(id => id.toString() === stageId.toString())
      
      if (isSelected) {
        // Remove stage
        return {
          ...prev,
          [officeId]: current.filter(id => id.toString() !== stageId.toString())
        }
      } else {
        // Add stage
        return {
          ...prev,
          [officeId]: [...current, stageId]
        }
      }
    })
  }

  // Helper: get selected stages for an office (filtered list)
  const getSelectedStagesForOffice = (officeId: number) => {
    const selectedIds = selectedStagesPerOffice[officeId] || selectedStageDetails.map((s: any) => s.id)
    return selectedStageDetails.filter((stage: any) =>
      selectedIds.some(id => id.toString() === stage.id.toString())
    )
  }

  // Grade-based pricing logic (similar to StagesSection)
  const watchedGrades = watch("grades") || []
  const hasSelectedGrades = watchedGrades.length > 0
  const hasGradeBasedPricing = watch("has_grade_based_pricing") === "Yes"

  // Use grades prop if available, otherwise fallback to stages.grades or stages.data.grades
  const masterGrades =
    (grades && Array.isArray(grades) ? grades :
    stages.grades && Array.isArray(stages.grades) ? stages.grades :
    stages.data?.grades && Array.isArray(stages.data.grades) ? stages.data.grades :
    []) as any[]

  // Merge watchedGrades with master grades to get name, including custom grades
  const selectedGradesWithNames = watchedGrades.map((g: any) => {
    const gradeId = g.grade_id || g.id
    
    // Check if it's a custom grade (negative ID) and has a name in customGradeNames
    if (typeof gradeId === "number" && gradeId < 0 && customGradeNames[gradeId]) {
      return {
        ...g,
        name: customGradeNames[gradeId],
        grade_id: gradeId,
        id: gradeId,
      }
    }
    
    // Otherwise, try to find in master grades
    const found = masterGrades.find((mg: any) =>
      mg.id === gradeId || mg.grade_id === gradeId || mg.id === g.id
    )
    
    return {
      ...g,
      name: found?.name || g.name || g.label || g.grade_name || (typeof gradeId === "number" && gradeId < 0 ? customGradeNames[gradeId] : undefined) || gradeId || g.id,
      grade_id: gradeId,
      id: gradeId,
    }
  })

  // Filter offices based on search
  const filteredOffices = offices.filter(office =>
    office.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Helper: get price for office, stage, and optionally grade
  // Pre-fills with grade price, then stage default price if no price is set (similar to StagesSection)
  const getOfficeStagePrice = (officeId: number, stageId: number, gradeId?: string | number) => {
    let existingPrice: string | number | undefined = ""
    
    // First, check if there's an existing price in officeStageGradePricing
    if (hasGradeBasedPricing && hasSelectedGrades && gradeId !== undefined) {
      // For grade-based pricing, find by office_id, stage_id, and grade_id
      const pricing = officeStageGradePricing.find(
        (p: any) => p.office_id === officeId && p.stage_id === stageId && (p.grade_id?.toString() === gradeId.toString() || p.grade_id === gradeId)
      )
      existingPrice = pricing?.price
    } else {
      // For non-grade-based pricing, find by office_id and stage_id
      const pricing = officeStageGradePricing.find(
        (p: any) => p.office_id === officeId && p.stage_id === stageId && !p.grade_id
      )
      existingPrice = pricing?.price
    }
    
    // If price exists, return it
    if (existingPrice !== undefined && existingPrice !== null && existingPrice !== "") {
      return String(existingPrice)
    }
    
    // For grade-based pricing, fallback to grade price from GradesSection (like StagesSection does)
    if (hasGradeBasedPricing && hasSelectedGrades && gradeId !== undefined) {
      // Normalize gradeId for comparison (handle both string and number)
      const normalizedGradeId = typeof gradeId === "string" ? gradeId : gradeId.toString()
      
      // Find the grade in watchedGrades and get its price
      const watchedGrade = watchedGrades.find((g: any) => {
        const gId = g.grade_id || g.id
        return gId === gradeId || 
               gId?.toString() === normalizedGradeId || 
               g.grade_id?.toString() === normalizedGradeId ||
               g.id?.toString() === normalizedGradeId
      })
      
      if (watchedGrade?.price !== undefined && watchedGrade.price !== null && watchedGrade.price !== "") {
        return String(watchedGrade.price)
      }
    }
    
    // Otherwise, try to get default price from stage data (similar to StagesSection)
    const stageInfo = allStages.find((s: any) => {
      const sId = s.id?.toString()
      const stId = stageId?.toString()
      return sId === stId
    })
    
    if (stageInfo) {
      // Check lab_stage.price first (lab-specific pricing)
      if (stageInfo.lab_stage?.price !== undefined && stageInfo.lab_stage.price !== null && stageInfo.lab_stage.price !== "" && stageInfo.lab_stage.price !== "0") {
        return String(stageInfo.lab_stage.price)
      }
      // Fallback to stage.price (master stage pricing)
      if (stageInfo.price !== undefined && stageInfo.price !== null && stageInfo.price !== "" && stageInfo.price !== 0 && stageInfo.price !== "0") {
        return String(stageInfo.price)
      }
    }
    
    // Return empty string if no default price found
    return ""
  }

  // Helper: update price for office, stage, and optionally grade
  const setOfficeStagePrice = (officeId: number, stageId: number, price: string, gradeId?: string | number) => {
    let updated = [...officeStageGradePricing]
    
    if (hasGradeBasedPricing && hasSelectedGrades && gradeId !== undefined) {
      // For grade-based pricing, find by office_id, stage_id, and grade_id
      const idx = updated.findIndex(
        (p: any) => p.office_id === officeId && p.stage_id === stageId && (p.grade_id?.toString() === gradeId.toString() || p.grade_id === gradeId)
      )
      if (idx > -1) {
        if (price) {
          updated[idx] = { ...updated[idx], price: parseFloat(price) || 0 }
        } else {
          updated.splice(idx, 1)
        }
      } else if (price) {
        updated.push({ 
          office_id: officeId, 
          stage_id: stageId, 
          grade_id: gradeId,
          price: parseFloat(price) || 0, 
          status: "Active" 
        })
      }
    } else {
      // For non-grade-based pricing, find by office_id and stage_id (no grade_id)
      const idx = updated.findIndex(
        (p: any) => p.office_id === officeId && p.stage_id === stageId && !p.grade_id
      )
      if (idx > -1) {
        if (price) {
          updated[idx] = { ...updated[idx], price: parseFloat(price) || 0 }
        } else {
          updated.splice(idx, 1)
        }
      } else if (price) {
        updated.push({ 
          office_id: officeId, 
          stage_id: stageId, 
          price: parseFloat(price) || 0, 
          status: "Active" 
        })
      }
    }
    setValue("office_stage_grade_pricing", updated, { shouldDirty: true })
  }

  // Helper: remove all pricing for a specific office and stage (and optionally grade)
  const removeStageFromOffice = (officeId: number, stageId: number, gradeId?: string | number) => {
    let updated
    if (hasGradeBasedPricing && hasSelectedGrades && gradeId !== undefined) {
      // Remove specific grade pricing
      updated = officeStageGradePricing.filter(
        (p: any) => !(p.office_id === officeId && p.stage_id === stageId && (p.grade_id?.toString() === gradeId.toString() || p.grade_id === gradeId))
      )
    } else {
      // Remove all pricing for this office and stage
      updated = officeStageGradePricing.filter(
        (p: any) => !(p.office_id === officeId && p.stage_id === stageId && !p.grade_id)
      )
    }
    setValue("office_stage_grade_pricing", updated, { shouldDirty: true })
  }

  // Toggle office expansion
  const toggleOfficeExpanded = (officeId: number) => {
    setExpandedOffices(prev => ({
      ...prev,
      [officeId]: !prev[officeId]
    }))
  }

  // Count offices with pricing
  const officesWithPricing = offices.filter(office =>
    officeStageGradePricing.some((p: any) => p.office_id === office.id && p.price)
  )

  return (
    <div className="border-t">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">Office Price Management</span>
          {sectionHasErrors(["office_pricing", "office_stage_grade_pricing"]) ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Info className="h-4 w-4 text-gray-400" />
          )}
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-[#1162a8]">
            <strong>{officesWithPricing.length} offices</strong>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-200 cursor-pointer ${expandedSections.officePriceManagement ? "rotate-180" : ""}`}
            onClick={() => toggleExpanded("officePriceManagement")}
          />
        </div>
      </div>
      {expandedSections.officePriceManagement && (
        <div className="px-6 pb-6">
          {/* Same price for all office radio buttons */}
          <div className="mb-6">
            <span className="font-medium text-sm mr-4">Same price for all office</span>
            <Controller
              name="same_price_for_all_office"
              control={control}
              defaultValue="No"
              render={({ field }) => (
                <div className="inline-flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="Yes"
                      checked={field.value === "Yes"}
                      onChange={() => field.onChange("Yes")}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="No"
                      checked={field.value === "No"}
                      onChange={() => field.onChange("No")}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              )}
            />
          </div>

          {/* Search office */}
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search office to change price"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Show All Offices button */}
          <div className="mb-4 text-right">
            <Button
              type="button"
              variant="link"
              size="sm"
              className="text-blue-600 hover:text-blue-800 p-0 text-sm"
              onClick={() => setSearchTerm("")}
            >
              Show All Offices
            </Button>
          </div>

          {/* Office list */}
          <div className="space-y-3">
            {filteredOffices.map((office) => (
              <div key={office.id} className="border rounded-lg overflow-hidden">
                {/* Office header */}
                <div
                  className="flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => toggleOfficeExpanded(office.id)}
                >
                  <div className="flex items-center gap-3">
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${expandedOffices[office.id] ? "rotate-180" : ""}`}
                    />
                    <span className="font-medium text-gray-900">{office.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                      {getSelectedStagesForOffice(office.id).length} selected
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                      {officeStageGradePricing.filter((p: any) => p.office_id === office.id && p.price).length} items
                    </span>
                  </div>
                </div>

                {/* Office pricing table */}
                {expandedOffices[office.id] && (
                  <div className="p-4 bg-white">
                    {selectedStageDetails.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No stages selected. Please select stages first in the Stages section.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200 rounded-lg">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-3 border-b border-gray-200 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                                <Checkbox
                                  className="border-[#1162a8] text-[#1162a8] data-[state=checked]:bg-[#1162a8] data-[state=checked]:text-white"
                                  checked={
                                    getSelectedStagesForOffice(office.id).length === selectedStageDetails.length &&
                                    selectedStageDetails.length > 0
                                  }
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      // Select all stages
                                      setSelectedStagesPerOffice(prev => ({
                                        ...prev,
                                        [office.id]: selectedStageDetails.map((s: any) => s.id)
                                      }))
                                    } else {
                                      // Deselect all stages
                                      setSelectedStagesPerOffice(prev => ({
                                        ...prev,
                                        [office.id]: []
                                      }))
                                    }
                                  }}
                                />
                              </th>
                              <th className="px-3 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Case Stage
                              </th>
                              <th className="px-3 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Code
                              </th>
                              {hasGradeBasedPricing && hasSelectedGrades ? (
                                selectedGradesWithNames.map((grade: any, idx: number) => (
                                  <th
                                    key={grade.grade_id || grade.id || idx}
                                    className="px-3 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                  >
                                    {grade.name}
                                  </th>
                                ))
                              ) : (
                                <th className="px-3 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Price
                                </th>
                              )}
                              <th className="px-3 py-3 border-b border-gray-200 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {selectedStageDetails.map((stage: any) => {
                              const isSelected = isStageSelectedForOffice(office.id, stage.id)
                              return (
                              <tr 
                                key={stage.id} 
                                className={`hover:bg-gray-50 ${!isSelected ? 'opacity-60' : ''}`}
                              >
                                <td className="px-3 py-3 whitespace-nowrap text-center">
                                  <Checkbox
                                    className="border-[#1162a8] text-[#1162a8] data-[state=checked]:bg-[#1162a8] data-[state=checked]:text-white"
                                    checked={isSelected}
                                    onCheckedChange={() => toggleStageForOffice(office.id, stage.id)}
                                  />
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {stage.name}
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {stage.code || "N/A"}
                                </td>
                                {hasGradeBasedPricing && hasSelectedGrades ? (
                                  selectedGradesWithNames.map((grade: any, gradeIdx: number) => (
                                    <td key={grade.grade_id || grade.id || gradeIdx} className="px-3 py-3 whitespace-nowrap">
                                      <div className="relative">
                                        <Input
                                          type="number"
                                          min={0}
                                          step={0.01}
                                          className={`pl-7 h-8 w-24 text-sm ${!isSelected ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                          value={getOfficeStagePrice(office.id, stage.id, grade.grade_id || grade.id)}
                                          placeholder="0"
                                          disabled={!isSelected}
                                          onChange={(e) =>
                                            setOfficeStagePrice(office.id, stage.id, e.target.value, grade.grade_id || grade.id)
                                          }
                                        />
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                      </div>
                                    </td>
                                  ))
                                ) : (
                                  <td className="px-3 py-3 whitespace-nowrap">
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        className={`pl-7 h-8 w-24 text-sm ${!isSelected ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                        value={getOfficeStagePrice(office.id, stage.id)}
                                        placeholder="0"
                                        disabled={!isSelected}
                                        onChange={(e) =>
                                          setOfficeStagePrice(office.id, stage.id, e.target.value)
                                        }
                                      />
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                    </div>
                                  </td>
                                )}
                                <td className="px-3 py-3 whitespace-nowrap text-center">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                                    onClick={() => removeStageFromOffice(office.id, stage.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </td>
                              </tr>
                            )})}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredOffices.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No offices found matching your search.</p>
            </div>
          )}

          <ValidationError message={getValidationError("office_pricing")} />
        </div>
      )}
    </div>
  )
}
