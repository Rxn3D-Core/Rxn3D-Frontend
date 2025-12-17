"use client"

import { useState } from "react"
import { Breadcrumb } from "@/components/breadcrumb"
import { UpgradeModal } from "@/components/upgrade-modal"
import { Download, CreditCard, Calendar, AlertTriangle, TrendingUp } from "lucide-react"

export default function SubscriptionsPage() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
      </div>

        {/* Current Plan Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Current Plan */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Current plan</h3>
              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-xs">?</span>
              </div>
            </div>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Business plan</h2>
              <div className="text-sm text-gray-600">
                <p>$99 / month, 2,000 cases / month</p>
                <p>2 admin seat, unlimited user</p>
              </div>
            </div>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Upgrade / Downgrade plan
            </button>
          </div>

          {/* Usage */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Usage</h3>
              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-xs">?</span>
              </div>
            </div>
            <div className="mb-4">
              <h2 className="text-4xl font-bold text-gray-900 mb-1">1,748</h2>
              <p className="text-sm text-gray-600">87.4% used</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div className="h-2 rounded-full" style={{ width: "87.4%", backgroundColor: "#FF9900" }}></div>
            </div>
            <button className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">
              Explore Add-ons
            </button>
          </div>

          {/* Next Billing Date */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Next billing date</h3>
              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-xs">?</span>
              </div>
            </div>
            <div className="mb-4">
              <h2 className="text-4xl font-bold text-gray-900 mb-1">08/25/25</h2>
              <p className="text-sm text-gray-600">Charged monthly</p>
            </div>
            <button className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">
              Edit period
            </button>
          </div>
        </div>

        {/* Warning Alert */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-8">
          <div className="flex items-start">
            <svg width="25" height="30" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.8704 12.8411V4.38275L4.87036 17.6744H11.8704L11.8704 26.1328L20.8704 12.8411L13.8704 12.8411Z" stroke="#FF9900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>

            <div className="flex-1">
                <p className="text-sm" style={{ color: "#9A671B" }}>
                <strong>You're close to hitting your monthly limit.</strong>
                </p>
                <p className="text-sm mt-1" style={{ color: "#9A671B" }}>
                Add more slips or upgrade your plan now to continue production.
                </p>
              <div className="mt-3 flex space-x-3">
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  style={{ backgroundColor: "#FF9900", color: "#fff" }}
                  onMouseOver={e => (e.currentTarget.style.backgroundColor = "#e68a00")}
                  onMouseOut={e => (e.currentTarget.style.backgroundColor = "#FF9900")}
                >
                  Upgrade plan
                </button>
                <button className="bg-white border border-orange-300 text-orange-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-50 transition-colors">
                  + Explore Add-ons
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
          </div>
          <div className="p-6">
            <div className="mb-4">
              <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">
                <CreditCard className="h-4 w-4 inline mr-2" />
                Update Billing Info
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Payment Methods */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    <span className="text-sm">•••• •••• •••• 4242</span>
                  </div>
                  <div className="text-yellow-500">★</div>
                </div>
                <p className="text-xs text-gray-500">Expires 12/27</p>
                <button className="mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded">
                  Update via Stripe
                </button>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    <span className="text-sm">•••• •••• •••• 5489</span>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Use as Default</span>
                </div>
                <p className="text-xs text-gray-500">Expires 08/30</p>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    <span className="text-sm">•••• •••• •••• 4751</span>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Use as Default</span>
                </div>
                <p className="text-xs text-gray-500">Expires 03/28</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invoices */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Invoices</h3>
            <button className="text-sm text-gray-600 hover:text-gray-900 flex items-center">
              <Download className="h-4 w-4 mr-1" />
              Download all Invoice
            </button>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">INV-9042-RXN</p>
                  <p className="text-sm text-gray-500">Jul 10, 2025 • $99.00</p>
                </div>
                <div className="flex space-x-2">
                  <button className="text-sm text-blue-600 hover:text-blue-800">View</button>
                  <button className="text-sm text-blue-600 hover:text-blue-800">Download</button>
                </div>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">INV-8765-RXN</p>
                  <p className="text-sm text-gray-500">Jun 10, 2025 • $99.00</p>
                </div>
                <div className="flex space-x-2">
                  <button className="text-sm text-blue-600 hover:text-blue-800">View</button>
                  <button className="text-sm text-blue-600 hover:text-blue-800">Download</button>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Upgrade Modal */}
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
      />
    </div>
  )
}
