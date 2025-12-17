"use client"

import type React from "react"
import Image from "next/image"

type OnboardingLayoutProps = {
  children: React.ReactNode
  currentStep: number
  totalSteps: number
  title: string
  subtitle: string
}

export function OnboardingLayout({ children, currentStep, totalSteps, title, subtitle }: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Header with logo */}
      <header className="py-6 px-8 border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Image src="/rxn3d-logo.png" alt="Logo" width={40} height={40} className="h-10 w-auto" />
            <span className="font-semibold text-xl text-gray-800">Rxn3d</span>
          </div>
          <div className="text-sm text-gray-500">
            Need help?{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Contact support
            </a>
          </div>
        </div>
      </header>

      {/* Progress bar - with percentage but no step count */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-end mb-2">
            <span className="text-sm text-gray-500">{Math.round((currentStep / totalSteps) * 100)}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-6 px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-sm text-gray-500">&copy; {new Date().getFullYear()} DentalLab. All rights reserved.</div>
          <div className="text-sm">
            <a href="/privacy-policy" className="text-gray-500 hover:text-gray-700 mr-4">
              Privacy Policy
            </a>
            <a href="/terms-of-service" className="text-gray-500 hover:text-gray-700">
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
