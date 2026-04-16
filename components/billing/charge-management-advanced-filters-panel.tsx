"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, RotateCcw } from "lucide-react"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import type { LibraryCategoryApi } from "@/hooks/use-library-categories"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

export type FilterChip = {
  id: string
  label: string
  onRemove: () => void
}

export type ChargeManagementAdvancedFiltersPanelProps = {
  open: boolean
  customerId: number | undefined
  onHide: () => void
  onClearAll: () => void
  applying: boolean
  chips: FilterChip[]
  advCategoryId: number | null
  onAdvCategoryIdChange: (id: number | null) => void
  advSubcategoryId: number | null
  onAdvSubcategoryIdChange: (id: number | null) => void
  advProductId: number | null
  onAdvProductIdChange: (id: number | null) => void
  advStageId: number | null
  onAdvStageIdChange: (id: number | null) => void
  advItemStatus: string
  onAdvItemStatusChange: (v: string) => void
  advAttachment: "all" | "yes" | "no"
  onAdvAttachmentChange: (v: "all" | "yes" | "no") => void
  showCasesWithAddon: boolean
  onShowCasesWithAddonChange: (v: boolean) => void
  showOnlyChecked: boolean
  onShowOnlyCheckedChange: (v: boolean) => void
  t: (key: string, opts?: { defaultValue?: string }) => string
}

type ProductRow = { id: number; name: string }
type StageRow = { id: number; name: string }

const LIBRARY_LIST_PAGE_SIZE = 200

function readLastPage(json: unknown): number {
  const p = (json as { data?: { pagination?: { last_page?: number } } })?.data?.pagination
  return Math.max(1, p?.last_page ?? 1)
}

async function fetchAllLibraryCategoriesForCustomer(
  customerId: number,
  lang: string
): Promise<LibraryCategoryApi[]> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  if (!token) return []

  const urlFirst = new URL("/v1/library/categories", API_BASE_URL)
  urlFirst.searchParams.set("lang", lang)
  urlFirst.searchParams.set("customer_id", String(customerId))

  const res0 = await fetch(urlFirst.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res0.ok) return []
  const json0 = await res0.json()
  const first = (json0.data?.data ?? []) as LibraryCategoryApi[]
  const lastPage = readLastPage(json0)
  if (lastPage <= 1) return first

  const byId = new Map<number, LibraryCategoryApi>()
  for (const c of first) byId.set(c.id, c)

  const perPage = (json0 as { data?: { pagination?: { per_page?: number } } }).data?.pagination?.per_page

  for (let page = 2; page <= lastPage; page++) {
    const url = new URL("/v1/library/categories", API_BASE_URL)
    url.searchParams.set("lang", lang)
    url.searchParams.set("customer_id", String(customerId))
    url.searchParams.set("page", String(page))
    if (typeof perPage === "number" && perPage > 0) {
      url.searchParams.set("per_page", String(perPage))
    } else {
      url.searchParams.set("per_page", String(LIBRARY_LIST_PAGE_SIZE))
    }
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) break
    const json = await res.json()
    const chunk = (json.data?.data ?? []) as LibraryCategoryApi[]
    for (const c of chunk) byId.set(c.id, c)
  }

  return Array.from(byId.values())
}

async function fetchAllLibraryProductsForCustomer(customerId: number): Promise<ProductRow[]> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  const url = new URL("/v1/library/products", API_BASE_URL)
  url.searchParams.set("customer_id", String(customerId))
  url.searchParams.set("lang", "en")
  const res = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) return []
  const json = await res.json()
  const data = json.data?.data ?? json.data
  if (!Array.isArray(data)) return []
  return (data as { id: number; name: string }[]).map((p) => ({ id: p.id, name: p.name }))
}

