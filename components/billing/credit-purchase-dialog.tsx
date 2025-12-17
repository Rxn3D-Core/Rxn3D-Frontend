"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { loadStripe } from "@stripe/stripe-js"
import { Elements } from "@stripe/react-stripe-js"
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"

// Initialize Stripe - only load if publishable key is available
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

// Define credit packages
export const DEFAULT_CREDIT_PACKAGES = [
  {
    id: "starter",
    name: "Starter",
    credits: 500,
    price: 5,
    description: "Best for occasional use",
  },
  {
    id: "standard",
    name: "Standard",
    credits: 1000,
    price: 10,
    description: "Most popular",
  },
  {
    id: "premium",
    name: "Premium",
    credits: 5000,
    price: 45,
    description: "Best value",
  },
]

interface CreditPurchaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (newBalance?: number) => void
  recommendedPackage?: string
}

export function CreditPurchaseDialog({ open, onOpenChange, onSuccess, recommendedPackage }: CreditPurchaseDialogProps) {
  const [selectedPackage, setSelectedPackage] = useState(recommendedPackage || "standard")
  const [customAmount, setCustomAmount] = useState("1000")
  const [clientSecret, setClientSecret] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  // Credit package options
  const packages = [
    ...DEFAULT_CREDIT_PACKAGES,
    {
      id: "custom",
      name: "Custom Amount",
      credits: Number.parseInt(customAmount) || 0,
      price: (Number.parseInt(customAmount) || 0) * 0.01,
    },
  ]

  // Get the selected package details
  const selectedPackageDetails = packages.find((pkg) => pkg.id === selectedPackage)!

  // Create payment intent when user is ready to pay
  const createPaymentIntent = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedPackageDetails.price,
          credits: selectedPackageDetails.credits,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setClientSecret(data.clientSecret)
      } else {
        console.error("Error creating payment intent:", data.error)
      }
    } catch (error) {
      console.error("Error creating payment intent:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Purchase Slip Credits</DialogTitle>
          <DialogDescription>
            Slip Credits are used for slip requests and storage. Each slip request costs 16 credits ($0.16).
          </DialogDescription>
        </DialogHeader>

        {!clientSecret ? (
          <>
            <div className="space-y-4 py-4">
              <RadioGroup value={selectedPackage} onValueChange={setSelectedPackage} className="space-y-3">
                {packages.slice(0, 3).map((pkg) => (
                  <div key={pkg.id} className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                    <RadioGroupItem value={pkg.id} id={pkg.id} />
                    <Label htmlFor={pkg.id} className="flex-1 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{pkg.name}</div>
                          <div className="text-sm text-muted-foreground">{pkg.credits} credits</div>
                          {pkg.description && <div className="text-xs text-blue-600">{pkg.description}</div>}
                        </div>
                        <div className="text-lg font-semibold">${pkg.price}</div>
                      </div>
                    </Label>
                  </div>
                ))}

                <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">Custom Amount</div>
                        <div className="text-sm text-muted-foreground">Enter credit amount</div>
                      </div>
                      <div className="text-lg font-semibold">
                        ${((Number.parseInt(customAmount) || 0) * 0.01).toFixed(2)}
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {selectedPackage === "custom" && (
                <div className="mt-4">
                  <Label htmlFor="custom-amount">Number of Credits</Label>
                  <Input
                    id="custom-amount"
                    type="number"
                    min="100"
                    step="100"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}

              <div className="mt-6 bg-blue-50 p-4 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total:</span>
                  <span className="text-xl font-bold">${selectedPackageDetails.price.toFixed(2)}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  You will receive {selectedPackageDetails.credits} Slip Credits
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={createPaymentIntent} disabled={isLoading}>
                {isLoading ? "Processing..." : "Proceed to Payment"}
              </Button>
            </DialogFooter>
          </>
        ) : !stripePromise ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Stripe is not configured. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your environment variables.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#3b82f6",
                },
              },
            }}
          >
            <CheckoutForm
              onSuccess={(newBalance) => {
                if (onSuccess) onSuccess(newBalance)
                else onOpenChange(false)
              }}
              packageDetails={selectedPackageDetails}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CheckoutForm({
  onSuccess,
  packageDetails,
}: {
  onSuccess: (newBalance?: number) => void
  packageDetails: { credits: number; price: number }
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
        return_url: `${window.location.origin}/billing-system/success`,
      },
      redirect: "if_required",
    })

    if (error) {
      setMessage(error.message ?? "An unexpected error occurred.")
      setIsProcessing(false)
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // Log the credit purchase
      try {
        const response = await fetch("/api/credits/log-purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: packageDetails.price,
            credits: packageDetails.credits,
            transactionId: paymentIntent.id,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setMessage("Payment successful! Credits added to your account.")

          // No need to wait for webhook - credits are added directly
          setTimeout(() => {
            onSuccess(data.newBalance) // Pass the new balance back to parent component
          }, 1500)
        } else {
          setMessage("Payment processed but failed to add credits. Please contact support.")
        }
      } catch (err) {
        console.error("Error logging credit purchase:", err)
        setMessage("Payment processed but failed to add credits. Please contact support.")
      }
    }

    setIsProcessing(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="space-y-4">
        <PaymentElement />
      </div>

      <div className="mt-6 bg-blue-50 p-4 rounded-md">
        <div className="flex justify-between items-center">
          <span className="font-medium">Total:</span>
          <span className="text-xl font-bold">${packageDetails.price.toFixed(2)}</span>
        </div>
        <div className="text-sm text-muted-foreground mt-1">You will receive {packageDetails.credits} Slip Credits</div>
      </div>

      {message && (
        <div
          className={`text-sm p-2 rounded ${message.includes("successful") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}
        >
          {message}
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" disabled={isProcessing} onClick={() => window.location.reload()}>
          Back
        </Button>
        <Button type="submit" disabled={!stripe || isProcessing}>
          {isProcessing ? "Processing..." : "Pay Now"}
        </Button>
      </DialogFooter>
    </form>
  )
}
