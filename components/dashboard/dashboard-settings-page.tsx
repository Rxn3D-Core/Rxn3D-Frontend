"use client"

import { useState, useEffect } from "react"
import { GripVertical, Info, HelpCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useDashboardSettings } from "@/hooks/use-dashboard-settings"
import type { DashboardWidget } from "@/lib/dashboard-widgets"
import { WIDGET_IDS, getCustomerId } from "@/lib/dashboard-widgets"
import { useAuth } from "@/contexts/auth-context"
import { useDashboardSettingsStore } from "@/stores/dashboard-settings-store"

interface SortableWidgetItemProps {
  widget: DashboardWidget
  onToggle: (widgetId: string, enabled: boolean) => void
}

function SortableWidgetItem({ widget, onToggle }: SortableWidgetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        <GripVertical className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <span className="text-sm font-medium text-gray-900">{widget.title}</span>
      </div>
      <Switch
        checked={widget.enabled}
        onCheckedChange={(checked) => onToggle(widget.id, checked)}
      />
    </div>
  )
}

export function DashboardSettingsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const userRole = user?.roles?.[0] || ""
  const userId = user?.id
  const customerId = getCustomerId(user)

  const {
    settings,
    isLoading,
    toggleWidget,
    updateWidgetOrder,
    saveSettings,
  } = useDashboardSettings(userRole, userId, customerId)
  
  const { setChatSupportEnabled } = useDashboardSettingsStore()

  const [localWidgets, setLocalWidgets] = useState<DashboardWidget[]>([])

  // Initialize local widgets when settings load
  useEffect(() => {
    if (settings) {
      // Sort widgets by order
      const sorted = [...settings.widgets].sort((a, b) => a.order - b.order)
      setLocalWidgets(sorted)
      
      // Sync chat support state with Zustand store
      const chatSupportWidget = settings.widgets.find(w => w.id === WIDGET_IDS.CHAT_SUPPORT)
      if (chatSupportWidget) {
        setChatSupportEnabled(chatSupportWidget.enabled)
      }
    }
  }, [settings, setChatSupportEnabled])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setLocalWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleSave = async () => {
    if (settings) {
      // Update order numbers based on new array order
      const updatedWidgets = localWidgets.map((widget, index) => ({
        ...widget,
        order: index,
      }))

      const updatedSettings = {
        ...settings,
        widgets: updatedWidgets,
      }

      try {
        await saveSettings(updatedSettings)
        router.push("/dashboard")
      } catch (error) {
        console.error("Failed to save dashboard settings:", error)
        // Optionally show error message to user
      }
    }
  }

  const handleCancel = () => {
    // Reset to original settings
    if (settings) {
      const sorted = [...settings.widgets].sort((a, b) => a.order - b.order)
      setLocalWidgets(sorted)
    }
    router.push("/dashboard")
  }

  const handleSelectAll = async () => {
    if (!settings) return
    
    const updatedWidgets = localWidgets.map((widget) => ({
      ...widget,
      enabled: true,
    }))
    
    setLocalWidgets(updatedWidgets)
    
    // Update all widgets in settings at once
    const updatedSettings = {
      ...settings,
      widgets: updatedWidgets.map((widget, index) => ({
        ...widget,
        order: index,
      })),
    }
    
    try {
      await saveSettings(updatedSettings)
    } catch (error) {
      console.error("Failed to save dashboard settings:", error)
    }
    
    // Update chat support state
    const chatSupportWidget = updatedWidgets.find(w => w.id === WIDGET_IDS.CHAT_SUPPORT)
    if (chatSupportWidget) {
      setChatSupportEnabled(true)
    }
  }

  const handleDeselectAll = async () => {
    if (!settings) return
    
    const updatedWidgets = localWidgets.map((widget) => ({
      ...widget,
      enabled: false,
    }))
    
    setLocalWidgets(updatedWidgets)
    
    // Update all widgets in settings at once
    const updatedSettings = {
      ...settings,
      widgets: updatedWidgets.map((widget, index) => ({
        ...widget,
        order: index,
      })),
    }
    
    try {
      await saveSettings(updatedSettings)
    } catch (error) {
      console.error("Failed to save dashboard settings:", error)
    }
    
    // Update chat support state
    const chatSupportWidget = updatedWidgets.find(w => w.id === WIDGET_IDS.CHAT_SUPPORT)
    if (chatSupportWidget) {
      setChatSupportEnabled(false)
    }
  }

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-[#F9F9F9] overflow-auto">
      <div className="w-full h-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-[#1162a8] text-white rounded-lg p-6 sm:p-8 shadow-sm">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Dashboard Settings</h1>
            <p className="text-blue-100 text-sm sm:text-base">
              Customize your dashboard by enabling widgets and choosing their display order
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
                    <CardTitle>Widgets</CardTitle>
                    <CardDescription>
                      Enable widgets and choose the order in which they will display on your dashboard.
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
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={localWidgets.map((w) => w.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {localWidgets.map((widget) => (
                        <SortableWidgetItem
                          key={widget.id}
                          widget={widget}
                          onToggle={(widgetId, enabled) => {
                            toggleWidget(widgetId, enabled)
                            // Update local state immediately for UI feedback
                            setLocalWidgets((prev) =>
                              prev.map((w) =>
                                w.id === widgetId ? { ...w, enabled } : w
                              )
                            )
                            // Update Zustand store for chat support
                            if (widgetId === WIDGET_IDS.CHAT_SUPPORT) {
                              setChatSupportEnabled(enabled)
                            }
                          }}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
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
                      <h4 className="font-semibold text-sm mb-1">Enable/Disable Widgets</h4>
                      <p className="text-sm text-gray-600">
                        Use the toggle switch on the right of each widget to show or hide it on your dashboard.
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
                      <h4 className="font-semibold text-sm mb-1">Reorder Widgets</h4>
                      <p className="text-sm text-gray-600">
                        Click and drag the grip icon (☰) on the left to reorder widgets. The top widget will appear first on your dashboard.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-[#1162a8] text-white flex items-center justify-center font-semibold text-sm">
                        3
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Save Your Changes</h4>
                      <p className="text-sm text-gray-600">
                        Click "Save Changes" to apply your settings. Your preferences will be saved for this session.
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
                      Your dashboard settings are saved to your account and will persist across devices and sessions.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-sm mb-2">Available Widgets</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {localWidgets.map((widget) => (
                      <li key={widget.id} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${widget.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className={widget.enabled ? '' : 'line-through text-gray-400'}>
                          {widget.title}
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

