import React from "react"
import { Switch } from "@/components/ui/switch"
import { ChevronDown, Info, AlertCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { ValidationError } from "@/components/ui/validation-error"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function RetentionSection({
  control: _control,
  watch,
  setValue,
  sections,
  toggleSection,
  getValidationError,
  retentions,
  sectionHasErrors,
  expandedSections,
  toggleExpanded,
  handleToggleSelection,
  userRole = "",
  editingProduct = null,
}: {
  control: any
  watch: any
  setValue: any
  sections: any
  toggleSection: any
  getValidationError: any
  retentions: any
  sectionHasErrors: any
  expandedSections: any
  toggleExpanded: any
  handleToggleSelection: any
  userRole?: string
  editingProduct?: any | null
}) {
  const watchedRetentions = watch("retentions") || []
  const isLabAdmin = userRole === "lab_admin"
  const retentionEnabled = sections.retention !== false

  // Single source of truth: section switch drives apply_retention_mechanism for the API (no separate Yes/No radios).
  React.useEffect(() => {
    setValue("apply_retention_mechanism", retentionEnabled ? "Yes" : "No", { shouldDirty: false })
  }, [retentionEnabled, setValue])
  
  // Helper function to check if a retention is selected
  const isRetentionSelected = (retentionId: any) => {
    return watchedRetentions.some((ret: any) => ret.retention_id === retentionId)
  }

  // Helper function to get selected retention by id
  const getSelectedRetention = (retentionId: number) => {
    return watchedRetentions.find((ret: any) => ret.retention_id === retentionId)
  }

  // Update price for a selected retention
  const handlePriceChange = (retentionId: number, value: string) => {
    const priceValue = value === "" ? 0 : (parseFloat(value) || 0)
    setValue(
      "retentions",
      watchedRetentions.map((ret: any) =>
        ret.retention_id === retentionId ? { ...ret, price: priceValue } : ret
      ),
      { shouldDirty: true }
    )
  }

  return (
    <div className="border-t">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            checked={sections.retention !== false}
            onCheckedChange={(checked) => {
              toggleSection("retention")
              // Sync the retention mechanism radio with the toggle
              setValue("apply_retention_mechanism", checked ? "Yes" : "No", { shouldDirty: true })
              if (!checked) {
                setValue("retentions", [], { shouldDirty: true })
              }
            }}
            className="data-[state=checked]:bg-[#1162a8]"
          />
          <span className="font-medium">Retention</span>
          {sectionHasErrors(["retentions"]) && <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="rounded-sm text-gray-400 outline-none hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-[#1162a8] focus-visible:ring-offset-1"
                  aria-label="About retention for this product"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-left">
                <p className="text-sm font-medium">Does retention mechanism apply to this product?</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use the switch above: on enables retention options for this product; off disables retention for this
                  product.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-[#1162a8] ${watchedRetentions.length === 0 ? "opacity-80" : ""}`}
            style={{ marginRight: "1rem" }}
          >
            <strong>{watchedRetentions.length} selected</strong>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-200 cursor-pointer ${expandedSections.retention ? "rotate-180" : ""}`}
            onClick={() => toggleExpanded("retention")}
          />
        </div>
      </div>
      {expandedSections.retention && (
        <div className="px-6 pb-6">
          <div className={cn(sections.retention === false && "opacity-50 pointer-events-none select-none")}>
          {retentionEnabled && (
            <div className="mb-4">
              <Label className="text-sm font-medium mb-2 block">
                Select how this restoration will be retained
              </Label>
              <div className="flex flex-col gap-3">
                {retentions.map((retention: any) => {
                  const isSelected = isRetentionSelected(retention.id)
                  const selectedRetention = getSelectedRetention(retention.id)
                  
                  return (
                    <div key={retention.id} className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          value={retention.id}
                          checked={isSelected}
                          onChange={(e) => {
                            const isChecked = e.target.checked
                            if (isChecked) {
                              // Add retention to the array
                              const newRetention: any = {
                                retention_id: retention.id,
                                sequence: watchedRetentions.length + 1,
                                status: "Active"
                              }
                              // Add price for lab admin
                              if (isLabAdmin) {
                                newRetention.price = 0
                              }
                              setValue(
                                "retentions",
                                [...watchedRetentions, newRetention],
                                { shouldDirty: true }
                              )
                            } else {
                              // Remove retention from the array
                              const updatedRetentions = watchedRetentions
                                .filter((ret: any) => ret.retention_id !== retention.id)
                                .map((ret: any, index: number) => ({
                                  ...ret,
                                  sequence: index + 1
                                }))
                              setValue(
                                "retentions",
                                updatedRetentions,
                                { shouldDirty: true }
                              )
                            }
                          }}
                          className="accent-[#1162a8] w-5 h-5"
                        />
                        <span>{retention.name}</span>
                      </label>
                      {isSelected && isLabAdmin && (
                        <div className="ml-7 flex items-center gap-2">
                          <Label htmlFor={`retention-price-${retention.id}`} className="text-sm text-gray-600 w-20">
                            Price:
                          </Label>
                          <Input
                            id={`retention-price-${retention.id}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={selectedRetention?.price ?? ""}
                            onChange={(e) => handlePriceChange(retention.id, e.target.value)}
                            placeholder="0.00"
                            className="w-32"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          <ValidationError message={getValidationError("retentions")} />
          </div>
        </div>
      )}
    </div>
  )
}
