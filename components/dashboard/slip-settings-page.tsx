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
import type { SlipSettingsFormState } from "@/lib/slip-settings-utils"

type LocationActionConfig = {
  id: string
  label: string
  description: string
  signatureKey:
    | "require_signature_pickup_from_office"
    | "require_signature_pickup_from_lab"
    | "require_signature_drop_at_lab"
    | "require_signature_drop_at_office"
  photoEnableKey:
    | "enable_photo_pickup_from_office"
    | "enable_photo_pickup_from_lab"
    | "enable_photo_drop_at_lab"
    | "enable_photo_drop_at_office"
  photoRequireKey:
    | "require_photo_pickup_from_office"
    | "require_photo_pickup_from_lab"
    | "require_photo_drop_at_lab"
    | "require_photo_drop_at_office"
  allowMultipleKey:
    | "allow_multiple_pickup_from_office"
    | "allow_multiple_pickup_from_lab"
    | "allow_multiple_drop_at_lab"
    | "allow_multiple_drop_at_office"
  allowMultipleLabel: string
  allowMultipleDescription: string
}

const LOCATION_ACTIONS: LocationActionConfig[] = [
  {
    id: "pickup-from-office",
    label: "In office ready to pickup",
    description: "Driver picks up slips from the office.",
    signatureKey: "require_signature_pickup_from_office",
    photoEnableKey: "enable_photo_pickup_from_office",
    photoRequireKey: "require_photo_pickup_from_office",
    allowMultipleKey: "allow_multiple_pickup_from_office",
    allowMultipleLabel: "Allow multiple pickups",
    allowMultipleDescription: "Submit several office pickups in one action.",
  },
  {
    id: "drop-at-lab",
    label: "On route to the lab",
    description: "Driver drops slips off at the lab.",
    signatureKey: "require_signature_drop_at_lab",
    photoEnableKey: "enable_photo_drop_at_lab",
    photoRequireKey: "require_photo_drop_at_lab",
    allowMultipleKey: "allow_multiple_drop_at_lab",
    allowMultipleLabel: "Allow multiple drop-offs",
    allowMultipleDescription:
      "Off = one at a time (use when each slip needs its own photo).",
  },
  {
    id: "pickup-from-lab",
    label: "In lab ready to pickup",
    description: "Driver picks up slips from the lab.",
    signatureKey: "require_signature_pickup_from_lab",
    photoEnableKey: "enable_photo_pickup_from_lab",
    photoRequireKey: "require_photo_pickup_from_lab",
    allowMultipleKey: "allow_multiple_pickup_from_lab",
    allowMultipleLabel: "Allow multiple pickups",
    allowMultipleDescription: "Submit several lab pickups in one action.",
  },
  {
    id: "drop-at-office",
    label: "On route to the office",
    description: "Driver drops slips off at the office.",
    signatureKey: "require_signature_drop_at_office",
    photoEnableKey: "enable_photo_drop_at_office",
    photoRequireKey: "require_photo_drop_at_office",
    allowMultipleKey: "allow_multiple_drop_at_office",
    allowMultipleLabel: "Allow multiple drop-offs",
    allowMultipleDescription:
      "Off = one at a time (use when each slip needs its own photo).",
  },
]

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

  const handleSave = async () => {
    const ok = await save()
    if (ok) {
      toast({
        title: "Settings saved",
        description: "Driver signature, photo, and multi-slip settings were updated.",
      })
    }
  }

  const handleCancel = () => {
    reset()
    router.push("/dashboard")
  }

  return (
    <div className="h-full w-full bg-[#F9F9F9] overflow-auto">
      <div className="w-full h-full px-4 sm:px-6 lg:px-8 py-4">
        <div className="mb-4">
          <div className="bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] text-white rounded-lg px-5 py-3 shadow-sm">
            <h1 className="text-lg sm:text-xl font-bold">Slip Settings</h1>
            <p className="text-blue-100 text-xs sm:text-sm">
              Configure signature, proof photo, and multi-slip rules per pickup/drop-off location
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 flex flex-wrap items-center justify-between gap-2">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => load()}>
              Retry
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-4">
                <CardDescription className="mb-3 block">
                  For each location, set whether signature and photo are required, and whether multiple slips can be submitted together.
                </CardDescription>

                {isLoading ? (
                  <div className="flex items-center justify-center py-10 text-gray-500 gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading slip settings…</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {LOCATION_ACTIONS.map((action) => {
                      const photoEnabled = form[action.photoEnableKey]

                      return (
                        <div
                          key={action.id}
                          className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
                        >
                          <div className="mb-3">
                            <span className="text-sm font-medium text-gray-900">
                              {action.label}
                            </span>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {action.description}
                            </p>
                          </div>

                          <div className="space-y-3 border-t border-gray-100 pt-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <span className="text-sm text-gray-900">
                                  Signature required
                                </span>
                              </div>
                              <Switch
                                checked={form[action.signatureKey]}
                                disabled={isSaving}
                                onCheckedChange={(checked) =>
                                  patchForm({
                                    [action.signatureKey]: checked,
                                  } as Partial<SlipSettingsFormState>)
                                }
                              />
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <span className="text-sm text-gray-900">
                                  Photo upload
                                </span>
                              </div>
                              <Switch
                                checked={photoEnabled}
                                disabled={isSaving}
                                onCheckedChange={(checked) =>
                                  patchForm({
                                    [action.photoEnableKey]: checked,
                                    ...(!checked
                                      ? { [action.photoRequireKey]: false }
                                      : {}),
                                  } as Partial<SlipSettingsFormState>)
                                }
                              />
                            </div>

                            {photoEnabled ? (
                              <div className="ml-0 sm:ml-4 pl-0 sm:pl-1">
                                <p className="text-xs font-medium text-gray-700 mb-2">
                                  Photo requirement
                                </p>
                                <RadioGroup
                                  value={
                                    form[action.photoRequireKey]
                                      ? "required"
                                      : "optional"
                                  }
                                  onValueChange={(next) =>
                                    patchForm({
                                      [action.photoRequireKey]:
                                        next === "required",
                                    } as Partial<SlipSettingsFormState>)
                                  }
                                  className="flex flex-col sm:flex-row gap-3 sm:gap-6"
                                  disabled={isSaving}
                                >
                                  <div className="flex items-center gap-2">
                                    <RadioGroupItem
                                      value="optional"
                                      id={`${action.id}-photo-optional`}
                                    />
                                    <Label
                                      htmlFor={`${action.id}-photo-optional`}
                                      className="text-sm font-normal cursor-pointer"
                                    >
                                      Optional
                                    </Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <RadioGroupItem
                                      value="required"
                                      id={`${action.id}-photo-required`}
                                    />
                                    <Label
                                      htmlFor={`${action.id}-photo-required`}
                                      className="text-sm font-normal cursor-pointer"
                                    >
                                      Required
                                    </Label>
                                  </div>
                                </RadioGroup>
                              </div>
                            ) : null}

                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <span className="text-sm text-gray-900">
                                  {action.allowMultipleLabel}
                                </span>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {action.allowMultipleDescription}
                                </p>
                              </div>
                              <Switch
                                checked={form[action.allowMultipleKey]}
                                disabled={isSaving}
                                onCheckedChange={(checked) =>
                                  patchForm({
                                    [action.allowMultipleKey]: checked,
                                  } as Partial<SlipSettingsFormState>)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-900">
                          Ready to send
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Lab “Ready to Send” action. Signature and photo are off by default.
                        </p>
                      </div>

                      <div className="space-y-3 border-t border-gray-100 pt-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <span className="text-sm text-gray-900">
                              Signature required
                            </span>
                          </div>
                          <Switch
                            checked={form.require_signature_ready_to_send}
                            disabled={isSaving}
                            onCheckedChange={(checked) =>
                              patchForm({ require_signature_ready_to_send: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <span className="text-sm text-gray-900">
                              Photo upload
                            </span>
                          </div>
                          <Switch
                            checked={form.enable_photo_ready_to_send}
                            disabled={isSaving}
                            onCheckedChange={(checked) =>
                              patchForm({
                                enable_photo_ready_to_send: checked,
                                ...(!checked
                                  ? { require_photo_ready_to_send: false }
                                  : {}),
                              })
                            }
                          />
                        </div>

                        {form.enable_photo_ready_to_send ? (
                          <div className="ml-0 sm:ml-4 pl-0 sm:pl-1">
                            <p className="text-xs font-medium text-gray-700 mb-2">
                              Photo requirement
                            </p>
                            <RadioGroup
                              value={
                                form.require_photo_ready_to_send
                                  ? "required"
                                  : "optional"
                              }
                              onValueChange={(next) =>
                                patchForm({
                                  require_photo_ready_to_send: next === "required",
                                })
                              }
                              className="flex flex-col sm:flex-row gap-3 sm:gap-6"
                              disabled={isSaving}
                            >
                              <div className="flex items-center gap-2">
                                <RadioGroupItem
                                  value="optional"
                                  id="ready-to-send-photo-optional"
                                />
                                <Label
                                  htmlFor="ready-to-send-photo-optional"
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  Optional
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <RadioGroupItem
                                  value="required"
                                  id="ready-to-send-photo-required"
                                />
                                <Label
                                  htmlFor="ready-to-send-photo-required"
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  Required
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-4 pt-3 border-t">
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
                    className="bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] hover:brightness-110 text-white min-w-[100px]"
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
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <HelpCircle className="h-5 w-5 text-[#1162a8]" />
                  How to Customize
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-[#1162a8] text-white flex items-center justify-center font-semibold text-sm">
                        1
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Per location</h4>
                      <p className="text-sm text-gray-600">
                        Each pickup/drop-off location has signature, photo, and allow-multiple controls together.
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
                      <h4 className="font-semibold text-sm mb-1">Photo optional vs required</h4>
                      <p className="text-sm text-gray-600">
                        Turn on photo upload first, then choose whether the photo is optional or required.
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

                <div className="pt-3 border-t">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex gap-2 mb-1">
                      <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <h4 className="font-semibold text-sm text-blue-900">Note</h4>
                    </div>
                    <p className="text-sm text-blue-800">
                      Turn off allow-multiple on route locations when each slip needs its own proof photo.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
