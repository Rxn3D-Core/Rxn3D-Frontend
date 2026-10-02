"use client"

import { useState, useEffect, useCallback } from "react"
import { Save } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { updateBusinessSettings, convertTo24Hour, convertTo12Hour } from "@/lib/api-business-settings"
import { useAuth } from "@/contexts/auth-context"
import { TimePicker } from "@/components/onboarding/time-picker"
import { getActiveCustomerId } from "@/lib/customer-scope"
import {
  DEFAULT_DELIVERY_TIME_12,
  DEFAULT_PICKUP_TIME_12,
  parseBusinessHourTime,
} from "@/utils/time-utils"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

interface CasePanCutoffRow {
  id: number
  name: string
  code: string
  /** 12-hour display; empty string = use lab default */
  cutoffDisplay: string
}

interface PickupDeliveryTabProps {
  pickupData: {
    serviceArea: string
    pickupDays: string
    cutOffTime: string
    frequency: string
    window: string
  }
  deliveryData: {
    serviceArea: string
    deliveryDays: string
    defaultTime: string
    window: string
  }
  rushSettings: {
    enabled: boolean
    description: string
    rush_type?: "fixed" | "flexible"
    fixed_turnaround_days?: number
    fixed_rush_fee_percentage?: string
  }
  customerId?: number
  onUpdate?: () => void
}

