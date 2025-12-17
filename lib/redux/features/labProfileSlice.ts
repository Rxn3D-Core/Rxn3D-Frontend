import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "../store"

interface LabProfileState {
  isEditing: boolean
  fileChosen: boolean
  isSaving: boolean
  saveSuccess: boolean | null
  saveError: string | null
}

const initialState: LabProfileState = {
  isEditing: false,
  fileChosen: false,
  isSaving: false,
  saveSuccess: null,
  saveError: null,
}

export const labProfileSlice = createSlice({
  name: "labProfile",
  initialState,
  reducers: {
    setIsEditing: (state, action: PayloadAction<boolean>) => {
      state.isEditing = action.payload
    },
    setFileChosen: (state, action: PayloadAction<boolean>) => {
      state.fileChosen = action.payload
    },
    setSaving: (state, action: PayloadAction<boolean>) => {
      state.isSaving = action.payload
      if (action.payload) {
        state.saveSuccess = null
        state.saveError = null
      }
    },
    setSaveSuccess: (state, action: PayloadAction<boolean>) => {
      state.saveSuccess = action.payload
      state.isSaving = false
    },
    setSaveError: (state, action: PayloadAction<string | null>) => {
      state.saveError = action.payload
      state.isSaving = false
      state.saveSuccess = false
    },
    resetSaveStatus: (state) => {
      state.saveSuccess = null
      state.saveError = null
    },
  },
})

export const { setIsEditing, setFileChosen, setSaving, setSaveSuccess, setSaveError, resetSaveStatus } =
  labProfileSlice.actions

export const selectLabProfileState = (state: RootState) => state.labProfile

export default labProfileSlice.reducer
