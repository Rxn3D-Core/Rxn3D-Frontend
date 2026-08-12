"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, Info, Link as LinkIcon, Check, Maximize2 } from "lucide-react"
import { DiscardChangesDialog } from "./discard-changes-dialog"
import { LinkRetentionOptionModal } from "./link-retention-option-modal"
import { GlobalRetentionOptionToothImagesPanel } from "@/components/product-management/global-retention-option-tooth-images-panel"
import { useAuth } from "@/contexts/auth-context"
import { generateCodeFromName } from "@/lib/utils"
import { isLabLibraryRole, resolveLibraryCustomerId, userHasLabLibraryRole } from "@/lib/customer-scope"
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
    getRetentionOption,
    createRetentionOption,
    updateRetentionOption,
    type RetentionOptionPayload,
    type RetentionOptionUpdatePayload,
} from "@/services/retention-options-api"
import {
    RETENTION_SELECTOR_SHAPES,
    getShapeApiName,
    getShapeIdFromApiName,
} from "@/components/retention-option-selector-shapes"
import { RetentionSelectorShapeImage } from "@/components/RetentionSelectorShapeImage"

interface CreateRetentionOptionModalProps {
    isOpen: boolean
    onClose: () => void
    option?: any | null
    isCopying?: boolean
    onSuccess?: () => void
    /**
     * When opening from nested hosts (e.g. product modal), pin lab/global scope explicitly.
     * Otherwise customer id is inferred from auth/storage.
     */
    scopedCustomerId?: number | null
    /** Global product library: edit mode shows a tab for per-tooth catalog images (teeth 1–32). */
    globalToothImageLibrary?: boolean
}

