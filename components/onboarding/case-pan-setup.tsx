"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronRight, ChevronLeft, Clock, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Casespan } from "@/components/lab-administrator/casespan"

export function CasePanSetup() {
  const [casePanSettings, setCasePanSettings] = React.useState({
    defaultTurnaroundDays: 10,
    rushAvailable: true,
    rushFeePercentage: 25,
    rushTurnaroundDays: 3,
    autoAssignTechnicians: true,
    notifyOnCaseCreation: true,
    notifyOnCaseCompletion: true,
    notifyOnCaseDelay: true,
    defaultPriority: "normal",
    workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    workingHours: {
      start: "08:00",
      end: "17:00",
    },
  })

  const handleSettingChange = (setting: string, value: any) => {
    setCasePanSettings({
      ...casePanSettings,
      [setting]: value,
    })
  }

  const handleWorkingDayToggle = (day: string) => {
    const currentDays = [...casePanSettings.workingDays]
    if (currentDays.includes(day)) {
      handleSettingChange(
        "workingDays",
        currentDays.filter((d) => d !== day),
      )
    } else {
      handleSettingChange("workingDays", [...currentDays, day])
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg border p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Case Planning Settings</h2>
        <p className="text-gray-600 mb-8">Configure how cases are planned and scheduled in your lab</p>

        <Tabs defaultValue="turnaround" className="mb-8">
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="turnaround">Turnaround Times</TabsTrigger>
            <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="casespan">Casespan</TabsTrigger>
          </TabsList>

          <TabsContent value="turnaround" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultTurnaround" className="text-sm font-medium">
                    Default Turnaround Time (days)
                  </Label>
                  <div className="flex items-center">
                    <Input
                      id="defaultTurnaround"
                      type="number"
                      min="1"
                      value={casePanSettings.defaultTurnaroundDays}
                      onChange={(e) =>
                        handleSettingChange("defaultTurnaroundDays", Number.parseInt(e.target.value) || 1)
                      }
                      className="w-20 mr-2"
                    />
                    <span className="text-sm text-gray-500">business days</span>
                  </div>
                  <p className="text-xs text-gray-500">Standard time to complete cases</p>
                </div>

                <div className="space-y-2 pt-4">
                  <div className="flex items-center">
                    <Checkbox
                      id="rushAvailable"
                      checked={casePanSettings.rushAvailable}
                      onCheckedChange={(checked) => handleSettingChange("rushAvailable", checked === true)}
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <Label htmlFor="rushAvailable" className="ml-2 font-medium">
                      Enable Rush Cases
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 ml-6">Allow customers to request expedited processing</p>
                </div>
              </div>

              {casePanSettings.rushAvailable && (
                <div className="space-y-4 bg-blue-50 p-6 rounded-lg border border-blue-100">
                  <h3 className="font-medium text-blue-800">Rush Case Settings</h3>

                  <div className="space-y-2">
                    <Label htmlFor="rushTurnaround" className="text-sm font-medium text-blue-800">
                      Rush Turnaround Time (days)
                    </Label>
                    <div className="flex items-center">
                      <Input
                        id="rushTurnaround"
                        type="number"
                        min="1"
                        value={casePanSettings.rushTurnaroundDays}
                        onChange={(e) =>
                          handleSettingChange("rushTurnaroundDays", Number.parseInt(e.target.value) || 1)
                        }
                        className="w-20 mr-2 border-blue-200 focus:border-blue-400"
                      />
                      <span className="text-sm text-blue-700">business days</span>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <Label htmlFor="rushFee" className="text-sm font-medium text-blue-800">
                      Rush Fee (% markup)
                    </Label>
                    <div className="flex items-center">
                      <Input
                        id="rushFee"
                        type="number"
                        min="0"
                        max="100"
                        value={casePanSettings.rushFeePercentage}
                        onChange={(e) => handleSettingChange("rushFeePercentage", Number.parseInt(e.target.value) || 0)}
                        className="w-20 mr-2 border-blue-200 focus:border-blue-400"
                      />
                      <span className="text-sm text-blue-700">%</span>
                    </div>
                    <p className="text-xs text-blue-700">Additional charge for rush processing</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="scheduling" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Working Days</Label>
                  <div className="grid grid-cols-7 gap-2">
                    {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => (
                      <div
                        key={day}
                        className={`
                          flex flex-col items-center justify-center p-2 rounded-md cursor-pointer border
                          ${
                            casePanSettings.workingDays.includes(day)
                              ? "bg-blue-100 border-blue-300 text-blue-800"
                              : "bg-gray-50 border-gray-200 text-gray-400"
                          }
                        `}
                        onClick={() => handleWorkingDayToggle(day)}
                      >
                        <span className="text-xs font-medium capitalize">{day.substring(0, 3)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">Days when your lab is operational</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Working Hours</Label>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      <Clock size={16} className="mr-2 text-gray-500" />
                      <Input
                        type="time"
                        value={casePanSettings.workingHours.start}
                        onChange={(e) =>
                          handleSettingChange("workingHours", {
                            ...casePanSettings.workingHours,
                            start: e.target.value,
                          })
                        }
                        className="w-32"
                      />
                    </div>
                    <span className="text-gray-500">to</span>
                    <Input
                      type="time"
                      value={casePanSettings.workingHours.end}
                      onChange={(e) =>
                        handleSettingChange("workingHours", {
                          ...casePanSettings.workingHours,
                          end: e.target.value,
                        })
                      }
                      className="w-32"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Hours when your lab is operational</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Default Priority</Label>
                  <RadioGroup
                    value={casePanSettings.defaultPriority}
                    onValueChange={(value) => handleSettingChange("defaultPriority", value)}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="low"
                        id="priority-low"
                        className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
                      />
                      <Label htmlFor="priority-low" className="text-sm">
                        Low
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="normal"
                        id="priority-normal"
                        className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
                      />
                      <Label htmlFor="priority-normal" className="text-sm">
                        Normal
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="high"
                        id="priority-high"
                        className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
                      />
                      <Label htmlFor="priority-high" className="text-sm">
                        High
                      </Label>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-gray-500">Default priority level for new cases</p>
                </div>

                <div className="space-y-2 pt-4">
                  <div className="flex items-center">
                    <Checkbox
                      id="autoAssign"
                      checked={casePanSettings.autoAssignTechnicians}
                      onCheckedChange={(checked) => handleSettingChange("autoAssignTechnicians", checked === true)}
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <Label htmlFor="autoAssign" className="ml-2 font-medium">
                      Auto-assign Technicians
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 ml-6">
                    Automatically assign technicians based on workload and expertise
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notifyCreation"
                  checked={casePanSettings.notifyOnCaseCreation}
                  onCheckedChange={(checked) => handleSettingChange("notifyOnCaseCreation", checked === true)}
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <Label htmlFor="notifyCreation" className="font-medium">
                  Notify on Case Creation
                </Label>
              </div>
              <p className="text-xs text-gray-500 ml-6">Send notifications when new cases are created</p>

              <div className="flex items-center space-x-2 mt-4">
                <Checkbox
                  id="notifyCompletion"
                  checked={casePanSettings.notifyOnCaseCompletion}
                  onCheckedChange={(checked) => handleSettingChange("notifyOnCaseCompletion", checked === true)}
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <Label htmlFor="notifyCompletion" className="font-medium">
                  Notify on Case Completion
                </Label>
              </div>
              <p className="text-xs text-gray-500 ml-6">Send notifications when cases are completed</p>

              <div className="flex items-center space-x-2 mt-4">
                <Checkbox
                  id="notifyDelay"
                  checked={casePanSettings.notifyOnCaseDelay}
                  onCheckedChange={(checked) => handleSettingChange("notifyOnCaseDelay", checked === true)}
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <Label htmlFor="notifyDelay" className="font-medium">
                  Notify on Case Delay
                </Label>
              </div>
              <p className="text-xs text-gray-500 ml-6">Send notifications when cases are delayed</p>

              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mt-6 flex items-start">
                <AlertCircle size={20} className="text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-amber-800 font-medium">Notification Recipients</p>
                  <p className="text-xs text-amber-700 mt-1">
                    You can configure who receives these notifications in the Staff settings after completing
                    onboarding.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="casespan" className="space-y-6">
            <Casespan />
          </TabsContent>
        </Tabs>

        <div className="flex justify-between mt-8 pt-6 border-t">
          <div className="space-x-3">
            <Button variant="outline" className="text-gray-600 border-gray-300 hover:bg-gray-50">
              Continue Later
            </Button>
            <Button variant="outline" className="text-gray-600 border-gray-300 hover:bg-gray-50" asChild>
              <Link href="/onboarding/stage">
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
              </Link>
            </Button>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6" asChild>
            <Link href="/onboarding/grade">
              Next <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
