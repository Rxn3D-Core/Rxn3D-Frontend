"use client"

import { useState, useEffect } from "react"
import { Edit, Save, X } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { updateBusinessSettings, getBusinessSettings, convertTo24Hour, convertTo12Hour } from "@/lib/api-business-settings"
import { useAuth } from "@/contexts/auth-context"

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
  const [rushFeeType, setRushFeeType] = useState<"fixed" | "flexible">("fixed")
  const [turnaroundDays, setTurnaroundDays] = useState(rushSettings.fixed_turnaround_days?.toString() || "3")
  const [rushFeePercent, setRushFeePercent] = useState(rushSettings.fixed_rush_fee_percentage || "25")
  
  const [isEditingPickup, setIsEditingPickup] = useState(false)
  const [isEditingDelivery, setIsEditingDelivery] = useState(false)
  const [editPickupTime, setEditPickupTime] = useState("")
  const [editDeliveryTime, setEditDeliveryTime] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  
  const { toast } = useToast()
  const { user } = useAuth()

  // Initialize from existing data
  useEffect(() => {
    setRushEnabled(rushSettings.enabled)
    if (rushSettings.rush_type) {
      setTurnaroundType(rushSettings.rush_type)
    }
    if (rushSettings.fixed_turnaround_days !== undefined) {
      setTurnaroundDays(rushSettings.fixed_turnaround_days.toString())
    }
    if (rushSettings.fixed_rush_fee_percentage) {
      // Convert to string if needed
      const feeValue = String(rushSettings.fixed_rush_fee_percentage)
      setRushFeePercent(feeValue)
      setRushFeeType("fixed")
    } else {
      // If no fixed_rush_fee_percentage, it might be flexible
      // But we'll default to fixed with default value
      setRushFeeType("fixed")
    }
  }, [rushSettings])

  // Get customer ID if not provided
  const getCustomerId = (): number | null => {
    if (customerId) return customerId
    
    if (typeof window !== "undefined") {
      const storedCustomerId = localStorage.getItem("customerId")
      if (storedCustomerId) {
        return parseInt(storedCustomerId, 10)
      }
    }

    if (user?.customers && user.customers.length > 0) {
      return user.customers[0].id
    }

    if (user?.customer_id) {
      return user.customer_id
    }

    return null
  }

  const handleEditPickup = () => {
    setIsEditingPickup(true)
    setEditPickupTime(convertTo24Hour(pickupData.cutOffTime))
  }

  const handleEditDelivery = () => {
    setIsEditingDelivery(true)
    setEditDeliveryTime(convertTo24Hour(deliveryData.defaultTime))
  }

  const handleSavePickup = async () => {
    const cId = getCustomerId()
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
      // Only update the pickup time, other fields will be merged from current settings
      await updateBusinessSettings({
        customer_id: cId,
        customer_type: "lab",
        case_schedule: {
          default_pickup_time: convertTo24Hour(editPickupTime),
        },
      })

      toast({
        title: "Success",
        description: "Pickup time updated successfully",
      })

      setIsEditingPickup(false)
      if (onUpdate) {
        onUpdate()
      }
    } catch (error: any) {
      console.error("Error updating pickup time:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update pickup time",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveDelivery = async () => {
    const cId = getCustomerId()
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
      // Only update the delivery time, other fields will be merged from current settings
      await updateBusinessSettings({
        customer_id: cId,
        customer_type: "lab",
        case_schedule: {
          default_delivery_time: convertTo24Hour(editDeliveryTime),
        },
      })

      toast({
        title: "Success",
        description: "Delivery time updated successfully",
      })

      setIsEditingDelivery(false)
      if (onUpdate) {
        onUpdate()
      }
    } catch (error: any) {
      console.error("Error updating delivery time:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update delivery time",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveRushSettings = async () => {
    const cId = getCustomerId()
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
          fixed_rush_fee_percentage: rushEnabled && rushFeeType === "fixed" ? rushFeePercent : undefined,
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
    <div className="flex items-center py-2">
      <span className="text-gray-500 w-48">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )

  return (
    <div className="p-6 bg-gray-50">
      <div className="space-y-6">
        {/* Pick Up Options */}
        <div className="bg-white rounded-lg border">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Pick Up Options</h3>
              {!isEditingPickup ? (
                <Edit 
                  className="h-4 w-4 text-gray-400 cursor-pointer hover:text-blue-600" 
                  onClick={handleEditPickup}
                />
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSavePickup}
                    disabled={isSaving}
                    className="h-8"
                  >
                    <Save className="h-4 w-4 text-green-600 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingPickup(false)}
                    disabled={isSaving}
                    className="h-8"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <InfoRow label="Service Area:" value={pickupData.serviceArea} />
              <InfoRow label="Pick up days:" value={pickupData.pickupDays} />
              {isEditingPickup ? (
                <div className="flex items-center py-2">
                  <span className="text-gray-500 w-48">Pick up cut off time:</span>
                  <Input
                    type="time"
                    value={editPickupTime}
                    onChange={(e) => setEditPickupTime(e.target.value)}
                    className="w-32 h-8"
                    disabled={isSaving}
                  />
                </div>
              ) : (
                <InfoRow label="Pick up cut off time:" value={pickupData.cutOffTime} />
              )}
              <InfoRow label="Pick up Frequency:" value={pickupData.frequency} />
              <InfoRow label="Pick up Window" value={pickupData.window} />
            </div>
          </div>
        </div>

        {/* Delivery Options */}
        <div className="bg-white rounded-lg border">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Delivery Options</h3>
              {!isEditingDelivery ? (
                <Edit 
                  className="h-4 w-4 text-gray-400 cursor-pointer hover:text-blue-600" 
                  onClick={handleEditDelivery}
                />
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveDelivery}
                    disabled={isSaving}
                    className="h-8"
                  >
                    <Save className="h-4 w-4 text-green-600 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingDelivery(false)}
                    disabled={isSaving}
                    className="h-8"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <InfoRow label="Service Area:" value={deliveryData.serviceArea} />
              <InfoRow label="Delivery days:" value={deliveryData.deliveryDays} />
              {isEditingDelivery ? (
                <div className="flex items-center py-2">
                  <span className="text-gray-500 w-48">Default Delivery time:</span>
                  <Input
                    type="time"
                    value={editDeliveryTime}
                    onChange={(e) => setEditDeliveryTime(e.target.value)}
                    className="w-32 h-8"
                    disabled={isSaving}
                  />
                </div>
              ) : (
                <InfoRow label="Default Delivery time:" value={deliveryData.defaultTime} />
              )}
              <InfoRow label="Delivery Window:" value={deliveryData.window} />
            </div>
          </div>
        </div>

        {/* Rush Cases */}
        <div className="bg-white rounded-lg border">
          <div className="p-6">
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
              <label htmlFor="rush-cases" className="font-medium text-gray-900">
                Enable Rush cases
              </label>
            </div>
            <p className="text-gray-500 text-sm italic mb-6">{rushSettings.description}</p>

            {rushEnabled && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-6">Rush case Setting</h4>

                <div className="grid grid-cols-2 gap-12">
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
                        <Label htmlFor="fixed-turnaround" className="font-medium text-gray-900">
                          Fixed Turnaround Time
                        </Label>
                        <Input
                          className="w-16 h-8 ml-4 text-center border-blue-300 focus:border-blue-500"
                          value={turnaroundDays}
                          onChange={(e) => {
                            setTurnaroundDays(e.target.value)
                          }}
                          disabled={isSaving || turnaroundType !== "fixed"}
                        />
                        <span className="text-gray-900">days</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem
                          value="flexible"
                          id="flexible-turnaround"
                          className="border-blue-600 text-blue-600"
                        />
                        <Label htmlFor="flexible-turnaround" className="font-medium text-gray-900">
                          Flexible Turnaround Time
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Right Column - Rush Fee */}
                  <div>
                    <RadioGroup 
                      value={rushFeeType} 
                      onValueChange={(value) => {
                        setRushFeeType(value as "fixed" | "flexible")
                      }} 
                      className="space-y-4"
                      disabled={isSaving}
                    >
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem
                          value="fixed"
                          id="fixed-rush-fee"
                          className="border-blue-600 text-blue-600"
                        />
                        <Label htmlFor="fixed-rush-fee" className="font-medium text-gray-900">
                          Fixed Rush Fee
                        </Label>
                        <Input
                          className="w-16 h-8 ml-4 text-center border-blue-300 focus:border-blue-500"
                          value={rushFeePercent}
                          onChange={(e) => {
                            setRushFeePercent(e.target.value)
                          }}
                          disabled={isSaving || rushFeeType !== "fixed"}
                        />
                        <span className="text-gray-900">%</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem
                          value="flexible"
                          id="flexible-rush-fee"
                          className="border-blue-600 text-blue-600"
                        />
                        <Label htmlFor="flexible-rush-fee" className="font-medium text-gray-900">
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
