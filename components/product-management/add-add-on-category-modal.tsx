"use client"

import { useState, useEffect, useCallback } from "react"
import { X, ChevronDown, Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAddOns, type AddOn, type AddOnCategory, type AddOnSubCategory } from "@/contexts/product-add-on-category-context"
import { DiscardChangesDialog } from "./discard-changes-dialog"
import { generateCodeFromName } from "@/lib/utils"

interface AddAddOnModalProps {
  isOpen: boolean
  onClose: () => void
  onHasChangesChange: (hasChanges: boolean) => void
  addOn?: AddOn | AddOnCategory | AddOnSubCategory | null
  isEditing?: boolean
  isCopying?: boolean // Flag to indicate if we're copying an add-on category
  isSubCategory?: boolean // Flag to indicate if we're working with a subcategory
}

export function AddAddOnCategoryModal({ isOpen, onClose, onHasChangesChange, addOn, isEditing = false, isCopying = false, isSubCategory = false }: AddAddOnModalProps) {
  const {
    addOnCategoriesForSelect,
    fetchAddOnCategoriesForSelect,
    isLoadingCategoriesForSelect,
    createAddOn,
    updateAddOn,
    createAddOnCategory,
    updateAddOnCategory,
    createAddOnSubCategory,
    updateAddOnSubCategory,
    getAddOnCategoryDetail,
    getAddOnSubcategoryDetail,
    showAnimation,
    triggerAnimation,
  } = useAddOns()

  const defaultFormData = {
    name: "",
    code: "",
    price: "",
    type: "Both",
    status: "Active",
    sequence: "",
    subcategory_id: "",
    createNewSubCategory: false,
    parentCategoryId: "",
  }

  const [formData, setFormData] = useState(defaultFormData)
  const [initialFormData, setInitialFormData] = useState(defaultFormData)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  const [addOnDetailsEnabled, setAddOnDetailsEnabled] = useState(true)
  const [linkToProductsOpen, setLinkToProductsOpen] = useState(false)
  const [linkToExistingGroupOpen, setLinkToExistingGroupOpen] = useState(false)
  const [visibilityManagementOpen, setVisibilityManagementOpen] = useState(false)

  // Discard dialog states
  const [hasChanges, setHasChanges] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (isCopying && addOn) {
        // Copying: use the provided addOn data directly (no API call needed)
        const copyData = {
          name: addOn.name,
          code: addOn.code || "",
          price: (addOn as any).price?.toString() || "",
          type: addOn.type || "Both",
          status: addOn.status,
          sequence: addOn.sequence?.toString() || "",
          subcategory_id: (addOn as AddOnSubCategory).category_id?.toString() || "",
          createNewSubCategory: false,
          parentCategoryId: (addOn as AddOnSubCategory).category_id?.toString() || "",
        }
        setFormData(copyData)
        setInitialFormData(copyData)
      } else if (addOn && isEditing && !isCopying) {
        // Editing: fetch detail from API if needed
        setIsDetailLoading(true)
        if (isSubCategory) {
          // Editing subcategory
          getAddOnSubcategoryDetail((addOn as AddOnSubCategory).id).then((detail) => {
            if (detail) {
              const editData = {
                name: detail.name,
                code: detail.code || "",
                price: "",
                type: detail.type || "Both",
                status: detail.status,
                sequence: detail.sequence?.toString() || "",
                subcategory_id: "",
                createNewSubCategory: false,
                parentCategoryId: detail.category_id?.toString() || "",
              }
              setFormData(editData)
              setInitialFormData(editData)
            }
            setIsDetailLoading(false)
          })
        } else {
          // Editing category
          getAddOnCategoryDetail((addOn as AddOnCategory).id).then((detail) => {
            if (detail) {
              const editData = {
                name: detail.name,
                code: detail.code || "",
                price: "",
                type: detail.type || "Both",
                status: detail.status,
                sequence: detail.sequence?.toString() || "",
                subcategory_id: "",
                createNewSubCategory: false,
                parentCategoryId: "",
              }
              setFormData(editData)
              setInitialFormData(editData)
            }
            setIsDetailLoading(false)
          })
        }
      } else {
        // New category/subcategory: reset form
        setFormData(defaultFormData)
        setInitialFormData(defaultFormData)
        setIsDetailLoading(false)
      }
      setHasChanges(false)
      if (onHasChangesChange) onHasChangesChange(false)
      setAddOnDetailsEnabled(true)
      setLinkToProductsOpen(false)
      setLinkToExistingGroupOpen(false)
      setVisibilityManagementOpen(false)
    }
  }, [isOpen, addOn, isEditing, isCopying, isSubCategory, onHasChangesChange, getAddOnCategoryDetail, getAddOnSubcategoryDetail])

  // Fetch categories when modal opens
  useEffect(() => {
    if (isOpen && !addOnCategoriesForSelect.length) {
      fetchAddOnCategoriesForSelect()
    }
  }, [isOpen, addOnCategoriesForSelect, fetchAddOnCategoriesForSelect])

  // Track changes for discard dialog
  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(initialFormData)
    setHasChanges(changed)
    if (onHasChangesChange) {
      onHasChangesChange(changed)
    }
  }, [formData, initialFormData, onHasChangesChange])

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      }
      // Auto-generate code from name when name changes
      if (field === "name" && typeof value === "string") {
        const generatedCode = generateCodeFromName(value)
        if (generatedCode) {
          updated.code = generatedCode
        }
      }
      return updated
    })
  }

  // Get all subcategories for direct selection
  const allSubcategories = addOnCategoriesForSelect.flatMap(
    (cat) =>
      cat.subcategories?.map((sub) => ({
        id: sub.id,
        name: sub.name,
        categoryName: cat.name,
        categoryId: cat.id,
      })) || [],
  )

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
    if (isSubCategory) {
      // Handle subcategory
      if (!formData.name.trim() || !formData.parentCategoryId) {
        triggerAnimation("error", "Sub-category name and parent category are required.")
        return
      }

      const payload = {
        name: formData.name,
        code: formData.code,
        category_id: Number(formData.parentCategoryId),
        type: formData.type as "Upper" | "Lower" | "Both",
        sequence: Number(formData.sequence) || 0,
        status: formData.status as "Active" | "Inactive",
      }

      try {
        let success = false
        if (isEditing && addOn && !isCopying) {
          success = !!(await updateAddOnSubCategory((addOn as AddOnSubCategory).id, payload))
        } else {
          success = !!(await createAddOnSubCategory(payload))
        }

        if (success) {
          setHasChanges(false)
          if (onHasChangesChange) onHasChangesChange(false)
          onClose()
        }
      } catch (error) {
        console.error("Error saving subcategory:", error)
      }
    } else {
      // Handle category
      if (!formData.name.trim()) {
        triggerAnimation("error", "Category name is required.")
        return
      }

      const payload = {
        name: formData.name,
        code: formData.code,
        type: formData.type as "Upper" | "Lower" | "Both",
        sequence: Number(formData.sequence) || 0,
        status: formData.status as "Active" | "Inactive",
      }

      try {
        let success = false
        if (isEditing && addOn && !isCopying) {
          success = !!(await updateAddOnCategory((addOn as AddOnCategory).id, payload))
        } else {
          success = !!(await createAddOnCategory(payload))
        }

        if (success) {
          setHasChanges(false)
          if (onHasChangesChange) onHasChangesChange(false)
          onClose()
        }
      } catch (error) {
        console.error("Error saving category:", error)
      }
    }
  }

  const isFormValid =
    formData.name.trim() !== "" &&
    formData.status.trim() !== "" &&
    (isSubCategory ? formData.parentCategoryId.trim() !== "" : true)
  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleAttemptClose()}>
        <DialogContent className="p-0 gap-0 sm:max-w-[600px] overflow-hidden bg-white rounded-md">
          <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b">
            <DialogTitle className="text-xl font-bold">
              {isCopying 
                ? isSubCategory ? "Copy Add-on Sub Category" : "Copy Add-on Category"
                : isEditing 
                  ? isSubCategory ? "Edit Add-on Sub Category" : "Edit Add-on Category"
                  : isSubCategory ? "Create Add-on Sub Category" : "Create Add-on Category"
              }
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleAttemptClose} className="h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(80vh-130px)] p-6 space-y-6">
            {/* Add-on Details Section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{isSubCategory ? "Add-on Sub Category Details" : "Add-on Category Details"}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {isSubCategory 
                          ? "Enter the basic information for this add-on sub category, including name, code, sequence, and status."
                          : "Enter the basic information for this add-on category, including name, code, sequence, and status."}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                checked={addOnDetailsEnabled}
                onCheckedChange={setAddOnDetailsEnabled}
                className="data-[state=checked]:bg-[#1162a8]"
              />
            </div>

            {addOnDetailsEnabled && (
              <div className="space-y-4">
                {isSubCategory && (
                  <SearchableSelect
                    value={formData.parentCategoryId}
                    onValueChange={(value) => handleInputChange("parentCategoryId", value)}
                    placeholder="Select Parent Category *"
                    className="h-12"
                    disabled={isLoadingCategoriesForSelect}
                    options={
                      isLoadingCategoriesForSelect
                        ? []
                        : addOnCategoriesForSelect.map((category) => ({
                            value: category.id.toString(),
                            label: category.name,
                          }))
                    }
                    emptyMessage={
                      isLoadingCategoriesForSelect
                        ? "Loading categories..."
                        : "No parent categories available"
                    }
                    searchPlaceholder="Search categories..."
                  />
                )}
                <Input
                  placeholder={isSubCategory ? "Sub-Category Name *" : "Category Name *"}
                  className="h-12"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  validationState={formData.name.trim() ? "valid" : "default"}
                  required
                />
                <Input
                  placeholder={isSubCategory ? "Sub-Category Code" : "Category Code"}
                  className="h-12"
                  value={formData.code}
                  onChange={(e) => handleInputChange("code", e.target.value)}
                  validationState={formData.code.trim() ? "valid" : "default"}
                />
                <Input
                  placeholder={isSubCategory ? "Sub-Category Sequence" : "Sequence"}
                  type="number"
                  className="h-12"
                  value={formData.sequence}
                  onChange={(e) => handleInputChange("sequence", e.target.value)}
                  validationState={formData.sequence.trim() ? "valid" : "default"}
                />
                <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                  <SelectTrigger className="h-12">
                    <SelectValue
                      placeholder={isSubCategory ? "Sub-Category Status *" : "Select Status *"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Link to Products Section */}
            {/* <Collapsible open={linkToProductsOpen} onOpenChange={setLinkToProductsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full border-t border-b py-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Link to Products</span>
                  <Info className="h-4 w-4 text-gray-400" />
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${linkToProductsOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <p className="text-gray-600 mb-4">Select products to link this add-on to.</p>
              </CollapsibleContent>
            </Collapsible> */}

            {/* Link to Existing Group Section */}
            {/* <Collapsible open={linkToExistingGroupOpen} onOpenChange={setLinkToExistingGroupOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full border-t border-b py-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Link to Existing Group</span>
                  <Info className="h-4 w-4 text-gray-400" />
                </div>
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${linkToExistingGroupOpen ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <p className="text-gray-600 mb-4">Select groups to link this add-on to.</p>
              </CollapsibleContent>
            </Collapsible> */}

            {/* Visibility Management Section */}
            {/* <Collapsible open={visibilityManagementOpen} onOpenChange={setVisibilityManagementOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full border-t border-b py-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Visibility Management</span>
                  <Info className="h-4 w-4 text-gray-400" />
                </div>
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${visibilityManagementOpen ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <p className="text-gray-600 mb-4">Manage which labs can see this add-on.</p>
              </CollapsibleContent>
            </Collapsible> */}
          </div>

          {/* Footer with action buttons */}
          <div className="px-6 py-4 flex justify-end gap-3 border-t">
            <Button variant="destructive" onClick={handleAttemptClose}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleSave}
              disabled={!isFormValid || showAnimation || isDetailLoading}
            >
              {showAnimation || isDetailLoading
                ? (isCopying ? "Copying..." : "Saving...")
                : isCopying
                    ? isSubCategory ? "Copy Sub Category" : "Copy Category"
                    : isEditing
                      ? isSubCategory ? "Update Sub Category" : "Update Category"
                      : isSubCategory ? "Create Sub Category" : "Create Category"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showDiscardDialog && (
        <DiscardChangesDialog
          isOpen={showDiscardDialog}
          type="add-on"
          onDiscard={handleActualDiscard}
          onKeepEditing={handleKeepEditing}
        />
      )}
    </>
  )
}
