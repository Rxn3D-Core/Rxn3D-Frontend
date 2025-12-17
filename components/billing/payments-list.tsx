"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, Download, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { BillingDataTable } from "./billing-data-table"
import type { ColumnDef } from "@tanstack/react-table"

// Define the payment data type
type Payment = {
  id: string
  date: string
  method: string
  amount: number
  status: "successful" | "pending" | "failed"
  type: "credit-purchase" | "invoice-payment" | "refund"
  description: string
}

// Sample payment data
const payments: Payment[] = [
  {
    id: "PAY-2025-001",
    date: "2025-03-01",
    method: "Visa •••• 4242",
    amount: 10.0,
    status: "successful",
    type: "credit-purchase",
    description: "Credit Purchase - Standard Package (1000 credits)",
  },
  {
    id: "PAY-2025-002",
    date: "2025-02-15",
    method: "Visa •••• 4242",
    amount: 75.0,
    status: "successful",
    type: "invoice-payment",
    description: "Invoice Payment - INV-2025-002",
  },
  {
    id: "PAY-2025-003",
    date: "2025-02-01",
    method: "Visa •••• 4242",
    amount: 5.0,
    status: "successful",
    type: "credit-purchase",
    description: "Credit Purchase - Starter Package (500 credits)",
  },
  {
    id: "PAY-2025-004",
    date: "2025-01-15",
    method: "Visa •••• 4242",
    amount: 45.0,
    status: "successful",
    type: "credit-purchase",
    description: "Credit Purchase - Premium Package (5000 credits)",
  },
  {
    id: "PAY-2025-005",
    date: "2025-01-10",
    method: "Visa •••• 4242",
    amount: 48.5,
    status: "successful",
    type: "invoice-payment",
    description: "Invoice Payment - INV-2025-001",
  },
  {
    id: "PAY-2025-006",
    date: "2025-01-05",
    method: "Visa •••• 4242",
    amount: -15.0,
    status: "successful",
    type: "refund",
    description: "Refund - Partial credit refund",
  },
]

// Define the columns for the payments table
const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: "id",
    header: "Payment ID",
    cell: ({ row }) => <div className="font-medium">{row.getValue("id")}</div>,
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => <div>{new Date(row.getValue("date")).toLocaleDateString()}</div>,
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => <div>{row.getValue("description")}</div>,
  },
  {
    accessorKey: "method",
    header: "Payment Method",
    cell: ({ row }) => <div>{row.getValue("method")}</div>,
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => {
      const amount = Number(row.getValue("amount"))
      const type = row.original.type

      return (
        <div className={`flex items-center ${amount < 0 || type === "refund" ? "text-red-600" : "text-green-600"}`}>
          {amount < 0 || type === "refund" ? (
            <ArrowDownRight className="mr-1 h-4 w-4" />
          ) : (
            <ArrowUpRight className="mr-1 h-4 w-4" />
          )}
          ${Math.abs(amount).toFixed(2)}
        </div>
      )
    },
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
            status === "successful"
              ? "bg-green-100 text-green-800 hover:bg-green-100"
              : status === "pending"
                ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                : "bg-red-100 text-red-800 hover:bg-red-100"
          }
        >
          {status === "successful" ? "Successful" : status === "pending" ? "Pending" : "Failed"}
        </Badge>
      )
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

export function PaymentsList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
        <CardDescription>View all your payment transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <BillingDataTable
          columns={columns}
          data={payments}
          searchKey="description"
          searchPlaceholder="Search payments..."
        />
      </CardContent>
    </Card>
  )
}
