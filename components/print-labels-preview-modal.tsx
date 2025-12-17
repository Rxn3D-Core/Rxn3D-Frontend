"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Printer, X } from "lucide-react"

interface PrintLabelsPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  slipData: any
  selectedSlots: boolean[] // Array indicating which of the 8 slots are selected
}

export default function PrintLabelsPreviewModal({
  isOpen,
  onClose,
  slipData,
  selectedSlots,
}: PrintLabelsPreviewModalProps) {
  const handlePrint = () => {
    window.print()
  }

  // Default slip data for labels if slipData is not fully populated
  const defaultSlipData = {
    office: "HMD",
    doctor: "Cody Mugglestone",
    patient: "Mary Gutierrez",
    stage: "FR-SC-FD-BB",
    pickupDate: "01/08/2025",
    deliveryDate: "01/25/2025 @ 4pm",
    panNumber: "0080",
    caseNumber: "C0123456",
    slipNumber: "S01234568",
  }

  const currentSlipData = slipData || defaultSlipData

  const LabelContent = ({ data }: { data: typeof defaultSlipData }) => (
    <div className="flex flex-col p-2 border border-gray-200 rounded-sm text-[8px] leading-tight h-[1.7in] w-[3.4in] overflow-hidden">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-[6px]">HMC</span>
          </div>
          <span className="font-bold text-[8px]">HMC INNOVS LLC</span>
        </div>
        <div className="w-8 h-8 border border-gray-300 flex items-center justify-center flex-shrink-0">
          <div className="text-[6px] text-center">QR Code</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        <div className="flex">
          <span className="font-medium w-6">OFC:</span>
          <span>{data.office}</span>
        </div>
        <div className="flex">
          <span className="font-medium w-8">PAN#:</span>
          <span>{data.panNumber}</span>
        </div>
        <div className="flex">
          <span className="font-medium w-6">PT:</span>
          <span>{data.patient}</span>
        </div>
        <div className="flex">
          <span className="font-medium w-8">CASE#:</span>
          <span>{data.caseNumber}</span>
        </div>
        <div className="flex">
          <span className="font-medium w-6">DR:</span>
          <span>{data.doctor}</span>
        </div>
        <div className="flex">
          <span className="font-medium w-8">SLIP#:</span>
          <span>{data.slipNumber}</span>
        </div>
        <div className="flex">
          <span className="font-medium w-6">Stage:</span>
          <span>{data.stage}</span>
        </div>
        <div className="flex">
          <span className="font-medium w-8">PKU:</span>
          <span>{data.pickupDate}</span>
        </div>
        <div className="flex">
          <span className="font-medium w-6">DEL:</span>
          <span>{data.deliveryDate}</span>
        </div>
      </div>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0">
        <div className="flex flex-col h-[80vh]">
          {/* Header with close and print buttons */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold">Print Labels Preview</h2>
            <div className="flex items-center gap-2">
              <Button onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Print Preview Document */}
          <div className="flex-1 bg-gray-100 p-6 overflow-y-auto print:overflow-visible print:p-0">
            <div className="bg-white shadow-lg mx-auto w-full max-w-[8.5in] min-h-[11in] p-6 print:shadow-none print:p-0 print:w-auto">
              <div
                className="grid grid-cols-2 gap-4 print:gap-2"
                style={{ gridTemplateColumns: "repeat(2, 3.4in)", gridAutoRows: "1.7in" }}
              >
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className={`${selectedSlots[index] ? "" : "opacity-0 print:hidden"}`}>
                    <LabelContent data={currentSlipData} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
