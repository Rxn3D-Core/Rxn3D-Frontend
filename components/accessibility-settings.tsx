"use client"
import { ScanEye, Type, Check } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAccessibility } from "@/contexts/accessibility-context"
import { cn } from "@/lib/utils"

interface DragState {
  isDragging: boolean
  startX: number
  startY: number
  originX: number
  originY: number
}

const BUTTON_SIZE = 56

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

const STORAGE_KEY = "accessibility-btn-pos"

function loadSavedPos(fallbackX: number, fallbackY: number): { x: number; y: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed.x === "number" && typeof parsed.y === "number") return parsed
    }
  } catch {}
  return { x: fallbackX, y: fallbackY }
}

function useDraggable(fallbackX: number, fallbackY: number) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragState = useRef<DragState>({ isDragging: false, startX: 0, startY: 0, originX: fallbackX, originY: fallbackY })
  const didDrag = useRef(false)

  // Runs only on the client after mount — avoids SSR/hydration mismatch
  useEffect(() => {
    const defaultX = window.innerWidth - BUTTON_SIZE - 16
    const defaultY = window.innerHeight / 2 - BUTTON_SIZE / 2
    setPos(loadSavedPos(defaultX, defaultY))
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!pos) return
    e.preventDefault()
    didDrag.current = false
    dragState.current = { isDragging: true, startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y }

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragState.current.isDragging) return
      const dx = ev.clientX - dragState.current.startX
      const dy = ev.clientY - dragState.current.startY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true
      const maxX = window.innerWidth - BUTTON_SIZE
      const maxY = window.innerHeight - BUTTON_SIZE
      const next = {
        x: clamp(dragState.current.originX + dx, 0, maxX),
        y: clamp(dragState.current.originY + dy, 0, maxY),
      }
      setPos(next)
    }

    const onMouseUp = () => {
      dragState.current.isDragging = false
      setPos((current) => {
        if (current) {
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(current)) } catch {}
        }
        return current
      })
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
  }, [pos])

  return { pos, onMouseDown, didDrag }
}

export function AccessibilitySettings() {
  const { textSize, setTextSize, isSettingsOpen, setIsSettingsOpen } = useAccessibility()
  const { pos: btnPos, onMouseDown: btnMouseDown, didDrag: btnDidDrag } = useDraggable(0, 0)

  const textSizeOptions = [
    { value: "small" as const, label: "Small", description: "Compact text for more content" },
    { value: "medium" as const, label: "Medium", description: "Default text size" },
    { value: "large" as const, label: "Large", description: "Larger text for better readability" },
    { value: "extra-large" as const, label: "Extra Large", description: "Maximum text size for accessibility" },
  ]

  if (!btnPos) return null

  const PANEL_WIDTH = 320
  const PANEL_HEIGHT = 420
  const panelX = clamp(btnPos.x - PANEL_WIDTH - 8, 0, (typeof window !== "undefined" ? window.innerWidth : 1200) - PANEL_WIDTH)
  const panelY = clamp(btnPos.y - PANEL_HEIGHT / 2, 0, (typeof window !== "undefined" ? window.innerHeight : 800) - PANEL_HEIGHT)

  return (
    <>
      {/* Trigger button — draggable, desktop only */}
      <div
        className="fixed z-50 hidden md:block cursor-grab active:cursor-grabbing"
        style={{ left: btnPos.x, top: btnPos.y }}
        onMouseDown={btnMouseDown}
      >
        <Button
          onClick={() => {
            if (!btnDidDrag.current) setIsSettingsOpen(!isSettingsOpen)
          }}
          className="h-14 w-14 rounded-full bg-[#1162A8] hover:bg-[#1162A8] shadow-lg transition-all duration-200 hover:scale-105"
          size="icon"
        >
          <ScanEye className="h-6 w-6 text-white" />
          <span className="sr-only">Open accessibility settings</span>
        </Button>
      </div>

      {/* Settings Panel — desktop only */}
      {isSettingsOpen && (
        <div className="hidden md:block">
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setIsSettingsOpen(false)} />
          <div className="fixed z-50 w-80" style={{ left: panelX, top: panelY }}>
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
