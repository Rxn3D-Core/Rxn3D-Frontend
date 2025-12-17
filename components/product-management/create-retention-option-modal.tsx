"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { X, Info, Link as LinkIcon, Check } from "lucide-react"
import { DiscardChangesDialog } from "./discard-changes-dialog"
import { useAuth } from "@/contexts/auth-context"
import { generateCodeFromName } from "@/lib/utils"
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

interface CreateRetentionOptionModalProps {
    isOpen: boolean
    onClose: () => void
    option?: any | null
    isCopying?: boolean
    onSuccess?: () => void
}

// Shape definitions with SVG paths - returns icon with dynamic color
const SHAPES = [
    {
        id: 'incomplete-circle', name: 'Incomplete Circle', apiName: 'Keyhole', getIcon: (color: string) => (
            <svg width="38" height="38" viewBox="0 0 55 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21.5155 49.1895C16.245 47.7353 11.6842 44.4117 8.68566 39.8398C5.68708 35.2679 4.45583 29.7606 5.22202 24.347C5.9882 18.9334 8.69938 13.9841 12.8489 10.4238C16.9984 6.86361 22.3023 4.93614 27.7695 5.00161C33.2366 5.06709 38.4928 7.12104 42.5559 10.7796C46.6189 14.4382 49.2108 19.4511 49.8471 24.8815C50.4834 30.3118 49.1206 35.7881 46.0134 40.2869C42.9062 44.7856 38.2672 47.9991 32.9633 49.3266L30.2316 38.4133C32.8836 37.7495 35.2031 36.1428 36.7567 33.8934C38.3103 31.644 38.9917 28.9059 38.6736 26.1907C38.3554 23.4755 37.0595 20.9691 35.0279 19.1398C32.9964 17.3105 30.3683 16.2835 27.6347 16.2508C24.9012 16.2181 22.2492 17.1818 20.1744 18.9619C18.0997 20.742 16.7441 23.2167 16.361 25.9235C15.9779 28.6303 16.5935 31.3839 18.0928 33.6699C19.5921 35.9558 21.8725 37.6177 24.5078 38.3448L21.5155 49.1895Z" fill={color} />
            </svg>
        )
    },
    {
        id: 'crescent', name: 'Crescent', apiName: 'Moon', getIcon: (color: string) => (
            <svg width="31" height="42" viewBox="0 0 44 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M30 5C33.115 5 36.0963 5.57142 38.8467 6.6123C29.4054 10.1848 22.6924 19.3084 22.6924 30.001C22.6924 40.6927 29.4047 49.8146 38.8447 53.3877C36.0949 54.4282 33.1143 55 30 55C16.193 54.9999 5.00007 43.807 5 30C5 16.193 16.193 5.00007 30 5Z" fill={color} />
            </svg>
        )
    },
    {
        id: 'diamond', name: 'Diamond', apiName: 'Diamond', getIcon: (color: string) => (
            <svg width="42" height="42" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M30 5L55 30L30 55L5 30L30 5Z" fill={color} />
            </svg>
        )
    },
    {
        id: 'square', name: 'Square', apiName: 'Square', getIcon: (color: string) => (
            <svg width="42" height="42" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="12.5" y="12.5" width="35" height="35" fill={color} />
            </svg>
        )
    },
    {
        id: 'octagon', name: 'Octagon', apiName: 'Octagon', getIcon: (color: string) => (
            <svg width="42" height="42" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M30 5L47.6777 12.3223L55 30L47.6777 47.6777L30 55L12.3223 47.6777L5 30L12.3223 12.3223L30 5Z" fill={color} />
            </svg>
        )
    },
    {
        id: 'triangle', name: 'Triangle', apiName: 'Triangle', getIcon: (color: string) => (
            <svg width="38" height="42" viewBox="0 0 55 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M27.5 10.5L46.9856 44.25H8.01443L27.5 10.5Z" fill={color} />
            </svg>
        )
    },
    {
        id: 'star', name: 'Star', apiName: 'Star', getIcon: (color: string) => (
            <svg width="42" height="42" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M30 5.5L35.6129 22.7746H53.7764L39.0818 33.4508L44.6946 50.7254L30 40.0491L15.3054 50.7254L20.9182 33.4508L6.22359 22.7746H24.3871L30 5.5Z" fill={color} />
            </svg>
        )
    },
    {
        id: 'pentagon', name: 'Pentagon', apiName: 'Pentagon', getIcon: (color: string) => (
            <svg width="42" height="42" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M30 6L53.7764 23.2746L44.6946 51.2254H15.3054L6.22359 23.2746L30 6Z" fill={color} />
            </svg>
        )
    },
    {
        id: 'starburst', name: 'Starburst', apiName: 'Burst', getIcon: (color: string) => (
            <svg width="42" height="42" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M30 5L34.1432 21.3965L49.5458 14.4128L39.3097 27.8751L54.3732 35.563L37.4658 35.9538L40.8471 52.5242L30 39.5491L19.1529 52.5242L22.5342 35.9538L5.6268 35.563L20.6903 27.8751L10.4542 14.4128L25.8568 21.3965L30 5Z" fill={color} />
            </svg>
        )
    },
]

