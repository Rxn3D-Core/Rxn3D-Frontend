import { useState, useEffect, useCallback } from "react"
import {
  type DashboardWidget,
  type DashboardSettings,
  getDefaultWidgetsForRole,
  loadDashboardSettings,
  saveDashboardSettings,
  getEnabledWidgets,
  isWidgetEnabled,
} from "@/lib/dashboard-widgets"

export function useDashboardSettings(role: string, userId?: number) {
  const [settings, setSettings] = useState<DashboardSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize settings on mount
  useEffect(() => {
    if (!role) {
      setIsLoading(false)
      return
    }

    // Try to load from sessionStorage
    const stored = loadDashboardSettings(role, userId)
    
    if (stored) {
      setSettings(stored)
    } else {
      // Use defaults
      const defaultWidgets = getDefaultWidgetsForRole(role)
      const newSettings: DashboardSettings = {
        role,
        widgets: defaultWidgets,
      }
      setSettings(newSettings)
      // Save defaults to sessionStorage
      saveDashboardSettings(newSettings, userId)
    }
    
    setIsLoading(false)
  }, [role, userId])

  // Update widget enabled state
  const toggleWidget = useCallback(
    (widgetId: string, enabled: boolean) => {
      if (!settings) return

      const updatedWidgets = settings.widgets.map((widget) =>
        widget.id === widgetId ? { ...widget, enabled } : widget
      )

      const updatedSettings: DashboardSettings = {
        ...settings,
        widgets: updatedWidgets,
      }

      setSettings(updatedSettings)
      saveDashboardSettings(updatedSettings, userId)
    },
    [settings, userId]
  )

  // Update widget order
  const updateWidgetOrder = useCallback(
    (widgets: DashboardWidget[]) => {
      if (!settings) return

      // Update order numbers based on new array order
      const updatedWidgets = widgets.map((widget, index) => ({
        ...widget,
        order: index,
      }))

      const updatedSettings: DashboardSettings = {
        ...settings,
        widgets: updatedWidgets,
      }

      setSettings(updatedSettings)
      saveDashboardSettings(updatedSettings, userId)
    },
    [settings, userId]
  )

  // Save settings
  const saveSettings = useCallback(
    (newSettings: DashboardSettings) => {
      setSettings(newSettings)
      saveDashboardSettings(newSettings, userId)
    },
    [userId]
  )

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    const defaultWidgets = getDefaultWidgetsForRole(role)
    const defaultSettings: DashboardSettings = {
      role,
      widgets: defaultWidgets,
    }
    setSettings(defaultSettings)
    saveDashboardSettings(defaultSettings, userId)
  }, [role, userId])

  // Get enabled widgets in order
  const enabledWidgets = settings ? getEnabledWidgets(settings) : []

  // Check if widget is enabled
  const isEnabled = useCallback(
    (widgetId: string) => {
      if (!settings) return false
      return isWidgetEnabled(settings, widgetId)
    },
    [settings]
  )

  return {
    settings,
    isLoading,
    enabledWidgets,
    toggleWidget,
    updateWidgetOrder,
    saveSettings,
    resetToDefaults,
    isEnabled,
  }
}

