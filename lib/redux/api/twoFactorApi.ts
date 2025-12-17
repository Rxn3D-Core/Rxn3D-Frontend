import { apiSlice } from "./apiSlice"
import type {
  GenerateTwoFactorResponse,
  VerifyTwoFactorRequest,
  VerifyTwoFactorResponse,
  DisableTwoFactorResponse,
} from "@/types/auth"

export const twoFactorApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTwoFactorStatus: builder.query<{ isEnabled: boolean }, void>({
      query: () => "/api/auth/2fa/status",
      providesTags: ["TwoFactor"],
    }),

    generateTwoFactor: builder.mutation<GenerateTwoFactorResponse, void>({
      query: () => ({
        url: "/api/auth/2fa/generate",
        method: "POST",
      }),
    }),

    verifyTwoFactor: builder.mutation<VerifyTwoFactorResponse, VerifyTwoFactorRequest>({
      query: (credentials) => ({
        url: "/api/auth/2fa/verify",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["TwoFactor"],
    }),

    disableTwoFactor: builder.mutation<DisableTwoFactorResponse, { token: string }>({
      query: (data) => ({
        url: "/api/auth/2fa/disable",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["TwoFactor"],
    }),

    regenerateBackupCodes: builder.mutation<{ backupCodes: string[] }, { token: string }>({
      query: (data) => ({
        url: "/api/auth/2fa/backup-codes",
        method: "POST",
        body: data,
      }),
    }),
  }),
})

export const {
  useGetTwoFactorStatusQuery,
  useGenerateTwoFactorMutation,
  useVerifyTwoFactorMutation,
  useDisableTwoFactorMutation,
  useRegenerateBackupCodesMutation,
} = twoFactorApi
