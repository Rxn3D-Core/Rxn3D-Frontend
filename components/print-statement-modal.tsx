"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Printer, X } from "lucide-react"

interface PrintStatementModalProps {
  isOpen: boolean
  onClose: () => void
  slipData: any // Assuming slipData contains patient, office, doctor info
  products: any[] // Assuming products array contains product details
  rushRequests: { [key: string]: any } // Assuming rushRequests for rush status
}

// Helper function to format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
}

export default function PrintStatementModal({
  isOpen,
  onClose,
  slipData,
  products,
  rushRequests,
}: PrintStatementModalProps) {
  const handlePrint = () => {
    window.print()
  }

  // Dummy data for statement items, replace with actual logic to derive from products and slipData
  const statementItems = products.map((product) => {
    const isRush = !!rushRequests[product.id]
    const total = 75 // Placeholder for product total
    const addOnTotal = product.addOns.reduce((sum: number, ao: any) => sum + ao.qty * 10, 0) // Placeholder for add-on cost
    const totalWithAddOn = total + addOnTotal
    const dueDateTime = new Date(product.deliveryDate.replace(" at ", " "))
    const dueDate = formatDate(dueDateTime.toISOString().split("T")[0])

    return {
      patient: slipData?.patient || "N/A",
      ul:
        product.type.includes("Maxillary") && product.type.includes("Mandibular")
          ? "U/L"
          : product.type.includes("Maxillary")
            ? "U"
            : "L",
      productName: product.name,
      grade: product.maxillaryConfig.grade,
      stage: product.maxillaryConfig.stage,
      total: `$${total.toFixed(2)}`,
      addOn: addOnTotal > 0 ? `$${addOnTotal.toFixed(2)}` : "-",
      qty: 1, // Placeholder quantity
      totalR: `$${totalWithAddOn.toFixed(2)}`,
      dueDate: dueDate,
      finalTotal: `$${totalWithAddOn.toFixed(2)}`,
    }
  })

  const overallTotal = statementItems.reduce(
    (sum, item) => sum + Number.parseFloat(item.finalTotal.replace("$", "")),
    0,
  )
  const refund = 0 // Placeholder for refund
  const finalAmount = overallTotal - refund

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0">
        <div className="flex flex-col h-[80vh]">
          {/* Header with close and print buttons */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold">Print Statement</h2>
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
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-white font-bold">HMC</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">HMC INNOVS LLC</h1>
                    <p className="text-sm text-gray-600">3180 W Sahara Ave C26, 89102</p>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold">Statement</h2>
                  <p className="text-sm">No.17100</p>
                  <p className="text-sm">Date : {formatDate(new Date().toISOString().split("T")[0])}</p>
                </div>
              </div>

              {/* Office Details */}
              <div className="mb-6 text-sm">
                <p className="font-medium">Greater Las Vegas Dental</p>
                <p>8867 W Flamingo Rd # 100,</p>
                <p>89147</p>
              </div>

              {/* Statement Table */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="p-2 text-left">Patient</th>
                      <th className="p-2 text-left">U/L</th>
                      <th className="p-2 text-left">Product</th>
                      <th className="p-2 text-left">Grade</th>
                      <th className="p-2 text-left">Stage</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 text-right">Add on</th>
                      <th className="p-2 text-right">Qty</th>
                      <th className="p-2 text-right">Total R%</th>
                      <th className="p-2 text-left">Due Date</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementItems.map((item, index) => (
                      <tr key={index} className="border-b last:border-b-0">
                        <td className="p-2">{item.patient}</td>
                        <td className="p-2">{item.ul}</td>
                        <td className="p-2">{item.productName}</td>
                        <td className="p-2">{item.grade}</td>
                        <td className="p-2">{item.stage}</td>
                        <td className="p-2 text-right">{item.total}</td>
                        <td className="p-2 text-right">{item.addOn}</td>
                        <td className="p-2 text-right">{item.qty}</td>
                        <td className="p-2 text-right">{item.totalR}</td>
                        <td className="p-2">{item.dueDate}</td>
                        <td className="p-2 text-right">{item.finalTotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="flex justify-end">
                <div className="w-64 text-sm">
                  <div className="flex justify-between py-1">
                    <span>Total</span>
                    <span className="font-medium">${overallTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Refund</span>
                    <span className="font-medium">${refund.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-t pt-2 font-bold">
                    <span>Total</span>
                    <span>${finalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
                <div className="flex justify-between items-center">
                  <span>Page 1 of 1</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-6 w-6 p-0 bg-transparent">
                      -
                    </Button>
                    <span>1 of 1</span>
                    <Button variant="outline" size="sm" className="h-6 w-6 p-0 bg-transparent">
                      +
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
