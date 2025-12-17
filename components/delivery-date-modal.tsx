"use client"

import { useState, useEffect } from "react"
import { X, Calendar, Clock, Zap, EllipsisVertical, Phone } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DeliveryDateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientName: string
  caseStage: string
  pickupDate: string
  deliveryDate: string
  deliveryTime: string
  isRush: boolean
  onSave: (data: { deliveryDate: string; deliveryTime: string; notes: string }) => void
}

const mockDateChangeHistory = [
  {
    id: "h1",
    date: "01/03/15",
    time: "2:26pm",
    user: "Heide Cosa",
    slip: "# 665479",
    stage: "Try in with teeth",
    pickupDate: "01/13/2025 @ 4pm",
    notes: "Case not ready for pick up. Will attempt another pick up 01/04.",
    isEdited: false,
  },
  {
    id: "h2",
    date: "01/02/15",
    time: "10:00am",
    user: "John Doe",
    slip: "# 665479",
    stage: "Wax Try-in",
    pickupDate: "01/10/2025 @ 10am",
    notes: "Patient requested earlier delivery due to travel.",
    isEdited: true,
  },
]

export function DeliveryDateModal({
  open,
  onOpenChange,
  patientName,
  caseStage,
  pickupDate,
  deliveryDate,
  deliveryTime,
  isRush,
  onSave,
}: DeliveryDateModalProps) {
  const [currentDeliveryDate, setCurrentDeliveryDate] = useState(deliveryDate)
  const [currentDeliveryTime, setCurrentDeliveryTime] = useState(deliveryTime)
  const [deliveryNotes, setDeliveryNotes] = useState("")

  useEffect(() => {
    if (open) {
      setCurrentDeliveryDate(deliveryDate)
      setCurrentDeliveryTime(deliveryTime)
      setDeliveryNotes("") // Reset notes when modal opens
    }
  }, [open, deliveryDate, deliveryTime])

  const handleSave = () => {
    onSave({ deliveryDate: currentDeliveryDate, deliveryTime: currentDeliveryTime, notes: deliveryNotes })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 rounded-2xl shadow-2xl flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              Select Pick up Date
            </DialogTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <DialogDescription className="text-gray-500 mt-2">
            <p>
              Patient: <span className="font-semibold text-gray-800">{patientName}</span>
            </p>
            <p className="flex items-center gap-1">
              Stage: <span className="font-semibold text-gray-800">{caseStage}</span>
              <span className="ml-4 flex items-center gap-1 text-gray-600">
                <Calendar className="w-4 h-4" /> {pickupDate}
              </span>
              {isRush && (
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  <Zap className="w-3 h-3 mr-1" /> RUSH
                </span>
              )}
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Select Delivery Date</h3>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Input
                  type="date"
                  value={currentDeliveryDate}
                  onChange={(e) => setCurrentDeliveryDate(e.target.value)}
                  className="pr-8"
                />
                <Calendar className="absolute right-2 top-2 h-4 w-4 text-gray-500" />
              </div>
              <div className="relative flex-1">
                <Input
                  type="time"
                  value={currentDeliveryTime}
                  onChange={(e) => setCurrentDeliveryTime(e.target.value)}
                  className="pr-8"
                />
                <Clock className="absolute right-2 top-2 h-4 w-4 text-gray-500" />
              </div>
            </div>
            <div className="mt-4">
              <Textarea
                placeholder="Enter delivery date notes*"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            {isRush && (
              <p className="mt-3 text-sm text-red-600">
                This case is marked rush. Changing the date will affect rush status and price.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Date Change History</h3>
            <div className="space-y-4">
              {mockDateChangeHistory.map((entry) => (
                <div key={entry.id} className="relative p-3 border rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="font-semibold">
                      {entry.date} @ {entry.time}
                    </span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <EllipsisVertical className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-1" align="end">
                        <Button variant="ghost" className="w-full justify-start text-sm px-3 py-1.5 h-auto">
                          Edit
                        </Button>
                        <Button variant="ghost" className="w-full justify-start text-sm px-3 py-1.5 h-auto">
                          Mark as resolved
                        </Button>
                        <Button variant="ghost" className="w-full justify-start text-sm px-3 py-1.5 h-auto">
                          Mark as follow up
                        </Button>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 mb-2">
                    <span>{entry.user}</span>
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Slip #: {entry.slip}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Zap className="w-3 h-3 text-red-500" /> {entry.stage}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {entry.pickupDate}
                    </span>
                    {entry.isEdited && (
                      <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                        EDITED
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{entry.notes}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-2xl flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="px-4 py-2">
            Cancel
          </Button>
          <Button className="bg-[#1162a8] hover:bg-[#0f5490] text-white px-4 py-2" onClick={handleSave}>
            Save Date
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
