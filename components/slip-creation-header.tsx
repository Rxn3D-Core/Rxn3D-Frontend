"use client"

import { useState, useEffect, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { CustomerLogo } from "@/components/customer-logo"
import { Pencil, Check, ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface Doctor {
  id: number
  first_name: string
  last_name: string
  email?: string
  image?: string
}

interface Lab {
  id: number
  name: string
  customer_id?: number
  logo?: string
  role?: string
}

interface PatientData {
  name?: string
  gender?: string
}

interface SlipCreationHeaderProps {
  // Variant determines the layout style
  variant?: "simple" | "with-sending-to" | "with-doctor-info" | "full"
  
  // Optional left section (Sending to)
  sendingToLab?: Lab | null
  
  // Optional center logo (always shown)
  showLogo?: boolean
  
  // Optional right section (Created By)
  createdBy?: string
  
  // Optional doctor info
  doctor?: Doctor | null
  
  // Optional patient data (for full variant)
  patientData?: PatientData | null
  
  // Editable patient inputs (for patient-input page)
  editablePatientData?: {
    name: string
    gender: string
    onNameChange: (value: string) => void
    onGenderChange: (value: string) => void
  }
  
  // Container class overrides
  containerClassName?: string
  headerClassName?: string
  
  // Hide second header section (for lab/office selection screens)
  hideSecondHeader?: boolean
}

const CustomerLogoFromStorage = ({ size = "default" }: { size?: "default" | "large" }) => {
  const [customerId, setCustomerId] = useState<number | null>(null)

  useEffect(() => {
    // Read customer_id from localStorage (user's own customer_id)
    const loadCustomerId = () => {
      if (typeof window !== 'undefined') {
        const customerIdStr = localStorage.getItem("customerId")
        if (customerIdStr) {
          const id = Number(customerIdStr)
          if (!isNaN(id)) {
            setCustomerId(id)
          }
        }
      }
    }

    loadCustomerId()

    // Listen for storage changes (cross-tab updates)
    if (typeof window !== 'undefined') {
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === "customerId") {
          loadCustomerId()
        }
      }
      window.addEventListener('storage', handleStorageChange)
      
      // Poll for same-window updates (check every 500ms)
      const intervalId = setInterval(loadCustomerId, 500)
      
      return () => {
        window.removeEventListener('storage', handleStorageChange)
        clearInterval(intervalId)
      }
    }
  }, [])

  if (size === "large") {
    return (
      <div className="w-[500px] h-[75px] flex items-center justify-center">
        {customerId ? (
          <CustomerLogo
            customerId={customerId}
            alt="Customer Logo"
            className="max-w-full max-h-[120px] object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {/* Empty space if no logo */}
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div className="flex items-center justify-center">
      {customerId ? (
        <CustomerLogo
          customerId={customerId}
          alt="Customer Logo"
          className="max-h-[120px] max-w-[450px] object-contain"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {/* Empty space if no logo */}
        </div>
      )}
    </div>
  )
}

const CreatedBySection = ({ createdBy, variant = "default" }: { createdBy: string; variant?: "default" | "compact" }) => {
  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase()
  }

  if (variant === "compact") {
    return (
      <div className="flex flex-col items-center gap-[15px] w-[170px]">
        <div className="w-[72.74px] h-[72.74px] rounded-full overflow-hidden">
          <Avatar className="w-full h-full">
            <AvatarImage
              src="/images/created-by.png"
              alt="Created By"
            />
            <AvatarFallback className="bg-gray-200 text-gray-600">
              {getInitials(createdBy)}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="relative w-[170px] h-[34px]">
          <Input
            value={createdBy}
            readOnly
            className="w-[170px] h-[34px] text-[14px] leading-[17px] text-[#1F2937] border-[#7F7F7F] rounded-[7px] px-[11.2px] py-[8.4px]"
          />
          <label className="absolute -top-[5.59px] left-[8.39px] bg-white px-0 text-[12px] leading-[13px] text-[#7F7F7F]">
            Created By
          </label>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end">
      <div className="w-[72px] h-[72px] rounded-full overflow-hidden mb-2">
        <Avatar className="w-full h-full">
          <AvatarImage
            src="/images/default-user-avatar.png"
            alt="Created By"
          />
          <AvatarFallback className="bg-gray-200 text-gray-600">
            {getInitials(createdBy)}
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="relative">
        <Input
          value={createdBy}
          readOnly
          className="w-[170px] h-[34px] text-sm text-gray-800 border-[#7f7f7f]"
        />
        <label className="absolute -top-2.5 left-2 bg-white px-1 text-xs text-[#7f7f7f]">
          Created By
        </label>
      </div>
    </div>
  )
}

const SendingToSection = ({ lab }: { lab: Lab }) => {
  const router = useRouter()
  
  const handleEditClick = () => {
    router.push("/choose-lab")
  }
  
  // Use customer_id if available, otherwise use id (for labs/offices, id is the customer_id)
  const customerId = lab?.customer_id || lab?.id
  
  // If lab has a logo property directly, use it as fallback
  const hasDirectLogo = lab?.logo && typeof lab.logo === 'string'
  
  return (
    <div className="flex items-center gap-[7px] w-[350px] h-[75px] overflow-visible">
      <p className="text-[15.9926px] font-bold leading-[22px] tracking-[-0.02em] text-[#080808]">
        {typeof window !== "undefined" && localStorage.getItem("role") === "lab_admin" ? "Creating For" : "Sending To"}
      </p>
      {customerId && (
        <div className="relative flex items-center min-h-[33.24px] overflow-visible">
          <div className="flex items-center justify-center overflow-visible">
            {hasDirectLogo ? (
              <img
                src={lab.logo}
                alt={lab.name}
                className="max-w-[150px] max-h-[120px] w-auto h-auto object-contain"
                style={{ display: 'block', maxWidth: '150px', maxHeight: '120px' }}
                onError={(e) => {
                  // Fallback to CustomerLogo if direct logo fails
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const fallback = target.nextElementSibling as HTMLElement
                  if (fallback) {
                    fallback.style.display = 'flex'
                  }
                }}
                onLoad={(e) => {
                  // Ensure image is visible when loaded
                  const target = e.target as HTMLImageElement
                  target.style.display = 'block'
                  target.style.visibility = 'visible'
                }}
              />
            ) : null}
            <div style={{ display: hasDirectLogo ? 'none' : 'flex' }} className="items-center">
              <CustomerLogo
                customerId={customerId}
                alt={lab.name}
                className="max-w-[150px] max-h-[120px] object-contain"
              />
            </div>
          </div>
          <button
            onClick={handleEditClick}
            className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors z-10"
            aria-label="Edit lab or office"
          >
            <Pencil className="w-[18px] h-[18px] text-[#B4B0B0]" />
          </button>
        </div>
      )}
    </div>
  )
}

const DoctorInfoSection = ({ doctor, variant = "default" }: { doctor: Doctor; variant?: "default" | "full" }) => {
  const router = useRouter()
  
  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName?.charAt(0) || ""
    const last = lastName?.charAt(0) || ""
    return `${first}${last}`.toUpperCase()
  }

  const handleEditClick = () => {
    router.push("/choose-doctor")
  }

  if (variant === "full") {
    return (
      <div className="flex flex-col items-center gap-[9px] w-[200px] h-[134.92px]">
        <div className="flex items-end gap-0 w-[117.92px] h-[103.92px]">
          <div className="relative">
            <Avatar className="w-[103.92px] h-[103.92px]">
              <AvatarImage
                src={doctor?.image || "/images/doctor-image.png"}
                alt={`${doctor?.first_name || ""} ${doctor?.last_name || ""}`}
              />
              <AvatarFallback className="bg-[#1162a8] text-white text-2xl font-bold">
                {getInitials(doctor?.first_name || "", doctor?.last_name || "")}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={handleEditClick}
              className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
              aria-label="Edit doctor"
            >
              <Pencil className="w-[18px] h-[18px] text-[#B4B0B0]" />
            </button>
          </div>
        </div>
        <p className="w-[200px] h-[22px] text-[17px] font-normal leading-[22px] tracking-[-0.02em] text-black text-center">
          {doctor?.first_name} {doctor?.last_name}, DDS
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Avatar className="w-20 h-20">
          <AvatarImage
            src={doctor?.image || "/images/doctor-image.png"}
            alt={`${doctor?.first_name || ""} ${doctor?.last_name || ""}`}
          />
          <AvatarFallback className="bg-[#1162a8] text-white text-xl font-semibold">
            {getInitials(doctor?.first_name || "", doctor?.last_name || "")}
          </AvatarFallback>
        </Avatar>
        <button
          onClick={handleEditClick}
          className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-1 border border-gray-300 hover:bg-gray-50 cursor-pointer transition-colors"
          aria-label="Edit doctor"
        >
          <Pencil className="h-[18px] w-[18px] text-[#B4B0B0]" />
        </button>
      </div>
      <p className="text-base font-normal text-gray-900">
        {doctor?.first_name} {doctor?.last_name}, DDS
      </p>
    </div>
  )
}

const PatientInfoSection = ({
  patientData,
  editablePatientData
}: {
  patientData?: PatientData | null
  editablePatientData?: {
    name: string
    gender: string
    onNameChange: (value: string) => void
    onGenderChange: (value: string) => void
  }
}) => {
  const [isNameFocused, setIsNameFocused] = useState(false)
  const [isGenderFocused, setIsGenderFocused] = useState(false)
  const autoOpenRef = useRef(false)
  const patientNameInputRef = useRef<HTMLInputElement>(null)
  const refocusTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Focus patient input on initial load (only when in editable mode and field is empty)
  useEffect(() => {
    if (editablePatientData && patientNameInputRef.current) {
      const name = editablePatientData.name ?? ""
      // Only focus if the field is empty
      if (!name.trim()) {
        // Small delay to ensure the component is fully rendered
        const focusTimer = setTimeout(() => {
          patientNameInputRef.current?.focus()
        }, 100)
        return () => clearTimeout(focusTimer)
      }
    }
  }, [editablePatientData])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (refocusTimerRef.current) {
        clearTimeout(refocusTimerRef.current)
      }
    }
  }, [])

  const getGenderDisplay = (gender?: string) => {
    if (gender === "male") return "Male"
    if (gender === "female") return "Female"
    return "Select Gender"
  }

  // Always use editable inputs
  // Use editablePatientData if provided, otherwise create from patientData with no-op handlers
  const name = editablePatientData?.name ?? patientData?.name ?? ""
  const gender = editablePatientData?.gender ?? patientData?.gender ?? ""
  const onNameChange = editablePatientData?.onNameChange ?? (() => {})
  const onGenderChange = editablePatientData?.onGenderChange ?? (() => {})

  // Show gender field only when both first name and last name have at least 2 letters each
  const showGenderField = (() => {
    const nameParts = name.trim().split(/\s+/).filter(part => part.length > 0)
    return nameParts.length >= 2 && nameParts[0].length >= 2 && nameParts[1].length >= 2
  })()

  // Check if should auto-open gender dropdown
  const shouldAutoOpenGender = (inputName: string, inputGender: string): boolean => {
    if (inputGender.trim() !== "") return false

    const nameParts = inputName.trim().split(/\s+/).filter(part => part.length > 0)
    if (nameParts.length >= 2) {
      const secondWord = nameParts[1]
      return secondWord.length === 2
    }
    return false
  }

  // Handle patient name change with auto-open logic
  const handleNameChange = (value: string) => {
    onNameChange(value)

    // Clear any existing refocus timer
    if (refocusTimerRef.current) {
      clearTimeout(refocusTimerRef.current)
    }

    const shouldOpen = shouldAutoOpenGender(value, gender)

    if (shouldOpen && !isGenderFocused) {
      // Mark that we're auto-opening and open the dropdown
      autoOpenRef.current = true
      setIsGenderFocused(true)

      // Keep refocusing the patient name input while dropdown is open
      refocusTimerRef.current = setTimeout(() => {
        patientNameInputRef.current?.focus()
      }, 50)
    }
    // Don't close the dropdown even if condition is not met anymore
    // It will only close when user selects a gender
  }

  // Handle gender selection
  const handleGenderSelect = (value: string) => {
    onGenderChange(value)
    // When gender is selected, clear auto-open mode
    autoOpenRef.current = false
    setIsGenderFocused(false)
    // Return focus to patient name input after selection
    setTimeout(() => {
      patientNameInputRef.current?.focus()
    }, 50)
  }

  // Removed click outside handler - dropdown only closes when gender is selected
  const hasNameValue = name.trim() !== ""
  const hasGenderValue = gender.trim() !== ""

  // Validation: Name should have at least 2 words, and second word should have at least 2 characters
  // (first word + first 2 letters of second word)
  const isValidName = () => {
    if (!hasNameValue) return false
    const nameParts = name.trim().split(/\s+/).filter(part => part.length > 0)
    return nameParts.length >= 2 && nameParts[1].length >= 2
  }

  const isNameValid = isValidName()
  const isGenderValid = hasGenderValue

  // Determine border color based on focus and validation state
  const getNameBorderColor = () => {
    if (isNameValid) {
      // Green: Field is complete and valid (has both first and last name)
      return "border-[#119933]"
    }
    if (hasNameValue) {
      // Orange: Field has a value but is incomplete (only first name or incomplete last name)
      return "border-[#FF9900]"
    }
    // No value - red (required field)
    return "border-red-500"
  }

  const getGenderBorderColor = () => {
    if (showGenderField && !isGenderValid) return "border-red-500" // invalid state - red
    if (isGenderValid) return "border-[#119933]" // valid state
    if (isGenderFocused) return "border-[#1162A8]" // focus state
    return "border-[#7F7F7F]" // default
  }

  // Determine label color
  const getNameLabelColor = () => {
    if (isNameValid) {
      // Green: Field is complete and valid (has both first and last name)
      return "text-[#119933]"
    }
    if (hasNameValue) {
      // Orange: Field has a value but is incomplete (only first name or incomplete last name)
      return "text-[#FF9900]"
    }
    // No value - red (required field)
    return "text-red-500"
  }

  const getGenderLabelColor = () => {
    if (showGenderField && !isGenderValid) return "text-red-500" // invalid state - red
    if (isGenderValid) return "text-[#119933]"
    if (isGenderFocused) return "text-[#1162A8]"
    return "text-[#7F7F7F]"
  }

  // Determine ring/glow effect
  const getNameRingEffect = () => {
    if (isNameValid) {
      // Green: Field is complete and valid (has both first and last name)
      return "ring-2 ring-[#119933] ring-opacity-20 shadow-[0_0_0_4px_rgba(17,153,51,0.15)]"
    }
    if (hasNameValue) {
      // Orange: Field has a value but is incomplete (only first name or incomplete last name)
      return "ring-2 ring-[#FF9900] ring-opacity-20 shadow-[0_0_0_4px_rgba(255,153,0,0.15)]"
    }
    // No value - red (required field)
    return "ring-2 ring-red-500 ring-opacity-20 shadow-[0_0_0_4px_rgba(239,68,68,0.15)]"
  }

  const getGenderRingEffect = () => {
    if (showGenderField && !isGenderValid) {
      return "ring-2 ring-red-500 ring-opacity-20 shadow-[0_0_0_4px_rgba(239,68,68,0.15)]"
    }
    if (isGenderFocused && isGenderValid) {
      return "ring-2 ring-[#119933] ring-opacity-20 shadow-[0_0_0_4px_rgba(17,153,51,0.15)]"
    }
    if (isGenderFocused) {
      return "ring-2 ring-[#1162A8] ring-opacity-20 shadow-[0_0_0_4px_rgba(17,98,168,0.15)]"
    }
    return ""
  }

  return (
    <div className="w-full relative" style={{ height: showGenderField ? "104.9px" : "36.95px" }}>
      {/* Patient Name */}
      <div className="absolute" style={{ left: "10px", top: "10px", width: "330px", height: "36.95px" }}>
        <div className="relative w-full h-full">
          <input
            ref={patientNameInputRef}
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            onFocus={() => setIsNameFocused(true)}
            onBlur={() => setIsNameFocused(false)}
            className={cn(
              "w-full h-full box-border flex flex-row items-center bg-white border border-solid rounded-[7.7px] text-[#1F2937] focus:outline-none",
              "transition-all ease-out",
              getNameBorderColor(),
              getNameRingEffect(),
              !isNameFocused && "hover:shadow-[0_0_8px_rgba(17,98,168,0.2)] transition-shadow duration-150"
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
            }}
          />
          <label
            className={cn(
              "absolute bg-white pointer-events-none transition-all duration-200 ease-out",
              getNameLabelColor()
            )}
            style={{
              left: "9.23px",
              top: "-6.15px",
              width: hasNameValue && isNameValid ? "83px" : "120px",
              height: "14px",
              fontFamily: "Arial",
              fontStyle: "normal",
              fontWeight: 400,
              fontSize: "14px",
              lineHeight: "14px",
            }}
          >
            {hasNameValue && isNameValid ? "Patient name" : "Type patient name"}
          </label>
          {/* Validation Icon - Only show when name is complete and valid */}
          {isNameValid && (
            <div className="absolute right-[12.32px] top-1/2 -translate-y-1/2">
              <Check className="h-5 w-5 text-[#119933]" aria-label="Valid" />
            </div>
          )}
        </div>
      </div>

      {/* Gender - Only show when patient name has a value */}
      {showGenderField && (
        <div className="absolute" style={{ left: "10px", top: "57.95px", width: "330px", height: "36.95px" }}>
          <div className="relative w-full h-full">
            {/* Custom Gender Dropdown */}
            <div
              className={cn(
                "w-full h-full box-border flex flex-row items-center justify-between bg-white border border-solid rounded-[7.7px] text-[#1F2937] cursor-pointer",
                "transition-all ease-out",
                getGenderBorderColor(),
                getGenderRingEffect(),
                !isGenderFocused && "hover:shadow-[0_0_8px_rgba(17,98,168,0.2)] transition-shadow duration-150"
              )}
              style={{
                padding: "25px 12.8px 9.24px 12.32px",
                borderWidth: "0.740384px",
                fontFamily: "Arial",
                fontStyle: "normal",
                fontWeight: 400,
                fontSize: "17px",
                lineHeight: "18px",
                transitionDuration: isGenderFocused ? "250ms" : "150ms",
                transitionTimingFunction: isGenderFocused ? "ease-in-out" : "ease-out",
              }}
              onClick={() => {
                // Allow opening the dropdown manually, but don't close it once open
                if (!isGenderFocused) {
                  setIsGenderFocused(true)
                  // Keep focus on patient name input
                  setTimeout(() => {
                    patientNameInputRef.current?.focus()
                  }, 50)
                }
              }}
            >
              <span>{getGenderDisplay(gender)}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-[#7F7F7F] transition-transform duration-200",
                  isGenderFocused && "rotate-180"
                )}
              />
            </div>

            {/* Dropdown Options */}
            {isGenderFocused && (
              <div
                className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-[7.7px] shadow-lg z-50 overflow-hidden"
                style={{
                  borderWidth: "0.740384px",
                }}
              >
                <div
                  className="px-3 py-2 hover:bg-[#DFEEFB] cursor-pointer text-[#1F2937] transition-colors"
                  style={{
                    fontFamily: "Arial",
                    fontSize: "17px",
                    lineHeight: "18px",
                  }}
                  onClick={() => handleGenderSelect("male")}
                >
                  Male
                </div>
                <div
                  className="px-3 py-2 hover:bg-[#DFEEFB] cursor-pointer text-[#1F2937] transition-colors"
                  style={{
                    fontFamily: "Arial",
                    fontSize: "17px",
                    lineHeight: "18px",
                  }}
                  onClick={() => handleGenderSelect("female")}
                >
                  Female
                </div>
              </div>
            )}

            <label
              className={cn(
                "absolute bg-white pointer-events-none z-10 transition-all duration-200 ease-out",
                getGenderLabelColor()
              )}
              style={{
                left: "9.23px",
                top: "-6.15px",
                width: "47px",
                height: "14px",
                fontFamily: "Arial",
                fontStyle: "normal",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "14px",
              }}
            >
              Gender
            </label>
            {/* Validation Icon */}
            {isGenderValid && (
              <div className="absolute right-[12.32px] top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                <Check className="h-5 w-5 text-[#119933]" aria-label="Valid" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function SlipCreationHeader({
  variant = "simple",
  sendingToLab: propSendingToLab,
  showLogo = true,
  createdBy,
  doctor,
  patientData,
  editablePatientData,
  containerClassName = "container mx-auto px-6 max-w-[1400px] pt-8",
  headerClassName = "",
  hideSecondHeader = false,
}: SlipCreationHeaderProps) {
  // Read selected lab from localStorage if not provided as prop
  const [sendingToLab, setSendingToLab] = useState<Lab | null>(propSendingToLab || null)

  useEffect(() => {
    // Use prop if provided, otherwise read from localStorage
    if (propSendingToLab) {
      setSendingToLab(propSendingToLab)
    } else {
      const loadLabFromStorage = () => {
        if (typeof window !== 'undefined') {
          const storedLab = localStorage.getItem("selectedLab")
          if (storedLab) {
            try {
              const lab = JSON.parse(storedLab)
              setSendingToLab(lab)
            } catch (error) {
              console.error("Error parsing selected lab:", error)
              setSendingToLab(null)
            }
          } else {
            setSendingToLab(null)
          }
        }
      }

      loadLabFromStorage()

      // Listen for storage changes
      if (typeof window !== 'undefined') {
        const handleStorageChange = (e: StorageEvent) => {
          if (e.key === "selectedLab") {
            loadLabFromStorage()
          }
        }
        window.addEventListener('storage', handleStorageChange)
        
        // Poll for same-window updates (check every 500ms)
        const intervalId = setInterval(loadLabFromStorage, 500)
        
        return () => {
          window.removeEventListener('storage', handleStorageChange)
          clearInterval(intervalId)
        }
      }
    }
  }, [propSendingToLab])

  // Simple variant: Just logo centered (for choose-doctor)
  if (variant === "simple") {
    return (
      <div className={containerClassName}>
        <div className={`flex justify-center ${headerClassName}`}>
          {showLogo && <CustomerLogoFromStorage />}
        </div>
      </div>
    )
  }

  // Full variant: Two headers matching the exact design pattern (for case-design-center)
  if (variant === "full") {
    return (
      <>
        {/* Top Header - Frame 2375 */}
        <div className="bg-white border border-[#D9D9D9]">
          <div className="flex items-center justify-between px-5 py-[10px]">
            {/* Left: Sending to */}
            <div className="w-[350px] h-[75px] flex items-center">
              {sendingToLab && <SendingToSection lab={sendingToLab} />}
            </div>

            {/* Center: Customer Logo */}
            {showLogo && (
              <div className="flex-1 flex justify-center">
                <CustomerLogoFromStorage size="large" />
              </div>
            )}

            {/* Right: Empty space */}
            <div className="w-[350px] h-[75px]"></div>
          </div>
        </div>

        {/* Second Header - Frame 2381 */}
        {!hideSecondHeader && (
          <div className="bg-white ">
            <div className="flex items-center justify-between px-5 py-[10px] h-[154.92px]">
              {/* Left: Doctor Info */}
              {doctor ? (
                <div className="flex items-center justify-center">
                  <DoctorInfoSection doctor={doctor} variant="full" />
                </div>
              ) : (
                <div className="w-[200px]"></div>
              )}

              {/* Center: Patient Info */}
              {(patientData || editablePatientData) ? (
                <div className="flex-1 flex items-center justify-center">
                  <PatientInfoSection 
                    patientData={patientData} 
                    editablePatientData={editablePatientData}
                  />
                </div>
              ) : (
                <div className="flex-1"></div>
              )}

              {/* Right: Created By */}
              {createdBy ? (
                <div className="flex items-center justify-center">
                  <CreatedBySection createdBy={createdBy} variant="compact" />
                </div>
              ) : (
                <div className="w-[170px]"></div>
              )}
            </div>
          </div>
        )}
      </>
    )
  }

  // With sending to variant: Sending to (left), Logo (center), Created By (right) - for case-design-center top header only
  if (variant === "with-sending-to") {
    return (
      <div className="bg-white border border-[#D9D9D9]">
        <div className="flex items-center justify-between px-5 py-[10px] min-h-[122px]">
          {/* Sending to (Left) */}
          <div className="w-[350px] flex items-center">
            {sendingToLab && <SendingToSection lab={sendingToLab} />}
          </div>

          {/* Center: Customer Logo */}
          {showLogo && (
            <div className="flex-1 flex justify-center">
              <CustomerLogoFromStorage size="large" />
            </div>
          )}

          {/* Right: Empty space or Created By */}
          <div className="w-[350px] flex items-center justify-end">
            {createdBy && <CreatedBySection createdBy={createdBy} variant="compact" />}
          </div>
        </div>
      </div>
    )
  }

  // With doctor info variant: Logo centered, then below: Doctor (left), Created By (right) - for choose-lab
  if (variant === "with-doctor-info") {
    return (
      <div className={containerClassName}>
        {/* Logo Section */}
        <div className={`flex justify-center mb-6 ${headerClassName}`}>
          {showLogo && <CustomerLogoFromStorage />}
        </div>

        {/* Doctor Info and Created By Section */}
        {(doctor || createdBy) && (
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
              {/* Doctor Info (Left) */}
              {doctor && <DoctorInfoSection doctor={doctor} />}

              {/* Created By (Right) */}
              {createdBy && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200">
                    <Avatar className="w-full h-full">
                      <AvatarImage
                        src="/images/default-user-avatar.png"
                        alt="Created By"
                      />
                      <AvatarFallback className="bg-[#7AB8E8] text-white text-lg font-semibold">
                        {createdBy.split(" ").map(n => n[0]).join("").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="relative">
                    <Input
                      value={createdBy}
                      readOnly
                      className="w-[160px] h-9 text-xs text-center text-gray-700 border-gray-300 rounded bg-gray-50"
                    />
                    <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-500">
                      Created By
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}

