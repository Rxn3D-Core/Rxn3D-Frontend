// components/RushRequestModal.tsx

"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  shouldAllowDialogInteractOutside,
} from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { RushIcon } from "@/components/case-design-center/components/CenterActionIcons"
import {
  buildLabCalendarContext,
  buildRushDateDisabledMatchers,
  countLabWorkingDaysBetween,
  getEarliestRushDeliveryDate,
  isLabWorkingDay,
  parseLocalDateString,
} from "@/components/case-design-center/utils/rushModalContext"
import type { BusinessHour, CaseSchedule } from "@/lib/api-business-settings"
import { format, isValid, parse, startOfDay } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { useHolidays } from "@/contexts/holidays-context"
import type { Matcher } from "react-day-picker"

/** Parse API (`yyyy-MM-dd`) or display (`MM/dd/yyyy`, `MM/dd/yy`) delivery strings. */
function parseDeliveryDateValue(value: string | undefined | null): Date | undefined {
  if (!value?.trim()) return undefined
  const trimmed = value.trim()
  for (const pattern of ["yyyy-MM-dd", "MM/dd/yyyy", "MM/dd/yy"] as const) {
    const parsed = parse(trimmed, pattern, new Date())
    if (isValid(parsed)) return startOfDay(parsed)
  }
  return undefined
}

function formatDisplayDate(date: Date | undefined): string {
  if (!date || !isValid(date)) return "—"
  return format(date, "MM/dd/yyyy")
}

function RushDateField({
  value,
  onChange,
  disabledMatchers,
  ariaLabel,
  placeholder = "Select rush delivery date",
}: {
  value: string
  onChange: (value: string) => void
  disabledMatchers: Matcher[]
  ariaLabel: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const display = value
    ? format(parseLocalDateString(value), "MM/dd/yyyy")
    : placeholder
  const selected = value ? parseLocalDateString(value) : undefined

  const stopDialogCapture = (e: React.SyntheticEvent) => {
    e.stopPropagation()
  }

  const openCalendar = () => setOpen(true)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (rootRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown, true)
    return () => document.removeEventListener("pointerdown", onPointerDown, true)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        className="relative flex h-[36px] w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-[#545F71] bg-white px-3.5 text-left"
        onClick={(e) => {
          stopDialogCapture(e)
          openCalendar()
        }}
        onPointerDown={stopDialogCapture}
      >
        <span
          className="truncate text-[13px] tracking-[-0.02em]"
          style={{ color: value ? "#000000" : "#B4B0B0" }}
        >
          {display}
        </span>
        <CalendarIcon className="h-[18px] w-[18px] shrink-0 text-[#CF0202]" aria-hidden />
      </button>
      {open ? (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-[210] rounded-md border bg-white p-0 shadow-md"
          onClick={stopDialogCapture}
          onPointerDown={stopDialogCapture}
        >
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (!date) return
              onChange(format(startOfDay(date), "yyyy-MM-dd"))
              setOpen(false)
            }}
            disabled={disabledMatchers}
            initialFocus
          />
        </div>
      ) : null}
    </div>
  )
}

/** A product available in the case for rush selection (legacy tab UI) */
export interface RushProduct {
  id: number
  name: string
}

export interface RushArchSlotView {
  arch: "maxillary" | "mandibular"
  archLabel: string
  productName: string
  rushKey: string
  cardId: number
  repTooth: number
  actualDeliveryDate: string
  workDaysToDeliver: number
  stageName?: string
  toothNumbersLabel?: string
  isRushed?: boolean
  existingRushDate?: string
  normalDeliveryDate?: string
  existingDaysSaved?: number
  existingRushFeePercentage?: number
  existingRushFee?: number
}

export interface RushConfirmPayload {
  arch: "maxillary" | "mandibular"
  rushKey: string
  /** Matches product card / `buildRushArchSlots` for panel rush indicators. */
  cardId?: number
  repTooth?: number
  targetDate: string | null
  daysSaved: number
  rushPercentage: number
  rushFee: number
  totalPrice: number
}

