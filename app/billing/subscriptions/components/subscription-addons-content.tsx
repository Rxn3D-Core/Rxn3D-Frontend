"use client"

import { useState } from "react"
import Link from "next/link"
import { BarChart3, Box, ChevronLeft, FileText, Headphones, TriangleAlert, UserRound } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

type AddOn = {
  id: string
  name: string
  description: string
  price: number
  icon: "box" | "support" | "analytics" | "user" | "invoice"
  active?: boolean
}

const addOns: AddOn[] = [
  {
    id: "extra-cases-500",
    name: "Extra Cases - 500 slips/mo",
    description: "Add 500 additional cases to your monthly limit.",
    price: 25,
    icon: "box",
    active: true,
  },
  {
    id: "extra-cases-1000",
    name: "Extra Cases - 1,000 slips/mo",
    description: "Add 1,000 additional cases to your monthly limit.",
    price: 45,
    icon: "box",
  },
  {
    id: "priority-support",
    name: "Priority Support",
    description: "24/7 dedicated support with 2-hour response SLA.",
    price: 49,
    icon: "support",
  },
  {
    id: "advanced-analytics",
    name: "Advanced Analytics",
    description: "Production trends, revenue forecasting, custom reports.",
    price: 39,
    icon: "analytics",
  },
  {
    id: "additional-admin-seat",
    name: "Additional Admin Seat",
    description: "Add an extra admin seat to manage your lab account.",
    price: 19,
    icon: "user",
  },
  {
    id: "white-label-invoices",
    name: "White-label Invoices",
    description: "Remove RXn3D branding from patient-facing invoices.",
    price: 15,
    icon: "invoice",
  },
]

function AddOnIcon({ icon }: { icon: AddOn["icon"] }) {
  if (icon === "support") return <Headphones className="h-6 w-6 text-[#B8BBC1]" />
  if (icon === "analytics") return <BarChart3 className="h-6 w-6 text-[#1F69B3]" />
  if (icon === "user") return <UserRound className="h-6 w-6 text-[#7C8798]" />
  if (icon === "invoice") return <FileText className="h-6 w-6 text-[#F0B867]" />
  return <Box className="h-6 w-6 text-[#A86C31]" />
}

function currency(value: number) {
  return `$${value.toFixed(0)}`
}

