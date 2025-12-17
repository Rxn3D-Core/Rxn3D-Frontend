"use client"

import { useState, useEffect } from "react"
import { X, ChevronDown, Maximize2, Minimize2, Search } from 'lucide-react'
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DialogTitle } from "@radix-ui/react-dialog"

interface CreateImpressionGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onChanges: (hasChanges: boolean) => void
}

export function CreateImpressionGroupModal({ isOpen, onClose, onChanges }: CreateImpressionGroupModalProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [groupDetailsEnabled, setGroupDetailsEnabled] = useState(true)
  const [groupName, setGroupName] = useState("")
  const [selectImpressionOpen, setSelectImpressionOpen] = useState(true)
  const [linkToProductsOpen, setLinkToProductsOpen] = useState(false)
  const [linkToExistingGroupsOpen, setLinkToExistingGroupsOpen] = useState(false)
  const [visibilityManagementOpen, setVisibilityManagementOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Mock impressions
  const mockImpressions = [
    { id: 1, name: "Alginate", selected: false },
    { id: 2, name: "Light body", selected: false },
    { id: 3, name: "PVS", selected: false },
    { id: 4, name: "Heavy body", selected: false },
    { id: 5, name: "STL file", selected: false },
    { id: 6, name: "Itero Portal", selected: false },
    { id: 7, name: "Primescan", selected: false },
    { id: 8, name: "Trios", selected: false },
    { id: 9, name: "Pick up Impression", selected: false },
    { id: 10, name: "Denture Included", selected: false },
  ]

  const [impressions, setImpressions] = useState(mockImpressions)

  // Track changes
  useEffect(() => {
    const hasChanges = groupName.trim() !== "" || impressions.some((impression) => impression.selected)
    onChanges(hasChanges)
  }, [groupName, impressions, onChanges])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setGroupName("")
      setGroupDetailsEnabled(true)
      setSelectImpressionOpen(true)
      setLinkToProductsOpen(false)
      setLinkToExistingGroupsOpen(false)
      setVisibilityManagementOpen(false)
      setSearchQuery("")
      setImpressions(mockImpressions)
    }
  }, [isOpen])

  const toggleImpressionSelection = (id: number) => {
    setImpressions(impressions.map((impression) => (impression.id === id ? { ...impression, selected: !impression.selected } : impression)))
  }

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized)
  }

  // Filter impressions based on search query
  const filteredImpressions = impressions.filter((impression) => impression.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`p-0 gap-0 ${
          isMaximized ? "w-[90vw] h-[90vh] max-w-[90vw]" : "sm:max-w-[600px]"
        } overflow-hidden bg-white rounded-md`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <DialogTitle className="text-xl font-bold">Create new impression group</DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleMaximize} className="h-8 w-8">
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[80vh] p-6 space-y-6">
          {/* Group Details Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">Group Details</span>
              <div className="rounded-full bg-gray-200 text-gray-600 w-5 h-5 flex items-center justify-center text-xs">
                ?
              </div>
            </div>
            <Switch
              checked={groupDetailsEnabled}
              onCheckedChange={setGroupDetailsEnabled}
              className="data-[state=checked]:bg-[#1162a8]"
            />
          </div>

          {groupDetailsEnabled && (
            <div className="space-y-4">
              <Input
                placeholder="Group Name"
                className="h-12"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                validationState={groupName.trim() ? "valid" : "default"}
              />
            </div>
          )}

          {/* Select Impression Section */}
          <Collapsible open={selectImpressionOpen} onOpenChange={setSelectImpressionOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full border-t border-b py-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">Select Impression</span>
                <div className="rounded-full bg-gray-200 text-gray-600 w-5 h-5 flex items-center justify-center text-xs">
                  ?
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${selectImpressionOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="space-y-4">
                <div className="relative mb-4">
                  <Input
                    placeholder="Search impression"
                    className="h-10 pr-10"
                    value={searchQuery}
                    validationState={searchQuery.trim() ? "valid" : "default"}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <div className="border rounded-md overflow-hidden">
                  <div className="grid grid-cols-2 py-3 px-4 border-b bg-gray-50">
                    <div className="flex items-center">
                      <Checkbox
                        id="select-all"
                        className="border-[#1162a8] text-[#1162a8] data-[state=checked]:bg-[#1162a8] data-[state=checked]:text-white mr-2"
                      />
                      <label htmlFor="select-all">Select</label>
                    </div>
                    <div className="font-medium text-sm">Impressions</div>
                  </div>

                  {filteredImpressions.map((impression) => (
                    <div key={impression.id} className="grid grid-cols-2 py-3 px-4 items-center border-b">
                      <div>
                        <Checkbox
                          id={`impression-${impression.id}`}
                          checked={impression.selected}
                          onCheckedChange={() => toggleImpressionSelection(impression.id)}
                          className="border-[#1162a8] text-[#1162a8] data-[state=checked]:bg-[#1162a8] data-[state=checked]:text-white"
                        />
                      </div>
                      <div>{impression.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Link to Products Section */}
          <Collapsible open={linkToProductsOpen} onOpenChange={setLinkToProductsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full border-t border-b py-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">Link to Products</span>
                <div className="rounded-full bg-gray-200 text-gray-600 w-5 h-5 flex items-center justify-center text-xs">
                  ?
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${linkToProductsOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <p className="text-gray-600 mb-4">Select products to link this group to.</p>
              {/* Product linking content would go here */}
            </CollapsibleContent>
          </Collapsible>

          {/* Link to Existing Groups Section */}
          <Collapsible open={linkToExistingGroupsOpen} onOpenChange={setLinkToExistingGroupsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full border-t border-b py-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">Link to Existing Groups</span>
                <div className="rounded-full bg-gray-200 text-gray-600 w-5 h-5 flex items-center justify-center text-xs">
                  ?
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${linkToExistingGroupsOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <p className="text-gray-600 mb-4">Select existing groups to link with.</p>
              {/* Existing groups linking content would go here */}
            </CollapsibleContent>
          </Collapsible>

          {/* Visibility Management Section */}
          <Collapsible open={visibilityManagementOpen} onOpenChange={setVisibilityManagementOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full border-t border-b py-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">Visibility Management</span>
                <div className="rounded-full bg-gray-200 text-gray-600 w-5 h-5 flex items-center justify-center text-xs">
                  ?
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${visibilityManagementOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <p className="text-gray-600 mb-4">Manage which labs can see this group.</p>
              {/* Visibility management content would go here */}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Footer with action buttons */}
        <div className="px-6 py-4 flex justify-end gap-3 border-t">
          <Button variant="destructive" onClick={onClose} className="bg-red-600 hover:bg-red-700">
            Cancel
          </Button>
          <Button className="bg-[#1162a8]">Save Group</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
