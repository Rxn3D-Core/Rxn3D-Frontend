"use client"

import type React from "react"

import { useState, useRef, useEffect, useMemo } from "react"
import { Upload, Check } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import SignatureCanvas from "react-signature-canvas"

type User = {
  [key: string]: any
  role?: string
  signature?: File | null
}

type UserValidationErrors = {
  [key: string]: string
}

type RegistrationType = "Lab" | "Office"

interface UserFormProps {
  user?: User
  userValidationErrors?: UserValidationErrors
  handleUserFormChange: (e: React.ChangeEvent<HTMLInputElement> | { target: { name: string; value: any } }, index: number) => void
  index?: number
  updateUser: (index: number, data: Partial<User>) => void
  registrationType: RegistrationType
  isDoctor?: boolean
  isAdminForm?: boolean
}

export function UserForm({
  user = {},
  userValidationErrors = {},
  handleUserFormChange,
  index = 0,
  updateUser,
  registrationType,
  isDoctor = false,
  isAdminForm = false,
}: UserFormProps) {
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [useSameDetailsChecked, setUseSameDetailsChecked] = useState(false)
  const signatureRef = useRef<SignatureCanvas>(null)
  const [signatureMessage, setSignatureMessage] = useState("")
  const [hasSignature, setHasSignature] = useState(!!user?.signature)
  const VALID_SIGNATURE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"]
  const MAX_SIGNATURE_SIZE = 1024 * 1024 // 1MB
  const [isDoctorChecked, setIsDoctorChecked] = useState(false)


  const positionOptions = useMemo(() => {
    const allOptions =
      registrationType === "Lab"
        ? [
          { value: "lab_admin", label: "Admin" },
          { value: "lab_user", label: "User" },
        ]
        : [
          { value: "office_admin", label: "Admin" },
          { value: "doctor", label: "Doctor" },
          { value: "office_user", label: "User" },
        ]

    if (isAdminForm && index !== 0) {
      return allOptions.filter((option) => !option.value.includes("admin"))
    }

    return allOptions
  }, [registrationType, isAdminForm, index])

  useEffect(() => {
    const defaultRole =
      registrationType === "Lab" ? "lab_user" : isDoctor ? "doctor" : "office_user"

    if (!user?.role && (!isAdminForm && index !== 0)) {
      handleUserFormChange(
        {
          target: {
            name: "role",
            value: defaultRole,
          },
        },
        index,
      )
    }
  }, [user?.role, registrationType, isAdminForm, index, isDoctor])

  const isDoctorRole = isDoctor || user?.role === "doctor" || user?.role === "office_admin" && useSameDetailsChecked || user?.role === "office_admin"
  const isAdmin = user?.role?.includes("admin")
  const handleUseSameDetails = (checked: boolean) => {
    setUseSameDetailsChecked(checked)
    setIsDoctorChecked(checked)

    if (checked && isAdminForm) {
      handleUserFormChange(
        {
          target: {
            name: "is_doctor",
            value: checked,
          },
        },
        index,
      )
    }
  }

  const dataURLtoFile = (dataURL: string, filename: string): File => {
    const arr = dataURL.split(",")
    const mime = arr[0].match(/:(.*?);/)![1]
    const bstr = atob(arr[1])
    const u8arr = new Uint8Array(bstr.length)

    for (let i = 0; i < bstr.length; i++) {
      u8arr[i] = bstr.charCodeAt(i)
    }

    return new File([u8arr], filename, { type: mime })
  }

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!VALID_SIGNATURE_TYPES.includes(file.type)) {
      showSignatureMessage("Please upload a valid image file (PNG, JPG, JPEG, SVG)")
      return
    }

    // Validate file size
    if (file.size > MAX_SIGNATURE_SIZE) {
      showSignatureMessage("File size should not exceed 1MB")
      return
    }

    setSignatureFile(file)
    setHasSignature(true)
    showSignatureMessage("Signature uploaded successfully")

    if (index >= 0) {
      updateUser(index, { signature: file })
    } else {
      handleUserFormChange(
        {
          target: { name: "signature", value: file },
        },
        index,
      )
    }
  }

  const showSignatureMessage = (message: string, isError = false) => {
    setSignatureMessage(message)
    setTimeout(() => setSignatureMessage(""), 2000)
  }

  const handleClearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear()
      setHasSignature(false)
      showSignatureMessage("Signature cleared")

      handleUserFormChange(
        {
          target: { name: "signature", value: null },
        },
        index,
      )
    }
  }

  const handleSaveSignature = () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      showSignatureMessage("Please draw your signature before saving", true)
      return
    }

    try {
      const quality = signatureRef.current.toDataURL().length > 1024 ? 0.5 : 1
      const signatureData = signatureRef.current.toDataURL("image/png", quality)
      const signatureFile = dataURLtoFile(signatureData, "signature.png")

      handleUserFormChange(
        {
          target: { name: "signature", value: signatureFile },
        },
        index,
      )

      setHasSignature(true)
      showSignatureMessage("Signature saved successfully")
    } catch (error) {
      console.error("Error saving signature:", error)
      showSignatureMessage("Error saving signature", true)
    }
  }

  const renderInputField = (name: string, placeholder: string, type = "text") => {
    const isAdmin = user?.role?.includes("admin")
    const shouldDisable = name === "email" && isAdmin
    const fieldValue = user?.[name] || ""

    return (
      <Input
        type={type}
        name={name}
        label={placeholder}
        value={fieldValue}
        onChange={(e) => handleUserFormChange(e, index)}
        placeholder={placeholder}
        validationState={userValidationErrors[name] ? "error" : fieldValue ? "valid" : "default"}
        errorMessage={userValidationErrors[name]}
        disabled={shouldDisable}
      />
    )
  }


  const renderSignatureSection = () => (
    <div className="space-y-2">
      <div className={`border ${userValidationErrors.signature ? "border-red-500" : "border-[#d9d9d9]"} rounded`}>
        <div className="p-2 border-b border-[#d9d9d9] bg-gray-50 flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-sm font-medium">Signature{isDoctorRole ? "" : "*"}</span>
            {hasSignature && (
              <span className="ml-2 text-xs text-[#6BB56B] flex items-center">
                <Check className="h-3 w-3 mr-1" />
                Saved
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleClearSignature}
            className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
          >
            Clear
          </button>
        </div>
        <div className="p-2 bg-white relative">
          <SignatureCanvas
            ref={signatureRef}
            penColor="black"
            canvasProps={{
              className: "w-full h-40 border border-dashed border-gray-300",
              style: { width: "100%", height: "160px" },
            }}
            onEnd={handleSaveSignature}
          />
          {!hasSignature && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400">
              Sign here
            </div>
          )}
          {signatureMessage && (
            <div
              className={`absolute bottom-2 left-2 right-2 p-2 rounded text-sm text-center ${signatureMessage.includes("Error") || signatureMessage.includes("Please")
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
                }`}
            >
              {signatureMessage}
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-between items-center">
        <div>
          {hasSignature && (
            <span className="text-xs text-[#6BB56B] flex items-center">
              <Check className="h-3 w-3 mr-1" />
              Signature loaded
            </span>
          )}
          {userValidationErrors.signature && !hasSignature && (
            <p className="text-red-500 text-xs mt-1">{userValidationErrors.signature}</p>
          )}
        </div>
        <label className="text-[#1162a8] px-2 py-1 rounded flex items-center cursor-pointer">
          <Upload className="h-4 w-4 mr-2" />
          Upload Signature
          <input
            type="file"
            className="hidden"
            accept={VALID_SIGNATURE_TYPES.join(",")}
            onChange={handleSignatureUpload}
          />
        </label>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* First & Last Name */}
      <div className="grid grid-cols-2 gap-4">
        {renderInputField("first_name", "First Name")}
        {renderInputField("last_name", "Last Name")}
      </div>

      {/* Role & Email */}
      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <Select
            disabled={isAdmin && isAdminForm}
            value={
              user?.role ||
              (index === 0
                ? registrationType === "Lab"
                  ? "lab_admin"
                  : "office_admin"
                : "")
            }
            onValueChange={(value) => {
              if (index >= 0) {
                updateUser(index, { role: value });
              } else {
                handleUserFormChange(
                  {
                    target: { name: "role", value },
                  },
                  index
                );
              }
            }}
          >
            <SelectTrigger
              className={`w-full px-4 py-2 pt-5 h-12 border rounded peer ${userValidationErrors.role
                  ? "border-red-500"
                  : "border-[#d9d9d9]"
                }`}
            >
              <SelectValue placeholder={user?.role ? "" : "Select Position*"} />
            </SelectTrigger>
            <SelectContent>
              {positionOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {user?.role && (
            <label className="absolute left-4 top-2 text-[#6BB56B] text-xs flex items-center gap-1 scale-75 origin-[0] transition-all">
              Position
              <Check className="w-4 h-4 text-[#6BB56B]" />
            </label>
          )}
          {userValidationErrors.role && (
            <p className="text-red-500 text-xs mt-1">
              {userValidationErrors.role}
            </p>
          )}
        </div>

        {renderInputField("email", "Email Address", "email")}
      </div>

      {/* Phone & Work Number */}
      <div className="grid grid-cols-2 gap-4">
        <div className="relative">{renderInputField("phone", "Phone Number")}</div>
        {renderInputField("work_number", "Work Number")}

        {registrationType === "Office" && isAdminForm && (
          <div className="flex items-center space-x-2 mb-4 col-span-2">
            <Checkbox
              id="use-same-details"
              checked={useSameDetailsChecked}
              onCheckedChange={(checked) => handleUseSameDetails(!!checked)}
            />
            <input
              type="hidden"
              name="is_doctor"
              value={useSameDetailsChecked ? "true" : "false"}
            />
            <label htmlFor="use-same-details" className="text-sm font-medium">
              Same as Doctor profile
            </label>
          </div>
        )}
      </div>

      {/* License & Signature - Doctor/Admin or checkbox */}
      {(
        user?.role === "doctor" ||
        user?.role === "office_admin" && useSameDetailsChecked || !isAdminForm && user?.role === "doctor") && (
          <>
            {renderInputField("license_number", "License Number")}
            {renderSignatureSection()}
          </>
        )}
    </div>
  );


}
