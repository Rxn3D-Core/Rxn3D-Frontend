import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "../store"

interface SlipsState {
  searchTerm: string
  statusFilter: string
  officeFilter: string
  locationFilter: string
  selectedSlips: number[]
  currentPage: number
  itemsPerPage: number
}

const initialState: SlipsState = {
  searchTerm: "",
  statusFilter: "all",
  officeFilter: "all",
  locationFilter: "all",
  selectedSlips: [],
  currentPage: 1,
  itemsPerPage: 10,
}

export const slipsSlice = createSlice({
  name: "slips",
  initialState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload
      state.currentPage = 1 // Reset to first page when search changes
    },
    setStatusFilter: (state, action: PayloadAction<string>) => {
      state.statusFilter = action.payload
      state.currentPage = 1
    },
    setOfficeFilter: (state, action: PayloadAction<string>) => {
      state.officeFilter = action.payload
      state.currentPage = 1
    },
    setLocationFilter: (state, action: PayloadAction<string>) => {
      state.locationFilter = action.payload
      state.currentPage = 1
    },
    toggleSelectedSlip: (state, action: PayloadAction<number>) => {
      const id = action.payload
      if (state.selectedSlips.includes(id)) {
        state.selectedSlips = state.selectedSlips.filter((slipId) => slipId !== id)
      } else {
        state.selectedSlips.push(id)
      }
    },
    selectAllSlips: (state, action: PayloadAction<number[]>) => {
      state.selectedSlips = action.payload
    },
    clearSelectedSlips: (state) => {
      state.selectedSlips = []
    },
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload
    },
    setItemsPerPage: (state, action: PayloadAction<number>) => {
      state.itemsPerPage = action.payload
      state.currentPage = 1 // Reset to first page when items per page changes
    },
    resetFilters: (state) => {
      state.searchTerm = ""
      state.statusFilter = "all"
      state.officeFilter = "all"
      state.locationFilter = "all"
      state.currentPage = 1
    },
  },
})

export const {
  setSearchTerm,
  setStatusFilter,
  setOfficeFilter,
  setLocationFilter,
  toggleSelectedSlip,
  selectAllSlips,
  clearSelectedSlips,
  setCurrentPage,
  setItemsPerPage,
  resetFilters,
} = slipsSlice.actions

export const selectSlipsFilters = (state: RootState) => ({
  searchTerm: state.slips.searchTerm,
  statusFilter: state.slips.statusFilter,
  officeFilter: state.slips.officeFilter,
  locationFilter: state.slips.locationFilter,
})

export const selectSlipsPagination = (state: RootState) => ({
  currentPage: state.slips.currentPage,
  itemsPerPage: state.slips.itemsPerPage,
})

export const selectSelectedSlips = (state: RootState) => state.slips.selectedSlips

export default slipsSlice.reducer
