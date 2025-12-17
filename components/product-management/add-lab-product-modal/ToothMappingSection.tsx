import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ChevronDown, Info, AlertCircle } from "lucide-react"
import { ValidationError } from "@/components/ui/validation-error"
import { useState, useEffect } from "react"
import { useExtractionsData } from "@/hooks/use-extractions"
import type { Extraction } from "@/lib/schemas"

interface ToothStatus {
  status_id: string
  name: string
  color: string
  is_default: boolean
  is_required: boolean
  is_optional: boolean
  is_active: boolean
  min_teeth?: number | null
  max_teeth?: number | null
}

interface ToothMappingSectionProps {
  control: any
  watch: (field: string) => any
  setValue: (field: string, value: any, options?: { shouldDirty?: boolean; shouldValidate?: boolean }) => void
  sections: { toothMapping: boolean }
  toggleSection: (section: string) => void
  getValidationError: (field: string) => string | undefined
  sectionHasErrors: (fields: string[]) => boolean
  expandedSections: { toothMapping: boolean }
  toggleExpanded: (section: string) => void
}

export function ToothMappingSection({
  control,
  watch,
  setValue,
  sections,
  toggleSection,
  getValidationError,
  sectionHasErrors,
  expandedSections,
  toggleExpanded,
}: ToothMappingSectionProps) {
  const watchedToothMapping = watch("tooth_mapping") || []
  const watchedApplySameStatus = watch("apply_same_status_to_opposing") ?? true

  // Fetch extractions data from API
  const { extractions, isLoading } = useExtractionsData({
    status: 'Active',
    per_page: 10, // Get all active extractions
    page: 1,
    sort_by: 'sequence',
    sort_order: 'asc'
  })

  // Convert API extractions to ToothStatus format
  const [toothStatuses, setToothStatuses] = useState<ToothStatus[]>([])

  // Update toothStatuses when extractions data changes
  useEffect(() => {
    if (extractions.length > 0) {
      const convertedStatuses = extractions.map((extraction: Extraction) => ({
        status_id: extraction.code.toLowerCase().replace(/\s+/g, '_'),
        name: extraction.name,
        color: extraction.color,
        is_default: false,
        is_required: false,
        is_optional: false,
        is_active: extraction.status === 'Active',
        min_teeth: null,
        max_teeth: null,
      }))
      
      // If we have existing form data, merge it with API data
      if (watchedToothMapping.length > 0) {
        setToothStatuses(watchedToothMapping)
      } else {
        setToothStatuses(convertedStatuses)
      }
    }
  }, [extractions, watchedToothMapping])

  // Sync with form data
  useEffect(() => {
    if (watchedToothMapping.length > 0) {
      setToothStatuses(watchedToothMapping)
    }
  }, [watchedToothMapping])

  const handleStatusChange = (statusId: string, field: keyof ToothStatus, value: boolean) => {
    const updatedStatuses = toothStatuses.map(status => {
      if (status.status_id === statusId) {
        const updatedStatus = { ...status, [field]: value }
        
        // If setting default to true, disable required and optional for this status
        // But allow required and optional to be checked together
        if (field === 'is_default' && value) {
          updatedStatus.is_required = false
          updatedStatus.is_optional = false
        } else if (field === 'is_required' && !value) {
          // If unchecking required, also uncheck optional
          updatedStatus.is_optional = false
        } else if (field === 'is_required' && value) {
          updatedStatus.is_default = false
        } else if (field === 'is_optional' && value) {
          updatedStatus.is_default = false
        }
        
        return updatedStatus
      }
      
      // If setting a status as default, ensure no other status is default
      if (field === 'is_default' && value) {
        return { ...status, is_default: false }
      }
      
      return status
    })
    
    setToothStatuses(updatedStatuses)
    setValue("tooth_mapping", updatedStatuses, { shouldDirty: true })
  }

  const handleMinTeethChange = (statusId: string, value: string) => {
    const numValue = value === "" ? null : parseInt(value)
    const updatedStatuses = toothStatuses.map(status => {
      if (status.status_id === statusId) {
        return { ...status, min_teeth: numValue }
      }
      return status
    })
    
    setToothStatuses(updatedStatuses)
    setValue("tooth_mapping", updatedStatuses, { shouldDirty: true })
  }

  const handleMaxTeethChange = (statusId: string, value: string) => {
    const numValue = value === "" ? null : parseInt(value)
    const updatedStatuses = toothStatuses.map(status => {
      if (status.status_id === statusId) {
        return { ...status, max_teeth: numValue }
      }
      return status
    })
    
    setToothStatuses(updatedStatuses)
    setValue("tooth_mapping", updatedStatuses, { shouldDirty: true })
  }

  const handleApplySameStatusChange = (value: boolean) => {
    setValue("apply_same_status_to_opposing", value, { shouldDirty: true })
  }

  return (
    <div className="border-t">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">Tooth Mapping</span>
          {sectionHasErrors(["toothMapping"]) ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Info className="h-4 w-4 text-gray-400" />
          )}
        </div>
        <div className="flex items-center gap-4">
          <Switch
            checked={sections.toothMapping}
            onCheckedChange={() => toggleSection("toothMapping")}
            className="data-[state=checked]:bg-[#1162a8]"
          />
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-200 cursor-pointer ${expandedSections.toothMapping ? "rotate-180" : ""}`}
            onClick={() => toggleExpanded("toothMapping")}
          />
        </div>
      </div>
      {expandedSections.toothMapping && sections.toothMapping && (
        <div className="px-6 pb-6">
          <div className="text-sm text-gray-600 mb-4">
            All available tooth status will be visible. User can toggle them on if they want it configured, off if not.
          </div>
          <div className="text-sm text-gray-600 mb-4">
            Once user choose between Default, required and optional, checkboxes will be disabled.
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1162a8]"></div>
              <span className="ml-2 text-gray-500">Loading tooth statuses...</span>
            </div>
          ) : (
            <>
            {/* Tooth Status Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b">
              <div className="grid grid-cols-7 gap-4 p-4 font-medium text-sm text-gray-700">
                <div>Tooth Status</div>
                <div className="text-center">Default</div>
                <div className="text-center">Required</div>
                <div className="text-center">Optional</div>
                <div className="text-center">Min Teeth</div>
                <div className="text-center">Max Teeth</div>
                <div className="text-center">Active</div>
              </div>
            </div>
            <div className="divide-y">
              {toothStatuses.map((status) => (
                <div key={status.status_id} className="grid grid-cols-7 gap-4 p-4 items-center">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="text-sm font-medium">{status.name}</span>
                  </div>
                  <div className="flex justify-center">
                    <Checkbox
                      checked={status.is_default}
                      onCheckedChange={(checked) => handleStatusChange(status.status_id, 'is_default', checked as boolean)}
                      disabled={status.is_required || status.is_optional}
                      className="data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                    />
                  </div>
                  <div className="flex justify-center">
                    <Checkbox
                      checked={status.is_required}
                      onCheckedChange={(checked) => handleStatusChange(status.status_id, 'is_required', checked as boolean)}
                      disabled={status.is_default}
                      className="data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                    />
                  </div>
                  <div className="flex justify-center">
                    <Checkbox
                      checked={status.is_optional}
                      onCheckedChange={(checked) => handleStatusChange(status.status_id, 'is_optional', checked as boolean)}
                      disabled={status.is_default || !status.is_required}
                      className="data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                    />
                  </div>
                  <div className="flex justify-center">
                    <Input
                      type="number"
                      min="1"
                      max="16"
                      value={status.min_teeth || ""}
                      onChange={(e) => handleMinTeethChange(status.status_id, e.target.value)}
                      className="w-20 h-8 text-center"
                      placeholder="Min"
                    />
                  </div>
                  <div className="flex justify-center">
                    <Input
                      type="number"
                      min="1"
                      max="16"
                      value={status.max_teeth || ""}
                      onChange={(e) => handleMaxTeethChange(status.status_id, e.target.value)}
                      className="w-20 h-8 text-center"
                      placeholder="Max"
                    />
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={status.is_active}
                      onCheckedChange={(checked) => handleStatusChange(status.status_id, 'is_active', checked)}
                      className="data-[state=checked]:bg-[#1162a8]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Apply same status to opposing checkbox */}
          <div className="mt-4 flex items-center gap-2">
            <Checkbox
              checked={watchedApplySameStatus}
              onCheckedChange={handleApplySameStatusChange}
              className="data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
            />
            <label className="text-sm text-gray-700 cursor-pointer">
              Apply same status to opposing
            </label>
          </div>

          <ValidationError message={getValidationError("toothMapping")} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
