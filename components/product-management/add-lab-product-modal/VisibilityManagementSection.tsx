import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { ChevronDown, Info, Search, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useCustomer } from "@/contexts/customer-context"
import { useEffect, useRef, useState } from "react"
import { Controller } from "react-hook-form"

export function VisibilityManagementSection({
  control,
  watch,
  setValue,
  sections,
  toggleSection,
  getValidationError,
  sectionHasErrors,
  expandedSections,
  toggleExpanded,
  handleOfficeVisibilityChange,
}) {
  const { officeCustomers, fetchCustomers, isCustomersLoading } = useCustomer()
  const [search, setSearch] = useState("")
  const [shouldShowAllOffices, setShouldShowAllOffices] = useState(false)
  const hasAutoShownAllOfficesRef = useRef(false)
  const watchedOfficeVisibilities = watch("office_visibilities") || []

  useEffect(() => {
    if (sections.visibilityManagement && expandedSections.visibilityManagement) {
      fetchCustomers("office")
    }
  }, [fetchCustomers, sections.visibilityManagement, expandedSections.visibilityManagement])

  useEffect(() => {
    if (
      sections.visibilityManagement &&
      expandedSections.visibilityManagement &&
      !hasAutoShownAllOfficesRef.current
    ) {
      setShouldShowAllOffices(true)
    }
  }, [sections.visibilityManagement, expandedSections.visibilityManagement])

  // Effect to handle showing all offices after they're loaded
  useEffect(() => {
    if (shouldShowAllOffices && officeCustomers && officeCustomers.length > 0) {
      const allOfficeVisibilities = officeCustomers.map((office) => ({
        office_id: office.id,
        is_visible: "Yes" as const,
      }))
      setValue("office_visibilities", allOfficeVisibilities, { shouldDirty: true })
      hasAutoShownAllOfficesRef.current = true
      setShouldShowAllOffices(false)
    }
  }, [shouldShowAllOffices, officeCustomers, setValue])

  // Add all offices to visibility
  const handleShowAllOffices = () => {
    if (!officeCustomers || officeCustomers.length === 0) {
      // Fetch offices first if not loaded
      setShouldShowAllOffices(true)
      fetchCustomers("office")
      return
    }
    
    const allOfficeVisibilities = officeCustomers.map((office) => ({
      office_id: office.id,
      is_visible: "Yes" as const,
    }))
    setValue("office_visibilities", allOfficeVisibilities, { shouldDirty: true })
  }

  // Remove office from visibility
  const handleRemoveOffice = (officeId: number) => {
    setValue(
      "office_visibilities",
      watchedOfficeVisibilities.filter((o) => o.office_id !== officeId),
      { shouldDirty: true }
    )
  }

  // Filter visible offices by search
  const visibleOffices = watchedOfficeVisibilities
    .map((office) => ({
      ...office,
      name: officeCustomers.find((o) => o.id === office.office_id)?.name || `Office ${office.office_id}`
    }))
    .filter((office) =>
      office.name.toLowerCase().includes(search.toLowerCase())
    )

  return (
    <div className="border-t">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">Visibility Management</span>
          <Info className="h-4 w-4 text-gray-400" />
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-[#1162a8] ${watchedOfficeVisibilities.length === 0 ? "opacity-80" : ""}`}
            style={{ marginRight: "1rem" }}
          >
            <strong>{watchedOfficeVisibilities.length} selected</strong>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Switch
            checked={sections.visibilityManagement}
            onCheckedChange={() => toggleSection("visibilityManagement")}
            className="data-[state=checked]:bg-[#1162a8]"
          />
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-200 cursor-pointer ${expandedSections.visibilityManagement ? "rotate-180" : ""}`}
            onClick={() => toggleExpanded("visibilityManagement")}
          />
        </div>
      </div>
      {expandedSections.visibilityManagement && sections.visibilityManagement && (
        <div className="px-6 pb-6">
          <div className="mb-6">
            <div className="mb-4">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm font-medium">Show to all offices</span>
                <Controller
                  name="show_to_all_lab"
                  control={control}
                  defaultValue="Yes"
                  render={({ field }) => {
                    const currentValue = field.value || "Yes"
                    return (
                      <RadioGroup
                        value={currentValue}
                        onValueChange={(val) => {
                          field.onChange(val)
                        }}
                        className="flex items-center gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Yes" id="show-yes" />
                          <Label htmlFor="show-yes" className="cursor-pointer">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="No" id="show-no" />
                          <Label htmlFor="show-no" className="cursor-pointer">No</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Hide" id="hide-all" />
                          <Label htmlFor="hide-all" className="cursor-pointer">Hide to all</Label>
                        </div>
                      </RadioGroup>
                    )
                  }}
                />
              </div>
            </div>
            
            <div className="relative mb-4">
              <Input
                placeholder="Search office to remove visibility"
                className="pr-10 h-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            <div className="text-right mb-2">
              <Button
                variant="link"
                className="text-[#1162a8] text-sm p-0 h-auto"
                type="button"
                onClick={handleShowAllOffices}
                disabled={isCustomersLoading}
              >
                Show all offices
              </Button>
            </div>
            
            <div className="border rounded-md overflow-hidden">
              <div className="grid grid-cols-2 py-3 px-4 border-b bg-gray-50">
                <div className="font-medium text-sm">Office</div>
                <div className="font-medium text-sm text-center">Visibility</div>
              </div>
              {visibleOffices.length > 0 ? (
                visibleOffices.map((office, index) => (
                  <div
                    key={office.office_id}
                    className={`grid grid-cols-2 py-3 px-4 items-center ${index % 2 === 1 ? "bg-blue-50" : "bg-white"}`}
                  >
                    <div className="text-sm">
                      {office.name}
                    </div>
                    <div className="flex justify-center items-center gap-4">
                      <Switch
                        className="data-[state=checked]:bg-[#1162a8]"
                        checked={office.is_visible === "Yes"}
                        onCheckedChange={(checked) => handleOfficeVisibilityChange(office.office_id, checked)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                        type="button"
                        onClick={() => handleRemoveOffice(office.office_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500 text-sm">
                  {isCustomersLoading ? "Loading offices..." : "No offices found"}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
