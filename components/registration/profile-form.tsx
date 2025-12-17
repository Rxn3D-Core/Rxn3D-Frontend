"use client"

import { Upload, X, AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Country = { id: number | string; name: string }
type State = { id: number | string; name: string }
type RegistrationData = {
  name: string
  website: string
  address: string
  city: string
  country_id: number | string
  state_id: number | string
  postal_code: string
}
type ValidationErrors = {
  name?: string
  website?: string
  address?: string
  city?: string
  country_id?: string
  state_id?: string
  postal_code?: string
}
type ProfileFormProps = {
  registrationData: RegistrationData
  validationErrors: ValidationErrors
  handleProfileFormChange: (e: React.ChangeEvent<HTMLInputElement> | { target: { name: string; value: any } }) => void
  handleCountryChange: (countryId: number | string) => void
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  countries: Country[]
  states: State[]
  registrationType: string
}

export function ProfileForm({
  registrationData,
  validationErrors,
  handleProfileFormChange,
  handleCountryChange,
  handleFileUpload,
  countries,
  states,
  registrationType,
}: ProfileFormProps) {
  const profileTitle = registrationType === "Lab" ? "Lab Profile" : "Practice Profile"
  const namePlaceholder = registrationType === "Lab" ? "Lab Name*" : "Practice Name*"
  const [countryPopoverOpen, setCountryPopoverOpen] = useState(false)
  const selectedCountry = countries.find(c => c.id === registrationData.country_id)
  const selectedState = states.find(s => s.id === registrationData.state_id)
  const [statePopoverOpen, setStatePopoverOpen] = useState(false)

  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [fileSizeError, setFileSizeError] = useState("")

  interface LogoUploadEvent extends React.ChangeEvent<HTMLInputElement> {}

  const handleLogoUpload = (e: LogoUploadEvent): void => {
    const file: File | undefined = e.target.files?.[0]
    if (file) {
      const maxSizeInBytes: number = 1024 * 1024
      if (file.size > maxSizeInBytes) {
        setFileSizeError("Logo file size must be less than 1 MB (1024 KB)")
        return
      }

      setFileSizeError("")
      const previewUrl: string = URL.createObjectURL(file)
      setLogoPreview(previewUrl)
      handleFileUpload(e)
    }
  }

  const handleRemoveLogo = () => {
    setLogoPreview(null)
    setFileSizeError("")
    handleProfileFormChange({ target: { name: "logo", value: null } })
  }

  useEffect(() => {
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview)
      }
    }
  }, [logoPreview])

  return (
    <div>
      <h2 className="text-lg font-medium mb-4">{profileTitle}</h2>

      <div className="space-y-4">
        <Input
          type="text"
          name="name"
          label={registrationType === "Lab" ? "Lab Name" : "Practice Name"}
          value={registrationData.name}
          onChange={handleProfileFormChange}
          placeholder={namePlaceholder}
          validationState={validationErrors.name ? "error" : registrationData.name ? "valid" : "default"}
          errorMessage={validationErrors.name}
        />

        <Input
          type="text"
          name="website"
          label="Website Address"
          value={registrationData.website}
          onChange={handleProfileFormChange}
          placeholder="Website address"
          validationState={validationErrors.website ? "error" : "default"}
          errorMessage={validationErrors.website}
          showValidIcon={false}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            type="text"
            name="address"
            label="Street Address"
            value={registrationData.address}
            onChange={handleProfileFormChange}
            placeholder="Street Address*"
            validationState={validationErrors.address ? "error" : registrationData.address ? "valid" : "default"}
            errorMessage={validationErrors.address}
          />

          <Input
            type="text"
            name="city"
            label="City"
            value={registrationData.city}
            onChange={handleProfileFormChange}
            placeholder="City*"
            validationState={validationErrors.city ? "error" : registrationData.city ? "valid" : "default"}
            errorMessage={validationErrors.city}
          />

          <div>
            <Popover open={countryPopoverOpen} onOpenChange={setCountryPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={`w-full justify-between h-11 ${validationErrors.country_id ? "border-red-500" : ""}`}
                >
                  {selectedCountry?.name || "Select your country*"}
                </Button>
              </PopoverTrigger>
              <PopoverContent style={{ width: '400px' }} className="p-0">
                <Command>
                  <CommandInput placeholder="Search country..." />
                  <CommandList>
                    <CommandEmpty>No country found.</CommandEmpty>
                    {countries.map((country) => (
                      <CommandItem
                        key={country.id}
                        onSelect={() => {
                          handleCountryChange(country.id)
                          setCountryPopoverOpen(false)
                        }}
                      >
                        {country.name}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {validationErrors.country_id && <p className="text-red-500 text-xs mt-1">{validationErrors.country_id}</p>}
          </div>

          <div>
            <Popover open={statePopoverOpen} onOpenChange={setStatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={`w-full justify-between h-11 ${validationErrors.state_id ? "border-red-500" : ""}`}
                >
                  {selectedState?.name || "Select your state*"}
                </Button>
              </PopoverTrigger>
              <PopoverContent style={{ width: '400px' }} className="p-0">
                <Command>
                  <CommandInput placeholder="Search state..." />
                  <CommandList>
                    <CommandEmpty>No state found.</CommandEmpty>
                    {states.map((state) => (
                      <CommandItem
                        key={state.id}
                        onSelect={() => {
                          handleProfileFormChange({ target: { name: "state_id", value: state.id } })
                          setStatePopoverOpen(false)
                        }}
                      >
                        {state.name}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {validationErrors.state_id && <p className="text-red-500 text-xs mt-1">{validationErrors.state_id}</p>}
          </div>
        </div>

        <Input
          type="text"
          name="postal_code"
          label="Postal Code"
          value={registrationData.postal_code}
          onChange={handleProfileFormChange}
          placeholder="Postal Code*"
          validationState={validationErrors.postal_code ? "error" : registrationData.postal_code ? "valid" : "default"}
          errorMessage={validationErrors.postal_code}
        />

        <div className="flex justify-end mt-8">
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

            <label
              className={`bg-[#1162a8] text-white px-4 py-2 rounded flex items-center cursor-pointer ${fileSizeError ? "opacity-90" : ""}`}
            >
              <Upload className="h-4 w-4 mr-2" />
              {logoPreview ? "Change logo" : "Upload logo"}
              <input
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleLogoUpload}
              />
            </label>
          </div>
        </div>

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
  )
}
