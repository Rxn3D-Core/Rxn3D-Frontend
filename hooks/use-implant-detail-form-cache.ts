import { useQuery, useQueryClient } from "@tanstack/react-query"

/**
 * Persisted implant detail form state (platform, size, inclusions, abutment).
 * Stored in React Query cache so user selections are not lost when accordion
 * closes or component re-mounts. Update on change; do not remove.
 */
export interface ImplantDetailFormCacheState {
  platformId: number | null
  platformName: string | null
  size: string | null
  inclusions: string
  abutmentDetail: string
  abutmentType: string
  inclusionsQuantity?: number
}

const defaultCacheState: ImplantDetailFormCacheState = {
  platformId: null,
  platformName: null,
  size: null,
  inclusions: "",
  abutmentDetail: "",
  abutmentType: "",
  inclusionsQuantity: 1,
}

export const implantDetailFormCacheKeys = {
  all: ["implant-detail-form"] as const,
  detail: (storageKey: string) => ["implant-detail-form", storageKey] as const,
}

/**
 * Read and update implant detail form state from React Query cache.
 * When storageKey is provided, form selections are persisted and restored.
 */
export function useImplantDetailFormCache(storageKey: string | undefined) {
  const queryClient = useQueryClient()
  const key = storageKey ? implantDetailFormCacheKeys.detail(storageKey) : ["implant-detail-form", "__disabled__"]

  const { data: cachedState } = useQuery({
    queryKey: key,
    queryFn: (): ImplantDetailFormCacheState => {
      if (!storageKey) return defaultCacheState
      const k = implantDetailFormCacheKeys.detail(storageKey)
      return queryClient.getQueryData<ImplantDetailFormCacheState>(k) ?? defaultCacheState
    },
    enabled: !!storageKey,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  })

  const setCachedState = (update: Partial<ImplantDetailFormCacheState>) => {
    if (!storageKey) return
    const k = implantDetailFormCacheKeys.detail(storageKey)
    queryClient.setQueryData<ImplantDetailFormCacheState>(k, (prev) => ({
      ...defaultCacheState,
      ...prev,
      ...update,
    }))
  }

  return {
    cachedState: cachedState ?? defaultCacheState,
    setCachedState,
    hasCache: !!storageKey,
  }
}
