import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "../store"

interface DashboardState {
  dateRange: string
  activeTab: string
  isExporting: boolean
}

const initialState: DashboardState = {
  dateRange: "30d",
  activeTab: "overview",
  isExporting: false,
}

export const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    setDateRange: (state, action: PayloadAction<string>) => {
      state.dateRange = action.payload
    },
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload
    },
    setIsExporting: (state, action: PayloadAction<boolean>) => {
      state.isExporting = action.payload
    },
  },
})

export const { setDateRange, setActiveTab, setIsExporting } = dashboardSlice.actions

export const selectDashboardState = (state: RootState) => state.dashboard

export default dashboardSlice.reducer
