import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

interface TechnicianBillingState {
  searchQuery: string
  selectedFilters: string[]
  currentPage: number
  itemsPerPage: number
}

const initialState: TechnicianBillingState = {
  searchQuery: "",
  selectedFilters: [],
  currentPage: 1,
  itemsPerPage: 5,
}

const technicianBillingSlice = createSlice({
  name: "technicianBilling",
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload
      state.currentPage = 1 // Reset to first page on search
    },

    addFilter: (state, action: PayloadAction<string>) => {
      if (!state.selectedFilters.includes(action.payload)) {
        state.selectedFilters.push(action.payload)
        state.currentPage = 1 // Reset to first page when adding filter
      }
    },

    removeFilter: (state, action: PayloadAction<string>) => {
      state.selectedFilters = state.selectedFilters.filter((filter) => filter !== action.payload)
      state.currentPage = 1 // Reset to first page when removing filter
    },

    clearFilters: (state) => {
      state.selectedFilters = []
      state.currentPage = 1 // Reset to first page when clearing filters
    },

    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload
    },

    setItemsPerPage: (state, action: PayloadAction<number>) => {
      state.itemsPerPage = action.payload
      state.currentPage = 1 // Reset to first page when changing items per page
    },

    resetTechnicianBilling: () => initialState,
  },
})

export const {
  setSearchQuery,
  addFilter,
  removeFilter,
  clearFilters,
  setCurrentPage,
  setItemsPerPage,
  resetTechnicianBilling,
} = technicianBillingSlice.actions

export default technicianBillingSlice.reducer