interface RushRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (rushData: RushConfirmPayload) => void
  onRemoveRush?: () => void
  isRushed?: boolean
  existingRushDate?: string // "yyyy-MM-dd"
  /** Per-arch rush state (legacy keys: maxillary_${productId}) */
  maxRushed?: boolean
  maxExistingRushDate?: string
  mandRushed?: boolean
  mandExistingRushDate?: string
  onRemoveMaxRush?: () => void
  onRemoveMandRush?: () => void
  /** Per-slot remove (case design: one column per product card). */
  onRemoveRushByKey?: (rushKey: string, arch: "maxillary" | "mandibular") => void
  hasMaxillary?: boolean
  hasMandibular?: boolean
  /** Case design: one column per arch with that arch's product name (no misleading product tabs). */
  archSlots?: RushArchSlotView[]
  /** When true, confirming rush on one arch also applies to the other (same product on both arches). */
  mirrorRushAcrossArches?: boolean
  product: {
    name: string
    stage: string
    deliveryDate: string
    price: number
  }
  /** Legacy: product tabs (e.g. lab case management) */
  products?: RushProduct[]
  /** Lab business profile case schedule (rush fee %, turnaround). */
  rushCaseSchedule?: CaseSchedule | null
  /** Lab weekoffs from business profile (`is_open: false` days). */
  labBusinessHours?: BusinessHour[] | null
}

