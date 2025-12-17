"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface CancelSubmissionWarningModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function CancelSubmissionWarningModal({
  isOpen,
  onClose,
  onConfirm,
}: CancelSubmissionWarningModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-6 rounded-lg shadow-lg">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold text-gray-900">Cancel Case Submission?</DialogTitle>
          <DialogDescription className="text-gray-500 mt-2">
            Are you sure you want to cancel the case submission? All unsaved changes will be lost.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-4 mt-6">
          <Button variant="outline" onClick={onClose} className="px-6 py-2 rounded-lg bg-transparent">
            No, continue editing
          </Button>
          <Button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg">
            Yes, cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
