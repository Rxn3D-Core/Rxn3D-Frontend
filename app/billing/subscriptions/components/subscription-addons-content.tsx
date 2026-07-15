"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { BarChart3, Box, ChevronLeft, Database, FileText, Headphones, Loader2, TriangleAlert, UserRound } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useAuth } from "@/contexts/auth-context"
import {
  createAddOnCheckoutSession,
  deleteCustomerAddOn,
  listBillingCatalogAddOns,
  listCustomerAddOns,
  type CatalogAddOn,
  type CustomerAddOn,
} from "@/lib/api/billing-subscription"
import {
  cancelCustomerStorageTier,
  createStorageTierCheckoutSession,
  getCustomerStorageTier,
  listBillingCatalogStorageTiers,
  type CatalogStorageTier,
  type CustomerStorageTierRecord,
} from "@/lib/api/customer-storage-tier"

type AddOn = {
  key: string
  id: number
  customerAddOnId: number | null
  name: string
  description: string
  price: number
  icon: "box" | "support" | "analytics" | "user" | "invoice" | "storage"
  active: boolean
}

function AddOnIcon({ icon }: { icon: AddOn["icon"] }) {
  if (icon === "support") return <Headphones className="h-6 w-6 text-[#B8BBC1]" />
  if (icon === "analytics") return <BarChart3 className="h-6 w-6 text-[#1F69B3]" />
  if (icon === "user") return <UserRound className="h-6 w-6 text-[#7C8798]" />
  if (icon === "invoice") return <FileText className="h-6 w-6 text-[#F0B867]" />
  if (icon === "storage") return <Database className="h-6 w-6 text-[#2E9E6C]" />
  return <Box className="h-6 w-6 text-[#A86C31]" />
}

function formatStorageGb(value: number | string) {
  const gb = Number(value)
  if (!Number.isFinite(gb)) return String(value)
  return gb >= 1000 ? `${(gb / 1000).toFixed(gb % 1000 === 0 ? 0 : 1)} TB` : `${gb} GB`
}

function currency(value: number) {
  return `$${value.toFixed(0)}`
}

function normalizeName(name: string) {
  return name.trim().toLowerCase()
}

function getAddOnIcon(name: string, description?: string): AddOn["icon"] {
  const text = `${name} ${description || ""}`.toLowerCase()
  if (text.includes("support")) return "support"
  if (text.includes("analytic") || text.includes("report")) return "analytics"
  if (text.includes("admin") || text.includes("seat") || text.includes("user")) return "user"
  if (text.includes("invoice") || text.includes("branding") || text.includes("white-label")) return "invoice"
  return "box"
}

function getAddOnDescription(addOn: CatalogAddOn) {
  if (addOn.description?.trim()) return addOn.description

  const name = normalizeName(addOn.name)
  if (name.includes("500 slips")) return "Add 500 additional cases to your monthly limit."
  if (name.includes("1000 slips") || name.includes("1,000 slips")) {
    return "Add 1,000 additional cases to your monthly limit."
  }
  if (name.includes("support")) return "24/7 dedicated support with 2-hour response SLA."
  if (name.includes("analytic")) return "Production trends, revenue forecasting, custom reports."
  if (name.includes("admin") || name.includes("seat")) return "Add an extra admin seat to manage your lab account."
  if (name.includes("invoice") || name.includes("white-label")) {
    return "Remove RXn3D branding from patient-facing invoices."
  }

  return "Available monthly add-on for your subscription."
}

