import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { ProductFilter } from "@/types/product"

interface ProductsState {
  filter: ProductFilter
  selectedProductId: string | null
  page: number
  limit: number
  isAddProductModalOpen: boolean
  isAddCategoryModalOpen: boolean
  isAddMaterialModalOpen: boolean
  isAddShadeModalOpen: boolean
}

const initialState: ProductsState = {
  filter: {},
  selectedProductId: null,
  page: 1,
  limit: 10,
  isAddProductModalOpen: false,
  isAddCategoryModalOpen: false,
  isAddMaterialModalOpen: false,
  isAddShadeModalOpen: false,
}

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    setFilter: (state, action: PayloadAction<ProductFilter>) => {
      state.filter = action.payload
      // Reset to first page when filter changes
      state.page = 1
    },

    updateFilter: (state, action: PayloadAction<Partial<ProductFilter>>) => {
      state.filter = { ...state.filter, ...action.payload }
      // Reset to first page when filter changes
      state.page = 1
    },

    clearFilter: (state) => {
      state.filter = {}
      state.page = 1
    },

    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload
    },

    setLimit: (state, action: PayloadAction<number>) => {
      state.limit = action.payload
      // Reset to first page when limit changes
      state.page = 1
    },

    setSelectedProductId: (state, action: PayloadAction<string | null>) => {
      state.selectedProductId = action.payload
    },

    openAddProductModal: (state) => {
      state.isAddProductModalOpen = true
    },

    closeAddProductModal: (state) => {
      state.isAddProductModalOpen = false
    },

    openAddCategoryModal: (state) => {
      state.isAddCategoryModalOpen = true
    },

    closeAddCategoryModal: (state) => {
      state.isAddCategoryModalOpen = false
    },

    openAddMaterialModal: (state) => {
      state.isAddMaterialModalOpen = true
    },

    closeAddMaterialModal: (state) => {
      state.isAddMaterialModalOpen = false
    },

    openAddShadeModal: (state) => {
      state.isAddShadeModalOpen = true
    },

    closeAddShadeModal: (state) => {
      state.isAddShadeModalOpen = false
    },
  },
})

export const {
  setFilter,
  updateFilter,
  clearFilter,
  setPage,
  setLimit,
  setSelectedProductId,
  openAddProductModal,
  closeAddProductModal,
  openAddCategoryModal,
  closeAddCategoryModal,
  openAddMaterialModal,
  closeAddMaterialModal,
  openAddShadeModal,
  closeAddShadeModal,
} = productsSlice.actions

export default productsSlice.reducer
