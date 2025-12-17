import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { ChevronDown, Info, AlertCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { ValidationError } from "@/components/ui/validation-error"
import { Controller } from "react-hook-form"

export function RetentionSection({
  control,
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
}) {
  const watchedRetentions = watch("retentions") || []
  const watchedApplyRetentionMechanism = watch("apply_retention_mechanism")
  // Only allow one retention to be selected at a time
  const selectedRetentionId = watchedRetentions[0]?.retention_id

  return (
    <div className="border-t">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">Retention</span>
          {sectionHasErrors(["retentions"]) ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Info className="h-4 w-4 text-gray-400" />
          )}
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-[#1162a8] ${watchedRetentions.length === 0 ? "opacity-80" : ""}`}
            style={{ marginRight: "1rem" }}
          >
            <strong>{watchedRetentions.length} selected</strong>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Switch
            checked={sections.retention}
            onCheckedChange={() => toggleSection("retention")}
            className="data-[state=checked]:bg-[#1162a8]"
          />
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-200 cursor-pointer ${expandedSections.retention ? "rotate-180" : ""}`}
            onClick={() => toggleExpanded("retention")}
          />
        </div>
      </div>
      {expandedSections.retention && sections.retention && (
        <div className="px-6 pb-6">
          <div className="flex items-center gap-4 mb-4">
            <Label htmlFor="apply-retention">
              Does retention mechanism apply to this product?
            </Label>
            <Controller
              name="apply_retention_mechanism"
              control={control}
              render={({ field }) => (
                <select className="w-32 border rounded" value={field.value} onChange={e => field.onChange(e.target.value)}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              )}
            />
          </div>
          {watchedApplyRetentionMechanism === "Yes" && (
            <div className="mb-4">
              <Label className="text-sm font-medium mb-2 block">
                Select how this restoration will be retained
              </Label>
              <div className="flex flex-col gap-3">
                {retentions.map((retention) => (
                  <label key={retention.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="retention"
                      value={retention.id}
                      checked={selectedRetentionId === retention.id}
                      onChange={() => {
                        // Only one retention allowed, so setValue with single object array
                        setValue(
                          "retentions",
                          [{
                            retention_id: retention.id,
                            sequence: 1,
                            status: "Active"
                          }],
                          { shouldDirty: true }
                        )
                      }}
                      className="accent-[#1162a8] w-5 h-5"
                    />
                    <span>{retention.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <ValidationError message={getValidationError("retentions")} />
        </div>
      )}
    </div>
  )
}
