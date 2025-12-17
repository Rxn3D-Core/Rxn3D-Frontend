"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Info, Moon, Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TimePicker } from "@/components/onboarding/time-picker"
import { AuthHeader } from "@/components/auth-header"
import { useBusinessSettings } from "@/contexts/business-settings-context"
import { convertTo12Hour } from "@/utils/time-utils"
import { useOnboardingStatus } from "@/hooks/use-onboarding-status"
import { useAuth } from "@/contexts/auth-context"

export default function BusinessHoursPage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { isOnboardingComplete, isLoading: onboardingLoading } = useOnboardingStatus()
  const [activeTab, setActiveTab] = useState("working-days")
  const [customerType, setCustomerType] = useState("office")
  const [customerId, setCustomerId] = useState<string | null>(null)
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const customerIdStored = localStorage.getItem("customerId")
      const typeStored = localStorage.getItem("customerType")
      if (customerIdStored) setCustomerId(customerIdStored)
      if (typeStored) setCustomerType(typeStored)
    }
  }, [])

  // Validate onboarding status - redirect if already onboarded
  const hasRedirectedRef = React.useRef(false)
  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirectedRef.current) {
      return
    }

    if (!onboardingLoading && user && isOnboardingComplete) {
      const isSuperAdmin = user.roles?.includes("superadmin")
      if (!isSuperAdmin) {
        hasRedirectedRef.current = true
        router.replace("/dashboard")
      }
    }
  }, [onboardingLoading, user, isOnboardingComplete, router])

  useEffect(() => {
    if (customerType.toLowerCase() === "office") {
      setActiveTab("working-days")
    }
  }, [customerType])

  const {
    workingDays,
    businessHours,
    caseSchedule,
    isLoading,
    error,
    setWorkingDay,
    setBusinessHour,
    setCaseSchedule,
    submitBusinessSettings,
    resetError,
  } = useBusinessSettings()

  const handleSubmit = async () => {
    if (!customerId) {
      return
    }
    const result = await submitBusinessSettings(Number(customerId), customerType)

    if (result) {
      if (customerType.toLowerCase() === "office") {
      router.push("/onboarding/invite-users")
      } else {
      router.push("/onboarding/products")
      }
    }
  }

  const handleContinueLater = () => {
    // Defer logout to next tick to avoid hook order issues during render
    setTimeout(() => {
      logout()
    }, 0)
  }

  const isLabCustomer = customerType.toLowerCase() === "lab"

  return (
    <div className="flex flex-col min-h-screen bg-[#f7fbff]">
      {/* Header */}
      <AuthHeader />
      {/* Progress bar */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="relative h-1 bg-[#e4e6ef] rounded-full max-w-3xl mx-auto">
          <div className="absolute h-1 w-2/5 bg-[#1162a8] rounded-full"></div>
        </div>
        <div className="text-right max-w-3xl mx-auto mt-1 text-sm">40% complete</div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetError}
                  className="ml-2 h-auto p-0 text-red-600 hover:text-red-800"
                >
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-white rounded-lg shadow p-8 mb-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-1">Business Hours</h1>
              <p className="text-[#545f71]">Let us know your operating hours</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {isLabCustomer ? (
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger
                    value="working-days"
                    className="data-[state=active]:bg-[#dfeefb] data-[state=active]:text-[#1162a8]"
                  >
                    Working Days
                  </TabsTrigger>
                  <TabsTrigger
                    value="case-schedule"
                    className="data-[state=active]:bg-[#dfeefb] data-[state=active]:text-[#1162a8]"
                  >
                    Case Schedule
                  </TabsTrigger>
                </TabsList>
              ) : (
                <div className="mb-8">
                  <div className="bg-[#dfeefb] text-[#1162a8] px-4 py-2 rounded-md text-center font-medium">
                    Working Days
                  </div>
                </div>
              )}

              <TabsContent value="working-days">
                <div className="space-y-4">
                  {Object.entries(workingDays).map(([day, enabled]) => (
                    <DaySchedule
                      key={day}
                      day={day.charAt(0).toUpperCase() + day.slice(1)}
                      enabled={enabled}
                      fromTime={convertTo12Hour(businessHours[day]?.fromTime || "08:00")}
                      toTime={convertTo12Hour(businessHours[day]?.toTime || "17:00")}
                      onToggle={() => setWorkingDay(day, !enabled)}
                      onTimeChange={(fromTime, toTime) => setBusinessHour(day, fromTime, toTime)}
                    />
                  ))}
                </div>
              </TabsContent>

              {isLabCustomer && (
                <TabsContent value="case-schedule">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Default Pick Up Time*</label>
                        <TimePicker
                          value={convertTo12Hour(caseSchedule.defaultPickupTime)}
                          onChange={(value) => setCaseSchedule({ defaultPickupTime: value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Default Delivery Time*</label>
                        <TimePicker
                          value={convertTo12Hour(caseSchedule.defaultDeliveryTime)}
                          onChange={(value) => setCaseSchedule({ defaultDeliveryTime: value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="rush-cases"
                          checked={caseSchedule.enableRush}
                          onCheckedChange={(checked) => setCaseSchedule({ enableRush: checked as boolean })}
                          className="data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                        />
                        <label
                          htmlFor="rush-cases"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Enable Rush cases
                        </label>
                      </div>
                      <p className="text-xs text-[#b4b0b0] ml-6">Allow users to request expedited processing.</p>
                    </div>

                    {caseSchedule.enableRush && (
                      <div className="bg-[#f2f8ff] p-6 rounded-md space-y-6">
                        <h3 className="font-medium">Rush case Setting</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <RadioGroup
                              value={caseSchedule.turnaroundType}
                              onValueChange={(value) =>
                                setCaseSchedule({ turnaroundType: value as "fixed" | "flexible" })
                              }
                              className="space-y-3"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="fixed"
                                  id="fixed-turnaround"
                                  className="data-[state=checked]:border-[#1162a8] data-[state=checked]:text-[#1162a8]"
                                />
                                <label htmlFor="fixed-turnaround" className="text-sm">
                                  Fixed Turnaround Time
                                </label>
                              </div>

                              {caseSchedule.turnaroundType === "fixed" && (
                                <div className="ml-6 flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={caseSchedule.fixedTurnaroundDays}
                                    onChange={(e) =>
                                      setCaseSchedule({ fixedTurnaroundDays: Number.parseInt(e.target.value) || 3 })
                                    }
                                    className="w-16 text-center"
                                  />
                                  <span className="text-sm">days</span>
                                </div>
                              )}

                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="flexible"
                                  id="flexible-turnaround"
                                  className="data-[state=checked]:border-[#1162a8] data-[state=checked]:text-[#1162a8]"
                                />
                                <label htmlFor="flexible-turnaround" className="text-sm">
                                  Flexible Turnaround Time
                                </label>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-5 w-5 text-[#1162a8]">
                                        <Info className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p>Choose the delivery date, and the system will adjust the turnaround time</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </RadioGroup>
                          </div>

                          <div className="space-y-4">
                            <RadioGroup
                              value={caseSchedule.rushFeeType}
                              onValueChange={(value) => setCaseSchedule({ rushFeeType: value as "fixed" | "flexible" })}
                              className="space-y-3"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="fixed"
                                  id="fixed-fee"
                                  className="data-[state=checked]:border-[#1162a8] data-[state=checked]:text-[#1162a8]"
                                />
                                <label htmlFor="fixed-fee" className="text-sm">
                                  Fixed Rush Fee
                                </label>
                              </div>

                              {caseSchedule.rushFeeType === "fixed" && (
                                <div className="ml-6 flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={caseSchedule.fixedRushFeePercent}
                                    onChange={(e) =>
                                      setCaseSchedule({ fixedRushFeePercent: Number.parseInt(e.target.value) || 50 })
                                    }
                                    className="w-20 text-center"
                                  />
                                  <span className="text-sm">%</span>
                                </div>
                              )}

                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="flexible"
                                  id="flexible-fee"
                                  className="data-[state=checked]:border-[#1162a8] data-[state=checked]:text-[#1162a8]"
                                />
                                <label htmlFor="flexible-fee" className="text-sm">
                                  Flexible Rush Fee
                                </label>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-5 w-5 text-[#1162a8]">
                                        <Info className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p>Calculates rush fee based on how many days early the case is needed.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </RadioGroup>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              className="bg-[#eef1f4] border-[#eef1f4] hover:bg-[#dfeefb] hover:border-[#dfeefb]"
              onClick={handleContinueLater}
              disabled={isLoading}
            >
              Continue Later
            </Button>
            <Button
              className="bg-[#1162a8] hover:bg-[#1162a8]/90 border border-[#1162a8]"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Next"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface DayScheduleProps {
  day: string
  enabled: boolean
  fromTime: string
  toTime: string
  onToggle: () => void
  onTimeChange: (fromTime: string, toTime: string) => void
}

function DaySchedule({ day, enabled, fromTime, toTime, onToggle, onTimeChange }: DayScheduleProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-28">
        <div className="flex items-center gap-2">
          <div
            className={`w-5 h-5 rounded-full border flex items-center justify-center cursor-pointer ${
              enabled ? "bg-[#1162a8] border-[#1162a8]" : "bg-white border-[#b9b9b9]"
            }`}
            onClick={onToggle}
          >
            {enabled && <div className="w-2 h-2 bg-white rounded-full"></div>}
          </div>
          <span className="text-sm font-medium">{day}</span>
        </div>
      </div>

      {enabled ? (
        <>
          <div className="text-xs text-[#545f71]">From</div>
          <TimePicker value={fromTime} onChange={(value) => onTimeChange(value, toTime)} className="w-36" />

          <div className="text-xs text-[#545f71]">To</div>
          <TimePicker value={toTime} onChange={(value) => onTimeChange(fromTime, value)} className="w-36" />
        </>
      ) : (
        <div className="flex items-center gap-2 bg-[#eef1f4] px-4 py-2 rounded text-sm text-[#545f71] flex-1">
          <Moon className="h-4 w-4" /> Closed
        </div>
      )}
    </div>
  )
}