export function SubscriptionAddOnsContent() {
  const { user } = useAuth()
  const [selectedAddOn, setSelectedAddOn] = useState<AddOn | null>(null)
  const [removeAddOn, setRemoveAddOn] = useState<AddOn | null>(null)
  const [catalogAddOns, setCatalogAddOns] = useState<CatalogAddOn[]>([])
  const [customerAddOns, setCustomerAddOns] = useState<CustomerAddOn[]>([])
  const [resolvedCustomerId, setResolvedCustomerId] = useState<number | null>(null)
  const [isProcessingAddOn, setIsProcessingAddOn] = useState(false)
  const [addOnError, setAddOnError] = useState<string | null>(null)
  const [isRemovingAddOn, setIsRemovingAddOn] = useState(false)
  const [removeAddOnError, setRemoveAddOnError] = useState<string | null>(null)

  const [storageTiers, setStorageTiers] = useState<CatalogStorageTier[]>([])
  const [customerStorageTier, setCustomerStorageTier] = useState<CustomerStorageTierRecord | null>(null)
  const [selectedStorageTier, setSelectedStorageTier] = useState<AddOn | null>(null)
  const [removeStorageTier, setRemoveStorageTier] = useState<AddOn | null>(null)
  const [isProcessingStorageTier, setIsProcessingStorageTier] = useState(false)
  const [storageTierError, setStorageTierError] = useState<string | null>(null)
  const [isRemovingStorageTier, setIsRemovingStorageTier] = useState(false)
  const [removeStorageTierError, setRemoveStorageTierError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const storedCustomerId = localStorage.getItem("customerId")
    const customerId = storedCustomerId
      ? parseInt(storedCustomerId, 10)
      : user?.customers?.[0]?.id ?? user?.customer_id ?? null

    setResolvedCustomerId(customerId)

    if (!customerId) return

    let cancelled = false

    const loadAddOnData = async () => {
      try {
        const [catalog, customerAddOns, tiers, currentStorageTier] = await Promise.all([
          listBillingCatalogAddOns(customerId),
          listCustomerAddOns(customerId),
          listBillingCatalogStorageTiers(customerId),
          getCustomerStorageTier(customerId),
        ])

        if (cancelled) return

        setCatalogAddOns(catalog)
        setCustomerAddOns(customerAddOns)
        setStorageTiers(tiers)
        setCustomerStorageTier(currentStorageTier)
      } catch (error) {
        console.error("Failed to load add-on data:", error)
      }
    }

    void loadAddOnData()

    return () => {
      cancelled = true
    }
  }, [user])

  const addOns = useMemo(() => {
    const activeStatuses = new Set(["active", "trialing"])
    const activeCustomerAddOns = customerAddOns.filter((item) =>
      activeStatuses.has((item.status || "").toLowerCase())
    )
    const activeAddOnIdToCustomerAddOnId = new Map(
      activeCustomerAddOns.map((item) => [item.billing_add_on_id, item.id])
    )
    const activeAddOnIds = new Set(activeCustomerAddOns.map((item) => item.billing_add_on_id))

    const catalogItems = catalogAddOns
      .filter((item) => item.active !== false || activeAddOnIds.has(item.id))
      .map((item) => {
        const parsedPrice = Number(item.monthly_fee)

        return {
          key: `catalog-${item.id}`,
          id: item.id,
          customerAddOnId: activeAddOnIdToCustomerAddOnId.get(item.id) ?? null,
          name: item.name,
          description: getAddOnDescription(item),
          price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
          icon: getAddOnIcon(item.name, item.description),
          active: activeAddOnIds.has(item.id),
        } satisfies AddOn
      })

    const existingIds = new Set(catalogItems.map((item) => item.id))
    const purchasedOnlyItems = activeCustomerAddOns
      .filter((item) => item.add_on && !existingIds.has(item.billing_add_on_id))
      .map((item) => {
        const addOn = item.add_on!
        const parsedPrice = Number(addOn.monthly_fee)

        return {
          key: `customer-${item.id}`,
          id: item.billing_add_on_id,
          customerAddOnId: item.id,
          name: addOn.name || `Add-on #${item.billing_add_on_id}`,
          description: getAddOnDescription(addOn),
          price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
          icon: getAddOnIcon(addOn.name || "", addOn.description),
          active: true,
        } satisfies AddOn
      })

    return [...catalogItems, ...purchasedOnlyItems].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [catalogAddOns, customerAddOns])

  const activeStorageTierId = useMemo(() => {
    const status = (customerStorageTier?.status || "").toLowerCase()
    if (!customerStorageTier || !["active", "trialing"].includes(status)) return null
    return customerStorageTier.billing_storage_tier_id
  }, [customerStorageTier])

  const storageAddOns = useMemo(() => {
    return storageTiers
      .filter((tier) => tier.active !== false || tier.id === activeStorageTierId)
      .map((tier) => {
        const parsedPrice = Number(tier.monthly_fee)

        return {
          key: `storage-${tier.id}`,
          id: tier.id,
          customerAddOnId: tier.id === activeStorageTierId ? customerStorageTier?.id ?? null : null,
          name: tier.name,
          description: `Add ${formatStorageGb(tier.storage_gb)} of additional case storage.`,
          price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
          icon: "storage" as const,
          active: tier.id === activeStorageTierId,
        } satisfies AddOn
      })
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }, [storageTiers, activeStorageTierId, customerStorageTier])

  const handleConfirmAddOn = async () => {
    if (!resolvedCustomerId) {
      setAddOnError("Missing customer billing context. Please refresh and try again.")
      return
    }

    if (!selectedAddOn) {
      setAddOnError("Please choose an add-on first.")
      return
    }

    if (!selectedAddOn.id) {
      setAddOnError("This add-on is not available for checkout yet. Please refresh and try again.")
      return
    }

    try {
      setIsProcessingAddOn(true)
      setAddOnError(null)

      const returnUrl = `${window.location.origin}/billing/subscriptions/add-ons`
      const response = await createAddOnCheckoutSession({
        customer_id: resolvedCustomerId,
        billing_add_on_id: selectedAddOn.id,
        success_url: returnUrl,
        cancel_url: returnUrl,
      })

      if (response.success && response.url) {
        window.location.href = response.url
        return
      }

      throw new Error(response.message || "Failed to create add-on checkout session")
    } catch (error: any) {
      console.error("Add-on checkout error:", error)
      setAddOnError(error?.message || "Failed to start add-on checkout. Please try again.")
    } finally {
      setIsProcessingAddOn(false)
    }
  }

  const handleConfirmRemoveAddOn = async () => {
    if (!removeAddOn?.customerAddOnId) {
      setRemoveAddOnError("Unable to identify the add-on subscription. Please refresh and try again.")
      return
    }

    try {
      setIsRemovingAddOn(true)
      setRemoveAddOnError(null)

      await deleteCustomerAddOn(removeAddOn.customerAddOnId)

      setCustomerAddOns((prev) =>
        prev.map((item) =>
          item.id === removeAddOn.customerAddOnId ? { ...item, status: "cancelled" } : item
        )
      )
      setRemoveAddOn(null)
    } catch (error: any) {
      console.error("Remove add-on error:", error)
      setRemoveAddOnError(error?.message || "Failed to remove add-on. Please try again.")
    } finally {
      setIsRemovingAddOn(false)
    }
  }

  const handleConfirmStorageTier = async () => {
    if (!resolvedCustomerId) {
      setStorageTierError("Missing customer billing context. Please refresh and try again.")
      return
    }

    if (!selectedStorageTier) {
      setStorageTierError("Please choose a storage tier first.")
      return
    }

    try {
      setIsProcessingStorageTier(true)
      setStorageTierError(null)

      const returnUrl = `${window.location.origin}/billing/subscriptions/add-ons`
      const response = await createStorageTierCheckoutSession({
        customer_id: resolvedCustomerId,
        billing_storage_tier_id: selectedStorageTier.id,
        success_url: returnUrl,
        cancel_url: returnUrl,
      })

      if (response.success && response.url) {
        window.location.href = response.url
        return
      }

      throw new Error(response.message || "Failed to create storage tier checkout session")
    } catch (error: any) {
      console.error("Storage tier checkout error:", error)
      setStorageTierError(error?.message || "Failed to start storage tier checkout. Please try again.")
    } finally {
      setIsProcessingStorageTier(false)
    }
  }

  const handleConfirmRemoveStorageTier = async () => {
    if (!removeStorageTier?.customerAddOnId) {
      setRemoveStorageTierError("Unable to identify the storage tier subscription. Please refresh and try again.")
      return
    }

    try {
      setIsRemovingStorageTier(true)
      setRemoveStorageTierError(null)

      await cancelCustomerStorageTier(removeStorageTier.customerAddOnId)

      setCustomerStorageTier((prev) => (prev ? { ...prev, status: "cancelled" } : prev))
      setRemoveStorageTier(null)
    } catch (error: any) {
      console.error("Remove storage tier error:", error)
      setRemoveStorageTierError(error?.message || "Failed to remove storage tier. Please try again.")
    } finally {
      setIsRemovingStorageTier(false)
    }
  }

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

        {addOns.length === 0 ? (
          <div className="rounded-xl border border-[#DCE2EE] bg-white px-5 py-8 text-[14px] text-[#757A80] shadow-sm">
            No add-ons are currently available for this customer.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {addOns.map((addOn) => {
              const isActive = addOn.active

              return (
                <div
                  key={addOn.key}
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
                        onClick={() => {
                          setAddOnError(null)
                          setSelectedAddOn(addOn)
                        }}
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
        )}
      </div>

      <div className="mt-8 border-t border-[#E8EBF1] pt-6">
        <p className="mb-4 text-[15px] text-[#767C83]">
          Need more room for case files and images? Upgrade your storage tier at any time.
        </p>

        <p className="mb-4 text-[14px] font-semibold uppercase tracking-[0.12em] text-[#6D7278]">Storage</p>

        {storageAddOns.length === 0 ? (
          <div className="rounded-xl border border-[#DCE2EE] bg-white px-5 py-8 text-[14px] text-[#757A80] shadow-sm">
            No storage tiers are currently available for this customer.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {storageAddOns.map((tier) => {
              const isActive = tier.active

              return (
                <div
                  key={tier.key}
                  className={`rounded-xl border bg-white p-4 shadow-sm ${
                    isActive ? "border-[#2FBA63] shadow-[inset_0_0_0_1px_#2FBA63]" : "border-[#DCE2EE]"
                  }`}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <AddOnIcon icon={tier.icon} />
                      <div>
                        <h2 className="text-[16px] font-semibold text-[#222]">{tier.name}</h2>
                      </div>
                    </div>
                    {isActive ? (
                      <span className="inline-flex items-center rounded-md bg-[#E4F9EA] px-3 py-1 text-[12px] font-semibold text-[#1DAA4C]">
                        <span className="mr-1.5 h-2.5 w-2.5 rounded-full bg-[#27BA58]" />
                        ACTIVE
                      </span>
                    ) : null}
                  </div>

                  <p className="min-h-[48px] text-[14px] leading-6 text-[#757A80]">{tier.description}</p>

                  <div className="mt-12 flex items-end justify-between gap-4">
                    <div className="text-[#111]">
                      <span className="text-[22px] font-bold">{currency(tier.price)}</span>
                      <span className="ml-1 text-[14px] text-[#7A8087]">/month</span>
                    </div>
                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => setRemoveStorageTier(tier)}
                        className="min-w-[112px] rounded-[10px] border border-[#FF8F8F] px-5 py-2.5 text-[14px] font-semibold text-[#FF3B30] transition-colors hover:bg-[#FFF5F5]"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setStorageTierError(null)
                          setSelectedStorageTier(tier)
                        }}
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
        )}
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
                    onClick={() => void handleConfirmAddOn()}
                    disabled={isProcessingAddOn}
                    className="inline-flex h-9 w-[180px] items-center justify-center gap-2 rounded-[6px] bg-[#1162A8] text-[13px] font-semibold leading-4 text-white transition-colors hover:bg-[#0E548F] disabled:cursor-not-allowed disabled:bg-[#8AB4DA]"
                  >
                    {isProcessingAddOn ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Confirm & Add
                  </button>
                </div>

                {addOnError ? (
                  <p className="mt-3 text-[12px] leading-[15px] text-[#DC2626]">{addOnError}</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeAddOn} onOpenChange={(open) => { if (!open && !isRemovingAddOn) { setRemoveAddOn(null); setRemoveAddOnError(null) } }}>
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

                {removeAddOnError ? (
                  <p className="mt-3 text-[12px] leading-[15px] text-[#DC2626]">{removeAddOnError}</p>
                ) : null}

                <div className="mt-7 flex items-center justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => { setRemoveAddOn(null); setRemoveAddOnError(null) }}
                    disabled={isRemovingAddOn}
                    className="h-9 w-[140px] rounded-[6px] border border-[#666666] bg-white text-[13px] font-medium leading-4 text-[#333333] transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Keep Add-on
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConfirmRemoveAddOn()}
                    disabled={isRemovingAddOn}
                    className="inline-flex h-9 w-[168px] items-center justify-center gap-2 rounded-[6px] bg-[#DC2626] text-[13px] font-semibold leading-4 text-white transition-colors hover:bg-[#BE1F1F] disabled:cursor-not-allowed disabled:bg-[#EF9999]"
                  >
                    {isRemovingAddOn ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Remove Add-on
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedStorageTier} onOpenChange={(open) => !open && setSelectedStorageTier(null)}>
        <DialogContent showCloseButton={false} className="w-[min(480px,calc(100vw-24px))] max-w-none overflow-hidden rounded-[10px] border-0 bg-white p-0 shadow-2xl">
          {selectedStorageTier ? (
            <div>
              <div className="border-b border-[#E4E6EF] bg-[#F9FAFB] px-6 pb-[11px] pt-[10px]">
                <h2 className="text-[16px] font-bold leading-[19px] text-black">+ Add {selectedStorageTier.name}</h2>
                <p className="mt-[5px] text-[12px] leading-[15px] text-[#666666]">This storage tier will be added to your monthly subscription.</p>
              </div>

              <div className="px-6 pb-5 pt-4">
                <div className="rounded-[6px] border border-[#E4E6EF] bg-[#F9FAFB] px-3 pb-[9px] pt-2">
                  <div className="text-[13px] leading-4 text-[#666666]">
                    {selectedStorageTier.name}
                    <span className="mx-1.5">·</span>
                    Flat monthly storage add-on
                  </div>
                  <div className="mt-2 text-[16px] font-bold leading-[19px] text-black">
                    ${selectedStorageTier.price.toFixed(2)}/month
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedStorageTier(null)}
                    className="h-9 w-[120px] rounded-[6px] border border-[#E4E6EF] bg-white text-[13px] font-medium leading-4 text-[#666666] transition-colors hover:bg-[#F8FAFC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConfirmStorageTier()}
                    disabled={isProcessingStorageTier}
                    className="inline-flex h-9 w-[180px] items-center justify-center gap-2 rounded-[6px] bg-[#1162A8] text-[13px] font-semibold leading-4 text-white transition-colors hover:bg-[#0E548F] disabled:cursor-not-allowed disabled:bg-[#8AB4DA]"
                  >
                    {isProcessingStorageTier ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Confirm & Add
                  </button>
                </div>

                {storageTierError ? (
                  <p className="mt-3 text-[12px] leading-[15px] text-[#DC2626]">{storageTierError}</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeStorageTier} onOpenChange={(open) => { if (!open && !isRemovingStorageTier) { setRemoveStorageTier(null); setRemoveStorageTierError(null) } }}>
        <DialogContent showCloseButton={false} className="w-[min(480px,calc(100vw-24px))] max-w-none overflow-hidden rounded-[10px] border-0 bg-white p-0 shadow-2xl">
          {removeStorageTier ? (
            <div>
              <div className="h-[60px] border-b border-[#E4E6EF] bg-[#F9FAFC] px-5 pt-[18px]">
                <h2 className="text-[16px] font-bold leading-[19px] text-[#DC2626]">Remove Storage Tier</h2>
              </div>

              <div className="px-6 pb-5 pt-5">
                <h3 className="text-[16px] font-bold leading-[19px] text-black">{removeStorageTier.name}</h3>
                <p className="mt-[15px] max-w-[432px] text-[13px] leading-4 text-[#333333]">
                  This storage tier will be removed at the end of your current billing period.
                </p>

                <div className="mt-4 flex h-9 items-center gap-2 rounded-[6px] bg-[#FFEDED] px-3 text-[12px] font-semibold leading-[15px] text-[#DC2626]">
                  <TriangleAlert className="h-4 w-4 shrink-0 fill-current stroke-white" />
                  This action cannot be undone.
                </div>

                {removeStorageTierError ? (
                  <p className="mt-3 text-[12px] leading-[15px] text-[#DC2626]">{removeStorageTierError}</p>
                ) : null}

                <div className="mt-7 flex items-center justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => { setRemoveStorageTier(null); setRemoveStorageTierError(null) }}
                    disabled={isRemovingStorageTier}
                    className="h-9 w-[140px] rounded-[6px] border border-[#666666] bg-white text-[13px] font-medium leading-4 text-[#333333] transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Keep Tier
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConfirmRemoveStorageTier()}
                    disabled={isRemovingStorageTier}
                    className="inline-flex h-9 w-[168px] items-center justify-center gap-2 rounded-[6px] bg-[#DC2626] text-[13px] font-semibold leading-4 text-white transition-colors hover:bg-[#BE1F1F] disabled:cursor-not-allowed disabled:bg-[#EF9999]"
                  >
                    {isRemovingStorageTier ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Remove Tier
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
