"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Search, Printer, Send, RotateCcw, Eye, Edit, Trash, AlertCircle } from "lucide-react"
import { PaymentDialog } from "@/components/payment-dialog"
import { PaymentSuccessModal } from "@/components/payment-success-modal"

interface BillingItem {
  id: string
  officeCode: string
  patient: string
  uid: string
  product: string
  grade: string
  stage: string
  total: number
  addOn: string
  qty: string
  bn: string
  dueDate: string
  status?: "Paid" | "Pending"
  transactionId?: string
}

export default function BillingPage() {
  const [billingData, setBillingData] = useState<BillingItem[]>([
    {
      id: "1",
      officeCode: "Bliss",
      patient: "test",
      uid: "U",
      product: "Full Denture Acrylic",
      grade: "Mid Grade",
      stage: "Custom Tray",
      total: 30,
      addOn: "--",
      qty: "--",
      bn: "0%",
      dueDate: "03/01/2025",
      status: "Pending",
    },
    {
      id: "2",
      officeCode: "Bliss",
      patient: "test",
      uid: "U",
      product: "Full Denture Acrylic",
      grade: "Mid Grade",
      stage: "Bite Block",
      total: 55,
      addOn: "--",
      qty: "--",
      bn: "0%",
      dueDate: "03/01/2025",
      status: "Pending",
    },
  ])

  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [lastPaymentAmount, setLastPaymentAmount] = useState(0)
  const [lastTransactionId, setLastTransactionId] = useState("")

  const totalAmount = billingData
    .filter((item) => selectedItems.includes(item.id))
    .reduce((sum, item) => sum + item.total, 0)

  const handleCheckboxChange = (id: string) => {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const handlePaymentSuccess = (itemIds: string[], transactionId: string) => {
    // Update the billing data to mark items as paid
    setBillingData((prevData) =>
      prevData.map((item) => (itemIds.includes(item.id) ? { ...item, status: "Paid", transactionId } : item)),
    )

    // Set data for success modal
    setLastPaymentAmount(totalAmount)
    setLastTransactionId(transactionId)

    // Clear selected items
    setSelectedItems([])

    // Show success modal
    setIsSuccessModalOpen(true)
  }

  const handleEditClick = (item: BillingItem) => {
    if (item.status === "Paid") {
      // If the item is paid, we don't allow editing
      return
    }

    // Here you would normally open an edit dialog or form
    alert(`Edit item: ${item.id} - ${item.product}`)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Select defaultValue="bliss">
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select office" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bliss">Bliss Dental LV</SelectItem>
              <SelectItem value="crown">Crown Dental</SelectItem>
              <SelectItem value="smile">Smile Dental</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input placeholder="Search..." className="pl-9 w-[300px]" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="today">
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-blue-800 text-white text-xs">
                <th className="px-4 py-2 text-left">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    onChange={() => {
                      // Only select items that are not paid
                      const unpaidItems = billingData.filter((item) => item.status !== "Paid").map((item) => item.id)

                      setSelectedItems(selectedItems.length === unpaidItems.length ? [] : unpaidItems)
                    }}
                  />
                </th>
                <th className="px-4 py-2 text-left">Office Code</th>
                <th className="px-4 py-2 text-left">Patient</th>
                <th className="px-4 py-2 text-left">U/L</th>
                <th className="px-4 py-2 text-left">Product</th>
                <th className="px-4 py-2 text-left">Grade</th>
                <th className="px-4 py-2 text-left">Stage</th>
                <th className="px-4 py-2 text-left">Total</th>
                <th className="px-4 py-2 text-left">Add on</th>
                <th className="px-4 py-2 text-left">Qty</th>
                <th className="px-4 py-2 text-left">B/N</th>
                <th className="px-4 py-2 text-left">Due Date</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {billingData.map((item) => (
                <tr key={item.id} className="text-sm hover:bg-gray-50">
                  <td className="px-4 py-2">
                    {item.status !== "Paid" && (
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleCheckboxChange(item.id)}
                      />
                    )}
                  </td>
                  <td className="px-4 py-2">{item.officeCode}</td>
                  <td className="px-4 py-2">{item.patient}</td>
                  <td className="px-4 py-2">{item.uid}</td>
                  <td className="px-4 py-2">{item.product}</td>
                  <td className="px-4 py-2">{item.grade}</td>
                  <td className="px-4 py-2">{item.stage}</td>
                  <td className={`px-4 py-2 ${item.status === "Paid" ? "font-semibold text-green-700" : ""}`}>
                    ${item.total}
                    {item.status === "Paid" && (
                      <span className="ml-2 inline-block">
                        <AlertCircle className="h-3 w-3 text-green-600" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">{item.addOn}</td>
                  <td className="px-4 py-2">{item.qty}</td>
                  <td className="px-4 py-2">{item.bn}</td>
                  <td className="px-4 py-2">{item.dueDate}</td>
                  <td className="px-4 py-2">
                    {item.status === "Paid" ? (
                      <Badge className="bg-green-100 text-green-800 border border-green-200">Paid</Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200">Pending</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 ${item.status === "Paid" ? "opacity-50 cursor-not-allowed" : ""}`}
                                onClick={() => handleEditClick(item)}
                                disabled={item.status === "Paid"}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TooltipTrigger>
                          {item.status === "Paid" && (
                            <TooltipContent>
                              <p>Paid records cannot be edited</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        disabled={item.status === "Paid"}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedItems.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm">
                Selected items: <span className="font-medium">{selectedItems.length}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  Total Amount: <span className="font-medium">${totalAmount}</span>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsPaymentOpen(true)}>
                  Pay Selected
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <PaymentDialog
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        amount={totalAmount}
        itemCount={selectedItems.length}
        selectedItems={selectedItems}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <PaymentSuccessModal
        open={isSuccessModalOpen}
        onOpenChange={setIsSuccessModalOpen}
        amount={lastPaymentAmount}
        transactionId={lastTransactionId}
      />
    </div>
  )
}
