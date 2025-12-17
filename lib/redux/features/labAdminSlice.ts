import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "../store"

interface LabAdminState {
  activeTab: string
  categoryTab: "upper" | "lower"
  productTab: "upper" | "lower"
  searchTerms: {
    categories: string
    products: string
    addons: string
    departments: string
    staff: string
    grades: string
    historyLog: string
    callLog: string
    labAdmins: string
  }
  filters: {
    grades: {
      status: string
    }
    staff: {
      department: string
      status: string
    }
    historyLog: {
      action: string
      itemType: string
      dateRange: string
    }
    callLog: {
      status: string
      dateRange: string
    }
  }
  pagination: {
    grades: {
      currentPage: number
      itemsPerPage: number
    }
    staff: {
      currentPage: number
      itemsPerPage: number
    }
    historyLog: {
      currentPage: number
      itemsPerPage: number
    }
    callLog: {
      currentPage: number
      itemsPerPage: number
    }
    labAdmins: {
      currentPage: number
      itemsPerPage: number
    }
  }
  dialogs: {
    addCategory: boolean
    addProduct: boolean
    addAddon: boolean
    addDepartment: boolean
    editDepartment: boolean
    addStaff: boolean
    editStaff: boolean
    addGrade: boolean
    editGrade: boolean
    addCallLog: boolean
    editCallLog: boolean
    addLabAdmin: boolean
    editLabAdmin: boolean
  }
  selectedItems: {
    department: number | null
    staff: number | null
    grade: number | null
    callLog: number | null
    labAdmin: number | null
  }
}

const initialState: LabAdminState = {
  activeTab: "categories",
  categoryTab: "upper",
  productTab: "upper",
  searchTerms: {
    categories: "",
    products: "",
    addons: "",
    departments: "",
    staff: "",
    grades: "",
    historyLog: "",
    callLog: "",
    labAdmins: "",
  },
  filters: {
    grades: {
      status: "all",
    },
    staff: {
      department: "all",
      status: "all",
    },
    historyLog: {
      action: "all",
      itemType: "all",
      dateRange: "all",
    },
    callLog: {
      status: "all",
      dateRange: "all",
    },
  },
  pagination: {
    grades: {
      currentPage: 1,
      itemsPerPage: 10,
    },
    staff: {
      currentPage: 1,
      itemsPerPage: 10,
    },
    historyLog: {
      currentPage: 1,
      itemsPerPage: 10,
    },
    callLog: {
      currentPage: 1,
      itemsPerPage: 10,
    },
    labAdmins: {
      currentPage: 1,
      itemsPerPage: 10,
    },
  },
  dialogs: {
    addCategory: false,
    addProduct: false,
    addAddon: false,
    addDepartment: false,
    editDepartment: false,
    addStaff: false,
    editStaff: false,
    addGrade: false,
    editGrade: false,
    addCallLog: false,
    editCallLog: false,
    addLabAdmin: false,
    editLabAdmin: false,
  },
  selectedItems: {
    department: null,
    staff: null,
    grade: null,
    callLog: null,
    labAdmin: null,
  },
}

