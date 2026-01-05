"use client"

import { TooltipContent } from "@/components/ui/tooltip"

import { TooltipTrigger } from "@/components/ui/tooltip"

import { Tooltip } from "@/components/ui/tooltip"

import { TooltipProvider } from "@/components/ui/tooltip"

import { useState, useEffect, useCallback, useRef } from "react"
import { X, ChevronDown, Info, Edit } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useStages, type StagePayload, type Stage, type StageVariation } from "@/contexts/product-stages-context" 
import { DiscardChangesDialog } from "./discard-changes-dialog" 
import { useAuth } from "@/contexts/auth-context"
import { generateCodeFromName } from "@/lib/utils"
import {
  getStageVariations,
  createStageVariation,
  updateStageVariation,
  deleteStageVariation,
  fileToBase64,
} from "@/services/stage-variations-api"
import type { StageVariationPayload, StageVariationUpdatePayload } from "@/contexts/product-stages-context"
import { useToast } from "@/hooks/use-toast"
import { Trash2 } from "lucide-react"
import { LoadingOverlay } from "@/components/ui/loading-overlay"

interface CreateStageModalProps {
  isOpen: boolean
  onClose: () => void
  onHasChangesChange?: (hasChanges: boolean) => void 
  stage?: Stage | null
  mode?: "create" | "edit"
  isCopying?: boolean // Flag to indicate if we're copying a stage
}

const defaultFormData: StagePayload = {
  name: "",
  code: "",
  status: "Active",
  is_common: "Yes",
  sequence: 0,
  days_to_pickup: 0,
  days_to_process: 0,
  days_to_deliver: 0,
  is_releasing_stage: "No",
  is_stage_with_addons: "No",
  price: 0,
  stage_configurations: {
    grade: "No",
    material: "No",
    gum_shade: "No",
    retention: "No",
    impression: "No",
    teeth_shade: "No",
  },
}

