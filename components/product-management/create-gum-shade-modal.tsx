"use client"

import { useState, useEffect, useMemo } from "react"
import { X, ChevronDown, Plus, Trash2, Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DiscardChangesDialog } from "@/components/product-management/discard-changes-dialog"
import { useGumShades, type GumShade } from "@/contexts/product-gum-shade-context"
import { DialogTitle } from "@radix-ui/react-dialog"

interface CreateGumShadeModalProps {
  isOpen: boolean
  onClose: () => void
  onChanges: (hasChanges: boolean) => void
  editingGumShade?: any
  isCopying?: boolean // Flag to indicate if we're copying a gum shade
}

interface FormShade extends Omit<GumShade, "id" | "created_at" | "updated_at"> {
  id?: number
  enabled: boolean
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

export function CreateGumShadeModal({ isOpen, onClose, onChanges, editingGumShade, isCopying = false }: CreateGumShadeModalProps) {
  const {
    availableShades,
    isAvailableShadesLoading,
    fetchAvailableShades,
    createGumShadeBrand,
    updateGumShadeBrand,
    createCustomGumShade,
    gumShadeBrands,
    isLoading,
  } = useGumShades()

  const [gumShadeDetailsEnabled, setGumShadeDetailsEnabled] = useState(true)
  const [formData, setFormData] = useState<FormData>(defaultFormData)
  const [newShadeName, setNewShadeName] = useState("")
  const [selectedBrandId, setSelectedBrandId] = useState<string>("")
  const [isCreatingCustomShade, setIsCreatingCustomShade] = useState(false)
  const [listOfShadesOpen, setListOfShadesOpen] = useState(true)
  const [linkToProductsOpen, setLinkToProductsOpen] = useState(false)
  const [linkToExistingGroupOpen, setLinkToExistingGroupOpen] = useState(false)
  const [visibilityManagementOpen, setVisibilityManagementOpen] = useState(false)

  // Discard dialog state
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

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
          shades: (editingGumShade.shades || []).map((shade: any) => ({
            ...shade,
            enabled: shade.status === "Active",
          })),
        })
      } else if (editingGumShade && !isCopying) {
        // Editing: use the provided editingGumShade data
        setFormData({
          name: editingGumShade.name || "",
          systemName: editingGumShade.system_name || "",
          sequence: editingGumShade.sequence?.toString() || "1",
          status: editingGumShade.status || "Active",
          shades: (editingGumShade.shades || []).map((shade: any) => ({
            ...shade,
            enabled: shade.status === "Active",
          })),
        })
      } else {
        // New gum shade: reset form
        setFormData(defaultFormData)
      }
      setNewShadeName("")
      setSelectedBrandId("")
      setGumShadeDetailsEnabled(true)
      setListOfShadesOpen(true)
      setLinkToProductsOpen(false)
      setLinkToExistingGroupOpen(false)
      setVisibilityManagementOpen(false)
      setHasChanges(false)
      fetchAvailableShades()
      // Fetch gum shade brands to have data for filtering
      if (gumShadeBrands.length === 0) {
        // This will be handled by the context, but we ensure data is available
      }
    }
  }, [isOpen, editingGumShade, isCopying])

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleStatusChange = (status: "Active" | "Inactive") => {
    setFormData((prev) => ({ ...prev, status }))
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

  // Handle shade inclusion toggle
  const toggleShadeInclusion = (shadeId: number) => {
    // First try to find in filteredShades (from selected system), then fallback to availableShades
    const shade = filteredShades.find((s) => s.id === shadeId) || availableShades.find((s) => s.id === shadeId)
    if (!shade) return

    setFormData((prev) => {
      const existingIndex = prev.shades.findIndex((s) => s.id === shadeId)

      if (existingIndex >= 0) {
        // Remove shade
        return {
          ...prev,
          shades: prev.shades.filter((s) => s.id !== shadeId),
        }
      } else {
        // Add shade
        return {
          ...prev,
          shades: [
            ...prev.shades,
            {
              ...shade,
              enabled: true,
            },
          ],
        }
      }
    })
  }

  // Handle shade status toggle
  const toggleShadeStatus = (shadeId: number) => {
    setFormData((prev) => ({
      ...prev,
      shades: prev.shades.map((shade) => (shade.id === shadeId ? { ...shade, enabled: !shade.enabled } : shade)),
    }))
  }

  // Remove shade from form
  const removeShadeFromForm = (shadeId: number) => {
    setFormData((prev) => ({
      ...prev,
      shades: prev.shades.filter((shade) => shade.id !== shadeId),
    }))
  }

  // Add new custom shade to form only
  const addNewShade = () => {
    if (newShadeName.trim() === "") return

    const newShade: FormShade = {
      id: Date.now(), // Temporary ID for UI
      name: newShadeName.trim(),
      sequence: formData.shades.length + 1,
      status: "Active",
      enabled: true,
    }

    setFormData((prev) => ({
      ...prev,
      shades: [...prev.shades, newShade],
    }))
    setNewShadeName("")
  }

  // Add custom shade to existing brand via API
  const addCustomShadeToAPI = async () => {
    if (newShadeName.trim() === "" || !selectedBrandId) return

    setIsCreatingCustomShade(true)

    const selectedBrand = gumShadeBrands.find((b) => b.id.toString() === selectedBrandId)
    if (!selectedBrand) {
      setIsCreatingCustomShade(false)
      return
    }

    const maxSequence = Math.max(0, ...selectedBrand.shades.map((s) => s.sequence))

    const success = await createCustomGumShade({
      brand_id: Number.parseInt(selectedBrandId),
      name: newShadeName.trim(),
      sequence: maxSequence + 1,
      status: "Active",
    })

    if (success) {
      setNewShadeName("")
      setSelectedBrandId("")
      // Refresh available shades to include the new one
      await fetchAvailableShades()
    }

    setIsCreatingCustomShade(false)
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
    if (!formData.name.trim()) return

    const payload = {
      name: formData.name.trim(),
      system_name: formData.systemName.trim(), // always use system_name for API
      sequence: Number.parseInt(formData.sequence) || 1,
      status: formData.status,
      shades: formData.shades
        .filter((shade) => shade.enabled)
        .map((shade, index) => ({
          name: shade.name,
          sequence: index + 1,
          status: shade.status,
        })),
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
      setNewShadeName("")
      setSelectedBrandId("")
      setGumShadeDetailsEnabled(true)
      setListOfShadesOpen(true)
      setLinkToProductsOpen(false)
      setLinkToExistingGroupOpen(false)
      setVisibilityManagementOpen(false)
      setHasChanges(false)
      onClose()
    }
  }

  // Check if shade is included in form
  const isShadeIncluded = (shadeId: number) => {
    return formData.shades.some((s) => s.id === shadeId)
  }

  // Get shade status from form
  const getShadeStatus = (shadeId: number) => {
    const shade = formData.shades.find((s) => s.id === shadeId)
    return shade?.enabled ?? false
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleAttemptClose}>
        <DialogContent className="p-0 gap-0 sm:max-w-[600px] max-w-[95vw] max-h-[95vh] flex flex-col overflow-hidden bg-white rounded-md">
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">Gum Shade Details</span>
                <Info className="h-4 w-4 text-gray-400" />
              </div>
              <Switch
                checked={gumShadeDetailsEnabled}
                onCheckedChange={setGumShadeDetailsEnabled}
                className="data-[state=checked]:bg-[#1162a8]"
              />
            </div>

            {gumShadeDetailsEnabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    placeholder="Gum Shade Brand Name"
                    className="h-10 sm:h-12"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    validationState={formData.name.trim() ? "valid" : "default"}
                  />
                  <Input
                    placeholder="Gum Shade System Name"
                    className="h-10 sm:h-12"
                    value={formData.systemName}
                    onChange={(e) => handleInputChange("systemName", e.target.value)}
                    validationState={formData.systemName.trim() ? "valid" : "default"}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    placeholder="Sequence"
                    type="number"
                    className="h-10 sm:h-12"
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
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-center text-xs sm:text-sm">Gum Shade</TableHead>
                          <TableHead className="text-center text-xs sm:text-sm">Include</TableHead>
                          <TableHead className="text-center text-xs sm:text-sm">Status</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredShades.map((shade) => (
                          <TableRow key={shade.id}>
                            <TableCell className="text-center">{shade.name}</TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={isShadeIncluded(shade.id)}
                                onCheckedChange={() => toggleShadeInclusion(shade.id)}
                                className="data-[state=checked]:bg-[#1162a8]"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={getShadeStatus(shade.id)}
                                onCheckedChange={() => toggleShadeStatus(shade.id)}
                                disabled={!isShadeIncluded(shade.id)}
                                className="data-[state=checked]:bg-[#1162a8]"
                              />
                            </TableCell>
                            <TableCell>
                              {isShadeIncluded(shade.id) && (
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
                        ))}
                        {formData.shades
                          .filter((shade) => !filteredShades.some((as) => as.id === shade.id))
                          .map((shade) => (
                            <TableRow key={shade.id}>
                              <TableCell className="text-center">{shade.name}</TableCell>
                              <TableCell className="text-center">
                                <Switch checked={true} disabled className="data-[state=checked]:bg-[#1162a8]" />
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={shade.enabled}
                                  onCheckedChange={() => shade.id && toggleShadeStatus(shade.id)}
                                  className="data-[state=checked]:bg-[#1162a8]"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => shade.id && removeShadeFromForm(shade.id)}
                                  className="h-8 w-8 text-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Add Custom Shade Section */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Add new shade"
                      value={newShadeName}
                      validationState={newShadeName.trim() ? "valid" : "default"}
                      onChange={(e) => setNewShadeName(e.target.value)}
                      className="h-10 flex-1"
                    />
                    <Button
                      onClick={addNewShade}
                      className="bg-[#1162a8] hover:bg-[#0d4d87] w-full sm:w-auto"
                      disabled={!newShadeName.trim()}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Custom
                    </Button>
                  </div>

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
              disabled={!formData.name.trim()}
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