export const labAdminSlice = createSlice({
  name: "labAdmin",
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload
    },
    setCategoryTab: (state, action: PayloadAction<"upper" | "lower">) => {
      state.categoryTab = action.payload
    },
    setProductTab: (state, action: PayloadAction<"upper" | "lower">) => {
      state.productTab = action.payload
    },
    setSearchTerm: (state, action: PayloadAction<{ key: keyof typeof initialState.searchTerms; value: string }>) => {
      state.searchTerms[action.payload.key] = action.payload.value
      // Reset pagination when search changes
      if (action.payload.key === "grades") {
        state.pagination.grades.currentPage = 1
      } else if (action.payload.key === "staff") {
        state.pagination.staff.currentPage = 1
      } else if (action.payload.key === "historyLog") {
        state.pagination.historyLog.currentPage = 1
      } else if (action.payload.key === "callLog") {
        state.pagination.callLog.currentPage = 1
      } else if (action.payload.key === "labAdmins") {
        state.pagination.labAdmins.currentPage = 1
      }
    },
    setGradeStatusFilter: (state, action: PayloadAction<string>) => {
      state.filters.grades.status = action.payload
      state.pagination.grades.currentPage = 1
    },
    setStaffDepartmentFilter: (state, action: PayloadAction<string>) => {
      state.filters.staff.department = action.payload
      state.pagination.staff.currentPage = 1
    },
    setStaffStatusFilter: (state, action: PayloadAction<string>) => {
      state.filters.staff.status = action.payload
      state.pagination.staff.currentPage = 1
    },
    setHistoryLogActionFilter: (state, action: PayloadAction<string>) => {
      state.filters.historyLog.action = action.payload
      state.pagination.historyLog.currentPage = 1
    },
    setHistoryLogItemTypeFilter: (state, action: PayloadAction<string>) => {
      state.filters.historyLog.itemType = action.payload
      state.pagination.historyLog.currentPage = 1
    },
    setHistoryLogDateRangeFilter: (state, action: PayloadAction<string>) => {
      state.filters.historyLog.dateRange = action.payload
      state.pagination.historyLog.currentPage = 1
    },
    setCallLogStatusFilter: (state, action: PayloadAction<string>) => {
      state.filters.callLog.status = action.payload
      state.pagination.callLog.currentPage = 1
    },
    setCallLogDateRangeFilter: (state, action: PayloadAction<string>) => {
      state.filters.callLog.dateRange = action.payload
      state.pagination.callLog.currentPage = 1
    },
    setPaginationPage: (state, action: PayloadAction<{ key: keyof typeof initialState.pagination; page: number }>) => {
      state.pagination[action.payload.key].currentPage = action.payload.page
    },
    setItemsPerPage: (
      state,
      action: PayloadAction<{ key: keyof typeof initialState.pagination; itemsPerPage: number }>,
    ) => {
      state.pagination[action.payload.key].itemsPerPage = action.payload.itemsPerPage
      state.pagination[action.payload.key].currentPage = 1
    },
    setDialogOpen: (state, action: PayloadAction<{ key: keyof typeof initialState.dialogs; isOpen: boolean }>) => {
      state.dialogs[action.payload.key] = action.payload.isOpen
    },
    setSelectedItem: (
      state,
      action: PayloadAction<{ key: keyof typeof initialState.selectedItems; id: number | null }>,
    ) => {
      state.selectedItems[action.payload.key] = action.payload.id
    },
    resetFilters: (state, action: PayloadAction<keyof typeof initialState.filters>) => {
      if (action.payload === "grades") {
        state.filters.grades.status = "all"
      } else if (action.payload === "staff") {
        state.filters.staff.department = "all"
        state.filters.staff.status = "all"
      } else if (action.payload === "historyLog") {
        state.filters.historyLog.action = "all"
        state.filters.historyLog.itemType = "all"
        state.filters.historyLog.dateRange = "all"
      } else if (action.payload === "callLog") {
        state.filters.callLog.status = "all"
        state.filters.callLog.dateRange = "all"
      }
      state.searchTerms[action.payload] = ""
    },
  },
})

export const {
  setActiveTab,
  setCategoryTab,
  setProductTab,
  setSearchTerm,
  setGradeStatusFilter,
  setStaffDepartmentFilter,
  setStaffStatusFilter,
  setHistoryLogActionFilter,
  setHistoryLogItemTypeFilter,
  setHistoryLogDateRangeFilter,
  setCallLogStatusFilter,
  setCallLogDateRangeFilter,
  setPaginationPage,
  setItemsPerPage,
  setDialogOpen,
  setSelectedItem,
  resetFilters,
} = labAdminSlice.actions

export const selectLabAdminState = (state: RootState) => state.labAdmin

export default labAdminSlice.reducer
