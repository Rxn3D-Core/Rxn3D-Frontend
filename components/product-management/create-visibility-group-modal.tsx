"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { ChevronDown, ChevronUp, X, Maximize2, Minimize2 } from "lucide-react"
import { DiscardChangesDialog } from "./discard-changes-dialog"

interface CreateVisibilityGroupModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateVisibilityGroupModal({ isOpen, onClose }: CreateVisibilityGroupModalProps) {
  const [groupName, setGroupName] = useState("")
  const [isDetailsEnabled, setIsDetailsEnabled] = useState(true)
  const [isLinkItemsExpanded, setIsLinkItemsExpanded] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setGroupName("")
      setIsDetailsEnabled(true)
      setIsLinkItemsExpanded(false)
      setHasChanges(false)
      setIsMaximized(false)
    }
  }, [isOpen])

  const handleGroupNameChange = (value: string) => {
    setGroupName(value)
    setHasChanges(true)
  }

  const handleDetailsToggle = (enabled: boolean) => {
    setIsDetailsEnabled(enabled)
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

  const canSave = groupName.trim().length > 0

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent
          className={`p-0 gap-0 overflow-hidden bg-white transition-all duration-200 ${
            isMaximized
              ? "w-screen h-screen max-w-none max-h-none m-0 rounded-none fixed inset-0"
              : "w-[500px] max-h-[90vh] rounded-lg fixed right-4 top-4 bottom-4 translate-x-0 translate-y-0"
          }`}
          style={
            isMaximized
              ? { transform: "none" }
              : {
                  transform: "none",
                  right: "1rem",
                  top: "1rem",
                  bottom: "1rem",
                  left: "auto",
                  width: "500px",
                }
          }
        >
          <DialogHeader className="px-6 py-4 border-b flex items-center justify-between">
            <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-xl font-bold">Create new visibility group </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsMaximized(!isMaximized)} className="text-gray-500 hover:text-gray-700">
                {isMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
            
            
          </DialogHeader>

          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* Group Details Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">Group Details</span>
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-xs">?</span>
                  </div>
                </div>
                <Switch
                  checked={isDetailsEnabled}
                  onCheckedChange={handleDetailsToggle}
                  className="data-[state=checked]:bg-blue-500"
                />
              </div>

              {isDetailsEnabled && (
                <div className="space-y-4">
                  <Input
                    placeholder="Group Name"
                    value={groupName}
                    onChange={(e) => handleGroupNameChange(e.target.value)}
                    className="w-full h-12 text-base"
                  />
                </div>
              )}
            </div>

            {/* Link Items Section */}
            <div className="space-y-4">
              <button
                onClick={() => setIsLinkItemsExpanded(!isLinkItemsExpanded)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">Link Items</span>
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-xs">?</span>
                  </div>
                </div>
                {isLinkItemsExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {isLinkItemsExpanded && (
                <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">Select items to include in this visibility group.</p>
                  {/* Add item selection interface here */}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 flex justify-end gap-3 border-t bg-gray-50">
            <Button
              variant="destructive"
              onClick={handleClose}
              className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 px-6 py-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!canSave}
              className="bg-[#1162a8] hover:bg-[#0f5597] disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2"
            >
              Save Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DiscardChangesDialog
        isOpen={showDiscardDialog}
        type="visibility-group"
        onDiscard={handleDiscard}
        onKeepEditing={handleKeepEditing}
      />
    </>
  )
}
