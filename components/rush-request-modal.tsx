// components/RushRequestModal.tsx

"use client"

import { useState } from "react"
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Calendar as CalendarIcon, Zap } from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface RushRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (rushData: any) => void
  product: {
    name: string
    stage: string
    deliveryDate: string // ISO string
    price: number
  }
}

export default function RushRequestModal({ isOpen, onClose, onConfirm, product }: RushRequestModalProps) {
  const [targetDate, setTargetDate] = useState<Date | undefined>()
  const [daysSaved] = useState(11)
  const [rushPercentage] = useState(50)
  const [rushFee] = useState(50)

  const handleConfirm = () => {
    const rushData = {
      targetDate: targetDate ? format(targetDate, "yyyy-MM-dd") : null,
      daysSaved,
      rushPercentage,
      rushFee,
      totalPrice: product.price + rushFee,
    }
    onConfirm(rushData)
    onClose()
  }

  const labelStyle = { fontWeight: 700, lineHeight: '22px', letterSpacing: '-0.02em', color: '#545F71' } as const
  const valueStyle = { fontWeight: 400, lineHeight: '22px', letterSpacing: '-0.02em', color: '#000000' } as const

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="!z-[100]" />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-[101] translate-x-[-50%] translate-y-[-50%] p-0 overflow-hidden w-[94vw] max-w-[540px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
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
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none z-10">
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
          <div className="px-6 pt-6 pb-5">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-7">
              <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: '#CF0202' }}>
                <Zap className="w-5 h-5" style={{ color: '#FFFFFF', strokeWidth: '2px' }} />
              </div>
              <h2 className="text-[15px] font-bold tracking-[-0.02em]">RUSH REQUEST</h2>
            </div>

            {/* Product Detail */}
            <p className="text-[13px] font-bold mb-3 tracking-[-0.02em]">Product Detail</p>
            <div className="px-6 py-4 rounded-md mb-5" style={{ background: '#F9F9F9' }}>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between">
                  <span className="text-[13px]" style={labelStyle}>Product</span>
                  <span className="text-[13px]" style={valueStyle}>{product.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[13px]" style={labelStyle}>Current Stage</span>
                  <span className="text-[13px]" style={valueStyle}>{product.stage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[13px]" style={labelStyle}>Original Delivery</span>
                  <span className="text-[13px]" style={valueStyle}>{product.deliveryDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[13px]" style={labelStyle}>Original Price</span>
                  <span className="text-[13px]" style={valueStyle}>$ {product.price}</span>
                </div>
              </div>
            </div>

            {/* Rush Detail */}
            <p className="text-[13px] font-bold mb-3 tracking-[-0.02em]">Rush detail</p>

            {/* Date Input */}
            <div className="mb-6">
              <Popover>
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
                    onSelect={setTargetDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-[10px] mt-1.5 ml-2.5" style={{ color: '#B4B0B0' }}>
                Lab working days: Monday - Friday (excluding holidays)
              </p>
            </div>

            {/* Rush Details Card */}
            <div className="px-6 py-4 rounded-md mb-5" style={{ border: '1px solid #FFE2E2' }}>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between">
                  <span className="text-[13px]" style={labelStyle}>Days saved</span>
                  <span className="text-[13px]" style={valueStyle}>{daysSaved} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[13px]" style={labelStyle}>Rush Percentage</span>
                  <span className="text-[13px]" style={valueStyle}>{rushPercentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[13px]" style={labelStyle}>Rush fee</span>
                  <span className="text-[13px]" style={valueStyle}>$ {rushFee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[13px]" style={labelStyle}>Total Price</span>
                  <span className="text-[13px]" style={valueStyle}>$ {product.price + rushFee}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3.5 mb-5 justify-center">
              <button
                onClick={onClose}
                className="h-[38px] w-[130px] rounded-md border-2 border-[#9BA5B7] bg-transparent flex items-center justify-center cursor-pointer"
              >
                <span className="text-[13px] font-bold text-[#9BA5B7] tracking-[-0.02em]">Cancel</span>
              </button>
              <button
                onClick={handleConfirm}
                className="h-[38px] w-[190px] rounded-md bg-[#CF0202] border-none flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-[18px] h-[18px]" style={{ color: '#FFFFFF', strokeWidth: '2px' }} />
                <span className="text-[13px] font-bold text-white tracking-[-0.02em]">Confirm Rush Request</span>
              </button>
            </div>

            {/* Important Information */}
            <div className="px-5 py-4 rounded-md" style={{ background: '#EDF7FF' }}>
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
