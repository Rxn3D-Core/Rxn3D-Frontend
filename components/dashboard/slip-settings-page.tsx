"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Info, HelpCircle } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface SlipHeaderField {
  id: string
  label: string
  description: string
  enabled: boolean
}

const DEFAULT_SLIP_FIELDS: SlipHeaderField[] = [
  {
    id: "patient_name",
    label: "Patient Name",
    description: "Show patient name on the slip header",
    enabled: true,
  },
  {
    id: "gender",
    label: "Gender",
    description: "Show patient gender on the slip header",
    enabled: true,
  },
  {
    id: "slip_number",
    label: "Slip Number",
    description: "Show slip number on the slip header",
    enabled: true,
  },
]

export function SlipSettingsPage() {
  const router = useRouter()
  const [fields, setFields] = useState<SlipHeaderField[]>(DEFAULT_SLIP_FIELDS)

  const handleToggle = (fieldId: string, enabled: boolean) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, enabled } : f))
    )
  }

  const handleSave = () => {
    // TODO: Save slip settings to backend
    router.push("/dashboard")
  }

  const handleCancel = () => {
    setFields(DEFAULT_SLIP_FIELDS)
    router.push("/dashboard")
  }

  const handleSelectAll = () => {
    setFields((prev) => prev.map((f) => ({ ...f, enabled: true })))
  }

  const handleDeselectAll = () => {
    setFields((prev) => prev.map((f) => ({ ...f, enabled: false })))
  }

  return (
    <div className="h-full w-full bg-[#F9F9F9] overflow-auto">
      <div className="w-full h-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-[#1162a8] text-white rounded-lg p-6 sm:p-8 shadow-sm">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Slip Settings</h1>
            <p className="text-blue-100 text-sm sm:text-base">
              Configure which fields are visible on the slip header
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle>Slip Header Fields</CardTitle>
                    <CardDescription>
                      Toggle which information fields are displayed on the slip header.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      className="whitespace-nowrap"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAll}
                      className="whitespace-nowrap"
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {fields.map((field) => (
                    <div
                      key={field.id}
                      className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">
                          {field.label}
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {field.description}
                        </p>
                      </div>
                      <Switch
                        checked={field.enabled}
                        onCheckedChange={(checked) =>
                          handleToggle(field.id, checked)
                        }
                      />
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="min-w-[100px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="bg-[#1162a8] hover:bg-[#0f5497] text-white min-w-[100px]"
                  >
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Instructions Sidebar - Right Side */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-[#1162a8]" />
                  How to Customize
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-[#1162a8] text-white flex items-center justify-center font-semibold text-sm">
                        1
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Show/Hide Fields</h4>
                      <p className="text-sm text-gray-600">
                        Use the toggle switch on the right of each field to show or hide it on the slip header.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-[#1162a8] text-white flex items-center justify-center font-semibold text-sm">
                        2
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Save Your Changes</h4>
                      <p className="text-sm text-gray-600">
                        Click &quot;Save Changes&quot; to apply your settings. Your preferences will be saved to your account.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-2 mb-2">
                      <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <h4 className="font-semibold text-sm text-blue-900">Note</h4>
                    </div>
                    <p className="text-sm text-blue-800">
                      These settings control which information appears on the slip header. Disabled fields will not be displayed when viewing or printing slips.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-sm mb-2">Field Status</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {fields.map((field) => (
                      <li key={field.id} className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            field.enabled ? "bg-green-500" : "bg-gray-300"
                          }`}
                        />
                        <span
                          className={
                            field.enabled ? "" : "line-through text-gray-400"
                          }
                        >
                          {field.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
