"use client"

import { useState } from "react"
import { Loader2, Package2, Search } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useGlobalLibraryFilters, type useImportCatalog } from "@/hooks/use-lab-product-import"
import { MAX_IMPORT_PRODUCTS, setSelected } from "@/lib/lab-product-import"
import { labProductImportService } from "@/services/lab-product-import-service"
import type { ImportCatalogFilters, ImportState } from "@/types/lab-product-import"

interface ImportCatalogStepProps {
  customerId: number
  lang: string
  catalog: ReturnType<typeof useImportCatalog>
  search: string
  onSearchChange: (value: string) => void
  filters: ImportCatalogFilters
  onFiltersChange: (filters: ImportCatalogFilters) => void
  page: number
  onPageChange: (page: number) => void
  selected: Set<number>
  onSelectionChange: (selected: Set<number>) => void
  error: string | null
  submitting: boolean
  onSubmit: () => void
  onClose: () => void
}

export function ImportCatalogStep({
  customerId,
  lang,
  catalog,
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  page,
  onPageChange,
  selected,
  onSelectionChange,
  error,
  submitting,
  onSubmit,
  onClose,
}: ImportCatalogStepProps) {
  const { t } = useTranslation()
  const { categories, subcategories } = useGlobalLibraryFilters(filters.category_id ?? null, lang, true)
  const [selectingAll, setSelectingAll] = useState(false)
  const [selectAllFailed, setSelectAllFailed] = useState(false)

  const products = catalog.data?.data ?? []
  const total = catalog.data?.pagination.total ?? 0
  const lastPage = catalog.data?.pagination.last_page ?? 1
  const pageIds = products.map((product) => product.id)
  const pageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))

  const selectAllMatching = async () => {
    setSelectingAll(true)
    setSelectAllFailed(false)
    try {
      const { ids } = await labProductImportService.catalogIds(customerId, filters)
      onSelectionChange(setSelected(selected, ids, true))
    } catch {
      setSelectAllFailed(true)
    } finally {
      setSelectingAll(false)
    }
  }

  return (
    <>
      {/* Phones scroll filters and list together; wider screens keep the filters in place. */}
      <div className="min-h-0 flex-1 overflow-auto sm:flex sm:flex-col sm:overflow-hidden">
        <div className="space-y-2 border-b border-gray-200 px-4 sm:px-6 py-3">
          <p className="text-xs text-gray-600" data-testid="product-import-note">
            {t("productImport.inactiveNote")}
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              className="pl-10 h-9 text-sm"
              placeholder={t("productImport.search")}
              aria-label={t("productImport.search")}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              data-testid="product-import-search"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Select
              value={filters.category_id ? String(filters.category_id) : "all"}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  category_id: value === "all" ? null : Number(value),
                  subcategory_id: null,
                })
              }
            >
              <SelectTrigger className="h-9 text-sm" data-testid="product-import-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("productImport.allCategories")}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.subcategory_id ? String(filters.subcategory_id) : "all"}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, subcategory_id: value === "all" ? null : Number(value) })
              }
              disabled={!filters.category_id}
            >
              <SelectTrigger className="h-9 text-sm" data-testid="product-import-subcategory">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("productImport.allSubcategories")}</SelectItem>
                {subcategories.map((subcategory) => (
                  <SelectItem key={subcategory.id} value={String(subcategory.id)}>
                    {subcategory.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.import_state ?? "all"}
              onValueChange={(value) => onFiltersChange({ ...filters, import_state: value as ImportState })}
            >
              <SelectTrigger className="h-9 text-sm" data-testid="product-import-state">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("productImport.stateAll")}</SelectItem>
                <SelectItem value="imported">{t("productImport.stateImported")}</SelectItem>
                <SelectItem value="not_imported">{t("productImport.stateNotImported")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <Checkbox
                checked={pageSelected}
                disabled={pageIds.length === 0}
                onCheckedChange={(checked) => onSelectionChange(setSelected(selected, pageIds, !!checked))}
                data-testid="product-import-select-page"
              />
              {t("productImport.selectPage")}
            </label>
            <Button
              variant="link"
              className="h-auto p-0 text-sm text-[#1162a8]"
              onClick={selectAllMatching}
              disabled={total === 0 || selectingAll}
              data-testid="product-import-select-all"
            >
              {selectingAll && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t("productImport.selectAll", { number: total })}
            </Button>
          </div>
        </div>

        <div className="px-4 sm:min-h-0 sm:flex-1 sm:overflow-auto sm:px-6" data-testid="product-import-list">
          {catalog.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-[#1162a8]" />
            </div>
          ) : catalog.isError ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[#CF0202]">{t("productImport.loadFailed")}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => catalog.refetch()}>
                {t("productImport.retry")}
              </Button>
            </div>
          ) : products.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">{t("productImport.empty")}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {products.map((product) => (
                <li key={product.id} data-testid="product-import-row">
                  <label className="flex cursor-pointer items-center gap-3 py-2">
                    <Checkbox
                      checked={selected.has(product.id)}
                      onCheckedChange={(checked) =>
                        onSelectionChange(setSelected(selected, [product.id], !!checked))
                      }
                    />
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="h-10 w-10 flex-none rounded border border-gray-200 object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 flex-none items-center justify-center rounded border border-gray-200 bg-gray-50">
                        <Package2 className="h-4 w-4 text-gray-400" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="break-words text-sm font-medium text-gray-900">{product.name}</span>
                        {product.is_imported && (
                          <span
                            className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700"
                            title={product.imported_products.map((copy) => copy.name).join(", ")}
                            data-testid="product-import-badge"
                          >
                            {t("productImport.imported")}
                          </span>
                        )}
                      </span>
                      <span className="block break-words text-xs text-gray-500">
                        {[product.code, product.category?.name, product.subcategory?.name].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="flex-none text-xs font-medium text-gray-900">
                      {product.price === null || product.price === undefined ? "-" : `$${product.price}`}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>

      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-gray-100 py-2 text-xs text-gray-600">
          <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1} data-testid="product-import-prev">
            {t("productImport.previous")}
          </Button>
          <span>{t("productImport.pageOf", { page, pages: lastPage })}</span>
          <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= lastPage} data-testid="product-import-next">
            {t("productImport.next")}
          </Button>
        </div>
      )}

      <div className="border-t border-gray-200 px-4 sm:px-6 py-3">
        {(error || selectAllFailed) && (
          <p className="mb-2 text-sm text-[#CF0202]" role="alert" data-testid="product-import-error">
            {error ?? t("productImport.loadFailed")}
          </p>
        )}
        {selected.size >= MAX_IMPORT_PRODUCTS && (
          <p className="mb-2 text-xs text-gray-600">{t("productImport.limit", { max: MAX_IMPORT_PRODUCTS })}</p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span data-testid="product-import-selected">
              {t("productImport.selected", { number: selected.size })}
            </span>
            {selected.size > 0 && (
              <Button variant="link" className="h-auto p-0 text-sm" onClick={() => onSelectionChange(new Set())}>
                {t("productImport.clear")}
              </Button>
            )}
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {t("productImport.cancel")}
            </Button>
            <Button
              className="bg-[#1162a8] hover:bg-[#0d4d87] text-white"
              onClick={onSubmit}
              disabled={selected.size === 0 || submitting}
              data-testid="product-import-submit"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("productImport.submit")}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
