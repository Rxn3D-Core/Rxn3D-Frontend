"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type ReactivateSubscriptionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isProcessing?: boolean
  planName?: string
  monthlyPrice?: number
  cardBrand?: string
  cardLast4?: string
}

export function ReactivateSubscriptionDialog({
  open,
  onOpenChange,
  onConfirm,
  isProcessing = false,
  planName,
  monthlyPrice = 0,
  cardBrand,
  cardLast4,
}: ReactivateSubscriptionDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const loading = isProcessing || isLoading

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
    } finally {
      setIsLoading(false)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Reactivate Subscription
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Resume your {planName} Plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-muted/20 px-4 py-3 space-y-2">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-foreground">
                ${monthlyPrice.toFixed(0)}
              </span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <div className="space-y-0.5 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Charge to
              </p>
              <p className="text-foreground">
                {cardBrand} &bull;&bull;&bull;&bull; {cardLast4}{" "}
                <span className="text-muted-foreground">(default)</span>
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Billing resumes immediately. You will be charged today.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
          <Button
            variant="outline"
            className="sm:w-44"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#1162A8] text-white hover:bg-[#0d5290] sm:w-56"
            onClick={() => void handleConfirm()}
            disabled={loading}
          >
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : "Reactivate Now"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
