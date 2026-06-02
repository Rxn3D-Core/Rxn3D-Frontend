"use client"

import { useState } from "react"
import { AlertTriangle, ArrowRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type PlanChangeDirection = "upgrade" | "downgrade"

export interface PlanChangeSummary {
  direction: PlanChangeDirection
  currentPlanName: string
  currentPlanPrice: number
  targetPlanName: string
  targetPlanPrice: number
  /** Proration credit for remaining days (upgrade only, negative value = credit) */
  proratedCredit?: number
  /** Date the downgrade takes effect / current plan features continue until */
  effectiveDate?: string
  /** Next billing date label shown after upgrade */
  nextBillingDate?: string
}

interface PlanChangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: PlanChangeSummary
  onConfirm: () => void | Promise<void>
}

function formatMoney(value: number): string {
  return `$${Math.abs(value).toFixed(2)}`
}

export function PlanChangeDialog({ open, onOpenChange, summary, onConfirm }: PlanChangeDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const isUpgrade = summary.direction === "upgrade"

  const chargedToday = isUpgrade
    ? (summary.targetPlanPrice + (summary.proratedCredit ?? 0))
    : 0

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
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {isUpgrade ? "Upgrade to" : "Downgrade to"} {summary.targetPlanName}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Review your plan change details below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Plan transition row */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {summary.currentPlanName}&nbsp;&nbsp;{formatMoney(summary.currentPlanPrice)}/month
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="text-sm font-semibold">
              {summary.targetPlanName}&nbsp;&nbsp;{formatMoney(summary.targetPlanPrice)}/month
            </span>
          </div>

          {/* Line items */}
          <div className="space-y-2 text-sm">
            {isUpgrade ? (
              <>
                {summary.proratedCredit != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Credit for {summary.proratedCredit < 0 ? "remaining days" : "proration"}
                    </span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      −{formatMoney(Math.abs(summary.proratedCredit))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{summary.targetPlanName} plan charge</span>
                  <span className="font-medium">+{formatMoney(summary.targetPlanPrice)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Total charged today</span>
                  <span>{formatMoney(chargedToday)}</span>
                </div>
                {summary.nextBillingDate && (
                  <p className="text-xs text-muted-foreground">
                    New monthly charge starting {summary.nextBillingDate}:{" "}
                    {formatMoney(summary.targetPlanPrice)}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">No charge today</span>
                  <span className="font-medium">$0.00</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>New monthly charge</span>
                  <span>{formatMoney(summary.targetPlanPrice)}</span>
                </div>
              </>
            )}
          </div>

          {/* Notice banner */}
          {!isUpgrade && summary.effectiveDate && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                Your {summary.currentPlanName} plan features continue until {summary.effectiveDate}.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
          <Button
            variant="outline"
            className="sm:w-36"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            className={cn(
              "sm:w-48",
              isUpgrade
                ? "bg-[#1162A8] text-white hover:bg-[#0d5290]"
                : "border border-destructive bg-transparent text-destructive hover:bg-destructive/10",
            )}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading
              ? "Processing..."
              : isUpgrade
              ? `Confirm Upgrade`
              : `Confirm Downgrade`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
