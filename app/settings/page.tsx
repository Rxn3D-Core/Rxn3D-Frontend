"use client"

import { useState } from "react"
import { Breadcrumb } from "@/components/breadcrumb"
import { TwoFactorAuth } from "@/components/settings/two-factor-auth"
import { Check, CreditCard, Download } from "lucide-react"

export default function SettingsPage() {
  const [autoRenew, setAutoRenew] = useState(true)

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              <button className="w-full text-left px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md">
                Subscription
              </button>
              <button className="w-full text-left px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">
                Activity
              </button>
              <button className="w-full text-left px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">
                Personal Info
              </button>
              <button className="w-full text-left px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">
                Security
              </button>
              <button className="w-full text-left px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">
                Employment
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Subscription Section */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Plan</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Current Plan */}
                  <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">Beginner</h3>
                      <Check className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mb-1">$10/month</p>
                    <p className="text-sm text-gray-600 mb-4">30 days remaining</p>
                    <button className="w-full text-center text-blue-600 border border-blue-600 py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-50">
                      Cancel Subscription
                    </button>
                  </div>

                  {/* Upgrade Option */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Professional</h3>
                    <p className="text-2xl font-bold text-gray-900 mb-1">$48/month</p>
                    <p className="text-sm text-gray-600 mb-4">365 days</p>
                    <div className="flex space-x-2">
                      <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700">
                        Upgrade
                      </button>
                      <button className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">
                        Learn more about this plan
                      </button>
                    </div>
                  </div>
                </div>

                {/* Auto Renew Setting */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Enable auto renew</h4>
                      <p className="text-sm text-gray-500">
                        This option, if checked, will renew your productive subscription, if the current plan expires. However, this might prevent you from...
                      </p>
                    </div>
                    <div className="ml-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoRenew}
                          onChange={(e) => setAutoRenew(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Section */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Payment Method</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Payment Methods */}
                  <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <CreditCard className="h-5 w-5 mr-2" />
                        <span className="text-sm font-medium">Credit Card</span>
                      </div>
                      <Check className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-600 mb-1">•••• •••• •••• 3542</p>
                    <div className="flex items-center justify-between">
                      <button className="text-xs text-gray-500 hover:text-gray-700">Remove</button>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <CreditCard className="h-5 w-5 mr-2" />
                        <span className="text-sm font-medium">Debit Card</span>
                      </div>
                      <button className="text-xs text-gray-500 hover:text-gray-700">Set as default</button>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">•••• •••• •••• 4543</p>
                    <div className="flex items-center justify-between">
                      <button className="text-xs text-gray-500 hover:text-gray-700">Remove</button>
                    </div>
                  </div>

                  <div className="border border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center">
                    <button className="text-gray-500 hover:text-gray-700">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mb-2 mx-auto">
                        +
                      </div>
                      <span className="text-sm">Add Payment Method</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Billing History Section */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Billing History</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 mr-2">08/07/2021</span>
                        <span className="text-sm text-gray-600">Beginner plan, monthly</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">$30.00</span>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      Invoice 08 July 21
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 mr-2">07/06/2021</span>
                        <span className="text-sm text-gray-600">Beginner plan, monthly</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">$30.00</span>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      Invoice 07 June 21
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 mr-2">06/05/2021</span>
                        <span className="text-sm text-gray-600">Beginner plan, monthly</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">$30.00</span>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      Invoice 06 May 21
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Two Factor Auth */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Security</h2>
              </div>
              <div className="p-6">
                <TwoFactorAuth />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
