"use client"

import { Upload, X, AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

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
  /** Tighter layout for self-reg wizard (same visuals, less vertical space) */
  dense?: boolean
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
  dense = false,
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

  const renderLogoUpload = (inline = false) => (
    <div
      className={cn(
        inline
          ? "flex h-full flex-col items-center justify-center gap-2"
          : "flex items-center",
        !inline && (dense ? "gap-4" : "flex-col items-center")
      )}
    >
      {logoPreview ? (
        <div className="relative shrink-0">
          <img
            src={logoPreview || "/placeholder.svg"}
            alt="Logo Preview"
            className={cn(
              "rounded object-contain",
              inline ? "h-16 w-16" : dense ? "mb-4 h-24 w-24" : "mb-4 h-40 w-40"
            )}
          />
          <button
            type="button"
            onClick={handleRemoveLogo}
            className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white"
            aria-label="Remove logo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : !inline ? (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded border border-dashed border-gray-300",
            dense ? "mb-4 h-24 w-24" : "mb-4 h-40 w-40"
          )}
        >
          <span className="text-sm text-gray-400">Logo Preview</span>
        </div>
      ) : null}

      <div className={cn(inline ? "flex w-full flex-col items-stretch gap-1.5 sm:items-center" : dense ? "flex min-w-0 flex-col items-start gap-2" : "flex flex-col items-center")}>
        <label
          className={`flex cursor-pointer items-center justify-center rounded bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] px-3 py-1.5 text-sm text-white sm:justify-start ${fileSizeError ? "opacity-90" : ""} ${inline ? "w-full sm:w-auto" : ""}`}
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
        {!fileSizeError && !inline ? (
          <div className={cn("text-[#a19d9d]", dense ? "text-xs text-left max-w-xs" : "text-sm text-center mt-2")}>
            Note: Logo files must be in PNG, SVG, or JPEG format, maximum of 1MB (1024KB).
          </div>
        ) : null}
        {!fileSizeError && inline ? (
          <p className="text-center text-[10px] leading-tight text-[#a19d9d] px-1">
            PNG, SVG, or JPEG. Max 1MB.
          </p>
        ) : null}
      </div>
    </div>
  )

  return (
    <div>
      {!dense ? (
        <h2 className="mb-4 text-lg font-medium">{profileTitle}</h2>
      ) : null}

      <div className={cn(dense ? "space-y-3" : "space-y-4")}>
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

        <div className={cn("grid grid-cols-1 sm:grid-cols-2", dense ? "gap-3" : "gap-4")}>
          <div className="min-w-0">
            <Popover open={countryPopoverOpen} onOpenChange={setCountryPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={`h-11 w-full justify-between text-left ${validationErrors.country_id ? "border-red-500" : ""}`}
                >
                  <span className="truncate">{selectedCountry?.name || "Select your country*"}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[var(--radix-popover-trigger-width)] max-w-[min(400px,calc(100vw-2rem))] p-0"
              >
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

          <div className="min-w-0">
            <Popover open={statePopoverOpen} onOpenChange={setStatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={`h-11 w-full justify-between text-left ${validationErrors.state_id ? "border-red-500" : ""}`}
                >
                  <span className="truncate">{selectedState?.name || "Select your state*"}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[var(--radix-popover-trigger-width)] max-w-[min(400px,calc(100vw-2rem))] p-0"
              >
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
            name="postal_code"
            label="Postal Code"
            value={registrationData.postal_code}
            onChange={handleProfileFormChange}
            placeholder="Postal Code*"
            validationState={validationErrors.postal_code ? "error" : registrationData.postal_code ? "valid" : "default"}
            errorMessage={validationErrors.postal_code}
          />
        </div>

        {dense ? (
          <div className="flex justify-center border-t border-slate-100 pt-3 sm:justify-end sm:border-0 sm:pt-1">
            {renderLogoUpload(true)}
          </div>
        ) : (
          <div className={cn("mt-6 flex justify-center sm:mt-8 sm:justify-end")}>{renderLogoUpload(false)}</div>
        )}

        {fileSizeError ? (
          <div className="flex items-center text-red-500 text-sm mt-2">
            <AlertCircle className="h-4 w-4 mr-1" />
            {fileSizeError}
          </div>
        ) : !dense ? (
          <div className="text-sm text-[#a19d9d] text-center mt-2">
            Note: Logo files must be in PNG, SVG, or JPEG format, maximum of 1MB (1024KB).
          </div>
        ) : null}
      </div>
    </div>
  )
}
