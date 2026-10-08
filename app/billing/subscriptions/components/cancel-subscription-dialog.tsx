"use client"

import { Loader2, TriangleAlert } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

type CancelSubscriptionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void> | void
  isProcessing?: boolean
  planName?: string
  periodEnd?: string
}

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  onConfirm,
  isProcessing = false,
  planName = "current",
  periodEnd,
}: CancelSubscriptionDialogProps) {
  const cancellationImpacts = [
    `Your ${planName} plan stays active until ${periodEnd || "the end of the current billing period"}`,
    "Lab members lose access when the current period ends",
    "Active add-ons will be cancelled",
    "Your data will be retained for 30 days after cancellation",
  ]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[min(520px,calc(100vw-24px))] max-w-none overflow-hidden rounded-[10px] border-0 bg-white p-0 shadow-2xl">
        <div className="h-[60px] border-b border-[#E4E6EF] bg-[#F9FAFC] px-5 pt-[18px]">
          <h2 className="text-[16px] font-bold leading-[19px] text-[#DC2626]">Cancel Subscription</h2>
        </div>

        <div className="px-6 pb-6 pt-5">
          <h3 className="text-[14px] font-semibold leading-[17px] text-black">
            Are you sure you want to cancel your subscription?
          </h3>

          <p className="mt-[15px] text-[13px] leading-4 text-[#666666]">
            The following will happen when you cancel:
          </p>

          <ul className="mt-3 space-y-2">
            {cancellationImpacts.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[13px] leading-4 text-[#333333]">
                <span className="mt-0.5 text-[14px] leading-none text-[#333333]">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex h-11 items-center gap-2 rounded-[6px] bg-[#FFEDED] px-3 text-[13px] font-semibold leading-4 text-[#DC2626]">
            <TriangleAlert className="h-4 w-4 shrink-0 fill-current stroke-white" />
            This action cannot be undone once confirmed.
          </div>

          <div className="mt-16 flex items-center justify-end gap-5">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onOpenChange(false)}
              className="h-9 w-[140px] rounded-[6px] border border-[#666666] bg-white text-[13px] font-medium leading-4 text-[#333333] transition-colors hover:bg-[#F8FAFC] disabled:opacity-60"
            >
              Keep Plan
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => void onConfirm()}
              className="inline-flex h-9 w-[196px] items-center justify-center gap-2 rounded-[6px] bg-[#DC2626] text-[13px] font-semibold leading-4 text-white transition-colors hover:bg-[#C71D19] disabled:opacity-70"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Cancel Subscription
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
