"use client"
import { ScanEye, Type, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAccessibility } from "@/contexts/accessibility-context"
import { cn } from "@/lib/utils"

export function AccessibilitySettings() {
  const { textSize, setTextSize, isSettingsOpen, setIsSettingsOpen } = useAccessibility()

  const textSizeOptions = [
    { value: "small" as const, label: "Small", description: "Compact text for more content" },
    { value: "medium" as const, label: "Medium", description: "Default text size" },
    { value: "large" as const, label: "Large", description: "Larger text for better readability" },
    { value: "extra-large" as const, label: "Extra Large", description: "Maximum text size for accessibility" },
  ]

  return (
    <>
      {/* Hide on tablet and mobile: only show on desktop (md and up) */}
      <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-50 hidden md:block">
        <Button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="h-14 w-14 rounded-full bg-[#1162A8] hover:bg-[#1162A8] shadow-lg transition-all duration-200 hover:scale-105"
          size="icon"
        >
          <ScanEye className="h-6 w-6 text-white" />
          <span className="sr-only">Open accessibility settings</span>
        </Button>
      </div>

      {/* Settings Panel: only show on desktop (md and up) */}
      {isSettingsOpen && (
        <div className="hidden md:block">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setIsSettingsOpen(false)} />

          {/* Settings Card - Positioned to the left of the button */}
          <div className="fixed right-24 top-1/2 transform -translate-y-1/2 z-50 w-80">
            <Card className="shadow-xl border-0 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Type className="h-5 w-5 text-blue-600" />
                  Accessibility Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium text-sm text-gray-700 mb-3">Text Size</h3>
                  <div className="space-y-2">
                    {textSizeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setTextSize(option.value)}
                        className={cn(
                          "w-full p-3 rounded-lg border-2 text-left transition-all duration-200",
                          "hover:border-blue-200 hover:bg-blue-50",
                          textSize === option.value ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div
                              className={cn(
                                "font-medium",
                                option.value === "small" && "text-sm",
                                option.value === "medium" && "text-base",
                                option.value === "large" && "text-lg",
                                option.value === "extra-large" && "text-xl",
                              )}
                            >
                              {option.label}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                          </div>
                          {textSize === option.value && <Check className="h-5 w-5 text-blue-600" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <Button onClick={() => setIsSettingsOpen(false)} variant="outline" className="w-full">
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
