"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Switch } from "@/components/ui/switch"
import { ChevronDown, ChevronRight, X, Info, Trash2, Edit } from "lucide-react"
import { DiscardChangesDialog } from "./discard-changes-dialog"
import { useMaterials } from "@/contexts/product-materials-context"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { generateCodeFromName } from "@/lib/utils"
import { getAuthToken } from "@/lib/auth-utils"
import {
  getMaterialVariations,
  createMaterialVariation,
  updateMaterialVariation,
  deleteMaterialVariation,
  fileToBase64,
  type MaterialVariation,
} from "@/services/material-variations-api"
import { LinkProductsModal } from "./link-products-modal"
import { useToast } from "@/hooks/use-toast"

interface CreateMaterialModalProps {
  isOpen: boolean
  onClose: () => void
  material?: any // Add material prop for editing
}

// Pending variation type (for variations not yet saved)
interface PendingVariation {
  tempId: string // Temporary ID for React keys
  name: string
  image: File
  imagePreview: string
  status: "Active" | "Inactive"
  sequence: number
  is_default: "Yes" | "No"
}

const resolveMaterialImageUrl = (material?: any): string | null => {
  if (!material) return null
  if (material.lab_material?.image_url) {
    return material.lab_material.image_url
  }
  return material.image_url ?? null
}

