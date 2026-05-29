"use client"

import { Loader2 } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

type ReactivateSubscriptionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isProcessing?: boolean
}

export function ReactivateSubscriptionDialog({
  open,
  onOpenChange,
  onConfirm,
  isProcessing = false,
}: ReactivateSubscriptionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[min(1200px,calc(100vw-24px))] max-w-none overflow-hidden rounded-[26px] border-0 bg-white p-0 shadow-2xl sm:w-[min(1200px,calc(100vw-32px))]">
        <div className="border-b border-[#E6EAF2] px-7 py-6 sm:px-12 sm:py-10">
          <h2 className="text-3xl font-bold leading-none text-[#1C64AE] sm:text-[38px]">Reactivate Subscription</h2>
        </div>

        <div className="px-7 pb-8 pt-8 sm:px-14 sm:pb-12 sm:pt-10">
          <h3 className="text-2xl font-bold text-black sm:text-[38px]">Resume your Professional Plan</h3>

          <div className="mt-7 flex items-end gap-1.5">
            <span className="text-[44px] font-bold leading-none text-black sm:text-[58px]">$149</span>
            <span className="pb-1 text-2xl text-[#666666] sm:text-[28px]">/month</span>
          </div>

          <div className="mt-6 border-t border-[#E4E6EF] pt-8">
            <p className="text-xl font-semibold uppercase tracking-[0.04em] text-[#666666] sm:text-[30px]">Charge To</p>
            <p className="mt-4 text-2xl text-[#333333] sm:text-[34px]">Visa •••• 4242 (default)</p>
            <p className="mt-7 text-xl text-[#666666] sm:text-[30px]">
              Billing resumes immediately. You will be charged today.
            </p>
          </div>

          <div className="mt-14 flex flex-col-reverse gap-4 sm:mt-20 sm:flex-row sm:justify-end sm:gap-8">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
              className="w-full rounded-[18px] border-2 border-[#767676] bg-white px-6 py-4 text-lg font-medium text-[#333333] transition-colors hover:bg-gray-50 disabled:opacity-60 sm:min-w-[290px] sm:rounded-[20px] sm:px-10 sm:py-6 sm:text-[28px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isProcessing}
              className="inline-flex w-full items-center justify-center gap-3 rounded-[18px] bg-[#1567B8] px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-[#11569A] disabled:opacity-70 sm:min-w-[430px] sm:rounded-[20px] sm:px-10 sm:py-6 sm:text-[28px]"
            >
              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin sm:h-6 sm:w-6" /> : null}
              Reactivate Now
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
