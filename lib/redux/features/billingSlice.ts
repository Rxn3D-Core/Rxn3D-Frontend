import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

interface BillingState {
  selectedItems: string[]
  searchQuery: string
  periodFilter: string
  currentPage: number
  itemsPerPage: number
}

const initialState: BillingState = {
  selectedItems: [],
  searchQuery: "",
  periodFilter: "today",
  currentPage: 1,
  itemsPerPage: 10,
}

const billingSlice = createSlice({
  name: "billing",
  initialState,
  reducers: {
    toggleItemSelection: (state, action: PayloadAction<string>) => {
      const id = action.payload
      if (state.selectedItems.includes(id)) {
        state.selectedItems = state.selectedItems.filter((itemId) => itemId !== id)
      } else {
        state.selectedItems.push(id)
      }
    },

    selectAllItems: (state, action: PayloadAction<string[]>) => {
      state.selectedItems = action.payload
    },

    clearSelectedItems: (state) => {
      state.selectedItems = []
    },

    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload
      state.currentPage = 1 // Reset to first page on search
    },

    setPeriodFilter: (state, action: PayloadAction<string>) => {
      state.periodFilter = action.payload
      state.currentPage = 1 // Reset to first page when changing period
    },

    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload
    },

    setItemsPerPage: (state, action: PayloadAction<number>) => {
      state.itemsPerPage = action.payload
      state.currentPage = 1 // Reset to first page when changing items per page
    },

    resetBilling: () => initialState,
  },
})

export const {
  toggleItemSelection,
  selectAllItems,
  clearSelectedItems,
  setSearchQuery,
  setPeriodFilter,
  setCurrentPage,
  setItemsPerPage,
  resetBilling,
} = billingSlice.actions

export default billingSlice.reducer