export function CreateRetentionOptionModal({
    isOpen,
    onClose,
    option,
    isCopying = false,
    onSuccess,
    scopedCustomerId,
    globalToothImageLibrary = false,
}: CreateRetentionOptionModalProps) {
    const { user } = useAuth()
    const { toast } = useToast()
    const [optionName, setOptionName] = useState("")
    const [optionCode, setOptionCode] = useState("")
    const [sequence, setSequence] = useState<number>(1)
    const [status, setStatus] = useState<"Active" | "Inactive">("Active")
    const [detailsEnabled, setDetailsEnabled] = useState(true)
    const [selectedShape, setSelectedShape] = useState<string>("")
    const [showDiscardDialog, setShowDiscardDialog] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoadingDetails, setIsLoadingDetails] = useState(false)
    const [hasImplant, setHasImplant] = useState<"Yes" | "No">("No")
    const [hasAbutment, setHasAbutment] = useState<"Yes" | "No">("No")
    const [errors, setErrors] = useState<{ [key: string]: string }>({})
    const [showLinkRetentionOptionModal, setShowLinkRetentionOptionModal] = useState(false)
    const [imageBase64, setImageBase64] = useState<string | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const imageInputRef = useRef<HTMLInputElement>(null)
    const [isNameFocused, setIsNameFocused] = useState(false)
    const [isCodeFocused, setIsCodeFocused] = useState(false)
    const [isSequenceFocused, setIsSequenceFocused] = useState(false)
    const nameInputRef = useRef<HTMLInputElement>(null)
    const codeInputRef = useRef<HTMLInputElement>(null)
    const sequenceInputRef = useRef<HTMLInputElement>(null)
    const [mainTab, setMainTab] = useState<"details" | "library">("details")
    const [isMaximized, setIsMaximized] = useState(false)

    const showGlobalLibraryTab =
        globalToothImageLibrary && Boolean(option?.id) && !isCopying

    useEffect(() => {
        if (isOpen) {
            setMainTab("details")
        } else {
            setIsMaximized(false)
        }
    }, [isOpen])

    const toggleMaximize = () => setIsMaximized((v) => !v)

    // Lab library staff (lab_admin, lab_user, lab_driver)
    const isLabAdmin = (() => {
        if (!user) return false
        if (userHasLabLibraryRole(user)) return true
        if (typeof window !== "undefined") {
            return isLabLibraryRole(localStorage.getItem("role"))
        }
        return false
    })()

    const getCustomerId = () => resolveLibraryCustomerId(user)

    const inferredCustomerId = getCustomerId()
    const customerId =
      typeof scopedCustomerId === "number" && scopedCustomerId > 0 ? scopedCustomerId : inferredCustomerId

    // Fetch details when editing
    useEffect(() => {
        if (isOpen) {
            if (isCopying && option) {
                // Copying: use provided option data
                setOptionName(option.name || "")
                setOptionCode(option.code || "")
                setSequence(option.sequence || 1)
                setStatus(option.status === "Inactive" ? "Inactive" : "Active")
                setDetailsEnabled(option.status === "Active")
                setSelectedShape(getShapeIdFromApiName(option.selector_shape))
                setHasImplant(option.has_implant === "Yes" ? "Yes" : "No")
                setHasAbutment(option.has_abutment === "Yes" ? "Yes" : "No")
                setImageBase64(null)
                setImagePreview(option.image_url || null)
            } else if (option && option.id && !isCopying) {
                // Editing: fetch full details from API
                setIsLoadingDetails(true)
                getRetentionOption(option.id, customerId ?? undefined)
                    .then((response) => {
                        const data = response.data
                        setOptionName(data.name || "")
                        setOptionCode(data.code || option?.code || "")
                        setSequence(data.sequence || 1)
                        setStatus(data.status || "Active")
                        setDetailsEnabled(data.status === "Active")
                        setSelectedShape(getShapeIdFromApiName(data.selector_shape))
                        setHasImplant(data.has_implant === "Yes" ? "Yes" : "No")
                        setHasAbutment(data.has_abutment === "Yes" ? "Yes" : "No")
                        setImageBase64(null)
                        setImagePreview(data.image_url || null)
                        setIsLoadingDetails(false)
                    })
                    .catch((error) => {
                        console.error("Failed to fetch retention option details:", error)
                        toast({
                            title: "Error",
                            description: error.message || "Failed to load retention option details",
                            variant: "destructive",
                        })
                        setIsLoadingDetails(false)
                        // Fallback to provided option data if available
                        if (option) {
                            setOptionName(option.name || "")
                            setOptionCode(option.code || "")
                            setSequence(option.sequence || 1)
                            setStatus(option.status === "Inactive" ? "Inactive" : "Active")
                            setDetailsEnabled(option.status === "Active")
                            setSelectedShape(getShapeIdFromApiName(option.selector_shape))
                            setHasImplant(option.has_implant === "Yes" ? "Yes" : "No")
                            setHasAbutment(option.has_abutment === "Yes" ? "Yes" : "No")
                            setImageBase64(null)
                            setImagePreview(option.image_url || null)
                        }
                    })
            } else {
                // New option: reset form
                setOptionName("")
                setOptionCode("")
                setSequence(1)
                setStatus("Active")
                setDetailsEnabled(true)
                setSelectedShape("")
                setHasImplant("No")
                setHasAbutment("No")
                setImageBase64(null)
                setImagePreview(null)
            }
            setErrors({})
            setHasChanges(false)
        }
    }, [isOpen, option, isCopying, toast])

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {}

        if (!optionName.trim()) {
            newErrors.optionName = "Retention option name is required"
        }

        if (!optionCode.trim()) {
            newErrors.optionCode = "Code is required"
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

    const handleDiscard = () => {
        setOptionName("")
        setOptionCode("")
        setSequence(1)
        setStatus("Active")
        setDetailsEnabled(true)
        setSelectedShape("")
        setHasImplant("No")
        setHasAbutment("No")
        setImageBase64(null)
        setImagePreview(null)
        setShowDiscardDialog(false)
        setHasChanges(false)
        setErrors({})
        onClose()
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const result = event.target?.result as string
            setImageBase64(result) // full data URL, will strip prefix when sending
            setImagePreview(result)
            setHasChanges(true)
        }
        reader.readAsDataURL(file)
    }

    const handleRemoveImage = () => {
        setImageBase64(null)
        setImagePreview(null)
        setHasChanges(true)
        if (imageInputRef.current) {
            imageInputRef.current.value = ""
        }
    }

    const handleToggleChange = (checked: boolean) => {
        setDetailsEnabled(checked)
        setStatus(checked ? "Active" : "Inactive")
        setHasChanges(true)
    }

    const handleSave = async () => {
        if (!validateForm()) {
            return
        }

        setIsSubmitting(true)

        try {
            const shapeApiName = getShapeApiName(selectedShape)
            
            // Send the full data URL — backend Base64Image rule requires the data:image/...;base64, prefix
            const imagePayload = imageBase64 ?? undefined

            if (option && option.id && !isCopying) {
                // Update existing option
                const updatePayload: RetentionOptionUpdatePayload = {
                    name: optionName.trim(),
                    code: optionCode.trim(),
                    status: status,
                    sequence: sequence,
                    selector_shape: shapeApiName || undefined,
                    has_implant: hasImplant,
                    has_abutment: hasAbutment,
                    image: imagePayload,
                }

                // Add customer_id for lab library roles if needed
                if (customerId) {
                    updatePayload.customer_id = customerId
                }

                await updateRetentionOption(option.id, updatePayload)

                toast({
                    title: "Success",
                    description: "Retention option updated successfully",
                })
            } else {
                // Create new option
                const createPayload: RetentionOptionPayload = {
                    name: optionName.trim(),
                    code: optionCode.trim(),
                    status: status,
                    sequence: sequence,
                    selector_shape: shapeApiName || undefined,
                    has_implant: hasImplant,
                    has_abutment: hasAbutment,
                    is_custom: isLabAdmin ? "Yes" : "No",
                    image: imagePayload,
                }

                // Add customer_id for lab library roles
                if (customerId) {
                    createPayload.customer_id = customerId
                }

                await createRetentionOption(createPayload)

                toast({
                    title: "Success",
                    description: "Retention option created successfully",
                })
            }

            // Call onSuccess callback to refresh the list
            if (onSuccess) {
                onSuccess()
            }

            onClose()
            // Reset form
            setOptionName("")
            setOptionCode("")
            setSequence(1)
            setStatus("Active")
            setDetailsEnabled(true)
            setSelectedShape("")
            setHasImplant("No")
            setHasAbutment("No")
            setImageBase64(null)
            setImagePreview(null)
            setHasChanges(false)
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to save retention option",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const isSaveDisabled = !optionName.trim() || !optionCode.trim() || isSubmitting

    // Determine border colors based on focus and validation state
    const getNameBorderColor = () => {
        if (optionName.trim()) return "border-[#119933]" // valid state
        if (isNameFocused) return "border-[#1162A8]" // focus state
        return "border-[#7F7F7F]" // default
    }

    const getCodeBorderColor = () => {
        if (optionCode.trim()) return "border-[#119933]" // valid state
        if (isCodeFocused) return "border-[#1162A8]" // focus state
        return "border-[#7F7F7F]" // default
    }

    // Determine label colors
    const getNameLabelColor = () => {
        if (optionName.trim()) return "text-[#119933]"
        if (isNameFocused) return "text-[#1162A8]"
        return "text-[#7F7F7F]"
    }

    const getCodeLabelColor = () => {
        if (optionCode.trim()) return "text-[#119933]"
        if (isCodeFocused) return "text-[#1162A8]"
        return "text-[#7F7F7F]"
    }

    // Determine ring/glow effect
    const getNameRingEffect = () => {
        if (isNameFocused && optionName.trim()) {
            return "ring-2 ring-[#119933] ring-opacity-20 shadow-[0_0_0_4px_rgba(17,153,51,0.15)]"
        }
        if (isNameFocused) {
            return "ring-2 ring-[#1162A8] ring-opacity-20 shadow-[0_0_0_4px_rgba(17,98,168,0.15)]"
        }
        return ""
    }

    const getCodeRingEffect = () => {
        if (isCodeFocused && optionCode.trim()) {
            return "ring-2 ring-[#119933] ring-opacity-20 shadow-[0_0_0_4px_rgba(17,153,51,0.15)]"
        }
        if (isCodeFocused) {
            return "ring-2 ring-[#1162A8] ring-opacity-20 shadow-[0_0_0_4px_rgba(17,98,168,0.15)]"
        }
        return ""
    }

    // Sequence field styling helpers
    const getSequenceBorderColor = () => {
        if (sequence > 0) return "border-[#119933]" // valid state
        if (isSequenceFocused) return "border-[#1162A8]" // focus state
        return "border-[#7F7F7F]" // default
    }

    const getSequenceLabelColor = () => {
        if (sequence > 0) return "text-[#119933]"
        if (isSequenceFocused) return "text-[#1162A8]"
        return "text-[#7F7F7F]"
    }

    const getSequenceRingEffect = () => {
        if (isSequenceFocused && sequence > 0) {
            return "ring-2 ring-[#119933] ring-opacity-20 shadow-[0_0_0_4px_rgba(17,153,51,0.15)]"
        }
        if (isSequenceFocused) {
            return "ring-2 ring-[#1162A8] ring-opacity-20 shadow-[0_0_0_4px_rgba(17,98,168,0.15)]"
        }
        return ""
    }

    const hasNameValue = optionName.trim() !== ""
    const hasCodeValue = optionCode.trim() !== ""
    const hasSequenceValue = sequence > 0

    const dialogClass = `p-0 gap-0 transition-all duration-300 ease-in-out overflow-hidden flex min-h-0 flex-col bg-white rounded-md ${
        isMaximized
            ? "w-[95vw] h-[95vh] max-w-[95vw] max-h-[95vh]"
            : showGlobalLibraryTab
              ? "w-[97vw] sm:w-[95vw] md:w-[94vw] max-w-[1380px] h-[85vh] sm:h-[90vh] max-h-[85vh] sm:max-h-[90vh]"
              : "sm:max-w-[600px] max-h-[85vh] sm:max-h-[90vh]"
    }`

    const detailsScrollClass = showGlobalLibraryTab
        ? "p-6 space-y-6 min-h-0 flex-1 overflow-y-auto"
        : "p-6 space-y-6 max-h-[70vh] overflow-y-auto"

    const modalFooter = (
        <div className="flex justify-end gap-3 px-6 py-4 border-t flex-shrink-0 bg-white">
            <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="border-red-500 text-red-500 hover:bg-red-50"
            >
                Cancel
            </Button>
            {(!showGlobalLibraryTab || mainTab === "details") && (
                <Button
                    type={showGlobalLibraryTab ? "submit" : "button"}
                    form={showGlobalLibraryTab ? "retention-option-form" : undefined}
                    onClick={showGlobalLibraryTab ? undefined : () => void handleSave()}
                    disabled={isSaveDisabled || isLoadingDetails}
                    className="bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] hover:brightness-110 text-white"
                >
                    {isSubmitting ? "Saving..." : "Save Retention"}
                </Button>
            )}
        </div>
    )

    const detailsBody = (
        <div className={detailsScrollClass}>
                        {isLoadingDetails && (
                            <div className="flex items-center justify-center py-8">
                                <div className="text-sm text-gray-500">Loading retention option details...</div>
                            </div>
                        )}
                        {!isLoadingDetails && (
                            <>
                                {/* Image upload + Retention Option Details row */}
                                <div className="flex gap-6 items-start">
                                    {/* Image Upload - top left */}
                                    <div className="flex flex-col items-center gap-3 flex-shrink-0">
                                        <div
                                            className={cn(
                                                "relative overflow-hidden border-2 border-dashed rounded-xl h-[140px] w-[140px] bg-gradient-to-br from-gray-50 to-gray-100 transition-all duration-200 cursor-pointer group flex items-center justify-center",
                                                detailsEnabled
                                                    ? "border-gray-300 hover:border-gray-400 hover:from-gray-100 hover:to-gray-200"
                                                    : "border-gray-200 opacity-50 cursor-not-allowed"
                                            )}
                                            onClick={() => detailsEnabled && imageInputRef.current?.click()}
                                        >
                                            {imagePreview ? (
                                                <img
                                                    src={imagePreview}
                                                    alt="Retention option image"
                                                    className="absolute inset-0 w-full h-full object-contain"
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
                                                ref={imageInputRef}
                                                style={{ display: "none" }}
                                                onChange={handleImageChange}
                                                disabled={!detailsEnabled}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-500 text-center max-w-[140px]">
                                            Click to upload image
                                        </span>
                                        {imagePreview && detailsEnabled && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleRemoveImage}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                Remove
                                            </Button>
                                        )}
                                    </div>

                                    {/* Retention Option Details */}
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base font-medium">Retention Option Details</span>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom" className="max-w-xs">
                                                        <p>Configure the basic information for this retention option.</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
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
                                                    value={optionName}
                                                    onChange={(e) => {
                                                        const newName = e.target.value
                                                        setOptionName(newName)
                                                        if (!option || isCopying) {
                                                            const generatedCode = generateCodeFromName(newName)
                                                            if (generatedCode) setOptionCode(generatedCode)
                                                        }
                                                        setHasChanges(true)
                                                    }}
                                                    onFocus={() => setIsNameFocused(true)}
                                                    onBlur={() => setIsNameFocused(false)}
                                                    disabled={!detailsEnabled}
                                                    className={cn(
                                                        "w-full box-border flex flex-row items-center bg-white border border-solid rounded-[7.7px] text-[#1F2937] focus:outline-none transition-all ease-out",
                                                        getNameBorderColor(),
                                                        getNameRingEffect(),
                                                        !isNameFocused && !detailsEnabled && "opacity-50 cursor-not-allowed",
                                                        !isNameFocused && detailsEnabled && "hover:shadow-[0_0_8px_rgba(17,98,168,0.2)] transition-shadow duration-150",
                                                        errors.optionName && "border-red-500"
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
                                                        errors.optionName && "text-red-500"
                                                    )}
                                                    style={{ left: "9.23px", top: "-6.15px", height: "14px", fontFamily: "Arial", fontStyle: "normal", fontWeight: 400, fontSize: "14px", lineHeight: "14px" }}
                                                >
                                                    Retention option name <span className="text-red-500">*</span>
                                                </label>
                                                {hasNameValue && !errors.optionName && (
                                                    <div className="absolute right-[12.32px] top-1/2 -translate-y-1/2">
                                                        <Check className="h-5 w-5 text-[#119933]" aria-label="Valid" />
                                                    </div>
                                                )}
                                                {errors.optionName && (
                                                    <p className="text-red-500 text-xs mt-1 ml-2">{errors.optionName}</p>
                                                )}
                                            </div>

                                            {/* Code field */}
                                            <div className="relative">
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <input
                                                            ref={codeInputRef}
                                                            type="text"
                                                            value={optionCode}
                                                            onChange={(e) => { setOptionCode(e.target.value); setHasChanges(true) }}
                                                            onFocus={() => setIsCodeFocused(true)}
                                                            onBlur={() => setIsCodeFocused(false)}
                                                            disabled={!detailsEnabled}
                                                            className={cn(
                                                                "w-full box-border flex flex-row items-center bg-white border border-solid rounded-[7.7px] text-[#1F2937] focus:outline-none transition-all ease-out",
                                                                getCodeBorderColor(),
                                                                getCodeRingEffect(),
                                                                !isCodeFocused && !detailsEnabled && "opacity-50 cursor-not-allowed",
                                                                !isCodeFocused && detailsEnabled && "hover:shadow-[0_0_8px_rgba(17,98,168,0.2)] transition-shadow duration-150",
                                                                errors.optionCode && "border-red-500"
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
                                                                errors.optionCode && "text-red-500"
                                                            )}
                                                            style={{ left: "9.23px", top: "-6.15px", height: "14px", fontFamily: "Arial", fontStyle: "normal", fontWeight: 400, fontSize: "14px", lineHeight: "14px" }}
                                                        >
                                                            Code <span className="text-red-500">*</span>
                                                        </label>
                                                        {hasCodeValue && !errors.optionCode && (
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
                                                {errors.optionCode && (
                                                    <p className="text-red-500 text-xs mt-1 ml-2">{errors.optionCode}</p>
                                                )}
                                            </div>

                                            {/* Sequence field */}
                                            <div className="relative">
                                                <input
                                                    ref={sequenceInputRef}
                                                    type="number"
                                                    min="1"
                                                    value={sequence}
                                                    onChange={(e) => { setSequence(Math.max(1, parseInt(e.target.value) || 1)); setHasChanges(true) }}
                                                    onFocus={() => setIsSequenceFocused(true)}
                                                    onBlur={() => setIsSequenceFocused(false)}
                                                    disabled={!detailsEnabled}
                                                    className={cn(
                                                        "w-full box-border flex flex-row items-center bg-white border border-solid rounded-[7.7px] text-[#1F2937] focus:outline-none transition-all ease-out",
                                                        getSequenceBorderColor(),
                                                        getSequenceRingEffect(),
                                                        !isSequenceFocused && !detailsEnabled && "opacity-50 cursor-not-allowed",
                                                        !isSequenceFocused && detailsEnabled && "hover:shadow-[0_0_8px_rgba(17,98,168,0.2)] transition-shadow duration-150",
                                                        errors.sequence && "border-red-500"
                                                    )}
                                                    style={{
                                                        padding: "25px 12.8px 9.24px 12.32px",
                                                        borderWidth: "0.740384px",
                                                        fontFamily: "Arial",
                                                        fontStyle: "normal",
                                                        fontWeight: 400,
                                                        fontSize: "17px",
                                                        lineHeight: "18px",
                                                        transitionDuration: isSequenceFocused ? "250ms" : "150ms",
                                                        transitionTimingFunction: isSequenceFocused ? "ease-in-out" : "ease-out",
                                                        height: "36.95px",
                                                    }}
                                                />
                                                <label
                                                    className={cn(
                                                        "absolute bg-white pointer-events-none transition-all duration-200 ease-out",
                                                        getSequenceLabelColor(),
                                                        errors.sequence && "text-red-500"
                                                    )}
                                                    style={{ left: "9.23px", top: "-6.15px", height: "14px", fontFamily: "Arial", fontStyle: "normal", fontWeight: 400, fontSize: "14px", lineHeight: "14px" }}
                                                >
                                                    Sequence
                                                </label>
                                                {hasSequenceValue && !errors.sequence && (
                                                    <div className="absolute right-[12.32px] top-1/2 -translate-y-1/2">
                                                        <Check className="h-5 w-5 text-[#119933]" aria-label="Valid" />
                                                    </div>
                                                )}
                                                {errors.sequence && (
                                                    <p className="text-red-500 text-xs mt-1 ml-2">{errors.sequence}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="rounded-md border border-gray-200 px-3 py-2.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">Has implant</p>
                                                        <p className="text-xs text-gray-500">Default: No</p>
                                                    </div>
                                                    <Switch
                                                        className="data-[state=checked]:bg-[#1162a8]"
                                                        checked={hasImplant === "Yes"}
                                                        onCheckedChange={(checked) => {
                                                            setHasImplant(checked ? "Yes" : "No")
                                                            setHasChanges(true)
                                                        }}
                                                        disabled={!detailsEnabled}
                                                    />
                                                </div>
                                            </div>
                                            <div className="rounded-md border border-gray-200 px-3 py-2.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">Has abutment</p>
                                                        <p className="text-xs text-gray-500">Default: No</p>
                                                    </div>
                                                    <Switch
                                                        className="data-[state=checked]:bg-[#1162a8]"
                                                        checked={hasAbutment === "Yes"}
                                                        onCheckedChange={(checked) => {
                                                            setHasAbutment(checked ? "Yes" : "No")
                                                            setHasChanges(true)
                                                        }}
                                                        disabled={!detailsEnabled}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Assign selector shape */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base font-medium">Assign selector shape</span>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-[300px]">
                                                    <p>Select a geometric shape to represent this retention option.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 justify-center">
                                        {RETENTION_SELECTOR_SHAPES.map((shape) => {
                                            const isSelected = selectedShape === shape.id
                                            return (
                                                <button
                                                    key={shape.id}
                                                    type="button"
                                                    onClick={() => { setSelectedShape(shape.id); setHasChanges(true) }}
                                                    className={cn(
                                                        "p-1.5 rounded-lg transition-all hover:bg-gray-50",
                                                        isSelected && "ring-2 ring-[#1162A8] ring-offset-1 bg-blue-50/50"
                                                    )}
                                                    disabled={!detailsEnabled}
                                                    title={shape.name}
                                                >
                                                    <div className="flex items-center justify-center">
                                                        <RetentionSelectorShapeImage
                                                            apiName={shape.apiName}
                                                            selected={isSelected}
                                                        />
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
        </div>
    )

    return (
        <>
            <Dialog open={isOpen} onOpenChange={() => { }}>
                <DialogContent className={dialogClass}>
                    <DialogHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b px-6 py-4 flex-shrink-0">
                        <DialogTitle className="pr-2 text-left text-xl font-bold">
                            {isCopying ? "Copy Retention Option" : option && option.id ? "Edit Retention Option" : "Add Retention Option"}
                        </DialogTitle>
                        <div className="flex items-center gap-1">
                            {showGlobalLibraryTab && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={toggleMaximize}
                                    className="h-8 w-8 hover:bg-gray-100"
                                    title={isMaximized ? "Minimize" : "Maximize"}
                                >
                                    <Maximize2 className={`h-4 w-4 transition-transform ${isMaximized ? "rotate-180" : ""}`} />
                                </Button>
                            )}
                            <Button type="button" variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 hover:bg-gray-100">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </DialogHeader>

                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        {showGlobalLibraryTab ? (
                            <Tabs
                                value={mainTab}
                                onValueChange={(v) => setMainTab(v as "details" | "library")}
                                className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
                            >
                                <div className="flex-shrink-0 border-b border-gray-100 bg-white px-6 pb-3 pt-2">
                                    <TabsList className="h-auto w-full justify-start gap-1 bg-muted/80 p-1">
                                        <TabsTrigger value="details" className="text-xs sm:text-sm">
                                            Retention option details
                                        </TabsTrigger>
                                        <TabsTrigger value="library" className="text-xs sm:text-sm">
                                            Global tooth images
                                        </TabsTrigger>
                                    </TabsList>
                                </div>
                                <TabsContent
                                    value="details"
                                    className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden px-0 pt-0 data-[state=inactive]:hidden"
                                >
                                    <form
                                        id="retention-option-form"
                                        className="flex min-h-0 flex-1 flex-col overflow-hidden"
                                        onSubmit={async (e) => {
                                            e.preventDefault()
                                            await handleSave()
                                        }}
                                    >
                                        {detailsBody}
                                    </form>
                                </TabsContent>
                                <TabsContent
                                    value="library"
                                    className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3 data-[state=inactive]:hidden sm:px-6 sm:py-4"
                                >
                                    {option?.id != null && (
                                        <GlobalRetentionOptionToothImagesPanel retentionOptionId={option.id} />
                                    )}
                                </TabsContent>
                            </Tabs>
                        ) : (
                            <form
                                className="flex min-h-0 flex-1 flex-col overflow-hidden"
                                onSubmit={async (e) => {
                                    e.preventDefault()
                                    await handleSave()
                                }}
                            >
                                {detailsBody}
                                {modalFooter}
                            </form>
                        )}
                    </div>

                    {showGlobalLibraryTab ? modalFooter : null}
                </DialogContent>
            </Dialog>

            <DiscardChangesDialog
                isOpen={showDiscardDialog}
                type="retention-option"
                onDiscard={handleDiscard}
                onKeepEditing={() => setShowDiscardDialog(false)}
            />

            <LinkRetentionOptionModal
                isOpen={showLinkRetentionOptionModal}
                onClose={() => setShowLinkRetentionOptionModal(false)}
                onApply={(_selectedRetentionTypes, _selectedRetentionOptions) => {
                    setShowLinkRetentionOptionModal(false)
                }}
            />
        </>
    )
}

