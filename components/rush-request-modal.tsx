// components/RushRequestModal.tsx

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
      <DialogContent className="w-[95vw] max-w-md sm:w-full sm:max-w-lg md:max-w-md p-0 rounded-2xl overflow-hidden shadow-2xl mx-4 sm:mx-0">
        <DialogHeader className="bg-white p-4 sm:p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <span className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </span>
            <span className="tracking-wide font-semibold">RUSH REQUEST</span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 sm:p-6 pt-3 space-y-4 sm:space-y-6 bg-white">
          {/* Product Detail */}
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-100">
            <div className="font-semibold mb-3 text-sm sm:text-base">Product Detail</div>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Product</span>
                <span>{product.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current Stage</span>
                <span>{product.stage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Original Delivery</span>
                <span>
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
              <div className="flex justify-between">
                <span className="text-gray-600">Original Price</span>
                <span>${product.price}</span>
              </div>
            </div>
          </div>

          {/* Rush Detail */}
          <div>
            <div className="font-semibold mb-3 text-sm sm:text-base">Rush detail</div>
            <div className="space-y-4">
              {/* Calendar */}
              <div>
                <Label htmlFor="targetDate" className="mb-1 block text-sm sm:text-base">
                  Select target delivery date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full flex justify-between items-center bg-white pr-3 text-left font-normal border-gray-200"
                    >
                      {targetDate ? (
                        <span>{format(targetDate, "PPP")}</span>
                      ) : (
                        <span className="text-gray-400">Pick a date</span>
                      )}
                      <CalendarIcon className="ml-2 h-4 w-4 text-red-500" />
                    </Button>
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
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">Lab working days: Monday - Friday (excluding holidays)</p>
              </div>

              {/* Rush Details Card */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-100">
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Days saved</span>
                    <span>{daysSaved} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rush Percentage</span>
                    <span>{rushPercentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rush fee</span>
                    <span>${rushFee}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-sm sm:text-base">
                    <span>Total Price</span>
                    <span>${product.price + rushFee}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="rounded-lg px-4 py-2 text-sm w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm flex items-center gap-1 shadow w-full sm:w-auto"
            >
              <Zap className="w-4 h-4" />
              Confirm Rush Request
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
