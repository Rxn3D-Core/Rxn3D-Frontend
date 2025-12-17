"use client"

import { useState, useEffect, useCallback } from "react"
import { X, ChevronDown, Info, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ColorPicker } from "@/components/ui/color-picker"
import { DiscardChangesDialog } from "./discard-changes-dialog"
import { LoadingOverlay } from "@/components/ui/loading-overlay"
import { useProductLibrary } from "@/contexts/product-case-pan-context"
import { useAuth } from "@/contexts/auth-context"
import { useTranslation } from "react-i18next"

interface AddCasePanModalProps {
  isOpen: boolean
  onClose: () => void
  editCasePan?: any // Accepts a CasePan object for editing
  onEditDone?: () => void
  isCopying?: boolean // Flag to indicate if we're copying a case pan
}

// Mock data for categories and products
const mockCategoryProducts = [
  { id: 1, name: "Removable Restoration", type: "Category" },
  { id: 2, name: "Sleep apnea", type: "Product" },
  { id: 3, name: "Other Removable Appliance", type: "Sub Category" },
  { id: 4, name: "Hard and Soft night guard", type: "Product" },
  { id: 5, name: "Partial Denture", type: "Sub Category" },
  { id: 6, name: "Tongue Crib", type: "Product" },
  { id: 7, name: "Functional Appliance", type: "Sub Category" },
  { id: 8, name: "Essix Retainer", type: "Product" },
]

const colorMapDropdown: Record<string, string> = {
  blue: "bg-[#1162a8] text-white",
  red: "bg-[#cf0202] text-white",
  white: "bg-[#ffffff] text-black",
  green: "bg-[#11a85d] text-white",
  purple: "bg-[#a81180] text-white",
  orange: "bg-[#f6be2c] text-black",
  teal: "bg-[#119ba8] text-white",
}

// Helper function to get hex color from color name
const getHexColor = (colorName: string): string => {
  const colorMap: Record<string, string> = {
    blue: "#1162a8",
    red: "#cf0202",
    white: "#ffffff",
    green: "#11a85d",
    purple: "#a81180",
    orange: "#f6be2c",
    teal: "#119ba8",
  }
  return colorMap[colorName] || "#1162a8"
}

