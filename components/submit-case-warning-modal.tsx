"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface SubmitCaseWarningModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirmSubmitAndPrint: () => void
}

export default function SubmitCaseWarningModal({
  isOpen,
  onClose,
  onConfirmSubmitAndPrint,
}: SubmitCaseWarningModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-6 text-center">
        <DialogHeader className="flex flex-col items-center gap-2 mb-4">
          <AlertTriangle className="w-12 h-12 text-yellow-500" />
          <DialogTitle className="text-xl font-bold">Submit case</DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            You haven't submitted this case yet. By clicking submit and print, you confirm all info is correct.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
            Keep editing
          </Button>
          <Button onClick={onConfirmSubmitAndPrint} className="flex-1 bg-blue-600 hover:bg-blue-700">
            Submit and Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
