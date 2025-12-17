"use client"

import { useState } from "react"
import { Breadcrumb } from "@/components/breadcrumb"
import { Settings, ExternalLink, Plus, Check, AlertTriangle } from "lucide-react"

export default function IntegrationsPage() {
  const integrations = [
    {
      id: "stripe",
      name: "Stripe",
      description: "Payment processing and subscription management",
      logo: "/images/stripe-logo.png", // You'll need to add this image
      status: "connected",
      category: "Payment Processing",
    },
    {
      id: "quickbooks",
      name: "QuickBooks",
      description: "Accounting and financial management",
      logo: "/images/quickbooks-logo.png", // You'll need to add this image
      status: "available",
      category: "Accounting",
    },
    {
      id: "xero",
      name: "Xero",
      description: "Cloud-based accounting software",
      logo: "/images/xero-logo.png", // You'll need to add this image
      status: "available",
      category: "Accounting",
    },
    {
      id: "paypal",
      name: "PayPal",
      description: "Digital payment platform",
      logo: "/images/paypal-logo.png", // You'll need to add this image
      status: "available",
      category: "Payment Processing",
    },
    {
      id: "square",
      name: "Square",
      description: "Point of sale and payment processing",
      logo: "/images/square-logo.png", // You'll need to add this image
      status: "coming-soon",
      category: "Payment Processing",
    },
    {
      id: "freshbooks",
      name: "FreshBooks",
      description: "Cloud accounting for small businesses",
      logo: "/images/freshbooks-logo.png", // You'll need to add this image
      status: "coming-soon",
      category: "Accounting",
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Check className="h-3 w-3 mr-1" />
            Connected
          </span>
        )
      case "available":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Available
          </span>
        )
      case "coming-soon":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Coming Soon
          </span>
        )
      default:
        return null
    }
  }

  const getActionButton = (integration: any) => {
    switch (integration.status) {
      case "connected":
        return (
          <div className="flex space-x-2">
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <Settings className="h-4 w-4 mr-1" />
              Configure
            </button>
            <button className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
              Disconnect
            </button>
          </div>
        )
      case "available":
        return (
          <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <Plus className="h-4 w-4 mr-1" />
            Connect
          </button>
        )
      case "coming-soon":
        return (
          <button disabled className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed">
            Coming Soon
          </button>
        )
      default:
        return null
    }
  }

  const categories = ["All", "Payment Processing", "Accounting"]
  const [activeCategory, setActiveCategory] = useState("All")

  const filteredIntegrations = activeCategory === "All" 
    ? integrations 
    : integrations.filter(integration => integration.category === activeCategory)

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="mt-2 text-gray-600">
            Connect your favorite tools and services to streamline your billing and accounting workflows.
          </p>
        </div>

        {/* Connected Integrations Alert */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Check className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                1 integration connected
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                Your Stripe integration is active and processing payments. 
                <a href="#" className="font-medium underline">
                  View payment dashboard
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeCategory === category
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {category}
              </button>
            ))}
          </nav>
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIntegrations.map((integration) => (
            <div key={integration.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                      {/* Replace with actual logo when available */}
                      <div className="text-2xl font-bold text-gray-600">
                        {integration.name.charAt(0)}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {integration.name}
                      </h3>
                      <p className="text-sm text-gray-500">{integration.category}</p>
                    </div>
                  </div>
                  {getStatusBadge(integration.status)}
                </div>
                
                <p className="text-gray-600 text-sm mb-6">
                  {integration.description}
                </p>
                
                <div className="flex items-center justify-between">
                  {getActionButton(integration)}
                  <button className="text-blue-600 hover:text-blue-800">
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Help Section */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">
                Need help with integrations?
              </h3>
              <p className="mt-2 text-gray-600">
                Our support team can help you set up and configure integrations to work best with your workflow.
              </p>
              <div className="mt-4">
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Contact Support
                </button>
                <button className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  View Documentation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
  )
}
