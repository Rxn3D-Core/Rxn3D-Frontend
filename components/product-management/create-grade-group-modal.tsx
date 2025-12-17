"use client"

import { useState, useEffect } from "react"
import { X, ChevronDown, Maximize2, Minimize2, Search } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DialogTitle } from "@radix-ui/react-dialog"

interface CreateGradeGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onChanges: (hasChanges: boolean) => void
}

export function CreateGradeGroupModal({ isOpen, onClose, onChanges }: CreateGradeGroupModalProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [groupDetailsEnabled, setGroupDetailsEnabled] = useState(true)
  const [groupName, setGroupName] = useState("")
  const [selectGradesOpen, setSelectGradesOpen] = useState(true)
  const [linkToProductsOpen, setLinkToProductsOpen] = useState(false)
  const [linkToExistingGroupsOpen, setLinkToExistingGroupsOpen] = useState(false)
  const [visibilityManagementOpen, setVisibilityManagementOpen] = useState(false)
  const [linkToAllProducts, setLinkToAllProducts] = useState("no")
  const [searchQuery, setSearchQuery] = useState("")

  // Mock grades
  const mockGrades = [
    { id: 1, name: "Economy", selected: false },
    { id: 2, name: "Standard", selected: true },
    { id: 3, name: "Premium", selected: false },
    { id: 4, name: "Ultra Premium", selected: true },
  ]

  const [grades, setGrades] = useState(mockGrades)

  // Track changes
  useEffect(() => {
    const hasChanges = groupName.trim() !== "" || grades.some((grade) => grade.selected)
    onChanges(hasChanges)
  }, [groupName, grades, onChanges])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setGroupName("")
      setGroupDetailsEnabled(true)
      setSelectGradesOpen(true)
      setLinkToProductsOpen(false)
      setLinkToExistingGroupsOpen(false)
      setVisibilityManagementOpen(false)
      setLinkToAllProducts("no")
      setSearchQuery("")
      setGrades(mockGrades)
    }
  }, [isOpen])

  const toggleGradeSelection = (id: number) => {
    setGrades(grades.map((grade) => (grade.id === id ? { ...grade, selected: !grade.selected } : grade)))
  }

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized)
  }

  // Filter grades based on search query
  const filteredGrades = grades.filter((grade) => grade.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`p-0 gap-0 ${
          isMaximized ? "w-[90vw] h-[90vh] max-w-[90vw]" : "sm:max-w-[600px]"
        } overflow-hidden bg-white rounded-md`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <DialogTitle className="text-xl font-bold">Create new grade group</DialogTitle>
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

          {/* Select Grades Section */}
          <Collapsible open={selectGradesOpen} onOpenChange={setSelectGradesOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full border-t border-b py-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">Select Grades</span>
                <div className="rounded-full bg-gray-200 text-gray-600 w-5 h-5 flex items-center justify-center text-xs">
                  ?
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${selectGradesOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="space-y-4">
                <div className="flex items-center mb-4">
                  <span className="font-medium mr-4">Link to all products</span>
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center">
                      <div
                        className={`w-5 h-5 rounded-full border-2 ${
                          linkToAllProducts === "yes" ? "border-[#1162a8]" : "border-gray-300"
                        } flex items-center justify-center cursor-pointer`}
                        onClick={() => setLinkToAllProducts("yes")}
                      >
                        {linkToAllProducts === "yes" && <div className="w-2.5 h-2.5 rounded-full bg-[#1162a8]"></div>}
                      </div>
                      <span className="ml-2">Yes</span>
                    </div>

                    <div className="flex items-center">
                      <div
                        className={`w-5 h-5 rounded-full border-2 ${
                          linkToAllProducts === "no" ? "border-[#1162a8]" : "border-gray-300"
                        } flex items-center justify-center cursor-pointer`}
                        onClick={() => setLinkToAllProducts("no")}
                      >
                        {linkToAllProducts === "no" && <div className="w-2.5 h-2.5 rounded-full bg-[#1162a8]"></div>}
                      </div>
                      <span className="ml-2">No</span>
                    </div>
                  </div>
                </div>

                <div className="relative mb-4">
                  <Input
                    placeholder="Search sub category / product to link"
                    className="h-10 pr-10"
                    value={searchQuery}
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
                    <div className="font-medium text-sm">Grades</div>
                  </div>

                  {filteredGrades.map((grade) => (
                    <div key={grade.id} className="grid grid-cols-2 py-3 px-4 items-center border-b">
                      <div>
                        <Checkbox
                          id={`grade-${grade.id}`}
                          checked={grade.selected}
                          onCheckedChange={() => toggleGradeSelection(grade.id)}
                          className="border-[#1162a8] text-[#1162a8] data-[state=checked]:bg-[#1162a8] data-[state=checked]:text-white"
                        />
                      </div>
                      <div>{grade.name}</div>
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
