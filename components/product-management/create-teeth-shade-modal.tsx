"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { X, ChevronDown, Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FloatingLabelInput } from "@/components/ui/floating-label-input"
import { Switch } from "@/components/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ColorPicker } from "@/components/ui/color-picker"
import {
  useTeethShades,
  type TeethShadeBrandPayload,
  type ShadePayload,
  type Shade,
} from "@/contexts/product-teeth-shade-context"
import { DiscardChangesDialog } from "./discard-changes-dialog"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "react-i18next"
import { AddCustomShadePanel } from "@/components/product-management/add-custom-shade-panel"

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/

type FormTeethShade = ShadePayload & {
  enabled: boolean
}

function toOptionalHexColor(value?: string | null): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  return HEX_COLOR_PATTERN.test(trimmed) ? trimmed : undefined
}

function isPersistedShadeId(id?: number): id is number {
  return typeof id === "number" && id > 0 && id < 1_000_000_000
}

function mapShadeToForm(shade: {
  id?: number
  name: string
  sequence: number
  status: string
  color_code_incisal?: string | null
  color_code_body?: string | null
  color_code_cervical?: string | null
}): FormTeethShade {
  return {
    id: shade.id,
    name: shade.name,
    sequence: shade.sequence,
    status: shade.status,
    enabled: shade.status === "Active",
    color_code_incisal: shade.color_code_incisal ?? "",
    color_code_body: shade.color_code_body ?? "",
    color_code_cervical: shade.color_code_cervical ?? "",
  }
}

function CompactShadeColorField({
  value,
  defaultHex,
  onChange,
  disabled,
}: {
  value?: string
  defaultHex: string
  onChange: (hex: string) => void
  disabled?: boolean
}) {
  if (disabled) {
    return <span className="text-xs text-gray-400">—</span>
  }
  const pickerValue = toOptionalHexColor(value) || defaultHex
  return (
    <div className="flex items-center justify-center gap-1.5">
      <input
        type="color"
        value={pickerValue}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="h-7 w-7 shrink-0 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
        aria-label="Pick color"
      />
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={defaultHex}
        className="h-8 w-[5.5rem] px-2 font-mono text-xs"
        maxLength={7}
      />
    </div>
  )
}

function buildTeethShadePayload(shade: FormTeethShade): ShadePayload {
  const status = shade.enabled ? "Active" : "Inactive"
  const payload: ShadePayload = {
    name: shade.name,
    sequence: shade.sequence,
    status,
  }
  if (isPersistedShadeId(shade.id)) {
    payload.id = shade.id
  }
  const incisal = toOptionalHexColor(shade.color_code_incisal)
  const body = toOptionalHexColor(shade.color_code_body)
  const cervical = toOptionalHexColor(shade.color_code_cervical)
  if (incisal) payload.color_code_incisal = incisal
  if (body) payload.color_code_body = body
  if (cervical) payload.color_code_cervical = cervical
  return payload
}

type NewCustomTeethShadeDraft = {
  name: string
  enabled: boolean
  color_code_incisal: string
  color_code_body: string
  color_code_cervical: string
}

const defaultNewCustomTeethShade: NewCustomTeethShadeDraft = {
  name: "",
  enabled: true,
  color_code_incisal: "#FFFFFF",
  color_code_body: "#F5F5DC",
  color_code_cervical: "#E8E8E8",
}

function isValidHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value.trim())
}

interface CreateTeethShadeModalProps {
  isOpen: boolean
  onClose: () => void
  onHasChangesChange: (hasChanges: boolean) => void
  teethShadeBrand?: any // for edit mode
  isEditing?: boolean
  onSave?: (payload: any) => void
  isCopying?: boolean // Flag to indicate if we're copying a teeth shade
}

