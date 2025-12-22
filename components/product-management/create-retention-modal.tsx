"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, Info, X, Trash2, Edit, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { DiscardChangesDialog } from "./discard-changes-dialog"
import { useRetention } from "@/contexts/product-retention-context"
import { useAuth } from "@/contexts/auth-context"
import { generateCodeFromName } from "@/lib/utils"
import {
  getRetentionVariations,
  createRetentionVariation,
  updateRetentionVariation,
  deleteRetentionVariation,
  fileToBase64,
  type RetentionVariation,
} from "@/services/retention-variations-api"
import { LinkProductsModal } from "./link-products-modal"
import { LinkRetentionOptionModal } from "./link-retention-option-modal"
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AddOptionModal } from "@/components/advance-mode/add-option-modal"
import { Checkbox } from "@/components/ui/checkbox"
import { Link as LinkIcon } from "lucide-react"

interface CreateRetentionModalProps {
  isOpen: boolean
  onClose: () => void
  retention?: any | null
  isCopying?: boolean // Flag to indicate if we're copying a retention
}

export function CreateRetentionModal({ isOpen, onClose, retention, isCopying = false }: CreateRetentionModalProps) {
  const { createRetention, updateRetention, getRetentionDetail } = useRetention()
  const { user } = useAuth()
  const [retentionName, setRetentionName] = useState("")
  const [retentionCode, setRetentionCode] = useState("")
  const [price, setPrice] = useState("")
  const [additionalPrice, setAdditionalPrice] = useState("")
  const [priceOption, setPriceOption] = useState("no-price")
  const [status, setStatus] = useState("Active")
  const [detailsEnabled, setDetailsEnabled] = useState(true)
  const [linkToProductsExpanded, setLinkToProductsExpanded] = useState(false)
  const [imageVariationsOpen, setImageVariationsOpen] = useState(false)
  const [optionsExpanded, setOptionsExpanded] = useState(false)
  const [showLinkProductsModal, setShowLinkProductsModal] = useState(false)
  const [showLinkRetentionOptionModal, setShowLinkRetentionOptionModal] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isNameFocused, setIsNameFocused] = useState(false)
  const [isCodeFocused, setIsCodeFocused] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const codeInputRef = useRef<HTMLInputElement>(null)

  // Image Variations state management
  const [variations, setVariations] = useState<RetentionVariation[]>([])
  const [isLoadingVariations, setIsLoadingVariations] = useState(false)
  const [showVariationModal, setShowVariationModal] = useState(false)
  const [editingVariation, setEditingVariation] = useState<RetentionVariation | null>(null)
  const [variationFormData, setVariationFormData] = useState({
    name: "",
    image: null as File | null,
    imagePreview: null as string | null,
    status: "Active" as "Active" | "Inactive",
    is_default: "No" as "Yes" | "No",
  })
  const variationFileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Options state management (for retention options, not variations)
  interface RetentionOption {
    id: string
    originalId?: number // Store original API ID for existing options
    image: string | null
    name: string
    isDefault: boolean
    status: boolean
  }

  const [options, setOptions] = useState<RetentionOption[]>([])
  const [isAddOptionModalOpen, setIsAddOptionModalOpen] = useState(false)
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null)

  // Helper to check lab admin role (matches context logic)
  const isLabAdmin = (() => {
    if (!user) return false
    if (user.roles && user.roles.length > 0) {
      return user.roles[0] === "lab_admin"
    }
    return user.role === "lab_admin"
  })()

  // Helper to check if user is superadmin
  const isSuperAdmin = (() => {
    if (!user) return false
    if (user.roles && Array.isArray(user.roles)) {
      return user.roles.includes("superadmin")
    }
    return user.role === "superadmin" || user.roles === "superadmin"
  })()

  // Get customer ID for lab admin
  const customerId = isLabAdmin ? user?.customers?.find((customer) => customer.id)?.id : undefined

  // Track changes
  useEffect(() => {
    const hasAnyChanges =
      retentionName.trim() !== "" ||
      retentionCode.trim() !== "" ||
      (isLabAdmin && price.trim() !== "") ||
      additionalPrice.trim() !== "" ||
      priceOption !== "no-price" ||
      status !== "Active" ||
      options.length > 0
    setHasChanges(hasAnyChanges)
  }, [retentionName, retentionCode, price, additionalPrice, priceOption, status, isLabAdmin, options])

  // Clear errors when user starts typing
  useEffect(() => {
    if (retentionName.trim() !== "" && errors.retentionName) {
      setErrors((prev) => ({ ...prev, retentionName: "" }))
    }
  }, [retentionName, errors.retentionName])

  useEffect(() => {
    if (retentionCode.trim() !== "" && errors.retentionCode) {
      setErrors((prev) => ({ ...prev, retentionCode: "" }))
    }
  }, [retentionCode, errors.retentionCode])

  useEffect(() => {
    if (price.trim() !== "" && errors.price) {
      setErrors((prev) => ({ ...prev, price: "" }))
    }
  }, [price, errors.price])

  // Fetch retention variations
  const fetchVariations = useCallback(async () => {
    if (!retention?.id) return
    
    setIsLoadingVariations(true)
    try {
      const response = await getRetentionVariations({ retention_id: retention.id, per_page: 100 })
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
  }, [retention?.id, toast])

  // Fetch variations when retention is set (edit mode) or when variations section is opened
  useEffect(() => {
    if (isOpen && imageVariationsOpen && retention?.id) {
      fetchVariations()
    }
  }, [isOpen, imageVariationsOpen, retention?.id, fetchVariations])

  useEffect(() => {
    let ignore = false

    async function fetchAndSetDetail() {
      if (isCopying && retention) {
        // Copying: use the provided retention data directly (no API call needed)
        // Check both top-level status and lab_retention.status
        const retentionStatus = retention.lab_retention?.status || retention.status || "Active"
        setRetentionName(retention.name || "")
        setRetentionCode(retention.code || "")
        setPrice(retention.price ? retention.price.toString() : "")
        setPriceOption(retention.price ? "with-price" : "no-price")
        setStatus(retentionStatus)
        setDetailsEnabled(retentionStatus === "Active")
        
        // Copy options if available (but without original IDs since these are new)
        if (retention.options && Array.isArray(retention.options)) {
          setOptions(retention.options.map((opt: any, idx: number) => ({
            id: String(idx + 1),
            originalId: undefined, // New options when copying
            image: opt.image_url || null,
            name: opt.name || "",
            isDefault: opt.is_default === "Yes",
            status: opt.status === "Active",
          })))
        } else {
          setOptions([])
        }
      } else if (retention && retention.id && !isCopying) {
        // Editing: fetch detail from API
        // Pass customer_id if not superadmin
        const detail = await getRetentionDetail(retention.id, !isSuperAdmin && customerId ? customerId : undefined)
        if (!ignore && detail) {
          // Check both top-level status and lab_retention.status (for lab admins)
          const retentionStatus = (detail as any).lab_retention?.status || detail.status || "Active"
          setRetentionName(detail.name || "")
          setRetentionCode(detail.code || "")
          setPrice(detail.price ? detail.price.toString() : "")
          setPriceOption(detail.price ? "with-price" : "no-price")
          setStatus(retentionStatus)
          setDetailsEnabled(retentionStatus === "Active")
          
          // Load options if available
          if ((detail as any).options && Array.isArray((detail as any).options)) {
            setOptions((detail as any).options.map((opt: any, idx: number) => ({
              id: opt.id ? String(opt.id) : String(idx + 1),
              originalId: opt.id,
              image: opt.image_url || null,
              name: opt.name || "",
              isDefault: opt.is_default === "Yes",
              status: opt.status === "Active",
            })))
          } else {
            setOptions([])
          }
        }
      } else {
        // New retention: reset form
        setRetentionName("")
        setRetentionCode("")
        setPrice("")
        setPriceOption("no-price")
        setStatus("Active")
        setDetailsEnabled(true)
        setOptions([])
      }
      setErrors({})
      setHasChanges(false)
    }

    fetchAndSetDetail()
    return () => { ignore = true }
  }, [retention, isOpen, getRetentionDetail, isCopying])

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!retentionName.trim()) {
      newErrors.retentionName = "Retention name is required"
    }

    if (!retentionCode.trim()) {
      newErrors.retentionCode = "Retention code is required"
    }

    if (isLabAdmin && price.trim() !== "" && isNaN(Number(price))) {
      newErrors.price = "Price must be a valid number"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardDialog(true)
    } else {
      onClose()
    }
  }

  // Handle create variation
  const handleCreateVariation = async () => {
    if (!retention?.id) {
      toast({
        title: "Error",
        description: "Retention ID is required. Please save the retention first.",
        variant: "destructive",
      })
      return
    }

    if (!variationFormData.name.trim()) {
      toast({
        title: "Error",
        description: "Variation name is required",
        variant: "destructive",
      })
      return
    }

    if (!variationFormData.image) {
      toast({
        title: "Error",
        description: "Image is required",
        variant: "destructive",
      })
      return
    }

    try {
      const imageBase64 = await fileToBase64(variationFormData.image)
      const payload = {
        retention_id: retention.id,
        name: variationFormData.name.trim(),
        image: imageBase64,
        status: variationFormData.status,
        is_default: variationFormData.is_default,
      }

      await createRetentionVariation(payload)
      toast({
        title: "Success",
        description: "Variation created successfully",
      })
      
      // Reset form and close modal
      setVariationFormData({
        name: "",
        image: null,
        imagePreview: null,
        status: "Active",
        is_default: "No",
      })
      setShowVariationModal(false)
      setEditingVariation(null)
      
      // Refresh variations list
      await fetchVariations()
    } catch (error) {
      console.error("Failed to create variation:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create variation",
        variant: "destructive",
      })
    }
  }

  // Handle update variation
  const handleUpdateVariation = async (variation: RetentionVariation, updates: any) => {
    try {
      await updateRetentionVariation(variation.id, updates)
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
  const handleDeleteVariation = async (variation: RetentionVariation) => {
    if (!confirm(`Are you sure you want to delete "${variation.name}"?`)) {
      return
    }

    try {
      await deleteRetentionVariation(variation.id)
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
  const handleToggleVariationStatus = (variation: RetentionVariation) => {
    const newStatus = variation.status === "Active" ? "Inactive" : "Active"
    handleUpdateVariation(variation, { status: newStatus })
  }

  // Handle set default variation
  const handleSetDefaultVariation = async (variation: RetentionVariation) => {
    try {
      await handleUpdateVariation(variation, { is_default: "Yes" })
      // Optionally set all other variations to "No" if needed
      // The backend might handle this automatically
    } catch (error) {
      console.error("Failed to set default variation:", error)
    }
  }

  // Open create variation modal
  const handleOpenCreateVariation = () => {
    if (!retention?.id) {
      toast({
        title: "Info",
        description: "Please save the retention first before adding variations",
        variant: "default",
      })
      return
    }
    setEditingVariation(null)
    setVariationFormData({
      name: "",
      image: null,
      imagePreview: null,
      status: "Active",
      is_default: "No",
    })
    setShowVariationModal(true)
  }

  const handleDiscard = () => {
    setRetentionName("")
    setRetentionCode("")
    setPrice("")
    setAdditionalPrice("")
    setPriceOption("no-price")
    setStatus("Active")
    setDetailsEnabled(true)
    setLinkToProductsExpanded(false)
    setImageVariationsOpen(false)
    setOptionsExpanded(false)
    setShowDiscardDialog(false)
    setHasChanges(false)
    setErrors({})
    setOptions([])
    onClose()
  }

  // Handle toggle change - sync with status
  const handleToggleChange = (checked: boolean) => {
    setDetailsEnabled(checked)
    setStatus(checked ? "Active" : "Inactive")
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      let priceValue = 0
      if (isLabAdmin) {
        priceValue = price.trim() !== "" && !isNaN(Number(price)) ? parseFloat(price) : 0
      }

      const payload: any = {
        name: retentionName.trim(),
        code: retentionCode.trim(),
        sequence: 1,
        status: status,
        price: priceValue,
        ...(isLabAdmin && customerId ? { customer_id: customerId } : {}),
      }

      // Add options if any exist
      if (options.length > 0) {
        payload.options = options.map((opt, idx) => {
          const optionPayload: any = {
            name: opt.name,
            image: opt.image || undefined,
            status: opt.status ? "Active" : "Inactive",
            is_default: opt.isDefault ? "Yes" : "No",
            sequence: idx + 1,
          }
          
          // Only include id for existing options (those that came from the API)
          if (opt.originalId && !isNaN(opt.originalId) && opt.originalId > 0) {
            optionPayload.id = opt.originalId
          }
          
          return optionPayload
        })
      }

      let success = false
      // If copying, always create a new retention (not update)
      if (retention && retention.id && !isCopying) {
        success = await updateRetention(retention.id, payload)
      } else {
        // Create new retention (either new or copy)
        success = await createRetention(payload)
      }

      if (success) {
        setRetentionName("")
        setRetentionCode("")
        setPrice("")
        setAdditionalPrice("")
        setPriceOption("no-price")
        setStatus("Active")
        setDetailsEnabled(true)
        setLinkToProductsExpanded(false)
        setImageVariationsOpen(false)
        setOptionsExpanded(false)
        setHasChanges(false)
        setErrors({})
        setOptions([])
        onClose()
      }
    } catch (error) {
      console.error("Error creating/updating retention:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Options management handlers
  const handleAddOption = () => {
    setEditingOptionId(null)
    setIsAddOptionModalOpen(true)
  }

  const handleEditOption = (id: string) => {
    setEditingOptionId(id)
    setIsAddOptionModalOpen(true)
  }

  const handleSaveNewOption = (data: { image: string | null; label: string }) => {
    if (editingOptionId) {
      // Update existing option
      setOptions(
        options.map((opt) =>
          opt.id === editingOptionId
            ? { ...opt, image: data.image, name: data.label }
            : opt
        )
      )
      setEditingOptionId(null)
    } else {
      // Add new option
      const newOption: RetentionOption = {
        id: String(options.length + 1),
        originalId: undefined,
        image: data.image,
        name: data.label,
        isDefault: false,
        status: true,
      }
      setOptions([...options, newOption])
    }
  }

  const handleDeleteOption = (id: string) => {
    setOptions(options.filter((opt) => opt.id !== id))
  }

  const handleDuplicateOption = (id: string) => {
    const option = options.find((opt) => opt.id === id)
    if (option) {
      const newOption: RetentionOption = {
        ...option,
        id: String(options.length + 1),
        originalId: undefined,
        name: `${option.name} (Copy)`,
      }
      setOptions([...options, newOption])
    }
  }

  const toggleDefault = (id: string) => {
    setOptions(
      options.map((opt) => ({
        ...opt,
        isDefault: opt.id === id,
      }))
    )
  }

  const toggleStatus = (id: string) => {
    setOptions(
      options.map((opt) =>
        opt.id === id ? { ...opt, status: !opt.status } : opt
      )
    )
  }

  const isSaveDisabled = !retentionName.trim() || !retentionCode.trim() || isSubmitting

  // Determine border colors based on focus and validation state
  const getNameBorderColor = () => {
    if (retentionName.trim()) return "border-[#119933]" // valid state
    if (isNameFocused) return "border-[#1162A8]" // focus state
    return "border-[#7F7F7F]" // default
  }

  const getCodeBorderColor = () => {
    if (retentionCode.trim()) return "border-[#119933]" // valid state
    if (isCodeFocused) return "border-[#1162A8]" // focus state
    return "border-[#7F7F7F]" // default
  }

  // Determine label colors
  const getNameLabelColor = () => {
    if (retentionName.trim()) return "text-[#119933]"
    if (isNameFocused) return "text-[#1162A8]"
    return "text-[#7F7F7F]"
  }

  const getCodeLabelColor = () => {
    if (retentionCode.trim()) return "text-[#119933]"
    if (isCodeFocused) return "text-[#1162A8]"
    return "text-[#7F7F7F]"
  }

  // Determine ring/glow effect
  const getNameRingEffect = () => {
    if (isNameFocused && retentionName.trim()) {
      return "ring-2 ring-[#119933] ring-opacity-20 shadow-[0_0_0_4px_rgba(17,153,51,0.15)]"
    }
    if (isNameFocused) {
      return "ring-2 ring-[#1162A8] ring-opacity-20 shadow-[0_0_0_4px_rgba(17,98,168,0.15)]"
    }
    return ""
  }

  const getCodeRingEffect = () => {
    if (isCodeFocused && retentionCode.trim()) {
      return "ring-2 ring-[#119933] ring-opacity-20 shadow-[0_0_0_4px_rgba(17,153,51,0.15)]"
    }
    if (isCodeFocused) {
      return "ring-2 ring-[#1162A8] ring-opacity-20 shadow-[0_0_0_4px_rgba(17,98,168,0.15)]"
    }
    return ""
  }

  const hasNameValue = retentionName.trim() !== ""
  const hasCodeValue = retentionCode.trim() !== ""

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden bg-white rounded-md">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <DialogTitle className="text-xl font-bold">
              {isCopying ? "Copy Retention Type" : retention && retention.id ? "Edit Retention Type" : "Add Retention Type"}
            </DialogTitle>
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Retention Type Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium">Retention Type Details</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[300px]">
                        <p>Configure the basic information for this retention type, including name, code, status, and price settings.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  className="data-[state=checked]:bg-[#1162a8]"
                  checked={detailsEnabled}
                  onCheckedChange={handleToggleChange}
                />
              </div>

              <div className="space-y-6">
                {/* Retention type name field */}
                <div className="relative">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={retentionName}
                    onChange={(e) => {
                      const newName = e.target.value
                      setRetentionName(newName)
                      // Auto-generate code from name
                      const generatedCode = generateCodeFromName(newName)
                      if (generatedCode) {
                        setRetentionCode(generatedCode)
                      }
                      setHasChanges(true)
                    }}
                    onFocus={() => setIsNameFocused(true)}
                    onBlur={() => setIsNameFocused(false)}
                    disabled={!detailsEnabled}
                    className={cn(
                      "w-full box-border flex flex-row items-center bg-white border border-solid rounded-[7.7px] text-[#1F2937] focus:outline-none",
                      "transition-all ease-out",
                      getNameBorderColor(),
                      getNameRingEffect(),
                      !isNameFocused && !detailsEnabled && "opacity-50 cursor-not-allowed",
                      !isNameFocused && detailsEnabled && "hover:shadow-[0_0_8px_rgba(17,98,168,0.2)] transition-shadow duration-150",
                      errors.retentionName && "border-red-500"
                    )}
                    style={{
                      padding: "25px 12.8px 9.24px 12.32px",
                      borderWidth: "0.740384px",
                      fontFamily: "Arial",
                      fontStyle: "normal",
                      fontWeight: 400,
                      fontSize: "17px",
                      lineHeight: "18px",
                      transitionDuration: isNameFocused ? "250ms" : "150ms",
                      transitionTimingFunction: isNameFocused ? "ease-in-out" : "ease-out",
                      height: "36.95px",
                    }}
                  />
                  <label
                    className={cn(
                      "absolute bg-white pointer-events-none transition-all duration-200 ease-out",
                      getNameLabelColor(),
                      errors.retentionName && "text-red-500"
                    )}
                    style={{
                      left: "9.23px",
                      top: "-6.15px",
                      height: "14px",
                      fontFamily: "Arial",
                      fontStyle: "normal",
                      fontWeight: 400,
                      fontSize: "14px",
                      lineHeight: "14px",
                    }}
                  >
                    Retention type name <span className="text-red-500">*</span>
                  </label>
                  {/* Validation Icon */}
                  {hasNameValue && !errors.retentionName && (
                    <div className="absolute right-[12.32px] top-1/2 -translate-y-1/2">
                      <Check className="h-5 w-5 text-[#119933]" aria-label="Valid" />
                    </div>
                  )}
                  {errors.retentionName && (
                    <p className="text-red-500 text-xs mt-1 ml-2">{errors.retentionName}</p>
                  )}
                </div>

                {/* Code field */}
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        ref={codeInputRef}
                        type="text"
                        value={retentionCode}
                        onChange={(e) => {
                          setRetentionCode(e.target.value)
                          setHasChanges(true)
                        }}
                        onFocus={() => setIsCodeFocused(true)}
                        onBlur={() => setIsCodeFocused(false)}
                        disabled={!detailsEnabled}
                        className={cn(
                          "w-full box-border flex flex-row items-center bg-white border border-solid rounded-[7.7px] text-[#1F2937] focus:outline-none",
                          "transition-all ease-out",
                          getCodeBorderColor(),
                          getCodeRingEffect(),
                          !isCodeFocused && !detailsEnabled && "opacity-50 cursor-not-allowed",
                          !isCodeFocused && detailsEnabled && "hover:shadow-[0_0_8px_rgba(17,98,168,0.2)] transition-shadow duration-150",
                          errors.retentionCode && "border-red-500"
                        )}
                        style={{
                          padding: "25px 12.8px 9.24px 12.32px",
                          borderWidth: "0.740384px",
                          fontFamily: "Arial",
                          fontStyle: "normal",
                          fontWeight: 400,
                          fontSize: "17px",
                          lineHeight: "18px",
                          transitionDuration: isCodeFocused ? "250ms" : "150ms",
                          transitionTimingFunction: isCodeFocused ? "ease-in-out" : "ease-out",
                          height: "36.95px",
                        }}
                      />
                      <label
                        className={cn(
                          "absolute bg-white pointer-events-none transition-all duration-200 ease-out",
                          getCodeLabelColor(),
                          errors.retentionCode && "text-red-500"
                        )}
                        style={{
                          left: "9.23px",
                          top: "-6.15px",
                          height: "14px",
                          fontFamily: "Arial",
                          fontStyle: "normal",
                          fontWeight: 400,
                          fontSize: "14px",
                          lineHeight: "14px",
                        }}
                      >
                        Code <span className="text-red-500">*</span>
                      </label>
                      {/* Validation Icon */}
                      {hasCodeValue && !errors.retentionCode && (
                        <div className="absolute right-[12.32px] top-1/2 -translate-y-1/2">
                          <Check className="h-5 w-5 text-[#119933]" aria-label="Valid" />
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowLinkRetentionOptionModal(true)}
                      disabled={!detailsEnabled}
                      className="whitespace-nowrap h-[36.95px]"
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Link retention option
                    </Button>
                  </div>
                  {errors.retentionCode && (
                    <p className="text-red-500 text-xs mt-1 ml-2">{errors.retentionCode}</p>
                  )}
                </div>
              </div>
            </div>

          </div>

          <div className="px-6 py-4 flex justify-end gap-3 border-t">
            <Button
              variant="destructive"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="bg-[#1162a8] hover:bg-[#0f5496] disabled:opacity-50"
            >
              {isSubmitting 
                ? (isCopying ? "Copying..." : "Saving...") 
                : (isCopying ? "Copy Retention" : "Save Retention")}
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
                    placeholder="e.g., Clasp"
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
              })
              setEditingVariation(null)
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateVariation}
              disabled={!variationFormData.name.trim() || (!editingVariation && !variationFormData.image)}
              className="bg-[#1162a8] hover:bg-[#0d4d87]"
            >
              {editingVariation ? "Update Variation" : "Create Variation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Products Modal */}
      <LinkProductsModal
        isOpen={showLinkProductsModal}
        onClose={() => setShowLinkProductsModal(false)}
        entityType="retention"
        context="lab"
        onApply={() => {
          setShowLinkProductsModal(false)
          toast({
            title: "Success",
            description: "Products linked successfully",
          })
        }}
      />

      <LinkRetentionOptionModal
        isOpen={showLinkRetentionOptionModal}
        onClose={() => setShowLinkRetentionOptionModal(false)}
        onApply={(selectedRetentionTypes, selectedRetentionOptions) => {
          // Handle the linking logic here
          // This will be called when user clicks "Link retention type" button
          console.log("Linking retention types:", selectedRetentionTypes, "to options:", selectedRetentionOptions)
          setShowLinkRetentionOptionModal(false)
          toast({
            title: "Success",
            description: "Retention types linked to options successfully",
          })
        }}
      />

      <DiscardChangesDialog
        isOpen={showDiscardDialog}
        type="retention"
        onDiscard={handleDiscard}
        onKeepEditing={() => setShowDiscardDialog(false)}
      />

      {/* Add Option Modal */}
      <AddOptionModal
        isOpen={isAddOptionModalOpen}
        onClose={() => {
          setIsAddOptionModalOpen(false)
          setEditingOptionId(null)
        }}
        onSave={handleSaveNewOption}
        title={editingOptionId ? "Edit option" : "Add new option"}
        option={editingOptionId ? options.find(opt => opt.id === editingOptionId) ? {
          image: options.find(opt => opt.id === editingOptionId)?.image || null,
          label: options.find(opt => opt.id === editingOptionId)?.name || ""
        } : null : null}
        isEditing={!!editingOptionId}
      />
    </>
  )
}
