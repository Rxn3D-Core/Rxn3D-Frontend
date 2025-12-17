"use client"

import { useState, useEffect } from "react"
import { X, Maximize2, Info, ChevronDown } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { DiscardChangesDialog } from "@/components/product-management/discard-changes-dialog"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"

const ToothStatusGroupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  tooth_statuses: z.array(z.number()).default([]),
})

type ToothStatusGroupForm = z.infer<typeof ToothStatusGroupSchema>

interface ToothStatus {
  id: number
  name: string
  color: string
  initial_loading: boolean
  active: boolean
  description?: string
}

interface ToothStatusGroup {
  id?: number
  name: string
  tooth_statuses: ToothStatus[]
}

interface CreateToothStatusGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onChanges: (hasChanges: boolean) => void
  toothStatusGroup?: ToothStatusGroup | null
  mode?: "create" | "edit"
  isCopying?: boolean // Flag to indicate if we're copying a tooth status group
}

export function CreateToothStatusGroupModal({
  isOpen,
  onClose,
  onChanges,
  toothStatusGroup,
  mode = "create",
  isCopying = false,
}: CreateToothStatusGroupModalProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    groupDetails: true,
    linkingProducts: false,
    existingGroups: false,
  })
  const { t } = useTranslation()

  // Mock tooth statuses - in real app, this would come from context/API
  const [availableToothStatuses] = useState<ToothStatus[]>([
    {
      id: 1,
      name: "Teeth in mouth",
      color: "#F5E6D3",
      initial_loading: true,
      active: true,
    },
    {
      id: 2,
      name: "Missing teeth",
      color: "#D3D3D3",
      initial_loading: false,
      active: true,
    },
    {
      id: 3,
      name: "Will extract on delivery",
      color: "#FF6B6B",
      initial_loading: false,
      active: true,
    },
    {
      id: 4,
      name: "Has been extracted",
      color: "#808080",
      initial_loading: false,
      active: true,
    },
    {
      id: 5,
      name: "Fix/Repair",
      color: "#90EE90",
      initial_loading: false,
      active: true,
    },
    {
      id: 6,
      name: "Clasps",
      color: "#FFB6C1",
      initial_loading: false,
      active: true,
    },
    {
      id: 7,
      name: "Prepped",
      color: "#D2B48C",
      initial_loading: false,
      active: true,
    },
    {
      id: 8,
      name: "Implant",
      color: "#ADD8E6",
      initial_loading: true,
      active: true,
    }
  ])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty, errors },
  } = useForm<ToothStatusGroupForm>({
    resolver: zodResolver(ToothStatusGroupSchema),
    defaultValues: {
      name: "",
      tooth_statuses: [],
    },
  })

  const watchedToothStatuses = watch("tooth_statuses")

  useEffect(() => {
    if (isOpen && toothStatusGroup) {
      reset({
        name: toothStatusGroup.name,
        tooth_statuses: toothStatusGroup.tooth_statuses.map(ts => ts.id),
      })
    } else if (isOpen && !toothStatusGroup) {
      reset({
        name: "",
        tooth_statuses: [],
      })
    }
  }, [isOpen, toothStatusGroup, reset])

  useEffect(() => {
    onChanges(isDirty)
  }, [isDirty, onChanges])

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized)
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
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

  const onSubmit = async (data: ToothStatusGroupForm) => {
    try {
      // Here you would typically call an API to create/update the tooth status group
      // await createToothStatusGroup(data) or await updateToothStatusGroup(toothStatusGroup.id, data)
      
      reset()
      onClose()
    } catch (error) {
      console.error("Error saving tooth status group:", error)
    }
  }

  const handleToothStatusToggle = (statusId: number, checked: boolean) => {
    const currentStatuses = watchedToothStatuses || []
    if (checked) {
      setValue("tooth_statuses", [...currentStatuses, statusId], { shouldDirty: true })
    } else {
      setValue("tooth_statuses", currentStatuses.filter(id => id !== statusId), { shouldDirty: true })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className={`p-0 gap-0 transition-all duration-300 ease-in-out overflow-hidden ${
          isMaximized 
            ? "w-[95vw] h-[95vh] max-w-[95vw] max-h-[95vh]" 
            : "w-full max-w-[600px] max-h-[90vh]"
        } bg-white`}
      >
        <DialogHeader className="px-6 py-4 flex flex-row items-center justify-between border-b bg-white sticky top-0 z-10">
          <DialogTitle className="text-xl font-medium">
            {mode === "edit" ? "Edit tooth status group" : "Create new tooth status group"}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleMaximize} 
              className="h-8 w-8 hover:bg-gray-100"
              title={isMaximized ? "Minimize" : "Maximize"}
            >
              <Maximize2 className={`h-4 w-4 transition-transform ${isMaximized ? "rotate-180" : ""}`} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className={`${isMaximized ? "overflow-y-auto" : "overflow-y-auto max-h-[calc(90vh-80px)]"}`}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="px-6 py-6 space-y-6">
              {/* Group Details Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium">Group Details</h3>
                    <Info className="h-4 w-4 text-gray-400" />
                  </div>
                  <Switch
                    checked={expandedSections.groupDetails}
                    onCheckedChange={() => toggleSection("groupDetails")}
                    className="data-[state=checked]:bg-[#1162a8]"
                  />
                </div>

                {expandedSections.groupDetails && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Group Name
                      </label>
                      <Input
                        {...register("name")}
                        placeholder="Enter group name"
                        className="w-full"
                      />
                      {errors.name && (
                        <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Tooth status
                      </label>
                      <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                        {availableToothStatuses.map((status) => (
                          <div key={status.id} className="flex items-center gap-3">
                            <Checkbox
                              checked={watchedToothStatuses?.includes(status.id) || false}
                              onCheckedChange={(checked) => handleToothStatusToggle(status.id, !!checked)}
                              className="data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                            />
                            <div 
                              className="w-4 h-4 rounded border border-gray-300"
                              style={{ backgroundColor: status.color }}
                            />
                            <span className="text-sm text-gray-700">{status.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Linking Products Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium">Linking Products</h3>
                    <Info className="h-4 w-4 text-gray-400" />
                  </div>
                  <ChevronDown 
                    className={`h-5 w-5 transition-transform cursor-pointer ${
                      expandedSections.linkingProducts ? "rotate-180" : ""
                    }`}
                    onClick={() => toggleSection("linkingProducts")}
                  />
                </div>
                {expandedSections.linkingProducts && (
                  <div className="text-sm text-gray-500">
                    Product linking functionality would be implemented here.
                  </div>
                )}
              </div>

              {/* Existing Groups Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium">Existing Groups</h3>
                    <Info className="h-4 w-4 text-gray-400" />
                  </div>
                  <ChevronDown 
                    className={`h-5 w-5 transition-transform cursor-pointer ${
                      expandedSections.existingGroups ? "rotate-180" : ""
                    }`}
                    onClick={() => toggleSection("existingGroups")}
                  />
                </div>
                {expandedSections.existingGroups && (
                  <div className="text-sm text-gray-500">
                    Existing groups functionality would be implemented here.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex justify-end gap-3 border-t mt-4 bg-white sticky bottom-0">
              <Button
                variant="destructive"
                type="button" 
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#1162a8] h-10 hover:bg-[#0d4d87]"
              >
                {mode === "edit" ? "Update Group" : "Save Group"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
      
      <DiscardChangesDialog
        isOpen={isDiscardDialogOpen}
        type="tooth-status-group"
        onDiscard={handleDiscardChanges}
        onKeepEditing={handleKeepEditing}
      />
    </Dialog>
  )
}
