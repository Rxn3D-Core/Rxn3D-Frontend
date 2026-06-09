"use client"

import { useQuery } from "@tanstack/react-query"
import {
  getCaseNotes,
  type CaseNotesPayload,
  type CaseNotesQueryParams,
} from "@/lib/api/slip-notes"

export function caseSlipNotesQueryKey(
  caseId: number | null,
  params?: CaseNotesQueryParams,
  refreshKey?: number
) {
  return ["slip", "case-notes", caseId, params ?? {}, refreshKey ?? 0] as const
}

export function useCaseSlipNotes(
  caseId: number | null,
  options?: {
    params?: CaseNotesQueryParams
    refreshKey?: number
    enabled?: boolean
  }
) {
  const enabled =
    (options?.enabled ?? true) && typeof caseId === "number" && caseId > 0

  const query = useQuery({
    queryKey: caseSlipNotesQueryKey(caseId, options?.params, options?.refreshKey),
    enabled,
    queryFn: () => getCaseNotes(caseId as number, options?.params),
    staleTime: 30_000,
  })

  const data: CaseNotesPayload | null = query.data ?? null

  return {
    data,
    notes: data?.all_notes ?? [],
    slips: data?.slips ?? [],
    summary: data?.summary ?? null,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error != null
          ? String(query.error)
          : null,
    refetch: query.refetch,
  }
}
