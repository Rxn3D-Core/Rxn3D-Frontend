"use client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CreditCard, AlertTriangle } from "lucide-react"

interface InsufficientCreditsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requiredCredits: number
  currentBalance: number
  onPurchaseClick: () => void
}

export function InsufficientCreditsDialog({
  open,
  onOpenChange,
  requiredCredits,
  currentBalance,
  onPurchaseClick,
}: InsufficientCreditsDialogProps) {
  const creditShortage = requiredCredits - currentBalance

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 mb-4">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          </div>
          <DialogTitle className="text-center text-xl">Insufficient Credits</DialogTitle>
          <DialogDescription className="text-center">
            You don't have enough Slip Credits to complete this action.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-md bg-gray-50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Required Credits:</span>
              <span className="font-medium">{requiredCredits}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-500">Your Balance:</span>
              <span className="font-medium">{currentBalance}</span>
            </div>
            <div className="flex justify-between text-sm mt-2 border-t pt-2">
              <span className="text-gray-500">Shortage:</span>
              <span className="font-medium text-red-600">{creditShortage}</span>
            </div>
          </div>

          <div className="text-sm text-center text-muted-foreground">
            Purchase more credits to continue with your action.
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="sm:flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false)
              onPurchaseClick()
            }}
            className="sm:flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Purchase Credits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
