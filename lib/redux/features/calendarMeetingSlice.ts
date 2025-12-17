import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "../store"

interface CalendarMeetingState {
  selectedDate: string // ISO string format
  currentView: "month" | "week" | "day"
  selectedMeeting: string | null // Meeting ID
  isAddingMeeting: boolean
  isEditingMeeting: boolean
}

const initialState: CalendarMeetingState = {
  selectedDate: new Date().toISOString(),
  currentView: "month",
  selectedMeeting: null,
  isAddingMeeting: false,
  isEditingMeeting: false,
}

export const calendarMeetingSlice = createSlice({
  name: "calendarMeeting",
  initialState,
  reducers: {
    setSelectedDate: (state, action: PayloadAction<string>) => {
      state.selectedDate = action.payload
    },
    setCurrentView: (state, action: PayloadAction<"month" | "week" | "day">) => {
      state.currentView = action.payload
    },
    setSelectedMeeting: (state, action: PayloadAction<string | null>) => {
      state.selectedMeeting = action.payload
      if (action.payload !== null) {
        state.isAddingMeeting = false
        state.isEditingMeeting = false
      }
    },
    setIsAddingMeeting: (state, action: PayloadAction<boolean>) => {
      state.isAddingMeeting = action.payload
      if (action.payload) {
        state.selectedMeeting = null
        state.isEditingMeeting = false
      }
    },
    setIsEditingMeeting: (state, action: PayloadAction<boolean>) => {
      state.isEditingMeeting = action.payload
      if (action.payload) {
        state.isAddingMeeting = false
      }
    },
    navigateToPreviousPeriod: (state) => {
      const currentDate = new Date(state.selectedDate)
      if (state.currentView === "month") {
        currentDate.setMonth(currentDate.getMonth() - 1)
      } else if (state.currentView === "week") {
        currentDate.setDate(currentDate.getDate() - 7)
      } else {
        currentDate.setDate(currentDate.getDate() - 1)
      }
      state.selectedDate = currentDate.toISOString()
    },
    navigateToNextPeriod: (state) => {
      const currentDate = new Date(state.selectedDate)
      if (state.currentView === "month") {
        currentDate.setMonth(currentDate.getMonth() + 1)
      } else if (state.currentView === "week") {
        currentDate.setDate(currentDate.getDate() + 7)
      } else {
        currentDate.setDate(currentDate.getDate() + 1)
      }
      state.selectedDate = currentDate.toISOString()
    },
    navigateToToday: (state) => {
      state.selectedDate = new Date().toISOString()
    },
  },
})

export const {
  setSelectedDate,
  setCurrentView,
  setSelectedMeeting,
  setIsAddingMeeting,
  setIsEditingMeeting,
  navigateToPreviousPeriod,
  navigateToNextPeriod,
  navigateToToday,
} = calendarMeetingSlice.actions

export const selectCalendarMeetingState = (state: RootState) => state.calendarMeeting

export default calendarMeetingSlice.reducer
