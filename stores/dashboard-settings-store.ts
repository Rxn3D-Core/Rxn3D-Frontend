import { create } from "zustand"

interface DashboardSettingsState {
  chatSupportEnabled: boolean
  setChatSupportEnabled: (enabled: boolean) => void
  initializeFromSettings: (enabled: boolean) => void
}

export const useDashboardSettingsStore = create<DashboardSettingsState>((set) => ({
  chatSupportEnabled: true, // Default to enabled
  setChatSupportEnabled: (enabled: boolean) => set({ chatSupportEnabled: enabled }),
  initializeFromSettings: (enabled: boolean) => set({ chatSupportEnabled: enabled }),
}))

