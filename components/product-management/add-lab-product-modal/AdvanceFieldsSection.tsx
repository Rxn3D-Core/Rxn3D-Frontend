"use client"

import React, { useState, useMemo, useCallback } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Plus,
  Search,
  Pencil,
  X,
  Loader2,
  ArrowUpDown,
  Filter,
  Info,
  AlertCircle,
} from "lucide-react"
import { ValidationError } from "@/components/ui/validation-error"
import { cn } from "@/lib/utils"
import {
  type AdvanceField,
  useAdvanceFields,
  useAdvanceCategories,
  useAdvanceSubcategories,
  ADVANCE_FIELDS_PRODUCT_MODAL_PAGE_SIZE,
} from "@/lib/api/advance-mode-query"
import { ProductCreateForm } from "@/lib/schemas"
import { AddFieldModal } from "@/components/advance-mode"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type AdvanceFieldSectionRow = NonNullable<ProductCreateForm["advance_fields"]>[number]

/** Open Advance Field add/edit in a host outside the product modal (recommended). */
export type AdvanceFieldEditorRequest = {
  mode: "create" | "edit"
  /** When mode is "edit" */
  fieldId?: number
  catalogCustomerId?: number | null
  onPersisted: (field: AdvanceField) => void
}

/** Align with `/library/advance/fields` list shapes (see useAdvanceFields + lab-advance-mode fields page). */
function extractFieldsList(data: unknown): AdvanceField[] {
  if (!data) return []
  if (Array.isArray(data)) return data as AdvanceField[]

  const d = data as Record<string, unknown>
  if (Array.isArray(d.data)) return d.data as AdvanceField[]

  const inner = d.data as Record<string, unknown> | undefined
  if (inner && Array.isArray(inner.data)) return inner.data as AdvanceField[]
  if (inner && typeof inner.total === "number" && Array.isArray(inner.items)) {
    return inner.items as AdvanceField[]
  }
  // Status-wrapped payloads: `{ status, data: { data: [...] } }`
  const statusLike = typeof d.status === "string" || typeof d.status === "number"
  if (statusLike && inner && typeof inner === "object") {
    if (Array.isArray(inner.data)) return inner.data as AdvanceField[]
    if (Array.isArray(inner.items)) return inner.items as AdvanceField[]
  }

  return []
}

function subcategoryName(f: AdvanceField): string {
  return (
    f.advance_subcategory?.name ??
    f.subcategory?.name ??
    "—"
  )
}

function categoryNumericId(field: AdvanceField): number | null {
  const raw = field.advance_category_id ?? field.category?.id
  return typeof raw === "number" && !Number.isNaN(raw) ? raw : null
}

function labelForCategoryFromFields(categoryId: number, rows: AdvanceField[]): string | undefined {
  const hit = rows.find((f) => categoryNumericId(f) === categoryId)
  const n = hit?.category?.name
  return typeof n === "string" && n.trim() ? n.trim() : undefined
}

function subcategoryNumericId(field: AdvanceField): number | null {
  const raw =
    field.advance_subcategory_id ??
    field.advance_subcategory?.id ??
    field.subcategory?.id
  return typeof raw === "number" && !Number.isNaN(raw) ? raw : null
}

function labelForSubcategoryFromFields(subcategoryId: number, rows: AdvanceField[]): string | undefined {
  const hit = rows.find((f) => subcategoryNumericId(f) === subcategoryId)
  return hit ? subcategoryName(hit) : undefined
}

/** Update/create responses often omit nested subcategory objects; resolve label from id maps or prior row state. */
function resolvePersistedSubcategoryDisplayName(
  saved: AdvanceField,
  previousRow: AdvanceFieldSectionRow | undefined,
  subcategoryIdToName: Map<number, string>,
  peerFieldsForLabels: AdvanceField[],
): string {
  const nested =
    typeof saved.advance_subcategory?.name === "string"
      ? saved.advance_subcategory.name.trim()
      : typeof saved.subcategory?.name === "string"
        ? saved.subcategory.name.trim()
        : ""

  if (nested) return nested

  const sid = subcategoryNumericId(saved)
  if (sid != null) {
    const fromCatalog = subcategoryIdToName.get(sid)
    if (fromCatalog) return fromCatalog

    const fromPeers = labelForSubcategoryFromFields(sid, peerFieldsForLabels)
    if (fromPeers && fromPeers !== "—") return fromPeers

    return `Subcategory (${sid})`
  }

  const kept =
    typeof previousRow?.subcategory_name === "string" ? previousRow.subcategory_name.trim() : ""
  if (kept && kept !== "—") return kept

  return "—"
}

