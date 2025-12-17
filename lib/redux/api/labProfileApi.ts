import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import type { LabProfile } from "@/types/labProfile"

export const labProfileApi = createApi({
  reducerPath: "labProfileApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["LabProfile"],
  endpoints: (builder) => ({
    getLabProfile: builder.query<LabProfile, void>({
      query: () => "/lab-profile",
      providesTags: ["LabProfile"],
    }),
    updateLabProfile: builder.mutation<LabProfile, Partial<LabProfile>>({
      query: (profile) => ({
        url: "/lab-profile",
        method: "PUT",
        body: profile,
      }),
      invalidatesTags: ["LabProfile"],
    }),
    uploadProfilePicture: builder.mutation<{ url: string }, FormData>({
      query: (formData) => ({
        url: "/lab-profile/upload-picture",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["LabProfile"],
    }),
  }),
})

export const { useGetLabProfileQuery, useUpdateLabProfileMutation, useUploadProfilePictureMutation } = labProfileApi
