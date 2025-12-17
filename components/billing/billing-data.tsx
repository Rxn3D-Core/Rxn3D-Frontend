"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BillingDataTable } from "./billing-data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, Download } from "lucide-react"

// Define the billing data type
type BillingItem = {
  id: string
  date: string
  type: "slip-request" | "storage-fee" | "credit-purchase" | "invoice"
  description: string
  credits?: number
  amount: number
  status: "paid" | "pending" | "overdue"
  dueDate?: string
}

// Sample billing data
const billingData: BillingItem[] = [
  {
    id: "BIL-2025-001",
    date: "2025-03-01",
    type: "slip-request",
    description: "Slip Request - #015406",
    credits: 16,
    amount: 0.16,
    status: "paid",
  },
  {
    id: "BIL-2025-002",
    date: "2025-03-01",
    type: "storage-fee",
    description: "Storage Fee - 25MB",
    credits: 5,
    amount: 0.05,
    status: "paid",
  },
  {
    id: "BIL-2025-003",
    date: "2025-03-01",
    type: "credit-purchase",
    description: "Credit Purchase - Standard Package",
    credits: 1000,
    amount: 10.0,
    status: "paid",
  },
  {
    id: "BIL-2025-004",
    date: "2025-02-28",
    type: "slip-request",
    description: "Slip Request - #015405",
    credits: 16,
    amount: 0.16,
    status: "paid",
  },
  {
    id: "BIL-2025-005",
    date: "2025-02-15",
    type: "invoice",
    description: "Monthly Invoice - February 2025",
    amount: 75.0,
    status: "paid",
    dueDate: "2025-02-28",
  },
  {
    id: "BIL-2025-006",
    date: "2025-02-01",
    type: "credit-purchase",
    description: "Credit Purchase - Starter Package",
    credits: 500,
    amount: 5.0,
    status: "paid",
  },
  {
    id: "BIL-2025-007",
    date: "2025-01-15",
    type: "invoice",
    description: "Monthly Invoice - January 2025",
    amount: 48.5,
    status: "paid",
    dueDate: "2025-01-31",
  },
  {
    id: "BIL-2025-008",
    date: "2025-03-15",
    type: "invoice",
    description: "Monthly Invoice - March 2025",
    amount: 85.5,
    status: "pending",
    dueDate: "2025-03-31",
  },
]

// Define the columns for the billing table
const columns: ColumnDef<BillingItem>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => <div className="font-medium">{row.getValue("id")}</div>,
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => <div>{new Date(row.getValue("date")).toLocaleDateString()}</div>,
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.getValue("type") as string

      return (
        <Badge
          variant="outline"
          className={
            type === "slip-request"
              ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
              : type === "storage-fee"
                ? "bg-purple-100 text-purple-800 hover:bg-purple-100"
                : type === "credit-purchase"
                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                  : "bg-amber-100 text-amber-800 hover:bg-amber-100"
          }
        >
          {type === "slip-request"
            ? "Slip Request"
            : type === "storage-fee"
              ? "Storage Fee"
              : type === "credit-purchase"
                ? "Credit Purchase"
                : "Invoice"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => <div>{row.getValue("description")}</div>,
  },
  {
    accessorKey: "credits",
    header: "Credits",
    cell: ({ row }) => {
      const credits = row.getValue("credits")
      return credits ? <div>{credits}</div> : <div>-</div>
    },
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => <div>${Number(row.getValue("amount")).toFixed(2)}</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string

      return (
        <Badge
          variant="outline"
          className={
            status === "paid"
              ? "bg-green-100 text-green-800 hover:bg-green-100"
              : status === "pending"
                ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                : "bg-red-100 text-red-800 hover:bg-red-100"
          }
        >
          {status === "paid" ? "Paid" : status === "pending" ? "Pending" : "Overdue"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => {
      const dueDate = row.getValue("dueDate")
      return dueDate ? <div>{new Date(dueDate as string).toLocaleDateString()}</div> : <div>-</div>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      )
    },
  },
]

export function BillingData() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing History</CardTitle>
        <CardDescription>View all your billing transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <BillingDataTable
          columns={columns}
          data={billingData}
          searchKey="description"
          searchPlaceholder="Search billing items..."
        />
      </CardContent>
    </Card>
  )
}
