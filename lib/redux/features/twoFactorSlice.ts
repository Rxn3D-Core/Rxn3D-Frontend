import { createSlice } from "@reduxjs/toolkit"
import type { TwoFactorAuthState } from "@/types/auth"
import { twoFactorApi } from "../api/twoFactorApi"

const initialState: TwoFactorAuthState = {
  isEnabled: false,
  verificationStatus: "idle",
  setupStatus: "idle",
}

const twoFactorSlice = createSlice({
  name: "twoFactor",
  initialState,
  reducers: {
    resetTwoFactorState: (state) => {
      state.secret = undefined
      state.qrCodeUrl = undefined
      state.verificationStatus = "idle"
      state.setupStatus = "idle"
      state.error = undefined
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle getTwoFactorStatus
      .addMatcher(twoFactorApi.endpoints.getTwoFactorStatus.matchFulfilled, (state, { payload }) => {
        state.isEnabled = payload.isEnabled
      })
      // Handle generateTwoFactor
      .addMatcher(twoFactorApi.endpoints.generateTwoFactor.matchPending, (state) => {
        state.setupStatus = "generating"
      })
      .addMatcher(twoFactorApi.endpoints.generateTwoFactor.matchFulfilled, (state, { payload }) => {
        state.secret = payload.secret
        state.qrCodeUrl = payload.qrCodeUrl
        state.setupStatus = "awaiting_verification"
      })
      .addMatcher(twoFactorApi.endpoints.generateTwoFactor.matchRejected, (state, { error }) => {
        state.setupStatus = "idle"
        state.error = error.message || "Failed to generate 2FA setup"
      })
      // Handle verifyTwoFactor
      .addMatcher(twoFactorApi.endpoints.verifyTwoFactor.matchPending, (state) => {
        state.verificationStatus = "pending"
      })
      .addMatcher(twoFactorApi.endpoints.verifyTwoFactor.matchFulfilled, (state, { payload }) => {
        state.verificationStatus = "success"
        state.isEnabled = true
        state.setupStatus = "complete"
        if (payload.backupCodes) {
          state.backupCodes = payload.backupCodes
        }
      })
      .addMatcher(twoFactorApi.endpoints.verifyTwoFactor.matchRejected, (state, { error }) => {
        state.verificationStatus = "error"
        state.error = error.message || "Failed to verify code"
      })
      // Handle disableTwoFactor
      .addMatcher(twoFactorApi.endpoints.disableTwoFactor.matchFulfilled, (state) => {
        state.isEnabled = false
        state.secret = undefined
        state.qrCodeUrl = undefined
        state.backupCodes = undefined
        state.setupStatus = "idle"
      })
      // Handle regenerateBackupCodes
      .addMatcher(twoFactorApi.endpoints.regenerateBackupCodes.matchFulfilled, (state, { payload }) => {
        state.backupCodes = payload.backupCodes
      })
  },
})

export const { resetTwoFactorState } = twoFactorSlice.actions
export default twoFactorSlice.reducer
