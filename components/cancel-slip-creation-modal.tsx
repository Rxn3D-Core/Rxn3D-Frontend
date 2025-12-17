"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogOverlay } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface CancelSlipCreationModalProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function CancelSlipCreationModal({
  open,
  onCancel,
  onConfirm,
}: CancelSlipCreationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogOverlay className="fixed inset-0 z-[100000] bg-black/50 backdrop-blur-sm" />
      <DialogContent className="sm:max-w-[425px] p-6 rounded-lg shadow-lg" style={{ zIndex: 100001 }}>
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold text-gray-900">Cancel Slip Creation?</DialogTitle>
          <DialogDescription className="text-gray-500 mt-2">
            Are you sure you want to cancel creating this slip? All entered information will be lost and you'll be redirected to the dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-4 mt-6">
          <Button variant="outline" onClick={onCancel} className="px-6 py-2 rounded-lg bg-transparent">
            Continue Creating
          </Button>
          <Button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg">
            Yes, Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
