"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { X, ChevronDown, Plus, Trash2, Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FloatingLabelInput } from "@/components/ui/floating-label-input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DiscardChangesDialog } from "@/components/product-management/discard-changes-dialog"
import { useGumShades, type GumShade, type GumShadePayload } from "@/contexts/product-gum-shade-context"
import { DialogTitle } from "@radix-ui/react-dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/

interface FormShade extends Omit<GumShade, "id" | "created_at" | "updated_at"> {
  id?: number
  enabled: boolean
  color_code_top?: string
  color_code_middle?: string
  color_code_bottom?: string
}

function toOptionalHexColor(value?: string | null): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  return HEX_COLOR_PATTERN.test(trimmed) ? trimmed : undefined
}

function isPersistedShadeId(id?: number): id is number {
  return typeof id === "number" && id > 0 && id < 1_000_000_000
}

function mapGumShadeToForm(shade: GumShade & { enabled?: boolean }): FormShade {
  return {
    id: shade.id,
    name: shade.name,
    sequence: shade.sequence,
    status: shade.status,
    enabled: shade.enabled ?? shade.status === "Active",
    color_code_top: shade.color_code_top ?? "",
    color_code_middle: shade.color_code_middle ?? "",
    color_code_bottom: shade.color_code_bottom ?? "",
  }
}

function CompactGumColorField({
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

function buildGumShadePayload(shade: FormShade): GumShadePayload {
  const status = shade.enabled ? "Active" : "Inactive"
  const payload: GumShadePayload = {
    name: shade.name,
    sequence: shade.sequence,
    status,
  }
  if (isPersistedShadeId(shade.id)) {
    payload.id = shade.id
  }
  const top = toOptionalHexColor(shade.color_code_top)
  const middle = toOptionalHexColor(shade.color_code_middle)
  const bottom = toOptionalHexColor(shade.color_code_bottom)
  if (top) payload.color_code_top = top
  if (middle) payload.color_code_middle = middle
  if (bottom) payload.color_code_bottom = bottom
  return payload
}

interface CreateGumShadeModalProps {
  isOpen: boolean
  onClose: () => void
  onChanges: (hasChanges: boolean) => void
  editingGumShade?: any
  isCopying?: boolean // Flag to indicate if we're copying a gum shade
}

interface FormData {
  name: string
  systemName: string
  sequence: string
  status: "Active" | "Inactive"
  shades: FormShade[]
}

const defaultFormData: FormData = {
  name: "",
  systemName: "",
  sequence: "1",
  status: "Active",
  shades: [],
}

type NewCustomShadeDraft = {
  name: string
  enabled: boolean
  color_code_top: string
  color_code_middle: string
  color_code_bottom: string
}

const defaultNewCustomShade: NewCustomShadeDraft = {
  name: "",
  enabled: true,
  color_code_top: "#FFB6C1",
  color_code_middle: "#FF69B4",
  color_code_bottom: "#C71585",
}

function isValidHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value.trim())
}

