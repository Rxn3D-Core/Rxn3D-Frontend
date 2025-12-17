"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowDown, ArrowUp, Download, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Define transaction types
type TransactionType = "purchase" | "usage" | "refund" | "bonus"

interface Transaction {
  id: string
  date: string
  type: TransactionType
  description: string
  amount: number
  balance: number
}

// Mock transaction data
const transactions: Transaction[] = [
  {
    id: "TX123456",
    date: "2025-03-01",
    type: "purchase",
    description: "Credit Purchase - Standard Package",
    amount: 1000,
    balance: 1250,
  },
  {
    id: "TX123455",
    date: "2025-02-28",
    type: "usage",
    description: "Slip Request - #015406",
    amount: -16,
    balance: 250,
  },
  {
    id: "TX123454",
    date: "2025-02-27",
    type: "usage",
    description: "Storage Fee - 25MB",
    amount: -5,
    balance: 266,
  },
  {
    id: "TX123453",
    date: "2025-02-25",
    type: "usage",
    description: "Slip Request - #015405",
    amount: -16,
    balance: 271,
  },
  {
    id: "TX123452",
    date: "2025-02-20",
    type: "purchase",
    description: "Credit Purchase - Starter Package",
    amount: 500,
    balance: 287,
  },
  {
    id: "TX123451",
    date: "2025-02-15",
    type: "usage",
    description: "Slip Request - #015404",
    amount: -16,
    balance: -213,
  },
  {
    id: "TX123450",
    date: "2025-02-10",
    type: "purchase",
    description: "Credit Purchase - Custom Amount",
    amount: 300,
    balance: -197,
  },
  {
    id: "TX123449",
    date: "2025-02-05",
    type: "refund",
    description: "Refund - Cancelled Order #12345",
    amount: 50,
    balance: -497,
  },
  {
    id: "TX123448",
    date: "2025-02-01",
    type: "bonus",
    description: "Welcome Bonus Credits",
    amount: 100,
    balance: -547,
  },
]

export function TransactionHistory() {
  const [period, setPeriod] = useState("30d")
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all")
  const [isLoading, setIsLoading] = useState(false)

  // Filter transactions based on period, search query, and type
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions]

    // Filter by period
    if (period !== "all") {
      const daysToFilter = Number.parseInt(period)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToFilter)

      filtered = filtered.filter((t) => new Date(t.date) >= cutoffDate)
    }

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter((t) => t.type === typeFilter)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) => t.id.toLowerCase().includes(query) || t.description.toLowerCase().includes(query),
      )
    }

    return filtered
  }, [period, searchQuery, typeFilter, transactions])

  // Add a loading effect when filters change
  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [period, searchQuery, typeFilter])

  // Get transaction type badge styling
  const getTypeBadgeStyles = (type: TransactionType) => {
    switch (type) {
      case "purchase":
        return "bg-green-100 text-green-800"
      case "usage":
        return "bg-blue-100 text-blue-800"
      case "refund":
        return "bg-purple-100 text-purple-800"
      case "bonus":
        return "bg-amber-100 text-amber-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Credit Transaction History</CardTitle>
            <CardDescription>View your Slip Credit purchases and usage</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-[250px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search transactions..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="purchase">Purchases</SelectItem>
                <SelectItem value="usage">Usage</SelectItem>
                <SelectItem value="refund">Refunds</SelectItem>
                <SelectItem value="bonus">Bonuses</SelectItem>
              </SelectContent>
            </Select>

            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="flex min-h-screen items-center justify-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-[#1162A8] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-3 h-3 bg-[#1162A8] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-3 h-3 bg-[#1162A8] rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No transactions found for the selected criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{transaction.id}</TableCell>
                      <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={getTypeBadgeStyles(transaction.type)}>
                          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>
                        <div
                          className={`flex items-center ${transaction.amount > 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {transaction.amount > 0 ? (
                            <ArrowUp className="mr-1 h-4 w-4" />
                          ) : (
                            <ArrowDown className="mr-1 h-4 w-4" />
                          )}
                          {transaction.amount > 0 ? "+" : ""}
                          {transaction.amount}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{transaction.balance}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="mt-4 flex justify-between items-center text-sm text-muted-foreground">
              <div>
                Showing {filteredTransactions.length} of {transactions.length} transactions
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={filteredTransactions.length === 0}>
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" disabled={filteredTransactions.length === 0}>
                  Print
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
