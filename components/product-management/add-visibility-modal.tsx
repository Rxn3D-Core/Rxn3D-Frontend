"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Search, ChevronDown, ChevronUp, X } from "lucide-react"
import { DiscardChangesDialog } from "./discard-changes-dialog"

interface Office {
  id: string
  name: string
  visible: boolean
}

interface AddVisibilityModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddVisibilityModal({ isOpen, onClose }: AddVisibilityModalProps) {
  const [itemName, setItemName] = useState("Sleep Apnea Device")
  const [itemType, setItemType] = useState("Product")
  const [visibilityType, setVisibilityType] = useState("no")
  const [searchTerm, setSearchTerm] = useState("")
  const [isVisibilityExpanded, setIsVisibilityExpanded] = useState(true)
  const [isLinkGroupExpanded, setIsLinkGroupExpanded] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)

  const [offices, setOffices] = useState<Office[]>([
    { id: "1", name: "Paradise Smile Dental", visible: true },
    { id: "2", name: "Highland Dental Smile", visible: true },
    { id: "3", name: "Evergreen Dental", visible: true },
    { id: "4", name: "Greater Las Vegas Dental", visible: true },
    { id: "5", name: "Rampart Dental group", visible: true },
    { id: "6", name: "Durango smiles", visible: true },
    { id: "7", name: "Flamingo smiles", visible: true },
    { id: "8", name: "Best Dental Office", visible: true },
  ])

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setItemName("Sleep Apnea Device")
      setItemType("Product")
      setVisibilityType("no")
      setSearchTerm("")
      setIsVisibilityExpanded(true)
      setIsLinkGroupExpanded(false)
      setHasChanges(false)
    }
  }, [isOpen])

  const filteredOffices = offices.filter((office) => office.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const handleVisibilityTypeChange = (value: string) => {
    setVisibilityType(value)
    setHasChanges(true)
  }

  const handleOfficeToggle = (officeId: string, visible: boolean) => {
    setOffices((prev) => prev.map((office) => (office.id === officeId ? { ...office, visible } : office)))
    setHasChanges(true)
  }

  const handleShowAllOffices = () => {
    setOffices((prev) => prev.map((office) => ({ ...office, visible: true })))
    setHasChanges(true)
  }

  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardDialog(true)
    } else {
      onClose()
    }
  }

  const handleDiscard = () => {
    setShowDiscardDialog(false)
    setHasChanges(false)
    onClose()
  }

  const handleKeepEditing = () => {
    setShowDiscardDialog(false)
  }

  const handleSave = () => {
    // Handle save logic here
    setHasChanges(false)
    onClose()
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="p-0 gap-0 sm:max-w-[600px] overflow-hidden bg-white rounded-md">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <DialogTitle className="text-xl font-bold">Visibility Management</DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
                <X className="h-5 w-5" />
            </Button>
            </div>

          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Item Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-gray-900">Item:</span>
                <span className="text-lg text-gray-600">{itemName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-gray-900">Type:</span>
                <span className="text-lg text-gray-600">{itemType}</span>
              </div>
            </div>

            {/* Visibility Management Section */}
            <div className="space-y-4">
              <button
                onClick={() => setIsVisibilityExpanded(!isVisibilityExpanded)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">Visibility Management</span>
                  <div className="w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center">
                    <span className="text-white text-xs">?</span>
                  </div>
                </div>
                {isVisibilityExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {isVisibilityExpanded && (
                <div className="space-y-4 pl-4">
                  <RadioGroup value={visibilityType} onValueChange={handleVisibilityTypeChange} className="flex gap-6">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="all" />
                      <Label htmlFor="all" className="text-sm">
                        Show to all offices
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="yes" />
                      <Label htmlFor="yes" className="text-sm">
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="no" />
                      <Label htmlFor="no" className="text-sm">
                        No
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="hide" id="hide" />
                      <Label htmlFor="hide" className="text-sm">
                        Hide to all
                      </Label>
                    </div>
                  </RadioGroup>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search office to remove visibility"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-10"
                      validationState={searchTerm.trim() ? "valid" : "default"}
                    />
                  </div>

                  <div className="flex justify-end">
                    <button onClick={handleShowAllOffices} className="text-sm text-[#1162a8] hover:underline">
                      Show all offices
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-medium text-gray-700 pb-2 border-b">
                      <span>Office</span>
                      <span>Visibility</span>
                    </div>

                    <div className="space-y-1">
                      {filteredOffices.map((office) => (
                        <div key={office.id} className="flex items-center justify-between py-2">
                          <span className="text-sm text-gray-900">{office.name}</span>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={office.visible}
                              onCheckedChange={(checked) => handleOfficeToggle(office.id, checked)}
                              className="data-[state=checked]:bg-blue-500"
                            />
                            <button className="text-gray-400 hover:text-gray-600">
                              <span className="w-4 h-4 block text-sm">⋮</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Link to Existing Group Section */}
            <div className="space-y-4">
              <button
                onClick={() => setIsLinkGroupExpanded(!isLinkGroupExpanded)}
                className="flex items-center justify-between w-full text-left border-none p-0"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">Link to Existing Group</span>
                  <div className="w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center">
                    <span className="text-white text-xs">?</span>
                  </div>
                </div>
                {isLinkGroupExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          <div className="px-6 py-4 flex justify-end gap-3 border-t bg-gray-50">
            <Button
              onClick={handleClose}
              variant="destructive"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-[#1162a8] hover:bg-[#0f5597] px-6 py-2">
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DiscardChangesDialog
        isOpen={showDiscardDialog}
        type="visibility"
        onDiscard={handleDiscard}
        onKeepEditing={handleKeepEditing}
      />
    </>
  )
}
