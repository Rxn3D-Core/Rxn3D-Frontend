"use client"

import { useState, useEffect } from "react"
import { X, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ColorPicker } from "@/components/ui/color-picker"
import { useTranslation } from "react-i18next"
import { useCaseTracking } from "@/contexts/case-tracking-context"

interface DuplicateCasePanModalProps {
  isOpen: boolean
  onClose: () => void
  sourceData?: any
}

const PRESET_COLORS = [
  "#cf0202", "#1E88E5", "#11a85d", "#f6be2c", "#9e9e9e", "#f6692c",
  "#a81180", "#119ba8", "#b4d54c", "#f6442c", "#9b27b0", "#2e8b8b",
]

export function DuplicateCasePanModal({ isOpen, onClose, sourceData }: DuplicateCasePanModalProps) {
  const { t } = useTranslation()
  const { createCasePan } = useCaseTracking()

  const [formData, setFormData] = useState({
    name: "",
    prefixLetter: "",
    quantity: "",
    codeFormat: "numeric",
    color: "#1162A8",
    activeStatus: true,
    setAsRushGroup: false,
  })

  const [prefixError, setPrefixError] = useState(false)

  useEffect(() => {
    if (sourceData && isOpen) {
      setFormData({
        name: `${sourceData.name} (Copy)`,
        prefixLetter: sourceData.code || "",
        quantity: sourceData.quantity?.toString() || "",
        codeFormat: sourceData.code_format === "Alphanumeric" ? "alphanumeric" : "numeric",
        color: sourceData.color_code || "#1162A8",
        activeStatus: true,
        setAsRushGroup: sourceData.set_as_rush_group || sourceData.isRushGroup || false,
      })
      setPrefixError(true) // Show error by default since prefix is already used
    }
  }, [sourceData, isOpen])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (field === "prefixLetter") {
      // Check if prefix is already used (this would typically be an API call)
      setPrefixError(value === sourceData?.code)
    }
  }

  const handleSubmit = async () => {
    if (prefixError) return

    try {
      const payload = {
        name: formData.name,
        code: formData.prefixLetter,
        quantity: parseInt(formData.quantity),
        code_format: (formData.codeFormat === "numeric" ? "Numeric" : "Alphanumeric") as "Numeric" | "Alphanumeric",
        color_code: formData.color,
        type: "Both" as "Upper" | "Lower" | "Both",
        status: (formData.activeStatus ? "Active" : "Inactive") as "Active" | "Inactive",
        set_as_rush_group: formData.setAsRushGroup,
      }

      await createCasePan(payload)
      onClose()
    } catch (error) {
      console.error("Error duplicating case pan:", error)
    }
  }

  const isFormValid = formData.name.trim() && formData.prefixLetter.trim() && formData.quantity.trim() && !prefixError

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-w-[95vw] p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-medium flex items-center gap-2">
              <div className="bg-[#1162a8] text-white p-2 rounded">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <rect x="7" y="7" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="white"/>
                </svg>
              </div>
              {t("caseTracking.duplicateCasePan", "Duplicate case pan")}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0">
          <p className="text-sm text-gray-600 mb-6">
            {t("caseTracking.duplicateDescription", "Create a new case tracking group with prefix, capacity, and linked categories.")}
          </p>

          <div className="space-y-5">
            {/* Case Pan Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("caseTracking.casePanName", "Case Pan Name")}
              </label>
              <Input
                placeholder={t("caseTracking.casePanNamePlaceholder", "e.g., Rush case, Regular case, Full Dentures only")}
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="h-11"
              />
            </div>

            {/* Prefix Letter and Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("caseTracking.prefixLetter", "Prefix Letter")}
                </label>
                <div className="relative">
                  <Input
                    placeholder="R"
                    value={formData.prefixLetter}
                    onChange={(e) => handleInputChange("prefixLetter", e.target.value.toUpperCase())}
                    maxLength={1}
                    className={`h-11 ${prefixError ? "border-red-500 focus:ring-red-500" : ""}`}
                  />
                  {prefixError && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {t("caseTracking.prefixAlreadyUsed", "Oops! Prefix already used")}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("caseTracking.quantity", "Quantity")}
                </label>
                <Input
                  type="number"
                  placeholder="200"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange("quantity", e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            {/* Code Format */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("caseTracking.codeFormat", "Code Format")}
              </label>
              <Select value={formData.codeFormat} onValueChange={(value) => handleInputChange("codeFormat", value)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="numeric">{t("caseTracking.numericOnly", "Numeric only (01 - 99)")}</SelectItem>
                  <SelectItem value="alphanumeric">{t("caseTracking.alphanumeric", "Alphanumeric (A01 - Z99)")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("caseTracking.color", "Color")}
              </label>
              <div className="flex items-center gap-4">
                <ColorPicker
                  value={formData.color}
                  onChange={(color) => handleInputChange("color", color)}
                  predefinedColors={PRESET_COLORS}
                />
              </div>
            </div>

            {/* Set as Rush Group */}
            <div className="flex items-center justify-between py-4 border-t border-b">
              <div>
                <p className="font-medium">{t("caseTracking.setAsRushGroup", "Set as Rush Group")}</p>
                <p className="text-sm text-gray-500">
                  {t("caseTracking.rushGroupDescription", "Automatically transfer rush cases to this group")}
                </p>
              </div>
              <Switch
                checked={formData.setAsRushGroup}
                onCheckedChange={(checked) => handleInputChange("setAsRushGroup", checked)}
                className="data-[state=checked]:bg-[#1162a8]"
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between">
              <p className="font-medium">{t("caseTracking.activeStatus", "Active Status")}</p>
              <Switch
                checked={formData.activeStatus}
                onCheckedChange={(checked) => handleInputChange("activeStatus", checked)}
                className="data-[state=checked]:bg-[#1162a8]"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            {t("caseTracking.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid}
            className="bg-[#1162a8] hover:bg-[#0f5490]"
          >
            {t("caseTracking.save", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
