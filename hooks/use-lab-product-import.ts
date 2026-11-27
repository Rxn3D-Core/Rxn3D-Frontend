"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { IMPORT_POLL_MS, isImportActive } from "@/lib/lab-product-import"
import { labProductImportService } from "@/services/lab-product-import-service"
import type { ImportCatalogFilters, LabProductImport } from "@/types/lab-product-import"

const KEY = "lab-product-import"

/** The lab's most recent import. Polls while it is running, so a reload resumes the progress. */
export function useLatestImport(customerId: number | null) {
  return useQuery({
    queryKey: [KEY, "latest", customerId],
    queryFn: () => labProductImportService.latest(customerId!),
    enabled: !!customerId,
    staleTime: 0,
    refetchInterval: (query) => (isImportActive(query.state.data) ? IMPORT_POLL_MS : false),
  })
}

export function useImportCatalog(
  customerId: number | null,
  filters: ImportCatalogFilters,
  page: number,
  lang: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [KEY, "catalog", customerId, filters, page, lang],
    queryFn: () => labProductImportService.catalog(customerId!, filters, page, lang),
    enabled: enabled && !!customerId,
    staleTime: 0,
    retry: false,
  })
}

export function useGlobalLibraryFilters(categoryId: number | null, lang: string, enabled: boolean) {
  const categories = useQuery({
    queryKey: [KEY, "categories", lang],
    queryFn: () => labProductImportService.globalCategories(lang),
    enabled,
  })
  const subcategories = useQuery({
    queryKey: [KEY, "subcategories", categoryId, lang],
    queryFn: () => labProductImportService.globalSubcategories(categoryId!, lang),
    enabled: enabled && !!categoryId,
  })
  return { categories: categories.data ?? [], subcategories: subcategories.data ?? [] }
}

export function useStartImport(customerId: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ productIds, confirmIds }: { productIds: number[]; confirmIds: number[] }) =>
      labProductImportService.start(customerId!, productIds, confirmIds),
    onSuccess: async (started) => {
      const key = [KEY, "latest", customerId]
      await queryClient.cancelQueries({ queryKey: key })
      // Show the queued run at once; this also starts the polling.
      queryClient.setQueryData<LabProductImport>(key, {
        ...started,
        imported_count: 0,
        failed_count: 0,
        error: null,
        items: [],
      })
      void queryClient.invalidateQueries({ queryKey: [KEY, "catalog", customerId] })
    },
  })
}
