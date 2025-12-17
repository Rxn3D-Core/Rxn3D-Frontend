"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, X, Info, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AuthHeader } from "@/components/auth-header"
import { useOnboardingStatus } from "@/hooks/use-onboarding-status"
import { useAuth } from "@/contexts/auth-context"

export default function AttachmentsPage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { isOnboardingComplete, isLoading: onboardingLoading } = useOnboardingStatus()
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddAddon, setShowAddAddon] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({
    reinforcements: false,
    aesthetic: false,
    functional: false,
    attachments: true,
    miscellaneous: false,
    custom: false,
  })

  // Attachment options
  const [attachmentOptions, setAttachmentOptions] = useState({
    "locator-attachments": true,
    "ball-o-rings-attachments": false,
    "bar-clip-system": true,
    "light-housing-system": false,
  })

  // Reinforcement options
  const [reinforcementOptions, setReinforcementOptions] = useState({
    "metal-reinforcement": false,
    "fiber-reinforcement": false,
  })

  // Aesthetic options
  const [aestheticOptions, setAestheticOptions] = useState({
    "gingival-characterization": false,
    "custom-shading": false,
  })

  // Functional options
  const [functionalOptions, setFunctionalOptions] = useState({
    "precision-attachments": false,
    "telescopic-crowns": false,
  })

  // Miscellaneous options
  const [miscOptions, setMiscOptions] = useState({
    "special-trays": false,
    "bite-blocks": false,
  })

  // Toggle attachment option
  const toggleAttachmentOption = (option: string) => {
    setAttachmentOptions({
      ...attachmentOptions,
      [option]: !attachmentOptions[option],
    })
  }

  // Toggle reinforcement option
  const toggleReinforcementOption = (option: string) => {
    setReinforcementOptions({
      ...reinforcementOptions,
      [option]: !reinforcementOptions[option],
    })
  }

  // Toggle aesthetic option
  const toggleAestheticOption = (option: string) => {
    setAestheticOptions({
      ...aestheticOptions,
      [option]: !aestheticOptions[option],
    })
  }

  // Toggle functional option
  const toggleFunctionalOption = (option: string) => {
    setFunctionalOptions({
      ...functionalOptions,
      [option]: !functionalOptions[option],
    })
  }

  // Toggle miscellaneous option
  const toggleMiscOption = (option: string) => {
    setMiscOptions({
      ...miscOptions,
      [option]: !miscOptions[option],
    })
  }

  const handleCategorySelect = (category: string) => {
    // If dropdown is open, close it
    if (activeDropdown === category) {
      setActiveDropdown(null)
      return
    }

    // If dropdown is closed, toggle selection and open dropdown if selected
    if (selectedCategories[category]) {
      // If already selected, unselect it
      setSelectedCategories({
        ...selectedCategories,
        [category]: false,
      })
      setActiveDropdown(null)
    } else {
      // If not selected, select it and open dropdown
      setSelectedCategories({
        ...selectedCategories,
        [category]: true,
      })
      setActiveDropdown(category)
    }

    // If custom is clicked, show the add addon dialog
    if (category === "custom") {
      setShowAddAddon(true)
    }
  }

  // Close dropdown when clicking outside
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Validate onboarding status - redirect if already onboarded
  useEffect(() => {
    if (!onboardingLoading && user && isOnboardingComplete) {
      const isSuperAdmin = user.roles?.includes("superadmin")
      if (!isSuperAdmin) {
        router.replace("/dashboard")
      }
    }
  }, [onboardingLoading, user, isOnboardingComplete, router])

  // Render reinforcements dropdown
  const renderReinforcementsDropdown = () => (
    <div className="relative">
      <CategoryButton
        label="Reinforcements"
        selected={selectedCategories.reinforcements}
        onClick={() => handleCategorySelect("reinforcements")}
        hasDropdown={true}
        isOpen={activeDropdown === "reinforcements"}
      />
      {activeDropdown === "reinforcements" && (
        <div className="absolute left-0 top-full w-64 bg-white border border-gray-200 rounded-md shadow-sm z-10 overflow-y-auto max-h-60">
          <div>
            <div className="bg-[#f2f8ff]">
              <CheckboxOption
                id="metal-reinforcement"
                label="Metal reinforcement"
                checked={reinforcementOptions["metal-reinforcement"]}
                onChange={() => toggleReinforcementOption("metal-reinforcement")}
              />
            </div>
            <div className="bg-white">
              <CheckboxOption
                id="fiber-reinforcement"
                label="Fiber reinforcement"
                checked={reinforcementOptions["fiber-reinforcement"]}
                onChange={() => toggleReinforcementOption("fiber-reinforcement")}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Render aesthetic dropdown
  const renderAestheticDropdown = () => (
    <div className="relative">
      <CategoryButton
        label="Aesthetic"
        selected={selectedCategories.aesthetic}
        onClick={() => handleCategorySelect("aesthetic")}
        hasDropdown={true}
        isOpen={activeDropdown === "aesthetic"}
      />
      {activeDropdown === "aesthetic" && (
        <div className="absolute left-0 top-full w-64 bg-white border border-gray-200 rounded-md shadow-sm z-10 overflow-y-auto max-h-60">
          <div>
            <div className="bg-[#f2f8ff]">
              <CheckboxOption
                id="gingival-characterization"
                label="Gingival characterization"
                checked={aestheticOptions["gingival-characterization"]}
                onChange={() => toggleAestheticOption("gingival-characterization")}
              />
            </div>
            <div className="bg-white">
              <CheckboxOption
                id="custom-shading"
                label="Custom shading"
                checked={aestheticOptions["custom-shading"]}
                onChange={() => toggleAestheticOption("custom-shading")}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Render functional dropdown
  const renderFunctionalDropdown = () => (
    <div className="relative">
      <CategoryButton
        label="Functional"
        selected={selectedCategories.functional}
        onClick={() => handleCategorySelect("functional")}
        hasDropdown={true}
        isOpen={activeDropdown === "functional"}
      />
      {activeDropdown === "functional" && (
        <div className="absolute left-0 top-full w-64 bg-white border border-gray-200 rounded-md shadow-sm z-10 overflow-y-auto max-h-60">
          <div>
            <div className="bg-[#f2f8ff]">
              <CheckboxOption
                id="precision-attachments"
                label="Precision attachments"
                checked={functionalOptions["precision-attachments"]}
                onChange={() => toggleFunctionalOption("precision-attachments")}
              />
            </div>
            <div className="bg-white">
              <CheckboxOption
                id="telescopic-crowns"
                label="Telescopic crowns"
                checked={functionalOptions["telescopic-crowns"]}
                onChange={() => toggleFunctionalOption("telescopic-crowns")}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Render attachments dropdown
  const renderAttachmentsDropdown = () => (
    <div className="relative">
      <CategoryButton
        label="Attachments & Overdenture"
        selected={selectedCategories.attachments}
        onClick={() => handleCategorySelect("attachments")}
        hasDropdown={true}
        isOpen={activeDropdown === "attachments"}
      />
      {activeDropdown === "attachments" && (
        <div className="absolute left-0 top-full w-64 bg-white border border-gray-200 rounded-md shadow-sm z-10 overflow-y-auto max-h-60">
          <div>
            <div className="bg-[#f2f8ff]">
              <CheckboxOption
                id="locator-attachments"
                label="Locator attachments"
                checked={attachmentOptions["locator-attachments"]}
                onChange={() => toggleAttachmentOption("locator-attachments")}
              />
            </div>
            <div className="bg-white">
              <CheckboxOption
                id="ball-o-rings-attachments"
                label="Ball/O rings attachments"
                checked={attachmentOptions["ball-o-rings-attachments"]}
                onChange={() => toggleAttachmentOption("ball-o-rings-attachments")}
              />
            </div>
            <div className="bg-[#f2f8ff]">
              <CheckboxOption
                id="bar-clip-system"
                label="Bar/Clip system"
                checked={attachmentOptions["bar-clip-system"]}
                onChange={() => toggleAttachmentOption("bar-clip-system")}
              />
            </div>
            <div className="bg-white">
              <CheckboxOption
                id="light-housing-system"
                label="Light housing system"
                checked={attachmentOptions["light-housing-system"]}
                onChange={() => toggleAttachmentOption("light-housing-system")}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Render miscellaneous dropdown
  const renderMiscellaneousDropdown = () => (
    <div className="relative">
      <CategoryButton
        label="Miscellaneous"
        selected={selectedCategories.miscellaneous}
        onClick={() => handleCategorySelect("miscellaneous")}
        hasDropdown={true}
        isOpen={activeDropdown === "miscellaneous"}
      />
      {activeDropdown === "miscellaneous" && (
        <div className="absolute left-0 top-full w-64 bg-white border border-gray-200 rounded-md shadow-sm z-10 overflow-y-auto max-h-60">
          <div>
            <div className="bg-[#f2f8ff]">
              <CheckboxOption
                id="special-trays"
                label="Special trays"
                checked={miscOptions["special-trays"]}
                onChange={() => toggleMiscOption("special-trays")}
              />
            </div>
            <div className="bg-white">
              <CheckboxOption
                id="bite-blocks"
                label="Bite blocks"
                checked={miscOptions["bite-blocks"]}
                onChange={() => toggleMiscOption("bite-blocks")}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Render custom dropdown
  const renderCustomDropdown = () => (
    <div className="relative">
      <CategoryButton
        label="Custom"
        selected={selectedCategories.custom}
        onClick={() => handleCategorySelect("custom")}
        hasDropdown={true}
        isOpen={activeDropdown === "custom"}
      />
      {activeDropdown === "custom" && (
        <div className="absolute left-0 top-full w-64 bg-white border border-gray-200 rounded-md shadow-sm z-10 overflow-y-auto max-h-60">
          <div>
            <div className="bg-[#f2f8ff]">
              <div className="px-3 py-3">
                <div className="text-sm text-gray-500">Click to add a custom add-on</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen bg-[#f7fbff]">
      {/* Header */}
      <AuthHeader/>

      {/* Progress bar */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="relative h-1 bg-[#e4e6ef] rounded-full max-w-3xl mx-auto">
          <div className="absolute h-1 w-[95%] bg-[#1162a8] rounded-full"></div>
        </div>
        <div className="text-right max-w-3xl mx-auto mt-1 text-sm">95% complete</div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 mb-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-1">Products and Services</h1>
              <p className="text-[#545f71]">
                What are your product grades, impressions that you need and gum shades that you offer?
              </p>
            </div>

            {/* Search bar */}
            <div className="relative mb-6">
              <Input
                type="text"
                placeholder="Search Library"
                className="pl-10 pr-4 py-2"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            {/* Category tabs with dropdowns */}
            <div className="flex flex-wrap gap-3 mb-6" ref={dropdownRef}>
              {renderReinforcementsDropdown()}
              {renderAestheticDropdown()}
              {renderFunctionalDropdown()}
              {renderAttachmentsDropdown()}
              {renderMiscellaneousDropdown()}
              {renderCustomDropdown()}
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              className="bg-[#eef1f4] border-[#eef1f4] hover:bg-[#dfeefb] hover:border-[#dfeefb]"
              onClick={() => {
                setTimeout(() => {
                  logout()
                }, 0)
              }}
            >
              Continue Later
            </Button>
            <Button
              variant="outline"
              className="bg-[#eef1f4] border-[#eef1f4] hover:bg-[#dfeefb] hover:border-[#dfeefb]"
              onClick={() => router.replace("/onboarding/product-grades")}
            >
              Previous
            </Button>
            <Button
              className="bg-[#1162a8] hover:bg-[#1162a8]/90 border border-[#1162a8]"
              onClick={() => router.replace("/onboarding/invite-practices")}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Add Add-On Dialog */}
      <Dialog open={showAddAddon} onOpenChange={setShowAddAddon}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Add-Ons</DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Add-ons Details</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-[#1162a8]">
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Enter the details for your custom add-on</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Input placeholder="Add-ons Name" />

            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reinforcements">Reinforcements</SelectItem>
                <SelectItem value="aesthetic">Aesthetic</SelectItem>
                <SelectItem value="functional">Functional</SelectItem>
                <SelectItem value="attachments">Attachments & Overdenture</SelectItem>
                <SelectItem value="miscellaneous">Miscellaneous</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex justify-end">
              <Button className="bg-[#1162a8] hover:bg-[#1162a8]/90 text-white" onClick={() => setShowAddAddon(false)}>
                Add Add-on
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface CategoryButtonProps {
  label: string
  selected: boolean
  onClick: () => void
  disabled?: boolean
  hasDropdown?: boolean
  isOpen?: boolean
}

function CategoryButton({
  label,
  selected,
  onClick,
  disabled = false,
  hasDropdown = false,
  isOpen = false,
}: CategoryButtonProps) {
  return (
    <button
      className={`px-4 py-2 rounded-md flex items-center justify-between gap-2 ${
        selected
          ? disabled
            ? "bg-gray-200 text-gray-500"
            : "bg-[#1162a8] text-white"
          : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} min-w-[180px]`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
      {hasDropdown && (
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white border border-gray-300">
          <span className="text-[#1162a8] font-bold text-lg">{isOpen ? "-" : "+"}</span>
        </div>
      )}
    </button>
  )
}

interface CheckboxOptionProps {
  id: string
  label: string
  checked: boolean
  onChange: () => void
}

function CheckboxOption({ id, label, checked, onChange }: CheckboxOptionProps) {
  return (
    <div
      className={`px-3 py-3 flex items-center space-x-3 hover:bg-[#e6eef7] ${checked ? "bg-[#f2f8ff]" : ""}`}
      onClick={onChange}
    >
      <div
        className={`w-5 h-5 flex items-center justify-center rounded border ${
          checked ? "bg-[#1162a8] border-[#1162a8]" : "bg-white border-gray-400"
        }`}
      >
        {checked && <Check className="h-3.5 w-3.5 text-white" />}
      </div>
      <label htmlFor={id} className="text-sm font-medium leading-none cursor-pointer">
        {label}
      </label>
    </div>
  )
}