export function CreateStageModal({ isOpen, onClose, onHasChangesChange, stage, mode = "create", isCopying = false }: CreateStageModalProps) {
  const { createStage, updateStage, fetchStages, isLoading: isContextLoading } = useStages()
  const { user, token: authToken } = useAuth()

  const userRole = user?.roles?.[0] || user?.customers?.[0]?.role
  const isSuperAdminOrLabAdmin = userRole === "superadmin" || userRole === "lab_admin"

  const [formData, setFormData] = useState<StagePayload>(defaultFormData)
  const [initialFormData, setInitialFormData] = useState<StagePayload>(defaultFormData)
  const [hasChanges, setHasChanges] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)

  const [stageDetailsEnabled, setStageDetailsEnabled] = useState(true) 
  const [stageConfigurationsOpen, setStageConfigurationsOpen] = useState(false)
  const [imageVariationsOpen, setImageVariationsOpen] = useState(false)
  const [linkToProductsOpen, setLinkToProductsOpen] = useState(false)
  const [linkToGroupOpen, setLinkToGroupOpen] = useState(false)
  const [visibilityManagementOpen, setVisibilityManagementOpen] = useState(false)

  // Image state management
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null) // Track original image URL
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Image Variations state management
  // Local variation type for create mode (without id, stage_id, timestamps)
  type LocalVariation = {
    tempId?: string // Temporary ID for local variations
    name: string
    image: string // Base64 encoded image
    imagePreview: string | null
    status: "Active" | "Inactive"
    is_default: "Yes" | "No"
    sequence: number
  }
  const [variations, setVariations] = useState<(StageVariation | LocalVariation)[]>([])
  const [isLoadingVariations, setIsLoadingVariations] = useState(false)
  const [showVariationModal, setShowVariationModal] = useState(false)
  const [editingVariation, setEditingVariation] = useState<StageVariation | LocalVariation | null>(null)
  const [editingVariationIndex, setEditingVariationIndex] = useState<number | null>(null) // Track index for local variations
  const [variationFormData, setVariationFormData] = useState({
    name: "",
    image: null as File | null,
    imagePreview: null as string | null,
    status: "Active" as "Active" | "Inactive",
    is_default: "No" as "Yes" | "No",
    sequence: 0,
  })
  const variationFileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)


  // Initialize image when editing
  useEffect(() => {
    if (mode === "edit" && stage?.image_url) {
      setImageBase64(null) // Don't set base64 to URL - keep it null until new image is uploaded
      setImagePreview(stage.image_url)
      setOriginalImageUrl(stage.image_url) // Store original URL separately
    } else {
      setImageBase64(null)
      setImagePreview(null)
      setOriginalImageUrl(null)
    }
  }, [mode, stage?.image_url])

  // Fetch stage variations
  const fetchVariations = useCallback(async () => {
    if (!stage?.id) return
    
    setIsLoadingVariations(true)
    try {
      const response = await getStageVariations({ stage_id: stage.id, per_page: 100 })
      setVariations(response.data.data || [])
    } catch (error) {
      console.error("Failed to fetch variations:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load variations",
        variant: "destructive",
      })
    } finally {
      setIsLoadingVariations(false)
    }
  }, [stage?.id, toast])

  // Helper function to sync default variation image with stage image
  const syncDefaultVariationToStageImage = useCallback((variationsList: (StageVariation | LocalVariation)[]) => {
    const defaultVariation = variationsList.find(v => v.is_default === "Yes")
    
    if (defaultVariation) {
      // Get image from variation - for local variations use imagePreview, for API variations use image_url
      const variationImage = "imagePreview" in defaultVariation && defaultVariation.imagePreview
        ? defaultVariation.imagePreview
        : "image_url" in defaultVariation && defaultVariation.image_url
          ? defaultVariation.image_url
          : null
      
      // Get base64 image - for local variations use image, for API variations we need to fetch or use URL
      const variationImageBase64 = "image" in defaultVariation && defaultVariation.image
        ? defaultVariation.image
        : null
      
      if (variationImage) {
        setImagePreview(variationImage)
        // Only set base64 if we have it (for local variations), otherwise keep existing or null
        // For API variations, we'll use the URL for preview but not set base64 unless it's a new upload
        if (variationImageBase64 && variationImageBase64.startsWith("data:image/")) {
          setImageBase64(variationImageBase64)
        }
        setHasChanges(true)
        if (onHasChangesChange) onHasChangesChange(true)
      }
    }
  }, [onHasChangesChange])

  // Sync default variation image with stage image when variations change
  // Only sync if there's a default variation and we're not in the initial load with existing stage image
  useEffect(() => {
    if (variations.length > 0) {
      const hasDefault = variations.some(v => v.is_default === "Yes")
      if (hasDefault) {
        syncDefaultVariationToStageImage(variations)
      }
    }
  }, [variations, syncDefaultVariationToStageImage])

  // Fetch variations when stage is set (edit mode) or when variations section is opened
  useEffect(() => {
    // Only fetch variations in edit mode with an existing stage ID
    if (isOpen && imageVariationsOpen && mode === "edit" && stage?.id && !isCopying) {
      fetchVariations()
    } else if (mode === "create" || isCopying) {
      // Always clear variations when creating a new stage or copying
      setVariations([])
    }
  }, [isOpen, imageVariationsOpen, stage?.id, fetchVariations, mode, isCopying])

  // Handle create/update variation
  const handleCreateVariation = async () => {
    if (!variationFormData.name.trim()) {
      toast({
        title: "Error",
        description: "Variation name is required",
        variant: "destructive",
      })
      return
    }

    // Image is required for create, optional for update
    if (!editingVariation && !variationFormData.image) {
      toast({
        title: "Error",
        description: "Image is required",
        variant: "destructive",
      })
      return
    }

    // Handle create mode (local variations)
    if (mode === "create" || isCopying) {
      try {
        const isEditing = editingVariationIndex !== null
        
        if (isEditing && editingVariationIndex !== null) {
          // Update existing local variation
          if (!variationFormData.image && !variationFormData.imagePreview) {
            toast({
              title: "Error",
              description: "Image is required",
              variant: "destructive",
            })
            return
          }

          let imageBase64 = ""
          if (variationFormData.image) {
            imageBase64 = await fileToBase64(variationFormData.image)
          } else if (variationFormData.imagePreview) {
            // Use existing preview if no new image uploaded
            imageBase64 = variationFormData.imagePreview
          }

          const updatedVariations = [...variations]
          const existingVariation = updatedVariations[editingVariationIndex] as LocalVariation
          
          // If setting as default, unset all other defaults
          if (variationFormData.is_default === "Yes") {
            updatedVariations.forEach((v, idx) => {
              if (idx !== editingVariationIndex) {
                (v as LocalVariation).is_default = "No"
              }
            })
          }

          updatedVariations[editingVariationIndex] = {
            ...existingVariation,
            name: variationFormData.name.trim(),
            image: imageBase64,
            imagePreview: variationFormData.imagePreview,
            status: variationFormData.status,
            is_default: variationFormData.is_default,
            sequence: variationFormData.sequence,
          }
          
          setVariations(updatedVariations)
          setHasChanges(true)
          if (onHasChangesChange) onHasChangesChange(true)
          
          // Sync default variation image to stage image if this is set as default
          if (variationFormData.is_default === "Yes") {
            syncDefaultVariationToStageImage(updatedVariations)
          }
          
          toast({
            title: "Success",
            description: "Variation updated successfully",
          })
        } else {
          // Create new local variation
          if (!variationFormData.image) {
            toast({
              title: "Error",
              description: "Image is required for new variations",
              variant: "destructive",
            })
            return
          }

          const imageBase64 = await fileToBase64(variationFormData.image)
          
          // If setting as default, unset all other defaults
          const updatedVariations = [...variations]
          if (variationFormData.is_default === "Yes") {
            updatedVariations.forEach((v) => {
              (v as LocalVariation).is_default = "No"
            })
          }

          const newVariation: LocalVariation = {
            tempId: `temp-${Date.now()}-${Math.random()}`,
            name: variationFormData.name.trim(),
            image: imageBase64,
            imagePreview: variationFormData.imagePreview,
            status: variationFormData.status,
            is_default: variationFormData.is_default,
            sequence: variationFormData.sequence,
          }
          
          updatedVariations.push(newVariation)
          setVariations(updatedVariations)
          setHasChanges(true)
          if (onHasChangesChange) onHasChangesChange(true)
          
          // Sync default variation image to stage image if this is set as default
          if (variationFormData.is_default === "Yes") {
            syncDefaultVariationToStageImage(updatedVariations)
          }
          
          toast({
            title: "Success",
            description: "Variation added successfully",
          })
        }
        
        // Reset form and close modal
        setVariationFormData({
          name: "",
          image: null,
          imagePreview: null,
          status: "Active",
          is_default: "No",
          sequence: 0,
        })
        setShowVariationModal(false)
        setEditingVariation(null)
        setEditingVariationIndex(null)
      } catch (error) {
        console.error(`Failed to ${editingVariation ? "update" : "create"} variation:`, error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : `Failed to ${editingVariation ? "update" : "create"} variation`,
          variant: "destructive",
        })
      }
      return
    }

    // Handle edit mode (API calls)
    if (!stage?.id) {
      toast({
        title: "Error",
        description: "Stage ID is required. Please save the stage first.",
        variant: "destructive",
      })
      return
    }

    try {
      const isEditing = !!editingVariation && "id" in editingVariation
      
      if (isEditing && editingVariation && "id" in editingVariation) {
        // Update existing variation via API
        const updatePayload: StageVariationUpdatePayload = {
          name: variationFormData.name.trim(),
          status: variationFormData.status,
          is_default: variationFormData.is_default,
          sequence: variationFormData.sequence,
        }

        // Only include image if a new one was uploaded
        if (variationFormData.image) {
          const imageBase64 = await fileToBase64(variationFormData.image)
          updatePayload.image = imageBase64
        }

        await updateStageVariation(editingVariation.id, updatePayload)
        toast({
          title: "Success",
          description: "Variation updated successfully",
        })
      } else {
        // Create new variation via API
        if (!variationFormData.image) {
          toast({
            title: "Error",
            description: "Image is required for new variations",
            variant: "destructive",
          })
          return
        }

        const imageBase64 = await fileToBase64(variationFormData.image)
        const payload: StageVariationPayload = {
          stage_id: stage.id,
          name: variationFormData.name.trim(),
          image: imageBase64,
          status: variationFormData.status,
          is_default: variationFormData.is_default,
          sequence: variationFormData.sequence,
        }

        await createStageVariation(payload)
        toast({
          title: "Success",
          description: "Variation created successfully",
        })
      }
      
      // Reset form and close modal
      setVariationFormData({
        name: "",
        image: null,
        imagePreview: null,
        status: "Active",
        is_default: "No",
        sequence: 0,
      })
      setShowVariationModal(false)
      setEditingVariation(null)
      setEditingVariationIndex(null)
      
      // Refresh variations list
      await fetchVariations()
    } catch (error) {
      console.error(`Failed to ${editingVariation ? "update" : "create"} variation:`, error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${editingVariation ? "update" : "create"} variation`,
        variant: "destructive",
      })
    }
  }

  // Handle update variation
  const handleUpdateVariation = async (variation: StageVariation, updates: StageVariationUpdatePayload) => {
    try {
      await updateStageVariation(variation.id, updates)
      toast({
        title: "Success",
        description: "Variation updated successfully",
      })
      await fetchVariations()
    } catch (error) {
      console.error("Failed to update variation:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update variation",
        variant: "destructive",
      })
    }
  }

  // Handle delete variation
  const handleDeleteVariation = async (variation: StageVariation | LocalVariation, index?: number) => {
    if (!confirm(`Are you sure you want to delete "${variation.name}"?`)) {
      return
    }

    // Handle create mode (local variations)
    if ((mode === "create" || isCopying) && index !== undefined) {
      const updatedVariations = variations.filter((_, idx) => idx !== index)
      setVariations(updatedVariations)
      setHasChanges(true)
      if (onHasChangesChange) onHasChangesChange(true)
      toast({
        title: "Success",
        description: "Variation removed successfully",
      })
      return
    }

    // Handle edit mode (API call)
    if (!("id" in variation)) {
      return
    }

    try {
      await deleteStageVariation(variation.id)
      toast({
        title: "Success",
        description: "Variation deleted successfully",
      })
      await fetchVariations()
    } catch (error) {
      console.error("Failed to delete variation:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete variation",
        variant: "destructive",
      })
    }
  }

  // Handle variation image change
  const handleVariationImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setVariationFormData(prev => ({
          ...prev,
          image: file,
          imagePreview: reader.result as string,
        }))
      }
      reader.readAsDataURL(file)
    }
    // Clear the input value to allow re-selecting the same file
    if (variationFileInputRef.current) {
      variationFileInputRef.current.value = ""
    }
  }

  // Handle toggle variation status
  const handleToggleVariationStatus = (variation: StageVariation | LocalVariation, index?: number) => {
    const newStatus = variation.status === "Active" ? "Inactive" : "Active"
    
    // Handle create mode (local variations)
    if ((mode === "create" || isCopying) && index !== undefined) {
      const updatedVariations = [...variations]
      updatedVariations[index] = { ...variation, status: newStatus } as LocalVariation
      setVariations(updatedVariations)
      setHasChanges(true)
      if (onHasChangesChange) onHasChangesChange(true)
      return
    }

    // Handle edit mode (API call)
    if ("id" in variation) {
      handleUpdateVariation(variation, { status: newStatus })
    }
  }

  // Handle set default variation
  const handleSetDefaultVariation = async (variation: StageVariation | LocalVariation, index?: number) => {
    // Handle create mode (local variations)
    if ((mode === "create" || isCopying) && index !== undefined) {
      const updatedVariations = [...variations]
      // Unset all other defaults
      updatedVariations.forEach((v, idx) => {
        if (idx === index) {
          (v as LocalVariation).is_default = "Yes"
        } else {
          (v as LocalVariation).is_default = "No"
        }
      })
      setVariations(updatedVariations)
      setHasChanges(true)
      if (onHasChangesChange) onHasChangesChange(true)
      
      // Sync the default variation image to stage image
      syncDefaultVariationToStageImage(updatedVariations)
      return
    }

    // Handle edit mode (API call)
    if ("id" in variation) {
      try {
        await handleUpdateVariation(variation, { is_default: "Yes" })
        // Refresh variations to get updated list, which will trigger the sync effect
        await fetchVariations()
      } catch (error) {
        console.error("Failed to set default variation:", error)
      }
    }
  }

  // Open create variation modal
  const handleOpenCreateVariation = () => {
    setEditingVariation(null)
    setEditingVariationIndex(null)
    setVariationFormData({
      name: "",
      image: null,
      imagePreview: null,
      status: "Active",
      is_default: "No",
      sequence: 0,
    })
    setShowVariationModal(true)
  }

  // Open edit variation modal
  const handleOpenEditVariation = (variation: StageVariation | LocalVariation, index?: number) => {
    setEditingVariation(variation)
    setEditingVariationIndex(index !== undefined ? index : null)
    
    // Get image preview - for local variations use imagePreview, for API variations use image_url
    const imagePreview = "imagePreview" in variation && variation.imagePreview 
      ? variation.imagePreview 
      : "image_url" in variation && variation.image_url 
        ? variation.image_url 
        : null
    
    setVariationFormData({
      name: variation.name || "",
      image: null, // Don't set file, user can upload new one
      imagePreview: imagePreview, // Show existing image
      status: variation.status || "Active",
      is_default: variation.is_default || "No",
      sequence: variation.sequence || 0,
    })
    setShowVariationModal(true)
  }

  useEffect(() => {
    if (isOpen) {
      if (isCopying && stage) {
        // Copying: use the provided stage data directly (no API call needed)
        setFormData({
          name: stage.name || "",
          code: stage.code || "",
          status: stage.status || "Active",
          is_common: stage.is_common || "Yes",
          sequence: stage.sequence || 0,
          days_to_pickup: stage.days_to_pickup || 0,
          days_to_process: stage.days_to_process || 0,
          days_to_deliver: stage.days_to_deliver || 0,
          is_releasing_stage: stage.is_releasing_stage || "No",
          is_stage_with_addons: stage.is_stage_with_addons || "No",
          price: stage.price !== undefined ? stage.price : (stage.lab_stage?.price ? Number(stage.lab_stage.price) : 0),
          stage_configurations: stage.stage_configurations || {
            grade: "No",
            material: "No",
            gum_shade: "No",
            retention: "No",
            impression: "No",
            teeth_shade: "No",
          },
        })
        setInitialFormData({
          name: stage.name || "",
          code: stage.code || "",
          status: stage.status || "Active",
          is_common: stage.is_common || "Yes",
          sequence: stage.sequence || 0,
          days_to_pickup: stage.days_to_pickup || 0,
          days_to_process: stage.days_to_process || 0,
          days_to_deliver: stage.days_to_deliver || 0,
          is_releasing_stage: stage.is_releasing_stage || "No",
          is_stage_with_addons: stage.is_stage_with_addons || "No",
          price: stage.price !== undefined ? stage.price : (stage.lab_stage?.price ? Number(stage.lab_stage.price) : 0),
          stage_configurations: stage.stage_configurations || {
            grade: "No",
            material: "No",
            gum_shade: "No",
            retention: "No",
            impression: "No",
            teeth_shade: "No",
          },
        })
      } else if (mode === "edit" && stage && !isCopying) {
        // Editing: use the provided stage data
        setFormData({
          name: stage.name || "",
          code: stage.code || "",
          status: stage.status || "Active",
          is_common: stage.is_common || "Yes",
          sequence: stage.sequence || 0,
          days_to_pickup: stage.days_to_pickup || 0,
          days_to_process: stage.days_to_process || 0,
          days_to_deliver: stage.days_to_deliver || 0,
          is_releasing_stage: stage.is_releasing_stage || "No",
          is_stage_with_addons: stage.is_stage_with_addons || "No",
          price: stage.price !== undefined ? stage.price : (stage.lab_stage?.price ? Number(stage.lab_stage.price) : 0),
          stage_configurations: stage.stage_configurations || {
            grade: "No",
            material: "No",
            gum_shade: "No",
            retention: "No",
            impression: "No",
            teeth_shade: "No",
          },
        })
        setInitialFormData({
          name: stage.name || "",
          code: stage.code || "",
          status: stage.status || "Active",
          is_common: stage.is_common || "Yes",
          sequence: stage.sequence || 0,
          days_to_pickup: stage.days_to_pickup || 0,
          days_to_process: stage.days_to_process || 0,
          days_to_deliver: stage.days_to_deliver || 0,
          is_releasing_stage: stage.is_releasing_stage || "No",
          is_stage_with_addons: stage.is_stage_with_addons || "No",
          price: stage.price !== undefined ? stage.price : (stage.lab_stage?.price ? Number(stage.lab_stage.price) : 0),
          stage_configurations: stage.stage_configurations || {
            grade: "No",
            material: "No",
            gum_shade: "No",
            retention: "No",
            impression: "No",
            teeth_shade: "No",
          },
        })
      } else {
        // New stage: reset to default form data (code will be generated from name)
        setFormData(defaultFormData)
        setInitialFormData(defaultFormData)
      }
      setHasChanges(false)
      if (onHasChangesChange) onHasChangesChange(false)
      setStageDetailsEnabled(true)
      setStageConfigurationsOpen(false)
      setImageVariationsOpen(false)
      setLinkToProductsOpen(false)
      setLinkToGroupOpen(false)
      setVisibilityManagementOpen(false)
      
      // Reset variations when creating a new stage (not editing)
      if (mode === "create" || isCopying) {
        setVariations([])
        setIsLoadingVariations(false)
      }
    }
  }, [isOpen, onHasChangesChange, mode, stage, isCopying])

  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(initialFormData)
    setHasChanges(changed)
    if (onHasChangesChange) {
      onHasChangesChange(changed)
    }
  }, [formData, initialFormData, onHasChangesChange])

  const handleInputChange = (
    field: keyof StagePayload,
    value: string | number | "Yes" | "No" | "Active" | "Inactive",
  ) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }
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

  const handleNumberInputChange = (field: keyof StagePayload, value: string) => {
    const num = Number.parseInt(value, 10)
    setFormData((prev) => ({ ...prev, [field]: isNaN(num) ? 0 : num }))
  }

  const handleStageConfigurationChange = (
    field: keyof typeof formData.stage_configurations,
    value: "Yes" | "No"
  ) => {
    setFormData((prev) => ({
      ...prev,
      stage_configurations: {
        ...prev.stage_configurations,
        [field]: value,
      },
    }))
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
        setHasChanges(true)
        if (onHasChangesChange) onHasChangesChange(true)
      }
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
      setImageBase64(null)
      setHasChanges(true)
      if (onHasChangesChange) onHasChangesChange(true)
    }
    // Clear the input value to allow re-selecting the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setImageBase64(null)
    setOriginalImageUrl(null) // Clear original URL when removing
    setHasChanges(true)
    if (onHasChangesChange) onHasChangesChange(true)
    // Clear the file input value
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handlePreviewClick = () => {
    if (imagePreview) setShowPreviewModal(true)
  }

  const handleSaveStage = async () => {
    if (!formData.name || !formData.code) {
      alert("Name and Code are required.")
      return
    }

    setIsSaving(true)

    const payload: StagePayload & { variations?: Array<{
      name: string
      status: "Active" | "Inactive"
      sequence: number
      is_default: "Yes" | "No"
      image: string
    }> } = { ...formData }
    
    if (userRole === "lab_admin") {
      payload.price = formData.price || 0
    } else {
      delete payload.price
    }

    // Store the image separately for variation creation
    const imageForVariation = imageBase64 && imageBase64.startsWith("data:image/") ? imageBase64 : null

    // Only add image to payload if it's base64 data (newly uploaded image)
    // If imageBase64 is a URL (starts with http), it means it's the original image and hasn't changed
    if (imageBase64 && imageBase64.startsWith("data:image/")) {
      payload.image = imageBase64
    }

    // Include variations in payload for create mode
    if ((mode === "create" || isCopying) && variations.length > 0) {
      payload.variations = variations.map((v) => {
        const localVar = v as LocalVariation
        return {
          name: localVar.name,
          status: localVar.status,
          sequence: localVar.sequence,
          is_default: localVar.is_default,
          image: localVar.image, // Already base64 encoded
        }
      })
    }

    let success = false
    let savedStageId: number | null = null
    
    // If copying, always create a new stage (not update)
    if (mode === "edit" && stage && !isCopying) {
      const changedFields: Partial<StagePayload> = {}
      Object.keys(payload).forEach((key) => {
        if ((payload as any)[key] !== (initialFormData as any)[key]) {
          (changedFields as any)[key] = (payload as any)[key]
        }
      })
      
      // For lab_admin users, always include price in update payload even if unchanged
      // This ensures the backend validation doesn't fail
      if (userRole === "lab_admin" && !changedFields.price) {
        changedFields.price = formData.price || 0
      }
      
      // Only include image if it's actually base64 (new image uploaded)
      // payload.image will only exist if imageBase64 was valid base64 data
      if (payload.image) {
        changedFields.image = payload.image
      }
      
      if (Object.keys(changedFields).length === 0) {
        setIsSaving(false)
        onClose()
        return
      }
      try {
        success = await updateStage(stage.id, changedFields)
        savedStageId = stage.id
      } catch (error) {
        setIsSaving(false)
        console.error("Error updating stage:", error)
        toast({
          title: "Update Error",
          description: error instanceof Error ? error.message : "Failed to update stage",
          variant: "destructive",
        })
        return
      }
    } else {
      // For create mode, make API call directly to get the stage ID
      if (!authToken) {
        setIsSaving(false)
        toast({
          title: "Authentication Error",
          description: "You must be logged in to create a stage.",
          variant: "destructive",
        })
        return
      }

      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"
        const bodyPayload = {
          ...payload,
          ...(userRole === "lab_admin" && user?.customers?.[0]?.id ? { customer_id: user.customers[0].id } : {}),
        }
        
        const response = await fetch(`${API_BASE_URL}/library/stages`, {
          method: "POST",
          headers: { 
            Authorization: `Bearer ${authToken}`, 
            "Content-Type": "application/json" 
          },
          body: JSON.stringify(bodyPayload),
        })
        
        const result = await response.json()
        
        if (!response.ok) {
          setIsSaving(false)
          toast({
            title: "Creation Failed",
            description: result.message || "Could not create the stage.",
            variant: "destructive",
          })
          return
        }
        
        // Get the stage ID from the response
        if (result.data && result.data.id) {
          savedStageId = result.data.id
          success = true
          
          // Show success toast
          toast({
            title: "Stage Created",
            description: result.message || "Stage created successfully",
          })
          
          // Refresh the stages list
          await fetchStages(1)
        } else {
          setIsSaving(false)
          toast({
            title: "Creation Failed",
            description: "Stage was created but ID was not returned",
            variant: "destructive",
          })
          return
        }
      } catch (error) {
        setIsSaving(false)
        console.error("Error creating stage:", error)
        toast({
          title: "Creation Error",
          description: error instanceof Error ? error.message : "Failed to create stage",
          variant: "destructive",
        })
        return
      }
    }
    
      if (success) {
      setHasChanges(false) 
      if (onHasChangesChange) onHasChangesChange(false)
      
      // Note: Variations are now included in the create payload, so no need to create them separately
      // The backend should handle creating variations from the payload
      
      setIsSaving(false)
      onClose()
    } else {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleAttemptClose()}>
        <DialogContent className="p-0 gap-0 sm:max-w-[700px] lg:max-w-[800px] xl:max-w-[900px] overflow-hidden bg-white rounded-md">
          <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b">
            <DialogTitle className="text-xl font-bold">
              {isCopying ? "Copy Stage" : mode === "edit" ? "Edit Stage" : "Create Stage"}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleAttemptClose} className="h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(80vh-130px)] p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="stageDetailsSwitch" className="font-medium">
                  Stage Details
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Basic information about the stage.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="stageDetailsSwitch"
                checked={stageDetailsEnabled}
                onCheckedChange={setStageDetailsEnabled}
                className="data-[state=checked]:bg-[#1162a8]"
              />
            </div>
            {stageDetailsEnabled && (
              <div className="space-y-4">
                {/* Image Upload Section - Moved to top */}
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
                      Click to upload stage image
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stageName">Name *</Label>
                    <Input
                      id="stageName"
                      placeholder="e.g., Design Approval"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="h-10"
                      validationState={formData.name.trim() ? "valid" : "default"}
                    />
                  </div>
                  <div>
                    <Label htmlFor="stageCode">Code *</Label>
                    <Input
                      id="stageCode"
                      placeholder="e.g., DES-APP"
                      value={formData.code}
                      onChange={(e) => handleInputChange("code", e.target.value)}
                      className="h-10"
                      validationState={formData.code.trim() ? "valid" : "default"}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stageSequence">Sequence *</Label>
                    <Input
                      id="stageSequence"
                      type="number"
                      placeholder="e.g., 1"
                      value={formData.sequence}
                      onChange={(e) => handleNumberInputChange("sequence", e.target.value)}
                      className="h-10"
                      validationState={formData.sequence ? "valid" : "default"}
                    />
                  </div>
                  <div>
                    <Label htmlFor="stageStatus">Status *</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: "Active" | "Inactive") => handleInputChange("status", value)}
                    >
                      <SelectTrigger id="stageStatus" className="h-10">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              

                {userRole === "lab_admin" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="stagePrice">Price</Label>
                      <Input
                        id="stagePrice"
                        type="number"
                        placeholder="e.g., 300"
                        value={formData.price || 0}
                        onChange={(e) => handleNumberInputChange("price", e.target.value)}
                        className="h-10"
                        validationState={formData.price ? "valid" : "default"}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 mb-4">
                    Price field only available for lab_admin users (Current role: {userRole || 'none'})
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 items-center pt-2">
                  {/* <div className="flex items-center space-x-2">
                    <Switch className="data-[state=checked]:bg-[#1162a8]"
                      id="isCommon"
                      checked={formData.is_common === "Yes"}
                      onCheckedChange={(checked) => handleInputChange("is_common", checked ? "Yes" : "No")}
                    />
                    <Label htmlFor="isCommon">Is Common</Label>
                  </div> */}
                  <div className="flex items-center space-x-2">
                    <Switch className="data-[state=checked]:bg-[#1162a8]"
                      id="isReleasingStage"
                      checked={formData.is_releasing_stage === "Yes"}
                      onCheckedChange={(checked) => handleInputChange("is_releasing_stage", checked ? "Yes" : "No")}
                    />
                    <Label htmlFor="isReleasingStage">Releasing Stage</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch className="data-[state=checked]:bg-[#1162a8]"
                      id="isStageWithAddons"
                      checked={formData.is_stage_with_addons === "Yes"}
                      onCheckedChange={(checked) => handleInputChange("is_stage_with_addons", checked ? "Yes" : "No")}
                    />
                    <Label htmlFor="isStageWithAddons">Has Add-ons</Label>
                  </div>
                </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stage Configurations Section - Only for superadmin and lab_admin */}
            {isSuperAdminOrLabAdmin && (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">Stage Configurations</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Configure which features are enabled for this stage.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <p className="text-sm text-gray-600 mb-8">
                    Select which configuration options should be available for this stage. These settings will determine what fields are required when creating cases in this stage.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg p-5 border border-gray-200 hover:border-blue-300 transition-all duration-200 hover:shadow-md group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                            <span className="text-base font-bold text-blue-600">G</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <Label htmlFor="gradeConfig" className="text-base font-semibold text-gray-900 cursor-pointer block mb-1">
                              Grade
                            </Label>
                            <p className="text-sm text-gray-500">Material grade selection</p>
                          </div>
                        </div>
                        <Switch
                          id="gradeConfig"
                          checked={formData.stage_configurations.grade === "Yes"}
                          onCheckedChange={(checked) => handleStageConfigurationChange("grade", checked ? "Yes" : "No")}
                          className="data-[state=checked]:bg-[#1162a8] flex-shrink-0 ml-4"
                        />
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-5 border border-gray-200 hover:border-green-300 transition-all duration-200 hover:shadow-md group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
                            <span className="text-base font-bold text-green-600">M</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <Label htmlFor="materialConfig" className="text-base font-semibold text-gray-900 cursor-pointer block mb-1">
                              Material
                            </Label>
                            <p className="text-sm text-gray-500">Material type specification</p>
                          </div>
                        </div>
                        <Switch
                          id="materialConfig"
                          checked={formData.stage_configurations.material === "Yes"}
                          onCheckedChange={(checked) => handleStageConfigurationChange("material", checked ? "Yes" : "No")}
                          className="data-[state=checked]:bg-[#1162a8] flex-shrink-0 ml-4"
                        />
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-5 border border-gray-200 hover:border-pink-300 transition-all duration-200 hover:shadow-md group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-pink-200 transition-colors">
                            <span className="text-sm font-bold text-pink-600">GS</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <Label htmlFor="gumShadeConfig" className="text-base font-semibold text-gray-900 cursor-pointer block mb-1">
                              Gum Shade
                            </Label>
                            <p className="text-sm text-gray-500">Gum color matching</p>
                          </div>
                        </div>
                        <Switch
                          id="gumShadeConfig"
                          checked={formData.stage_configurations.gum_shade === "Yes"}
                          onCheckedChange={(checked) => handleStageConfigurationChange("gum_shade", checked ? "Yes" : "No")}
                          className="data-[state=checked]:bg-[#1162a8] flex-shrink-0 ml-4"
                        />
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-5 border border-gray-200 hover:border-purple-300 transition-all duration-200 hover:shadow-md group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition-colors">
                            <span className="text-base font-bold text-purple-600">R</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <Label htmlFor="retentionConfig" className="text-base font-semibold text-gray-900 cursor-pointer block mb-1">
                              Retention
                            </Label>
                            <p className="text-sm text-gray-500">Retention mechanism</p>
                          </div>
                        </div>
                        <Switch
                          id="retentionConfig"
                          checked={formData.stage_configurations.retention === "Yes"}
                          onCheckedChange={(checked) => handleStageConfigurationChange("retention", checked ? "Yes" : "No")}
                          className="data-[state=checked]:bg-[#1162a8] flex-shrink-0 ml-4"
                        />
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-5 border border-gray-200 hover:border-indigo-300 transition-all duration-200 hover:shadow-md group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 transition-colors">
                            <span className="text-base font-bold text-indigo-600">I</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <Label htmlFor="impressionConfig" className="text-base font-semibold text-gray-900 cursor-pointer block mb-1">
                              Impression
                            </Label>
                            <p className="text-sm text-gray-500">Impression requirements</p>
                          </div>
                        </div>
                        <Switch
                          id="impressionConfig"
                          checked={formData.stage_configurations.impression === "Yes"}
                          onCheckedChange={(checked) => handleStageConfigurationChange("impression", checked ? "Yes" : "No")}
                          className="data-[state=checked]:bg-[#1162a8] flex-shrink-0 ml-4"
                        />
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-5 border border-gray-200 hover:border-yellow-300 transition-all duration-200 hover:shadow-md group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-yellow-200 transition-colors">
                            <span className="text-sm font-bold text-yellow-600">TS</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <Label htmlFor="teethShadeConfig" className="text-base font-semibold text-gray-900 cursor-pointer block mb-1">
                              Teeth Shade
                            </Label>
                            <p className="text-sm text-gray-500">Teeth color matching</p>
                          </div>
                        </div>
                        <Switch
                          id="teethShadeConfig"
                          checked={formData.stage_configurations.teeth_shade === "Yes"}
                          onCheckedChange={(checked) => handleStageConfigurationChange("teeth_shade", checked ? "Yes" : "No")}
                          className="data-[state=checked]:bg-[#1162a8] flex-shrink-0 ml-4"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 p-5 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Info className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-semibold text-blue-800 mb-1">Configuration Summary</p>
                        <p className="text-sm text-blue-600">
                          {Object.values(formData.stage_configurations).filter(val => val === "Yes").length} of 6 configurations enabled for this stage.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Image Variations Section */}
            <Collapsible open={imageVariationsOpen} onOpenChange={setImageVariationsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full border-t border-b py-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Image Variations</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Manage different image variations for this stage.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${imageVariationsOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                      onClick={handleOpenCreateVariation}
                    >
                      + New variation
                    </Button>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 mb-3 px-4">
                      <div className="col-span-1 flex items-center">Image</div>
                      <div className="col-span-4 flex items-center">Name</div>
                      <div className="col-span-2 flex items-center justify-center">Active</div>
                      <div className="col-span-3 flex items-center">Default</div>
                      <div className="col-span-2 flex items-center justify-end">Actions</div>
                    </div>
                    
                    {/* Variations list */}
                    {isLoadingVariations && (mode === "edit" && !isCopying) ? (
                      <div className="text-center py-8 text-gray-500">Loading variations...</div>
                    ) : variations.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No variations yet. Click "+ New variation" to add one.</div>
                    ) : (
                      <div className="space-y-3">
                        {variations.map((variation, index) => {
                          // Get image URL - for local variations use imagePreview, for API variations use image_url
                          const imageUrl = "imagePreview" in variation && variation.imagePreview
                            ? variation.imagePreview
                            : "image_url" in variation && variation.image_url
                              ? variation.image_url
                              : null
                          
                          // Get unique key
                          const key = "id" in variation ? variation.id : ("tempId" in variation ? variation.tempId : index)
                          
                          return (
                            <div
                              key={key}
                              className={`grid grid-cols-12 gap-4 items-center py-3 px-4 border rounded-lg ${
                                variation.is_default === "Yes" ? "bg-blue-50 border-blue-200" : "bg-white"
                              }`}
                            >
                              <div className="col-span-1 flex items-center">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={variation.name}
                                    className="w-12 h-12 object-cover rounded-lg"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="col-span-4 flex items-center">
                                <span className="text-sm font-medium">{variation.name}</span>
                              </div>
                              <div className="col-span-2 flex items-center justify-center">
                                <Switch
                                  checked={variation.status === "Active"}
                                  onCheckedChange={() => handleToggleVariationStatus(variation, index)}
                                  className="data-[state=checked]:bg-[#1162a8]"
                                />
                              </div>
                              <div className="col-span-3 flex items-center">
                                {variation.is_default === "Yes" ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 cursor-default"
                                    disabled
                                  >
                                    Default Image
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                                    onClick={() => handleSetDefaultVariation(variation, index)}
                                  >
                                    Set as default image
                                  </Button>
                                )}
                              </div>
                              <div className="col-span-2 flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => handleOpenEditVariation(variation, index)}
                                  title="Edit variation"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteVariation(variation, index)}
                                  title="Delete variation"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="destructive" onClick={handleAttemptClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveStage}
              disabled={isContextLoading || !formData.name || !formData.code}
              className="bg-[#1162a8] hover:bg-[#0d4d87]"
            >
              {isContextLoading
                ? (isCopying ? "Copying..." : mode === "edit" ? "Updating..." : "Creating...")
                : (isCopying ? "Copy Stage" : mode === "edit" ? "Update Stage" : "Save Stage")}
            </Button>
          </DialogFooter>
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
                alt="Stage Preview"
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

      {/* Create/Edit Variation Modal */}
      <Dialog open={showVariationModal} onOpenChange={setShowVariationModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingVariation ? "Edit Variation" : "Create New Variation"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Image Upload Section - Aligned to left upper like stage details */}
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              <div className="flex flex-col items-center gap-3">
                <Label htmlFor="variationImage">
                  Image {editingVariation ? "(Optional - only if updating image)" : "*"}
                </Label>
                <div
                  className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 h-[140px] w-[140px] bg-gradient-to-br from-gray-50 to-gray-100 hover:border-gray-400 hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200 transition-all duration-200 cursor-pointer group"
                  onClick={() => variationFileInputRef.current?.click()}
                >
                  {variationFormData.imagePreview ? (
                    <img
                      src={variationFormData.imagePreview}
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
                    ref={variationFileInputRef}
                    style={{ display: "none" }}
                    onChange={handleVariationImageChange}
                  />
                </div>
                <span className="text-xs text-gray-500 text-center max-w-[140px]">
                  Click to upload variation image
                </span>
                <div className="flex gap-2 mt-2">
                  {variationFormData.image && (
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => setVariationFormData(prev => ({ ...prev, image: null, imagePreview: null }))}
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
                  <Label htmlFor="variationName">Name *</Label>
                  <Input
                    id="variationName"
                    placeholder="e.g., Crown try in"
                    validationState={variationFormData.name.trim() ? "valid" : "default"}
                    value={variationFormData.name}
                    onChange={(e) => setVariationFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="h-10"
                  />
                </div>

                <div>
                  <Label htmlFor="variationSequence">Sequence</Label>
                  <Input
                    id="variationSequence"
                    type="number"
                    placeholder="e.g., 1"
                    value={variationFormData.sequence}
                    onChange={(e) => {
                      const num = Number.parseInt(e.target.value, 10)
                      setVariationFormData(prev => ({ ...prev, sequence: isNaN(num) ? 0 : num }))
                    }}
                    className="h-10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="variationStatus">Status</Label>
                    <Select
                      value={variationFormData.status}
                      onValueChange={(value: "Active" | "Inactive") => 
                        setVariationFormData(prev => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger id="variationStatus" className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="variationDefault">Set as Default</Label>
                    <Select
                      value={variationFormData.is_default}
                      onValueChange={(value: "Yes" | "No") => 
                        setVariationFormData(prev => ({ ...prev, is_default: value }))
                      }
                    >
                      <SelectTrigger id="variationDefault" className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowVariationModal(false)
              setVariationFormData({
                name: "",
                image: null,
                imagePreview: null,
                status: "Active",
                is_default: "No",
                sequence: 0,
              })
              setEditingVariation(null)
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateVariation}
              disabled={!variationFormData.name.trim() || (!editingVariation && !variationFormData.image) || (!!editingVariation && editingVariationIndex !== null && !variationFormData.image && !variationFormData.imagePreview)}
              className="bg-[#1162a8] hover:bg-[#0d4d87]"
            >
              {editingVariation ? "Update Variation" : "Create Variation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showDiscardDialog && (
        <DiscardChangesDialog
          isOpen={showDiscardDialog}
          type="stage"
          onDiscard={handleActualDiscard}
          onKeepEditing={handleKeepEditing}
        />
      )}

      {/* Loading Overlay for save/update operations */}
      <LoadingOverlay
        isLoading={isSaving}
        title={isCopying 
          ? "Copying Stage..."
          : mode === "edit" 
            ? "Updating Stage..."
            : "Creating Stage..."}
        message={isCopying
          ? "Please wait while we copy the stage."
          : mode === "edit"
            ? "Please wait while we update the stage."
            : "Please wait while we create the stage."}
        zIndex={10001}
      />
    </>
  )
}
