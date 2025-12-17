"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, ChevronDown, Info } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useImpressions, Impression } from "@/contexts/product-impression-context"
import { DialogTitle } from "@radix-ui/react-dialog"
import { generateCodeFromName } from "@/lib/utils"

interface CreateImpressionModalProps {
  isOpen: boolean
  onClose: () => void
  onChanges: (hasChanges: boolean) => void
  impression?: Impression | null
  mode?: "create" | "edit"
  isCopying?: boolean // Flag to indicate if we're copying an impression
}

export function CreateImpressionModal({ isOpen, onClose, onChanges, impression, mode = "create", isCopying = false }: CreateImpressionModalProps) {
  const { createImpression, updateImpression, isLoading, impressions } = useImpressions()
  const [impressionDetailsEnabled, setImpressionDetailsEnabled] = useState(true)
  const [impressionName, setImpressionName] = useState("")
  const [impressionCode, setImpressionCode] = useState("")
  const [impressionUrl, setImpressionUrl] = useState("")
  const [showOpposingWarning, setShowOpposingWarning] = useState("yes")
  const [status, setStatus] = useState("Active")
  const [linkToProductsOpen, setLinkToProductsOpen] = useState(false)
  const [linkToGroupOpen, setLinkToGroupOpen] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  
  // Image upload state
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)


  // Track changes
  useEffect(() => {
    const hasChanges = impressionName.trim() !== "" || impressionCode.trim() !== "" || impressionUrl.trim() !== "" || selectedImage !== null
    onChanges(hasChanges)
  }, [impressionName, impressionCode, impressionUrl, selectedImage, onChanges])

  // Validate URL field in real-time - required if showOpposingWarning is "yes"
  const validateUrlField = useCallback(() => {
    // URL is required when "Show opposing warning scan?" is "Yes"
    if (showOpposingWarning === "yes") {
      if (!impressionUrl.trim()) {
        setErrors((prev) => ({ ...prev, impressionUrl: "URL is required when 'Show opposing warning scan?' is Yes" }))
      } else {
        const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/
        if (!urlPattern.test(impressionUrl.trim())) {
          setErrors((prev) => ({ ...prev, impressionUrl: "Please enter a valid URL (e.g., https://example.com)" }))
        } else {
          setErrors((prev) => {
            const newErrors = { ...prev }
            delete newErrors.impressionUrl
            return newErrors
          })
        }
      }
    } else {
      // URL is optional when "Show opposing warning scan?" is "No", only validate format if provided
      if (impressionUrl.trim()) {
        const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/
        if (!urlPattern.test(impressionUrl.trim())) {
          setErrors((prev) => ({ ...prev, impressionUrl: "Please enter a valid URL (e.g., https://example.com)" }))
        } else {
          setErrors((prev) => {
            const newErrors = { ...prev }
            delete newErrors.impressionUrl
            return newErrors
          })
        }
      } else {
        // Clear error if URL is empty (since it's optional when showOpposingWarning is "no")
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors.impressionUrl
          return newErrors
        })
      }
    }
  }, [impressionUrl, showOpposingWarning])

  // Re-validate URL when showOpposingWarning changes
  useEffect(() => {
    if (isOpen) {
      // If switching to "yes" and URL is empty, show error immediately
      if (showOpposingWarning === "yes" && !impressionUrl.trim()) {
        setErrors((prev) => ({ ...prev, impressionUrl: "URL is required when 'Show opposing warning scan?' is Yes" }))
      } else {
        validateUrlField()
      }
    }
  }, [showOpposingWarning, isOpen, validateUrlField, impressionUrl])

  // Reset form when modal opens or impression changes
  useEffect(() => {
    if (isOpen) {
      if (isCopying && impression) {
        // Copying: use the provided impression data directly (no API call needed)
        // Add "Copy" to the name if it doesn't already contain it
        const originalName = impression.name || ""
        const copiedName = originalName.includes("Copy") ? originalName : `${originalName} Copy`
        setImpressionName(copiedName)
        setImpressionCode(impression.code || "")
        setImpressionUrl(impression.url || "")
        setSelectedImage(impression.image_url || null)
        setImpressionDetailsEnabled(true)
        setShowOpposingWarning(impression.is_digital_impression?.toLowerCase() === "yes" ? "yes" : "no")
        setStatus(impression.status || "Active")
      } else if (mode === "edit" && impression && !isCopying) {
        // Editing: use the provided impression data
        setImpressionName(impression.name || "")
        setImpressionCode(impression.code || "")
        setImpressionUrl(impression.url || "")
        setSelectedImage(impression.image_url || null)
        setImpressionDetailsEnabled(true)
        setShowOpposingWarning(impression.is_digital_impression?.toLowerCase() === "yes" ? "yes" : "no")
        setStatus(impression.status || "Active")
      } else {
        // New impression: reset form
        setImpressionCode("")
        setImpressionName("")
        setImpressionUrl("")
        setSelectedImage(null)
        setImpressionDetailsEnabled(true)
        setShowOpposingWarning("yes")
        setStatus("Active")
      }
      setImageFile(null)
      setLinkToProductsOpen(false)
      setLinkToGroupOpen(false)
      setErrors({})
    }
  }, [isOpen, impression, mode, isCopying])

  // Image validation
  const validateImage = (file: File): string | null => {
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    
    if (file.size > maxSize) {
      return "Image size must be less than 5MB"
    }
    
    if (!allowedTypes.includes(file.type)) {
      return "Only JPEG, PNG, GIF, and WebP images are allowed"
    }
    
    return null
  }

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  // Convert image URL to base64
  const urlToBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(blob)
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = error => reject(error)
      })
    } catch (error) {
      throw new Error("Failed to convert image URL to base64")
    }
  }

  // Check if string is base64 data URL
  const isBase64 = (str: string | null): boolean => {
    return str !== null && str.startsWith("data:image/")
  }

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    const validationError = validateImage(file)
    if (validationError) {
      setErrors(prev => ({ ...prev, image: validationError }))
      return
    }

    try {
      const base64 = await fileToBase64(file)
      setSelectedImage(base64)
      setImageFile(file)
      setErrors(prev => ({ ...prev, image: "" }))
    } catch (error) {
      setErrors(prev => ({ ...prev, image: "Failed to process image" }))
    }
  }

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  // Remove selected image
  const removeImage = () => {
    setSelectedImage(null)
    setImageFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!impressionName.trim()) {
      newErrors.impressionName = "Impression name is required"
    }

    if (!impressionCode.trim()) {
      newErrors.impressionCode = "Impression code is required"
    } else {
      // Check if code already exists in cache (case-insensitive)
      const codeExists = impressions.some(
        (imp) => 
          imp.code.toLowerCase().trim() === impressionCode.toLowerCase().trim() &&
          // Exclude current impression when editing
          (mode !== "edit" || imp.id !== impression?.id)
      )
      
      if (codeExists) {
        newErrors.impressionCode = "This code is already taken. Please use a different code."
      }
    }

    // URL validation - required if showOpposingWarning is "yes", optional otherwise
    if (showOpposingWarning === "yes") {
      if (!impressionUrl.trim()) {
        newErrors.impressionUrl = "URL is required when 'Show opposing warning scan?' is Yes"
      } else {
        const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/
        if (!urlPattern.test(impressionUrl.trim())) {
          newErrors.impressionUrl = "Please enter a valid URL (e.g., https://example.com)"
        }
      }
    } else if (impressionUrl.trim()) {
      // Only validate format if URL is provided (when showOpposingWarning is "no")
      const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/
      if (!urlPattern.test(impressionUrl.trim())) {
        newErrors.impressionUrl = "Please enter a valid URL (e.g., https://example.com)"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    // When updating or copying, ensure image is in base64 format
    let imageToSend: string | undefined = selectedImage || undefined
    if ((mode === "edit" || isCopying) && imageToSend && !isBase64(imageToSend)) {
      try {
        imageToSend = await urlToBase64(imageToSend)
      } catch (error) {
        console.error("Error converting image to base64:", error)
        setErrors(prev => ({ ...prev, image: "Failed to process image" }))
        return
      }
    }

    const payload = {
      name: impressionName.trim(),
      code: impressionCode.trim(),
      sequence: 1,
      // URL is optional - only include if provided
      url: impressionUrl.trim() || undefined,
      image: imageToSend,
      is_digital_impression: showOpposingWarning === "yes" ? "Yes" : "No",
      status: status,
    }

    try {
      if (mode === "edit" && impression) {
        await updateImpression(impression.id, payload)
      } else {
        await createImpression(payload)
      }
      // Reset form and errors
      setImpressionName("")
      setImpressionCode("")
      setImpressionUrl("")
      setSelectedImage(null)
      setImageFile(null)
      setStatus("Active")
      setErrors({})
      onClose()
    } catch (error: any) {
      console.error("Error saving impression:", error)
      // Handle API validation errors
      if (error?.response?.data?.errors) {
        const apiErrors = error.response.data.errors
        const newErrors: { [key: string]: string } = {}
        
        // Map API errors to form fields
        Object.entries(apiErrors).forEach(([field, messages]: [string, any]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            const fieldMap: { [key: string]: string } = {
              url: "impressionUrl",
              name: "impressionName",
              code: "impressionCode",
            }
            const formField = fieldMap[field] || field
            newErrors[formField] = messages[0] // Use first error message
          }
        })
        
        if (Object.keys(newErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...newErrors }))
        }
      }
    }
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 gap-0 w-[95vw] sm:w-[90vw] md:w-[85vw] max-w-[700px] max-h-[90vh] flex flex-col overflow-hidden bg-white rounded-md">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b flex-shrink-0">
          <DialogTitle className="text-base sm:text-lg font-bold">
            {isCopying ? "Copy Impression" : mode === "edit" ? "Edit Impression" : "Create Impression"}
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4">
          {/* Impression Details Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">Impression Details</span>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="rounded-full bg-gray-200 text-gray-600 w-5 h-5 flex items-center justify-center text-xs cursor-help hover:bg-gray-300 transition-colors">
                      ?
                    </div>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="right" 
                    align="start"
                    sideOffset={8}
                    className="max-w-xs z-50"
                    avoidCollisions={true}
                  >
                    <p>Configure the basic information and properties for this impression, including name, code, URL, image, and status settings.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              checked={impressionDetailsEnabled}
              onCheckedChange={setImpressionDetailsEnabled}
              className="data-[state=checked]:bg-[#1162a8]"
            />
          </div>

          {impressionDetailsEnabled && (
            <div className="space-y-4">
              {/* Image Upload Section - Moved to top left */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 lg:gap-8">
                <div className="flex flex-col items-center sm:items-start gap-3">
                  <div
                    className={`flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-6 h-[120px] w-[120px] sm:h-[140px] sm:w-[140px] bg-gradient-to-br from-gray-50 to-gray-100 hover:border-gray-400 hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200 transition-all duration-200 cursor-pointer group ${
                      isDragOver ? "border-[#1162a8] bg-blue-50" : ""
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {selectedImage ? (
                      <img
                        src={selectedImage}
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
                      onChange={handleFileInputChange}
                    />
                  </div>
                  <span className="text-xs text-gray-500 text-center max-w-[140px]">
                    Click to upload impression image
                  </span>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => {
                        if (selectedImage) {
                          setShowPreviewModal(true)
                        }
                      }}
                      disabled={!selectedImage}
                    >
                      Preview Image
                    </Button>
                    {selectedImage && (
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={removeImage}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  {errors.image && <p className="text-red-500 text-xs mt-1">{errors.image}</p>}
                </div>
                
                {/* Form fields on the right */}
                <div className="flex-1 space-y-4">
                  <Input
                    label="Impression Name"
                    placeholder="Impression Name"
                    value={impressionName}
                    onChange={(e) => {
                      const newName = e.target.value
                      setImpressionName(newName)
                      // Auto-generate code from name
                      const generatedCode = generateCodeFromName(newName)
                      if (generatedCode) {
                        setImpressionCode(generatedCode)
                      }
                      if (errors.impressionName) {
                        setErrors((prev) => ({ ...prev, impressionName: "" }))
                      }
                    }}
                    validationState={errors.impressionName ? "error" : (impressionName.trim() ? "valid" : "default")}
                    errorMessage={errors.impressionName}
                    required
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="Code"
                      placeholder="Code"
                      value={impressionCode}
                      onChange={(e) => {
                        const newCode = e.target.value
                        setImpressionCode(newCode)
                        
                        // Real-time validation: check if code already exists
                        if (newCode.trim()) {
                          const codeExists = impressions.some(
                            (imp) => 
                              imp.code.toLowerCase().trim() === newCode.toLowerCase().trim() &&
                              // Exclude current impression when editing
                              (mode !== "edit" || imp.id !== impression?.id)
                          )
                          
                          if (codeExists) {
                            setErrors((prev) => ({ ...prev, impressionCode: "This code is already taken. Please use a different code." }))
                          } else {
                            // Clear error if code is no longer a duplicate
                            setErrors((prev) => {
                              const newErrors = { ...prev }
                              delete newErrors.impressionCode
                              return newErrors
                            })
                          }
                        } else {
                          // Clear error if code is empty
                          setErrors((prev) => {
                            const newErrors = { ...prev }
                            delete newErrors.impressionCode
                            return newErrors
                          })
                        }
                      }}
                      onBlur={() => {
                        // Re-validate on blur to ensure we catch any duplicates
                        if (impressionCode.trim()) {
                          const codeExists = impressions.some(
                            (imp) => 
                              imp.code.toLowerCase().trim() === impressionCode.toLowerCase().trim() &&
                              // Exclude current impression when editing
                              (mode !== "edit" || imp.id !== impression?.id)
                          )
                          
                          if (codeExists) {
                            setErrors((prev) => ({ ...prev, impressionCode: "This code is already taken. Please use a different code." }))
                          } else {
                            // Clear error if code is no longer a duplicate
                            setErrors((prev) => {
                              const newErrors = { ...prev }
                              delete newErrors.impressionCode
                              return newErrors
                            })
                          }
                        }
                      }}
                      validationState={errors.impressionCode ? "error" : (impressionCode.trim() ? "valid" : "default")}
                      errorMessage={errors.impressionCode}
                      required
                    />
                    <div className="relative">
                      <Input
                        label={`URL${showOpposingWarning === "yes" ? " *" : ""}`}
                        placeholder={showOpposingWarning === "yes" ? "https://example.com" : "https://example.com (optional)"}
                        value={impressionUrl}
                        validationState={
                          errors.impressionUrl 
                            ? "error" 
                            : (showOpposingWarning === "yes" && !impressionUrl.trim())
                            ? "error"
                            : (impressionUrl.trim() ? "valid" : "default")
                        }
                        errorMessage={
                          errors.impressionUrl 
                            ? errors.impressionUrl 
                            : (showOpposingWarning === "yes" && !impressionUrl.trim())
                            ? "URL is required when 'Show opposing warning scan?' is Yes"
                            : undefined
                        }
                        onChange={(e) => {
                          setImpressionUrl(e.target.value)
                          // Clear error when user starts typing
                          if (errors.impressionUrl) {
                            setErrors((prev) => {
                              const newErrors = { ...prev }
                              delete newErrors.impressionUrl
                              return newErrors
                            })
                          }
                        }}
                        onBlur={validateUrlField}
                        required={showOpposingWarning === "yes"}
                        aria-invalid={errors.impressionUrl || (showOpposingWarning === "yes" && !impressionUrl.trim()) ? "true" : "false"}
                        aria-describedby={errors.impressionUrl ? "url-error" : undefined}
                      />
                      <div className="absolute top-1 right-12 z-10">
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="rounded-full bg-gray-200 text-gray-600 w-4 h-4 flex items-center justify-center text-xs cursor-help hover:bg-gray-300 transition-colors">
                                ?
                              </div>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="left" 
                              align="start"
                              sideOffset={8}
                              className="max-w-xs z-50"
                              avoidCollisions={true}
                            >
                              <p>
                                {showOpposingWarning === "yes" 
                                  ? "Enter a URL link for the impression. This field is required when 'Show opposing warning scan?' is set to Yes."
                                  : "Enter a URL link for the impression. This field is optional and can be used to provide additional information or resources related to the impression."}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium">Show opposing warning scan?</p>
                    <div className="flex space-x-4">
                      <div className="flex items-center">
                        <div
                          className={`w-4 h-4 rounded-full border-2 ${
                            showOpposingWarning === "yes" ? "border-[#1162a8]" : "border-gray-300"
                          } flex items-center justify-center cursor-pointer`}
                          onClick={() => {
                            setShowOpposingWarning("yes")
                            // Re-validate URL when switching to "yes"
                            setTimeout(() => validateUrlField(), 0)
                          }}
                        >
                          {showOpposingWarning === "yes" && <div className="w-2 h-2 rounded-full bg-[#1162a8]"></div>}
                        </div>
                        <span className="ml-2 text-sm">Yes</span>
                      </div>

                      <div className="flex items-center">
                        <div
                          className={`w-4 h-4 rounded-full border-2 ${
                            showOpposingWarning === "no" ? "border-[#1162a8]" : "border-gray-300"
                          } flex items-center justify-center cursor-pointer`}
                          onClick={() => {
                            setShowOpposingWarning("no")
                            // Clear URL requirement error when switching to "no"
                            if (errors.impressionUrl && errors.impressionUrl.includes("required")) {
                              setErrors((prev) => {
                                const newErrors = { ...prev }
                                delete newErrors.impressionUrl
                                return newErrors
                              })
                            }
                          }}
                        >
                          {showOpposingWarning === "no" && <div className="w-2 h-2 rounded-full bg-[#1162a8]"></div>}
                        </div>
                        <span className="ml-2 text-sm">No</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <Select value={status} onValueChange={setStatus}>
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
        </div>

        {/* Footer with action buttons */}
        <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row justify-end gap-2 border-t flex-shrink-0 bg-white">
          <Button variant="destructive" onClick={onClose} className="bg-red-600 hover:bg-red-700 h-9 px-4 w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            className="bg-[#1162a8] h-9 px-4 w-full sm:w-auto"
            onClick={handleSubmit}
            disabled={
              isLoading ||
              !impressionName.trim() ||
              !impressionCode.trim() ||
              (showOpposingWarning === "yes" && !impressionUrl.trim()) ||
              !!errors.impressionUrl ||
              !!errors.impressionCode ||
              !!errors.image
            }
          >
            {isLoading
              ? (isCopying ? "Copying..." : mode === "edit" ? "Saving..." : "Saving...")
              : (isCopying ? "Copy Impression" : mode === "edit" ? "Save Changes" : "Save Impression")}
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
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Impression Preview"
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
    </>
  )
}
