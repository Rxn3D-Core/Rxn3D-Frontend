"use client"

import { CreditCard, ExternalLink } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

type UpdateBillingInfoDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateStripe?: () => void
  canManageBilling?: boolean
}

export function UpdateBillingInfoDialog({
  open,
  onOpenChange,
  onUpdateStripe,
  canManageBilling = false,
}: UpdateBillingInfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[min(520px,calc(100vw-24px))] max-w-none overflow-hidden rounded-[10px] border-0 bg-white p-0 shadow-2xl">
        <div className="h-[60px] border-b border-[#E4E6EF] bg-[#F9FAFC] px-5 pt-[18px]">
          <h2 className="text-[16px] font-bold leading-[19px] text-black">Update Billing Info</h2>
        </div>

        <div className="px-6 pb-6 pt-5">
          <p className="text-[14px] font-semibold leading-[17px] text-black">Manage your payment methods</p>
          <p className="mt-3 text-[13px] leading-4 text-[#666666]">
            Update your default card, add a new payment method, or manage billing details through Stripe.
          </p>

          <div className="mt-5 rounded-[6px] border border-[#E4E6EF] bg-[#F9FAFB] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#666666]" />
                <span className="text-[13px] font-medium leading-4 text-[#333333]">Visa •••• 4242</span>
              </div>
              <span className="rounded bg-[#E8F3FF] px-2 py-1 text-[11px] font-semibold text-[#1567B8]">DEFAULT</span>
            </div>
            <p className="mt-2 text-[12px] leading-[15px] text-[#666666]">Expires 12/27</p>
          </div>

          <div className="mt-4 rounded-[6px] bg-[#F4F8FF] px-3 py-3 text-[12px] leading-[15px] text-[#4B5563]">
            {canManageBilling
              ? "Changes here will apply to future invoices and subscription renewals."
              : "A Stripe billing management link is not available from the current API response yet."}
          </div>

          <div className="mt-6 flex items-center justify-end gap-5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 w-[120px] rounded-[6px] border border-[#666666] bg-white text-[13px] font-medium leading-4 text-[#333333] transition-colors hover:bg-[#F8FAFC]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onUpdateStripe}
              disabled={!canManageBilling}
              className="inline-flex h-9 w-[180px] items-center justify-center gap-2 rounded-[6px] bg-[#1162A8] text-[13px] font-semibold leading-4 text-white transition-colors hover:bg-[#0E548F] disabled:cursor-not-allowed disabled:bg-[#9BBFE1] disabled:hover:bg-[#9BBFE1]"
            >
              <ExternalLink className="h-4 w-4" />
              Update via Stripe
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
