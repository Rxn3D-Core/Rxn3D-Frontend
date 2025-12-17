"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard, AlertCircle, DollarSign } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface CreditBalanceDisplayProps {
  initialBalance: number
  onPurchaseClick: () => void
  lowCreditThreshold?: number
}

export function CreditBalanceDisplay({
  initialBalance,
  onPurchaseClick,
  lowCreditThreshold = 100,
}: CreditBalanceDisplayProps) {
  const [creditBalance, setCreditBalance] = useState(initialBalance)
  const [isLowCredit, setIsLowCredit] = useState(false)

  // Update balance when initialBalance changes
  useEffect(() => {
    setCreditBalance(initialBalance)
    setIsLowCredit(initialBalance < lowCreditThreshold)
  }, [initialBalance, lowCreditThreshold])

  // Calculate progress percentage (assuming 2000 is max for visualization)
  const maxCredits = 2000
  const progressPercentage = Math.min(Math.round((creditBalance / maxCredits) * 100), 100)

  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg font-medium">Credit Balance</CardTitle>
            <CardDescription>Your current available Slip Credits</CardDescription>
          </div>
          <Button onClick={onPurchaseClick} className="bg-blue-600 hover:bg-blue-700">
            <DollarSign className="mr-2 h-4 w-4" />
            Purchase Credits
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="mr-4 rounded-full bg-blue-100 p-3">
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <div className="text-3xl font-bold">{creditBalance} Credits</div>
              <div className="text-sm text-muted-foreground">
                Approximately ${(creditBalance * 0.01).toFixed(2)} USD
              </div>
            </div>
          </div>
          {isLowCredit && (
            <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">Low credit balance</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>0</span>
            <span>{maxCredits}</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="text-xs text-muted-foreground text-right">
            {progressPercentage}% of maximum recommended balance
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
