import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

interface CasespanState {
  searchQuery: string
  selectedItems: string[]
  currentPage: number
  itemsPerPage: number
}

const initialState: CasespanState = {
  searchQuery: "",
  selectedItems: [],
  currentPage: 1,
  itemsPerPage: 10,
}

const casespanSlice = createSlice({
  name: "casespan",
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload
      state.currentPage = 1 // Reset to first page on search
    },

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

    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload
    },

    setItemsPerPage: (state, action: PayloadAction<number>) => {
      state.itemsPerPage = action.payload
      state.currentPage = 1 // Reset to first page when changing items per page
    },

    resetCasespan: () => initialState,
  },
})

export const {
  setSearchQuery,
  toggleItemSelection,
  selectAllItems,
  clearSelectedItems,
  setCurrentPage,
  setItemsPerPage,
  resetCasespan,
} = casespanSlice.actions

export default casespanSlice.reducer
