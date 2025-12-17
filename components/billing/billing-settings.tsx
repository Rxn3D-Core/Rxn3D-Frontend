"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CreditCard, AlertCircle } from "lucide-react"

interface BillingSettingsProps {
  billingMode: "prepaid" | "postpaid"
  onBillingModeChange: (mode: "prepaid" | "postpaid") => void
}

export function BillingSettings({ billingMode, onBillingModeChange }: BillingSettingsProps) {
  const [autoRefill, setAutoRefill] = useState(true)
  const [autoRefillThreshold, setAutoRefillThreshold] = useState("500")
  const [autoRefillAmount, setAutoRefillAmount] = useState("1000")
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState("card")

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Billing Mode</CardTitle>
          <CardDescription>Choose between prepaid credits or monthly invoicing</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={billingMode}
            onValueChange={(value) => onBillingModeChange(value as "prepaid" | "postpaid")}
            className="space-y-4"
          >
            <div className="flex items-start space-x-3 border rounded-md p-4 hover:bg-gray-50">
              <RadioGroupItem value="prepaid" id="prepaid" className="mt-1" />
              <div className="space-y-1">
                <Label htmlFor="prepaid" className="text-base font-medium">
                  Prepaid Credits
                </Label>
                <p className="text-sm text-muted-foreground">
                  Purchase credits in advance and use them for slip requests and storage. Each slip request costs 16
                  credits ($0.16).
                </p>
                <div className="text-sm text-blue-600 font-medium mt-2">
                  Best for variable usage or if you prefer to pay as you go.
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3 border rounded-md p-4 hover:bg-gray-50">
              <RadioGroupItem value="postpaid" id="postpaid" className="mt-1" />
              <div className="space-y-1">
                <Label htmlFor="postpaid" className="text-base font-medium">
                  Monthly Invoice
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get billed at the end of each month for your actual usage. Each slip request costs $0.16.
                </p>
                <div className="text-sm text-blue-600 font-medium mt-2">
                  Best for consistent usage or if you prefer monthly billing.
                </div>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {billingMode === "prepaid" && (
        <Card>
          <CardHeader>
            <CardTitle>Auto-Refill Settings</CardTitle>
            <CardDescription>Configure automatic credit purchases</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-refill">Enable Auto-Refill</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically purchase credits when your balance falls below a threshold
                </p>
              </div>
              <Switch id="auto-refill" checked={autoRefill} onCheckedChange={setAutoRefill} />
            </div>

            {autoRefill && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="threshold">Refill Threshold</Label>
                    <Input
                      id="threshold"
                      type="number"
                      min="100"
                      step="100"
                      value={autoRefillThreshold}
                      onChange={(e) => setAutoRefillThreshold(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Credits will be purchased when your balance falls below this amount
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Refill Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="500"
                      step="500"
                      value={autoRefillAmount}
                      onChange={(e) => setAutoRefillAmount(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Number of credits to purchase automatically</p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-md flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-blue-800">
                      Your card will be charged ${(Number.parseInt(autoRefillAmount) * 0.01).toFixed(2)}
                      when your balance falls below {autoRefillThreshold} credits.
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>Manage your payment information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
            <div className="flex items-center space-x-3 border rounded-md p-4 hover:bg-gray-50">
              <RadioGroupItem value="card" id="card" />
              <div className="flex-1">
                <Label htmlFor="card" className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                  <span>Credit Card</span>
                </Label>
              </div>
              <div className="text-sm font-medium">Visa •••• 4242</div>
            </div>
          </RadioGroup>

          <Button variant="outline">Add Payment Method</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>Configure billing notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive email notifications for billing events</p>
            </div>
            <Switch id="email-notifications" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>

          {emailNotifications && (
            <div className="space-y-4 pl-6 border-l-2 border-gray-200">
              <div className="flex items-center justify-between">
                <Label htmlFor="low-balance" className="flex items-center cursor-pointer">
                  <span>Low balance alerts</span>
                </Label>
                <Switch id="low-balance" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="purchase-receipts" className="flex items-center cursor-pointer">
                  <span>Purchase receipts</span>
                </Label>
                <Switch id="purchase-receipts" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="monthly-summary" className="flex items-center cursor-pointer">
                  <span>Monthly usage summary</span>
                </Label>
                <Switch id="monthly-summary" defaultChecked />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>Save Settings</Button>
      </div>
    </div>
  )
}
