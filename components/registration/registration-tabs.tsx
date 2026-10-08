"use client"

import { Building2, Mail, UserRound } from "lucide-react"
import { RegistrationStepper, type RegistrationStep } from "@/components/registration/registration-stepper"

export function RegistrationTabs({
  activeTab,
  setActiveTab,
  registrationType,
  includeVerifyStep = false,
  dense = false,
}: {
  activeTab: string
  setActiveTab: (tab: string) => void
  registrationType: "Lab" | "Office"
  includeVerifyStep?: boolean
  dense?: boolean
}) {
  const profileTabName = registrationType === "Lab" ? "Lab profile" : "Practice profile"

  const steps: RegistrationStep[] = [
    {
      id: "profile",
      label: profileTabName,
      icon: Building2,
    },
    {
      id: "user",
      label: "Admin account",
      icon: UserRound,
    },
  ]

  if (includeVerifyStep) {
    steps.push({
      id: "verify",
      label: "Verify email",
      icon: Mail,
    })
  }

  return (
    <RegistrationStepper steps={steps} activeStep={activeTab} onStepChange={setActiveTab} dense={dense} />
  )
}
