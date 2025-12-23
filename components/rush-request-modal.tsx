// components/RushRequestModal.tsx

"use client"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Calendar as CalendarIcon, Zap } from "lucide-react"
import { format, isValid, parseISO } from "date-fns"
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
  const [daysSaved, setDaysSaved] = useState(11)
  const [rushPercentage, setRushPercentage] = useState(50)
  const [rushFee, setRushFee] = useState(25)

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="p-0 overflow-hidden w-[95vw] sm:w-[619.2px]"
        style={{
          maxWidth: '619.2px',
          maxHeight: '95vh',
          overflowY: 'auto',
          background: '#FFFFFF',
          border: '2px solid #CF0202',
          borderRadius: '6px',
          filter: 'drop-shadow(9px 7px 21.6px rgba(0, 0, 0, 0.25))',
          fontFamily: 'Verdana',
        }}
      >
        {/* Header with Icon and Title */}
        <div className="px-3 sm:px-[23.2px] pt-3 sm:pt-[23.09px]">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-[44.66px]">
            <div
              className="w-8 h-8 sm:w-[41.22px] sm:h-[41.22px]"
              style={{
                background: '#CF0202',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#FFFFFF', strokeWidth: '2px' }} />
            </div>
            <h2
              className="text-sm sm:text-base"
              style={{
                fontWeight: 700,
                lineHeight: '22px',
                letterSpacing: '-0.02em',
                color: '#000000',
              }}
            >
              RUSH REQUEST
            </h2>
          </div>

          {/* Product Detail Section */}
          <div className="mb-3 sm:mb-[23.52px]">
            <h3
              className="text-xs sm:text-sm mb-2 sm:mb-[34.16px]"
              style={{
                fontWeight: 700,
                lineHeight: '22px',
                letterSpacing: '-0.02em',
                color: '#000000',
              }}
            >
              Product Detail
            </h3>
            <div
              className="px-3 sm:px-[67.47px] py-3 sm:py-[27.42px]"
              style={{
                background: '#F9F9F9',
                borderRadius: '6px',
              }}
            >
              <div className="flex flex-col gap-2 sm:gap-[32px]">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="sm:w-[135.53px] text-xs sm:text-sm" style={{
                    fontWeight: 700,
                    lineHeight: '22px',
                    letterSpacing: '-0.02em',
                    color: '#545F71',
                  }}>
                    Product
                  </span>
                  <span className="sm:w-[135.53px] text-xs sm:text-sm" style={{
                    fontWeight: 400,
                    lineHeight: '22px',
                    letterSpacing: '-0.02em',
                    color: '#000000',
                  }}>
                    {product.name}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="sm:w-[135.53px] text-xs sm:text-sm" style={{
                    fontWeight: 700,
                    lineHeight: '22px',
                    letterSpacing: '-0.02em',
                    color: '#545F71',
                  }}>
                    Current Stage
                  </span>
                  <span className="sm:w-[135.53px] text-xs sm:text-sm" style={{
                    fontWeight: 400,
                    lineHeight: '22px',
                    letterSpacing: '-0.02em',
                    color: '#000000',
                  }}>
                    {product.stage}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="sm:w-[135.53px] text-xs sm:text-sm" style={{
                    fontWeight: 700,
                    lineHeight: '22px',
                    letterSpacing: '-0.02em',
                    color: '#545F71',
                  }}>
                    Original Delivery
                  </span>
                  <span className="sm:w-[135.53px] text-xs sm:text-sm" style={{
                    fontWeight: 400,
                    lineHeight: '22px',
                    letterSpacing: '-0.02em',
                    color: '#000000',
                  }}>
                    {(() => {
                      try {
                        const date = parseISO(product.deliveryDate)
                        if (!isValid(date)) return "-"
                        return format(date, "MM/dd/yyyy 'at' h:mmaaa")
                      } catch {
                        return "-"
                      }
                    })()}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="sm:w-[135.53px] text-xs sm:text-sm" style={{
                    fontWeight: 700,
                    lineHeight: '22px',
                    letterSpacing: '-0.02em',
                    color: '#545F71',
                  }}>
                    Original Price
                  </span>
                  <span className="sm:w-[135.53px] text-xs sm:text-sm" style={{
                    fontWeight: 400,
                    lineHeight: '22px',
                    letterSpacing: '-0.02em',
                    color: '#000000',
                  }}>
                    $ {product.price}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Rush Detail Section */}
          <div className="mb-3 sm:mb-[27.54px]">
            <h3
              className="text-xs sm:text-sm mb-2 sm:mb-[30.35px]"
              style={{
                fontWeight: 700,
                lineHeight: '22px',
                letterSpacing: '-0.02em',
                color: '#000000',
              }}
            >
              Rush detail
            </h3>

            {/* Date Input */}
            <div className="mb-3 sm:mb-[57.25px]">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="w-full sm:w-[537px]"
                    style={{
                      height: '27px',
                      background: '#FFFFFF',
                      border: '1px solid #545F71',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 10px 0 14px',
                      cursor: 'pointer',
                    }}
                  >
                    <span className="text-xs sm:text-sm" style={{
                      fontWeight: 400,
                      lineHeight: '19px',
                      letterSpacing: '-0.02em',
                      color: targetDate ? '#000000' : '#B4B0B0',
                    }}>
                      {targetDate ? format(targetDate, "MM/dd/yyyy") : 'Select target delivery date'}
                    </span>
                    <CalendarIcon className="w-4 h-4 sm:w-[17px] sm:h-[17px]" style={{ color: '#CF0202' }} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-auto" align="start" side="bottom">
                  <Calendar
                    mode="single"
                    selected={targetDate}
                    onSelect={setTargetDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-[8px] sm:text-[10px] mt-1 sm:mt-[7.71px] ml-2 sm:ml-[11.36px]" style={{
                fontWeight: 400,
                lineHeight: '19px',
                letterSpacing: '-0.02em',
                color: '#B4B0B0',
              }}>
                Lab working days: Monday - Friday (excluding holidays)
              </p>
            </div>

            {/* Rush Details Card */}
            <div
              className="px-3 sm:px-[67.47px] py-3 sm:py-[27.42px]"
              style={{
                border: '1px solid #FFE2E2',
                borderRadius: '6px',
              }}
            >
              <div className="flex flex-col gap-2 sm:gap-[32px]">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="sm:w-[135.53px] text-xs sm:text-sm" style={{
                    fontWeight: 700,
                    lineHeight: '22px',
                    letterSpacing: '-0.02em',
                    color: '#545F71',
                  }}>
                    Days saved
                  </span>
                  <span className="sm:w-[135.53px] text-xs sm:text-sm" style={{
                    fontWeight: 400,
                    lineHeight: '22px',
                    letterSpacing: '-0.02em',
                    color: '#000000',
                  }}>
                    {daysSaved} days
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="sm:w-[135.53px] text-xs sm:text-sm" style={{
                    fontWeight: 700,
                    lineHeight: '22px',
                    letterSpacing: '-0.02em',
                    color: '#545F71',
                  }}>
                    Rush Percentage
                  </span>
                  <span className="sm:w-[135.53px] text-xs sm:text-sm" style={{
                    fontWeight: 400,
                    lineHeight: '22px',
                    letterSpacing: '-0.02em',
                    color: '#000000',
                  }}>
                    {rushPercentage}%
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="sm:w-[135.53px] text-xs sm:text-sm" style={{
                    fontWeight: 700,
                    lineHeight: '22px',
                    letterSpacing: '-0.02em',
                    color: '#545F71',
                  }}>
                    Rush fee
                  </span>
                  <span className="sm:w-[135.53px] text-xs sm:text-sm" style={{
                    fontWeight: 400,
                    lineHeight: '22px',
                    letterSpacing: '-0.02em',
                    color: '#000000',
                  }}>
                    $ {rushFee}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="sm:w-[135.53px] text-xs sm:text-sm" style={{
                    fontWeight: 700,
                    lineHeight: '22px',
                    letterSpacing: '-0.02em',
                    color: '#545F71',
                  }}>
                    Total Price
                  </span>
                  <span className="sm:w-[135.53px] text-xs sm:text-sm" style={{
                    fontWeight: 400,
                    lineHeight: '22px',
                    letterSpacing: '-0.02em',
                    color: '#000000',
                  }}>
                    $ {product.price + rushFee}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-[10.58px] mb-3 sm:mb-[23.55px] sm:pl-[124.61px]">
            <button
              onClick={onClose}
              className="w-full sm:w-[111px]"
              style={{
                height: '27px',
                border: '2px solid #9BA5B7',
                borderRadius: '6px',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 16px',
                cursor: 'pointer',
              }}
            >
              <span className="text-[10px] sm:text-xs" style={{
                fontWeight: 700,
                lineHeight: '22px',
                letterSpacing: '-0.02em',
                color: '#9BA5B7',
              }}>
                Cancel
              </span>
            </button>
            <button
              onClick={handleConfirm}
              className="w-full sm:w-[203px]"
              style={{
                height: '27px',
                background: '#CF0202',
                borderRadius: '6px',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 16px',
                gap: '10px',
                cursor: 'pointer',
              }}
            >
              <Zap className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: '#FFFFFF', strokeWidth: '2px' }} />
              <span className="text-[10px] sm:text-xs" style={{
                fontWeight: 700,
                lineHeight: '22px',
                letterSpacing: '-0.02em',
                color: '#FFFFFF',
              }}>
                Confirm Rush Request
              </span>
            </button>
          </div>

          {/* Important Information */}
          <div
            className="p-3 sm:p-[22.45px_25.28px] mb-3 sm:mb-0"
            style={{
              background: '#EDF7FF',
              borderRadius: '6px',
            }}
          >
            <div className="flex gap-2 sm:gap-[16.01px] items-start">
              <div style={{
                width: '11px',
                height: '11px',
                border: '1px solid #1E1E1E',
                borderRadius: '50%',
                marginTop: '6px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '8px',
              }}>
                ⓘ
              </div>
              <div>
                <h4 className="text-xs sm:text-sm mb-1 sm:mb-[4.97px]" style={{
                  fontWeight: 700,
                  lineHeight: '22px',
                  letterSpacing: '-0.02em',
                  color: '#000000',
                }}>
                  Important information
                </h4>
                <p className="text-xs sm:text-sm" style={{
                  fontWeight: 400,
                  lineHeight: '22px',
                  letterSpacing: '-0.02em',
                  color: '#000000',
                  maxWidth: '491.31px',
                }}>
                  Rush requests are subject to lab capacity and technician availability. You will be notified if the request cannot be accommodated. Rush fees are non-refundable once work begins.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
