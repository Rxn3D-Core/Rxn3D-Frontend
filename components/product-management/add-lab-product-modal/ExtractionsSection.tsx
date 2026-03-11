"use client"

import { useState, useEffect, useRef } from "react"
import { Control, UseFormWatch, UseFormSetValue } from "react-hook-form"
import { ChevronDown, ChevronUp, Info, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { ProductCreateForm } from "@/lib/schemas"
import { useExtractionsData } from "@/hooks/use-extractions"
import type { Extraction } from "@/lib/schemas"
import { ValidationError } from "@/components/ui/validation-error"

interface ExtractionsSectionProps {
  control: Control<ProductCreateForm>
  watch: UseFormWatch<ProductCreateForm>
  setValue: UseFormSetValue<ProductCreateForm>
  getValidationError: (fieldName: string) => string | undefined
  sectionHasErrors: (sectionFields: string[]) => boolean
}

export function ExtractionsSection({
  control,
  watch,
  setValue,
  getValidationError,
  sectionHasErrors,
}: ExtractionsSectionProps) {
  // Internal state for accordion functionality
  const [isEnabled, setIsEnabled] = useState(true)
  const [isExpanded, setIsExpanded] = useState(true)
  const watchedExtractions = watch("extractions") || []
  const watchedOppositeExtractions = watch("opposite_extractions" as any) || []
  const watchedApplySameStatus = watch("apply_same_status_to_opposing") ?? true

  // Fetch extractions data from API
  const { extractions, isLoading } = useExtractionsData({
    status: 'Active',
    per_page: 100, // Get all active extractions
    page: 1,
    sort_by: 'sequence',
    sort_order: 'asc'
  })

  // Convert API extractions to form format
  const [extractionStatuses, setExtractionStatuses] = useState<any[]>([])
  const [opposingExtractionStatuses, setOpposingExtractionStatuses] = useState<any[]>([])
  const isUpdatingRef = useRef(false)
  const isOpposingUpdatingRef = useRef(false)

  // Update extractionStatuses when extractions data or form data changes
  useEffect(() => {
    if (extractions.length > 0 && !isUpdatingRef.current) {
      // Always show ALL extractions from the listing API
      // Compare with product extractions and mark matching ones as active
      const convertedStatuses = extractions.map((apiExtraction: Extraction) => {
        // Find if this extraction exists in the product's extractions
        const productExtraction = watchedExtractions.find(
          (ext: any) => ext.extraction_id === apiExtraction.id
        )

        if (productExtraction) {
          // This extraction is in the product, mark it as active and use product data
          // Determine is_active based on extraction.status field
          const isActive = productExtraction.status === "Active"

          return {
            extraction_id: apiExtraction.id,
            name: apiExtraction.name, // Always use name from API
            color: apiExtraction.color, // Always use color from API
            is_default: productExtraction.is_default === "Yes",
            is_required: productExtraction.is_required === "Yes",
            is_optional: productExtraction.is_optional === "Yes",
            is_active: isActive,
            min_teeth: productExtraction.min_teeth ?? null,
            max_teeth: productExtraction.max_teeth ?? null,
          }
        } else {
          // This extraction is NOT in the product, mark it as inactive with defaults
          return {
            extraction_id: apiExtraction.id,
            name: apiExtraction.name,
            color: apiExtraction.color,
            is_default: false,
            is_required: false,
            is_optional: false,
            is_active: false, // Not in product, so inactive by default
            min_teeth: null,
            max_teeth: null,
          }
        }
      })
      
      setExtractionStatuses(convertedStatuses)
    }
  }, [extractions, watchedExtractions])

  // Auto-uncheck "apply same status to opposing" if opposite_extractions has values on initial load
  const hasInitializedOpposingRef = useRef(false)
  useEffect(() => {
    if (!hasInitializedOpposingRef.current && watchedOppositeExtractions.length > 0) {
      hasInitializedOpposingRef.current = true
      setValue("apply_same_status_to_opposing", false, { shouldDirty: false })
    }
  }, [watchedOppositeExtractions, setValue])

  // Update opposingExtractionStatuses when extractions data or form data changes
  useEffect(() => {
    if (extractions.length > 0 && !isOpposingUpdatingRef.current) {
      const convertedStatuses = extractions.map((apiExtraction: Extraction) => {
        const productExtraction = watchedOppositeExtractions.find(
          (ext: any) => ext.extraction_id === apiExtraction.id
        )

        if (productExtraction) {
          const isActive = productExtraction.status === "Active"

          return {
            extraction_id: apiExtraction.id,
            name: apiExtraction.name,
            color: apiExtraction.color,
            is_default: productExtraction.is_default === "Yes",
            is_required: productExtraction.is_required === "Yes",
            is_optional: productExtraction.is_optional === "Yes",
            is_active: isActive,
            min_teeth: productExtraction.min_teeth ?? null,
            max_teeth: productExtraction.max_teeth ?? null,
          }
        } else {
          return {
            extraction_id: apiExtraction.id,
            name: apiExtraction.name,
            color: apiExtraction.color,
            is_default: false,
            is_required: false,
            is_optional: false,
            is_active: false,
            min_teeth: null,
            max_teeth: null,
          }
        }
      })
      
      setOpposingExtractionStatuses(convertedStatuses)
    }
  }, [extractions, watchedOppositeExtractions])

  const handleStatusChange = (extractionId: number, field: string, value: any) => {
    if (isUpdatingRef.current) return // Prevent infinite loops
    
    isUpdatingRef.current = true
    const updatedStatuses = extractionStatuses.map((status) => {
      if (status.extraction_id === extractionId) {
        const updatedStatus = { ...status, [field]: value }
        
        // If unchecking required, also uncheck optional
        if (field === 'is_required' && !value) {
          updatedStatus.is_optional = false
        }
        
        // If disabling active toggle, reset min_teeth, max_teeth fields and checkboxes
        if (field === 'is_active' && !value) {
          updatedStatus.min_teeth = null
          updatedStatus.max_teeth = null
          updatedStatus.is_default = false
          updatedStatus.is_required = false
          updatedStatus.is_optional = false
        }
        
        return updatedStatus
      }
      
      // If setting an extraction as default, ensure no other extraction is default
      if (field === 'is_default' && value) {
        return { ...status, is_default: false }
      }
      
      return status
    })
    
    setExtractionStatuses(updatedStatuses)
    
    // Convert to payload format - ONLY include active extractions
    // Backend uses sync() which means only extractions in this array will be linked to the product
    const activeStatuses = updatedStatuses.filter(status => status.is_active === true)
    const payloadData = activeStatuses.map((status, index) => ({
      extraction_id: status.extraction_id,
      sequence: index + 1,
      status: "Active" as const,
      is_default: status.is_default ? "Yes" as const : "No" as const,
      is_required: status.is_required ? "Yes" as const : "No" as const,
      is_optional: status.is_optional ? "Yes" as const : "No" as const,
      min_teeth: status.min_teeth,
      max_teeth: status.max_teeth,
    }))
    
    setValue("extractions", payloadData, { shouldDirty: true })
    
    // Reset the updating flag after a short delay to allow the update to complete
    setTimeout(() => {
      isUpdatingRef.current = false
    }, 0)
  }

  const handleMinTeethChange = (extractionId: number, value: string) => {
    if (isUpdatingRef.current) return // Prevent infinite loops
    
    let numValue = value === "" ? null : parseInt(value)
    
    // Validate min_teeth: must be between 0 and 16
    if (numValue !== null) {
      if (numValue < 0) numValue = 0
      if (numValue > 16) numValue = 16
    }
    
    const status = extractionStatuses.find(s => s.extraction_id === extractionId)
    
    // If min_teeth is being set to 16, reset max_teeth to null (will need to be set to 0 or 16)
    if (numValue === 16 && status) {
      isUpdatingRef.current = true
      
      const updatedStatuses = extractionStatuses.map((s) => {
        if (s.extraction_id === extractionId) {
          return {
            ...s,
            min_teeth: numValue,
            max_teeth: null // Reset max_teeth when min_teeth is 16, user must set it to 0 or 16
          }
        }
        return s
      })
      
      setExtractionStatuses(updatedStatuses)
      
      // Convert to payload format - ONLY include active extractions
      const activeStatuses = updatedStatuses.filter(status => status.is_active === true)
      const payloadData = activeStatuses.map((status, index) => ({
        extraction_id: status.extraction_id,
        sequence: index + 1,
        status: "Active" as const,
        is_default: status.is_default ? "Yes" as const : "No" as const,
        is_required: status.is_required ? "Yes" as const : "No" as const,
        is_optional: status.is_optional ? "Yes" as const : "No" as const,
        min_teeth: status.min_teeth,
        max_teeth: status.max_teeth,
      }))
      
      setValue("extractions", payloadData, { shouldDirty: true })
      
      // Reset the updating flag after a short delay
      setTimeout(() => {
        isUpdatingRef.current = false
      }, 0)
    } else if (numValue !== null && status?.max_teeth !== null && numValue > status.max_teeth) {
      // If min_teeth is being set and max_teeth exists, ensure max_teeth >= min_teeth
      isUpdatingRef.current = true
      
      // Auto-adjust max_teeth to be at least min_teeth - batch both updates
      const updatedStatuses = extractionStatuses.map((s) => {
        if (s.extraction_id === extractionId) {
          return {
            ...s,
            min_teeth: numValue,
            max_teeth: numValue
          }
        }
        return s
      })
      
      setExtractionStatuses(updatedStatuses)
      
      // Convert to payload format - ONLY include active extractions
      const activeStatuses = updatedStatuses.filter(status => status.is_active === true)
      const payloadData = activeStatuses.map((status, index) => ({
        extraction_id: status.extraction_id,
        sequence: index + 1,
        status: "Active" as const,
        is_default: status.is_default ? "Yes" as const : "No" as const,
        is_required: status.is_required ? "Yes" as const : "No" as const,
        is_optional: status.is_optional ? "Yes" as const : "No" as const,
        min_teeth: status.min_teeth,
        max_teeth: status.max_teeth,
      }))
      
      setValue("extractions", payloadData, { shouldDirty: true })
      
      // Reset the updating flag after a short delay
      setTimeout(() => {
        isUpdatingRef.current = false
      }, 0)
    } else {
      handleStatusChange(extractionId, "min_teeth", numValue)
    }
  }

  const handleMaxTeethChange = (extractionId: number, value: string) => {
    if (isUpdatingRef.current) return // Prevent infinite loops
    
    // Allow typing any value - validation happens on blur
    let numValue: number | null = null
    if (value !== "") {
      const parsed = parseInt(value)
      numValue = isNaN(parsed) ? null : parsed
    }
    handleStatusChange(extractionId, "max_teeth", numValue)
  }

  const handleMaxTeethBlur = (extractionId: number, value: string) => {
    if (isUpdatingRef.current) return // Prevent infinite loops
    
    let numValue: number | null = null
    if (value !== "") {
      const parsed = parseInt(value)
      numValue = isNaN(parsed) ? null : parsed
    }
    
    const status = extractionStatuses.find(s => s.extraction_id === extractionId)
    
    // If min_teeth is 16, max_teeth can only be 0 or 16
    if (status?.min_teeth === 16) {
      if (numValue !== null && numValue !== 0 && numValue !== 16) {
        // Reset to null if invalid value when min_teeth is 16
        handleStatusChange(extractionId, "max_teeth", null)
        return
      }
    } else {
      // Normal validation: ensure max_teeth >= min_teeth (if min_teeth exists)
      if (numValue !== null && status?.min_teeth !== null && numValue < status.min_teeth) {
        // Auto-adjust to min_teeth if less than min
        handleStatusChange(extractionId, "max_teeth", status.min_teeth)
        return
      }
    }
    
    // Value is valid, keep it
    handleStatusChange(extractionId, "max_teeth", numValue)
  }

  const handleOpposingStatusChange = (extractionId: number, field: string, value: any) => {
    if (isOpposingUpdatingRef.current) return
    
    isOpposingUpdatingRef.current = true
    const updatedStatuses = opposingExtractionStatuses.map((status) => {
      if (status.extraction_id === extractionId) {
        const updatedStatus = { ...status, [field]: value }
        
        // If disabling active toggle, reset is_default
        if (field === 'is_active' && !value) {
          updatedStatus.is_default = false
        }
        
        return updatedStatus
      }
      
      // If setting an extraction as default, ensure no other extraction is default
      if (field === 'is_default' && value) {
        return { ...status, is_default: false }
      }
      
      return status
    })
    
    setOpposingExtractionStatuses(updatedStatuses)
    
    // Convert to payload format - ONLY include active extractions
    const activeStatuses = updatedStatuses.filter(status => status.is_active === true)
    const payloadData = activeStatuses.map((status, index) => ({
      extraction_id: status.extraction_id,
      sequence: index + 1,
      status: "Active" as const,
      is_default: status.is_default ? "Yes" as const : "No" as const,
      is_required: status.is_required ? "Yes" as const : "No" as const,
      is_optional: status.is_optional ? "Yes" as const : "No" as const,
      min_teeth: status.min_teeth,
      max_teeth: status.max_teeth,
    }))

    setValue("opposite_extractions" as any, payloadData, { shouldDirty: true })
    
    setTimeout(() => {
      isOpposingUpdatingRef.current = false
    }, 0)
  }

  const handleOpposingMinTeethChange = (extractionId: number, value: string) => {
    if (isOpposingUpdatingRef.current) return
    
    let numValue = value === "" ? null : parseInt(value)
    
    if (numValue !== null) {
      if (numValue < 0) numValue = 0
      if (numValue > 16) numValue = 16
    }
    
    const status = opposingExtractionStatuses.find(s => s.extraction_id === extractionId)
    
    if (numValue === 16 && status) {
      isOpposingUpdatingRef.current = true
      
      const updatedStatuses = opposingExtractionStatuses.map((s) => {
        if (s.extraction_id === extractionId) {
          return {
            ...s,
            min_teeth: numValue,
            max_teeth: null
          }
        }
        return s
      })
      
      setOpposingExtractionStatuses(updatedStatuses)
      
      const activeStatuses = updatedStatuses.filter(status => status.is_active === true)
      const payloadData = activeStatuses.map((status, index) => ({
        extraction_id: status.extraction_id,
        sequence: index + 1,
        status: "Active" as const,
        is_default: status.is_default ? "Yes" as const : "No" as const,
        is_required: status.is_required ? "Yes" as const : "No" as const,
        is_optional: status.is_optional ? "Yes" as const : "No" as const,
        min_teeth: status.min_teeth,
        max_teeth: status.max_teeth,
      }))
      
      setValue("opposite_extractions" as any, payloadData, { shouldDirty: true })
      
      setTimeout(() => {
        isOpposingUpdatingRef.current = false
      }, 0)
    } else if (numValue !== null && status?.max_teeth !== null && numValue > status.max_teeth) {
      isOpposingUpdatingRef.current = true
      
      const updatedStatuses = opposingExtractionStatuses.map((s) => {
        if (s.extraction_id === extractionId) {
          return {
            ...s,
            min_teeth: numValue,
            max_teeth: numValue
          }
        }
        return s
      })
      
      setOpposingExtractionStatuses(updatedStatuses)
      
      const activeStatuses = updatedStatuses.filter(status => status.is_active === true)
      const payloadData = activeStatuses.map((status, index) => ({
        extraction_id: status.extraction_id,
        sequence: index + 1,
        status: "Active" as const,
        is_default: status.is_default ? "Yes" as const : "No" as const,
        is_required: status.is_required ? "Yes" as const : "No" as const,
        is_optional: status.is_optional ? "Yes" as const : "No" as const,
        min_teeth: status.min_teeth,
        max_teeth: status.max_teeth,
      }))
      
      setValue("opposite_extractions" as any, payloadData, { shouldDirty: true })
      
      setTimeout(() => {
        isOpposingUpdatingRef.current = false
      }, 0)
    } else {
      handleOpposingStatusChange(extractionId, "min_teeth", numValue)
    }
  }

  const handleOpposingMaxTeethChange = (extractionId: number, value: string) => {
    if (isOpposingUpdatingRef.current) return
    
    let numValue: number | null = null
    if (value !== "") {
      const parsed = parseInt(value)
      numValue = isNaN(parsed) ? null : parsed
    }
    handleOpposingStatusChange(extractionId, "max_teeth", numValue)
  }

  const handleOpposingMaxTeethBlur = (extractionId: number, value: string) => {
    if (isOpposingUpdatingRef.current) return
    
    let numValue: number | null = null
    if (value !== "") {
      const parsed = parseInt(value)
      numValue = isNaN(parsed) ? null : parsed
    }
    
    const status = opposingExtractionStatuses.find(s => s.extraction_id === extractionId)
    
    if (status?.min_teeth === 16) {
      if (numValue !== null && numValue !== 0 && numValue !== 16) {
        handleOpposingStatusChange(extractionId, "max_teeth", null)
        return
      }
    } else {
      if (numValue !== null && status?.min_teeth !== null && numValue < status.min_teeth) {
        handleOpposingStatusChange(extractionId, "max_teeth", status.min_teeth)
        return
      }
    }
    
    handleOpposingStatusChange(extractionId, "max_teeth", numValue)
  }

  const handleApplySameStatusChange = (checked: boolean) => {
    setValue("apply_same_status_to_opposing", checked, { shouldDirty: true })

    if (!checked) {
      // When unchecking, populate opposing extractions from the saved opposite_extractions data
      const currentOppositeExtractions = watchedOppositeExtractions
      if (extractions.length > 0) {
        const convertedStatuses = extractions.map((apiExtraction: Extraction) => {
          const productExtraction = currentOppositeExtractions.find(
            (ext: any) => ext.extraction_id === apiExtraction.id
          )

          if (productExtraction) {
            const isActive = productExtraction.status === "Active"
            return {
              extraction_id: apiExtraction.id,
              name: apiExtraction.name,
              color: apiExtraction.color,
              is_default: productExtraction.is_default === "Yes",
              is_required: productExtraction.is_required === "Yes",
              is_optional: productExtraction.is_optional === "Yes",
              is_active: isActive,
              min_teeth: productExtraction.min_teeth ?? null,
              max_teeth: productExtraction.max_teeth ?? null,
            }
          } else {
            return {
              extraction_id: apiExtraction.id,
              name: apiExtraction.name,
              color: apiExtraction.color,
              is_default: false,
              is_required: false,
              is_optional: false,
              is_active: false,
              min_teeth: null,
              max_teeth: null,
            }
          }
        })
        setOpposingExtractionStatuses(convertedStatuses)
      }
    }
  }

  const hasErrors = sectionHasErrors(["extractions"])

  // Count active extractions - count ones where is_active is true
  const activeExtractionsCount = extractionStatuses.filter(
    (status) => status.is_active === true
  ).length

  // Count active opposing extractions
  const activeOpposingExtractionsCount = opposingExtractionStatuses.filter(
    (status) => status.is_active === true
  ).length

  return (
    <div className="border-t">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">Main Product Fields</span>
            {hasErrors ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <Info className="h-4 w-4 text-gray-400" />
            )}
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-[#1162a8] ${activeExtractionsCount === 0 ? "opacity-80" : ""}`}
              style={{ marginRight: "1rem" }}
            >
              <strong>{activeExtractionsCount} selected</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
              className="data-[state=checked]:bg-blue-600"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {isEnabled && isExpanded && (
          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-4">
              <p>All available extraction statuses will be visible. User can toggle them on if they want it configured, off if not.</p>
              <p>Once user choose between Default, required and optional, checkboxes will be disabled.</p>
            </div>

            {isLoading ? (
              <div className="text-center py-4">Loading extractions...</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Checkbox
                    id="apply-same-status"
                    checked={watchedApplySameStatus}
                    onCheckedChange={handleApplySameStatusChange}
                  />
                  <Label htmlFor="apply-same-status" className="text-sm">
                    Apply same status to opposing
                  </Label>
                </div>

                <div className={`${!watchedApplySameStatus ? 'flex gap-4 items-start' : ''}`}>
                  {/* Main Extractions Table */}
                  <div className={`overflow-x-auto flex flex-col h-full ${!watchedApplySameStatus ? 'flex-1 border-r border-gray-300 pr-4' : ''}`}>
                    <div className="mb-2">
                      <h3 className="font-medium text-gray-900">Main Product Fields</h3>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-[#1162a8] ${activeExtractionsCount === 0 ? "opacity-80" : ""}`}
                      >
                        <strong>{activeExtractionsCount} selected</strong>
                      </span>
                    </div>
                    <table className="border-collapse table-auto">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium text-gray-700 whitespace-nowrap">Extraction Status</th>
                          <th className="text-center py-2 px-3 font-medium text-gray-700">Default</th>
                          <th className="text-center py-2 px-3 font-medium text-gray-700">Required</th>
                          <th className="text-center py-2 px-3 font-medium text-gray-700">Optional</th>
                          <th className="text-center py-2 px-3 font-medium text-gray-700 w-32">Min Teeth</th>
                          <th className="text-center py-2 px-3 font-medium text-gray-700 w-32">Max Teeth</th>
                          <th className="text-center py-2 px-3 font-medium text-gray-700">Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extractionStatuses.map((status) => (
                          <tr key={status.extraction_id} className="border-b">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded flex-shrink-0"
                                  style={{ backgroundColor: status.color }}
                                />
                                <span className="text-sm font-medium whitespace-nowrap">{status.name}</span>
                              </div>
                            </td>
                            <td className="text-center py-3 px-3">
                              <Checkbox
                                checked={status.is_default}
                                onCheckedChange={(checked) =>
                                  handleStatusChange(status.extraction_id, "is_default", checked)
                                }
                                disabled={!status.is_active}
                              />
                            </td>
                            <td className="text-center py-3 px-3">
                              <Checkbox
                                checked={status.is_required}
                                onCheckedChange={(checked) =>
                                  handleStatusChange(status.extraction_id, "is_required", checked)
                                }
                                disabled={!status.is_active}
                              />
                            </td>
                            <td className="text-center py-3 px-3">
                              <Checkbox
                                checked={status.is_optional}
                                onCheckedChange={(checked) =>
                                  handleStatusChange(status.extraction_id, "is_optional", checked)
                                }
                                disabled={!status.is_active}
                              />
                            </td>
                            <td className="text-center py-3 px-3 w-32">
                              <div className="flex justify-center">
                                <Input
                                  type="number"
                                  min="0"
                                  max="16"
                                  value={status.min_teeth !== null ? status.min_teeth : ""}
                                  onChange={(e) => handleMinTeethChange(status.extraction_id, e.target.value)}
                                  className="w-20 h-8 text-center"
                                  placeholder="Min"
                                  disabled={!status.is_active}
                                />
                              </div>
                            </td>
                            <td className="text-center py-3 px-3 w-32">
                              <div className="flex justify-center">
                                <Input
                                  type="number"
                                  min={status.min_teeth === 16 ? undefined : "0"}
                                  max={status.min_teeth === 16 ? undefined : "16"}
                                  value={status.max_teeth !== null ? status.max_teeth : ""}
                                  onChange={(e) => handleMaxTeethChange(status.extraction_id, e.target.value)}
                                  onBlur={(e) => handleMaxTeethBlur(status.extraction_id, e.target.value)}
                                  className="w-20 h-8 text-center"
                                  placeholder={status.min_teeth === 16 ? "0 or 16" : "Max"}
                                  disabled={!status.is_active}
                                />
                              </div>
                            </td>
                            <td className="text-center py-3 px-3">
                              <Switch
                                checked={status.is_active}
                                onCheckedChange={(checked) =>
                                  handleStatusChange(status.extraction_id, "is_active", checked)
                                }
                                className="data-[state=checked]:bg-blue-600"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Opposing Extractions Table - Only show when checkbox is unchecked */}
                  {!watchedApplySameStatus && (
                    <div className="overflow-x-auto flex flex-col h-full pl-4">
                      <div className="mb-2">
                        <h3 className="font-medium text-gray-900">Opposing</h3>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-[#1162a8] ${activeOpposingExtractionsCount === 0 ? "opacity-80" : ""}`}
                        >
                          <strong>{activeOpposingExtractionsCount} selected</strong>
                        </span>
                      </div>
                      <table className="border-collapse table-auto">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2 font-medium text-gray-700 whitespace-nowrap">Extraction Status</th>
                            <th className="text-center py-2 px-2 font-medium text-gray-700 w-20">Default</th>
                            <th className="text-center py-2 px-2 font-medium text-gray-700 w-20">Active</th>
                          </tr>
                        </thead>
                        <tbody>
                          {opposingExtractionStatuses.map((status) => (
                            <tr key={status.extraction_id} className="border-b">
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-4 h-4 rounded flex-shrink-0"
                                    style={{ backgroundColor: status.color }}
                                  />
                                  <span className="text-sm font-medium whitespace-nowrap">{status.name}</span>
                                </div>
                              </td>
                              <td className="text-center py-3 px-2 w-20">
                                <Checkbox
                                  checked={status.is_default}
                                  onCheckedChange={(checked) =>
                                    handleOpposingStatusChange(status.extraction_id, "is_default", checked)
                                  }
                                  disabled={!status.is_active}
                                />
                              </td>
                              <td className="text-center py-3 px-2 w-20">
                                <Switch
                                  checked={status.is_active}
                                  onCheckedChange={(checked) =>
                                    handleOpposingStatusChange(status.extraction_id, "is_active", checked)
                                  }
                                  className="data-[state=checked]:bg-blue-600"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Display validation errors for extractions */}
                <ValidationError message={getValidationError("extractions")} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
