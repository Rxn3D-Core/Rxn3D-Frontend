"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { X, Maximize2, Info, Image as ImageIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ColorPicker } from "@/components/ui/color-picker"
import { DiscardChangesDialog } from "@/components/product-management/discard-changes-dialog"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useExtractionForm } from "@/hooks/use-extractions"
import { CreateExtractionSchema } from "@/lib/schemas"
import { generateCodeFromName } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  Tooltip as HelpTooltip,
  TooltipContent as HelpTooltipContent,
  TooltipProvider as HelpTooltipProvider,
  TooltipTrigger as HelpTooltipTrigger,
} from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GlobalExtractionToothImagesPanel } from "@/components/product-management/global-extraction-tooth-images-panel"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

const MAX_EXTRACTION_IMAGE_BYTES = 5120 * 1024
const SHOW_EXTRACTION_IMAGE_FIELD = true

// Use the CreateExtractionSchema from schemas.ts
type ToothStatusForm = z.infer<typeof CreateExtractionSchema>

interface ToothStatus {
  id?: number
  name: string
  code?: string
  color: string
  sequence?: number
  initial_loading: boolean
  active: boolean
  description?: string | null
  is_image_extraction?: "Yes" | "No"
  is_overlay?: "Yes" | "No"
  /** Resolved URL for display when editing (from API `image_url`). */
  image_url?: string | null
}

interface CreateToothStatusModalProps {
  isOpen: boolean
  onClose: () => void
  onChanges: (hasChanges: boolean) => void
  toothStatus?: ToothStatus | null
  mode: "create" | "edit"
  isCopying?: boolean // Flag to indicate if we're copying a tooth status
  onSuccess?: () => void // Callback to refetch data after successful creation/update
  /** When true (global product library only), edit mode shows a tab for global per-tooth extraction images. */
  globalToothImageLibrary?: boolean
}

// Color map for predefined colors (matching case pan modal pattern)
const colorMapDropdown: Record<string, string> = {
  blue: "bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] text-white",
  red: "bg-[#cf0202] text-white",
  white: "bg-[#ffffff] text-black",
  green: "bg-[#11a85d] text-white",
  purple: "bg-[#a81180] text-white",
  orange: "bg-[#f6be2c] text-black",
  teal: "bg-[#119ba8] text-white",
}

// Helper function to get hex color from color name
const getHexColor = (colorName: string): string => {
  const colorMap: Record<string, string> = {
    blue: "#1162a8",
    red: "#cf0202",
    white: "#ffffff",
    green: "#11a85d",
    purple: "#a81180",
    orange: "#f6be2c",
    teal: "#119ba8",
  }
  return colorMap[colorName] || "#1162a8"
}