/** Same pattern as resolvePersistedSubcategoryDisplayName for category labels after sparse API payloads. */
function resolvePersistedCategoryDisplayName(
  saved: AdvanceField,
  previousRow: AdvanceFieldSectionRow | undefined,
  categoryIdToName: Map<number, string>,
  peerFieldsForLabels: AdvanceField[],
): string {
  const nested = typeof saved.category?.name === "string" ? saved.category.name.trim() : ""
  if (nested) return nested

  const cid = categoryNumericId(saved)
  if (cid != null) {
    const fromCatalog = categoryIdToName.get(cid)
    if (fromCatalog) return fromCatalog

    const fromPeers = labelForCategoryFromFields(cid, peerFieldsForLabels)
    if (fromPeers && fromPeers !== "—") return fromPeers

    return `Category (${cid})`
  }

  const kept =
    typeof previousRow?.category_name === "string" ? previousRow.category_name.trim() : ""
  if (kept && kept !== "—") return kept

  return "—"
}

function compareAvailableAdvanceFieldsClient(
  a: AdvanceField,
  b: AdvanceField,
  orderByKey: string,
  sortAsc: boolean,
  categoryCatalogNameById: Map<number, string>,
  subcategoryCatalogNameById: Map<number, string>,
  catalogPeers: AdvanceField[],
): number {
  const dir = sortAsc ? 1 : -1
  const cmpName = () =>
    String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, { sensitivity: "base" })

  let main = 0
  if ((orderByKey || "name") === "name") {
    main = cmpName()
  } else if (orderByKey === "advance_category_id") {
    const sa = resolvePersistedCategoryDisplayName(a, undefined, categoryCatalogNameById, catalogPeers)
    const sb = resolvePersistedCategoryDisplayName(b, undefined, categoryCatalogNameById, catalogPeers)
    main = sa.localeCompare(sb, undefined, { sensitivity: "base" })
    if (main === 0) main = cmpName()
  } else if (orderByKey === "advance_subcategory_id") {
    const sa = resolvePersistedSubcategoryDisplayName(a, undefined, subcategoryCatalogNameById, catalogPeers)
    const sb = resolvePersistedSubcategoryDisplayName(b, undefined, subcategoryCatalogNameById, catalogPeers)
    main = sa.localeCompare(sb, undefined, { sensitivity: "base" })
    if (main === 0) main = cmpName()
  } else {
    main = cmpName()
  }

  return main * dir
}

function subcategoryCustomerId(f: AdvanceField): number | null {
  const sid = (
    (f.advance_subcategory as { customer_id?: unknown } | undefined)?.customer_id ??
    (f.subcategory as { customer_id?: unknown } | undefined)?.customer_id
  ) as unknown
  if (sid === null || sid === undefined || sid === "") return null
  const n = typeof sid === "number" ? sid : parseInt(String(sid), 10)
  return Number.isNaN(n) ? null : n
}

interface AdvanceFieldsSectionProps {
  watch: any
  setValue: any
  sections: Record<string, boolean>
  toggleSection: (key: string) => void
  getValidationError: (field: string) => string | undefined
  sectionHasErrors: (fields: string[]) => boolean
  /** Passing a positive id scopes `/library/advance/fields` to lab catalog */
  listCustomerId?: number | null
  /**
   * When set, Advance Field create/edit opens here instead of nesting inside the product modal
   * (fixes focus / dismissable-layer issues).
   */
  onRequestAdvanceFieldEditor?: (req: AdvanceFieldEditorRequest) => void
}

