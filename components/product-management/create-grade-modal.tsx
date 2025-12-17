"use client"

import { useState, useEffect, useRef } from "react"
import { X, ChevronDown, Info } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useGrades, type GradePayload, type Grade } from "@/contexts/product-grades-context"
import { DiscardChangesDialog } from "./discard-changes-dialog"
import { generateCodeFromName } from "@/lib/utils"

interface CreateGradeModalProps {
  isOpen: boolean
  onClose: () => void
  editingGrade?: Grade | null
  editId?: number // Add editId prop for fetching grade details
  onSave?: (data: Partial<GradePayload>) => Promise<void>
  role?: string // Add role prop
  isCopying?: boolean // Flag to indicate if we're copying a grade
}

export function CreateGradeModal({ isOpen, onClose, editingGrade, editId, onSave, role, isCopying = false }: CreateGradeModalProps) {
  const { createGrade, updateGrade, fetchGradeDetail, isLoading } = useGrades()

  const defaultFormData = {
    name: "",
    code: "",
    sequence: "",
    status: "Active",
  }

  const [formData, setFormData] = useState(defaultFormData)
  const [initialFormData, setInitialFormData] = useState(defaultFormData)
  const [hasChanges, setHasChanges] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [fetchedGrade, setFetchedGrade] = useState<Grade | null>(null)

  const [gradeDetailsEnabled, setGradeDetailsEnabled] = useState(true)
  const [linkToProductsOpen, setLinkToProductsOpen] = useState(false)
  const [linkToGroupOpen, setLinkToGroupOpen] = useState(false)

  // Image state management
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [initialImageBase64, setInitialImageBase64] = useState<string | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Determine if fields should be disabled
  const currentGrade = editingGrade || fetchedGrade
  const shouldDisableFields =
    !!currentGrade &&
    role === "lab_admin" &&
    currentGrade.is_custom === "No"

  // Fetch grade details when editing with editId
  useEffect(() => {
    if (isOpen && editId && !isCopying) {
      // Editing: always fetch detail from API when editId is provided
      console.log("Fetching grade detail for editId:", editId)
      setIsDetailLoading(true)
      
      fetchGradeDetail(editId)
        .then((gradeDetail) => {
          console.log("Fetched grade detail:", gradeDetail)
          if (gradeDetail) {
            setFetchedGrade(gradeDetail)
            // Handle nested structure for lab grades (grade data is in gradeDetail.grade)
            // or flat structure for regular grades
            const gradeData = (gradeDetail as any).grade || gradeDetail
            const newFormData = {
              name: gradeData.name || "",
              code: gradeData.code || "",
              sequence: gradeData.sequence?.toString() || "",
              status: (gradeDetail as any).status || gradeData.status || "Active",
            }
            // Set form data
            setFormData(newFormData)
            setInitialFormData(newFormData)
            // Set image if available (check both nested and flat structure)
            const imageUrl = gradeData.image_url || (gradeDetail as any).image_url
            if (imageUrl) {
              setImageBase64(imageUrl)
              setImagePreview(imageUrl)
              setInitialImageBase64(imageUrl)
            } else {
              setImageBase64(null)
              setImagePreview(null)
              setInitialImageBase64(null)
            }
            console.log("Form data updated with:", newFormData)
          } else {
            console.warn("No grade detail returned from API")
          }
          setIsDetailLoading(false)
        })
        .catch((error) => {
          console.error("Error fetching grade detail:", error)
          setIsDetailLoading(false)
        })
    } else if (isOpen && editingGrade && isCopying) {
      // Copying: use the provided editingGrade data directly (no API call needed)
      // Generate a unique code by appending timestamp to avoid conflicts
      const timestamp = Date.now().toString().slice(-6) // Last 6 digits of timestamp
      const uniqueCode = editingGrade.code 
        ? `${editingGrade.code}_COPY_${timestamp}` 
        : `GRADE_${timestamp}`
      
      setFetchedGrade(editingGrade)
      setFormData({
        name: editingGrade.name ? `${editingGrade.name} (Copy)` : "",
        code: uniqueCode,
        sequence: editingGrade.sequence?.toString() || "",
        status: editingGrade.status || "Active",
      })
      setInitialFormData({
        name: editingGrade.name ? `${editingGrade.name} (Copy)` : "",
        code: uniqueCode,
        sequence: editingGrade.sequence?.toString() || "",
        status: editingGrade.status || "Active",
      })
      // Set image if available
      if (editingGrade.image_url) {
        setImageBase64(editingGrade.image_url)
        setImagePreview(editingGrade.image_url)
        setInitialImageBase64(editingGrade.image_url)
      } else {
        setImageBase64(null)
        setImagePreview(null)
        setInitialImageBase64(null)
      }
    } else if (isOpen && editingGrade && !isCopying) {
      // Editing: Use provided editingGrade if available
      setFetchedGrade(editingGrade)
      setFormData({
        name: editingGrade.name || "",
        code: editingGrade.code || "",
        sequence: editingGrade.sequence?.toString() || "",
        status: editingGrade.status || "Active",
      })
      setInitialFormData({
        name: editingGrade.name || "",
        code: editingGrade.code || "",
        sequence: editingGrade.sequence?.toString() || "",
        status: editingGrade.status || "Active",
      })
      // Set image if available
      if (editingGrade.image_url) {
        setImageBase64(editingGrade.image_url)
        setImagePreview(editingGrade.image_url)
        setInitialImageBase64(editingGrade.image_url)
      } else {
        setImageBase64(null)
        setImagePreview(null)
        setInitialImageBase64(null)
      }
    }
  }, [isOpen, editId, editingGrade, fetchGradeDetail, isCopying])

  // Reset image when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setImageBase64(null)
      setImagePreview(null)
      setInitialImageBase64(null)
      setFetchedGrade(null)
      setIsDetailLoading(false)
      // Reset form when modal closes
      setFormData(defaultFormData)
      setInitialFormData(defaultFormData)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      // Only reset form if we're creating a new grade (no editId and no editingGrade)
      // Don't reset if we're loading details or have fetched grade data
      if (!editId && !editingGrade && !fetchedGrade && !isDetailLoading) {
        // Reset form for new grade creation
        setFormData(defaultFormData)
        setInitialFormData(defaultFormData)
        setImageBase64(null)
        setImagePreview(null)
        setInitialImageBase64(null)
      }
      setHasChanges(false)
      setShowDiscardDialog(false)
      setGradeDetailsEnabled(true)
      setLinkToProductsOpen(false)
      setLinkToGroupOpen(false)
    }
  }, [isOpen, editId, editingGrade, fetchedGrade, isDetailLoading])

  useEffect(() => {
    const formChanged = JSON.stringify(formData) !== JSON.stringify(initialFormData)
    const imageChanged = imageBase64 !== initialImageBase64
    setHasChanges(formChanged || imageChanged)
  }, [formData, initialFormData, imageBase64, initialImageBase64])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      }
      // Auto-generate code from name when name changes
      if (field === "name") {
        const generatedCode = generateCodeFromName(value)
        if (generatedCode) {
          updated.code = generatedCode
        }
      }
      return updated
    })
  }

  const handleAttemptClose = () => {
    if (hasChanges) {
      setShowDiscardDialog(true)
    } else {
      onClose()
    }
  }

  const handleDiscard = () => {
    setShowDiscardDialog(false)
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
    if (!isFormValid) {
      console.warn("Form is invalid. Cannot save.")
      return
    }
    try {
      const payload = {
        name: formData.name,
        code: formData.code,
        sequence: Number.parseInt(formData.sequence),
        status: formData.status as "Active" | "Inactive",
        ...(imageBase64 && { image: imageBase64 }),
      }

      // If copying, always create a new grade (not update)
      if (isCopying) {
        // Create new grade (copy)
        const success = await createGrade(payload)
        if (success) {
          setHasChanges(false)
          onClose()
        } else {
          console.error("Failed to create grade. createGrade returned false.")
        }
      } else if (editId || editingGrade || fetchedGrade) {
        // Editing: call updateGrade API directly
        const gradeId = editId || editingGrade?.id || fetchedGrade?.id
        if (!gradeId) {
          console.error("No grade ID available for update")
          return
        }
        
        // Only include image in payload if it has changed
        const finalPayload = imageBase64 !== initialImageBase64 
          ? payload 
          : { ...payload }
        
        // Remove image from payload if it hasn't changed (to avoid unnecessary updates)
        if (imageBase64 === initialImageBase64 && finalPayload.image) {
          delete finalPayload.image
        }
        
        const success = await updateGrade(gradeId, finalPayload)
        if (success) {
          setHasChanges(false)
          onClose()
          // Call onSave callback if provided (for additional actions)
          if (onSave) {
            await onSave(finalPayload)
          }
        } else {
          console.error("Failed to update grade. updateGrade returned false.")
        }
      } else {
        // Create new grade
        const success = await createGrade(payload)
        if (success) {
          setHasChanges(false)
          onClose()
        } else {
          console.error("Failed to create grade. createGrade returned false.")
        }
      }
    } catch (error) {
      console.error("Error saving grade:", error)
    }
  }

  const isFormValid =
    formData.name.trim() !== "" &&
    formData.code.trim() !== "" &&
    formData.sequence.trim() !== "" &&
    !isNaN(Number.parseInt(formData.sequence)) &&
    formData.status.trim() !== ""

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleAttemptClose()
          }
        }}
      >
        <DialogContent className="p-0 gap-0 w-[95vw] sm:w-[90vw] md:w-[85vw] max-w-[700px] overflow-hidden bg-white rounded-md">
          <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b">
            <DialogTitle className="text-xl font-bold">
              {isCopying ? "Copy Grade" : (editingGrade || fetchedGrade) ? "Edit Grade" : "Create Grade"}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleAttemptClose} className="h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(80vh-65px)] p-6 space-y-6">
            {isDetailLoading ? (
              <div className="text-center py-8 text-gray-500">Loading grade details...</div>
            ) : (
              <>
                <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">Grade Details</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px]">
                      <p>Configure the basic information and properties for this grade.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                checked={gradeDetailsEnabled}
                onCheckedChange={setGradeDetailsEnabled}
                className="data-[state=checked]:bg-[#1162a8]"
                disabled={shouldDisableFields}
              />
            </div>
            {gradeDetailsEnabled && (
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
                        disabled={shouldDisableFields || isDetailLoading}
                      />
                    </div>
                    <span className="text-xs text-gray-500 text-center max-w-[140px]">
                      Click to upload grade image
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
                    <Input
                      label="Grade Name"
                      value={formData.name || ""}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      validationState={formData.name ? "valid" : "default"}
                      required
                      disabled={shouldDisableFields || isDetailLoading}
                    />
                    <Input
                      label="Grade Code"
                      value={formData.code || ""}
                      onChange={(e) => handleInputChange("code", e.target.value)}
                      validationState={formData.code ? "valid" : "default"}
                      required
                      disabled={shouldDisableFields || isDetailLoading}
                    />
                    <Input
                      label="Sequence"
                      type="number"
                      value={formData.sequence || ""}
                      onChange={(e) => handleInputChange("sequence", e.target.value)}
                      validationState={formData.sequence ? "valid" : "default"}
                      required
                      disabled={shouldDisableFields || isDetailLoading}
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Status</label>
                      <Select
                        value={formData.status || "Active"}
                        onValueChange={(value) => handleInputChange("status", value)}
                        disabled={shouldDisableFields || isDetailLoading}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select Status *" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}
              </>
            )}
          </div>

          <div className="px-6 py-4 flex justify-end gap-3 border-t">
            <Button
              variant="destructive"
              onClick={handleAttemptClose}
              className="bg-red-600 hover:bg-red-700"
              disabled={shouldDisableFields}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isFormValid || isLoading || isDetailLoading || shouldDisableFields}
              className="bg-[#1162a8] hover:bg-[#0d4d87] disabled:opacity-50"
            >
              {isLoading 
                ? (isCopying ? "Copying..." : (editingGrade || fetchedGrade) ? "Saving..." : "Creating...") 
                : (isCopying ? "Copy Grade" : (editingGrade || fetchedGrade) ? "Save Changes" : "Save Grade")}
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
                alt="Grade Preview"
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

      <DiscardChangesDialog
        isOpen={showDiscardDialog}
        type="grade"
        onDiscard={handleDiscard}
        onKeepEditing={handleKeepEditing}
      />
    </>
  )
}