async function fetchAllLibraryStagesForCustomer(customerId: number): Promise<StageRow[]> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  const url = new URL("/v1/library/stages", API_BASE_URL)
  url.searchParams.set("customer_id", String(customerId))
  url.searchParams.set("status", "Active")
  url.searchParams.set("lang", "en")
  const res = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) return []
  const json = await res.json()
  const data = json.data?.data ?? json.data
  if (!Array.isArray(data)) return []
  return (data as { id?: number; stage_id?: number; name?: string }[])
    .map((s) => ({
      id: Number(s.id ?? s.stage_id ?? 0),
      name: String(s.name ?? ""),
    }))
    .filter((s) => s.id > 0 && s.name)
}

export function ChargeManagementAdvancedFiltersPanel({
  open,
  customerId,
  onHide,
  onClearAll,
  applying,
  chips,
  advCategoryId,
  onAdvCategoryIdChange,
  advSubcategoryId,
  onAdvSubcategoryIdChange,
  advProductId,
  onAdvProductIdChange,
  advStageId,
  onAdvStageIdChange,
  advItemStatus,
  onAdvItemStatusChange,
  advAttachment,
  onAdvAttachmentChange,
  showCasesWithAddon,
  onShowCasesWithAddonChange,
  showOnlyChecked,
  onShowOnlyCheckedChange,
  t,
}: ChargeManagementAdvancedFiltersPanelProps) {
  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ["charge-mgmt-library-categories-all", customerId, "en"],
    queryFn: () => fetchAllLibraryCategoriesForCustomer(customerId!, "en"),
    enabled: !!customerId,
    staleTime: 1000 * 60 * 5,
  })

  const allSubcategoriesFlat = useMemo(() => {
    const out: { id: number; label: string }[] = []
    for (const c of categories) {
      for (const s of c.subcategories ?? []) {
        out.push({ id: s.id, label: `${c.name} › ${s.name}` })
      }
    }
    return out
  }, [categories])

  const categoryFilterOptions = useMemo(
    () => [
      { value: "all", label: t("chargeManagement.allCategories", { defaultValue: "All categories" }) },
      ...categories.map((c) => ({ value: String(c.id), label: c.name })),
    ],
    [categories, t]
  )

  const subcategoryFilterOptions = useMemo(
    () => [
      { value: "all", label: t("chargeManagement.allSubcategories", { defaultValue: "All subcategories" }) },
      ...allSubcategoriesFlat.map((s) => ({ value: String(s.id), label: s.label })),
    ],
    [allSubcategoriesFlat, t]
  )

  const { data: products = [], isLoading: prodLoading } = useQuery({
    queryKey: ["charge-mgmt-library-products-all", customerId],
    queryFn: () => fetchAllLibraryProductsForCustomer(customerId!),
    enabled: !!customerId,
    staleTime: 1000 * 60 * 5,
  })

  const { data: stages = [], isLoading: stagesLoading } = useQuery({
    queryKey: ["charge-mgmt-library-stages-all", customerId],
    queryFn: () => fetchAllLibraryStagesForCustomer(customerId!),
    enabled: !!customerId,
    staleTime: 1000 * 60 * 5,
  })

  const productFilterOptions = useMemo(
    () => [
      { value: "all", label: t("chargeManagement.allProducts", { defaultValue: "All products" }) },
      ...products.map((p) => ({ value: String(p.id), label: p.name })),
    ],
    [products, t]
  )

  const stageFilterOptions = useMemo(
    () => [
      { value: "all", label: t("chargeManagement.anyStage", { defaultValue: "Any stage" }) },
      ...stages.map((s) => ({ value: String(s.id), label: s.name })),
    ],
    [stages, t]
  )

  if (!open) return null

  return (
    <div className="border-t border-gray-200 bg-slate-50/60 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
        <p className="text-sm font-semibold text-gray-900">
          {t("chargeManagement.advancedPanelTitle", { defaultValue: "Advance filters" })}
        </p>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-gray-600 hover:text-[#1162a8]"
            onClick={onClearAll}
          >
            <RotateCcw className="h-4 w-4" />
            {t("chargeManagement.clearAllFilters", { defaultValue: "Clear all filters" })}
          </button>
          <button type="button" className="text-[#1162a8] font-medium hover:underline" onClick={onHide}>
            {t("chargeManagement.hideFilters", { defaultValue: "Hide filters" })}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        {t("chargeManagement.advancedFiltersIndependent", {
          defaultValue:
            "Category, subcategory, product, and stage can be used alone or together. Toolbar filters apply automatically.",
        })}
      </p>

      <div className="flex flex-nowrap items-end gap-2 md:gap-3 min-w-0 overflow-x-auto pb-1 [scrollbar-width:thin]">
        <div className="space-y-1.5 min-w-[160px] flex-1 shrink-0">
          <Label className="text-xs text-gray-500">
            {t("chargeManagement.selectCategory", { defaultValue: "Category" })}
          </Label>
          <SearchableSelect
            disabled={catLoading || !customerId}
            value={advCategoryId == null ? "all" : String(advCategoryId)}
            onValueChange={(v) => {
              const next = v === "" ? "all" : v
              if (next === "all") onAdvCategoryIdChange(null)
              else {
                const id = parseInt(next, 10)
                onAdvCategoryIdChange(Number.isNaN(id) ? null : id)
              }
            }}
            placeholder={
              catLoading
                ? t("chargeManagement.loadingCategories", { defaultValue: "Loading…" })
                : t("chargeManagement.allCategories", { defaultValue: "All categories" })
            }
            className="h-10 bg-white border-gray-200 font-normal"
            options={categoryFilterOptions}
            emptyMessage={t("chargeManagement.noCategoriesMatch", { defaultValue: "No categories found." })}
            searchPlaceholder={t("chargeManagement.searchCategories", { defaultValue: "Search categories…" })}
          />
        </div>

        <div className="space-y-1.5 min-w-[180px] flex-1 shrink-0">
          <Label className="text-xs text-gray-500">
            {t("chargeManagement.selectSubcategory", { defaultValue: "Subcategory" })}
          </Label>
          <SearchableSelect
            disabled={catLoading || !customerId}
            value={advSubcategoryId == null ? "all" : String(advSubcategoryId)}
            onValueChange={(v) => {
              const next = v === "" ? "all" : v
              if (next === "all") onAdvSubcategoryIdChange(null)
              else {
                const id = parseInt(next, 10)
                onAdvSubcategoryIdChange(Number.isNaN(id) ? null : id)
              }
            }}
            placeholder={
              catLoading
                ? t("chargeManagement.loadingSubcategories", { defaultValue: "Loading…" })
                : t("chargeManagement.allSubcategories", { defaultValue: "All subcategories" })
            }
            className="h-10 bg-white border-gray-200 font-normal"
            options={subcategoryFilterOptions}
            emptyMessage={t("chargeManagement.noSubcategoriesMatch", { defaultValue: "No subcategories found." })}
            searchPlaceholder={t("chargeManagement.searchSubcategories", { defaultValue: "Search subcategories…" })}
          />
        </div>

        <div className="space-y-1.5 min-w-[160px] flex-1 shrink-0">
          <Label className="text-xs text-gray-500">
            {t("chargeManagement.selectProduct", { defaultValue: "Product" })}
          </Label>
          <SearchableSelect
            disabled={!customerId || prodLoading}
            value={advProductId == null ? "all" : String(advProductId)}
            onValueChange={(v) => {
              const next = v === "" ? "all" : v
              if (next === "all") onAdvProductIdChange(null)
              else {
                const id = parseInt(next, 10)
                onAdvProductIdChange(Number.isNaN(id) ? null : id)
              }
            }}
            placeholder={
              prodLoading
                ? t("chargeManagement.loadingProducts", { defaultValue: "Loading…" })
                : t("chargeManagement.allProducts", { defaultValue: "All products" })
            }
            className="h-10 bg-white border-gray-200 font-normal"
            options={productFilterOptions}
            emptyMessage={t("chargeManagement.noProductsMatch", { defaultValue: "No products found." })}
            searchPlaceholder={t("chargeManagement.searchProducts", { defaultValue: "Search products…" })}
          />
        </div>

        <div className="space-y-1.5 min-w-[140px] flex-1 shrink-0">
          <Label className="text-xs text-gray-500">
            {t("chargeManagement.stageType", { defaultValue: "Stage" })}
          </Label>
          <SearchableSelect
            disabled={!customerId || stagesLoading}
            value={advStageId == null ? "all" : String(advStageId)}
            onValueChange={(v) => {
              const next = v === "" ? "all" : v
              if (next === "all") onAdvStageIdChange(null)
              else {
                const id = parseInt(next, 10)
                onAdvStageIdChange(Number.isNaN(id) ? null : id)
              }
            }}
            placeholder={
              stagesLoading
                ? t("chargeManagement.loadingStages", { defaultValue: "Loading…" })
                : t("chargeManagement.anyStage", { defaultValue: "Any stage" })
            }
            className="h-10 bg-white border-gray-200 font-normal"
            options={stageFilterOptions}
            emptyMessage={t("chargeManagement.noStagesMatch", { defaultValue: "No stages found." })}
            searchPlaceholder={t("chargeManagement.searchStages", { defaultValue: "Search stages…" })}
          />
        </div>

        <div className="space-y-1.5 w-[140px] shrink-0">
          <Label className="text-xs text-gray-500">
            {t("chargeManagement.billingStatus", { defaultValue: "Billing status" })}
          </Label>
          <Select value={advItemStatus} onValueChange={onAdvItemStatusChange}>
            <SelectTrigger className="h-10 bg-white border-gray-200">
              <SelectValue placeholder={t("chargeManagement.selectStatus", { defaultValue: "Status" })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("chargeManagement.anyStatus", { defaultValue: "Any" })}</SelectItem>
              <SelectItem value="unbilled">Unbilled</SelectItem>
              <SelectItem value="checked">Checked</SelectItem>
              <SelectItem value="billed">Billed</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
              <SelectItem value="dispute">Dispute</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 w-[120px] shrink-0">
          <Label className="text-xs text-gray-500">
            {t("chargeManagement.attachmentFilter", { defaultValue: "Attachment" })}
          </Label>
          <Select
            value={advAttachment}
            onValueChange={(v) => onAdvAttachmentChange(v as "all" | "yes" | "no")}
          >
            <SelectTrigger className="h-10 bg-white border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("chargeManagement.attachAny", { defaultValue: "Any" })}</SelectItem>
              <SelectItem value="yes">{t("chargeManagement.attachYes", { defaultValue: "Yes" })}</SelectItem>
              <SelectItem value="no">{t("chargeManagement.attachNo", { defaultValue: "No" })}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {applying && (
          <div className="flex items-center gap-2 text-xs text-gray-500 pb-2 shrink-0">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("chargeManagement.updating", { defaultValue: "Updating…" })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-6 mt-4 pt-3 border-t border-gray-200/80">
        <div className="flex items-center gap-2">
          <Switch id="addon-toggle" checked={showCasesWithAddon} onCheckedChange={onShowCasesWithAddonChange} />
          <Label htmlFor="addon-toggle" className="text-sm font-normal cursor-pointer">
            {t("chargeManagement.toggleAddon", { defaultValue: "Show cases with add-on" })}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="checked-toggle" checked={showOnlyChecked} onCheckedChange={onShowOnlyCheckedChange} />
          <Label htmlFor="checked-toggle" className="text-sm font-normal cursor-pointer">
            {t("chargeManagement.toggleChecked", { defaultValue: "Show only checked items" })}
          </Label>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200/80">
          {chips.map((c) => (
            <Badge
              key={c.id}
              variant="secondary"
              className="pl-2 pr-1 py-1 gap-1 font-normal bg-white border border-gray-200 text-gray-800"
            >
              {c.label}
              <button
                type="button"
                className="ml-1 rounded-full p-0.5 hover:bg-gray-200"
                onClick={c.onRemove}
                aria-label={t("chargeManagement.removeFilter", { defaultValue: "Remove filter" })}
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