// Helper function to map shape ID to API shape name
const getShapeApiName = (shapeId: string): string | null => {
    const shape = SHAPES.find(s => s.id === shapeId)
    return shape?.apiName || null
}

// Helper function to map API shape name to shape ID
const getShapeIdFromApiName = (apiName: string | null): string => {
    if (!apiName) return ""
    const shape = SHAPES.find(s => s.apiName === apiName)
    return shape?.id || ""
}

export function CreateRetentionOptionModal({ isOpen, onClose, option, isCopying = false, onSuccess }: CreateRetentionOptionModalProps) {
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
    const [errors, setErrors] = useState<{ [key: string]: string }>({})
    const [showLinkRetentionOptionModal, setShowLinkRetentionOptionModal] = useState(false)
    const [isNameFocused, setIsNameFocused] = useState(false)
    const [isCodeFocused, setIsCodeFocused] = useState(false)
    const [isSequenceFocused, setIsSequenceFocused] = useState(false)
    const nameInputRef = useRef<HTMLInputElement>(null)
    const codeInputRef = useRef<HTMLInputElement>(null)
    const sequenceInputRef = useRef<HTMLInputElement>(null)

    // Helper to check lab admin role
    const isLabAdmin = (() => {
        if (!user) return false
        if (user.roles && user.roles.length > 0) {
            return user.roles[0] === "lab_admin"
        }
        return user.role === "lab_admin"
    })()

    const isSuperAdmin = (() => {
        if (!user) return false
        if (user.roles && Array.isArray(user.roles)) {
            return user.roles.includes("superadmin")
        }
        return false
    })()

    const getCustomerId = () => {
        if (typeof window === "undefined") return null
        const storedCustomerId = localStorage.getItem("customerId")
        if (storedCustomerId) {
            return parseInt(storedCustomerId, 10)
        }
        if (user?.customers && user.customers.length > 0) {
            return user.customers[0].id
        }
        if (user?.customer_id) {
            return user.customer_id
        }
        if (user?.customer?.id) {
            return user.customer.id
        }
        return null
    }

    const customerId = getCustomerId()

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
            } else if (option && option.id && !isCopying) {
                // Editing: fetch full details from API
                setIsLoadingDetails(true)
                getRetentionOption(option.id)
                    .then((response) => {
                        const data = response.data
                        setOptionName(data.name || "")
                        setOptionCode("") // Code is not in API response, keep empty or generate
                        setSequence(data.sequence || 1)
                        setStatus(data.status || "Active")
                        setDetailsEnabled(data.status === "Active")
                        setSelectedShape(getShapeIdFromApiName(data.selector_shape))
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
        setShowDiscardDialog(false)
        setHasChanges(false)
        setErrors({})
        onClose()
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
            
            if (option && option.id && !isCopying) {
                // Update existing option
                const updatePayload: RetentionOptionUpdatePayload = {
                    name: optionName.trim(),
                    status: status,
                    sequence: sequence,
                    selector_shape: shapeApiName || undefined,
                }

                // Add customer_id for lab admin if needed
                if (isLabAdmin && customerId) {
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
                    status: status,
                    sequence: sequence,
                    selector_shape: shapeApiName || undefined,
                    is_custom: isLabAdmin ? "Yes" : "No",
                }

                // Add customer_id for lab admin
                if (isLabAdmin && customerId) {
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

    return (
        <>
            <Dialog open={isOpen} onOpenChange={() => { }}>
                <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden bg-white rounded-md">
                    <div className="flex items-center justify-between px-6 py-4 border-b">
                        <DialogTitle className="text-xl font-bold">
                            {isCopying ? "Copy Retention Option" : option && option.id ? "Edit Retention Option" : "Add Retention Option"}
                        </DialogTitle>
                        <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                        {isLoadingDetails && (
                            <div className="flex items-center justify-center py-8">
                                <div className="text-sm text-gray-500">Loading retention option details...</div>
                            </div>
                        )}
                        {!isLoadingDetails && (
                            <>
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
                                                <p>Configure the basic information for this retention option.</p>
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
                                        value={optionName}
                                        onChange={(e) => {
                                            const newName = e.target.value
                                            setOptionName(newName)
                                            const generatedCode = generateCodeFromName(newName)
                                            if (generatedCode) {
                                                setOptionCode(generatedCode)
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
                                            errors.optionName && "border-red-500"
                                        )}
                                        style={{
                                            padding: "25px 30.8px 9.24px 12.32px",
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
                                                onChange={(e) => {
                                                    setOptionCode(e.target.value)
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
                                                    errors.optionCode && "border-red-500"
                                                )}
                                                style={{
                                                    padding: "25px 30.8px 9.24px 12.32px",
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
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value) || 1
                                            setSequence(Math.max(1, value))
                                            setHasChanges(true)
                                        }}
                                        onFocus={() => setIsSequenceFocused(true)}
                                        onBlur={() => setIsSequenceFocused(false)}
                                        disabled={!detailsEnabled}
                                        className={cn(
                                            "w-full box-border flex flex-row items-center bg-white border border-solid rounded-[7.7px] text-[#1F2937] focus:outline-none",
                                            "transition-all ease-out",
                                            getSequenceBorderColor(),
                                            getSequenceRingEffect(),
                                            !isSequenceFocused && !detailsEnabled && "opacity-50 cursor-not-allowed",
                                            !isSequenceFocused && detailsEnabled && "hover:shadow-[0_0_8px_rgba(17,98,168,0.2)] transition-shadow duration-150",
                                            errors.sequence && "border-red-500"
                                        )}
                                        style={{
                                            padding: "25px 30.8px 9.24px 12.32px",
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
                                        Sequence
                                    </label>
                                    {/* Validation Icon */}
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

                            <div className="flex flex-nowrap gap-1.5 justify-center">
                                {SHAPES.map((shape) => {
                                    const isSelected = selectedShape === shape.id
                                    const fillColor = isSelected ? "#1162A8" : "#D9D9D9"
                                    return (
                                        <button
                                            key={shape.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedShape(shape.id)
                                                setHasChanges(true)
                                            }}
                                            className="p-1.5 rounded-lg transition-all hover:bg-gray-50"
                                            disabled={!detailsEnabled}
                                        >
                                            <div className="flex items-center justify-center">
                                                {shape.getIcon(fillColor)}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                            </>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 px-6 py-4 border-t">
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            className="border-red-500 text-red-500 hover:bg-red-50"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaveDisabled || isLoadingDetails}
                            className="bg-[#1162a8] hover:bg-[#0f5490] text-white"
                        >
                            {isSubmitting ? "Saving..." : "Save Retention"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <DiscardChangesDialog
                isOpen={showDiscardDialog}
                type="retention-option"
                onDiscard={handleDiscard}
                onKeepEditing={() => setShowDiscardDialog(false)}
            />
        </>
    )
}

