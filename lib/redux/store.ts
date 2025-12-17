import { configureStore } from "@reduxjs/toolkit"
import { setupListeners } from "@reduxjs/toolkit/query"
import { apiSlice } from "./api/apiSlice"
import stageReducer from "./features/stageSlice"
import casespanReducer from "./features/casespanSlice"
import technicianBillingReducer from "./features/technicianBillingSlice"
import labAdminReducer from "./features/labAdminSlice"
import billingReducer from "./features/billingSlice"
import notificationsReducer from "./features/notificationsSlice"
import twoFactorReducer from "./features/twoFactorSlice"

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    stage: stageReducer,
    casespan: casespanReducer,
    technicianBilling: technicianBillingReducer,
    labAdmin: labAdminReducer,
    billing: billingReducer,
    notifications: notificationsReducer,
    twoFactor: twoFactorReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
  devTools: process.env.NODE_ENV !== "production",
})

// Enable refetchOnFocus and refetchOnReconnect
setupListeners(store.dispatch)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
