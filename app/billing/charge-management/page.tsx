"use client"

import { useState } from "react"
import { Breadcrumb } from "@/components/breadcrumb"
import { Filter, Search, Calendar, Download, RefreshCw, Send, CheckCircle, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function ChargeManagementPage() {
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  const charges = [
    {
      id: "1",
      officeCode: "SRD",
      patient: "Maria Pavlova",
      ul: "L",
      product: "Implant Support Full Denture",
      grade: "Mid Grade",
      stage: "Straight to finish",
      baseTotal: "$99",
      addOn: "-",
      qty: "-",
      subTotal: "-",
      rPercent: "-",
      gross: "$99",
      dueDate: "01/03/25",
      status: "Unbilled",
    },
    {
      id: "2",
      officeCode: "SRD",
      patient: "Maria Pavlova",
      ul: "U",
      product: "Add tooth to Acrylic",
      grade: "-",
      stage: "Finish",
      baseTotal: "$99",
      addOn: "EAT",
      qty: "3",
      subTotal: "$27",
      rPercent: "40%",
      gross: "$176.4",
      dueDate: "01/03/25",
      status: "Checked",
    },
    {
      id: "3",
      officeCode: "SRD",
      patient: "Maria Pavlova",
      ul: "U",
      product: "Metal Frame Acrylic",
      grade: "Mid Grade",
      stage: "Bite Block",
      baseTotal: "$99",
      addOn: "JL\nAS\nHS",
      qty: "2\n2\n2",
      subTotal: "$50\n$60\n$90",
      rPercent: "-",
      gross: "$299",
      dueDate: "01/07/25",
      status: "Billed",
    },
    {
      id: "4",
      officeCode: "RDS",
      patient: "Christina Perri",
      ul: "L",
      product: "Full Denture Acrylic",
      grade: "Mid Grade",
      stage: "Bite Block",
      baseTotal: "$99",
      addOn: "-",
      qty: "-",
      subTotal: "-",
      rPercent: "-",
      gross: "$99",
      dueDate: "01/07/25",
      status: "Paid",
    },
    {
      id: "5",
      officeCode: "CRD",
      patient: "Matt Damon",
      ul: "L",
      product: "Single Crown",
      grade: "Premium",
      stage: "Finish",
      baseTotal: "$99",
      addOn: "-",
      qty: "-",
      subTotal: "-",
      rPercent: "-",
      gross: "$99",
      dueDate: "01/09/25",
      status: "Refunded",
    },
    {
      id: "6",
      officeCode: "RDS",
      patient: "Angelica Panagniban",
      ul: "U",
      product: "Full Denture Acrylic",
      grade: "Mid Grade",
      stage: "Bite Block",
      baseTotal: "$99",
      addOn: "-",
      qty: "-",
      subTotal: "-",
      rPercent: "-",
      gross: "$99",
      dueDate: "01/22/25",
      status: "Disputed",
    },
    {
      id: "7",
      officeCode: "CRD",
      patient: "Cynthia Gutierrez",
      ul: "U",
      product: "Single Crown",
      grade: "Premium",
      stage: "Finish",
      baseTotal: "$99",
      addOn: "-",
      qty: "-",
      subTotal: "-",
      rPercent: "10%",
      gross: "$108.9",
      dueDate: "01/23/25",
      status: "Unbilled",
    },
    {
      id: "8",
      officeCode: "RDS",
      patient: "Graciaa Pascial",
      ul: "U",
      product: "Full Denture Acrylic",
      grade: "Mid Grade",
      stage: "Bite Block",
      baseTotal: "$99",
      addOn: "-",
      qty: "-",
      subTotal: "-",
      rPercent: "100%",
      gross: "$198",
      dueDate: "01/24/25",
      status: "Unbilled",
    },
    {
      id: "9",
      officeCode: "SRD",
      patient: "Gricelda Sorto",
      ul: "L",
      product: "Implant Support Full Denture",
      grade: "Mid Grade",
      stage: "Straight to finish",
      baseTotal: "$99",
      addOn: "-",
      qty: "-",
      subTotal: "-",
      rPercent: "-",
      gross: "$99",
      dueDate: "01/03/25",
      status: "Unbilled",
    },
    {
      id: "10",
      officeCode: "SRD",
      patient: "Samantha Marie",
      ul: "L",
      product: "Implant Support Full Denture",
      grade: "Mid Grade",
      stage: "Straight to finish",
      baseTotal: "$99",
      addOn: "-",
      qty: "-",
      subTotal: "-",
      rPercent: "-",
      gross: "$99",
      dueDate: "01/03/25",
      status: "Unbilled",
    },
    {
      id: "11",
      officeCode: "SRD",
      patient: "Thomas Acuela",
      ul: "U",
      product: "Add tooth to Acrylic",
      grade: "-",
      stage: "Finish",
      baseTotal: "$99",
      addOn: "EAT",
      qty: "3",
      subTotal: "$27",
      rPercent: "40%",
      gross: "$176.4",
      dueDate: "01/03/25",
      status: "Checked",
    },
    {
      id: "12",
      officeCode: "SRD",
      patient: "Lacoste Thompson",
      ul: "U",
      product: "Metal Frame Acrylic",
      grade: "Mid Grade",
      stage: "Bite Block",
      baseTotal: "$99",
      addOn: "JL\nAS\nHS",
      qty: "2\n2\n2",
      subTotal: "$50\n$60\n$90",
      rPercent: "-",
      gross: "$299",
      dueDate: "01/07/25",
      status: "Billed",
    },
    {
      id: "13",
      officeCode: "RDS",
      patient: "Stephen John",
      ul: "L",
      product: "Full Denture Acrylic",
      grade: "Mid Grade",
      stage: "Bite Block",
      baseTotal: "$99",
      addOn: "-",
      qty: "-",
      subTotal: "-",
      rPercent: "-",
      gross: "$99",
      dueDate: "01/07/25",
      status: "Paid",
    },
  ]

  const toggleSelectAll = () => {
    if (selectedItems.length === charges.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(charges.map(charge => charge.id))
    }
  }

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Checked":
        return "bg-[#D4F4DD] text-[#14804A]"
      case "Billed":
        return "bg-[#CCE0FF] text-[#004FC4]"
      case "Paid":
        return "bg-[#D4F4DD] text-[#14804A]"
      case "Refunded":
        return "bg-[#FFD6D9] text-[#E12D39]"
      case "Disputed":
        return "bg-[#FFECCC] text-[#CC6600]"
      case "Unbilled":
        return "bg-[#E5E7EB] text-[#4B5563]"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="w-full h-full bg-[#F8F9FA]">
      <div className="px-6 py-6">
        {/* Header with Breadcrumb */}
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-[#1A1A1A] mb-3">Lab Admin</h1>
          <Breadcrumb />
        </div>

        {/* Filters Section */}
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-[320px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
            <Input
              type="text"
              placeholder="Search by patient, office, doctor, case..."
              className="w-full pl-10 h-10 text-sm"
            />
          </div>

          <div className="relative w-[200px]">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
            <Input
              type="text"
              placeholder="Select Date Range"
              className="w-full pl-10 h-10 text-sm"
            />
          </div>

          <Select>
            <SelectTrigger className="w-[200px] h-10 text-sm">
              <SelectValue placeholder="Select Office/Lab" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="srd">SRD Office</SelectItem>
              <SelectItem value="crd">CRD Office</SelectItem>
              <SelectItem value="rds">RDS Office</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="ml-auto h-10 text-sm gap-2">
            <Filter className="h-4 w-4" />
            Advance Filter
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex items-center gap-2">
          <Button className="h-10 text-sm gap-2">
            <Download className="h-4 w-4" />
            Generate Statement
          </Button>
          <Button variant="outline" className="h-10 text-sm gap-2">
            <Send className="h-4 w-4" />
            Send to Office
          </Button>
          <Button variant="outline" className="h-10 text-sm gap-2">
            <CheckCircle className="h-4 w-4" />
            Mark Checked
          </Button>
          <Button variant="outline" className="h-10 text-sm gap-2">
            <CheckCircle className="h-4 w-4" />
            Mark as Billed
          </Button>
          <Button variant="outline" className="h-10 text-sm gap-2">
            <CheckCircle className="h-4 w-4" />
            Mark as Refund
          </Button>
          <Button variant="outline" className="h-10 text-sm gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh Charges
          </Button>
        </div>

        {/* Charges Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200 bg-white hover:bg-white">
                <TableHead className="w-12 py-3">
                  <Checkbox
                    checked={selectedItems.length === charges.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Office Code</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Patient</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">U/L</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Product</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Grade</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Stage</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Base total</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Add-on</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">QTY</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Sub Total</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">R%</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Gross</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Due Date</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Status</TableHead>
                <TableHead className="py-3 text-xs font-semibold text-gray-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {charges.map((charge, index) => (
                <TableRow
                  key={charge.id}
                  className={`border-b border-gray-100 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  }`}
                >
                  <TableCell className="py-3">
                    <Checkbox
                      checked={selectedItems.includes(charge.id)}
                      onCheckedChange={() => toggleSelectItem(charge.id)}
                    />
                  </TableCell>
                  <TableCell className="py-3 text-sm font-medium text-gray-900">
                    {charge.officeCode}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-gray-900">
                    {charge.patient}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-gray-900">
                    {charge.ul}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-gray-900">
                    {charge.product}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-gray-900">
                    {charge.grade}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-gray-900">
                    {charge.stage}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-gray-900">
                    {charge.baseTotal}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-gray-900">
                    {charge.addOn.split('\n').map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-gray-900">
                    {charge.qty.split('\n').map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-gray-900">
                    {charge.subTotal.split('\n').map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-gray-900">
                    {charge.rPercent}
                  </TableCell>
                  <TableCell className="py-3 text-sm font-medium text-gray-900">
                    {charge.gross}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-gray-900">
                    {charge.dueDate}
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge className={getStatusColor(charge.status)}>
                      {charge.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-800">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-800">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-800">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-800">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
