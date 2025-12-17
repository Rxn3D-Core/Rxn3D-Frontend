"use client"

import { Upload, X, AlertCircle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useState, useEffect, ChangeEvent } from "react"

interface Country {
  id: number
  name: string
}

interface State {
  id: number
  name: string
}

interface RegistrationData {
  name: string
  website: string
  address: string
  city: string
  country_id: number
  state_id: number
  postal_code: string
  // Add other fields as needed
}

interface ValidationErrors {
  name?: string
  website?: string
  address?: string
  city?: string
  country_id?: string
  state_id?: string
  postal_code?: string
  // Add other fields as needed
}

interface LabProfileFormProps {
  registrationData: RegistrationData
  validationErrors: ValidationErrors
  handleLabFormChange: (e: React.ChangeEvent<HTMLInputElement> | { target: { name: string; value: any } }) => void
  handleCountryChange: (countryId: number) => void
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  countries: Country[]
  states: State[]
}

export function LabProfileForm({
  registrationData,
  validationErrors,
  handleLabFormChange,
  handleCountryChange,
  handleFileUpload,
  countries,
  states,
}: LabProfileFormProps) {
  // State for logo preview
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  // State for file size error
  const [fileSizeError, setFileSizeError] = useState("")
  // State for state search
  const [stateSearchTerm, setStateSearchTerm] = useState("")

  // Filter states based on search term
  const filteredStates = states.filter((state) => state.name.toLowerCase().includes(stateSearchTerm.toLowerCase()))

  // Handle file upload with preview and validation
  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (1024 KB = 1 MB = 1,048,576 bytes)
      const maxSizeInBytes = 1024 * 1024
      if (file.size > maxSizeInBytes) {
        setFileSizeError("Logo file size must be less than 1 MB (1024 KB)")
        return
      }

      // Clear any previous error
      setFileSizeError("")
      
      // Create a preview URL for the image
      const previewUrl = URL.createObjectURL(file)
      setLogoPreview(previewUrl)

      // Call the original handleFileUpload function
      handleFileUpload(e)
    }
  }

  // Remove the logo preview
  const handleRemoveLogo = () => {
    setLogoPreview(null)
    setFileSizeError("")
    // Clear the logo in the registration data
    handleLabFormChange({ target: { name: "logo", value: null } })
  }

  // Clean up object URL when component unmounts
  useEffect(() => {
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview)
      }
    }
  }, [logoPreview])

  return (
    <div>
      <h2 className="text-lg font-medium mb-4">Lab Profile</h2>

      {/* Form */}
      <div className="space-y-4">
        <Input
          type="text"
          name="name"
          label="Lab Name"
          value={registrationData.name}
          onChange={handleLabFormChange}
          placeholder="Lab Name"
          validationState={validationErrors.name ? "error" : registrationData.name ? "valid" : "default"}
          errorMessage={validationErrors.name}
        />

        <Input
          type="text"
          name="website"
          label="Website Address"
          value={registrationData.website}
          onChange={handleLabFormChange}
          placeholder="Website address"
          validationState={validationErrors.website ? "error" : registrationData.website ? "valid" : "default"}
          errorMessage={validationErrors.website}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            type="text"
            name="address"
            label="Street Address"
            value={registrationData.address}
            onChange={handleLabFormChange}
            placeholder="Street Address"
            validationState={validationErrors.address ? "error" : registrationData.address ? "valid" : "default"}
            errorMessage={validationErrors.address}
          />

          <Input
            type="text"
            name="city"
            label="City"
            value={registrationData.city}
            onChange={handleLabFormChange}
            placeholder="City"
            validationState={validationErrors.city ? "error" : registrationData.city ? "valid" : "default"}
            errorMessage={validationErrors.city}
          />
          <div>
            <Select
              value={
                registrationData.country_id && registrationData.country_id !== 0
                  ? registrationData.country_id.toString()
                  : ""
              }
              onValueChange={(value) => {
                const countryId = Number.parseInt(value, 10)
                if (!isNaN(countryId)) {
                  handleCountryChange(countryId)
                }
              }}
            >
              <SelectTrigger className={`w-full h-11 ${validationErrors.country_id ? "border-red-500" : ""}`}>
                <SelectValue placeholder="Select your country*" />
              </SelectTrigger>
              <SelectContent>
                {countries?.map((country) => (
                  <SelectItem key={country.id} value={country.id.toString()}>
                    {country.name || `Country #${country.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors.country_id && <p className="text-red-500 text-xs mt-1">{validationErrors.country_id}</p>}
          </div>
          <div>
            {/* Searchable state dropdown */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search state*"
                value={stateSearchTerm}
                onChange={(e) => setStateSearchTerm(e.target.value)}
                className={`w-full px-4 py-2 border ${validationErrors.state_id ? "border-red-500" : "border-[#d9d9d9]"} rounded`}
              />
              {filteredStates.length > 0 && stateSearchTerm && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredStates.map((state) => (
                    <div
                      key={state.id}
                      className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                        registrationData.state_id === state.id ? "bg-gray-100" : ""
                      }`}
                      onClick={() => {
                        handleLabFormChange({ target: { name: "state_id", value: state.id } })
                        setStateSearchTerm(state.name)
                      }}
                    >
                      {state.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {validationErrors.state_id && <p className="text-red-500 text-xs mt-1">{validationErrors.state_id}</p>}
          </div>
        </div>

        <Input
          type="text"
          name="postal_code"
          label="Postal Code"
          value={registrationData.postal_code}
          onChange={handleLabFormChange}
          placeholder="Postal Code"
          validationState={validationErrors.postal_code ? "error" : registrationData.postal_code ? "valid" : "default"}
          errorMessage={validationErrors.postal_code}
        />

        {/* Logo Upload and Preview Section */}
        <div className="mt-8">
          <div className="flex flex-col items-center">
            {logoPreview ? (
              <div className="relative mb-4">
                <img
                  src={logoPreview || "/placeholder.svg"}
                  alt="Logo Preview"
                  className="w-40 h-40 object-contain border rounded p-2"
                />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                  aria-label="Remove logo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="w-40 h-40 border border-dashed border-gray-300 rounded flex items-center justify-center mb-4">
                <span className="text-gray-400 text-sm">Logo Preview</span>
              </div>
            )}

            <label className={`bg-[#1162a8] text-white px-4 py-2 rounded flex items-center cursor-pointer ${fileSizeError ? 'opacity-90' : ''}`}>
              <Upload className="h-4 w-4 mr-2" />
              {logoPreview ? "Change logo" : "Upload logo"}
              <input
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleLogoUpload}
              />
            </label>
            
            {fileSizeError ? (
              <div className="flex items-center text-red-500 text-sm mt-2">
                <AlertCircle className="h-4 w-4 mr-1" />
                {fileSizeError}
              </div>
            ) : (
              <div className="text-sm text-[#a19d9d] text-center mt-2">
                Note: Logo files must be in PNG, SVG, or JPEG format, maximum of 1MB (1024KB).
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