export function CreateMaterialModal({ isOpen, onClose, material }: CreateMaterialModalProps) {
  const { createMaterial, updateMaterial, isLoading, user, getMaterialDetail, fetchMaterials } = useMaterials()
  const userRole = localStorage.getItem("role")
  const isLabAdmin = userRole === "lab_admin"

  const [materialName, setMaterialName] = useState("")
  const [materialCode, setMaterialCode] = useState("")
  const [additionalPrice, setAdditionalPrice] = useState("")
  const [priceOption, setPriceOption] = useState("no-additional")
  const [status, setStatus] = useState("Active")
  const [materialImageBase64, setMaterialImageBase64] = useState<string | null>(null)
  const [materialImagePreview, setMaterialImagePreview] = useState<string | null>(null)
  const materialImageInputRef = useRef<HTMLInputElement>(null)
  const [linkToProductsOpen, setLinkToProductsOpen] = useState(false)
  const [linkToGroupOpen, setLinkToGroupOpen] = useState(false)
  const [imageVariationsOpen, setImageVariationsOpen] = useState(false)
  const [showLinkProductsModal, setShowLinkProductsModal] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Image Variations state management
  const [variations, setVariations] = useState<MaterialVariation[]>([]) // Saved variations (from API)
  const [pendingVariations, setPendingVariations] = useState<PendingVariation[]>([]) // Pending variations (not yet saved)
  const [isLoadingVariations, setIsLoadingVariations] = useState(false)
  const [showVariationModal, setShowVariationModal] = useState(false)
  const [editingVariation, setEditingVariation] = useState<MaterialVariation | null>(null)
  const [editingPendingVariation, setEditingPendingVariation] = useState<PendingVariation | null>(null)
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

  // Log user role detection
  useEffect(() => {
    console.log("=== User Role Detection ===")
    console.log("User object:", user)
    console.log("User roles array:", user?.roles)
    console.log("User role (single):", user?.role)
    console.log("Calculated userRole:", userRole)
    console.log("isLabAdmin:", isLabAdmin)
    console.log("===========================")
  }, [user, userRole, isLabAdmin])

  // Log when additionalPrice changes
  useEffect(() => {
    console.log("💵 additionalPrice state changed:", additionalPrice, "type:", typeof additionalPrice)
  }, [additionalPrice])

  // Fetch material variations
  const fetchVariations = useCallback(async () => {
    if (!material?.id) return
    
    setIsLoadingVariations(true)
    try {
      const response = await getMaterialVariations({ material_id: material.id, per_page: 100 })
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
  }, [material?.id, toast])

  // Fetch variations when material is set (edit mode) or when variations section is opened
  useEffect(() => {
    if (isOpen && imageVariationsOpen && material?.id) {
      fetchVariations()
    }
  }, [isOpen, imageVariationsOpen, material?.id, fetchVariations])

  // Prefill state if editing, fetch latest detail if material.id exists
  useEffect(() => {
    let ignore = false
    async function fetchDetailAndSet() {
      if (material && material.id) {
        const detail = await getMaterialDetail(material.id)
        if (ignore) return
        const mat = detail || material
        
        // Extract price - check multiple possible locations
        let priceValue = 0
        if (typeof mat.price === "number") {
          priceValue = mat.price
        } else if (mat.lab_material?.price) {
          priceValue = typeof mat.lab_material.price === "number" 
            ? mat.lab_material.price 
            : parseFloat(mat.lab_material.price) || 0
        } else if (typeof mat.price === "string") {
          priceValue = parseFloat(mat.price) || 0
        }
        
        console.log("Loading material for edit - mat:", mat)
        console.log("Loading material for edit - extracted price:", priceValue)
        
        setMaterialName(mat.name || "")
        setMaterialCode(mat.code || "")
        setAdditionalPrice(priceValue > 0 ? priceValue.toString() : "")
        setPriceOption(priceValue > 0 ? "additional" : "no-additional")
        setStatus(mat.status || "Active")
        setHasChanges(false)
        setErrors({})
        setPendingVariations([]) // Clear pending variations when editing existing material
        const imageUrl = resolveMaterialImageUrl(mat)
        setMaterialImagePreview(imageUrl)
        setMaterialImageBase64(null)
      } else if (material) {
        // Extract price for copied material (material without id)
        let priceValue = 0
        if (typeof material.price === "number") {
          priceValue = material.price
        } else if (material.lab_material?.price) {
          priceValue = typeof material.lab_material.price === "number" 
            ? material.lab_material.price 
            : parseFloat(material.lab_material.price) || 0
        } else if (typeof material.price === "string") {
          priceValue = parseFloat(material.price) || 0
        }
        
        setMaterialName(material.name || "")
        setMaterialCode(material.code || "")
        setAdditionalPrice(priceValue > 0 ? priceValue.toString() : "")
        setPriceOption(priceValue > 0 ? "additional" : "no-additional")
        setStatus(material.status || "Active")
        setHasChanges(false)
        setErrors({})
        setPendingVariations([]) // Clear pending variations
        const imageUrl = resolveMaterialImageUrl(material)
        setMaterialImagePreview(imageUrl)
        setMaterialImageBase64(null)
      } else {
        setMaterialName("")
        setMaterialCode("")
        setAdditionalPrice("")
        setPriceOption("no-additional")
        setStatus("Active")
        setHasChanges(false)
        setErrors({})
        setPendingVariations([]) // Clear pending variations for new material
        setMaterialImagePreview(null)
        setMaterialImageBase64(null)
      }
    }
    if (isOpen) {
      fetchDetailAndSet()
    }
    return () => { ignore = true }
  }, [material, isOpen, getMaterialDetail])

  const handleInputChange = (value: string, setter: (value: string) => void) => {
    setter(value)
    setHasChanges(true)
  }

  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardDialog(true)
    } else {
      onClose()
    }
  }

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
    if (!editingVariation && !editingPendingVariation && !variationFormData.image) {
      toast({
        title: "Error",
        description: "Image is required",
        variant: "destructive",
      })
      return
    }

    try {
      const isEditingSaved = !!editingVariation
      const isEditingPending = !!editingPendingVariation

      if (isEditingSaved) {
        // Update existing saved variation (requires material.id)
        if (!material?.id) {
          toast({
            title: "Error",
            description: "Material ID is required to update variation",
            variant: "destructive",
          })
          return
        }

        const updatePayload: any = {
          name: variationFormData.name.trim(),
          status: variationFormData.status,
          is_default: variationFormData.is_default,
        }

        // Only include image if a new one was uploaded
        if (variationFormData.image) {
          const imageBase64 = await fileToBase64(variationFormData.image)
          updatePayload.image = imageBase64
        }

        await updateMaterialVariation(editingVariation.id, updatePayload)
        toast({
          title: "Success",
          description: "Variation updated successfully",
        })

        // Refresh variations list
        await fetchVariations()
      } else if (isEditingPending) {
        // Update pending variation (local state only)
        setPendingVariations(prev => {
          const updated = prev.map(v => 
            v.tempId === editingPendingVariation.tempId
              ? {
                  ...v,
                  name: variationFormData.name.trim(),
                  image: variationFormData.image || v.image,
                  imagePreview: variationFormData.imagePreview || v.imagePreview,
                  status: variationFormData.status,
                  sequence: variationFormData.sequence,
                  is_default: variationFormData.is_default,
                }
              : {
                  ...v,
                  // If setting this as default, unset others
                  is_default: variationFormData.is_default === "Yes" && v.tempId !== editingPendingVariation.tempId ? "No" : v.is_default,
                }
          )
          return updated
        })
        setHasChanges(true)
        toast({
          title: "Success",
          description: "Variation updated",
        })
      } else {
        // Create new variation - either save to API or add to pending
        if (material?.id) {
          // Material exists, save to API
          if (!variationFormData.image) {
            toast({
              title: "Error",
              description: "Image is required for new variations",
              variant: "destructive",
            })
            return
          }

          const imageBase64 = await fileToBase64(variationFormData.image)
          const payload = {
            material_id: material.id,
            name: variationFormData.name.trim(),
            image: imageBase64,
            status: variationFormData.status,
            sequence: variationFormData.sequence,
            is_default: variationFormData.is_default,
          }

          await createMaterialVariation(payload)
          toast({
            title: "Success",
            description: "Variation created successfully",
          })

          // Refresh variations list
          await fetchVariations()
        } else {
          // Material doesn't exist yet, add to pending variations
          if (!variationFormData.image) {
            toast({
              title: "Error",
              description: "Image is required for new variations",
              variant: "destructive",
            })
            return
          }

          const newPendingVariation: PendingVariation = {
            tempId: `pending-${Date.now()}-${Math.random()}`,
            name: variationFormData.name.trim(),
            image: variationFormData.image,
            imagePreview: variationFormData.imagePreview || "",
            status: variationFormData.status,
            sequence: variationFormData.sequence || pendingVariations.length,
            is_default: variationFormData.is_default,
          }

          // If setting as default, unset other pending variations
          if (variationFormData.is_default === "Yes") {
            setPendingVariations(prev => {
              const updated = prev.map(v => ({ ...v, is_default: "No" as "Yes" | "No" }))
              return [...updated, newPendingVariation]
            })
          } else {
            setPendingVariations(prev => [...prev, newPendingVariation])
          }

          setHasChanges(true)
          toast({
            title: "Success",
            description: "Variation added. It will be saved when you save the material.",
          })
        }
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
      setEditingPendingVariation(null)
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
  const handleUpdateVariation = async (variation: MaterialVariation, updates: any) => {
    try {
      await updateMaterialVariation(variation.id, updates)
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
  const handleDeleteVariation = async (variation: MaterialVariation | PendingVariation) => {
    if (!confirm(`Are you sure you want to delete "${variation.name}"?`)) {
      return
    }

    // Check if it's a pending variation
    if ("tempId" in variation) {
      setPendingVariations(prev => prev.filter(v => v.tempId !== variation.tempId))
      setHasChanges(true)
      toast({
        title: "Success",
        description: "Variation removed",
      })
      return
    }

    // It's a saved variation, delete from API
    try {
      await deleteMaterialVariation(variation.id)
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
  const handleToggleVariationStatus = (variation: MaterialVariation | PendingVariation) => {
    // Check if it's a pending variation
    if ("tempId" in variation) {
      const newStatus = variation.status === "Active" ? "Inactive" : "Active"
      setPendingVariations(prev => 
        prev.map(v => v.tempId === variation.tempId ? { ...v, status: newStatus } : v)
      )
      setHasChanges(true)
      return
    }

    // It's a saved variation, update via API
    const newStatus = variation.status === "Active" ? "Inactive" : "Active"
    handleUpdateVariation(variation, { status: newStatus })
  }

  // Handle set default variation
  const handleSetDefaultVariation = async (variation: MaterialVariation | PendingVariation) => {
    // Check if it's a pending variation
    if ("tempId" in variation) {
      setPendingVariations(prev => 
        prev.map(v => ({
          ...v,
          is_default: v.tempId === variation.tempId ? "Yes" : "No"
        }))
      )
      setHasChanges(true)
      toast({
        title: "Success",
        description: "Default variation updated",
      })
      return
    }

    // It's a saved variation, update via API
    try {
      await handleUpdateVariation(variation, { is_default: "Yes" })
      // Backend automatically sets all other variations to "No"
    } catch (error) {
      console.error("Failed to set default variation:", error)
    }
  }

  // Open create variation modal
  const handleOpenCreateVariation = () => {
    setEditingVariation(null)
    setEditingPendingVariation(null)
    setVariationFormData({
      name: "",
      image: null,
      imagePreview: null,
      status: "Active",
      is_default: "No",
      sequence: pendingVariations.length + variations.length,
    })
    setShowVariationModal(true)
  }

  // Open edit variation modal
  const handleOpenEditVariation = (variation: MaterialVariation | PendingVariation) => {
    // Check if it's a pending variation
    if ("tempId" in variation) {
      setEditingPendingVariation(variation)
      setEditingVariation(null)
      setVariationFormData({
        name: variation.name || "",
        image: null, // Don't set file, user can upload new one
        imagePreview: variation.imagePreview || null, // Show existing preview
        status: variation.status || "Active",
        is_default: variation.is_default || "No",
        sequence: variation.sequence || 0,
      })
    } else {
      setEditingVariation(variation)
      setEditingPendingVariation(null)
      setVariationFormData({
        name: variation.name || "",
        image: null, // Don't set file, user can upload new one
        imagePreview: variation.image_url || null, // Show existing image
        status: variation.status || "Active",
        is_default: variation.is_default || "No",
        sequence: variation.sequence || 0,
      })
    }
    setShowVariationModal(true)
  }

  const handleDiscard = () => {
    setMaterialName("")
    setMaterialCode("")
    setAdditionalPrice("")
    setPriceOption("no-additional")
    setStatus("Active")
    setLinkToProductsOpen(false)
    setLinkToGroupOpen(false)
    setImageVariationsOpen(false)
    setHasChanges(false)
    setErrors({})
    setPendingVariations([])
    setMaterialImagePreview(null)
    setMaterialImageBase64(null)
    if (materialImageInputRef.current) {
      materialImageInputRef.current.value = ""
    }
    setShowDiscardDialog(false)
    onClose()
  }

  const handleKeepEditing = () => {
    setShowDiscardDialog(false)
  }

  const handleMaterialImageClick = () => {
    materialImageInputRef.current?.click()
  }

  const handleMaterialImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const base64 = await fileToBase64(file)
      setMaterialImagePreview(base64)
      setMaterialImageBase64(base64)
      setHasChanges(true)
    } catch (error) {
      console.error("Failed to load material image:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load image",
        variant: "destructive",
      })
    } finally {
      if (materialImageInputRef.current) {
        materialImageInputRef.current.value = ""
      }
    }
  }

  const handleRemoveMaterialImage = () => {
    setMaterialImagePreview(null)
    setMaterialImageBase64(null)
    setHasChanges(true)
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!materialName.trim()) {
      newErrors.materialName = "Material name is required"
    }

    // Price validation for lab_admin
    if (isLabAdmin && priceOption === "additional") {
      if (!additionalPrice.trim()) {
        newErrors.price = "Price is required"
      } else if (isNaN(Number(additionalPrice)) || Number(additionalPrice) < 0) {
        newErrors.price = "Price must be a non-negative number"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Determine if we're copying (material exists but no id, or name/code indicates copy)
  const isCopying = material && !material.id && (
    materialName.includes("(Copy)") || 
    materialCode.includes("_COPY_") || 
    material?.name?.includes("(Copy)") || 
    material?.code?.includes("_COPY_")
  )

  const handleSave = async () => {
    // Use both console.log and alert to ensure visibility
    console.log("🚀 handleSave called!")
    window.console.log("🚀 handleSave called! (window.console)")
    
    console.log("User object:", user)
    console.log("User roles:", user?.roles)
    console.log("User role (single):", user?.role)
    
    // Function called - logs will show below
    
    if (!validateForm()) {
      console.log("❌ Form validation failed")
      return
    }

    try {
      // Debug: Log current state values
      console.log("=== Material Save Debug ===")
      console.log("materialName:", materialName)
      console.log("materialCode:", materialCode)
      console.log("additionalPrice:", additionalPrice)
      console.log("additionalPrice type:", typeof additionalPrice)
      console.log("userRole:", userRole)
      console.log("isLabAdmin:", isLabAdmin)
      
      const payload: any = {
        name: materialName.trim(),
        code: materialCode.trim() || undefined,
        sequence: 1,
        status: status,
      }
      
      const imageForPayload =
        materialImageBase64 && materialImageBase64.startsWith("data:image/")
          ? materialImageBase64
          : null

      if (imageForPayload) {
        payload.image = imageForPayload
      }
      
      // Handle price - only include it for lab admins (lab profile)
      // According to API spec: price should only be included when executed with lab profile
      console.log("🔍 Checking isLabAdmin:", isLabAdmin)
      
      if (isLabAdmin) {
        console.log("✅ User is lab admin - processing price")
        // For lab admins, always include price in the payload
        // Convert to number - handle string, number, empty, null, undefined
        let priceValue = 0
        
        console.log("💰 additionalPrice raw value:", additionalPrice)
        console.log("💰 additionalPrice type:", typeof additionalPrice)
        
        // More explicit check - handle all cases
        if (additionalPrice !== null && additionalPrice !== undefined) {
          // Convert to string first to handle number inputs
          const priceStr = String(additionalPrice).trim()
          console.log("💰 priceStr after String() and trim():", priceStr)
          console.log("💰 priceStr length:", priceStr.length)
          console.log("💰 priceStr === '':", priceStr === "")
          
          // Check if string is not empty
          if (priceStr.length > 0) {
            // Try to parse as float (handles decimals like 150.50)
            const parsed = parseFloat(priceStr)
            console.log("💰 parseFloat result:", parsed)
            console.log("💰 isNaN(parsed):", isNaN(parsed))
            console.log("💰 isFinite(parsed):", isFinite(parsed))
            console.log("💰 parsed >= 0:", parsed >= 0)
            
            // Validate: must be a valid number and non-negative
            if (!isNaN(parsed) && isFinite(parsed) && parsed >= 0) {
              priceValue = parsed
              console.log("✅ Valid price, setting priceValue to:", priceValue)
            } else {
              console.log("❌ Invalid price - isNaN:", isNaN(parsed), "isFinite:", isFinite(parsed), "parsed:", parsed)
            }
          } else {
            console.log("❌ priceStr is empty (length is 0)")
          }
        } else {
          console.log("❌ additionalPrice is null or undefined")
        }
        
        // Always include price for lab admins (even if 0, as per API spec)
        payload.price = priceValue
        console.log("=== Price Calculation Result ===")
        console.log("additionalPrice input:", additionalPrice)
        console.log("priceValue calculated:", priceValue)
        console.log("Final payload.price:", payload.price)
      } else {
        console.log("❌ User is NOT lab admin - skipping price field")
        console.log("User role was:", userRole)
        console.log("User roles array:", user?.roles)
        console.log("User object:", user)
        // Still include price as 0 for non-lab admins? Or don't include it?
        // According to spec, price should only be included for lab profile
      }
      
      // Debug logging - always show
      console.log("=========================================")
      console.log("📦 FINAL PAYLOAD BEING SENT:")
      console.log("=========================================")
      console.log(JSON.stringify(payload, null, 2))
      console.log("=========================================")
      console.log("Payload object:", payload)
      console.log("Payload price value:", payload.price)
      console.log("Payload price type:", typeof payload.price)
      console.log("Is updating?", material && material.id)
      console.log("=========================================")

      let createdMaterialId: number | null = null
      let materialCreated = false

      if (material && material.id) {
        console.log("🔄 Calling updateMaterial with payload:", payload)
        await updateMaterial(material.id, payload)
        createdMaterialId = material.id
        materialCreated = true
      } else {
        // If we have pending variations, make direct API call to get material ID
        // Otherwise use context function
        if (pendingVariations.length > 0) {
          console.log("➕ Creating material with pending variations - making direct API call")
          const token = getAuthToken()
          if (!token) {
            throw new Error("Authentication token not found")
          }
          
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"
          const response = await fetch(`${API_BASE_URL}/library/materials`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            
            // Handle validation errors (422)
            if (response.status === 422 && errorData.errors) {
              // Show validation errors in toasts
              Object.entries(errorData.errors).forEach(([field, messages]: [string, any]) => {
                if (Array.isArray(messages)) {
                  messages.forEach((message) => {
                    toast({
                      title: `Validation Error - ${field}`,
                      description: message,
                      variant: "destructive",
                    })
                  })
                }
              })
              
              // Also set field-specific errors for display
              if (errorData.errors.code) {
                setErrors({ code: Array.isArray(errorData.errors.code) ? errorData.errors.code[0] : errorData.errors.code })
              }
              
              // Throw error to prevent success flow
              throw new Error(errorData.error_description || errorData.message || "Validation failed")
            } else {
              // Other errors
              toast({
                title: "Error",
                description: errorData?.error_description || errorData?.message || "Failed to create material",
                variant: "destructive",
              })
              throw new Error(errorData?.error_description || errorData?.message || "Failed to create material")
            }
          }

          const result = await response.json()
          createdMaterialId = result?.data?.id || null
          
          if (!createdMaterialId) {
            throw new Error("Failed to get material ID from create response")
          }

          materialCreated = true

          // Refresh the materials list instead of calling createMaterial again (which would fail with duplicate code)
          await fetchMaterials()
        } else {
          console.log("➕ Calling createMaterial with payload:", payload)
          await createMaterial(payload)
          materialCreated = true
          // For materials without pending variations, we don't need the ID
          // The context will handle the list update
        }
      }

      // Only proceed with variations and show success if material was actually created
      if (!materialCreated) {
        return // Exit early if material creation failed
      }

      // Create pending variations if any
      if (pendingVariations.length > 0) {
        if (!createdMaterialId) {
          // If we don't have the material ID, try to get it from the materials list
          // This is a fallback in case the direct API call didn't work
          toast({
            title: "Warning",
            description: "Material created but variations could not be saved. Please add them manually.",
            variant: "destructive",
          })
        } else {
          try {
            // Process variations sequentially to handle default flag properly
            for (const pendingVar of pendingVariations) {
              const imageBase64 = await fileToBase64(pendingVar.image)
              const variationPayload = {
                material_id: createdMaterialId,
                name: pendingVar.name,
                image: imageBase64,
                status: pendingVar.status,
                sequence: pendingVar.sequence,
                is_default: pendingVar.is_default,
              }
              await createMaterialVariation(variationPayload)
            }
            toast({
              title: "Success",
              description: `Material and ${pendingVariations.length} variation(s) created successfully`,
            })
          } catch (error) {
            console.error("Failed to create variations:", error)
            toast({
              title: "Warning",
              description: "Material created but some variations failed to save. You can add them manually.",
              variant: "destructive",
            })
          }
        }
      } else if (!material?.id) {
        // Material created without variations - show success message
        toast({
          title: "Success",
          description: "Material created successfully",
        })
      }

      // Reset form and errors
      setMaterialName("")
      setMaterialCode("")
      setAdditionalPrice("")
      setPriceOption("no-additional")
      setStatus("Active")
      setLinkToProductsOpen(false)
      setLinkToGroupOpen(false)
      setImageVariationsOpen(false)
      setHasChanges(false)
      setErrors({})
      setPendingVariations([])
      setMaterialImagePreview(null)
      setMaterialImageBase64(null)
      if (materialImageInputRef.current) {
        materialImageInputRef.current.value = ""
      }
      onClose()
    } catch (error: any) {
      console.error("❌ Error creating/updating material:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      
      // Show error toast if not already shown
      const errorMessage = error?.message || "Failed to save material. Please try again."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      
      // Don't reset form or close modal on error - let user fix and retry
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[85vw] max-w-[700px] p-0 gap-0 overflow-hidden bg-white rounded-md">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b">
              <DialogTitle className="text-base sm:text-xl font-bold">
                {isCopying ? "Copy Material" : material && material.id ? "Edit Material" : "Create new Material"}
              </DialogTitle>
              <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

          <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-h-[75vh] sm:max-h-[70vh] overflow-y-auto">
            {/* Material Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Material Details</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="ml-1 h-4 w-4 text-gray-400 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs p-4 bg-white border border-gray-200 shadow-lg rounded-md">
                      <p className="text-sm text-gray-600">
                      Material help organize material into logical sets for easier management and
                        assignment to products.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 h-[140px] w-[140px] bg-gradient-to-br from-gray-50 to-gray-100 hover:border-gray-400 hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200 transition-all duration-200 cursor-pointer group"
                      onClick={handleMaterialImageClick}
                    >
                      {materialImagePreview ? (
                        <img
                          src={materialImagePreview}
                          alt="Material preview"
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
                        ref={materialImageInputRef}
                        style={{ display: "none" }}
                        onChange={handleMaterialImageChange}
                      />
                    </div>
                    <span className="text-xs text-gray-500 text-center max-w-[140px]">
                      Click to upload material image
                    </span>
                    <div className="flex gap-2 mt-2">
                      {materialImagePreview && (
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={handleRemoveMaterialImage}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div>
                      <Label htmlFor="materialName" className="text-sm font-medium text-gray-700">
                        Material Name *
                      </Label>
                      <Input
                        id="materialName"
                        placeholder="Material Name"
                        value={materialName}
                        onChange={(e) => {
                          const newName = e.target.value
                          handleInputChange(newName, setMaterialName)
                          // Auto-generate code from name
                          const generatedCode = generateCodeFromName(newName)
                          if (generatedCode) {
                            handleInputChange(generatedCode, setMaterialCode)
                          }
                          if (errors.materialName) {
                            setErrors((prev) => ({ ...prev, materialName: "" }))
                          }
                        }}
                        className={`mt-1 ${errors.materialName ? "border-red-500" : ""}`}
                        validationState={errors.materialName ? "error" : (materialName.trim() ? "valid" : "default")}
                        required
                      />
                      {errors.materialName && <p className="text-red-500 text-sm mt-1">{errors.materialName}</p>}
                    </div>

                    <div>
                      <Label htmlFor="materialCode" className="text-sm font-medium text-gray-700">
                        Material Code
                      </Label>
                      <Input
                        id="materialCode"
                        placeholder="Material Code"
                        value={materialCode}
                        onChange={(e) => handleInputChange(e.target.value, setMaterialCode)}
                        className="mt-1"
                        validationState={materialCode.trim() ? "valid" : "default"}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {isLabAdmin ? (
                        <div>
                          <Label htmlFor="additionalPrice" className="text-sm font-medium text-gray-700">
                            Price
                          </Label>
                          <Input
                            id="additionalPrice"
                            placeholder="Price"
                            value={additionalPrice}
                            onChange={(e) => {
                              const value = e.target.value
                              setAdditionalPrice(value)
                              setHasChanges(true)
                            }}
                            className="mt-1"
                            type="number"
                            min="0"
                            step="0.01"
                            validationState={errors.price ? "error" : (additionalPrice.trim() ? "valid" : "default")}
                          />
                          {errors.price && (
                            <p className="text-red-500 text-sm mt-1">{errors.price}</p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <RadioGroup
                            value={priceOption}
                            onValueChange={(value) => {
                              setPriceOption(value)
                              setHasChanges(true)
                            }}
                          >
                            {/* <div className="flex items-center space-x-2">
                              <RadioGroupItem value="additional" id="additional" />
                              <Label htmlFor="additional" className="text-sm">
                                <Input
                                  placeholder="Add-on Price"
                                  value={additionalPrice}
                                  onChange={(e) => handleInputChange(e.target.value, setAdditionalPrice)}
                                  className="w-32 inline-block ml-2"
                                  disabled={priceOption !== "additional"}
                                />
                              </Label>
                            </div>
                            {priceOption === "additional" && errors.price && (
                              <p className="text-red-500 text-sm mt-1 ml-8">{errors.price}</p>
                            )}
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no-additional" id="no-additional" />
                              <Label htmlFor="no-additional" className="text-sm">
                                No additional price
                              </Label>
                            </div> */}
                          </RadioGroup>
                        </div>
                      )}

                      <div>
                        <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                          Status *
                        </Label>
                        <Select 
                          value={status} 
                          onValueChange={(value) => {
                            setStatus(value)
                            setHasChanges(true)
                          }}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select Status" />
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
              </div>
            </div>

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
                      <TooltipContent className="max-w-xs p-4 bg-white border border-gray-200 shadow-lg rounded-md">
                        <p className="text-sm text-gray-600">
                          Manage different image variations for this material.
                        </p>
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
                    {isLoadingVariations ? (
                      <div className="text-center py-8 text-gray-500">Loading variations...</div>
                    ) : variations.length === 0 && pendingVariations.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No variations yet. Click "+ New variation" to add one.
                        {!material?.id && (
                          <p className="text-xs text-gray-400 mt-2">
                            Variations will be saved when you save the material.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Show pending variations first (for new materials) */}
                        {pendingVariations.map((variation) => (
                          <div
                            key={variation.tempId}
                            className={`grid grid-cols-12 gap-4 items-center py-3 px-4 border rounded-lg ${
                              variation.is_default === "Yes" ? "bg-blue-50 border-blue-200" : "bg-white"
                            } ${!material?.id ? "border-dashed border-gray-300" : ""}`}
                          >
                            <div className="col-span-1 flex items-center">
                              {variation.imagePreview ? (
                                <img
                                  src={variation.imagePreview}
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
                              {!material?.id && (
                                <span className="ml-2 text-xs text-gray-400">(Pending)</span>
                              )}
                            </div>
                            <div className="col-span-2 flex items-center justify-center">
                              <Switch
                                checked={variation.status === "Active"}
                                onCheckedChange={() => handleToggleVariationStatus(variation)}
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
                                  onClick={() => handleSetDefaultVariation(variation)}
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
                                onClick={() => handleOpenEditVariation(variation)}
                                title="Edit variation"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteVariation(variation)}
                                title="Delete variation"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {/* Show saved variations (from API) */}
                        {variations.map((variation) => (
                          <div
                            key={variation.id}
                            className={`grid grid-cols-12 gap-4 items-center py-3 px-4 border rounded-lg ${
                              variation.is_default === "Yes" ? "bg-blue-50 border-blue-200" : "bg-white"
                            }`}
                          >
                            <div className="col-span-1 flex items-center">
                              {variation.image_url ? (
                                <img
                                  src={variation.image_url}
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
                                onCheckedChange={() => handleToggleVariationStatus(variation)}
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
                                  onClick={() => handleSetDefaultVariation(variation)}
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
                                onClick={() => handleOpenEditVariation(variation)}
                                title="Edit variation"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteVariation(variation)}
                                title="Delete variation"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t">
            <Button
              variant="destructive"
              onClick={handleClose}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[#1162a8] hover:bg-[#0d4d87] w-full sm:w-auto"
              disabled={isLoading || !materialName.trim()}
            >
              {isLoading 
                ? (isCopying ? "Saving Copy..." : material && material.id ? "Saving..." : "Creating...") 
                : (isCopying ? "Save Copy" : material && material.id ? "Save Changes" : "Save Material")}
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
                  Image {editingVariation || editingPendingVariation ? "(Optional - only if updating image)" : "*"}
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
                    placeholder="e.g., Porcelain"
                    validationState={variationFormData.name.trim() ? "valid" : "default"}
                    value={variationFormData.name}
                    onChange={(e) => setVariationFormData(prev => ({ ...prev, name: e.target.value }))}
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

          <div className="flex justify-end gap-3 border-t pt-4">
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
              setEditingPendingVariation(null)
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateVariation}
              disabled={!variationFormData.name.trim() || (!editingVariation && !editingPendingVariation && !variationFormData.image)}
              className="bg-[#1162a8] hover:bg-[#0d4d87]"
            >
              {editingVariation || editingPendingVariation ? "Update Variation" : "Create Variation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Products Modal */}
      <LinkProductsModal
        isOpen={showLinkProductsModal}
        onClose={() => setShowLinkProductsModal(false)}
        entityType="material"
        context="lab"
        onApply={() => {
          setShowLinkProductsModal(false)
          toast({
            title: "Success",
            description: "Products linked successfully",
          })
        }}
      />

      <DiscardChangesDialog
        isOpen={showDiscardDialog}
        type="material"
        onDiscard={handleDiscard}
        onKeepEditing={handleKeepEditing}
      />
    </>
  )
}