export function CreateToothStatusModal({
  isOpen,
  onClose,
  onChanges,
  toothStatus,
  mode,
  isCopying = false,
  onSuccess,
  globalToothImageLibrary = false,
}: CreateToothStatusModalProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false)
  const [mainTab, setMainTab] = useState<"details" | "library">("details")
  const { toast } = useToast()
  const [isSuperadmin, setIsSuperadmin] = useState(false)
  const previousToothStatusIdRef = useRef<number | undefined>(undefined)
  const previousToothStatusLoadingRef = useRef<boolean | undefined>(undefined)

  // Use the extractions API hooks
  const { createExtraction, updateExtraction, isCreating, isUpdating } = useExtractionForm()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty, errors },
  } = useForm<ToothStatusForm>({
    resolver: zodResolver(CreateExtractionSchema),
    defaultValues: {
      name: "",
      description: "",
      code: "",
      color: "#F5E6D3",
      sequence: 1,
      status: "Active",
      is_image_extraction: "No",
      is_overlay: "No",
    },
  })

  const watchedColor = watch("color")
  const watchedName = watch("name")

  /** New upload (base64 data URL). */
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  /** Existing image URL from API when editing (not sent back unless replaced). */
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const previewSrc = imageBase64 ?? existingImageUrl
  const isDetailLoading = Boolean(toothStatus?.initial_loading)

  const showGlobalLibraryTab =
    globalToothImageLibrary && mode === "edit" && Boolean(toothStatus?.id) && !isCopying

  const showOverlayField = globalToothImageLibrary && isSuperadmin

  useEffect(() => {
    if (typeof window === "undefined") return
    const role = localStorage.getItem("role")
    setIsSuperadmin(role === "superadmin")
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setMainTab("details")
    }
  }, [isOpen])

  // Auto-generate code when name changes (only in create mode)
  useEffect(() => {
    if (watchedName && mode === "create") {
      const generatedCode = generateCodeFromName(watchedName)
      if (generatedCode) {
        setValue("code", generatedCode, { shouldDirty: true })
      }
    }
  }, [watchedName, setValue, mode])

  useEffect(() => {
    const currentId = toothStatus?.id
    const currentLoading = Boolean(toothStatus?.initial_loading)
    const previousId = previousToothStatusIdRef.current
    const previousLoading = previousToothStatusLoadingRef.current
    const hasLoadingFinished =
      previousId !== undefined &&
      previousId === currentId &&
      previousLoading &&
      !currentLoading &&
      Boolean(toothStatus)

    const shouldReset = isOpen && (
      !previousId || // First time opening
      previousId !== currentId || // Different tooth status
      (!toothStatus && previousId !== undefined) || // Switching from edit to create
      hasLoadingFinished // Reset when detail data finishes loading
    )

    if (shouldReset) {
      if (toothStatus) {
        // When copying, use the provided data (which already has the copied name and code)
        const hasStoredImage = Boolean(toothStatus.image_url?.trim()) && !isCopying
        reset({
          name: toothStatus.name,
          description: toothStatus.description || "",
          code: toothStatus.code || (toothStatus.name ? generateCodeFromName(toothStatus.name) : ""),
          color: toothStatus.color,
          sequence: toothStatus.sequence || 1,
          status: toothStatus.active ? "Active" : "Inactive",
          is_image_extraction:
            hasStoredImage || toothStatus.is_image_extraction === "Yes" ? "Yes" : "No",
          is_overlay: toothStatus.is_overlay ?? "No",
        })
        setImageBase64(null)
        setExistingImageUrl(isCopying ? null : (toothStatus.image_url ?? null))
      } else {
        reset({
          name: "",
          description: "",
          code: "",
          color: "#F5E6D3",
          sequence: 1,
          status: "Active",
          is_image_extraction: "No",
          is_overlay: "No",
        })
        setImageBase64(null)
        setExistingImageUrl(null)
      }
      previousToothStatusIdRef.current = currentId
    }

    previousToothStatusLoadingRef.current = currentLoading

    // Reset refs when modal closes
    if (!isOpen) {
      previousToothStatusIdRef.current = undefined
      previousToothStatusLoadingRef.current = undefined
    }
  }, [isOpen, toothStatus, reset, isCopying])

  useEffect(() => {
    if (!isOpen) {
      setImageBase64(null)
      setExistingImageUrl(null)
    }
  }, [isOpen])

  useEffect(() => {
    onChanges(isDirty)
  }, [isDirty, onChanges])

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized)
  }

  const handleClose = () => {
    if (isDirty) {
      setIsDiscardDialogOpen(true)
    } else {
      reset()
      onClose()
    }
  }

  const handleDiscardChanges = () => {
    setIsDiscardDialogOpen(false)
    reset()
    onClose()
  }

  const handleKeepEditing = () => {
    setIsDiscardDialogOpen(false)
  }

  const normalizeDescription = (value?: string | null) => {
    if (!value) return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if (!allowed.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, JPEG, PNG, GIF, or WebP image.",
        variant: "destructive",
      })
      e.target.value = ""
      return
    }
    if (file.size > MAX_EXTRACTION_IMAGE_BYTES) {
      toast({
        title: "File too large",
        description: "Image size must be 5MB or less.",
        variant: "destructive",
      })
      e.target.value = ""
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setImageBase64(reader.result as string)
      setValue("is_image_extraction", "Yes", { shouldDirty: true })
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const handleRemoveImage = () => {
    setImageBase64(null)
    setExistingImageUrl(null)
    setValue("is_image_extraction", "No", { shouldDirty: true })
  }

  const onSubmit = async (data: ToothStatusForm) => {
    try {
      // Ensure color is always a hex value
      const hexColor = data.color?.startsWith('#') 
        ? data.color 
        : getHexColor(data.color || 'blue')

      const normalizedDescription = normalizeDescription(data.description)

      const hasExtractionImage = Boolean((imageBase64 ?? existingImageUrl)?.trim())
      const isImageExtraction = hasExtractionImage ? "Yes" : "No"
      setValue("is_image_extraction", isImageExtraction, { shouldDirty: true })

      const imageFields =
        isImageExtraction === "No"
          ? { is_image_extraction: "No" as const, image: null as string | null }
          : {
              is_image_extraction: "Yes" as const,
              ...(imageBase64 ? { image: imageBase64 } : {}),
            }

      const overlayFields =
        showOverlayField ? { is_overlay: data.is_overlay ?? "No" } : {}
      
      if (mode === "create" || isCopying) {
        // Create new extraction (including when copying)
        createExtraction({
          name: data.name,
          code: data.code,
          description: normalizedDescription,
          color: hexColor,
          sequence: data.sequence,
          status: data.status,
          ...imageFields,
          ...overlayFields,
        }, {
          onSuccess: () => {
            reset()
            onClose()
            // Refetch data after successful creation
            if (onSuccess) {
              onSuccess()
            }
          },
          onError: (error: any) => {
            console.error("Error creating extraction:", error)
            // Error toast is already handled by the mutation hook
          }
        })
      } else if (mode === "edit" && toothStatus?.id && !isCopying) {
        // Update existing extraction
        updateExtraction({
          id: toothStatus.id,
          data: {
            name: data.name,
            code: data.code,
            description: normalizedDescription,
            color: hexColor,
            sequence: data.sequence,
            status: data.status,
            ...imageFields,
            ...overlayFields,
          }
        }, {
          onSuccess: () => {
            reset()
            onClose()
            // Refetch data after successful update
            if (onSuccess) {
              onSuccess()
            }
          },
          onError: (error: any) => {
            console.error("Error updating extraction:", error)
            // Error toast is already handled by the mutation hook
          }
        })
      }
    } catch (error) {
      console.error("Error saving tooth status:", error)
    }
  }

  const handleColorChange = useCallback((color: string) => {
    setValue("color", color, { shouldDirty: true })
  }, [setValue])

  const toothStatusFieldsBlock = (
    <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
      <div className="space-y-3 sm:space-y-4">
        {!showGlobalLibraryTab && (
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-medium">Tooth Status details</h3>
            <Info className="h-4 w-4 text-gray-400" />
          </div>
        )}

        <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tooth status name
                    </label>
                    <Input
                      {...register("name")}
                      placeholder="Tooth status name"
                      className="w-full"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Code
                    </label>
                    <Input
                      {...register("code")}
                      placeholder="Enter a unique code (e.g., TIM, MT, etc.)"
                      className="w-full"
                    />
                    {errors.code && (
                      <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sequence
                    </label>
                    <Input
                      {...register("sequence", { valueAsNumber: true })}
                      type="number"
                      min="1"
                      placeholder="Sequence order"
                      className="w-full"
                    />
                    {errors.sequence && (
                      <p className="text-red-500 text-sm mt-1">{errors.sequence.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <Textarea
                      {...register("description")}
                      placeholder="Enter your description. This description will appear as a tooltip for the tooth status."
                      className="w-full min-h-[80px] sm:min-h-[100px] resize-none"
                    />
                  </div>

                  {SHOW_EXTRACTION_IMAGE_FIELD && (
                    <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 sm:p-4 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Extraction image</label>
                        <span className="text-xs text-gray-500">(optional)</span>
                        <HelpTooltipProvider>
                          <HelpTooltip>
                            <HelpTooltipTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex rounded-full p-0.5 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1162a8]"
                                aria-label="Extraction image help"
                              >
                                <Info className="h-4 w-4" />
                              </button>
                            </HelpTooltipTrigger>
                            <HelpTooltipContent side="bottom" className="max-w-xs">
                              <p className="text-xs">
                                If you upload a reference image (JPG, PNG, GIF, or WebP, max 5MB), it is saved for extraction
                                automatically. Remove the image to turn that off.
                              </p>
                            </HelpTooltipContent>
                          </HelpTooltip>
                        </HelpTooltipProvider>
                      </div>

                      <div className="flex flex-col items-start gap-2">
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="relative flex h-28 w-28 sm:h-32 sm:w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 transition hover:border-gray-400"
                        >
                          {previewSrc ? (
                            <img
                              src={previewSrc}
                              alt="Extraction"
                              className="max-h-full max-w-full object-contain p-1"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1 px-2 text-gray-500">
                              <ImageIcon className="h-8 w-8" />
                              <span className="text-[10px] font-medium leading-tight text-center">Upload</span>
                            </div>
                          )}
                        </button>
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                          className="hidden"
                          onChange={handleImageFileChange}
                        />
                        {previewSrc && (
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            className="text-xs text-red-600 hover:bg-red-50"
                            onClick={handleRemoveImage}
                          >
                            Remove image
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign color
                    </label>
                    <div className="flex items-center gap-2">
                      <ColorPicker
                        value={watchedColor?.startsWith('#') ? watchedColor : getHexColor(watchedColor)}
                        onChange={handleColorChange}
                        predefinedColors={Object.keys(colorMapDropdown).map(colorName => getHexColor(colorName))}
                        side="left"
                        align="center"
                      />
                      
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      {...register("status")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1162a8] focus:border-[#1162a8]"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                    {errors.status && (
                      <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>
                    )}
                  </div>

                  {showOverlayField && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Is overlay?
                      </label>
                      <RadioGroup
                        value={(watch("is_overlay") as "Yes" | "No" | undefined) ?? "No"}
                        onValueChange={(v) => setValue("is_overlay", v as any, { shouldDirty: true })}
                        className="flex items-center gap-6"
                      >
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <RadioGroupItem value="Yes" />
                          Yes
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <RadioGroupItem value="No" />
                          No
                        </label>
                      </RadioGroup>
                    </div>
                  )}
                </div>
              </div>
    </div>
  )

  const toothStatusDetailOverlay = isDetailLoading ? (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-white/90">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1162a8]" />
      <p className="text-sm font-medium text-gray-700">Loading tooth status details…</p>
      <p className="text-xs text-gray-500">We'll update the form once the latest data arrives.</p>
    </div>
  ) : null

  const modalFooter = (
    <div className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t bg-white flex-shrink-0">
      <Button
        variant="destructive"
        type="button"
        onClick={handleClose}
        className="w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base"
      >
        Cancel
      </Button>
      {(!showGlobalLibraryTab || mainTab === "details") && (
        <Button
          type="submit"
          form={showGlobalLibraryTab ? "tooth-status-form" : undefined}
          className="bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] h-9 sm:h-10 hover:bg-[#0d4d87] w-full sm:w-auto text-sm sm:text-base"
          disabled={isCreating || isUpdating || isDetailLoading}
        >
          {isCreating || isUpdating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {isCopying ? "Copying..." : mode === "edit" ? "Updating..." : "Creating..."}
            </>
          ) : (
            isCopying ? "Copy Tooth Status" : mode === "edit" ? "Update Tooth Status" : "Save Tooth Status"
          )}
        </Button>
      )}
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className={`p-0 gap-0 transition-all duration-300 ease-in-out overflow-hidden flex flex-col ${
          isMaximized
            ? "w-[95vw] h-[95vh] max-w-[95vw] max-h-[95vh]"
            : showGlobalLibraryTab
              ? "w-[97vw] sm:w-[95vw] md:w-[94vw] max-w-[1380px] h-[85vh] sm:h-[90vh] max-h-[85vh] sm:max-h-[90vh]"
              : "w-[95vw] sm:w-[90vw] md:w-[85vw] max-w-[600px] h-[85vh] sm:h-[90vh] max-h-[85vh] sm:max-h-[90vh]"
        } bg-white`}
      >
        <DialogHeader className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 flex flex-row items-center justify-between border-b bg-white flex-shrink-0">
          <DialogTitle className="text-xl font-bold pr-2">
            {isCopying ? "Copy tooth status" : mode === "edit" ? "Edit tooth status" : "Create tooth status"}
          </DialogTitle>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleMaximize} 
              className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-gray-100"
              title={isMaximized ? "Minimize" : "Maximize"}
            >
              <Maximize2 className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform ${isMaximized ? "rotate-180" : ""}`} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-gray-100"
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
          {showGlobalLibraryTab ? (
            <>
              <Tabs
                value={mainTab}
                onValueChange={(v) => setMainTab(v as "details" | "library")}
                className="flex flex-1 flex-col min-h-0 gap-0 overflow-hidden"
              >
                <div className="flex-shrink-0 border-b border-gray-100 bg-white px-3 sm:px-4 md:px-6 pt-2 pb-3">
                  <TabsList className="h-auto w-full justify-start gap-1 bg-muted/80 p-1">
                    <TabsTrigger value="details" className="text-xs sm:text-sm">
                      Tooth Status details
                    </TabsTrigger>
                    <TabsTrigger value="library" className="text-xs sm:text-sm">
                      Global tooth images
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent
                  value="details"
                  className="mt-0 flex flex-1 flex-col min-h-0 overflow-hidden px-0 pt-0 data-[state=inactive]:hidden"
                >
                  <form
                    id="tooth-status-form"
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex flex-col flex-1 min-h-0 overflow-hidden"
                  >
                    <div className="relative flex-1 overflow-y-auto min-h-0">
                      {toothStatusFieldsBlock}
                      {toothStatusDetailOverlay}
                    </div>
                  </form>
                </TabsContent>
                <TabsContent
                  value="library"
                  className="mt-0 flex flex-1 flex-col min-h-0 overflow-y-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 data-[state=inactive]:hidden"
                >
                  {toothStatus?.id != null && (
                    <GlobalExtractionToothImagesPanel extractionId={toothStatus.id} />
                  )}
                </TabsContent>
              </Tabs>
              {modalFooter}
            </>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full min-h-0 overflow-hidden">
              <div className="relative flex-1 overflow-y-auto min-h-0">
                {toothStatusFieldsBlock}
                {toothStatusDetailOverlay}
              </div>
              {modalFooter}
            </form>
          )}
        </div>
      </DialogContent>
      
      <DiscardChangesDialog
        isOpen={isDiscardDialogOpen}
        type="tooth-status"
        onDiscard={handleDiscardChanges}
        onKeepEditing={handleKeepEditing}
      />
    </Dialog>
  )
}