export default function RushRequestModal({
  isOpen,
  onClose,
  onConfirm,
  onRemoveRush,
  isRushed = false,
  existingRushDate,
  maxRushed,
  maxExistingRushDate,
  mandRushed,
  mandExistingRushDate,
  onRemoveMaxRush,
  onRemoveMandRush,
  onRemoveRushByKey,
  hasMaxillary = true,
  hasMandibular = true,
  archSlots = [],
  mirrorRushAcrossArches = false,
  product,
  products = [],
  rushCaseSchedule = null,
  labBusinessHours = null,
}: RushRequestModalProps) {
  const initializedForOpenRef = useRef(false)
  const { holidays } = useHolidays()

  const labCalendarCtx = useMemo(
    () =>
      buildLabCalendarContext(
        labBusinessHours,
        holidays.map((h) => ({ date: h.date, is_recurring: h.is_recurring }))
      ),
    [labBusinessHours, holidays]
  )

  const [activeProductId, setActiveProductId] = useState<number | null>(null)
  const [maxTargetDateStr, setMaxTargetDateStr] = useState("")
  const [mandTargetDateStr, setMandTargetDateStr] = useState("")
  const [targetDatesByKey, setTargetDatesByKey] = useState<Record<string, string>>({})

  const isFlexibleRush = rushCaseSchedule?.rush_type === "flexible"

  const configuredRushPercent = isFlexibleRush
    ? 0
    : Number.parseFloat(String(rushCaseSchedule?.fixed_rush_fee_percentage ?? "25"))
  const configuredTurnaroundDays = isFlexibleRush ? undefined : rushCaseSchedule?.fixed_turnaround_days

  const earliestRushDelivery = useMemo(
    () =>
      getEarliestRushDeliveryDate(
        new Date(),
        configuredTurnaroundDays,
        labCalendarCtx
      ),
    [configuredTurnaroundDays, labCalendarCtx]
  )

  const computeRushMetrics = (targetDateStr: string, standardDelivery?: Date) => {
    if (!targetDateStr || !standardDelivery) {
      return { daysSaved: 0, rushPercentage: 0, rushFee: 0 }
    }
    const rushDate = parseLocalDateString(targetDateStr)
    const daysSaved = countLabWorkingDaysBetween(rushDate, standardDelivery, labCalendarCtx)

    if (isFlexibleRush) {
      const standardWorkingDays = countLabWorkingDaysBetween(
        startOfDay(new Date()),
        standardDelivery,
        labCalendarCtx
      )
      const rushPercentage =
        standardWorkingDays > 0
          ? Math.round((daysSaved / standardWorkingDays) * 100 * 100) / 100
          : 0
      const rushFee = Math.round(product.price * (rushPercentage / 100) * 100) / 100
      return { daysSaved, rushPercentage, rushFee }
    }

    const rushPercentage = Number.isFinite(configuredRushPercent) ? configuredRushPercent : 25
    const rushFee = Math.round(product.price * (rushPercentage / 100) * 100) / 100
    return { daysSaved, rushPercentage, rushFee }
  }

  const useArchSlots = archSlots.length > 0
  const maxSlot = archSlots.find((s) => s.arch === "maxillary")
  const mandSlot = archSlots.find((s) => s.arch === "mandibular")
  const multipleSlotsOnOneArch =
    useArchSlots &&
    (archSlots.filter((s) => s.arch === "maxillary").length > 1 ||
      archSlots.filter((s) => s.arch === "mandibular").length > 1)

  const effectiveMaxRushed = maxRushed ?? isRushed
  const effectiveMandRushed = mandRushed ?? isRushed
  const effectiveMaxExistingDate = maxExistingRushDate ?? existingRushDate
  const effectiveMandExistingDate = mandExistingRushDate ?? existingRushDate

  useEffect(() => {
    if (!isOpen) {
      initializedForOpenRef.current = false
      return
    }
    if (initializedForOpenRef.current) return
    initializedForOpenRef.current = true

    setMaxTargetDateStr(effectiveMaxExistingDate ?? "")
    setMandTargetDateStr(effectiveMandExistingDate ?? "")
    if (useArchSlots) {
      const next: Record<string, string> = {}
      for (const slot of archSlots) {
        next[slot.rushKey] = slot.existingRushDate ?? ""
      }
      setTargetDatesByKey(next)
    }
    if (!useArchSlots && products.length > 0) {
      setActiveProductId(products[0].id)
    }
  }, [
    isOpen,
    effectiveMaxExistingDate,
    effectiveMandExistingDate,
    products,
    useArchSlots,
    archSlots,
  ])

  const buildPayload = (
    arch: "maxillary" | "mandibular",
    targetDateStr: string,
    rushKey: string,
    standardDelivery?: Date,
    slotMeta?: { cardId: number; repTooth: number }
  ): RushConfirmPayload => {
    const metrics = computeRushMetrics(targetDateStr, standardDelivery)
    return {
      arch,
      rushKey,
      cardId: slotMeta?.cardId,
      repTooth: slotMeta?.repTooth,
      targetDate: targetDateStr || null,
      daysSaved: metrics.daysSaved,
      rushPercentage: metrics.rushPercentage,
      rushFee: metrics.rushFee,
      totalPrice: product.price + metrics.rushFee,
    }
  }

  const handleConfirm = (arch: "maxillary" | "mandibular") => {
    const targetDateStr = arch === "maxillary" ? maxTargetDateStr : mandTargetDateStr
    const actualDelivery = resolveActualDeliveryDate(arch)
    if (!isRushDateValidStr(targetDateStr, actualDelivery)) return

    const slot = arch === "maxillary" ? maxSlot : mandSlot
    const rushKey = slot?.rushKey ?? `${arch}_legacy`
    onConfirm(buildPayload(arch, targetDateStr, rushKey, actualDelivery))

    const shouldMirror =
      mirrorRushAcrossArches &&
      hasMaxillary &&
      hasMandibular &&
      archSlots.length === 2

    if (shouldMirror) {
      const otherArch = arch === "maxillary" ? "mandibular" : "maxillary"
      const otherRushed = otherArch === "maxillary" ? effectiveMaxRushed : effectiveMandRushed
      if (!otherRushed) {
        const otherSlot = otherArch === "maxillary" ? maxSlot : mandSlot
        const otherKey = otherSlot?.rushKey ?? `${otherArch}_legacy`
        const otherStandard = resolveActualDeliveryDate(otherArch)
        if (otherArch === "maxillary") {
          setMaxTargetDateStr(targetDateStr)
        } else {
          setMandTargetDateStr(targetDateStr)
        }
        onConfirm(buildPayload(otherArch, targetDateStr, otherKey, otherStandard))
      }
    }

    onClose()
  }

  const handleConfirmSlot = (slot: RushArchSlotView) => {
    const targetDateStr = targetDatesByKey[slot.rushKey] ?? ""
    const actualDelivery = slot.actualDeliveryDate
      ? parseDeliveryDateValue(slot.actualDeliveryDate)
      : undefined
    if (!isRushDateValidStr(targetDateStr, actualDelivery)) return

    onConfirm(
      buildPayload(slot.arch, targetDateStr, slot.rushKey, actualDelivery, {
        cardId: slot.cardId,
        repTooth: slot.repTooth,
      })
    )

    if (mirrorRushAcrossArches && archSlots.length === 2) {
      const other = archSlots.find((s) => s.arch !== slot.arch)
      if (other && !other.isRushed) {
        setTargetDatesByKey((prev) => ({ ...prev, [other.rushKey]: targetDateStr }))
        const otherStandard = other.actualDeliveryDate
          ? parseLocalDateString(other.actualDeliveryDate)
          : undefined
        onConfirm(buildPayload(other.arch, targetDateStr, other.rushKey, otherStandard))
      }
    }

    onClose()
  }

  const labelStyle = { fontWeight: 700, lineHeight: "22px", letterSpacing: "-0.02em", color: "#545F71" } as const
  const valueStyle = { fontWeight: 400, lineHeight: "22px", letterSpacing: "-0.02em", color: "#000000" } as const

  const productTabs =
    !useArchSlots && products.length > 0
      ? products
      : !useArchSlots && product?.name
        ? [{ id: 0, name: product.name }]
        : []

  const columnHeading = (arch: "maxillary" | "mandibular", fallback: string) => {
    const slot = arch === "maxillary" ? maxSlot : mandSlot
    if (slot) {
      return (
        <div className="text-center mb-4">
          <h3 className="font-bold text-[14px] tracking-[-0.02em]">{slot.archLabel}</h3>
          <p className="text-[12px] mt-1 text-[#545F71] tracking-[-0.02em]">{slot.productName}</p>
          {slot.stageName ? (
            <p className="text-[11px] mt-0.5 text-[#9BA5B7] tracking-[-0.02em]">{slot.stageName}</p>
          ) : null}
        </div>
      )
    }
    return (
      <h3 className="text-center font-bold text-[14px] mb-4 tracking-[-0.02em]">{fallback}</h3>
    )
  }

  const resolveActualDeliveryDate = (arch: "maxillary" | "mandibular"): Date | undefined => {
    const slot = arch === "maxillary" ? maxSlot : mandSlot
    if (slot?.actualDeliveryDate) {
      return parseDeliveryDateValue(slot.actualDeliveryDate)
    }
    if (product.deliveryDate) {
      return parseDeliveryDateValue(product.deliveryDate)
    }
    return undefined
  }

  const isRushDateValidStr = (
    targetDateStr: string | undefined,
    actualDelivery: Date | undefined
  ): boolean => {
    if (!targetDateStr?.trim()) return false
    const rushDay = parseLocalDateString(targetDateStr)
    if (!isLabWorkingDay(rushDay, labCalendarCtx)) return false
    if (rushDay < earliestRushDelivery) return false
    if (actualDelivery) {
      const maxDay = startOfDay(actualDelivery)
      if (rushDay > maxDay) return false
    }
    return true
  }

  const rushDateDisabledMatchers = (maxDelivery?: Date) =>
    buildRushDateDisabledMatchers(labCalendarCtx, earliestRushDelivery, maxDelivery)

  const applySameDateToAllProducts = (sourceRushKey: string) => {
    const date = targetDatesByKey[sourceRushKey]?.trim()
    if (!date) return
    setTargetDatesByKey((prev) => {
      const next = { ...prev }
      for (const slot of archSlots) {
        next[slot.rushKey] = date
      }
      return next
    })
  }

  const showBatchRushFooter = useArchSlots && archSlots.length > 1

  const renderSlotColumn = (slot: RushArchSlotView) => {
    const targetDateStr = targetDatesByKey[slot.rushKey] ?? ""
    const actualDelivery = slot.actualDeliveryDate
      ? parseDeliveryDateValue(slot.actualDeliveryDate)
      : undefined
    const archRushed = !!slot.isRushed
    const archExistingDateStr = slot.existingRushDate ?? null
    const dateChanged = archRushed && targetDateStr !== (archExistingDateStr ?? "")
    const showRemoveRush = archRushed && !dateChanged
    const canRequestRush = isRushDateValidStr(targetDateStr, actualDelivery)
    const rushMetrics = computeRushMetrics(targetDateStr, actualDelivery)
    const rushWindowImpossible =
      !!actualDelivery && earliestRushDelivery > startOfDay(actualDelivery)

    const standardDelivery =
      slot.normalDeliveryDate
        ? parseDeliveryDateValue(slot.normalDeliveryDate)
        : actualDelivery

    const hasExistingRushDetails =
      archRushed &&
      (slot.normalDeliveryDate ||
        slot.existingDaysSaved != null ||
        slot.existingRushFeePercentage != null)

    return (
      <div className="flex-1 flex flex-col min-w-[260px] max-w-full">
        <div className="text-center mb-4">
          <h3 className="font-bold text-[14px] tracking-[-0.02em]">{slot.archLabel}</h3>
          <p className="text-[12px] mt-1 text-[#545F71] tracking-[-0.02em]">{slot.productName}</p>
          {slot.stageName ? (
            <p className="text-[11px] mt-0.5 text-[#9BA5B7] tracking-[-0.02em]">{slot.stageName}</p>
          ) : null}
        </div>

        <div className="mb-4">
          <p className="text-[11px] font-bold mb-1.5 tracking-[-0.02em]" style={labelStyle}>
            Standard delivery date
          </p>
          <div
            className="w-full h-[36px] rounded-md flex items-center px-3.5"
            style={{ background: "#F5F5F5", border: "1px solid #E5E5E5" }}
          >
            <span className="text-[13px]" style={valueStyle}>
              {formatDisplayDate(standardDelivery)}
            </span>
          </div>
          {slot.workDaysToDeliver != null && (
            <p className="text-[10px] mt-1.5 ml-2.5" style={{ color: "#B4B0B0" }}>
              Est. {slot.workDaysToDeliver} work days after submission
              {slot.stageName ? ` (${slot.stageName})` : ""}
            </p>
          )}
        </div>

        <div className="mb-4">
          <p className="text-[11px] font-bold mb-1.5 tracking-[-0.02em]" style={labelStyle}>
            Rush delivery date
          </p>
          <RushDateField
            ariaLabel={`Rush delivery date for ${slot.productName}`}
            disabledMatchers={rushDateDisabledMatchers(standardDelivery)}
            value={targetDateStr}
            onChange={(value) =>
              setTargetDatesByKey((prev) => ({ ...prev, [slot.rushKey]: value }))
            }
          />
          <p className="text-[10px] mt-1.5 ml-2.5" style={{ color: "#B4B0B0" }}>
            Select a lab working day (weekoffs and holidays are disabled). Earliest rush date:{" "}
            {format(earliestRushDelivery, "MM/dd/yyyy")}
            {standardDelivery ? (
              <>; must be on or before standard delivery ({formatDisplayDate(standardDelivery)}).</>
            ) : (
              "."
            )}
            {rushCaseSchedule?.rush_type === "fixed" && configuredTurnaroundDays != null ? (
              <> Fixed turnaround: {configuredTurnaroundDays} lab working days from today.</>
            ) : null}
            {rushWindowImpossible ? (
              <span className="block mt-1 text-[#CF0202]">
                Rush is not available for this product: standard delivery is before the earliest rush
                date allowed by lab policy.
              </span>
            ) : null}
          </p>
        </div>

        {hasExistingRushDetails && !dateChanged ? (
          <div className="px-5 py-4 rounded-md mb-4" style={{ border: "1px solid #FFE2E2" }}>
            <p className="text-[11px] font-bold mb-3 tracking-[-0.02em]" style={{ color: "#CF0202" }}>
              Current rush details
            </p>
            <div className="flex flex-col gap-3">
              {slot.existingDaysSaved != null && (
                <div className="flex justify-between">
                  <span className="text-[13px]" style={labelStyle}>Days saved</span>
                  <span className="text-[13px]" style={valueStyle}>
                    {slot.existingDaysSaved} days
                  </span>
                </div>
              )}
              {slot.existingRushFeePercentage != null && (
                <div className="flex justify-between">
                  <span className="text-[13px]" style={labelStyle}>Rush percent</span>
                  <span className="text-[13px]" style={valueStyle}>
                    {slot.existingRushFeePercentage}%
                  </span>
                </div>
              )}
              {slot.existingRushFee != null && (
                <div className="flex justify-between">
                  <span className="text-[13px]" style={labelStyle}>Rush fee</span>
                  <span className="text-[13px]" style={valueStyle}>
                    ${slot.existingRushFee.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : targetDateStr ? (
          <div className="px-5 py-4 rounded-md mb-4" style={{ border: "1px solid #FFE2E2" }}>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-[13px]" style={labelStyle}>
                  Days saved
                </span>
                <span className="text-[13px]" style={valueStyle}>
                  {rushMetrics.daysSaved} days
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[13px]" style={labelStyle}>
                  Rush Percent
                </span>
                <span className="text-[13px]" style={valueStyle}>
                  {rushMetrics.rushPercentage} %
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[13px]" style={labelStyle}>
                  Rush fee
                </span>
                <span className="text-[13px]" style={valueStyle}>
                  $ {rushMetrics.rushFee}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex gap-3 justify-center flex-wrap mt-auto pt-2">
          {!showBatchRushFooter ? (
            <button
              type="button"
              onClick={onClose}
              className="h-[36px] px-6 rounded-md border-2 border-[#9BA5B7] bg-transparent flex items-center justify-center cursor-pointer"
            >
              <span className="text-[13px] font-bold text-[#9BA5B7] tracking-[-0.02em]">Cancel</span>
            </button>
          ) : null}

          {showRemoveRush ? (
            <button
              type="button"
              onClick={() => {
                if (onRemoveRushByKey) {
                  onRemoveRushByKey(slot.rushKey, slot.arch)
                } else if (slot.arch === "maxillary") {
                  onRemoveMaxRush?.()
                } else {
                  onRemoveMandRush?.()
                }
                if (mirrorRushAcrossArches && archSlots.length === 2) {
                  const other = archSlots.find((s) => s.arch !== slot.arch)
                  if (other) {
                    onRemoveRushByKey?.(other.rushKey, other.arch)
                  }
                }
                if (!showBatchRushFooter) onClose()
              }}
              className="h-[36px] px-4 rounded-md border-2 border-[#CF0202] bg-transparent flex items-center justify-center gap-2 cursor-pointer"
            >
              <X className="w-[14px] h-[14px]" style={{ color: "#CF0202" }} />
              <span className="text-[12px] font-bold text-[#CF0202] tracking-[-0.02em]">Remove Rush</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleConfirmSlot(slot)}
              disabled={!canRequestRush}
              className="h-[36px] px-4 rounded-md border-none flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              style={{ background: !canRequestRush ? "#9BA5B7" : "#CF0202" }}
            >
              <span className="text-[12px] font-bold text-white tracking-[-0.02em] whitespace-nowrap">
                Request and Submit
              </span>
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderArchColumn = (
    arch: "maxillary" | "mandibular",
    fallbackLabel: string,
    targetDateStr: string,
    setTargetDateStr: (value: string) => void
  ) => {
    const slot = arch === "maxillary" ? maxSlot : mandSlot
    const actualDelivery = resolveActualDeliveryDate(arch)
    const archRushed = arch === "maxillary" ? effectiveMaxRushed : effectiveMandRushed
    const archExistingDate = arch === "maxillary" ? effectiveMaxExistingDate : effectiveMandExistingDate
    const archExistingDateStr = archExistingDate ?? null
    const dateChanged = archRushed && targetDateStr !== (archExistingDateStr ?? "")
    const showRemoveRush = archRushed && !dateChanged
    const canRequestRush = isRushDateValidStr(targetDateStr, actualDelivery)
    const rushMetrics = computeRushMetrics(targetDateStr, actualDelivery)

    const standardDelivery = slot?.normalDeliveryDate
      ? parseDeliveryDateValue(slot.normalDeliveryDate)
      : actualDelivery

    const hasExistingRushDetails =
      archRushed &&
      (slot?.normalDeliveryDate ||
        slot?.existingDaysSaved != null ||
        slot?.existingRushFeePercentage != null)

    return (
      <div className="flex-1 flex flex-col min-w-0">
        {columnHeading(arch, fallbackLabel)}

        <div className="mb-4">
          <p className="text-[11px] font-bold mb-1.5 tracking-[-0.02em]" style={labelStyle}>
            Standard delivery date
          </p>
          <div
            className="w-full h-[36px] rounded-md flex items-center px-3.5"
            style={{ background: "#F5F5F5", border: "1px solid #E5E5E5" }}
          >
            <span className="text-[13px]" style={valueStyle}>
              {formatDisplayDate(standardDelivery)}
            </span>
          </div>
          {slot?.workDaysToDeliver != null && (
            <p className="text-[10px] mt-1.5 ml-2.5" style={{ color: "#B4B0B0" }}>
              Est. {slot.workDaysToDeliver} work days after submission
              {slot.stageName ? ` (${slot.stageName})` : ""}
            </p>
          )}
        </div>

        <div className="mb-4">
          <p className="text-[11px] font-bold mb-1.5 tracking-[-0.02em]" style={labelStyle}>
            Rush delivery date
          </p>
          <RushDateField
            ariaLabel="Rush delivery date"
            disabledMatchers={rushDateDisabledMatchers(standardDelivery)}
            value={targetDateStr}
            onChange={setTargetDateStr}
          />
          <p className="text-[10px] mt-1.5 ml-2.5" style={{ color: "#B4B0B0" }}>
            Select a lab working day (weekoffs and holidays are disabled). Earliest rush date:{" "}
            {format(earliestRushDelivery, "MM/dd/yyyy")}
            {standardDelivery ? (
              <>; must be on or before standard delivery ({formatDisplayDate(standardDelivery)}).</>
            ) : (
              "."
            )}
            {rushCaseSchedule?.rush_type === "fixed" && configuredTurnaroundDays != null ? (
              <> Fixed turnaround: {configuredTurnaroundDays} lab working days from today.</>
            ) : null}
          </p>
        </div>

        {hasExistingRushDetails && !dateChanged ? (
          <div className="px-5 py-4 rounded-md mb-4" style={{ border: "1px solid #FFE2E2" }}>
            <p className="text-[11px] font-bold mb-3 tracking-[-0.02em]" style={{ color: "#CF0202" }}>
              Current rush details
            </p>
            <div className="flex flex-col gap-3">
              {slot?.existingDaysSaved != null && (
                <div className="flex justify-between">
                  <span className="text-[13px]" style={labelStyle}>Days saved</span>
                  <span className="text-[13px]" style={valueStyle}>
                    {slot.existingDaysSaved} days
                  </span>
                </div>
              )}
              {slot?.existingRushFeePercentage != null && (
                <div className="flex justify-between">
                  <span className="text-[13px]" style={labelStyle}>Rush percent</span>
                  <span className="text-[13px]" style={valueStyle}>
                    {slot.existingRushFeePercentage}%
                  </span>
                </div>
              )}
              {slot?.existingRushFee != null && (
                <div className="flex justify-between">
                  <span className="text-[13px]" style={labelStyle}>Rush fee</span>
                  <span className="text-[13px]" style={valueStyle}>
                    ${slot.existingRushFee.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : targetDateStr ? (
          <div className="px-5 py-4 rounded-md mb-4" style={{ border: "1px solid #FFE2E2" }}>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-[13px]" style={labelStyle}>
                  Days saved
                </span>
                <span className="text-[13px]" style={valueStyle}>
                  {rushMetrics.daysSaved} days
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[13px]" style={labelStyle}>
                  Rush Percent
                </span>
                <span className="text-[13px]" style={valueStyle}>
                  {rushMetrics.rushPercentage} %
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[13px]" style={labelStyle}>
                  Rush fee
                </span>
                <span className="text-[13px]" style={valueStyle}>
                  $ {rushMetrics.rushFee}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={onClose}
            className="h-[36px] px-6 rounded-md border-2 border-[#9BA5B7] bg-transparent flex items-center justify-center cursor-pointer"
          >
            <span className="text-[13px] font-bold text-[#9BA5B7] tracking-[-0.02em]">Cancel</span>
          </button>

          {showRemoveRush ? (
            <button
              type="button"
              onClick={() => {
                const removeHandler = arch === "maxillary" ? onRemoveMaxRush : onRemoveMandRush
                if (removeHandler) {
                  removeHandler()
                } else {
                  onRemoveRush?.()
                }
                if (mirrorRushAcrossArches && hasMaxillary && hasMandibular) {
                  const otherRemoveHandler = arch === "maxillary" ? onRemoveMandRush : onRemoveMaxRush
                  otherRemoveHandler?.()
                }
                onClose()
              }}
              className="h-[36px] px-4 rounded-md border-2 border-[#CF0202] bg-transparent flex items-center justify-center gap-2 cursor-pointer"
            >
              <X className="w-[14px] h-[14px]" style={{ color: "#CF0202" }} />
              <span className="text-[12px] font-bold text-[#CF0202] tracking-[-0.02em]">Remove Rush</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleConfirm(arch)}
              disabled={!canRequestRush}
              className="h-[36px] px-4 rounded-md border-none flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              style={{ background: !canRequestRush ? "#9BA5B7" : "#CF0202" }}
            >
              <span className="text-[12px] font-bold text-white tracking-[-0.02em] whitespace-nowrap">
                Request and Submit
              </span>
            </button>
          )}
        </div>
      </div>
    )
  }

  const showMaxillary = useArchSlots ? archSlots.some((s) => s.arch === "maxillary") : hasMaxillary
  const showMandibular = useArchSlots ? archSlots.some((s) => s.arch === "mandibular") : hasMandibular
  const useSlotColumns = useArchSlots && archSlots.length > 0

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogPortal>
        <DialogOverlay className="!z-[200]" />
        <DialogPrimitive.Content
          onInteractOutside={(e) => {
            if (shouldAllowDialogInteractOutside(e)) return
            e.preventDefault()
          }}
          onPointerDownOutside={(e) => {
            if (shouldAllowDialogInteractOutside(e)) return
            e.preventDefault()
          }}
          onFocusOutside={(e) => {
            if (shouldAllowDialogInteractOutside(e)) return
            e.preventDefault()
          }}
          className="fixed left-[50%] top-[50%] z-[201] translate-x-[-50%] translate-y-[-50%] p-0 w-[94vw] max-w-[min(1100px,94vw)] overflow-visible data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          style={{
            maxHeight: "92vh",
            background: "#FFFFFF",
            border: "2px solid #CF0202",
            borderRadius: "6px",
            boxShadow: "9px 7px 21.6px rgba(0, 0, 0, 0.25)",
            fontFamily: "Verdana",
          }}
        >
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none z-10 cursor-pointer">
            <X className="w-5 h-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          <div className="px-6 pt-6 pb-5 overflow-y-auto" style={{ maxHeight: "calc(92vh - 2px)" }}>
            <DialogTitle className="flex items-center gap-2.5 mb-5 text-[15px] font-bold tracking-[-0.02em]">
              <span className="w-9 h-9 flex items-center justify-center shrink-0">
                <RushIcon />
              </span>
              Rush Request
            </DialogTitle>

            {rushCaseSchedule?.enable_rush_cases !== false && rushCaseSchedule?.rush_type === "fixed" ? (
              <p
                className="text-[12px] text-[#545F71] mb-4 leading-[18px] tracking-[-0.02em] rounded-md px-3 py-2"
                style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
              >
                Lab rush settings:{" "}
                {configuredTurnaroundDays != null ? (
                  <span className="font-bold">{configuredTurnaroundDays} day</span>
                ) : (
                  "—"
                )}{" "}
                fixed turnaround ·{" "}
                <span className="font-bold">
                  {Number.isFinite(configuredRushPercent) ? configuredRushPercent : "—"}%
                </span>{" "}
                rush fee
              </p>
            ) : rushCaseSchedule?.enable_rush_cases !== false && isFlexibleRush ? (
              <p
                className="text-[12px] text-[#545F71] mb-4 leading-[18px] tracking-[-0.02em] rounded-md px-3 py-2"
                style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
              >
                Lab rush settings: <span className="font-bold">Flexible</span> — select any available lab
                working day. Rush fee is determined by the lab after submission.
              </p>
            ) : null}

            {useArchSlots && multipleSlotsOnOneArch && (
              <p className="text-[12px] text-[#545F71] mb-4 leading-[18px] tracking-[-0.02em]">
                Each product has its own rush settings. Set a rush delivery date for every product listed
                below.
              </p>
            )}

            {useArchSlots &&
              archSlots.length > 1 &&
              !mirrorRushAcrossArches &&
              !multipleSlotsOnOneArch && (
                <p className="text-[12px] text-[#545F71] mb-4 leading-[18px] tracking-[-0.02em]">
                  Each arch has its own product. Set a rush date separately for the upper and lower arch.
                </p>
              )}

            {useArchSlots && mirrorRushAcrossArches && (
              <p className="text-[12px] text-[#545F71] mb-4 leading-[18px] tracking-[-0.02em]">
                Same product on both arches — one rush date applies to upper and lower.
              </p>
            )}

            {productTabs.length > 1 && (
              <div className="flex items-center gap-2 mb-5 flex-wrap">
                <span className="text-[14px] text-gray-700 mr-1">Select product to rush:</span>
                {productTabs.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveProductId(p.id)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors cursor-pointer ${
                      activeProductId === p.id
                        ? "bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] text-white border-[#1162A8]"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {useSlotColumns ? (
              <div className="flex gap-6 flex-col sm:flex-row sm:flex-wrap sm:items-start">
                {(mirrorRushAcrossArches ? archSlots.slice(0, 1) : archSlots).map((slot, index) => (
                  <div key={slot.rushKey} className="flex flex-1 min-w-[260px] gap-6 items-stretch">
                    {index > 0 ? (
                      <div className="w-px bg-gray-200 flex-shrink-0 hidden sm:block self-stretch min-h-[120px]" aria-hidden />
                    ) : null}
                    {renderSlotColumn(
                      mirrorRushAcrossArches
                        ? { ...slot, archLabel: "Upper & Lower" }
                        : slot
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-6 flex-col sm:flex-row">
              {showMaxillary &&
                renderArchColumn(
                  "maxillary",
                  "Maxillary Rush detail",
                  maxTargetDateStr,
                  setMaxTargetDateStr
                )}

                {showMaxillary && showMandibular && (
                  <div className="w-px bg-gray-200 flex-shrink-0 hidden sm:block" />
                )}

                {showMandibular &&
                  renderArchColumn(
                    "mandibular",
                    "Mandibular Rush detail",
                    mandTargetDateStr,
                    setMandTargetDateStr
                  )}
              </div>
            )}

            {showBatchRushFooter ? (
              <div className="mt-6 pt-5 border-t border-gray-200 flex flex-col items-center gap-3">
                {multipleSlotsOnOneArch && archSlots[0]?.rushKey ? (
                  <button
                    type="button"
                    onClick={() => applySameDateToAllProducts(archSlots[0].rushKey)}
                    disabled={!targetDatesByKey[archSlots[0].rushKey]?.trim()}
                    className="text-[12px] font-bold text-[#1162A8] tracking-[-0.02em] underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
                  >
                    Use same rush date for all products
                  </button>
                ) : null}
                <p className="text-center text-[11px] text-[#9BA5B7] tracking-[-0.02em] max-w-[520px]">
                  Use Request and Submit on each product when its rush date is valid. You do not need to
                  rush every product.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-[36px] px-6 rounded-md border-2 border-[#9BA5B7] bg-transparent flex items-center justify-center cursor-pointer"
                >
                  <span className="text-[13px] font-bold text-[#9BA5B7] tracking-[-0.02em]">Close</span>
                </button>
              </div>
            ) : null}

            <div className="px-5 py-4 rounded-md mt-5" style={{ background: "#EDF7FF" }}>
              <div className="flex gap-2.5 items-start">
                <div className="w-[12px] h-[12px] rounded-full border border-[#1E1E1E] flex items-center justify-center text-[8px] mt-[4px] shrink-0">
                  ⓘ
                </div>
                <div>
                  <p className="text-[13px] font-bold tracking-[-0.02em] mb-1">Important information</p>
                  <p className="text-[12px] leading-[18px] tracking-[-0.02em]" style={{ color: "#000000" }}>
                    Rush requests are subject to lab capacity and technician availability. You will be notified if
                    the request cannot be accommodated. Rush fees are non-refundable once work begins.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
