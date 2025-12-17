"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, RefreshCw, Clock } from "lucide-react"
import { CreditPurchaseDialog } from "@/components/billing/credit-purchase-dialog"
import { TransactionHistory } from "@/components/billing/transaction-history"
import { BillingSettings } from "@/components/billing/billing-settings"
import { CreditUsageChart } from "@/components/billing/credit-usage-chart"
import { BillingData } from "@/components/billing/billing-data"
import { PaymentMethods } from "@/components/billing/payment-methods"
import { CreditBalanceDisplay } from "@/components/billing/credit-balance-display"

export default function BillingSystemPage() {
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false)
  const [creditBalance, setCreditBalance] = useState(250)
  const lowCreditThreshold = 100
  const isLowCredit = creditBalance < lowCreditThreshold

  // Fetch credit balance on load
  useEffect(() => {
    async function fetchCreditBalance() {
      try {
        const response = await fetch("/api/credits/balance")
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setCreditBalance(data.balance)
          }
        }
      } catch (error) {
        console.error("Error fetching credit balance:", error)
      }
    }

    fetchCreditBalance()
  }, [])

  // Handle credit purchase success
  const handlePurchaseSuccess = (newBalance?: number) => {
    setIsPurchaseDialogOpen(false)
    if (newBalance) {
      setCreditBalance(newBalance)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Slip Credits</h1>
          <p className="text-muted-foreground">Manage your credit balance and usage</p>
        </div>
      </div>

      {/* Credit Balance Card */}
      <CreditBalanceDisplay
        initialBalance={creditBalance}
        onPurchaseClick={() => setIsPurchaseDialogOpen(true)}
        lowCreditThreshold={lowCreditThreshold}
      />

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          <TabsTrigger value="all-billing">All Billing</TabsTrigger>
          <TabsTrigger value="payments">Payment Methods</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Credits Used This Month</CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">750 Credits</div>
                <p className="text-xs text-muted-foreground">+20% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Auto-Refill Status</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Enabled</div>
                <p className="text-xs text-muted-foreground">Will purchase 1000 credits when balance falls below 100</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Next Auto-Refill</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">When needed</div>
                <p className="text-xs text-muted-foreground">Based on your current usage rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Usage Chart */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Credit Usage</CardTitle>
              <CardDescription>Your credit consumption over time</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <CreditUsageChart billingMode="prepaid" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <TransactionHistory />
        </TabsContent>

        {/* All Billing Tab */}
        <TabsContent value="all-billing">
          <BillingData />
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <PaymentMethods />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <BillingSettings billingMode="prepaid" onBillingModeChange={() => {}} />
        </TabsContent>
      </Tabs>

      {/* Credit Purchase Dialog */}
      <CreditPurchaseDialog
        open={isPurchaseDialogOpen}
        onOpenChange={setIsPurchaseDialogOpen}
        onSuccess={handlePurchaseSuccess}
      />
    </div>
  )
}
