"use client"

import { useState } from "react"
import { X, ChevronDown, Maximize2, Minimize2, Search, Info } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DiscardChangesDialog } from "./discard-changes-dialog"
import { DialogTitle } from "@radix-ui/react-dialog"

interface Stage {
  id: number
  name: string
  selected: boolean
  defaultCode: string
  days: number
}

interface CreateStageGroupModalProps {
  isOpen: boolean
  onClose: () => void,
  teethShadeBrand?: string
}

export function CreateStageGroupModal({ isOpen, onClose }: CreateStageGroupModalProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [groupDetailsEnabled, setGroupDetailsEnabled] = useState(true)
  const [selectStagesOpen, setSelectStagesOpen] = useState(true)
  const [linkToProductsOpen, setLinkToProductsOpen] = useState(false)
  const [linkToAllProducts, setLinkToAllProducts] = useState("no")
  const [searchQuery, setSearchQuery] = useState("")
  const [hasChanges, setHasChanges] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [selectAll, setSelectAll] = useState(false)

  // Mock stages with additional properties
  const mockStages: Stage[] = [
    { id: 1, name: "Custom tray", selected: false, defaultCode: "CT", days: 5 },
    { id: 2, name: "Bite Block", selected: false, defaultCode: "BB", days: 5 },
    { id: 3, name: "Try in with Teeth", selected: false, defaultCode: "TWT", days: 7 },
    { id: 4, name: "Finish", selected: false, defaultCode: "FN", days: 7 },
    { id: 5, name: "Straight to Finish", selected: false, defaultCode: "SFN", days: 10 },
    { id: 6, name: "Bite block with metal", selected: false, defaultCode: "BBM", days: 10 },
    { id: 7, name: "Digital Design", selected: false, defaultCode: "DD", days: 7 },
    { id: 8, name: "Framework only", selected: false, defaultCode: "FO", days: 10 },
    { id: 9, name: "Border mold", selected: false, defaultCode: "BM", days: 2 },
  ]

  const [stages, setStages] = useState<Stage[]>(mockStages)

  const toggleStageSelection = (id: number) => {
    setStages(stages.map((stage) => (stage.id === id ? { ...stage, selected: !stage.selected } : stage)))
    setHasChanges(true)
  }

  const toggleSelectAll = () => {
    const newSelectAll = !selectAll
    setSelectAll(newSelectAll)
    setStages(stages.map((stage) => ({ ...stage, selected: newSelectAll })))
    setHasChanges(true)
  }

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized)
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
    onClose()
  }

  const handleKeepEditing = () => {
    setShowDiscardDialog(false)
  }

  // Mark changes when user interacts with form
  const handleChange = () => {
    setHasChanges(true)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent
          className={`p-0 gap-0 ${
            isMaximized ? "w-[90vw] h-[90vh] max-w-[90vw]" : "sm:max-w-[600px]"
          } overflow-hidden bg-white rounded-md`}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <DialogTitle className="text-xl font-bold">Create new stage group</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleMaximize} className="h-8 w-8">
                {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[80vh] p-6 space-y-6">
            {/* Group Details Section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">Group Details</span>
                <Info className="h-4 w-4 text-gray-400" />
              </div>
              <Switch
                checked={groupDetailsEnabled}
                onCheckedChange={(checked) => {
                  setGroupDetailsEnabled(checked)
                  handleChange()
                }}
                className="data-[state=checked]:bg-[#1162a8]"
              />
            </div>

            {groupDetailsEnabled && (
              <div className="space-y-4">
                <Input placeholder="Group Name" className="h-12" onChange={handleChange} />
              </div>
            )}

            {/* Select Stages Section */}
            <Collapsible
              open={selectStagesOpen}
              onOpenChange={(open) => {
                setSelectStagesOpen(open)
                if (open) handleChange()
              }}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full py-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Select Stages</span>
                  <Info className="h-4 w-4 text-gray-400" />
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${selectStagesOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-4 border rounded-md p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span>Link to all products</span>
                      <RadioGroup
                        value={linkToAllProducts}
                        onValueChange={(value) => {
                          setLinkToAllProducts(value)
                          handleChange()
                        }}
                        className="flex items-center gap-4"
                      >
                        <div className="flex items-center gap-1.5">
                          <RadioGroupItem value="yes" id="link-yes" className="text-[#1162a8]" />
                          <Label htmlFor="link-yes">Yes</Label>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <RadioGroupItem value="no" id="link-no" className="text-[#1162a8]" />
                          <Label htmlFor="link-no">No</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search sub category / product to link"
                        validationState={searchQuery.trim() ? "valid" : "default"}
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="p-2 text-left">
                            <div className="flex items-center">
                              <Checkbox
                                checked={selectAll}
                                onCheckedChange={toggleSelectAll}
                                className="border-[#1162a8] text-[#1162a8] data-[state=checked]:bg-[#1162a8] data-[state=checked]:text-white"
                              />
                              <span className="ml-2">Select</span>
                            </div>
                          </th>
                          <th className="p-2 text-left">
                            <div className="flex items-center">
                              <span>Stages</span>
                              <ChevronDown className="h-4 w-4 ml-1" />
                            </div>
                          </th>
                          <th className="p-2 text-left">
                            <div className="flex items-center">
                              <span>Default Code</span>
                              <ChevronDown className="h-4 w-4 ml-1" />
                            </div>
                          </th>
                          <th className="p-2 text-left">
                            <div className="flex items-center">
                              <span>Days</span>
                              <ChevronDown className="h-4 w-4 ml-1" />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {stages.map((stage) => (
                          <tr key={stage.id} className="border-b hover:bg-gray-50">
                            <td className="p-2">
                              <Checkbox
                                checked={stage.selected}
                                onCheckedChange={() => toggleStageSelection(stage.id)}
                                className="border-[#1162a8] text-[#1162a8] data-[state=checked]:bg-[#1162a8] data-[state=checked]:text-white"
                              />
                            </td>
                            <td className="p-2">{stage.name}</td>
                            <td className="p-2">{stage.defaultCode}</td>
                            <td className="p-2">{stage.days}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Link to Products Section */}
            <Collapsible
              open={linkToProductsOpen}
              onOpenChange={(open) => {
                setLinkToProductsOpen(open)
                if (open) handleChange()
              }}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full py-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Link to Products</span>
                  <Info className="h-4 w-4 text-gray-400" />
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${linkToProductsOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 border rounded-md">
                  <p className="text-gray-600 mb-4">Select products to link this group to.</p>
                  {/* Product linking content would go here */}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Footer with action buttons */}
          <div className="px-6 py-4 flex justify-end gap-3 border-t">
            <Button variant="destructive" onClick={handleClose} className="bg-red-600 hover:bg-red-700">
              Cancel
            </Button>
            <Button
              className="bg-[#1162a8]"
              onClick={() => {
                setHasChanges(false)
                onClose()
              }}
            >
              Save Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DiscardChangesDialog
        isOpen={showDiscardDialog}
        type="stage-group"
        onDiscard={handleDiscard}
        onKeepEditing={handleKeepEditing}
      />
    </>
  )
}
