"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { X, Maximize2, Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ColorPicker } from "@/components/ui/color-picker"
import { DiscardChangesDialog } from "@/components/product-management/discard-changes-dialog"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import { useExtractionForm } from "@/hooks/use-extractions"
import { CreateExtractionSchema } from "@/lib/schemas"
import { generateCodeFromName } from "@/lib/utils"

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
}

interface CreateToothStatusModalProps {
  isOpen: boolean
  onClose: () => void
  onChanges: (hasChanges: boolean) => void
  toothStatus?: ToothStatus | null
  mode: "create" | "edit"
  isCopying?: boolean // Flag to indicate if we're copying a tooth status
  onSuccess?: () => void // Callback to refetch data after successful creation/update
}

// Color map for predefined colors (matching case pan modal pattern)
const colorMapDropdown: Record<string, string> = {
  blue: "bg-[#1162a8] text-white",
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
}: CreateToothStatusModalProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false)
  const { t } = useTranslation()
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
    },
  })

  const watchedColor = watch("color")
  const watchedName = watch("name")
  const isDetailLoading = Boolean(toothStatus?.initial_loading)

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
        reset({
          name: toothStatus.name,
          description: toothStatus.description || "",
          code: toothStatus.code || (toothStatus.name ? generateCodeFromName(toothStatus.name) : ""),
          color: toothStatus.color,
          sequence: toothStatus.sequence || 1,
          status: toothStatus.active ? "Active" : "Inactive",
        })
      } else {
        reset({
          name: "",
          description: "",
          code: "",
          color: "#F5E6D3",
          sequence: 1,
          status: "Active",
        })
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

  const onSubmit = async (data: ToothStatusForm) => {
    try {
      // Ensure color is always a hex value
      const hexColor = data.color?.startsWith('#') 
        ? data.color 
        : getHexColor(data.color || 'blue')

      const normalizedDescription = normalizeDescription(data.description)
      
      if (mode === "create" || isCopying) {
        // Create new extraction (including when copying)
        createExtraction({
          name: data.name,
          code: data.code,
          description: normalizedDescription,
          color: hexColor,
          sequence: data.sequence,
          status: data.status,
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className={`p-0 gap-0 transition-all duration-300 ease-in-out overflow-hidden flex flex-col ${
          isMaximized 
            ? "w-[95vw] h-[95vh] max-w-[95vw] max-h-[95vh]" 
            : "w-[95vw] sm:w-[90vw] md:w-[85vw] max-w-[600px] h-[85vh] sm:h-[90vh] max-h-[85vh] sm:max-h-[90vh]"
        } bg-white`}
      >
        <DialogHeader className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 flex flex-row items-center justify-between border-b bg-white flex-shrink-0">
          <DialogTitle className="text-sm sm:text-base md:text-lg lg:text-xl font-medium pr-2">
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
        
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full min-h-0 overflow-hidden">
            <div className="relative flex-1 overflow-y-auto min-h-0">
              <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
              {/* Tooth Status Details Section */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-medium">Tooth Status details</h3>
                    <Info className="h-4 w-4 text-gray-400" />
                  </div>
                  <Switch
                    checked={true}
                    onCheckedChange={() => {}}
                    className="data-[state=checked]:bg-[#1162a8]"
                  />
                </div>

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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign color
                    </label>
                    <div className="flex items-center gap-2">
                      <ColorPicker
                        value={watchedColor?.startsWith('#') ? watchedColor : getHexColor(watchedColor)}
                        onChange={handleColorChange}
                        predefinedColors={Object.keys(colorMapDropdown).map(colorName => getHexColor(colorName))}
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
                </div>
              </div>
              </div>

              {isDetailLoading && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-white/90">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1162a8]" />
                  <p className="text-sm font-medium text-gray-700">Loading tooth status details…</p>
                  <p className="text-xs text-gray-500">We'll update the form once the latest data arrives.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t bg-white flex-shrink-0">
              <Button
                variant="destructive"
                type="button" 
                onClick={handleClose}
                className="w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#1162a8] h-9 sm:h-10 hover:bg-[#0d4d87] w-full sm:w-auto text-sm sm:text-base"
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
            </div>
          </form>
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
