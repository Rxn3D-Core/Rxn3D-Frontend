// components/print-preview-modal.tsx

"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Printer, X } from "lucide-react"
import { getCompleteTeethShadeString } from "@/utils/teeth-shade-utils"
import InteractiveDentalChart from "./interactive-dental-chart"

// Accepts dynamic caseData for full print preview
interface ProductAddOn {
  category: string
  addOn: string
  qty: number
}

interface Product {
  id: string
  name: string
  type: string
  teeth: string
  deliveryDate: string
  abbreviation: string
  color: string
  borderColor: string
  addOns: ProductAddOn[]
  stageNotesContent: string
  rushRequest?: { date: string, time?: string }
  maxillaryTeeth?: number[]
  mandibularTeeth?: number[]
  maxillaryConfig?: any
  mandibularConfig?: any
}

interface PrintPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  caseData: {
    lab: string
    address: string
    qrCode?: string
    office: string
    doctor: string
    patient: string
    pickupDate: string
    panNumber: string
    caseNumber: string
    slipNumber: string
    products: Product[]
    contact: string
    email: string
  }
}

export default function PrintPreviewModal({ isOpen, onClose, caseData }: PrintPreviewModalProps) {
  const handlePrint = () => {
    window.print()
  }

  // Utility: Returns formatted product chips (active/highlighted if first)
  const renderProductChips = () => (
    <div className="flex flex-col items-center">
      <div className="flex gap-2 flex-wrap justify-center">
        {caseData.products.map((prod, idx) => (
          <span
            key={prod.id}
            className={
              `px-3 py-1 rounded text-xs font-medium border 
              ${idx === 0 ? "bg-red-100 border-red-300 text-red-700" : "bg-gray-100 border-gray-300 text-gray-700"}
              `
            }
          >
            {prod.name}
          </span>
        ))}
      </div>
      <div className="mt-1 text-xs text-gray-600">{caseData.products.length} product{caseData.products.length > 1 ? "s" : ""} configured</div>
    </div>
  )

  // Utility: Render teeth SVG
  const renderDentalArch = (arch: "maxillary" | "mandibular", products: Product[]) => {
    const allTeeth =
      arch === "maxillary" ? Array.from({ length: 16 }, (_, i) => i + 1) : Array.from({ length: 16 }, (_, i) => i + 17)
    // Find all highlighted teeth numbers from all products for this arch
    const selectedTeeth = products.flatMap(prod =>
      (arch === "maxillary"
        ? (prod.maxillaryTeeth || [])
        : (prod.mandibularTeeth || [])
      ) || []
    )
    return (
      <svg width="120" height="80" viewBox="0 0 120 80" className="mx-auto">
        {/* Arch curve */}
        <path
          d={arch === "maxillary"
            ? "M 10 40 Q 60 10 110 40"
            : "M 10 40 Q 60 70 110 40"
          }
          fill="none"
          stroke="#ccc"
          strokeWidth="2"
        />
        {allTeeth.map((tooth, idx) => {
          const angle = (idx / 15) * Math.PI
          const x = 60 + Math.cos(
            arch === "maxillary"
              ? angle - Math.PI / 2
              : angle + Math.PI / 2
          ) * 45
          const y = 40 + Math.sin(
            arch === "maxillary"
              ? angle - Math.PI / 2
              : angle + Math.PI / 2
          ) * 25
          const isSelected = selectedTeeth.includes(tooth)
          return (
            <g key={tooth}>
              <circle
                cx={x}
                cy={y}
                r="6"
                fill={isSelected ? (arch === "maxillary" ? "#dc2626" : "#2563eb") : "#f3f4f6"}
                stroke={isSelected ? (arch === "maxillary" ? "#dc2626" : "#2563eb") : "#d1d5db"}
                strokeWidth="1"
              />
              <text
                x={x}
                y={y + 1}
                textAnchor="middle"
                fontSize="8"
                fill={isSelected ? "white" : "black"}
              >
                {tooth}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }

  // Main render
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0">
        <div className="flex flex-col h-[80vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold">Print Preview</h2>
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
              {/* Lab Header */}
              <div className="flex items-center justify-between border-b pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-white font-bold">HMC</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">{caseData.lab}</h1>
                    <p className="text-sm text-gray-600">{caseData.address}</p>
                  </div>
                </div>
                <div className="w-16 h-16 border-2 border-gray-300 flex items-center justify-center">
                  {/* QR or placeholder */}
                  {caseData.qrCode
                    ? <img src={caseData.qrCode} alt="QR Code" className="w-14 h-14" />
                    : <div className="text-xs text-center">QR Code</div>}
                </div>
              </div>

              {/* Case Info */}
              <div className="grid grid-cols-2 gap-8 mb-6">
                <div className="space-y-2 text-sm">
                  <div className="flex"><span className="w-16 font-medium">Office:</span><span>{caseData.office}</span></div>
                  <div className="flex"><span className="w-16 font-medium">Dr:</span><span>{caseData.doctor}</span></div>
                  <div className="flex"><span className="w-16 font-medium">Pt:</span><span>{caseData.patient}</span></div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex"><span className="w-20 font-medium">Pick up date:</span><span>{caseData.pickupDate}</span></div>
                  <div className="flex"><span className="w-20 font-medium">Pan#:</span><span>{caseData.panNumber}</span></div>
                  <div className="flex"><span className="w-20 font-medium">Case #:</span><span>{caseData.caseNumber}</span></div>
                  <div className="flex"><span className="w-20 font-medium">Slip #:</span><span>{caseData.slipNumber}</span></div>
                </div>
              </div>

               {/* RUSH CASE DESIGN BANNER */}
               {caseData.products.some(prod => prod.rushRequest) && (
                <div className="flex justify-center mb-4">
                  <span className="bg-red-600 text-white px-4 py-2 rounded text-lg font-bold flex items-center gap-2">
                    <span className="animate-pulse">⚡</span> RUSH CASE DESIGN
                  </span>
                </div>
              )}

              {/* Dental Chart & Case Design */}
              <div className="grid grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <h3 className="font-medium mb-2">Maxillary</h3>
                  <div className="relative">
                    <InteractiveDentalChart
                      type="maxillary"
                      selectedTeeth={caseData.products.flatMap(p => p.maxillaryTeeth || [])}
                      onToothToggle={() => {}} // No-op, disables click
                      title=""
                      productTeethMap={{}}
                      productButtons={[]}
                      visibleArch="upper"
                      onProductButtonClick={() => {}}
                      isCaseSubmitted={true}
                    />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="font-medium mb-2">Case Design</h3>
                  {renderProductChips()}
                </div>
                <div className="text-center">
                  <h3 className="font-medium mb-2">Mandibular</h3>
                  <div className="relative">
                    <InteractiveDentalChart
                      type="mandibular"
                      selectedTeeth={caseData.products.flatMap(p => p.mandibularTeeth || [])}
                      onToothToggle={() => {}} // No-op, disables click
                      title=""
                      productTeethMap={{}}
                      productButtons={[]}
                      visibleArch="lower"
                      onProductButtonClick={() => {}}
                      isCaseSubmitted={true}
                    />
                  </div>
                </div>
              </div>


              {/* Product Details */}
              <div className="space-y-4">
                {caseData.products.map((prod, idx) => (
                  <div
                    key={prod.id}
                    className={
                      `border rounded-lg p-4
                      ${prod.rushRequest ? "border-red-300 bg-red-50" : ""}
                      `
                    }
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium flex items-center gap-2">
                        {prod.name}
                        {prod.rushRequest && (
                          <span className="text-red-600 text-sm">⚡</span>
                        )}
                      </h3>
                      <div className={`text-sm font-medium ${prod.rushRequest ? "text-red-600" : "text-gray-600"}`}>
                        {prod.rushRequest
                          ? `RUSH REQUEST: ${prod.rushRequest.date}${prod.rushRequest.time ? " @ " + prod.rushRequest.time : ""}`
                          : prod.deliveryDate
                            ? `Delivery date: ${prod.deliveryDate}`
                            : ""}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                      <div className="col-span-2"><span className="font-medium">Teeth:</span> {prod.teeth}</div>
                      <div><span className="font-medium">Teeth Shade:</span> {getCompleteTeethShadeString(prod.maxillaryConfig?.teethShadePart1 || "", prod.maxillaryConfig?.teethShadePart2 || "")}</div>
                      <div>
                        {prod.addOns && (() => {
                          // Handle both array format and object format with maxillary/mandibular
                          let allAddOns = [];
                          if (Array.isArray(prod.addOns)) {
                            allAddOns = prod.addOns;
                          } else if (prod.addOns && typeof prod.addOns === 'object') {
                            allAddOns = [
                              ...(Array.isArray(prod.addOns.maxillary) ? prod.addOns.maxillary : []),
                              ...(Array.isArray(prod.addOns.mandibular) ? prod.addOns.mandibular : [])
                            ];
                          }
                          
                          if (allAddOns.length > 0) {
                            return (
                              <>
                                <span className="font-medium">Add-ons:</span>
                                {" " + allAddOns.map(a => `${a.qty}x ${a.addOn || a.name}`).join(", ")}
                              </>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                      <div className="col-span-2"><span className="font-medium">Grade:</span> {prod.maxillaryConfig?.grade}</div>
                      <div><span className="font-medium">Gum Shade:</span> {prod.maxillaryConfig?.gumShadePart1} {prod.maxillaryConfig?.gumShadePart2}</div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                      <div className="col-span-2"><span className="font-medium">Stage:</span> {prod.maxillaryConfig?.stage}</div>
                      <div><span className="font-medium">Impression:</span> {prod.maxillaryConfig?.impression}</div>
                    </div>
                    {/* Stage notes box */}
                    <div className={`p-2 rounded mt-3 text-sm ${prod.rushRequest ? "bg-red-100" : "bg-gray-100"}`}>
                      <p>
                        {prod.stageNotesContent}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
                <div className="flex justify-between items-center">
                  <span>Page 1 of 1</span>
                  <span>
                    Lab Phone: {caseData.contact} • Email: {caseData.email}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
