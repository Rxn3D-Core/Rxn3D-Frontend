"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

type BillingPeriodOption = "monthly" | "annual"

type BillingPeriodDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const monthlyPlan = {
  label: "Monthly",
  displayPrice: "$99.00/month",
  subtitle: "Billed monthly on the 25th",
}

const annualPlan = {
  label: "Annual",
  displayPrice: "$990.00/year",
  monthlyEquivalent: "$82.50/month",
  subtitle: "Billed once annually",
}

function OptionCard({
  selected,
  title,
  primary,
  secondary,
  badge,
  current,
  onClick,
}: {
  selected: boolean
  title: string
  primary: string
  secondary: string
  badge?: string
  current?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[8px] border text-left transition-colors ${
        selected ? "border-2 border-[#1162A8] bg-[#EDF4FC]" : "border border-[#E4E6EF] bg-white hover:border-[#A8B7CF]"
      }`}
    >
      <div className="flex min-h-[80px] items-start gap-[10px] px-4 py-4">
        <div
          className={`mt-[15px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${
            selected ? "bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)]" : "border-2 border-[#B3B3B3] bg-white"
          }`}
        >
          {selected && <div className="h-[8px] w-[8px] rounded-full bg-white" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-semibold leading-[18px] text-black">{title}</h3>
            {badge ? (
              <span
                className={`inline-flex h-5 items-center rounded-[4px] px-[10px] text-[10px] font-semibold leading-3 ${
                  current ? "bg-[#E1F8EB] text-[#16A34A]" : "bg-[#FFF3E1] text-[#FF9900]"
                }`}
              >
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-[10px] text-[13px] leading-4 text-[#666666]">
            {primary}
            <span className="mx-2">·</span>
            {secondary}
          </p>
        </div>
      </div>
    </button>
  )
}

export function BillingPeriodDialog({ open, onOpenChange }: BillingPeriodDialogProps) {
  const [step, setStep] = useState<"select" | "confirm">("select")
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriodOption>("monthly")

  const effectiveDate = "Aug 25, 2025"
  const annualSavings = "$198.00/year"

  const confirmDisabled = selectedPeriod === "monthly"

  const nextButtonLabel = useMemo(() => {
    if (selectedPeriod === "annual") return "Switch to Annual"
    return "Stay on Monthly"
  }, [selectedPeriod])

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStep("select")
      setSelectedPeriod("monthly")
    }
    onOpenChange(nextOpen)
  }

  const handleContinue = () => {
    if (selectedPeriod === "annual") {
      setStep("confirm")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent showCloseButton={false} className="w-[min(520px,calc(100vw-24px))] max-w-none overflow-hidden rounded-[10px] border-0 bg-white p-0 shadow-2xl">
        {step === "select" ? (
          <div>
            <div className="border-b border-[#E4E6EF] bg-[#F9FAFB] px-6 pb-[11px] pt-[10px]">
              <h2 className="text-[16px] font-bold leading-[19px] text-black">Edit Billing Period</h2>
              <p className="mt-[5px] text-[12px] leading-[15px] text-[#666666]">Switch between monthly and annual billing.</p>
            </div>

            <div className="px-6 pb-5 pt-4">
              <div className="space-y-5">
                <OptionCard
                  selected={selectedPeriod === "monthly"}
                  title={monthlyPlan.label}
                  primary={monthlyPlan.displayPrice}
                  secondary={monthlyPlan.subtitle}
                  badge="CURRENT"
                  current
                  onClick={() => setSelectedPeriod("monthly")}
                />

                <OptionCard
                  selected={selectedPeriod === "annual"}
                  title={annualPlan.label}
                  primary={annualPlan.displayPrice}
                  secondary={`${annualPlan.monthlyEquivalent} · ${annualPlan.subtitle}`}
                  badge="SAVE 17%"
                  onClick={() => setSelectedPeriod("annual")}
                />
              </div>

              <p className="mt-4 text-[12px] leading-[15px] text-[#666666]">
                Switching to annual takes effect at your next billing cycle ({effectiveDate}).
              </p>

              <div className="mt-9 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="h-9 w-[120px] rounded-[6px] border border-[#E4E6EF] bg-white text-[13px] font-medium leading-4 text-[#666666] transition-colors hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={confirmDisabled}
                  onClick={handleContinue}
                  className="h-9 w-[180px] rounded-[6px] bg-[#1162A8] text-[13px] font-semibold leading-4 text-white transition-colors hover:bg-[#11569A] disabled:cursor-not-allowed disabled:bg-[#9ABEE2]"
                >
                  {nextButtonLabel}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="border-b border-[#E6EAF2] px-6 py-5 sm:px-8 sm:py-7">
              <h2 className="text-[16px] font-bold leading-[19px] text-black sm:text-[18px]">Switch to Annual Billing</h2>
              <p className="mt-3 text-[13px] leading-4 text-[#666666] sm:text-[14px]">Confirm your billing period change.</p>
            </div>

            <div className="px-6 py-5 sm:px-8 sm:py-7">
              <div className="rounded-[10px] border border-[#DCE2EE] px-5 py-5">
                <div className="flex flex-col gap-2 text-[13px] leading-4 text-[#666666] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <span>Monthly $99/month</span>
                  <span className="text-[#1567B8]">→</span>
                  <span className="font-semibold text-black">Annual $990/year</span>
                </div>
              </div>

              <div className="mt-5 border-b border-[#E6EAF2] pb-3">
                <div className="flex items-center justify-between gap-4 text-[13px] leading-4 text-[#666666]">
                  <span>Effective date</span>
                  <span className="text-black">{effectiveDate}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-4 text-[13px] leading-4">
                <span className="font-semibold text-[#6A6F76]">Annual charge on Aug 25</span>
                <span className="text-[16px] font-bold leading-[19px] text-black">$990.00</span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4 text-[13px] leading-4">
                <span className="text-[#6A6F76]">You save vs. monthly</span>
                <span className="text-[16px] leading-[19px] text-[#18A34A]">{annualSavings}</span>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setStep("select")}
                  className="h-9 w-[140px] rounded-[6px] border border-[#DCE2EE] bg-white text-[13px] font-medium leading-4 text-[#4B5563] transition-colors hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="h-9 w-[196px] rounded-[6px] bg-[#1567B8] text-[13px] font-semibold leading-4 text-white transition-colors hover:bg-[#11569A]"
                >
                  Confirm Switch
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
