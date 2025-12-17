import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { Tooth } from "../api/stageApi"
import type { ToothStatus } from "@/types/stage"

interface StageState {
  activeTab: string
  upperTeeth: Tooth[]
  lowerTeeth: Tooth[]
  selectedStatus: ToothStatus | null
}

const initialState: StageState = {
  activeTab: "extractions",
  upperTeeth: Array.from({ length: 16 }, (_, i) => ({
    id: i + 1,
    status: "none" as ToothStatus,
    selected: false,
  })),
  lowerTeeth: Array.from({ length: 16 }, (_, i) => ({
    id: i + 17,
    status: "none" as ToothStatus,
    selected: false,
  })),
  selectedStatus: null,
}

const stageSlice = createSlice({
  name: "stage",
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload
    },

    selectTooth: (state, action: PayloadAction<{ isUpper: boolean; id: number }>) => {
      const { isUpper, id } = action.payload
      const teeth = isUpper ? state.upperTeeth : state.lowerTeeth

      const toothIndex = teeth.findIndex((tooth) => tooth.id === id)
      if (toothIndex !== -1) {
        teeth[toothIndex].selected = !teeth[toothIndex].selected
      }
    },

    setToothStatus: (state, action: PayloadAction<{ isUpper: boolean; id: number; status: ToothStatus }>) => {
      const { isUpper, id, status } = action.payload
      const teeth = isUpper ? state.upperTeeth : state.lowerTeeth

      const toothIndex = teeth.findIndex((tooth) => tooth.id === id)
      if (toothIndex !== -1) {
        teeth[toothIndex].status = status
        teeth[toothIndex].selected = false
      }
    },

    applyStatusToSelected: (state, action: PayloadAction<ToothStatus>) => {
      const status = action.payload

      state.upperTeeth.forEach((tooth) => {
        if (tooth.selected) {
          tooth.status = status
          tooth.selected = false
        }
      })

      state.lowerTeeth.forEach((tooth) => {
        if (tooth.selected) {
          tooth.status = status
          tooth.selected = false
        }
      })

      state.selectedStatus = null
    },

    setSelectedStatus: (state, action: PayloadAction<ToothStatus | null>) => {
      state.selectedStatus = action.payload
    },

    clearAllSelections: (state) => {
      state.upperTeeth.forEach((tooth) => {
        tooth.selected = false
      })

      state.lowerTeeth.forEach((tooth) => {
        tooth.selected = false
      })
    },

    resetStage: () => initialState,
  },
})

export const {
  setActiveTab,
  selectTooth,
  setToothStatus,
  applyStatusToSelected,
  setSelectedStatus,
  clearAllSelections,
  resetStage,
} = stageSlice.actions

export default stageSlice.reducer
