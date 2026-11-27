"use client"

import { useQuery } from "@tanstack/react-query"
import { labProductImportService } from "@/services/lab-product-import-service"
import type { ImportCatalogFilters } from "@/types/lab-product-import"

export const IMPORT_QUERY_KEY = "lab-product-import"

export function useImportCatalog(
  customerId: number | null,
  filters: ImportCatalogFilters,
  page: number,
  lang: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [IMPORT_QUERY_KEY, "catalog", customerId, filters, page, lang],
    queryFn: () => labProductImportService.catalog(customerId!, filters, page, lang),
    enabled: enabled && !!customerId,
    staleTime: 0,
    retry: false,
  })
}

export function useGlobalLibraryFilters(categoryId: number | null, lang: string, enabled: boolean) {
  const categories = useQuery({
    queryKey: [IMPORT_QUERY_KEY, "categories", lang],
    queryFn: () => labProductImportService.globalCategories(lang),
    enabled,
  })
  const subcategories = useQuery({
    queryKey: [IMPORT_QUERY_KEY, "subcategories", categoryId, lang],
    queryFn: () => labProductImportService.globalSubcategories(categoryId!, lang),
    enabled: enabled && !!categoryId,
  })
  return { categories: categories.data ?? [], subcategories: subcategories.data ?? [] }
}

export function useImportProduct(customerId: number, productId: number, lang: string) {
  return useQuery({
    queryKey: [IMPORT_QUERY_KEY, "product", customerId, productId, lang],
    queryFn: () => labProductImportService.product(customerId, productId, lang),
    staleTime: 0,
    retry: false,
  })
}