export function CreateGumShadeModal({ isOpen, onClose, onChanges, editingGumShade, isCopying = false }: CreateGumShadeModalProps) {
  const {
    availableShades,
    isAvailableShadesLoading,
    fetchAvailableShades,
    fetchShadesForBrand,
    createGumShadeBrand,
    updateGumShadeBrand,
    createCustomGumShade,
    gumShadeBrands,
    isLoading,
  } = useGumShades()
  const { toast } = useToast()

  const [gumShadeDetailsEnabled, setGumShadeDetailsEnabled] = useState(true)
  const [formData, setFormData] = useState<FormData>(defaultFormData)
  const [newCustomShade, setNewCustomShade] = useState<NewCustomShadeDraft>(defaultNewCustomShade)
  const [isCreatingCustomShade, setIsCreatingCustomShade] = useState(false)
  const canPersistCustomShadeToApi = Boolean(editingGumShade?.id && !isCopying)
  const [listOfShadesOpen, setListOfShadesOpen] = useState(true)
  const [linkToProductsOpen, setLinkToProductsOpen] = useState(false)
  const [linkToExistingGroupOpen, setLinkToExistingGroupOpen] = useState(false)
  const [visibilityManagementOpen, setVisibilityManagementOpen] = useState(false)

  // Discard dialog state
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const hasFetchedShades = useRef(false)

  // Track changes
  useEffect(() => {
    const hasFormChanges =
      formData.name.trim() !== "" ||
      formData.systemName.trim() !== "" ||
      formData.sequence !== "1" ||
      formData.status !== "Active" ||
      formData.shades.length > 0

    setHasChanges(hasFormChanges)
    onChanges(hasFormChanges)
  }, [formData, onChanges])

  // Reset form when modal opens or editingGumShade changes
  useEffect(() => {
    if (isOpen) {
      if (isCopying && editingGumShade) {
        // Copying: use the provided editingGumShade data directly (no API call needed)
        setFormData({
          name: editingGumShade.name || "",
          systemName: editingGumShade.system_name || "",
          sequence: editingGumShade.sequence?.toString() || "1",
          status: editingGumShade.status || "Active",
          shades: (editingGumShade.shades || []).map((shade: GumShade) => mapGumShadeToForm(shade)),
        })
      } else if (editingGumShade && !isCopying) {
        // Editing: use the provided editingGumShade data
        setFormData({
          name: editingGumShade.name || "",
          systemName: editingGumShade.system_name || "",
          sequence: editingGumShade.sequence?.toString() || "1",
          status: editingGumShade.status || "Active",
          shades: (editingGumShade.shades || []).map((shade: GumShade) => mapGumShadeToForm(shade)),
        })
      } else {
        // New gum shade: reset form
        setFormData(defaultFormData)
      }
      setNewCustomShade(defaultNewCustomShade)
      setGumShadeDetailsEnabled(true)
      setListOfShadesOpen(true)
      setLinkToProductsOpen(false)
      setLinkToExistingGroupOpen(false)
      setVisibilityManagementOpen(false)
      setHasChanges(false)
    } else {
      hasFetchedShades.current = false
    }
  }, [isOpen, editingGumShade, isCopying])

  // Fetch shades when modal opens
  // - Editing: fetch only the specific brand's shades
  // - Copying/New: fetch all available shades
  useEffect(() => {
    if (!isOpen) {
      hasFetchedShades.current = false
      return
    }

    if (hasFetchedShades.current) return
    hasFetchedShades.current = true

    if (editingGumShade?.id && !isCopying) {
      fetchShadesForBrand(editingGumShade.id)
    } else {
      fetchAvailableShades()
    }
  }, [isOpen, editingGumShade?.id, isCopying, fetchShadesForBrand, fetchAvailableShades])

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleStatusChange = (status: "Active" | "Inactive") => {
    setFormData((prev) => ({ ...prev, status }))
  }

  const resolveGumShadeColors = (shadeId: number, shadeName: string) => {
    const fromBrand = editingGumShade?.shades?.find((s: GumShade) => s.id === shadeId || s.name === shadeName)
    const fromAvailable = availableShades.find((s) => s.id === shadeId || s.name === shadeName)
    const source = fromBrand ?? fromAvailable
    return {
      color_code_top: source?.color_code_top ?? "",
      color_code_middle: source?.color_code_middle ?? "",
      color_code_bottom: source?.color_code_bottom ?? "",
    }
  }

  const updateShadeColor = (
    shadeId: number | undefined,
    shadeName: string,
    field: "color_code_top" | "color_code_middle" | "color_code_bottom",
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      shades: prev.shades.map((s) =>
        (shadeId != null && s.id === shadeId) || s.name === shadeName ? { ...s, [field]: value } : s,
      ),
    }))
  }

  // Filter shades based on selected system
  const filteredShades = useMemo(() => {
    // If systemName is not set, show all available shades
    if (!formData.systemName.trim()) {
      return availableShades
    }

    // Find the brand that matches the selected system_name
    const matchingBrand = gumShadeBrands.find(
      (brand) => brand.system_name === formData.systemName.trim()
    )

    // If we found a matching brand, return its shades
    if (matchingBrand && matchingBrand.shades) {
      return matchingBrand.shades
    }

    // If no matching brand found (new system or system name doesn't exist yet), show all shades
    // This allows users to select shades for a new system
    return availableShades
  }, [formData.systemName, availableShades, gumShadeBrands])

  const isEditPersistMode = Boolean(editingGumShade && !isCopying)

  const setGumShadeActive = (shadeId: number, active: boolean) => {
    const shade =
      filteredShades.find((s) => s.id === shadeId) ||
      availableShades.find((s) => s.id === shadeId) ||
      formData.shades.find((s) => s.id === shadeId)
    if (!shade) return

    setFormData((prev) => {
      const existing = prev.shades.find((s) => s.id === shadeId)

      if (isEditPersistMode && existing) {
        return {
          ...prev,
          shades: prev.shades.map((s) =>
            s.id === shadeId
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
              s.id === shadeId ? { ...s, enabled: true, status: "Active" } : s,
            ),
          }
        }
        return {
          ...prev,
          shades: [
            ...prev.shades,
            {
              ...mapGumShadeToForm({ ...shade, enabled: true, status: "Active" }),
              ...resolveGumShadeColors(shade.id, shade.name),
            },
          ],
        }
      }

      return {
        ...prev,
        shades: prev.shades.filter((s) => s.id !== shadeId),
      }
    })
  }

  // Remove shade from form
  const removeShadeFromForm = (shadeId: number) => {
    setFormData((prev) => ({
      ...prev,
      shades: prev.shades.filter((shade) => shade.id !== shadeId),
    }))
  }

  const nextCustomShadeSequence = () => {
    const sequences = [
      ...formData.shades.map((s) => s.sequence),
      ...(editingGumShade?.shades?.map((s: GumShade) => s.sequence) ?? []),
    ]
    return (sequences.length ? Math.max(...sequences) : 0) + 1
  }

  const isNewCustomShadeValid =
    newCustomShade.name.trim() !== "" &&
    isValidHexColor(newCustomShade.color_code_top) &&
    isValidHexColor(newCustomShade.color_code_middle) &&
    isValidHexColor(newCustomShade.color_code_bottom)

  const linkCustomShadeToForm = (shade: FormShade) => {
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
      !isValidHexColor(newCustomShade.color_code_top) ||
      !isValidHexColor(newCustomShade.color_code_middle) ||
      !isValidHexColor(newCustomShade.color_code_bottom)
    ) {
      toast({
        title: "Validation",
        description: "Top, middle, and bottom colors must be valid hex values (e.g. #FF69B4).",
        variant: "destructive",
      })
      return
    }

    const status = newCustomShade.enabled ? "Active" : "Inactive"
    const colors = {
      color_code_top: newCustomShade.color_code_top.trim().toUpperCase(),
      color_code_middle: newCustomShade.color_code_middle.trim().toUpperCase(),
      color_code_bottom: newCustomShade.color_code_bottom.trim().toUpperCase(),
    }
    const sequence = nextCustomShadeSequence()

    if (canPersistCustomShadeToApi && editingGumShade?.id) {
      setIsCreatingCustomShade(true)
      const created = await createCustomGumShade({
        brand_id: editingGumShade.id,
        name: trimmedName,
        sequence,
        status,
        ...colors,
      })

      if (created) {
        await fetchShadesForBrand(editingGumShade.id)
        linkCustomShadeToForm(
          mapGumShadeToForm({
            ...created,
            ...colors,
            status,
            enabled: status === "Active",
          }),
        )
        setNewCustomShade(defaultNewCustomShade)
        toast({
          title: "Shade added",
          description: `"${trimmedName}" was saved and linked to this brand.`,
        })
      }
      setIsCreatingCustomShade(false)
      return
    }

    linkCustomShadeToForm({
      name: trimmedName,
      sequence,
      status,
      enabled: newCustomShade.enabled,
      ...colors,
    })
    setNewCustomShade(defaultNewCustomShade)
    toast({
      title: "Shade added to form",
      description: canPersistCustomShadeToApi
        ? "Shade linked to this brand."
        : "Save the gum shade brand to persist this shade to the library.",
    })
  }

  // Handle close with discard check
  const handleAttemptClose = () => {
    if (hasChanges) {
      setShowDiscardDialog(true)
    } else {
      onClose()
    }
  }

  // Handle actual discard
  const handleActualDiscard = () => {
    setShowDiscardDialog(false)
    setFormData(defaultFormData)
    setHasChanges(false)
    onClose()
  }

  // Handle keep editing
  const handleKeepEditing = () => {
    setShowDiscardDialog(false)
  }

  // Handle save (create or update)
  const handleSave = async () => {
    if (!formData.name.trim() || !formData.shades.some((s) => s.enabled)) return

    const payload = {
      name: formData.name.trim(),
      system_name: formData.systemName.trim(), // always use system_name for API
      sequence: Number.parseInt(formData.sequence) || 1,
      status: formData.status,
      shades: formData.shades.map((shade, index) => {
        const built = buildGumShadePayload({
          ...shade,
          sequence: shade.sequence || index + 1,
        })
        if (!editingGumShade || isCopying) {
          delete built.id
        }
        return built
      }),
    }

    let success = false
    // If copying, always create a new gum shade (not update)
    if (editingGumShade && !isCopying) {
      // Always send system_name, not systemName
      success = await updateGumShadeBrand(editingGumShade.id, payload)
    } else {
      // Create new gum shade (either new or copy)
      success = await createGumShadeBrand(payload)
    }

    if (success) {
      setFormData(defaultFormData)
      setNewCustomShade(defaultNewCustomShade)
      setGumShadeDetailsEnabled(true)
      setListOfShadesOpen(true)
      setLinkToProductsOpen(false)
      setLinkToExistingGroupOpen(false)
      setVisibilityManagementOpen(false)
      setHasChanges(false)
      onClose()
    }
  }

  const isShadeActive = (shadeId: number) => {
    const shade = formData.shades.find((s) => s.id === shadeId)
    return shade?.enabled ?? false
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleAttemptClose}>
        <DialogContent className="p-0 gap-0 w-[95vw] max-w-[min(1200px,95vw)] max-h-[95vh] flex flex-col overflow-hidden bg-white rounded-md">
          <DialogHeader className="flex flex-row items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0">
            <DialogTitle className="text-lg sm:text-xl font-bold">
              {isCopying ? "Copy Gum Shade System" : editingGumShade ? "Edit Gum Shade System" : "Create Gum Shade System"}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleAttemptClose} className="h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6 min-h-0">
            {/* Gum Shade Details Section */}
            <div className="flex items-center gap-2">
              <span className="font-medium">Gum Shade Details</span>
              <Info className="h-4 w-4 text-gray-400" />
              <Switch
                checked={gumShadeDetailsEnabled}
                onCheckedChange={setGumShadeDetailsEnabled}
                className="data-[state=checked]:bg-[#1162a8]"
              />
            </div>

            {gumShadeDetailsEnabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FloatingLabelInput
                    label="Gum Shade Brand Name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    validationState={formData.name.trim() ? "valid" : "default"}
                  />
                  <FloatingLabelInput
                    label="Gum Shade System Name"
                    value={formData.systemName}
                    onChange={(e) => handleInputChange("systemName", e.target.value)}
                    validationState={formData.systemName.trim() ? "valid" : "default"}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FloatingLabelInput
                    label="Sequence"
                    type="number"
                    value={formData.sequence}
                    onChange={(e) => handleInputChange("sequence", e.target.value)}
                    validationState={formData.sequence.trim() ? "valid" : "default"}
                  />
                  <Select value={formData.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="h-10 sm:h-12">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* List of Shades Section */}
            <Collapsible open={listOfShadesOpen} onOpenChange={setListOfShadesOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full border-t border-b py-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">List of Shades</span>
                  <Info className="h-4 w-4 text-gray-400" />
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${listOfShadesOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                {isAvailableShadesLoading ? (
                  <div className="text-center py-4">Loading available shades...</div>
                ) : (
                  <div className="border rounded-md overflow-x-auto mb-4">
                    <Table className="min-w-[960px]">
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-center min-w-[100px] sticky left-0 z-10 bg-gray-50">
                            Shade
                          </TableHead>
                          <TableHead className="text-center w-[88px]">Status</TableHead>
                          <TableHead className="text-center min-w-[140px]">Top</TableHead>
                          <TableHead className="text-center min-w-[140px]">Middle</TableHead>
                          <TableHead className="text-center min-w-[140px]">Bottom</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredShades.map((shade) => {
                          const formShade = formData.shades.find(
                            (s) => s.id === shade.id || s.name === shade.name,
                          )
                          const active = isShadeActive(shade.id)
                          return (
                            <TableRow key={shade.id}>
                              <TableCell className="text-center sticky left-0 z-[1] bg-white font-medium">
                                {shade.name}
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={active}
                                  onCheckedChange={(checked) => setGumShadeActive(shade.id, checked)}
                                  className="data-[state=checked]:bg-[#1162a8]"
                                />
                              </TableCell>
                              <TableCell className="align-middle">
                                <CompactGumColorField
                                  value={formShade?.color_code_top}
                                  defaultHex="#FFB6C1"
                                  disabled={!active}
                                  onChange={(color) => updateShadeColor(shade.id, shade.name, "color_code_top", color)}
                                />
                              </TableCell>
                              <TableCell className="align-middle">
                                <CompactGumColorField
                                  value={formShade?.color_code_middle}
                                  defaultHex="#FF69B4"
                                  disabled={!active}
                                  onChange={(color) =>
                                    updateShadeColor(shade.id, shade.name, "color_code_middle", color)
                                  }
                                />
                              </TableCell>
                              <TableCell className="align-middle">
                                <CompactGumColorField
                                  value={formShade?.color_code_bottom}
                                  defaultHex="#C71585"
                                  disabled={!active}
                                  onChange={(color) =>
                                    updateShadeColor(shade.id, shade.name, "color_code_bottom", color)
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                {active && !isEditPersistMode && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeShadeFromForm(shade.id)}
                                    className="h-8 w-8 text-red-500"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        {formData.shades
                          .filter((shade) => !filteredShades.some((as) => as.id === shade.id))
                          .map((shade) => (
                            <TableRow key={shade.id}>
                              <TableCell className="text-center sticky left-0 z-[1] bg-white font-medium">
                                {shade.name}
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={shade.enabled}
                                  onCheckedChange={(checked) =>
                                    shade.id && setGumShadeActive(shade.id, checked)
                                  }
                                  className="data-[state=checked]:bg-[#1162a8]"
                                />
                              </TableCell>
                              <TableCell className="align-middle">
                                <CompactGumColorField
                                  value={shade.color_code_top}
                                  defaultHex="#FFB6C1"
                                  disabled={!shade.enabled}
                                  onChange={(color) => updateShadeColor(shade.id, shade.name, "color_code_top", color)}
                                />
                              </TableCell>
                              <TableCell className="align-middle">
                                <CompactGumColorField
                                  value={shade.color_code_middle}
                                  defaultHex="#FF69B4"
                                  disabled={!shade.enabled}
                                  onChange={(color) =>
                                    updateShadeColor(shade.id, shade.name, "color_code_middle", color)
                                  }
                                />
                              </TableCell>
                              <TableCell className="align-middle">
                                <CompactGumColorField
                                  value={shade.color_code_bottom}
                                  defaultHex="#C71585"
                                  disabled={!shade.enabled}
                                  onChange={(color) =>
                                    updateShadeColor(shade.id, shade.name, "color_code_bottom", color)
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                {shade.enabled && !isEditPersistMode && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => shade.id && removeShadeFromForm(shade.id)}
                                    className="h-8 w-8 text-red-500"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Add Custom Shade Section */}
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/80 p-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Add new shade</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {canPersistCustomShadeToApi
                        ? "Saves to the library immediately and links the shade to this brand."
                        : "Adds the shade to this form; save the brand to persist it to the library."}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="new-gum-shade-name">
                        Shade name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="new-gum-shade-name"
                        placeholder="e.g. G-Custom"
                        value={newCustomShade.name}
                        validationState={newCustomShade.name.trim() ? "valid" : "default"}
                        onChange={(e) =>
                          setNewCustomShade((prev) => ({ ...prev, name: e.target.value }))
                        }
                        className="h-10 bg-white"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:col-span-2 rounded-md border border-gray-200 bg-white px-3 py-2">
                      <Label htmlFor="new-gum-shade-status" className="text-sm font-normal">
                        Status
                      </Label>
                      <Switch
                        id="new-gum-shade-status"
                        checked={newCustomShade.enabled}
                        onCheckedChange={(checked) =>
                          setNewCustomShade((prev) => ({ ...prev, enabled: checked }))
                        }
                        className="data-[state=checked]:bg-[#1162a8]"
                      />
                      <span className="text-xs text-gray-600 min-w-[52px]">
                        {newCustomShade.enabled ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <Label>
                        Top <span className="text-red-500">*</span>
                      </Label>
                      <CompactGumColorField
                        value={newCustomShade.color_code_top}
                        defaultHex="#FFB6C1"
                        onChange={(color) =>
                          setNewCustomShade((prev) => ({ ...prev, color_code_top: color }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>
                        Middle <span className="text-red-500">*</span>
                      </Label>
                      <CompactGumColorField
                        value={newCustomShade.color_code_middle}
                        defaultHex="#FF69B4"
                        onChange={(color) =>
                          setNewCustomShade((prev) => ({ ...prev, color_code_middle: color }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>
                        Bottom <span className="text-red-500">*</span>
                      </Label>
                      <CompactGumColorField
                        value={newCustomShade.color_code_bottom}
                        defaultHex="#C71585"
                        onChange={(color) =>
                          setNewCustomShade((prev) => ({ ...prev, color_code_bottom: color }))
                        }
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddCustomShade}
                    className="bg-[#1162a8] hover:bg-[#0d4d87] w-full sm:w-auto"
                    disabled={!isNewCustomShadeValid || isCreatingCustomShade}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {isCreatingCustomShade ? "Saving…" : "Add shade"}
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Footer with action buttons */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t flex-shrink-0 bg-white">
            <Button 
              variant="destructive" 
              onClick={handleAttemptClose} 
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              className="bg-[#1162a8] hover:bg-[#0d4d87] w-full sm:w-auto" 
              disabled={!formData.name.trim() || !formData.shades.some((s) => s.enabled)}
            >
              {isLoading ? (isCopying ? "Copying..." : editingGumShade ? "Updating..." : "Creating...") : (isCopying ? "Copy Gum Shade" : editingGumShade ? "Update Gum Shade" : "Save Gum Shade")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discard Changes Dialog */}
      <DiscardChangesDialog
        isOpen={showDiscardDialog}
        type="gum-shade"
        onDiscard={handleActualDiscard}
        onKeepEditing={handleKeepEditing}
      />
    </>
  )
}
