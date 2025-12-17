import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import type { Meeting } from "@/types/meeting"

export const calendarMeetingApi = createApi({
  reducerPath: "calendarMeetingApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Meeting"],
  endpoints: (builder) => ({
    getMeetings: builder.query<Meeting[], void>({
      query: () => "/meetings",
      providesTags: ["Meeting"],
    }),
    getMeetingById: builder.query<Meeting, string>({
      query: (id) => `/meetings/${id}`,
      providesTags: (result, error, id) => [{ type: "Meeting", id }],
    }),
    addMeeting: builder.mutation<Meeting, Partial<Meeting>>({
      query: (meeting) => ({
        url: "/meetings",
        method: "POST",
        body: meeting,
      }),
      invalidatesTags: ["Meeting"],
    }),
    updateMeeting: builder.mutation<Meeting, Partial<Meeting>>({
      query: (meeting) => ({
        url: `/meetings/${meeting.id}`,
        method: "PUT",
        body: meeting,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Meeting", id }],
    }),
    deleteMeeting: builder.mutation<{ success: boolean; id: string }, string>({
      query: (id) => ({
        url: `/meetings/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Meeting", id }],
    }),
    toggleReminderStatus: builder.mutation<Meeting, { id: string; reminderSet: boolean }>({
      query: ({ id, reminderSet }) => ({
        url: `/meetings/${id}/reminder`,
        method: "PUT",
        body: { reminderSet },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Meeting", id }],
    }),
  }),
})

export const {
  useGetMeetingsQuery,
  useGetMeetingByIdQuery,
  useAddMeetingMutation,
  useUpdateMeetingMutation,
  useDeleteMeetingMutation,
  useToggleReminderStatusMutation,
} = calendarMeetingApi
