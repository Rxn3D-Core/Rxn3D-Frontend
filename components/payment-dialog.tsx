"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { loadStripe } from "@stripe/stripe-js"
import { Elements } from "@stripe/react-stripe-js"
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render.
// Only load Stripe if the publishable key is available
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  amount: number
  itemCount: number
  selectedItems: string[]
  onPaymentSuccess: (itemIds: string[], transactionId: string) => void
}

export function PaymentDialog({
  open,
  onOpenChange,
  amount,
  itemCount,
  selectedItems,
  onPaymentSuccess,
}: PaymentDialogProps) {
  const [clientSecret, setClientSecret] = useState<string>("")

  // Create payment intent when dialog opens
  const createPaymentIntent = async () => {
    try {
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      })
      const data = await response.json()
      setClientSecret(data.clientSecret)
    } catch (error) {
      console.error("Error creating payment intent:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Complete Payment</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto pr-1 flex-1">
          <div className="space-y-6">
            <div className="text-sm text-gray-500">
              You are about to pay for {itemCount} item{itemCount !== 1 ? "s" : ""}.
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Amount:</span>
                <span className="text-lg font-semibold">${amount}</span>
              </div>
            </div>

            {!stripePromise ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Stripe is not configured. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your environment variables.
                </p>
              </div>
            ) : clientSecret ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "#3b82f6",
                      colorBackground: "#ffffff",
                      colorText: "#1f2937",
                      colorDanger: "#ef4444",
                      fontFamily: "ui-sans-serif, system-ui, sans-serif",
                      spacingUnit: "4px",
                      borderRadius: "4px",
                    },
                    rules: {
                      ".Input": {
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                      },
                      ".Input:focus": {
                        border: "1px solid #3b82f6",
                        boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.5)",
                      },
                      ".Tab": {
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                      },
                      ".Tab--selected": {
                        border: "1px solid #3b82f6",
                        boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.5)",
                      },
                      ".TabIcon": {
                        width: "24px",
                        height: "24px",
                      },
                    },
                  },
                  loader: "auto",
                }}
              >
                <CheckoutForm
                  onSuccess={(transactionId) => {
                    onPaymentSuccess(selectedItems, transactionId)
                    onOpenChange(false)
                  }}
                  selectedItems={selectedItems}
                  amount={amount}
                />
              </Elements>
            ) : (
              <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={createPaymentIntent}>
                Proceed to Payment
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CheckoutForm({
  onSuccess,
  selectedItems,
  amount,
}: {
  onSuccess: (transactionId: string) => void
  selectedItems: string[]
  amount: number
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/billing/success`,
      },
      redirect: "if_required",
    })

    if (error) {
      setMessage(error.message ?? "An unexpected error occurred.")
      setIsProcessing(false)
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // Log the payment to our API
      try {
        const response = await fetch("/api/log-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            itemIds: selectedItems,
            transactionId: paymentIntent.id,
          }),
        })

        if (response.ok) {
          setMessage("Payment successful!")
          // Call the onSuccess callback with the transaction ID
          onSuccess(paymentIntent.id)
        } else {
          setMessage("Payment processed but failed to log. Please contact support.")
        }
      } catch (err) {
        console.error("Error logging payment:", err)
        setMessage("Payment processed but failed to log. Please contact support.")
      }

      setIsProcessing(false)
    } else {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <PaymentElement
          options={{
            layout: {
              type: "tabs",
              defaultCollapsed: false,
            },
            paymentMethodOrder: ["card", "apple_pay", "google_pay", "cashapp", "afterpay_clearpay", "klarna"],
          }}
        />
      </div>
      {message && (
        <div className={`text-sm ${message.includes("successful") ? "text-green-600" : "text-red-600"}`}>{message}</div>
      )}
      <Button type="submit" disabled={!stripe || isProcessing} className="w-full bg-blue-600 hover:bg-blue-700">
        {isProcessing ? "Processing..." : "Pay Now"}
      </Button>
    </form>
  )
}
