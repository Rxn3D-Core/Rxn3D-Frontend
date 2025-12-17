"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, X, Info, Search } from "lucide-react"
import { DiscardChangesDialog } from "./discard-changes-dialog"

interface CreateMaterialGroupModalProps {
  isOpen: boolean
  onClose: () => void
}

const mockMaterials = [
  "Cobalt-Chromium (CoCr)",
  "Cold Cure Acrylic",
  "Composite CAD Blocks",
  "Feldspathic Porcelain",
  "GC Gradia / Gradia Plus",
]

export function CreateMaterialGroupModal({ isOpen, onClose }: CreateMaterialGroupModalProps) {
  const [groupName, setGroupName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  const [materialSearch, setMaterialSearch] = useState("")
  const [selectMaterialsOpen, setSelectMaterialsOpen] = useState(false)
  const [linkToProductsOpen, setLinkToProductsOpen] = useState(false)
  const [linkToGroupOpen, setLinkToGroupOpen] = useState(false)
  const [visibilityOpen, setVisibilityOpen] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const handleInputChange = (value: string, setter: (value: string) => void) => {
    setter(value)
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
    setGroupName("")
    setDescription("")
    setSelectedMaterials([])
    setMaterialSearch("")
    setSelectMaterialsOpen(false)
    setLinkToProductsOpen(false)
    setLinkToGroupOpen(false)
    setVisibilityOpen(false)
    setHasChanges(false)
    setShowDiscardDialog(false)
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

  const handleMaterialSelect = (material: string, checked: boolean) => {
    if (checked) {
      setSelectedMaterials([...selectedMaterials, material])
    } else {
      setSelectedMaterials(selectedMaterials.filter((m) => m !== material))
    }
    setHasChanges(true)
  }

  const filteredMaterials = mockMaterials.filter((material) =>
    material.toLowerCase().includes(materialSearch.toLowerCase()),
  )

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden bg-white rounded-md">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <DialogTitle className="text-xl font-bold">Create new Material Group</DialogTitle>
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="px-6 py-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Group Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Group Details</h3>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="groupName" className="text-sm font-medium text-gray-700">
                    Group Name
                  </Label>
                  <Input
                    id="groupName"
                    placeholder="Group Name"
                    value={groupName}
                    onChange={(e) => handleInputChange(e.target.value, setGroupName)}
                    className="mt-1"
                    validationState={groupName.trim() ? "valid" : "default"}
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Description"
                    value={description}
                    onChange={(e) => handleInputChange(e.target.value, setDescription)}
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Select Materials */}
            <Collapsible open={selectMaterialsOpen} onOpenChange={setSelectMaterialsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Select Materials</span>
                  <Info className="w-4 h-4 text-gray-400" />
                </div>
                {selectMaterialsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 p-4 border border-gray-200 rounded-lg space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search materials..."
                    value={materialSearch}
                    onChange={(e) => setMaterialSearch(e.target.value)}
                    className="pl-10"
                    validationState={materialSearch.trim() ? "valid" : "default"}
                  />
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {filteredMaterials.map((material) => (
                    <div key={material} className="flex items-center space-x-2">
                      <Checkbox
                        id={material}
                        checked={selectedMaterials.includes(material)}
                        onCheckedChange={(checked) => handleMaterialSelect(material, checked as boolean)}
                      />
                      <Label htmlFor={material} className="text-sm">
                        {material}
                      </Label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Link to Products */}
            <Collapsible open={linkToProductsOpen} onOpenChange={setLinkToProductsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Link to Products</span>
                  <Info className="w-4 h-4 text-gray-400" />
                </div>
                {linkToProductsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 p-4 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">Product linking options will be displayed here.</p>
              </CollapsibleContent>
            </Collapsible>

            {/* Link to Existing Group */}
            <Collapsible open={linkToGroupOpen} onOpenChange={setLinkToGroupOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Link to Existing Group</span>
                  <Info className="w-4 h-4 text-gray-400" />
                </div>
                {linkToGroupOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 p-4 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">Group linking options will be displayed here.</p>
              </CollapsibleContent>
            </Collapsible>

            {/* Visibility Management */}
            <Collapsible open={visibilityOpen} onOpenChange={setVisibilityOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Visibility Management</span>
                  <Info className="w-4 h-4 text-gray-400" />
                </div>
                {visibilityOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 p-4 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">Visibility management options will be displayed here.</p>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="px-6 py-4 flex justify-end gap-3 border-t">
            <Button
              variant="destructive"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-[#1162a8] hover:bg-[#0d4d87]">
              Save Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DiscardChangesDialog
        isOpen={showDiscardDialog}
        type="group"
        onDiscard={handleDiscard}
        onKeepEditing={handleKeepEditing}
      />
    </>
  )
}
