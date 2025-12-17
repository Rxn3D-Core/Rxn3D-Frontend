"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const orders = [
  {
    id: "ORD-001",
    customer: {
      name: "John Doe",
      email: "john@example.com",
      avatar: "/placeholder-user.jpg",
    },
    status: "Completed",
    date: "2023-06-20",
    amount: "$250.00",
  },
  {
    id: "ORD-002",
    customer: {
      name: "Jane Smith",
      email: "jane@example.com",
      avatar: "/placeholder-user.jpg",
    },
    status: "Processing",
    date: "2023-06-19",
    amount: "$125.00",
  },
  {
    id: "ORD-003",
    customer: {
      name: "Robert Johnson",
      email: "robert@example.com",
      avatar: "/placeholder-user.jpg",
    },
    status: "Pending",
    date: "2023-06-18",
    amount: "$350.00",
  },
  {
    id: "ORD-004",
    customer: {
      name: "Emily Davis",
      email: "emily@example.com",
      avatar: "/placeholder-user.jpg",
    },
    status: "Completed",
    date: "2023-06-17",
    amount: "$450.00",
  },
  {
    id: "ORD-005",
    customer: {
      name: "Michael Wilson",
      email: "michael@example.com",
      avatar: "/placeholder-user.jpg",
    },
    status: "Cancelled",
    date: "2023-06-16",
    amount: "$550.00",
  },
]

export function DataTable() {
  return (
    <div className="overflow-auto">
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Order</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Customer</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {orders.map((order) => (
            <tr key={order.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              <td className="p-4 align-middle">{order.id}</td>
              <td className="p-4 align-middle">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={order.customer.avatar} alt={order.customer.name} />
                    <AvatarFallback>
                      {order.customer.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid gap-0.5">
                    <div className="font-medium">{order.customer.name}</div>
                    <div className="text-xs text-muted-foreground">{order.customer.email}</div>
                  </div>
                </div>
              </td>
              <td className="p-4 align-middle">
                <Badge
                  variant={
                    order.status === "Completed"
                      ? "default"
                      : order.status === "Processing"
                        ? "outline"
                        : order.status === "Pending"
                          ? "secondary"
                          : "destructive"
                  }
                >
                  {order.status}
                </Badge>
              </td>
              <td className="p-4 align-middle">{order.date}</td>
              <td className="p-4 text-right align-middle">{order.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