export function AdvanceFieldsSection({
  watch,
  setValue,
  sections,
  toggleSection,
  getValidationError,
  sectionHasErrors,
  listCustomerId = null,
  onRequestAdvanceFieldEditor,
}: AdvanceFieldsSectionProps) {
  const linked = watch("advance_fields") || []
  const sectionOn = sections.advanceField !== false

  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"asc" | "desc">("asc")
  const [orderBy, setOrderBy] = useState<string>("name")
  const [filterSubcategoryId, setFilterSubcategoryId] = useState<string>("__all__")

  const useEmbeddedAdvanceFieldModal = !onRequestAdvanceFieldEditor

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editFieldId, setEditFieldId] = useState<number | null>(null)

  const linkedIdSet = useMemo(
    () => new Set<number>(linked.map((r: AdvanceFieldSectionRow) => r.advance_field_id)),
    [linked],
  )

  const queryCustomerId =
    typeof listCustomerId === "number" && listCustomerId > 0 ? listCustomerId : null

  const categoriesCatalogParams = useMemo(
    () => ({
      per_page: 100,
      status: "Active" as const,
      ...(typeof queryCustomerId === "number" && queryCustomerId > 0
        ? { customer_id: queryCustomerId }
        : {}),
    }),
    [queryCustomerId],
  )

  const { data: categoriesResp } = useAdvanceCategories(categoriesCatalogParams, {
    enabled: sectionOn,
  })

  const categoryCatalogNameById = useMemo(() => {
    const raw = categoriesResp?.data
    const apiList = Array.isArray(raw) ? raw : []
    const map = new Map<number, string>()
    for (const row of apiList) {
      if (typeof row.id !== "number" || Number.isNaN(row.id)) continue
      map.set(row.id, typeof row.name === "string" && row.name.trim() ? row.name.trim() : `Category (${row.id})`)
    }
    return map
  }, [categoriesResp])

  const subcategoriesCatalogParams = useMemo(
    () => ({
      status: "Active" as const,
      order_by: "name",
      sort_by: "asc" as const,
      ...(typeof queryCustomerId === "number" && queryCustomerId > 0
        ? { customer_id: queryCustomerId }
        : {}),
    }),
    [queryCustomerId],
  )

  const { data: subcategoriesResp, isLoading: subcategoriesListLoading } = useAdvanceSubcategories(
    subcategoriesCatalogParams,
    { enabled: sectionOn },
  )

  const subcategoryCatalogNameById = useMemo(() => {
    const raw = subcategoriesResp?.data
    const apiList = Array.isArray(raw) ? raw : []
    const map = new Map<number, string>()
    for (const row of apiList) {
      if (typeof row.id !== "number" || Number.isNaN(row.id)) continue
      map.set(row.id, typeof row.name === "string" && row.name.trim() ? row.name.trim() : `Subcategory (${row.id})`)
    }
    return map
  }, [subcategoriesResp])

  /** One bulk Active catalog fetch per customer scope — search/filter/sort are client-side below. */
  const catalogFetchParams = useMemo(
    () => ({
      page: 1 as const,
      per_page: ADVANCE_FIELDS_PRODUCT_MODAL_PAGE_SIZE,
      status: "Active" as const,
      ...(typeof queryCustomerId === "number" && queryCustomerId > 0 ? { customer_id: queryCustomerId } : {}),
    }),
    [queryCustomerId],
  )

  const { data, isLoading, isFetching } = useAdvanceFields(catalogFetchParams, {
    enabled: sectionOn,
  })

  const catalogRows = extractFieldsList(data)

  const filteredAvailableSortedRows = useMemo(() => {
    let rows = catalogRows.filter((f) => !linkedIdSet.has(f.id))

    if (filterSubcategoryId !== "__all__") {
      const sid = parseInt(filterSubcategoryId, 10)
      if (!Number.isNaN(sid)) {
        rows = rows.filter((f) => subcategoryNumericId(f) === sid)
      }
    }

    const qNeedle = searchQuery.trim().toLowerCase()
    if (qNeedle.length > 0) {
      rows = rows.filter((f) => {
        const nm = typeof f.name === "string" ? f.name : ""
        const cat = resolvePersistedCategoryDisplayName(
          f,
          undefined,
          categoryCatalogNameById,
          catalogRows,
        )
        const sub = resolvePersistedSubcategoryDisplayName(
          f,
          undefined,
          subcategoryCatalogNameById,
          catalogRows,
        )
        return `${nm} ${cat} ${sub}`.toLowerCase().includes(qNeedle)
      })
    }

    rows = [...rows].sort((a, b) =>
      compareAvailableAdvanceFieldsClient(
        a,
        b,
        orderBy || "name",
        sortBy === "asc",
        categoryCatalogNameById,
        subcategoryCatalogNameById,
        catalogRows,
      ),
    )
    return rows
  }, [
    catalogRows,
    linkedIdSet,
    filterSubcategoryId,
    searchQuery,
    orderBy,
    sortBy,
    categoryCatalogNameById,
    subcategoryCatalogNameById,
  ])

  /** Full catalog list from `/library/advance/subcategories` (scoped like the fields table). */
  const subcategoryFilterOptions = useMemo(() => {
    const map = new Map<number, string>(subcategoryCatalogNameById)

    const selectedId =
      filterSubcategoryId !== "__all__" ? parseInt(filterSubcategoryId, 10) : NaN
    if (Number.isFinite(selectedId) && !map.has(selectedId)) {
      const lbl = labelForSubcategoryFromFields(selectedId, catalogRows)
      map.set(selectedId, lbl ?? `Subcategory (${selectedId})`)
    }

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [subcategoryCatalogNameById, filterSubcategoryId, catalogRows])

  /** Field name + category + subcategory + action */
  const tableColumnCount = 4

  const linkedCategoryLabel = useCallback(
    (row: AdvanceFieldSectionRow) => {
      const fromForm = typeof row.category_name === "string" ? row.category_name.trim() : ""
      if (fromForm && fromForm !== "—") return fromForm
      const match = catalogRows.find((f) => f.id === row.advance_field_id)
      return match
        ? resolvePersistedCategoryDisplayName(match, row, categoryCatalogNameById, catalogRows)
        : "—"
    },
    [catalogRows, categoryCatalogNameById],
  )

  const linkedSubcategoryLabel = useCallback(
    (row: AdvanceFieldSectionRow) => {
      const fromForm = typeof row.subcategory_name === "string" ? row.subcategory_name.trim() : ""
      if (fromForm && fromForm !== "—") return fromForm
      const match = catalogRows.find((f) => f.id === row.advance_field_id)
      return match
        ? resolvePersistedSubcategoryDisplayName(match, row, subcategoryCatalogNameById, catalogRows)
        : "—"
    },
    [catalogRows, subcategoryCatalogNameById],
  )

  const handleSort = (field: string) => {
    if (orderBy === field) setSortBy((s) => (s === "asc" ? "desc" : "asc"))
    else {
      setOrderBy(field)
      setSortBy("asc")
    }
  }

  const linkRow = useCallback(
    (field: AdvanceField) => {
      const cid = subcategoryCustomerId(field)
      const prev = watch("advance_fields") || []
      if (prev.some((p: AdvanceFieldSectionRow) => p.advance_field_id === field.id)) return
      const next = [
        ...prev,
        {
          advance_field_id: field.id,
          sequence: prev.length + 1,
          status: "Active" as const,
          field_name: field.name,
          category_name: resolvePersistedCategoryDisplayName(
            field,
            undefined,
            categoryCatalogNameById,
            catalogRows,
          ),
          subcategory_name: resolvePersistedSubcategoryDisplayName(
            field,
            undefined,
            subcategoryCatalogNameById,
            catalogRows,
          ),
          customer_id: cid,
        },
      ]
      setValue("advance_fields", next, { shouldDirty: true })
    },
    [catalogRows, categoryCatalogNameById, setValue, subcategoryCatalogNameById, watch],
  )

  const unlinkRow = useCallback(
    (fieldId: number) => {
      const prev = watch("advance_fields") || []
      const next = prev
        .filter((r: AdvanceFieldSectionRow) => r.advance_field_id !== fieldId)
        .map((r: AdvanceFieldSectionRow, i: number) => ({
          ...r,
          sequence: i + 1,
        }))
      setValue("advance_fields", next, { shouldDirty: true })
    },
    [setValue, watch],
  )

  const syncPersistedAdvanceFieldIntoForm = useCallback(
    (saved: AdvanceField) => {
      const id = saved.id
      if (typeof id !== "number") return
      const prev = watch("advance_fields") || []
      const alreadyLinked = prev.some((row: AdvanceFieldSectionRow) => row.advance_field_id === id)

      if (!alreadyLinked) {
        linkRow(saved)
        return
      }

      const cid = subcategoryCustomerId(saved)
      const next = prev.map((row: AdvanceFieldSectionRow) => {
        if (row.advance_field_id !== id) return row
        const previousRow = row
        const patch: Partial<AdvanceFieldSectionRow> = {
          field_name: saved.name ?? row.field_name,
          category_name: resolvePersistedCategoryDisplayName(
            saved,
            previousRow,
            categoryCatalogNameById,
            catalogRows,
          ),
          subcategory_name: resolvePersistedSubcategoryDisplayName(
            saved,
            previousRow,
            subcategoryCatalogNameById,
            catalogRows,
          ),
        }
        if (cid !== null) patch.customer_id = cid
        return { ...row, ...patch }
      })
      setValue("advance_fields", next, { shouldDirty: true })
    },
    [catalogRows, categoryCatalogNameById, linkRow, setValue, subcategoryCatalogNameById, watch],
  )

  const requestAdvanceEditor = useCallback(
    (mode: "create" | "edit", fieldId?: number | null) => {
      const payload: AdvanceFieldEditorRequest = {
        mode,
        fieldId: fieldId ?? undefined,
        catalogCustomerId: queryCustomerId,
        onPersisted: syncPersistedAdvanceFieldIntoForm,
      }
      if (onRequestAdvanceFieldEditor) {
        onRequestAdvanceFieldEditor(payload)
        return
      }
      if (mode === "edit" && typeof fieldId === "number") {
        setEditFieldId(fieldId)
      } else {
        setEditFieldId(null)
      }
      setAddModalOpen(true)
    },
    [onRequestAdvanceFieldEditor, queryCustomerId, syncPersistedAdvanceFieldIntoForm],
  )

  const sortedLinked = useMemo(() => {
    const arr = [...linked]
    arr.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    return arr
  }, [linked])

  const editingFieldPlaceholder: AdvanceField | null =
    editFieldId != null ? ({ id: editFieldId } as AdvanceField) : null

  return (
    <div>
      {/* Header always interactive so the section can be turned back on (RetentionSection pattern). */}
      <div className="border-t">
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Switch
              checked={sections.advanceField !== false}
              onCheckedChange={(checked) => {
                toggleSection("advanceField")
              }}
              className="data-[state=checked]:bg-[#1162a8]"
            />
            <span className="font-medium">Advance Field</span>
            {sectionHasErrors(["advance_fields"]) ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            ) : null}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="rounded-sm text-gray-400 outline-none hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-[#1162a8] focus-visible:ring-offset-1"
                    aria-label="About advance fields for this product"
                  >
                    <Info className="h-4 w-4 shrink-0" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-sm normal-case">
                  Link catalog fields with +, or create with Add Advance Field — new fields link here automatically.
                  Edits update this list immediately; save or update the product to persist on the server.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Button
            type="button"
            className="rounded-md bg-[#9333EA] hover:bg-[#7c2dcf] border-[#9333EA] hover:border-[#7c2dcf] text-white hover:text-white"
            disabled={!sectionOn}
            onClick={() => requestAdvanceEditor("create")}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span>Add Advance Field</span>
          </Button>
        </div>
      </div>

      <ValidationError message={getValidationError("advance_fields")} />

      <div
        className={cn(
          "grid grid-cols-1 xl:grid-cols-2 gap-4 px-6 pb-6",
          !sectionOn && "opacity-60 pointer-events-none select-none",
        )}
      >
        {/* Left — Available */}
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden min-h-[320px]">
          <div className="flex flex-col sm:flex-row gap-2 p-4 border-b border-gray-100">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 rounded-md bg-white border-gray-200"
                placeholder="Search"
                value={searchQuery}
                disabled={!sectionOn}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 border-gray-200"
                  disabled={!sectionOn}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[240px] p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-gray-600">Subcategory</p>
                  {subcategoriesListLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-muted-foreground" />
                  ) : null}
                </div>
                <Select
                  value={filterSubcategoryId}
                  onValueChange={(v) => setFilterSubcategoryId(v)}
                  disabled={!sectionOn || subcategoriesListLoading}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All</SelectItem>
                    {subcategoryFilterOptions.map(({ id, name }) => (
                      <SelectItem key={id} value={String(id)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PopoverContent>
            </Popover>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[40%] min-w-[120px]">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-semibold"
                      disabled={!sectionOn}
                      onClick={() => handleSort("name")}
                    >
                      Field name
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </TableHead>
                  <TableHead className="min-w-[96px] max-w-[28%]">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-semibold"
                      disabled={!sectionOn}
                      onClick={() => handleSort("advance_category_id")}
                    >
                      Category
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </TableHead>
                  <TableHead className="min-w-[96px] max-w-[28%]">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-semibold"
                      disabled={!sectionOn}
                      onClick={() => handleSort("advance_subcategory_id")}
                    >
                      Subcategory
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right w-14">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={tableColumnCount}
                      className="h-48 text-center"
                    >
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#1162a8]" />
                    </TableCell>
                  </TableRow>
                ) : filteredAvailableSortedRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={tableColumnCount}
                      className="h-48 text-center text-muted-foreground"
                    >
                      {!isLoading && isFetching && catalogRows.length === 0 ? (
                        <Loader2 className="mx-auto h-6 w-6 animate-spin opacity-70" />
                      ) : (
                        "No fields to show."
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAvailableSortedRows.map((field) => (
                      <TableRow key={field.id}>
                        <TableCell className="font-medium text-gray-900">{field.name}</TableCell>
                        <TableCell className="text-gray-700">
                          {resolvePersistedCategoryDisplayName(
                            field,
                            undefined,
                            categoryCatalogNameById,
                            catalogRows,
                          )}
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {resolvePersistedSubcategoryDisplayName(
                            field,
                            undefined,
                            subcategoryCatalogNameById,
                            catalogRows,
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={!sectionOn}
                            className="h-9 w-9 text-[#1162a8] hover:bg-blue-50"
                            onClick={() => linkRow(field)}
                            aria-label={`Link ${field.name}`}
                          >
                            <Plus className="h-5 w-5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Right — Linked */}
        <div className="rounded-lg border border-gray-200 bg-gray-50/30 overflow-hidden min-h-[320px]">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
            <h3 className="text-sm font-semibold text-gray-900">Linked Advance field</h3>
          </div>
          <div className="overflow-x-auto p-2 pt-3">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Field name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Subcategory</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLinked.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={tableColumnCount}
                      className="h-44 text-center text-muted-foreground"
                    >
                      No linked advance fields yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedLinked.map((row) => (
                    <TableRow key={row.advance_field_id}>
                      <TableCell className="font-medium text-gray-900">
                        {row.field_name ?? `Field ${row.advance_field_id}`}
                      </TableCell>
                      <TableCell className="text-gray-700">{linkedCategoryLabel(row)}</TableCell>
                      <TableCell className="text-gray-700">{linkedSubcategoryLabel(row)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-[#1162a8]"
                          disabled={!sectionOn}
                          onClick={() => requestAdvanceEditor("edit", row.advance_field_id)}
                          aria-label="Edit advance field definition"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-gray-400 hover:text-red-600"
                          disabled={!sectionOn}
                          onClick={() => unlinkRow(row.advance_field_id)}
                          aria-label="Unlink advance field"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {useEmbeddedAdvanceFieldModal ? (
      <AddFieldModal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false)
          setEditFieldId(null)
        }}
        field={editingFieldPlaceholder}
        isEditing={Boolean(editFieldId)}
        catalogCustomerId={queryCustomerId ?? undefined}
        onFieldPersisted={syncPersistedAdvanceFieldIntoForm}
      />
      ) : null}
    </div>
  )
}
