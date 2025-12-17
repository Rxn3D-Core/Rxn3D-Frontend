"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface DiscardChangesDialogProps {
  isOpen: boolean
  type:
    | "grade"
    | "group"
    | "impression"
    | "teeth-shade"
    | "gum-shade"
    | "case-pan"
    | "product"
    | "category"
    | "stage"
    | "stage-group"
    | "add-on"
    | "retention"
    | "retention-option"
    | "visibility-group"
    | "tooth-status"
    | "tooth-status-group"
    | "material"
  onDiscard: () => void
  onKeepEditing: () => void
}

export function DiscardChangesDialog({ isOpen, type, onDiscard, onKeepEditing }: DiscardChangesDialogProps) {
  const getTypeText = () => {
    switch (type) {
      case "grade":
        return "Grade"
      case "group":
        return "add-on group"
      case "impression":
        return "Impression"
      case "teeth-shade":
        return "teeth shade"
      case "gum-shade":
        return "gum shade"
      case "case-pan":
        return "case pan"
      case "product":
        return "product"
      case "category":
        return "category"
      case "stage":
        return "stage"
      case "stage-group":
        return "stage group"
      case "add-on":
        return "add-on"
      case "retention":
        return "retention"
      case "retention-option":
        return "retention option"
      case "visibility-group":
        return "visibility group"
      case "tooth-status":
        return "tooth status"
      case "tooth-status-group":
        return "tooth status group"
      case "material":
        return "material"
      default:
        return "item"
    }
  }

  const getButtonText = () => {
    switch (type) {
      case "teeth-shade":
        return "Discard Teeth Shade system"
      case "gum-shade":
        return "Discard Gum Shade system"
      case "grade":
        return "Discard Grade"
      case "group":
        return "Discard Group"
      case "impression":
        return "Discard Impression"
      case "case-pan":
        return "Discard Case Pan"
      case "product":
        return "Discard Product"
      case "category":
        return "Discard Category"
      case "stage":
        return "Discard Stage"
      case "stage-group":
        return "Discard Stage Group"
      case "add-on":
        return "Discard Add-on"
      case "retention":
        return "Discard Retention"
      case "retention-option":
        return "Discard Retention Option"
      case "visibility-group":
        return "Discard Visibility Group"
      case "tooth-status":
        return "Discard Tooth Status"
      case "tooth-status-group":
        return "Discard Tooth Status Group"
      case "material":
        return "Discard Material"
      default:
        return "Discard"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onKeepEditing}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden bg-white rounded-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
        <DialogTitle className="text-xl font-bold">Discard Changes</DialogTitle>
          <button onClick={onKeepEditing} className="text-gray-500 hover:text-gray-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="p-6 flex items-center">
          <div className="bg-yellow-100 p-4 rounded-full mr-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div>
            <p className="text-lg font-medium">You haven't saved this {getTypeText()} yet.</p>
            <p className="text-gray-600">If you close now, your changes will be lost.</p>
            <p className="text-gray-600">Are you sure you want to exit?</p>
          </div>
        </div>

        <div className="px-6 py-4 flex justify-end gap-3 border-t">
          <Button
            variant="outline"
            onClick={onDiscard}
            className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            {getButtonText()}
          </Button>
          <Button onClick={onKeepEditing} className="bg-[#1162a8]">
            Keep Editing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
