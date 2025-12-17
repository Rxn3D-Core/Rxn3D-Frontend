"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Lightbulb } from "lucide-react"

interface AddSlipOnboardingProps {
  onDismiss: () => void
  showInitially: boolean
}

export function AddSlipOnboarding({ onDismiss, showInitially }: AddSlipOnboardingProps) {
  const [isVisible, setIsVisible] = useState(showInitially)

  useEffect(() => {
    setIsVisible(showInitially)
  }, [showInitially])

  if (!isVisible) {
    return null
  }

  return (
    <Card className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-11/12 max-w-2xl bg-white shadow-2xl rounded-lg border border-[#1162a8] animate-in fade-in zoom-in">
      <CardHeader className="pb-4 relative">
        <CardTitle className="text-2xl font-bold text-[#1162a8] flex items-center gap-2">
          <Lightbulb className="h-6 w-6" /> Get Started with Your Dental Slip!
        </CardTitle>
        <CardDescription className="text-gray-600 mt-2">
          Welcome! Here's a quick guide to help you create your first dental slip.
        </CardDescription>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 h-8 w-8 text-gray-500 hover:text-gray-800"
          onClick={() => {
            setIsVisible(false)
            onDismiss()
          }}
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 text-gray-700">
        <div className="flex items-start gap-4">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1162a8] text-white flex items-center justify-center font-bold text-lg">
            1
          </span>
          <div>
            <h3 className="font-semibold">Fill out Slip Details:</h3>
            <p className="text-sm">
              Start by entering the Lab, Doctor, Patient, and other case information in the header section.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1162a8] text-white flex items-center justify-center font-bold text-lg">
            2
          </span>
          <div>
            <h3 className="font-semibold">Select a Lab:</h3>
            <p className="text-sm">
              In the first section, choose the dental lab you're working with. You can search or sort labs.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1162a8] text-white flex items-center justify-center font-bold text-lg">
            3
          </span>
          <div>
            <h3 className="font-semibold">Choose a Product:</h3>
            <p className="text-sm">
              Move to the next step to select the specific dental product. Use filters and search to find it quickly.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1162a8] text-white flex items-center justify-center font-bold text-lg">
            4
          </span>
          <div>
            <h3 className="font-semibold">Confirm Arch:</h3>
            <p className="text-sm">
              After selecting a product, you'll choose the treatment arch (Upper, Lower, or Both).
            </p>
          </div>
        </div>
        <div className="text-center pt-4">
          <Button
            className="bg-[#1162a8] hover:bg-[#0f5490] text-white px-6 py-2 rounded-lg font-semibold"
            onClick={() => {
              setIsVisible(false)
              onDismiss()
            }}
          >
            Got it! Let's get started.
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
