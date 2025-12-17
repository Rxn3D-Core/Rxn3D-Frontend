"use client"

import Link from "next/link"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

export default function CreditPurchaseSuccessPage() {
  const [creditAmount, setCreditAmount] = useState<number | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Get payment_intent from URL
    const paymentIntent = searchParams.get("payment_intent")

    if (paymentIntent) {
      // In a real app, you would verify the payment intent with your backend
      // For now, we'll just show a success message
      setCreditAmount(1000) // Default to 1000 credits
    }
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg text-center">
        <div className="mb-4 flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-2">Thank you for your purchase.</p>
        {creditAmount && (
          <p className="text-gray-600 mb-6">
            <span className="font-semibold">{creditAmount} credits</span> have been added to your account.
          </p>
        )}
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <Link href="/billing-system">Return to Billing</Link>
        </Button>
      </div>
    </div>
  )
}
