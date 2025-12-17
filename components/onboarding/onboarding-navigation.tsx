"use client"

import { Button } from "@/components/ui/button"

interface OnboardingNavigationProps {
  onPrevious: () => void
  onNext: () => void
  onContinueLater: () => void
  nextLabel?: string
  previousLabel?: string
  continueLaterLabel?: string
}

export function OnboardingNavigation({
  onPrevious,
  onNext,
  onContinueLater,
  nextLabel = "Next",
  previousLabel = "Previous",
  continueLaterLabel = "Continue Later",
}: OnboardingNavigationProps) {
  return (
    <div className="flex justify-between mt-8">
      <Button
        variant="outline"
        onClick={onPrevious}
        className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200"
      >
        {previousLabel}
      </Button>
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={onContinueLater}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200"
        >
          {continueLaterLabel}
        </Button>
        <Button onClick={onNext} className="bg-white hover:bg-gray-50 text-blue-600 border-2 border-blue-600">
          {nextLabel}
        </Button>
      </div>
    </div>
  )
}
