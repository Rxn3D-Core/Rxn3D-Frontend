// components/RushRequestModal.tsx

"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { RushIcon } from "@/components/case-design-center/components/CenterActionIcons"
import { format, parse } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/** A product available in the case for rush selection */
export interface RushProduct {
  id: number
  name: string
}

interface RushRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (rushData: any) => void
  onRemoveRush?: () => void
  isRushed?: boolean
  existingRushDate?: string // "yyyy-MM-dd"
  product: {
    name: string
    stage: string
    deliveryDate: string // ISO string
    price: number
  }
  /** All products available in the case — shown as tabs */
  products?: RushProduct[]
}

export default function RushRequestModal({
  isOpen,
  onClose,
  onConfirm,
  onRemoveRush,
  isRushed = false,
  existingRushDate,
  product,
  products = [],
}: RushRequestModalProps) {
  const parseExistingDate = (d?: string) =>
    d ? parse(d, "yyyy-MM-dd", new Date()) : undefined

  const [activeProductId, setActiveProductId] = useState<number | null>(null)
  // Per-arch state
  const [maxTargetDate, setMaxTargetDate] = useState<Date | undefined>(undefined)
  const [mandTargetDate, setMandTargetDate] = useState<Date | undefined>(undefined)
  const [maxCalendarOpen, setMaxCalendarOpen] = useState(false)
  const [mandCalendarOpen, setMandCalendarOpen] = useState(false)
  const [daysSaved] = useState(6)
  const [rushPercentage] = useState(50)
  const [rushFee] = useState(50)

  // Reset state whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setMaxTargetDate(parseExistingDate(existingRushDate))
      setMandTargetDate(parseExistingDate(existingRushDate))
      setMaxCalendarOpen(false)
      setMandCalendarOpen(false)
      if (products.length > 0) {
        setActiveProductId(products[0].id)
      }
    }
  }, [isOpen, existingRushDate, products])

  const existingDateStr = existingRushDate ?? null

  const handleConfirm = (arch: "maxillary" | "mandibular") => {
    const date = arch === "maxillary" ? maxTargetDate : mandTargetDate
    const rushData = {
      arch,
      targetDate: date ? format(date, "yyyy-MM-dd") : null,
      daysSaved,
      rushPercentage,
      rushFee,
      totalPrice: product.price + rushFee,
    }
    onConfirm(rushData)
  }

  const handleRemove = () => {
    onRemoveRush?.()
    onClose()
  }

  const labelStyle = { fontWeight: 700, lineHeight: '22px', letterSpacing: '-0.02em', color: '#545F71' } as const
  const valueStyle = { fontWeight: 400, lineHeight: '22px', letterSpacing: '-0.02em', color: '#000000' } as const

  const productTabs = products.length > 0 ? products : (product?.name ? [{ id: 0, name: product.name }] : [])

  /** Render a single arch rush column */
  const renderArchColumn = (
    arch: "maxillary" | "mandibular",
    label: string,
    targetDate: Date | undefined,
    setTargetDate: (d: Date | undefined) => void,
    calendarOpen: boolean,
    setCalendarOpen: (v: boolean) => void,
  ) => {
    const selectedDateStr = targetDate ? format(targetDate, "yyyy-MM-dd") : null
    const dateChanged = isRushed && selectedDateStr !== existingDateStr
    const showRemoveRush = isRushed && !dateChanged

    return (
      <div className="flex-1 flex flex-col min-w-0">
        <h3 className="text-center font-bold text-[14px] mb-4 tracking-[-0.02em]">{label}</h3>

        {/* Date Input */}
        <div className="mb-4">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                className="w-full h-[36px] rounded-md flex items-center justify-between px-3.5 cursor-pointer"
                style={{ background: '#FFFFFF', border: '1px solid #545F71' }}
              >
                <span className="text-[13px]" style={{ color: targetDate ? '#000000' : '#B4B0B0' }}>
                  {targetDate ? format(targetDate, "MM/dd/yyyy") : 'Select target delivery date'}
                </span>
                <CalendarIcon className="w-[18px] h-[18px]" style={{ color: '#CF0202' }} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-auto z-[110]" align="start" side="bottom">
              <Calendar
                mode="single"
                selected={targetDate}
                onSelect={(date) => {
                  setTargetDate(date)
                  if (date) setCalendarOpen(false)
                }}
                disabled={(date) => date < new Date()}
                initialFocus
                classNames={{
                  day_selected: "!bg-[#2563EB] !text-white hover:!bg-[#1d4ed8] hover:!text-white focus:!bg-[#2563EB] focus:!text-white",
                  day_today: "bg-accent text-accent-foreground",
                }}
              />
            </PopoverContent>
          </Popover>
          <p className="text-[10px] mt-1.5 ml-2.5" style={{ color: '#B4B0B0' }}>
            Lab working days: Monday - Friday (excluding holidays)
          </p>
        </div>

        {/* Rush Details Card */}
        <div className="px-5 py-4 rounded-md mb-4" style={{ border: '1px solid #FFE2E2' }}>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between">
              <span className="text-[13px]" style={labelStyle}>Days saved</span>
              <span className="text-[13px]" style={valueStyle}>{daysSaved} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[13px]" style={labelStyle}>Rush Percent</span>
              <span className="text-[13px]" style={valueStyle}>{rushPercentage} %</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[13px]" style={labelStyle}>Rush fee</span>
              <span className="text-[13px]" style={valueStyle}>$ {rushFee}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="h-[36px] px-6 rounded-md border-2 border-[#9BA5B7] bg-transparent flex items-center justify-center cursor-pointer"
          >
            <span className="text-[13px] font-bold text-[#9BA5B7] tracking-[-0.02em]">Cancel</span>
          </button>

          {showRemoveRush ? (
            <button
              onClick={handleRemove}
              className="h-[36px] px-4 rounded-md border-2 border-[#CF0202] bg-transparent flex items-center justify-center gap-2 cursor-pointer"
            >
              <X className="w-[14px] h-[14px]" style={{ color: '#CF0202' }} />
              <span className="text-[12px] font-bold text-[#CF0202] tracking-[-0.02em]">Remove Rush</span>
            </button>
          ) : (
            <button
              onClick={() => handleConfirm(arch)}
              disabled={!targetDate}
              className="h-[36px] px-4 rounded-md border-none flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              style={{ background: !targetDate ? '#9BA5B7' : '#CF0202' }}
            >
              <span className="text-[12px] font-bold text-white tracking-[-0.02em] whitespace-nowrap">Request rush</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="!z-[100]" />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-[101] translate-x-[-50%] translate-y-[-50%] p-0 overflow-hidden w-[94vw] max-w-[900px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          style={{
            maxHeight: '92vh',
            overflowY: 'auto',
            background: '#FFFFFF',
            border: '2px solid #CF0202',
            borderRadius: '6px',
            boxShadow: '9px 7px 21.6px rgba(0, 0, 0, 0.25)',
            fontFamily: 'Verdana',
          }}
        >
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none z-10 cursor-pointer">
            <X className="w-5 h-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          <div className="px-6 pt-6 pb-5">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 flex items-center justify-center">
                <RushIcon />
              </div>
              <h2 className="text-[15px] font-bold tracking-[-0.02em]">Rush Request</h2>
            </div>

            {/* Product Tabs */}
            {productTabs.length > 0 && (
              <div className="flex items-center gap-2 mb-5 flex-wrap">
                <span className="text-[14px] text-gray-700 mr-1">Select product to rush:</span>
                {productTabs.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveProductId(p.id)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors cursor-pointer ${
                      activeProductId === p.id
                        ? "bg-[#1162A8] text-white border-[#1162A8]"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {/* Two-column layout: Maxillary + Mandibular Rush */}
            <div className="flex gap-6">
              {renderArchColumn(
                "maxillary",
                "Maxillary Rush detail",
                maxTargetDate,
                setMaxTargetDate,
                maxCalendarOpen,
                setMaxCalendarOpen,
              )}

              {/* Vertical divider */}
              <div className="w-px bg-gray-200 flex-shrink-0" />

              {renderArchColumn(
                "mandibular",
                "Mandibular Rush detail",
                mandTargetDate,
                setMandTargetDate,
                mandCalendarOpen,
                setMandCalendarOpen,
              )}
            </div>

            {/* Important Information */}
            <div className="px-5 py-4 rounded-md mt-5" style={{ background: '#EDF7FF' }}>
              <div className="flex gap-2.5 items-start">
                <div className="w-[12px] h-[12px] rounded-full border border-[#1E1E1E] flex items-center justify-center text-[8px] mt-[4px] shrink-0">
                  ⓘ
                </div>
                <div>
                  <p className="text-[13px] font-bold tracking-[-0.02em] mb-1">Important information</p>
                  <p className="text-[12px] leading-[18px] tracking-[-0.02em]" style={{ color: '#000000' }}>
                    Rush requests are subject to lab capacity and technician availability. You will be notified if the request cannot be accommodated. Rush fees are non-refundable once work begins.
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
