import { useState, useEffect, useCallback } from "react"
import {
  type DashboardWidget,
  type DashboardSettings,
  getDefaultWidgetsForRole,
  getEnabledWidgets,
  isWidgetEnabled,
} from "@/lib/dashboard-widgets"
import { getDashboardSettings, updateDashboardSettings } from "@/lib/api-dashboard-settings"

function mergeSettingsWithRoleDefaults(stored: DashboardSettings, role: string): DashboardSettings {
  const defaults = getDefaultWidgetsForRole(role)
  const storedById = new Map(stored.widgets.map((widget) => [widget.id, widget]))

  return {
    role,
    widgets: defaults.map((defaultWidget) => storedById.get(defaultWidget.id) ?? defaultWidget),
  }
}

// Module-level cache to prevent duplicate API calls across hook instances
let cachedSettings: DashboardSettings | null = null
let cacheKey: string | null = null
let fetchPromise: Promise<DashboardSettings | null> | null = null

export function useDashboardSettings(role: string, userId?: number, customerId?: number | null) {
  const [settings, setSettings] = useState<DashboardSettings | null>(cachedSettings)
  const [isLoading, setIsLoading] = useState(!cachedSettings)
  const [error, setError] = useState<Error | null>(null)

  // Initialize settings on mount
  useEffect(() => {
    if (!role) {
      setIsLoading(false)
      return
    }

    const currentCacheKey = `${role}-${userId}-${customerId}`

    // Use cached settings if available for the same key
    if (cachedSettings && cacheKey === currentCacheKey) {
      setSettings(cachedSettings)
      setIsLoading(false)
      return
    }

    // Load settings from API
    const loadSettings = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Deduplicate in-flight requests
        if (!fetchPromise || cacheKey !== currentCacheKey) {
          cacheKey = currentCacheKey
          fetchPromise = getDashboardSettings(customerId ?? undefined)
        }

        const stored = await fetchPromise
        fetchPromise = null

        if (stored) {
          const merged = mergeSettingsWithRoleDefaults(stored, role)
          cachedSettings = merged
          setSettings(merged)
        } else {
          // Use defaults if no settings found
          const defaultWidgets = getDefaultWidgetsForRole(role)
          const newSettings: DashboardSettings = {
            role,
            widgets: defaultWidgets,
          }
          cachedSettings = newSettings
          setSettings(newSettings)
        }
      } catch (err) {
        console.error("Error loading dashboard settings:", err)
        setError(err instanceof Error ? err : new Error("Failed to load dashboard settings"))
        fetchPromise = null

        // Fallback to defaults on error
        const defaultWidgets = getDefaultWidgetsForRole(role)
        const newSettings: DashboardSettings = {
          role,
          widgets: defaultWidgets,
        }
        setSettings(newSettings)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [role, userId, customerId])

  // Update widget enabled state
  const toggleWidget = useCallback(
    async (widgetId: string, enabled: boolean) => {
      if (!settings) return

      const updatedWidgets = settings.widgets.map((widget) =>
        widget.id === widgetId ? { ...widget, enabled } : widget
      )

      const updatedSettings: DashboardSettings = {
        ...settings,
        widgets: updatedWidgets,
      }

      // Optimistically update UI
      setSettings(updatedSettings)
      cachedSettings = updatedSettings

      // Save to backend
      try {
        await updateDashboardSettings(updatedSettings, customerId ?? undefined)
      } catch (err) {
        console.error("Error saving dashboard settings:", err)
        // Revert on error
        setSettings(settings)
        cachedSettings = settings
        setError(err instanceof Error ? err : new Error("Failed to save dashboard settings"))
      }
    },
    [settings, userId, customerId]
  )

  // Update widget order
  const updateWidgetOrder = useCallback(
    async (widgets: DashboardWidget[]) => {
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

      // Optimistically update UI
      setSettings(updatedSettings)
      cachedSettings = updatedSettings

      // Save to backend
      try {
        await updateDashboardSettings(updatedSettings, customerId ?? undefined)
      } catch (err) {
        console.error("Error saving dashboard settings:", err)
        // Revert on error
        setSettings(settings)
        cachedSettings = settings
        setError(err instanceof Error ? err : new Error("Failed to save dashboard settings"))
      }
    },
    [settings, userId, customerId]
  )

  // Save settings
  const saveSettings = useCallback(
    async (newSettings: DashboardSettings) => {
      // Optimistically update UI
      setSettings(newSettings)
      cachedSettings = newSettings

      // Save to backend
      try {
        const saved = await updateDashboardSettings(newSettings, customerId ?? undefined)
        setSettings(saved)
        cachedSettings = saved
      } catch (err) {
        console.error("Error saving dashboard settings:", err)
        setError(err instanceof Error ? err : new Error("Failed to save dashboard settings"))
        throw err
      }
    },
    [userId, customerId]
  )

  // Reset to defaults
  const resetToDefaults = useCallback(
    async () => {
      const defaultWidgets = getDefaultWidgetsForRole(role)
      const defaultSettings: DashboardSettings = {
        role,
        widgets: defaultWidgets,
      }

      // Optimistically update UI
      setSettings(defaultSettings)
      cachedSettings = defaultSettings

      // Save to backend
      try {
        await updateDashboardSettings(defaultSettings, customerId ?? undefined)
      } catch (err) {
        console.error("Error resetting dashboard settings:", err)
        setError(err instanceof Error ? err : new Error("Failed to reset dashboard settings"))
      }
    },
    [role, userId, customerId]
  )

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
    error,
    enabledWidgets,
    toggleWidget,
    updateWidgetOrder,
    saveSettings,
    resetToDefaults,
    isEnabled,
  }
}