export function SubscriptionAddOnsContent() {
  const [selectedAddOn, setSelectedAddOn] = useState<AddOn | null>(null)
  const [removeAddOn, setRemoveAddOn] = useState<AddOn | null>(null)

  return (
    <div className="w-full px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-7 flex items-start justify-between gap-6">
        <div>
          <Link
            href="/billing/subscriptions"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-[#2871BC] transition-colors hover:text-[#185996]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Subscription
          </Link>
          <h1 className="text-[42px] font-bold tracking-[-0.03em] text-black">Add-ons & Extras</h1>
        </div>
      </div>

      <div className="border-t border-[#E8EBF1] pt-6">
        <p className="mb-4 text-[15px] text-[#767C83]">
          Expand your plan with on-demand monthly add-ons. Billed monthly, cancel anytime.
        </p>

        <p className="mb-4 text-[14px] font-semibold uppercase tracking-[0.12em] text-[#6D7278]">Active Add-ons</p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {addOns.map((addOn) => {
            const isActive = addOn.active

            return (
              <div
                key={addOn.id}
                className={`rounded-xl border bg-white p-4 shadow-sm ${
                  isActive ? "border-[#2FBA63] shadow-[inset_0_0_0_1px_#2FBA63]" : "border-[#DCE2EE]"
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AddOnIcon icon={addOn.icon} />
                    <div>
                      <h2 className="text-[16px] font-semibold text-[#222]">{addOn.name}</h2>
                    </div>
                  </div>
                  {isActive ? (
                    <span className="inline-flex items-center rounded-md bg-[#E4F9EA] px-3 py-1 text-[12px] font-semibold text-[#1DAA4C]">
                      <span className="mr-1.5 h-2.5 w-2.5 rounded-full bg-[#27BA58]" />
                      ACTIVE
                    </span>
                  ) : null}
                </div>

                <p className="min-h-[48px] text-[14px] leading-6 text-[#757A80]">{addOn.description}</p>

                <div className="mt-12 flex items-end justify-between gap-4">
                  <div className="text-[#111]">
                    <span className="text-[22px] font-bold">{currency(addOn.price)}</span>
                    <span className="ml-1 text-[14px] text-[#7A8087]">/month</span>
                  </div>
                  {isActive ? (
                    <button
                      type="button"
                      onClick={() => setRemoveAddOn(addOn)}
                      className="min-w-[112px] rounded-[10px] border border-[#FF8F8F] px-5 py-2.5 text-[14px] font-semibold text-[#FF3B30] transition-colors hover:bg-[#FFF5F5]"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedAddOn(addOn)}
                      className="min-w-[112px] rounded-[10px] bg-[#1567B8] px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#11569A]"
                    >
                      + Add
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Dialog open={!!selectedAddOn} onOpenChange={(open) => !open && setSelectedAddOn(null)}>
        <DialogContent showCloseButton={false} className="w-[min(480px,calc(100vw-24px))] max-w-none overflow-hidden rounded-[10px] border-0 bg-white p-0 shadow-2xl">
          {selectedAddOn ? (
            <div>
              <div className="border-b border-[#E4E6EF] bg-[#F9FAFB] px-6 pb-[11px] pt-[10px]">
                <h2 className="text-[16px] font-bold leading-[19px] text-black">+ Add {selectedAddOn.name}</h2>
                <p className="mt-[5px] text-[12px] leading-[15px] text-[#666666]">This add-on will be added to your monthly subscription.</p>
              </div>

              <div className="px-6 pb-5 pt-4">
                <div className="rounded-[6px] border border-[#E4E6EF] bg-[#F9FAFB] px-3 pb-[9px] pt-2">
                  <div className="text-[13px] leading-4 text-[#666666]">
                    {selectedAddOn.name}
                    <span className="mx-1.5">·</span>
                    Flat monthly add-on
                  </div>
                  <div className="mt-2 text-[16px] font-bold leading-[19px] text-black">
                    ${selectedAddOn.price.toFixed(2)}/month
                  </div>
                </div>

                <div className="mt-4 border-b border-[#E4E6EF] pb-1">
                  <div className="flex items-center justify-between gap-4 text-[13px] leading-4 text-[#666666]">
                    <span>Prorated charge (12 days remaining)</span>
                    <span className="text-black">$9.68</span>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-4 text-[13px] leading-4">
                  <span className="font-semibold text-[#666666]">New monthly total (from Sep 1)</span>
                  <span className="font-bold text-black">$124.00</span>
                </div>

                <div className="mt-[76px] flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedAddOn(null)}
                    className="h-9 w-[120px] rounded-[6px] border border-[#E4E6EF] bg-white text-[13px] font-medium leading-4 text-[#666666] transition-colors hover:bg-[#F8FAFC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAddOn(null)}
                    className="h-9 w-[180px] rounded-[6px] bg-[#1162A8] text-[13px] font-semibold leading-4 text-white transition-colors hover:bg-[#0E548F]"
                  >
                    Confirm & Add
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeAddOn} onOpenChange={(open) => !open && setRemoveAddOn(null)}>
        <DialogContent showCloseButton={false} className="w-[min(480px,calc(100vw-24px))] max-w-none overflow-hidden rounded-[10px] border-0 bg-white p-0 shadow-2xl">
          {removeAddOn ? (
            <div>
              <div className="h-[60px] border-b border-[#E4E6EF] bg-[#F9FAFC] px-5 pt-[18px]">
                <h2 className="text-[16px] font-bold leading-[19px] text-[#DC2626]">Remove Add-on</h2>
              </div>

              <div className="px-6 pb-5 pt-5">
                <h3 className="text-[16px] font-bold leading-[19px] text-black">{removeAddOn.name}</h3>
                <p className="mt-[15px] max-w-[432px] text-[13px] leading-4 text-[#333333]">
                  This add-on will be removed at the end of your current billing period.
                </p>
                <p className="mt-3 text-[13px] leading-4 text-[#333333]">You will retain access until: May 31, 2026</p>

                <div className="mt-4 flex h-9 items-center gap-2 rounded-[6px] bg-[#FFEDED] px-3 text-[12px] font-semibold leading-[15px] text-[#DC2626]">
                  <TriangleAlert className="h-4 w-4 shrink-0 fill-current stroke-white" />
                  This action cannot be undone.
                </div>

                <div className="mt-7 flex items-center justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setRemoveAddOn(null)}
                    className="h-9 w-[140px] rounded-[6px] border border-[#666666] bg-white text-[13px] font-medium leading-4 text-[#333333] transition-colors hover:bg-[#F8FAFC]"
                  >
                    Keep Add-on
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoveAddOn(null)}
                    className="h-9 w-[168px] rounded-[6px] bg-[#DC2626] text-[13px] font-semibold leading-4 text-white transition-colors hover:bg-[#BE1F1F]"
                  >
                    Remove Add-on
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
