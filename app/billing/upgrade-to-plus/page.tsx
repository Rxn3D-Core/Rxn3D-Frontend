"use client"

import { useState } from "react"
import { Check, Shield, ArrowLeft, Lock, ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"

export default function UpgradeToPlusPage() {
  const router = useRouter()
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("annual")

  const handleSubscribe = () => {
    // Handle subscription logic here
    alert("Subscription process initiated!")
  }

  const handleCancel = () => {
    router.back()
  }

  const features = [
    "Unlimited blocks and files",
    "Advanced automations",
    "Premium integrations",
    "Priority support",
    "Advanced analytics",
  ]

  const monthlyPrice = 20
  const annualPrice = 16
  const annualTotal = annualPrice * 12

  return (
    <div className="min-h-screen bg-[#f6f9fc]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={handleCancel}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column - Payment Form */}
          <div className="order-2 lg:order-1">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Subscribe to Plus
              </h1>
              <p className="text-sm text-gray-600">
                Complete your payment information below
              </p>
            </div>

            {/* Email */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
              />
            </div>

            {/* Card Information */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card information
              </label>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="1234 1234 1234 1234"
                    className="w-full px-4 py-3 border-b border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                  <div className="absolute right-3 top-3 flex space-x-1">
                    <div className="w-8 h-5 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="grid grid-cols-2">
                  <input
                    type="text"
                    placeholder="MM / YY"
                    className="px-4 py-3 border-r border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                  <input
                    type="text"
                    placeholder="CVC"
                    className="px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Cardholder Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cardholder name
              </label>
              <input
                type="text"
                placeholder="Full name on card"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
              />
            </div>

            {/* Country */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country or region
              </label>
              <div className="relative">
                <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm appearance-none bg-white">
                  <option>United States</option>
                  <option>Canada</option>
                  <option>United Kingdom</option>
                  <option>Other</option>
                </select>
                <ChevronDown className="absolute right-3 top-3.5 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
              <input
                type="text"
                placeholder="ZIP"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm mt-3"
              />
            </div>

            {/* Subscribe Button */}
            <button
              onClick={handleSubscribe}
              className="w-full bg-[#635bff] hover:bg-[#5851df] text-white font-medium py-3.5 px-4 rounded-lg transition-colors text-sm shadow-sm mb-4"
            >
              Subscribe
            </button>

            {/* Security Notice */}
            <div className="flex items-start text-xs text-gray-500 mb-6">
              <Lock className="h-3.5 w-3.5 mr-2 mt-0.5 flex-shrink-0" />
              <p>
                Your card information is secure. We use industry-standard encryption to protect your payment details.
              </p>
            </div>

            {/* Terms */}
            <p className="text-xs text-gray-500 leading-relaxed">
              By confirming your subscription, you allow RXN3D to charge your card for this payment and future payments in accordance with their terms. You can always cancel your subscription.
            </p>
          </div>

          {/* Right Column - Order Summary */}
          <div className="order-1 lg:order-2">
            <div className="bg-white rounded-lg border border-gray-200 p-6 lg:sticky lg:top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Order summary
              </h2>

              {/* Plan Selection Toggle */}
              <div className="mb-6">
                <div className="bg-gray-100 rounded-lg p-1 flex">
                  <button
                    onClick={() => setBillingInterval("monthly")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      billingInterval === "monthly"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingInterval("annual")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      billingInterval === "annual"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Annual
                  </button>
                </div>
              </div>

              {/* Plan Details */}
              <div className="border-b border-gray-200 pb-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      RXN3D Plus
                    </h3>
                    <p className="text-sm text-gray-600">
                      {billingInterval === "annual" ? "Annual subscription" : "Monthly subscription"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      ${billingInterval === "annual" ? annualTotal : monthlyPrice}
                    </div>
                    <div className="text-xs text-gray-500">
                      {billingInterval === "annual" ? "/year" : "/month"}
                    </div>
                  </div>
                </div>

                {billingInterval === "annual" && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">
                      Annual discount (20%)
                    </span>
                    <span className="text-sm font-semibold text-green-800">
                      -${(monthlyPrice * 12 - annualTotal).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* What's Included */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  What's included
                </h4>
                <div className="space-y-2.5">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">
                    Due today
                  </span>
                  <span className="text-sm text-gray-900 font-medium">
                    ${billingInterval === "annual" ? annualTotal : monthlyPrice}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-gray-900">
                    Total due today
                  </span>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      ${billingInterval === "annual" ? annualTotal : monthlyPrice}
                    </div>
                    <div className="text-xs text-gray-500">
                      USD
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-start">
                  <Shield className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {billingInterval === "annual"
                      ? `You'll be charged $${annualTotal} today. Your subscription renews automatically on ${new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`
                      : `You'll be charged $${monthlyPrice} today. Your subscription renews automatically each month.`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
