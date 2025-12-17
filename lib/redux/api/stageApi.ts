import { apiSlice } from "./apiSlice"
import type { ToothStatus } from "@/types/stage"

export interface Tooth {
  id: number
  status: ToothStatus
  selected: boolean
}

export interface StageData {
  id: string
  upperTeeth: Tooth[]
  lowerTeeth: Tooth[]
  impressions?: string[]
  toothShades?: string[]
  gumShades?: string[]
  stageNotes?: string
  rushDates?: string[]
}

export const stageApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getStages: builder.query<StageData[], void>({
      query: () => "/stages",
      providesTags: ["Stage"],
    }),

    getStageById: builder.query<StageData, string>({
      query: (id) => `/stages/${id}`,
      providesTags: (result, error, id) => [{ type: "Stage", id }],
    }),

    addStage: builder.mutation<StageData, Partial<StageData>>({
      query: (stage) => ({
        url: "/stages",
        method: "POST",
        body: stage,
      }),
      invalidatesTags: ["Stage"],
    }),

    updateStage: builder.mutation<StageData, Partial<StageData>>({
      query: (stage) => ({
        url: `/stages/${stage.id}`,
        method: "PUT",
        body: stage,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Stage", id }],
    }),

    deleteStage: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/stages/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Stage"],
    }),

    updateToothStatus: builder.mutation<
      { success: boolean },
      { stageId: string; toothId: number; isUpper: boolean; status: ToothStatus }
    >({
      query: ({ stageId, toothId, isUpper, status }) => ({
        url: `/stages/${stageId}/tooth-status`,
        method: "PATCH",
        body: { toothId, isUpper, status },
      }),
      invalidatesTags: (result, error, { stageId }) => [{ type: "Stage", id: stageId }],
    }),
  }),
})

export const {
  useGetStagesQuery,
  useGetStageByIdQuery,
  useAddStageMutation,
  useUpdateStageMutation,
  useDeleteStageMutation,
  useUpdateToothStatusMutation,
} = stageApi
