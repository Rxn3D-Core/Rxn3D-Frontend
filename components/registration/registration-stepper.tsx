"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface RegistrationStep {
  id: string
  label: string
  icon: LucideIcon
}

interface RegistrationStepperProps {
  steps: RegistrationStep[]
  activeStep: string
  onStepChange: (stepId: string) => void
  compact?: boolean
  dense?: boolean
}

export function RegistrationStepper({
  steps,
  activeStep,
  onStepChange,
  compact = false,
  dense = false,
}: RegistrationStepperProps) {
  const activeIndex = steps.findIndex((step) => step.id === activeStep)
  const current = steps[activeIndex]

  if (compact) {
    return (
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
        <span className="font-semibold text-[#1162A8]">
          Step {activeIndex + 1} of {steps.length}
        </span>
        <span aria-hidden="true">·</span>
        <span>{current?.label}</span>
      </div>
    )
  }

  return (
    <>
      <div className={cn("sm:hidden", dense ? "mb-2" : "mb-3")}>
        <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1162A8]">
            Step {activeIndex + 1} of {steps.length}
          </p>
          <p className="mt-0.5 text-sm font-medium text-slate-800">{current?.label}</p>
          <div className="mt-2 flex gap-1" aria-hidden>
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  index <= activeIndex ? "bg-[#1162A8]" : "bg-slate-200"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "hidden w-full shrink-0 justify-center sm:flex",
          dense ? "mb-2" : "mb-6 sm:mb-8"
        )}
      >
        <div className="flex max-w-full items-center justify-center gap-1.5 overflow-x-auto pb-1 sm:gap-3">
        {steps.map((step, index) => {
          const isActive = activeStep === step.id
          const isComplete = index < activeIndex
          const Icon = step.icon

          return (
            <div key={step.id} className="flex items-center gap-2 sm:gap-4">
              <button
                type="button"
                onClick={() => {
                  if (index <= activeIndex) {
                    onStepChange(step.id)
                  }
                }}
                className={cn(
                  "group flex min-w-0 items-center gap-1.5 rounded-xl transition-all sm:gap-2",
                  dense ? "px-2 py-1.5 sm:px-3 sm:py-2" : "px-3 py-2 sm:gap-3 sm:px-4 sm:py-3",
                  isActive
                    ? "bg-[#1162A8]/10 text-[#1162A8] ring-1 ring-[#1162A8]/20"
                    : isComplete
                      ? "text-[#1162A8] hover:bg-slate-50"
                      : "text-slate-400"
                )}
              >
                <span
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                    dense ? "h-7 w-7 text-xs" : "h-8 w-8",
                    isActive
                      ? "bg-[#1162A8] text-white shadow-sm"
                      : isComplete
                        ? "bg-[#1162A8]/15 text-[#1162A8]"
                        : "bg-slate-100 text-slate-400"
                  )}
                >
                  {isComplete ? "✓" : index + 1}
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className="block text-sm font-semibold">{step.label}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs opacity-80">
                    <Icon className="h-3 w-3" />
                    Step {index + 1} of {steps.length}
                  </span>
                </span>
              </button>

              {index < steps.length - 1 ? (
                <div
                  className={cn(
                    "hidden h-px w-8 sm:block sm:w-12",
                    index < activeIndex ? "bg-[#1162A8]/40" : "bg-slate-200"
                  )}
                />
              ) : null}
            </div>
          )
        })}
        </div>
      </div>
    </>
  )
}