export function AddCasePanModal({ isOpen, onClose, editCasePan, onEditDone, isCopying = false }: AddCasePanModalProps) {
  const { createCasePan, updateCasePan, isLoading, getCasePanDetail, casePanDetail, isDetailLoading, casePans } = useProductLibrary()
  const { user } = useAuth()

  // Get user role from auth context
  const getUserRole = () => {
    if (!user) return "user"
    
    // Check if user has roles array
    if (user.roles && user.roles.length > 0) {
      return user.roles[0] // Use first role
    }
    
    // Fallback to role property
    return user.role || "user"
  }

  const userRole = localStorage.getItem("role")
  const isLabAdmin = userRole === "lab_admin"
  const isSuperAdmin = userRole === "superadmin"

  // Determine if editing and is_custom is "No"
  const isEditing = !!editCasePan && !isCopying
  const isCustomNo = isEditing && editCasePan?.is_custom === "No"

  // Helper to determine if a field should be editable
  const isFieldEditable = () => {
    if (isSuperAdmin) return true
    if (isEditing && isCustomNoState) return false
    return true
  }

  // Helper to determine if quantity/color_code should be editable for lab_admin
  const isLabAdminFieldEditable = () => {
    if (isSuperAdmin) return true
    if (isEditing && !isCustomNoState) return !isCommonNo
    return true
  }

  // Track if editing and is_common === "No"
  const [isCommonNo, setIsCommonNo] = useState(false)

  // Track if editing and is_custom === "No"
  const [isCustomNoState, setIsCustomNo] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    type: "",
    color_code: "#1162a8", // Now stores hex color directly
    status: "Active",
    quantity: "", // Add quantity field
  })

  const [casePanDetails, setCasePanDetails] = useState(true)
  const [linkToCategoryExpanded, setLinkToCategoryExpanded] = useState(false)
  const [linkOption, setLinkOption] = useState("no")
  const [linkedItems, setLinkedItems] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8])
  const [searchQuery, setSearchQuery] = useState("")
  const [hasChanges, setHasChanges] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { t } = useTranslation()
  const filteredItems = mockCategoryProducts.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const toggleItemLink = (id: number) => {
    setLinkedItems((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]))
    setHasChanges(true)
  }

  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardDialog(true)
    } else {
      resetForm()
      onClose()
    }
  }

  const handleDiscard = () => {
    setShowDiscardDialog(false)
    resetForm()
    onClose()
  }

  const handleKeepEditing = () => {
    setShowDiscardDialog(false)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      type: "",
      color_code: "#1162a8", // Reset to default hex color
      status: "Active",
      quantity: "", // Reset quantity
    })
    setCasePanDetails(true)
    setLinkToCategoryExpanded(false)
    setLinkOption("no")
    setLinkedItems([1, 2, 3, 4, 5, 6, 7, 8])
    setSearchQuery("")
    setHasChanges(false)
    setIsCommonNo(false)
    setIsCustomNo(false)
    setIsSubmitting(false)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }
      // Auto-generate code from name when name changes (only first letter of first word)
      if (field === "name") {
        const trimmedName = value.trim()
        if (trimmedName) {
          const firstWord = trimmedName.split(/\s+/)[0]
          const generatedCode = firstWord.charAt(0).toUpperCase()
          if (generatedCode) {
            updated.code = generatedCode
          }
        }
      }
      return updated
    })
    setHasChanges(true)
  }

  // Populate form when editing or copying (fetch detail if editCasePan is present with id)
  useEffect(() => {
    if (!isOpen) return // Don't run if modal is not open
    
    let ignore = false
    const fetchDetail = async () => {
      if (editCasePan && editCasePan.id && !isCopying) {
        // Editing: fetch detail from API
        const detail = await getCasePanDetail(editCasePan.id)
        if (!ignore && detail) {
          setFormData({
            name: detail.name || "",
            code: detail.code || "",
            description: detail.description || "",
            type: detail.type || "",
            color_code: detail.color_code || "#1162a8", // Store hex directly
            status: detail.status || "Active",
            quantity: detail.lab_case_pan?.quantity !== undefined
              ? String(detail.lab_case_pan.quantity)
              : (detail.quantity !== undefined ? String(detail.quantity) : ""),
          })
          setCasePanDetails(true)
          setHasChanges(false)
          setIsCommonNo(detail.is_common === "No")
          setIsCustomNo(detail.is_custom === "No")
        }
      } else if (editCasePan && isCopying) {
        // Copying: use the provided editCasePan data directly (no API call needed)
        console.log("Copying case pan - using provided data:", editCasePan)
        setFormData({
          name: editCasePan.name || "",
          code: editCasePan.code || "",
          description: editCasePan.description || "",
          type: editCasePan.type || "",
          color_code: editCasePan.color_code || "#1162a8",
          status: editCasePan.status || "Active",
          quantity: editCasePan.lab_case_pan?.quantity !== undefined
            ? String(editCasePan.lab_case_pan.quantity)
            : (editCasePan.quantity !== undefined ? String(editCasePan.quantity) : ""),
        })
        setCasePanDetails(true)
        setHasChanges(false)
        setIsCommonNo(editCasePan.is_common === "No")
        setIsCustomNo(editCasePan.is_custom === "No")
      } else {
        // New case pan: reset form
        setFormData({
          name: "",
          code: "",
          description: "",
          type: "",
          color_code: "#1162a8",
          status: "Active",
          quantity: "",
        })
        setCasePanDetails(true)
        setLinkToCategoryExpanded(false)
        setLinkOption("no")
        setLinkedItems([1, 2, 3, 4, 5, 6, 7, 8])
        setSearchQuery("")
        setHasChanges(false)
        setIsCommonNo(false)
        setIsCustomNo(false)
      }
    }
    fetchDetail()
    return () => { ignore = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editCasePan, isOpen, isCopying])

  // Helper to map hex color to color key
  function getColorKey(hex: string): string {
    const map: Record<string, string> = {
      "#1162a8": "blue",
      "#cf0202": "red",
      "#ffffff": "white",
      "#11a85d": "green",
      "#a81180": "purple",
      "#f6be2c": "orange",
      "#119ba8": "teal",
    }
    return map[hex?.toLowerCase()] || "blue"
  }

  const handleSubmit = async () => {
    try {
      if (
        !formData.name.trim() ||
        !formData.code.trim() ||
        !formData.type ||
        !formData.color_code ||
        (isLabAdmin && !formData.quantity.trim())
      ) {
        return 
      }

      setIsSubmitting(true)

      let payload: any = {}

      // Helper to ensure color_code is hex format
      const getHexColorValue = (color: string): string => {
        // If already hex, return as is
        if (color.startsWith('#')) {
          return color
        }
        // Otherwise convert from color name to hex
        return getHexColor(color)
      }

      if (editCasePan && isCustomNoState && !isCopying) {
        // Only allow updating quantity and color_code (when editing, not copying)
        if (isLabAdmin) {
          payload.quantity = parseInt(formData.quantity.trim())
        }
        payload.color_code = getHexColorValue(formData.color_code)
      } else {
        // Normal payload
        payload = {
          name: formData.name.trim(),
          code: formData.code.trim(),
          description: formData.description.trim() || "",
          type: formData.type,
          status: formData.status,
        }
        if (isLabAdmin) {
          payload.quantity = parseInt(formData.quantity.trim())
        }
        payload.color_code = getHexColorValue(formData.color_code)
      }

      // If copying, always create a new case pan (not update)
      if (editCasePan && editCasePan.id && !isCopying) {
        await updateCasePan(editCasePan.id, payload)
        if (onEditDone) onEditDone()
        resetForm()
        setIsSubmitting(false)
        return
      } else {
        // Create new case pan (either new or copy)
        await createCasePan(payload)
        setIsSubmitting(false)
        onClose()
      }
      resetForm()
    } catch (error) {
      console.error("Error saving case pan:", error)
      setIsSubmitting(false)
    }
  }

  const isFormValid =
    formData.name.trim() &&
    formData.code.trim() &&
    formData.type &&
    formData.color_code &&
    casePanDetails &&
    (!isLabAdmin || formData.quantity.trim())

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="p-0 gap-0 sm:max-w-[800px] overflow-hidden bg-white">
          <DialogHeader className="px-6 py-4 flex flex-row items-center justify-between border-b">
            <DialogTitle className="text-xl font-medium">
              {isCopying
                ? t("csePanModal.copyCasePan", "Copy Case Pan")
                : editCasePan
                  ? t("csePanModal.editCasePan", "Edit Case Pan")
                  : t("csePanModal.addNewCasePan", "Add New Case Pan")}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[80vh] min-h-[400px] relative">
            {/* Loading Overlay for fetching detail */}
            {isDetailLoading && isEditing ? (
              <div className="flex items-center justify-center min-h-[400px] py-10">
                <div className="flex flex-col items-center gap-4">
                  <svg className="animate-spin h-10 w-10 text-[#1162a8]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900">{t("loading", "Loading...")}</p>
                    <p className="text-sm text-gray-500 mt-1">{t("csePanModal.loadingCasePanDetails", "Please wait while we load case pan details...")}</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Case Pan Details Section */}
                <div className="px-6 py-5 border-b">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-lg">
                        {t("csePanModal.casePanDetails", "Case Pan Details")}
                      </span>
                      <Info className="h-4 w-4 text-gray-400" />
                    </div>
                    <Switch className="data-[state=checked]:bg-[#1162a8]"
                      checked={casePanDetails}
                      onCheckedChange={(checked) => {
                        setCasePanDetails(checked)
                        setHasChanges(true)
                      }}
                      disabled={isEditing && isCustomNoState}
                    />
                  </div>

                  {casePanDetails && (
                    <div className="space-y-5">
                      <Input
                        placeholder={t("csePanModal.casePanName", "Case Pan Name *")}
                        className="h-11"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        validationState={formData.name.trim() ? "valid" : "default"}
                        required
                        disabled={!isFieldEditable()}
                        readOnly={!isFieldEditable()}
                      />

                      <Input
                        placeholder={t("csePanModal.casePanCode", "Case Pan Code (e.g., R01)")}
                        className="h-11"
                        value={formData.code}
                        onChange={(e) => handleInputChange("code", e.target.value)}
                        validationState={formData.code.trim() ? "valid" : "default"}
                        required
                      />

                      <Textarea
                        placeholder={t("csePanModal.description", "Description")}
                        className="min-h-[100px]"
                        value={formData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        disabled={!isFieldEditable()}
                        readOnly={!isFieldEditable()}
                      />

                      {/* Conditionally show quantity input for lab_admin only */}
                      {isLabAdmin && (
                        <Input
                          type="number"
                          placeholder={t("csePanModal.quantity", "Quantity *")}
                          className="h-11"
                          value={formData.quantity}
                          onChange={(e) => handleInputChange("quantity", e.target.value)}
                          validationState={formData.quantity.trim() ? "valid" : "default"}
                          required
                          min="0"
                          disabled={!isLabAdminFieldEditable()}
                          readOnly={!isLabAdminFieldEditable()}
                        />
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <Select
                          value={formData.type}
                          onValueChange={(value) => handleInputChange("type", value)}
                          disabled={!isFieldEditable()}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder={t("csePanModal.chooseArch", "Choose applicable arch *")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Upper">{t("csePanModal.upperArch", "Upper Arch")}</SelectItem>
                            <SelectItem value="Lower">{t("csePanModal.lowerArch", "Lower Arch")}</SelectItem>
                            <SelectItem value="Both">{t("csePanModal.bothArch", "Both Arch")}</SelectItem>
                          </SelectContent>
                        </Select>

                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-gray-700">
                            {t("csePanModal.selectColor", "Select Color *")}
                          </label>
                          <div className="flex items-center gap-2">
                            <div className={!isLabAdminFieldEditable() ? "opacity-50 pointer-events-none" : ""}>
                              <ColorPicker
                                value={formData.color_code.startsWith('#') ? formData.color_code : getHexColor(formData.color_code)}
                                onChange={(hexColor) => {
                                  if (isLabAdminFieldEditable()) {
                                    handleInputChange("color_code", hexColor)
                                  }
                                }}
                                predefinedColors={Object.keys(colorMapDropdown).map(colorName => getHexColor(colorName))}
                              />
                            </div>
                            {formData.color_code && (
                              <span className="text-sm text-gray-600">
                                {formData.color_code}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Link to Category / Products Section */}
                {/* <Collapsible
                  open={linkToCategoryExpanded}
                  onOpenChange={(open) => {
                    setLinkToCategoryExpanded(open)
                    setHasChanges(true)
                  }}
                >
                  <div className="px-6 py-5">
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-medium">
                          {t("csePanModal.linkToCategoryProducts", "Link to Category / Products")}
                        </span>
                        <Info className="h-5 w-5 text-gray-400" />
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 transition-transform ${linkToCategoryExpanded ? "rotate-180" : ""}`}
                      />
                    </CollapsibleTrigger>
                  </div>

                  <CollapsibleContent>
                    <div className="border-t border-blue-100">
                      <div className="px-6 py-5">
                        <div className="mb-6">
                          <div className="flex items-center mb-6">
                            <span className="text-lg mr-4 w-64">
                              {t("csePanModal.linkToAllCategoryProducts", "Link to all Category / Products")}
                            </span>
                            <div className="flex items-center space-x-8">
                              <div className="flex items-center space-x-2">
                                <div
                                  className={`w-6 h-6 rounded-full border-2 ${
                                    linkOption === "yes" ? "border-[#1162a8]" : "border-gray-300"
                                  } flex items-center justify-center cursor-pointer`}
                                  onClick={() => {
                                    setLinkOption("yes")
                                    setHasChanges(true)
                                  }}
                                >
                                  {linkOption === "yes" && <div className="w-3 h-3 rounded-full bg-[#1162a8]"></div>}
                                </div>
                                <span>{t("csePanModal.yes", "Yes")}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div
                                  className={`w-6 h-6 rounded-full border-2 ${
                                    linkOption === "no" ? "border-[#1162a8]" : "border-gray-300"
                                  } flex items-center justify-center cursor-pointer`}
                                  onClick={() => {
                                    setLinkOption("no")
                                    setHasChanges(true)
                                  }}
                                >
                                  {linkOption === "no" && <div className="w-3 h-3 rounded-full bg-[#1162a8]"></div>}
                                </div>
                                <span>{t("csePanModal.no", "No")}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div
                                  className={`w-6 h-6 rounded-full border-2 ${
                                    linkOption === "hide" ? "border-[#1162a8]" : "border-gray-300"
                                  } flex items-center justify-center cursor-pointer`}
                                  onClick={() => {
                                    setLinkOption("hide")
                                    setHasChanges(true)
                                  }}
                                >
                                  {linkOption === "hide" && <div className="w-3 h-3 rounded-full bg-[#1162a8]"></div>}
                                </div>
                                <span>{t("csePanModal.hideToAll", "Hide to all")}</span>
                              </div>
                            </div>
                          </div>

                          <div className="relative mb-6">
                            <Input
                              placeholder={t("csePanModal.searchCategoryProduct", "Search Category Product")}
                              value={searchQuery}
                              onChange={(e) => {
                                setSearchQuery(e.target.value)
                                setHasChanges(true)
                              }}
                              className="pr-10 h-12 rounded-md border-gray-300"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                              </svg>
                            </div>
                          </div>

                          <div className="border-t border-b border-gray-200">
                            <div className="grid grid-cols-2 py-4 px-6 font-medium">
                              <div>{t("csePanModal.product", "Product")}</div>
                              <div className="text-center">{t("csePanModal.link", "Link")}</div>
                            </div>

                            {filteredItems.map((item, index) => (
                              <div
                                key={item.id}
                                className={`grid grid-cols-2 py-4 px-6 items-center ${
                                  index % 2 === 1 ? "bg-white" : "bg-blue-50"
                                }`}
                              >
                                <div className="flex items-center">
                                  <span className="font-medium">{item.name}</span>
                                  <span className="ml-2 text-gray-400 text-sm">- {item.type}</span>
                                </div>
                                <div className="flex justify-center items-center gap-4">
                                  <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 data-[state=checked]:bg-[#1162a8]"></div>
                                  <Switch
                                    checked={linkedItems.includes(item.id)}
                                    onCheckedChange={() => toggleItemLink(item.id)}
                                    className="h-6 w-11 rounded-full data-[state=checked]:bg-[#1162a8]"
                                  />
                                  <Trash2
                                    className="h-5 w-5 text-gray-300 hover:text-gray-500 cursor-pointer"
                                    onClick={() => {
                                      toggleItemLink(item.id)
                                      setHasChanges(true)
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible> */}

                {/* Footer with action buttons */}
                <div className="px-6 py-4 flex justify-end gap-3 border-t">
                  <Button
                    variant="destructive"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    {t("csePanModal.cancel", "Cancel")}
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleSubmit}
                    disabled={!isFormValid || isSubmitting}
                  >
                    {isSubmitting
                      ? (isCopying
                          ? t("csePanModal.copying", "Copying...")
                          : editCasePan
                            ? t("csePanModal.updating", "Updating...")
                            : t("csePanModal.creating", "Creating..."))
                      : (isCopying
                          ? t("csePanModal.copyCasePan", "Copy Case Pan")
                          : editCasePan
                            ? t("csePanModal.saveChanges", "Save Changes")
                            : t("csePanModal.saveCasePan", "Save Case Pan"))}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DiscardChangesDialog
        isOpen={showDiscardDialog}
        type="case-pan"
        onDiscard={handleDiscard}
        onKeepEditing={handleKeepEditing}
      />

      {/* Loading Overlay for save/update operations - only show when actually submitting */}
      <LoadingOverlay
        isLoading={isSubmitting}
        title={isCopying 
          ? t("csePanModal.copying", "Copying...")
          : editCasePan 
            ? t("csePanModal.updating", "Updating...")
            : t("csePanModal.creating", "Creating...")}
        message={isCopying
          ? t("csePanModal.copyingCasePan", "Please wait while we copy the case pan...")
          : editCasePan 
            ? t("csePanModal.updatingCasePan", "Please wait while we update the case pan...")
            : t("csePanModal.creatingCasePan", "Please wait while we create the case pan...")}
        zIndex={10000}
      />
    </>
  )
}
