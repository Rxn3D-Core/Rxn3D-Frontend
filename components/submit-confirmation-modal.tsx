"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface SubmitConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function SubmitConfirmationModal({ isOpen, onClose, onConfirm }: SubmitConfirmationModalProps) {
  const [isChecked, setIsChecked] = useState(false)

  const handleConfirm = () => {
    if (isChecked) {
      onConfirm()
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-6">
        <DialogHeader className="flex flex-col items-center gap-2 mb-4">
          <DialogTitle className="text-xl font-bold sr-only">Confirm Submission</DialogTitle>
          <DialogDescription className="text-sm text-gray-600 text-center">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirm-details"
                checked={isChecked}
                onCheckedChange={(checked) => setIsChecked(!!checked)}
              />
              <Label
                htmlFor="confirm-details"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                You confirm all details are correct by submitting case.
              </Label>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isChecked} className="flex-1 bg-blue-600 hover:bg-blue-700">
            Submit Case
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
