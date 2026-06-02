"use client"

import { useRouter } from "next/navigation"
import { Info, HelpCircle, Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { useSlipSettings } from "@/hooks/use-slip-settings"
import type { FieldRequirement } from "@/lib/api/slip-settings"
import type { SlipSettingsFormState } from "@/lib/slip-settings-utils"

type VisibilityFieldKey =
  | "show_patient_name"
  | "show_gender"
  | "show_age"
  | "show_slip_number"

const VISIBILITY_FIELDS: {
  key: VisibilityFieldKey
  label: string
  description: string
}[] = [
  {
    key: "show_patient_name",
    label: "Patient Name",
    description: "Show patient name on the slip header",
  },
  {
    key: "show_gender",
    label: "Gender",
    description: "Show patient gender on the slip header",
  },
  {
    key: "show_age",
    label: "Age",
    description: "Show patient age on the slip header",
  },
  {
    key: "show_slip_number",
    label: "Slip Number",
    description: "Show slip number on the slip header",
  },
]

function RequirementSelector({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string
  label: string
  value: FieldRequirement
  disabled?: boolean
  onChange: (value: FieldRequirement) => void
}) {
  return (
    <div
      className={`ml-0 sm:ml-4 mt-3 pt-3 border-t border-gray-100 ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <p className="text-xs font-medium text-gray-700 mb-2">{label}</p>
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as FieldRequirement)}
        className="flex flex-col sm:flex-row gap-3 sm:gap-6"
        disabled={disabled}
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="optional" id={`${id}-optional`} />
          <Label htmlFor={`${id}-optional`} className="text-sm font-normal cursor-pointer">
            Optional on create slip
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="required" id={`${id}-required`} />
          <Label htmlFor={`${id}-required`} className="text-sm font-normal cursor-pointer">
            Required on create slip
          </Label>
        </div>
      </RadioGroup>
    </div>
  )
}

export function SlipSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const {
    form,
    setForm,
    isLoading,
    isSaving,
    isDirty,
    error,
    load,
    save,
    reset,
  } = useSlipSettings()

  const patchForm = (patch: Partial<SlipSettingsFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  const handleVisibilityToggle = (key: VisibilityFieldKey, enabled: boolean) => {
    patchForm({ [key]: enabled } as Partial<SlipSettingsFormState>)
  }

  const handleSave = async () => {
    const ok = await save()
    if (ok) {
      toast({
        title: "Settings saved",
        description: "Slip header and field requirements were updated.",
      })
      router.push("/dashboard")
    }
  }

  const handleCancel = () => {
    reset()
    router.push("/dashboard")
  }

  const handleSelectAll = () => {
    patchForm({
      show_patient_name: true,
      show_gender: true,
      show_age: true,
      show_slip_number: true,
    })
  }

  const handleDeselectAll = () => {
    patchForm({
      show_patient_name: false,
      show_gender: false,
      show_age: false,
      show_slip_number: false,
    })
  }

  const fieldStatusItems = VISIBILITY_FIELDS.map(({ key, label }) => ({
    label,
    enabled: form[key],
  }))

  return (
    <div className="h-full w-full bg-[#F9F9F9] overflow-auto">
      <div className="w-full h-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="bg-[#1162a8] text-white rounded-lg p-6 sm:p-8 shadow-sm">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Slip Settings</h1>
            <p className="text-blue-100 text-sm sm:text-base">
              Configure slip header visibility and whether gender and age are required when creating slips
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex flex-wrap items-center justify-between gap-2">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => load()}>
              Retry
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle>Slip Header Fields</CardTitle>
                    <CardDescription>
                      Toggle which fields appear on the slip header. For gender and age, choose whether they are optional or required on the create-slip form (only when shown).
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      disabled={isLoading || isSaving}
                      className="whitespace-nowrap"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAll}
                      disabled={isLoading || isSaving}
                      className="whitespace-nowrap"
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading slip settings…</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {VISIBILITY_FIELDS.map((field) => {
                      const showRequirement =
                        field.key === "show_gender" || field.key === "show_age"
                      const isShown = form[field.key]

                      return (
                        <div
                          key={field.key}
                          className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-900">
                                {field.label}
                              </span>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {field.description}
                              </p>
                            </div>
                            <Switch
                              checked={isShown}
                              disabled={isSaving}
                              onCheckedChange={(checked) =>
                                handleVisibilityToggle(field.key, checked)
                              }
                            />
                          </div>

                          {showRequirement && field.key === "show_gender" && (
                            <RequirementSelector
                              id="gender-requirement"
                              label="Gender on create slip"
                              value={form.gender_requirement}
                              disabled={!isShown || isSaving}
                              onChange={(gender_requirement) =>
                                patchForm({ gender_requirement })
                              }
                            />
                          )}

                          {showRequirement && field.key === "show_age" && (
                            <RequirementSelector
                              id="age-requirement"
                              label="Age on create slip"
                              value={form.age_requirement}
                              disabled={!isShown || isSaving}
                              onChange={(age_requirement) =>
                                patchForm({ age_requirement })
                              }
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="min-w-[100px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isLoading || isSaving || !isDirty}
                    className="bg-[#1162a8] hover:bg-[#0f5497] text-white min-w-[100px]"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving…
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-[#1162a8]" />
                  How to Customize
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-[#1162a8] text-white flex items-center justify-center font-semibold text-sm">
                        1
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Show/Hide Fields</h4>
                      <p className="text-sm text-gray-600">
                        Use the toggle on each field to control slip header visibility.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-[#1162a8] text-white flex items-center justify-center font-semibold text-sm">
                        2
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Optional vs Required</h4>
                      <p className="text-sm text-gray-600">
                        For gender and age, set whether the field is optional or required when users create a slip. Required only applies when the field is shown.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-[#1162a8] text-white flex items-center justify-center font-semibold text-sm">
                        3
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Save Your Changes</h4>
                      <p className="text-sm text-gray-600">
                        Click Save Changes to persist settings for your lab.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-2 mb-2">
                      <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <h4 className="font-semibold text-sm text-blue-900">Note</h4>
                    </div>
                    <p className="text-sm text-blue-800">
                      These settings apply to slip headers and create-slip validation for your lab. They are managed here only—not from the case design center or virtual slip views.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-sm mb-2">Field Status</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {fieldStatusItems.map((field) => (
                      <li key={field.label} className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            field.enabled ? "bg-green-500" : "bg-gray-300"
                          }`}
                        />
                        <span
                          className={
                            field.enabled ? "" : "line-through text-gray-400"
                          }
                        >
                          {field.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
