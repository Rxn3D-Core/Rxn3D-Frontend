"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAddOns, type AddOn } from "@/contexts/product-add-on-context"
import { useAuth } from "@/contexts/auth-context"
import { DiscardChangesDialog } from "./discard-changes-dialog"
import { generateCodeFromName } from "@/lib/utils"

interface AddAddOnModalProps {
  isOpen: boolean
  onClose: () => void
  onHasChangesChange: (hasChanges: boolean) => void
  addOn?: AddOn | null
  isEditing?: boolean
  isCopying?: boolean
}

export function AddAddOnModal({ isOpen, onClose, onHasChangesChange, addOn, isEditing = false, isCopying = false }: AddAddOnModalProps) {
  const {
    addOnCategoriesForSelect,
    fetchAddOnCategoriesForSelect,
    isLoadingCategoriesForSelect,
    createAddOn,
    updateAddOn,
    createAddOnSubCategory,
    showAnimation,
    triggerAnimation,
  } = useAddOns()

  const { user } = useAuth()
  const userRole = localStorage.getItem("role")
  const isLabAdmin = userRole === "lab_admin"
  const isSuperAdmin = userRole === "super_admin"

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

  // Image state management
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [initialImage, setInitialImage] = useState<string | null>(null)

  const [addOnDetailsEnabled, setAddOnDetailsEnabled] = useState(true)
  const [linkToProductsOpen, setLinkToProductsOpen] = useState(false)
  const [linkToExistingGroupOpen, setLinkToExistingGroupOpen] = useState(false)
  const [visibilityManagementOpen, setVisibilityManagementOpen] = useState(false)

  // Discard dialog states
  const [hasChanges, setHasChanges] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)

  // Validation error state
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({})

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (addOn && (isEditing || isCopying)) {
        const editData = {
          name: addOn.name,
          code: addOn.code || "",
          price: addOn.price?.toString() || "",
          type: addOn.type || "Both",
          status: addOn.status,
          sequence: addOn.sequence?.toString() || "",
          subcategory_id: addOn.subcategory_id?.toString() || "",
          createNewSubCategory: false,
          parentCategoryId: "",
        }
        setFormData(editData)
        setInitialFormData(editData)
        
        // Set image if available
        const imageUrl = (addOn as any).image_url || (addOn as any).image
        if (imageUrl) {
          setImageBase64(imageUrl)
          setImagePreview(imageUrl)
          setInitialImage(imageUrl)
        } else {
          setImageBase64(null)
          setImagePreview(null)
          setInitialImage(null)
        }
      } else {
        setFormData(defaultFormData)
        setInitialFormData(defaultFormData)
        setImageBase64(null)
        setImagePreview(null)
        setInitialImage(null)
      }
      setHasChanges(false)
      if (onHasChangesChange) onHasChangesChange(false)
      setAddOnDetailsEnabled(true)
      setLinkToProductsOpen(false)
      setLinkToExistingGroupOpen(false)
      setVisibilityManagementOpen(false)
    }
  }, [isOpen, addOn, isEditing, isCopying, onHasChangesChange])

  // Fetch categories when modal opens
  useEffect(() => {
    if (isOpen && !addOnCategoriesForSelect.length) {
      fetchAddOnCategoriesForSelect()
    }
  }, [isOpen, addOnCategoriesForSelect, fetchAddOnCategoriesForSelect])

  // Track changes for discard dialog
  useEffect(() => {
    const formChanged = JSON.stringify(formData) !== JSON.stringify(initialFormData)
    const imageChanged = imageBase64 !== initialImage
    const changed = formChanged || imageChanged
    setHasChanges(changed)
    if (onHasChangesChange) {
      onHasChangesChange(changed)
    }
  }, [formData, initialFormData, imageBase64, initialImage, onHasChangesChange])

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

  // Image handling functions
  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
        setImageBase64(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
      setImageBase64(null)
    }
    // Clear the input value to allow re-selecting the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setImageBase64(null)
    // Clear the file input value
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handlePreviewClick = () => {
    if (imagePreview) setShowPreviewModal(true)
  }

  const handleSave = async () => {
    let errors: { [key: string]: string } = {}

    // Validate required fields
    if (!formData.name.trim()) errors.name = "Name is required."
    if (!formData.code.trim()) errors.code = "Code is required."
    if (!formData.status.trim()) errors.status = "Status is required."
    if (!formData.type.trim()) errors.type = "Type is required."
    if (formData.sequence === "" || isNaN(Number(formData.sequence))) errors.sequence = "Sequence is required."
    if (isLabAdmin && !formData.price) errors.price = "Price is required."
    if (!isLabAdmin && formData.createNewSubCategory && !formData.parentCategoryId) {
      errors.parentCategoryId = "Parent Category is required."
    }
    if (
      !formData.createNewSubCategory &&
      (!formData.subcategory_id || formData.subcategory_id === "" || isNaN(Number(formData.subcategory_id)))
    ) {
      errors.subcategory_id = "Sub-category is required."
    }

    setValidationErrors(errors)
    if (Object.keys(errors).length > 0) return

    let finalSubcategoryId: number | null = null

    if (formData.createNewSubCategory) {
      // Create new subcategory first
      if (!formData.name.trim() || !formData.parentCategoryId) {
        triggerAnimation("error", "Sub-category name and parent category are required.")
        return
      }

      const newSubCategory = await createAddOnSubCategory({
        name: formData.name,
        code: formData.code,
        category_id: Number(formData.parentCategoryId),
        type: formData.type as "Upper" | "Lower" | "Both",
        sequence: Number(formData.sequence) || 0,
        status: formData.status as "Active" | "Inactive",
      })

      if (!newSubCategory) {
        return // Error handled by context
      }

      finalSubcategoryId = newSubCategory.id
    } else {
      // Always require a valid subcategory_id for add-on creation
      if (!formData.subcategory_id || formData.subcategory_id === "" || isNaN(Number(formData.subcategory_id))) {
        triggerAnimation("error", "Sub-category is required.")
        return
      }
      finalSubcategoryId = Number(formData.subcategory_id)
    }

    // Create or update the add-on
    const payload: any = {
      name: formData.createNewSubCategory ? `${formData.name} Add-on` : formData.name,
      code: formData.code,
      type: formData.type as "Upper" | "Lower" | "Both",
      status: formData.status as "Active" | "Inactive",
      sequence: formData.sequence !== "" ? Number.parseInt(formData.sequence) : 0,
      subcategory_id: finalSubcategoryId,
      ...(imageBase64 && { image: imageBase64 }),
    }
    if (isLabAdmin) {
      payload.price = formData.price !== "" ? Number.parseFloat(formData.price) : null
    }

    try {
      let success = false
      // If copying, always create a new add-on (not update)
      if (isEditing && addOn && !isCopying) {
        success = !!(await updateAddOn(addOn.id, payload))
      } else {
        success = !!(await createAddOn(payload))
      }

      if (success) {
        setHasChanges(false)
        if (onHasChangesChange) onHasChangesChange(false)
        onClose()
      }
    } catch (error) {
      console.error("Error saving add-on:", error)
    }
  }

  const isFormValid =
    formData.name.trim() !== "" &&
    formData.status.trim() !== "" && formData.createNewSubCategory ? formData.parentCategoryId.trim() !== "" : true
  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleAttemptClose()}>
        <DialogContent className="p-0 gap-0 sm:max-w-[600px] overflow-hidden bg-white rounded-md">
          <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b">
            <DialogTitle className="text-xl font-bold">
              {isCopying ? "Copy Add-on" : isEditing ? "Edit Add-on" : "Create Add-on"}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleAttemptClose} className="h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(80vh-130px)] p-6 space-y-6">
            {/* Add-on Details Section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">Add-on Details</span>
                <Info className="h-4 w-4 text-gray-400" />
              </div>
              <Switch
                checked={addOnDetailsEnabled}
                onCheckedChange={setAddOnDetailsEnabled}
                className="data-[state=checked]:bg-[#1162a8]"
              />
            </div>

            {addOnDetailsEnabled && (
              <div className="space-y-4">
                {/* Image Upload Section */}
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 h-[140px] w-[140px] bg-gradient-to-br from-gray-50 to-gray-100 hover:border-gray-400 hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200 transition-all duration-200 cursor-pointer group"
                      onClick={handleImageClick}
                    >
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="object-cover h-full w-full rounded-xl"
                        />
                      ) : (
                        <div className="flex flex-col items-center text-gray-500 group-hover:text-gray-600">
                          <i className="fas fa-cloud-upload-alt text-3xl mb-2"></i>
                          <span className="text-xs font-medium">Upload Image</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={handleImageChange}
                      />
                    </div>
                    <span className="text-xs text-gray-500 text-center max-w-[140px]">
                      Click to upload add-on image
                    </span>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={handlePreviewClick}
                        disabled={!imagePreview}
                      >
                        Preview Image
                      </Button>
                      {imagePreview && (
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={handleRemoveImage}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Form fields on the right */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <Input
                        placeholder={formData.createNewSubCategory ? "Sub-Category Name *" : "Add-on Name *"}
                        className="h-12"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        validationState={validationErrors.name ? "error" : (formData.name.trim() ? "valid" : "default")}
                        required
                      />
                      {validationErrors.name && (
                        <div className="text-red-500 text-xs mt-1">{validationErrors.name}</div>
                      )}
                    </div>
                    <div>
                      <Input
                        placeholder={formData.createNewSubCategory ? "Sub-Category Code" : "Add-on Code"}
                        className="h-12"
                        value={formData.code}
                        onChange={(e) => handleInputChange("code", e.target.value)}
                        validationState={validationErrors.code ? "error" : (formData.code.trim() ? "valid" : "default")}
                      />
                      {validationErrors.code && (
                        <div className="text-red-500 text-xs mt-1">{validationErrors.code}</div>
                      )}
                    </div>
                    {/* Show price input only for lab_admin and NOT when creating a subcategory */}
                    {isLabAdmin && !formData.createNewSubCategory && (
                      <div>
                        <Input
                          placeholder="Add-on Price"
                          type="number"
                          className="h-12"
                          value={formData.price}
                          onChange={(e) => handleInputChange("price", e.target.value)}
                          validationState={validationErrors.price ? "error" : (formData.price.trim() ? "valid" : "default")}
                        />
                        {validationErrors.price && (
                          <div className="text-red-500 text-xs mt-1">{validationErrors.price}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* Sub-Category Section */}
                <div className="space-y-4">
                  {/* Only show the checkbox and label if NOT lab admin */}
                  {!isLabAdmin && isSuperAdmin && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="createNewSubCategory"
                        checked={formData.createNewSubCategory}
                        onCheckedChange={(checked) => {
                          handleInputChange("createNewSubCategory", checked as boolean)
                          if (checked) {
                            handleInputChange("subcategory_id", "")
                          } else {
                            handleInputChange("parentCategoryId", "")
                          }
                        }}
                      />
                      <Label htmlFor="createNewSubCategory" className="text-sm font-medium">
                        Nest Sub Category Under:
                      </Label>
                    </div>
                  )}

                  {/* Only require/select parent category if NOT lab admin and creating a new subcategory */}
                  {!isLabAdmin && formData.createNewSubCategory && (
                    <div>
                      <Select
                        value={formData.parentCategoryId}
                        onValueChange={(value) => handleInputChange("parentCategoryId", value)}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select Parent Category *" />
                        </SelectTrigger>
                        <SelectContent>
                          {addOnCategoriesForSelect.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {validationErrors.parentCategoryId && (
                        <div className="text-red-500 text-xs mt-1">{validationErrors.parentCategoryId}</div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <RadioGroup
                    value={formData.type}
                    onValueChange={(value) => handleInputChange("type", value)}
                    className="flex flex-row gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="Upper"
                        id="type-upper"
                        className="data-[state=checked]:border-[#1162a8] data-[state=checked]:text-[#1162a8]"
                      />
                      <label htmlFor="type-upper" className="text-sm font-medium cursor-pointer">
                        Upper
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="Lower"
                        id="type-lower"
                        className="data-[state=checked]:border-[#1162a8] data-[state=checked]:text-[#1162a8]"
                      />
                      <label htmlFor="type-lower" className="text-sm font-medium cursor-pointer">
                        Lower
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="Both"
                        id="type-both"
                        className="data-[state=checked]:border-[#1162a8] data-[state=checked]:text-[#1162a8]"
                      />
                      <label htmlFor="type-both" className="text-sm font-medium cursor-pointer">
                        Both
                      </label>
                    </div>
                  </RadioGroup>
                  {validationErrors.type && (
                    <div className="text-red-500 text-xs mt-1">{validationErrors.type}</div>
                  )}
                </div>
                <div>
                  <Input
                    placeholder={formData.createNewSubCategory ? "Sub-Category Sequence" : "Sequence"}
                    type="number"
                    className="h-12"
                    value={formData.sequence}
                    onChange={(e) => handleInputChange("sequence", e.target.value)}
                    validationState={validationErrors.sequence ? "error" : (formData.sequence.trim() ? "valid" : "default")}
                  />
                  {validationErrors.sequence && (
                    <div className="text-red-500 text-xs mt-1">{validationErrors.sequence}</div>
                  )}
                </div>
                <div>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                    <SelectTrigger className="h-12">
                      <SelectValue
                        placeholder={formData.createNewSubCategory ? "Sub-Category Status *" : "Select Status *"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.status && (
                    <div className="text-red-500 text-xs mt-1">{validationErrors.status}</div>
                  )}
                </div>
                {/* Subcategory select for add-on (not subcategory creation) */}
                {!formData.createNewSubCategory && (
                  <div>
                    <SearchableSelect
                      value={formData.subcategory_id}
                      onValueChange={(value) => handleInputChange("subcategory_id", value)}
                      placeholder="Select Sub-Category *"
                      className="h-12"
                      options={allSubcategories.map((sub) => ({
                        value: sub.id.toString(),
                        label: `${sub.name} (${sub.categoryName})`,
                      }))}
                      emptyMessage="No sub-categories found."
                      searchPlaceholder="Search sub-categories..."
                    />
                    {validationErrors.subcategory_id && (
                      <div className="text-red-500 text-xs mt-1">{validationErrors.subcategory_id}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          
          </div>

          {/* Footer with action buttons */}
          <div className="px-6 py-4 flex justify-end gap-3 border-t">
            <Button variant="destructive" onClick={handleAttemptClose}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleSave}
              disabled={!isFormValid || showAnimation}
            >
              {showAnimation
                ? "Saving..."
                : isCopying
                  ? "Copy Add-on"
                  : isEditing
                    ? "Update Add-on"
                    : formData.createNewSubCategory
                      ? "Create Sub-Category & Add-on"
                      : "Save Add-on"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent
          className="flex flex-col items-center justify-center p-0"
          style={{
            width: "100vw",
            height: "100vh",
            maxWidth: "100vw",
            maxHeight: "100vh",
            borderRadius: 0,
            boxShadow: "none",
          }}
        >
          <div className="relative w-full h-full flex items-center justify-center bg-black bg-opacity-90">
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Add-on Preview"
                className="max-w-full max-h-full object-contain"
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPreviewModal(false)}
              className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20"
            >
              <X className="h-6 w-6" />
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