export function CreateTeethShadeModal({
  isOpen,
  onClose,
  onHasChangesChange,
  teethShadeBrand,
  isEditing,
  onSave,
  isCopying = false,
}: CreateTeethShadeModalProps) {
  const {
    createTeethShadeBrand,
    isLoading,
    fetchAvailableShades,
    fetchShadesForBrand,
    createCustomShade,
    teethShadeBrands,
    fetchTeethShadeBrands,
  } = useTeethShades()
  const { toast } = useToast()
  const { t } = useTranslation();
  const defaultFormData = {
    name: "",
    system_name: "",
    sequence: "",
    status: "Active",
    brand_color: "#1162a8",
    shades: [],
  }

  const [formData, setFormData] = useState<
    TeethShadeBrandPayload & { sequence: string; brand_color: string; shades: FormTeethShade[] }
  >(defaultFormData)
  const [initialFormData, setInitialFormData] = useState(defaultFormData)

  const [teethShadeDetailsEnabled, setTeethShadeDetailsEnabled] = useState(true)
  const [listOfShadesOpen, setListOfShadesOpen] = useState(true)
  const [linkToProductsOpen, setLinkToProductsOpen] = useState(false)
  const [linkToExistingGroupOpen, setLinkToExistingGroupOpen] = useState(false)
  const [visibilityManagementOpen, setVisibilityManagementOpen] = useState(false)
  const [newCustomShade, setNewCustomShade] = useState<NewCustomTeethShadeDraft>(defaultNewCustomTeethShade)
  const canPersistCustomShadeToApi = Boolean(isEditing && teethShadeBrand?.id && !isCopying)

  const [availableShades, setAvailableShades] = useState<Shade[]>([])
  const [loadingShades, setLoadingShades] = useState(false)
  const [addingCustomShade, setAddingCustomShade] = useState(false)
  const isSaving = useRef(false)
  const hasFetchedShades = useRef(false)

  // Filter available shades by system_name (case-insensitive)
  const filteredAvailableShades = formData.system_name
    ? availableShades.filter((shade) => {
        // Find the brand that this shade belongs to
        const brand = teethShadeBrands.find((b) => b.id === shade.brand_id)
        // Only show shades from brands with matching system_name (case-insensitive)
        return brand?.system_name?.toUpperCase() === formData.system_name.toUpperCase()
      })
    : availableShades

  // Get custom shades that are in formData but not in availableShades
  const customShades = formData.shades
    .filter((shade) => !availableShades.some((as) => as.name === shade.name))
    .map((shade) => ({
      id: `custom-${shade.name}`, // Temporary ID for custom shades
      name: shade.name,
      sequence: shade.sequence,
      status: shade.status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      brand_id: 0, // Custom shades don't have a brand_id
      isCustom: true, // Flag to identify custom shades
    }))

  // Combine filtered available shades with custom shades
  const allShadesToDisplay = [...filteredAvailableShades, ...customShades]

  // Discard dialog states
  const [hasChanges, setHasChanges] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)

  // Reset form and initial state when modal opens or editing
  useEffect(() => {
    if (isOpen) {
      if (isCopying && teethShadeBrand) {
        // Copying: use the provided teethShadeBrand data directly (no API call needed)
        setFormData({
          name: teethShadeBrand.name || "",
          system_name: teethShadeBrand.system_name || "",
          sequence: teethShadeBrand.sequence?.toString() || "",
          status: teethShadeBrand.status || "Active",
          brand_color: teethShadeBrand.brand_color || "#1162a8",
          shades: (teethShadeBrand.shades || []).map((shade: Shade) => mapShadeToForm(shade)),
        })
        setInitialFormData({
          name: teethShadeBrand.name || "",
          system_name: teethShadeBrand.system_name || "",
          sequence: teethShadeBrand.sequence?.toString() || "",
          status: teethShadeBrand.status || "Active",
          brand_color: teethShadeBrand.brand_color || "#1162a8",
          shades: (teethShadeBrand.shades || []).map((shade: Shade) => mapShadeToForm(shade)),
        })
      } else if (isEditing && teethShadeBrand && !isCopying) {
        // Editing: populate form for editing
        setFormData({
          name: teethShadeBrand.name || "",
          system_name: teethShadeBrand.system_name || "",
          sequence: teethShadeBrand.sequence?.toString() || "",
          status: teethShadeBrand.status || "Active",
          brand_color: teethShadeBrand.brand_color || "#1162a8",
          shades: (teethShadeBrand.shades || []).map((shade: Shade) => mapShadeToForm(shade)),
        })
        setInitialFormData({
          name: teethShadeBrand.name || "",
          system_name: teethShadeBrand.system_name || "",
          sequence: teethShadeBrand.sequence?.toString() || "",
          status: teethShadeBrand.status || "Active",
          brand_color: teethShadeBrand.brand_color || "#1162a8",
          shades: (teethShadeBrand.shades || []).map((shade: Shade) => mapShadeToForm(shade)),
        })
      } else {
        // New teeth shade: reset form
        setFormData(defaultFormData)
        setInitialFormData(defaultFormData)
      }
      setHasChanges(false)
      if (onHasChangesChange) onHasChangesChange(false)
      setTeethShadeDetailsEnabled(true)
      setListOfShadesOpen(true)
      setLinkToProductsOpen(false)
      setLinkToExistingGroupOpen(false)
      setVisibilityManagementOpen(false)
      setNewCustomShade(defaultNewCustomTeethShade)
    }
  }, [isOpen, isEditing, teethShadeBrand, isCopying, onHasChangesChange])

  // Fetch shades when modal opens
  // - Editing: fetch only the specific brand's shades (not all brands)
  // - Copying: fetch all available shades for the list
  useEffect(() => {
    if (!isOpen) {
      hasFetchedShades.current = false
      return
    }

    if (hasFetchedShades.current) return
    hasFetchedShades.current = true

    if (isEditing && teethShadeBrand?.id) {
      const loadBrandShades = async () => {
        setLoadingShades(true)
        try {
          const shades = await fetchShadesForBrand(teethShadeBrand.id)
          setAvailableShades(shades)
        } catch (error) {
          console.error("Error loading brand shades:", error)
        } finally {
          setLoadingShades(false)
        }
      }

      loadBrandShades()
    } else if (isCopying) {
      const loadAvailableShades = async () => {
        setLoadingShades(true)
        try {
          if (teethShadeBrands.length === 0) {
            await fetchTeethShadeBrands()
          }
          const shades = await fetchAvailableShades()
          setAvailableShades(shades)
        } catch (error) {
          console.error("Error loading available shades:", error)
        } finally {
          setLoadingShades(false)
        }
      }

      loadAvailableShades()
    } else {
      setAvailableShades([])
      setLoadingShades(false)
    }
  }, [
    isOpen,
    isEditing,
    isCopying,
    teethShadeBrand?.id,
    teethShadeBrands.length,
    fetchShadesForBrand,
    fetchAvailableShades,
    fetchTeethShadeBrands,
  ])

  // Track changes for discard dialog
  useEffect(() => {
    const currentShadesForComparison = formData.shades.map(({ enabled, ...rest }) => ({
      ...rest,
      status: enabled ? "Active" : "Inactive",
    }))
    const initialShadesForComparison = initialFormData.shades.map(({ enabled, ...rest }) => ({
      ...rest,
      status: enabled ? "Active" : "Inactive",
    }))

    const changed =
      formData.name !== initialFormData.name ||
      formData.system_name !== initialFormData.system_name ||
      formData.sequence !== initialFormData.sequence ||
      formData.status !== initialFormData.status ||
      formData.brand_color !== initialFormData.brand_color ||
      JSON.stringify(currentShadesForComparison) !== JSON.stringify(initialShadesForComparison)

    setHasChanges(changed)
    if (onHasChangesChange) {
      onHasChangesChange(changed)
    }
  }, [formData, initialFormData, onHasChangesChange])

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleNumberInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const resolveShadeColors = (shadeName: string) => {
    const fromBrand = teethShadeBrand?.shades?.find((s: Shade) => s.name === shadeName)
    const fromAvailable = availableShades.find((s) => s.name === shadeName)
    const source = fromBrand ?? fromAvailable
    return {
      color_code_incisal: source?.color_code_incisal ?? "",
      color_code_body: source?.color_code_body ?? "",
      color_code_cervical: source?.color_code_cervical ?? "",
    }
  }

  const updateShadeColor = (
    shadeName: string,
    field: "color_code_incisal" | "color_code_body" | "color_code_cervical",
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      shades: prev.shades.map((s) => (s.name === shadeName ? { ...s, [field]: value } : s)),
    }))
  }

  const isEditPersistMode = Boolean(isEditing && !isCopying)

  const setShadeActive = (
    shade: Shade & { isCustom?: boolean },
    active: boolean,
  ) => {
    setFormData((prev) => {
      const existing = prev.shades.find((s) => s.name === shade.name)

      if (isEditPersistMode && existing) {
        return {
          ...prev,
          shades: prev.shades.map((s) =>
            s.name === shade.name
              ? { ...s, enabled: active, status: active ? "Active" : "Inactive" }
              : s,
          ),
        }
      }

      if (active) {
        if (existing) {
          return {
            ...prev,
            shades: prev.shades.map((s) =>
              s.name === shade.name
                ? { ...s, enabled: true, status: "Active" }
                : s,
            ),
          }
        }
        return {
          ...prev,
          shades: [
            ...prev.shades,
            {
              id: typeof shade.id === "number" ? shade.id : undefined,
              name: shade.name,
              sequence: shade.sequence,
              status: "Active",
              enabled: true,
              ...resolveShadeColors(shade.name),
            },
          ],
        }
      }

      return {
        ...prev,
        shades: prev.shades.filter((s) => s.name !== shade.name),
      }
    })
  }

  const nextCustomShadeSequence = () => {
    const sequences = [
      ...formData.shades.map((s) => s.sequence),
      ...(teethShadeBrand?.shades?.map((s: Shade) => s.sequence) ?? []),
    ]
    return (sequences.length ? Math.max(...sequences) : 0) + 1
  }

  const isNewCustomShadeValid =
    newCustomShade.name.trim() !== "" &&
    isValidHexColor(newCustomShade.color_code_incisal) &&
    isValidHexColor(newCustomShade.color_code_body) &&
    isValidHexColor(newCustomShade.color_code_cervical)

  const linkCustomShadeToForm = (shade: FormTeethShade) => {
    setFormData((prev) => {
      if (prev.shades.some((s) => s.name.toLowerCase() === shade.name.toLowerCase())) {
        return {
          ...prev,
          shades: prev.shades.map((s) =>
            s.name.toLowerCase() === shade.name.toLowerCase() ? { ...s, ...shade } : s,
          ),
        }
      }
      return { ...prev, shades: [...prev.shades, shade] }
    })
    if (shade.id && !availableShades.some((s) => s.id === shade.id)) {
      setAvailableShades((prev) => [
        ...prev,
        {
          id: shade.id!,
          name: shade.name,
          sequence: shade.sequence,
          status: shade.status,
          color_code_incisal: shade.color_code_incisal,
          color_code_body: shade.color_code_body,
          color_code_cervical: shade.color_code_cervical,
        },
      ])
    }
  }

  const handleAddCustomShade = async () => {
    const trimmedName = newCustomShade.name.trim()
    if (!trimmedName) {
      toast({
        title: "Validation",
        description: "Shade name is required.",
        variant: "destructive",
      })
      return
    }
    if (
      !isValidHexColor(newCustomShade.color_code_incisal) ||
      !isValidHexColor(newCustomShade.color_code_body) ||
      !isValidHexColor(newCustomShade.color_code_cervical)
    ) {
      toast({
        title: "Validation",
        description: "Incisal, body, and cervical colors must be valid hex values (e.g. #FFFFFF).",
        variant: "destructive",
      })
      return
    }

    const status = newCustomShade.enabled ? "Active" : "Inactive"
    const colors = {
      color_code_incisal: newCustomShade.color_code_incisal.trim().toUpperCase(),
      color_code_body: newCustomShade.color_code_body.trim().toUpperCase(),
      color_code_cervical: newCustomShade.color_code_cervical.trim().toUpperCase(),
    }
    const sequence = nextCustomShadeSequence()

    if (canPersistCustomShadeToApi && teethShadeBrand?.id) {
      setAddingCustomShade(true)
      try {
        const created = await createCustomShade({
          brand_id: teethShadeBrand.id,
          name: trimmedName,
          sequence,
          status,
          ...colors,
        })

        if (created) {
          const updatedShades = await fetchShadesForBrand(teethShadeBrand.id)
          setAvailableShades(updatedShades)
          linkCustomShadeToForm(mapShadeToForm({ ...created, ...colors, status }))
          setNewCustomShade(defaultNewCustomTeethShade)
          toast({
            title: "Shade added",
            description: `"${trimmedName}" was saved and linked to this brand.`,
          })
        }
      } catch (error) {
        console.error("Error adding custom shade:", error)
      } finally {
        setAddingCustomShade(false)
      }
      return
    }

    linkCustomShadeToForm({
      name: trimmedName,
      sequence,
      status,
      enabled: newCustomShade.enabled,
      ...colors,
    })
    setNewCustomShade(defaultNewCustomTeethShade)
    toast({
      title: "Shade added to form",
      description: canPersistCustomShadeToApi
        ? "Shade linked to this brand."
        : "Save the teeth shade brand to persist this shade to the library.",
    })
  }

  const handleAttemptClose = useCallback(() => {
    if (hasChanges) {
      setShowDiscardDialog(true)
    } else {
      onClose()
    }
  }, [hasChanges, onClose])

  const handleActualDiscard = () => {
    setShowDiscardDialog(false)
    setHasChanges(false)
    if (onHasChangesChange) onHasChangesChange(false)
    onClose()
  }

  const handleKeepEditing = () => {
    setShowDiscardDialog(false)
  }

  const handleSave = async () => {
    if (isSaving.current) return
    isSaving.current = true

    const payload: TeethShadeBrandPayload = {
      name: formData.name,
      system_name: formData.system_name,
      sequence: Number.parseInt(formData.sequence),
      status: formData.status,
      brand_color: formData.brand_color,
      shades: formData.shades.map((shade) => {
        const built = buildTeethShadePayload(shade)
        if (!isEditing || isCopying) {
          delete built.id
        }
        return built
      }),
    }

    try {
      // If editing (not copying), use the onSave callback to update
      if (isEditing && onSave && !isCopying) {
        const success = await onSave(payload)
        // onSave will handle the toast and closing from context
        if (success) {
          setHasChanges(false)
          if (onHasChangesChange) onHasChangesChange(false)
          onClose()
        }
      } else {
        // Create new teeth shade (either new or copy)
        const success = await createTeethShadeBrand(payload)
        if (success) {
          // Context already shows a toast, but we show a more specific one for duplicate
          if (isCopying) {
            toast({
              title: "Teeth Shade Duplicated",
              description: `Successfully duplicated "${formData.name}"`,
              variant: "default",
            })
          }
          setHasChanges(false)
          if (onHasChangesChange) onHasChangesChange(false)
          onClose()
        }
      }
    } catch (error) {
      console.error("Error saving teeth shade brand:", error)
      toast({
        title: "Error",
        description: isCopying
          ? "Failed to duplicate teeth shade. Please try again."
          : isEditing
          ? "Failed to update teeth shade. Please try again."
          : "Failed to create teeth shade. Please try again.",
        variant: "destructive",
      })
    } finally {
      isSaving.current = false
    }
  }

  const isFormValid =
    formData.name.trim() !== "" &&
    formData.sequence.trim() !== "" &&
    !isNaN(Number.parseInt(formData.sequence)) &&
    formData.status.trim() !== "" &&
    formData.shades.length > 0 &&
    formData.shades.some((shade) => shade.enabled) &&
    formData.shades.every((shade) => shade.name.trim() !== "")

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleAttemptClose()}>
        <DialogContent className="p-0 gap-0 w-[95vw] max-w-[min(1200px,95vw)] overflow-hidden bg-white rounded-md">
          <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b">
            <DialogTitle className="text-xl font-bold">
              {isCopying ? "Copy Teeth Shade System" : isEditing ? "Edit Teeth Shade System" : "Create Teeth Shade System"}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleAttemptClose} className="h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-130px)] p-6 space-y-6">
            {/* Teeth Shade Details Section */}
            <div className="flex items-center gap-2">
              <span className="font-medium">Teeth Shade Details</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>Configure the basic information for this teeth shade system, including brand name, system name, sequence, and status.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Switch
                checked={teethShadeDetailsEnabled}
                onCheckedChange={setTeethShadeDetailsEnabled}
                className="data-[state=checked]:bg-[#1162a8]"
              />
            </div>

            {teethShadeDetailsEnabled && (
              <div className="space-y-4">
                <FloatingLabelInput
                  label="Teeth Shade Brand Name *"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  validationState={formData.name.trim() ? "valid" : "default"}
                  required
                />
                <FloatingLabelInput
                  label="Teeth Shade System Name"
                  value={formData.system_name}
                  onChange={(e) => handleInputChange("system_name", e.target.value)}
                  validationState={formData.system_name.trim() ? "valid" : "default"}
                />
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Brand Color
                  </label>
                  <ColorPicker
                    value={formData.brand_color || "#1162a8"}
                    onChange={(color) => handleInputChange("brand_color", color)}
                    side="left"
                    align="start"
                  />
                </div>
                <FloatingLabelInput
                  label="Sequence *"
                  type="number"
                  value={formData.sequence}
                  onChange={(e) => handleNumberInputChange("sequence", e.target.value)}
                  validationState={formData.sequence ? "valid" : "default"}
                  required
                />
                <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select Status *" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* List of Shades Section */}
            <Collapsible open={listOfShadesOpen} onOpenChange={setListOfShadesOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full border-t border-b py-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">List of Shades</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[300px]">
                        <p>Toggle status (Active/Inactive) per shade and edit incisal / body / cervical hex colors when active.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${listOfShadesOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                {loadingShades ? (
                  <div className="text-center py-4">Loading available shades...</div>
                ) : (
                  <>
                    <div className="border rounded-md overflow-x-auto mb-4">
                      <Table className="min-w-[900px]">
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="text-center min-w-[100px] sticky left-0 z-10 bg-gray-50">
                              Shade
                            </TableHead>
                            <TableHead className="text-center w-[88px]">Status</TableHead>
                            <TableHead className="text-center min-w-[140px]">Incisal</TableHead>
                            <TableHead className="text-center min-w-[140px]">Body</TableHead>
                            <TableHead className="text-center min-w-[140px]">Cervical</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allShadesToDisplay.length > 0 ? (
                            allShadesToDisplay.map((shade) => {
                              const formShade = formData.shades.find((s) => s.name === shade.name)
                              const isActive = formShade?.enabled ?? false
                              const isCustom = (shade as any).isCustom || false

                              return (
                                <TableRow key={shade.id || shade.name}>
                                  <TableCell className="text-center sticky left-0 z-[1] bg-white">
                                    <div className="flex items-center justify-center gap-2">
                                      <span className="font-medium">{shade.name}</span>
                                      {isCustom && (
                                        <span className="text-xs text-[#1162a8] bg-blue-50 px-2 py-0.5 rounded">
                                          Custom
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Switch
                                      checked={isActive}
                                      onCheckedChange={(checked) => setShadeActive(shade as Shade, checked)}
                                      className="data-[state=checked]:bg-[#1162a8]"
                                    />
                                  </TableCell>
                                  <TableCell className="align-middle">
                                    <CompactShadeColorField
                                      value={formShade?.color_code_incisal}
                                      defaultHex="#F5F5DC"
                                      disabled={!isActive}
                                      onChange={(color) => updateShadeColor(shade.name, "color_code_incisal", color)}
                                    />
                                  </TableCell>
                                  <TableCell className="align-middle">
                                    <CompactShadeColorField
                                      value={formShade?.color_code_body}
                                      defaultHex="#E8DCC8"
                                      disabled={!isActive}
                                      onChange={(color) => updateShadeColor(shade.name, "color_code_body", color)}
                                    />
                                  </TableCell>
                                  <TableCell className="align-middle">
                                    <CompactShadeColorField
                                      value={formShade?.color_code_cervical}
                                      defaultHex="#D4C4A8"
                                      disabled={!isActive}
                                      onChange={(color) => updateShadeColor(shade.name, "color_code_cervical", color)}
                                    />
                                  </TableCell>
                                </TableRow>
                              )
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-gray-500 py-4">
                                {isEditing || isCopying 
                                  ? "No shades available. Add a custom shade below to get started." 
                                  : "No shades available. Add a custom shade below to get started."}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <AddCustomShadePanel
                      className="mb-4"
                      idPrefix="new-teeth-shade"
                      name={newCustomShade.name}
                      onNameChange={(value) =>
                        setNewCustomShade((prev) => ({ ...prev, name: value }))
                      }
                      namePlaceholder="e.g. A2"
                      enabled={newCustomShade.enabled}
                      onEnabledChange={(checked) =>
                        setNewCustomShade((prev) => ({ ...prev, enabled: checked }))
                      }
                      persistHint={
                        canPersistCustomShadeToApi
                          ? "Saves to the library immediately and links the shade to this brand."
                          : "Adds the shade to this form; save the brand to persist it to the library."
                      }
                      colorFields={[
                        {
                          id: "new-teeth-shade-incisal",
                          label: "Incisal",
                          value: newCustomShade.color_code_incisal,
                          defaultHex: "#FFFFFF",
                          onChange: (color) =>
                            setNewCustomShade((prev) => ({ ...prev, color_code_incisal: color })),
                        },
                        {
                          id: "new-teeth-shade-body",
                          label: "Body",
                          value: newCustomShade.color_code_body,
                          defaultHex: "#F5F5DC",
                          onChange: (color) =>
                            setNewCustomShade((prev) => ({ ...prev, color_code_body: color })),
                        },
                        {
                          id: "new-teeth-shade-cervical",
                          label: "Cervical",
                          value: newCustomShade.color_code_cervical,
                          defaultHex: "#E8E8E8",
                          onChange: (color) =>
                            setNewCustomShade((prev) => ({ ...prev, color_code_cervical: color })),
                        },
                      ]}
                      onAdd={handleAddCustomShade}
                      isValid={isNewCustomShadeValid}
                      isSubmitting={addingCustomShade}
                    />
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>

         
          </div>

          {/* Footer with action buttons */}
          <div className="px-6 py-4 flex justify-end gap-3 border-t">
            <Button variant="destructive" onClick={handleAttemptClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isFormValid || isLoading}
              className="bg-[#1162a8] hover:bg-[#0d4d87] disabled:opacity-50"
            >
              {isLoading ? (isCopying ? "Copying..." : isEditing ? "Saving..." : "Saving...") : (isCopying ? "Copy Teeth Shade" : isEditing ? "Save Changes" : "Save Teeth Shade")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showDiscardDialog && (
        <DiscardChangesDialog
          isOpen={showDiscardDialog}
          type="teeth-shade"
          onDiscard={handleActualDiscard}
          onKeepEditing={handleKeepEditing}
        />
      )}
    </>
  )
}