export function PickupDeliveryTab({ 
  pickupData, 
  deliveryData, 
  rushSettings,
  customerId,
  onUpdate 
}: PickupDeliveryTabProps) {
  const [rushEnabled, setRushEnabled] = useState(rushSettings.enabled)
  const [turnaroundType, setTurnaroundType] = useState<"fixed" | "flexible">(rushSettings.rush_type || "fixed")
  const [turnaroundDays, setTurnaroundDays] = useState(rushSettings.fixed_turnaround_days?.toString() || "3")
  const [rushFeePercent, setRushFeePercent] = useState(rushSettings.fixed_rush_fee_percentage || "25")
  
  const [pickupTime, setPickupTime] = useState(() =>
    parseBusinessHourTime(pickupData.cutOffTime, DEFAULT_PICKUP_TIME_12) || DEFAULT_PICKUP_TIME_12
  )
  const [deliveryTime, setDeliveryTime] = useState(() =>
    parseBusinessHourTime(deliveryData.defaultTime, DEFAULT_DELIVERY_TIME_12) || DEFAULT_DELIVERY_TIME_12
  )
  const [casePanCutoffs, setCasePanCutoffs] = useState<CasePanCutoffRow[]>([])
  const [isLoadingCasePans, setIsLoadingCasePans] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const { toast } = useToast()
  const { user } = useAuth()

  // Sync state from API data
  useEffect(() => {
    setRushEnabled(rushSettings.enabled)
    setTurnaroundType(rushSettings.rush_type || "fixed")
    if (rushSettings.fixed_turnaround_days !== undefined) {
      setTurnaroundDays(rushSettings.fixed_turnaround_days.toString())
    }
    if (rushSettings.fixed_rush_fee_percentage) {
      setRushFeePercent(String(rushSettings.fixed_rush_fee_percentage))
    }
  }, [rushSettings])

  useEffect(() => {
    setPickupTime(parseBusinessHourTime(pickupData.cutOffTime, DEFAULT_PICKUP_TIME_12) || DEFAULT_PICKUP_TIME_12)
  }, [pickupData.cutOffTime])

  useEffect(() => {
    setDeliveryTime(parseBusinessHourTime(deliveryData.defaultTime, DEFAULT_DELIVERY_TIME_12) || DEFAULT_DELIVERY_TIME_12)
  }, [deliveryData.defaultTime])

  const resolveCustomerId = useCallback((): number | null => {
    if (customerId) return customerId
    const stored = getActiveCustomerId()
    if (stored) {
      const parsed = parseInt(stored, 10)
      if (Number.isFinite(parsed)) return parsed
    }
    if (user?.customers && user.customers.length > 0) {
      return user.customers[0].id
    }
    if (user?.customer_id) {
      return user.customer_id
    }
    return null
  }, [customerId, user])

  const fetchCasePanCutoffs = useCallback(async () => {
    const cId = resolveCustomerId()
    if (!cId) return

    setIsLoadingCasePans(true)
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      if (!token) return

      const response = await fetch(
        `${API_BASE_URL}/library/case-pans?customer_id=${cId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )
      if (!response.ok) {
        throw new Error("Failed to load case pans")
      }
      const data = await response.json()
      const pans = (data.data?.data || data.data || []) as Array<{
        id: number
        name: string
        code: string
        pickup_cutoff_time?: string | null
        lab_case_pan?: { pickup_cutoff_time?: string | null }
      }>

      setCasePanCutoffs(
        pans.map((pan) => {
          const raw = pan.pickup_cutoff_time ?? pan.lab_case_pan?.pickup_cutoff_time ?? null
          return {
            id: pan.id,
            name: pan.name,
            code: pan.code,
            cutoffDisplay: raw
              ? parseBusinessHourTime(raw, DEFAULT_PICKUP_TIME_12) || convertTo12Hour(raw) || ""
              : "",
          }
        })
      )
    } catch (error) {
      console.error("Error loading case pan cutoffs:", error)
    } finally {
      setIsLoadingCasePans(false)
    }
  }, [resolveCustomerId])

  useEffect(() => {
    fetchCasePanCutoffs()
  }, [fetchCasePanCutoffs])

  const normalizeTime = (value: string, fallback: string) => {
    const next = value.trim() ? convertTo12Hour(convertTo24Hour(value) || fallback) : fallback
    return next || fallback
  }

  const saveScheduleTime = async (
    field: "default_pickup_time" | "default_delivery_time",
    displayTime: string,
    successMessage: string
  ) => {
    const cId = resolveCustomerId()
    if (!cId) {
      toast({
        title: "Error",
        description: "Customer ID not found",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      await updateBusinessSettings({
        customer_id: cId,
        customer_type: "lab",
        case_schedule: {
          [field]: convertTo24Hour(displayTime),
        },
      })

      toast({
        title: "Success",
        description: successMessage,
      })

      onUpdate?.()
    } catch (error: unknown) {
      console.error("Error updating schedule time:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update time",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePickupTimeChange = async (value: string) => {
    const next = normalizeTime(value, DEFAULT_PICKUP_TIME_12)
    setPickupTime(next)
    await saveScheduleTime("default_pickup_time", next, "Pickup time updated successfully")
  }

  const handleDeliveryTimeChange = async (value: string) => {
    const next = normalizeTime(value, DEFAULT_DELIVERY_TIME_12)
    setDeliveryTime(next)
    await saveScheduleTime("default_delivery_time", next, "Delivery time updated successfully")
  }

  const handleCasePanCutoffChange = async (casePanId: number, value: string) => {
    const cId = resolveCustomerId()
    if (!cId) {
      toast({
        title: "Error",
        description: "Customer ID not found",
        variant: "destructive",
      })
      return
    }

    const next = value.trim() ? normalizeTime(value, DEFAULT_PICKUP_TIME_12) : ""
    setCasePanCutoffs((prev) =>
      prev.map((pan) => (pan.id === casePanId ? { ...pan, cutoffDisplay: next } : pan))
    )

    setIsSaving(true)
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      if (!token) throw new Error("Authentication token not found")

      const response = await fetch(`${API_BASE_URL}/library/case-pans/${casePanId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: cId,
          pickup_cutoff_time: next ? convertTo24Hour(next) : null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to update case pan pickup time")
      }

      toast({
        title: "Success",
        description: "Case pan pickup time updated successfully",
      })
    } catch (error: unknown) {
      console.error("Error updating case pan cutoff:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update case pan pickup time",
        variant: "destructive",
      })
      await fetchCasePanCutoffs()
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveRushSettings = async () => {
    const cId = resolveCustomerId()
    if (!cId) {
      toast({
        title: "Error",
        description: "Customer ID not found",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      // Only update rush settings, other fields will be merged from current settings
      await updateBusinessSettings({
        customer_id: cId,
        customer_type: "lab",
        case_schedule: {
          enable_rush_cases: rushEnabled,
          rush_type: rushEnabled ? turnaroundType : undefined,
          fixed_turnaround_days: rushEnabled && turnaroundType === "fixed" ? parseInt(turnaroundDays) : undefined,
          fixed_rush_fee_percentage: rushEnabled && turnaroundType === "fixed" ? rushFeePercent : undefined,
        },
      })

      toast({
        title: "Success",
        description: "Rush settings updated successfully",
      })

      if (onUpdate) {
        onUpdate()
      }
    } catch (error: any) {
      console.error("Error updating rush settings:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update rush settings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col sm:flex-row sm:items-center py-2 border-b sm:border-b-0 border-gray-100 last:border-b-0">
      <span className="text-gray-500 text-sm sm:w-48 flex-shrink-0">{label}</span>
      <span className="font-medium text-gray-900 text-sm mt-0.5 sm:mt-0">{value}</span>
    </div>
  )

  return (
    <div className="px-4 py-3 sm:px-6 sm:py-4 bg-gray-50">
      <div className="space-y-6">
        {/* Pick Up Options */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-6">Pick Up Options</h3>

            <div className="space-y-1">
              <InfoRow label="Service Area:" value={pickupData.serviceArea} />
              <InfoRow label="Pick up days:" value={pickupData.pickupDays} />
              <div className="flex flex-col sm:flex-row sm:items-center py-2 gap-2 sm:gap-0 border-b sm:border-b-0 border-gray-100">
                <span className="text-gray-500 text-sm sm:w-48 flex-shrink-0">Default pick up cut off time:</span>
                <TimePicker
                  value={pickupTime}
                  onChange={handlePickupTimeChange}
                  className="w-36 h-9"
                />
              </div>
              <InfoRow label="Pick up Frequency:" value={pickupData.frequency} />
              <InfoRow label="Pick up Window" value={pickupData.window} />
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">Case pan pick up cut off times</h4>
              <p className="text-sm text-gray-500 mb-4">
                Optional per case pan. When set, slips for that case pan use this cut off instead of the default.
              </p>
              {isLoadingCasePans ? (
                <p className="text-sm text-gray-500">Loading case pans…</p>
              ) : casePanCutoffs.length === 0 ? (
                <p className="text-sm text-gray-500">No case pans found for this lab.</p>
              ) : (
                <div className="space-y-2">
                  {casePanCutoffs.map((pan) => (
                    <div
                      key={pan.id}
                      className="flex flex-col sm:flex-row sm:items-center py-2 gap-2 sm:gap-0 border-b sm:border-b-0 border-gray-100"
                    >
                      <span className="text-gray-500 text-sm sm:w-48 flex-shrink-0">
                        {pan.name}{pan.code ? ` (${pan.code})` : ""}:
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <TimePicker
                          value={pan.cutoffDisplay || pickupTime}
                          onChange={(value) => handleCasePanCutoffChange(pan.id, value)}
                          className="w-36 h-9"
                        />
                        {pan.cutoffDisplay ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 px-2 text-xs text-gray-600"
                            disabled={isSaving}
                            onClick={() => handleCasePanCutoffChange(pan.id, "")}
                          >
                            Use default
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-500">Using default</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delivery Options */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-6">Delivery Options</h3>

            <div className="space-y-1">
              <InfoRow label="Service Area:" value={deliveryData.serviceArea} />
              <InfoRow label="Delivery days:" value={deliveryData.deliveryDays} />
              <div className="flex flex-col sm:flex-row sm:items-center py-2 gap-2 sm:gap-0 border-b sm:border-b-0 border-gray-100">
                <span className="text-gray-500 text-sm sm:w-48 flex-shrink-0">Default Delivery time:</span>
                <TimePicker
                  value={deliveryTime}
                  onChange={handleDeliveryTimeChange}
                  className="w-36 h-9"
                />
              </div>
              <InfoRow label="Delivery Window:" value={deliveryData.window} />
            </div>
          </div>
        </div>

        {/* Rush Cases */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">Rush Cases</h3>

            <div className="flex items-center space-x-3 mb-2">
              <Checkbox
                id="rush-cases"
                checked={rushEnabled}
                onCheckedChange={(checked) => {
                  setRushEnabled(checked as boolean)
                }}
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                disabled={isSaving}
              />
              <label htmlFor="rush-cases" className="font-medium text-gray-900 cursor-pointer text-sm sm:text-base">
                Enable Rush cases
              </label>
            </div>
            <p className="text-gray-500 text-sm italic mb-6">{rushSettings.description}</p>

            {rushEnabled && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-6">Rush case Setting</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
                  {/* Left Column - Turnaround Time */}
                  <div>
                    <RadioGroup 
                      value={turnaroundType} 
                      onValueChange={(value) => {
                        setTurnaroundType(value as "fixed" | "flexible")
                      }} 
                      className="space-y-4"
                      disabled={isSaving}
                    >
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem
                          value="fixed"
                          id="fixed-turnaround"
                          className="border-blue-600 text-blue-600"
                        />
                        <Label htmlFor="fixed-turnaround" className="font-medium text-gray-900 text-sm sm:text-base cursor-pointer">
                          Fixed Turnaround Time
                        </Label>
                        <Input
                          className="w-16 h-8 ml-4 text-center border-blue-300 focus:border-blue-500 text-xs sm:text-sm"
                          value={turnaroundDays}
                          onChange={(e) => {
                            setTurnaroundDays(e.target.value)
                          }}
                          disabled={isSaving || turnaroundType !== "fixed"}
                        />
                        <span className="text-gray-900 text-sm">days</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem
                          value="flexible"
                          id="flexible-turnaround"
                          className="border-blue-600 text-blue-600"
                        />
                        <Label htmlFor="flexible-turnaround" className="font-medium text-gray-900 text-sm sm:text-base cursor-pointer">
                          Flexible Turnaround Time
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Right Column - Rush Fee */}
                  <div>
                    <RadioGroup
                      value={turnaroundType}
                      onValueChange={(value) => setTurnaroundType(value as "fixed" | "flexible")}
                      className="space-y-4"
                      disabled={isSaving}
                    >
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem
                          value="fixed"
                          id="fixed-rush-fee"
                          className="border-blue-600 text-blue-600"
                        />
                        <Label htmlFor="fixed-rush-fee" className="font-medium text-gray-900 text-sm sm:text-base cursor-pointer">
                          Fixed Rush Fee
                        </Label>
                        <Input
                          className="w-16 h-8 ml-4 text-center border-blue-300 focus:border-blue-500 text-xs sm:text-sm"
                          value={rushFeePercent}
                          onChange={(e) => setRushFeePercent(e.target.value)}
                          disabled={isSaving || turnaroundType !== "fixed"}
                        />
                        <span className="text-gray-900 text-sm">%</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem
                          value="flexible"
                          id="flexible-rush-fee"
                          className="border-blue-600 text-blue-600"
                        />
                        <Label htmlFor="flexible-rush-fee" className="font-medium text-gray-900 text-sm sm:text-base cursor-pointer">
                          Flexible Rush Fee
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button for Rush Settings */}
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSaveRushSettings}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Rush Settings"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
