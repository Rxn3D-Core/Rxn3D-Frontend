"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react"
import { useQueries } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import type { ToothStatusOption } from "@/components/tooth-status-popover"
import { ProductMaxillaryTeethSVG } from "@/components/product-management/product-tooth-chart/product-maxillary-teeth-svg"
import { ProductMandibularTeethSVG } from "@/components/product-management/product-tooth-chart/product-mandibular-teeth-svg"
import {
  isOverlayExtractionCode,
  isSingleDefaultOnlyExtractionList,
  isTimExtractionRow,
  toothHasTimBaseExtraction,
} from "@/components/case-design-center/utils/extractionHelpers"
import type { RetentionChartType } from "@/components/case-design-center/utils/retentionOptionChartType"
import type { Extraction } from "@/lib/schemas"
import { chartStatusTeethFromExtractionDisplay } from "@/lib/virtual-slip-extraction-display"
import {
  applyProductRetentionSelection,
  buildChartToothExtractionMap,
  buildInteractiveToothExtractionMap,
  buildProductExtractionCatalog,
  buildProductExtractionImagesByCode,
  buildProductExtractionPopoverOptions,
  buildProductExtractionPopoverOptionsForTooth,
  buildProductPreviewToothImages,
  buildProductRetentionOptions,
  collectExtractionToothImagesApiIds,
  collectRetentionToothImagesApiIds,
  enrichRetentionOptionsWithToothImages,
  mergeExtractionToothImages,
  resolveActiveProductExtractions,
  type ResolvedProductExtraction,
  type RetentionToothImageRow,
} from "@/lib/product-tooth-chart-preview-state"
import type { RetentionOption } from "@/services/retention-options-api"
import { getGlobalRetentionOptionToothImages } from "@/services/retention-options-api"
import { ExtractionsApi } from "@/lib/api-service"
import type { RetentionOptionItem } from "@/components/retention-type-popover"
import { retentionOptionToothImagesKeys } from "@/hooks/use-retention-option-tooth-images"
import { extractionsKeys } from "@/hooks/use-extractions"
import { cn } from "@/lib/utils"
import {
  buildDefaultToothChartFromPreviewState,
  defaultToothChartSignature,
  parseDefaultToothChartToPreviewState,
  resolveCatalogDefaultExtractionAssignment,
  resolveCatalogDefaultExtractionId,
  type ProductDefaultToothChartEntry,
} from "@/lib/product-default-tooth-chart"

type ProductExtractionRow = {
  extraction_id: number
  status?: string
  is_default?: "Yes" | "No"
  max_teeth?: number | null
}

type PreviewArch = "maxillary" | "mandibular"

type ArchRetentionState = {
  typesByTooth: Record<number, RetentionChartType[]>
  optionIdByTooth: Record<number, number>
}

const EMPTY_ARCH_RETENTION: ArchRetentionState = {
  typesByTooth: {},
  optionIdByTooth: {},
}

function clearRetentionOnTooth(
  state: ArchRetentionState,
  toothNumber: number,
): ArchRetentionState {
  if (!(toothNumber in state.typesByTooth) && !(toothNumber in state.optionIdByTooth)) {
    return state
  }
  const typesByTooth = { ...state.typesByTooth }
  const optionIdByTooth = { ...state.optionIdByTooth }
  delete typesByTooth[toothNumber]
  delete optionIdByTooth[toothNumber]
  return { typesByTooth, optionIdByTooth }
}

type ToothPopoverState = {
  arch: PreviewArch | null
  toothNumber: number | null
}

export interface ProductToothChartPreviewProps {
  retentionEnabled: boolean
  extractionsEnabled: boolean
  linkedRetentionOptionIds: number[]
  retentionCatalog: RetentionOption[]
  productExtractions: ProductExtractionRow[]
  allExtractions: Extraction[]
  /** Whether the shared extraction catalog is still being fetched. */
  isExtractionsLoading?: boolean
  fillAvailable?: boolean
  /** When false the preview is hidden — used with the Default tooth chart switch. */
  defaultToothChartEnabled?: boolean
  /** All 32 teeth with retention_option_id and/or extraction_id for API payload. */
  defaultToothChart?: ProductDefaultToothChartEntry[]
  onDefaultToothChartChange?: (entries: ProductDefaultToothChartEntry[]) => void
  /**
   * Show "Allow user to select only implant" when a linked retention option
   * resolves to Implant chart type.
   */
  showAllowSelectOnlyImplant?: boolean
  allowSelectOnlyImplant?: boolean
  onAllowSelectOnlyImplantChange?: (checked: boolean) => void
}

function getMaxTeethForCode(
  extractionCode: string,
  resolvedExtractions: ResolvedProductExtraction[],
): number | null {
  const match = resolvedExtractions.find((row) => row.code === extractionCode)
  const max = match?.max_teeth ?? null
  return max !== null && max > 0 ? max : null
}

function buildToothStatusOptions(resolvedExtractions: ResolvedProductExtraction[]): ToothStatusOption[] {
  return resolvedExtractions
    .filter((row) => row.status === "Active" && !isTimExtractionRow(row))
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    .map((row) => ({
      code: row.code,
      name: row.name,
      color: row.color ?? "#aaa",
      visibilityType: row.visibility_type,
      imagesByTooth: (row.images ?? []).reduce<Record<number, string | null>>((map, img) => {
        map[img.tooth_number] = img.image_url
        return map
      }, {}),
    }))
}

export function ProductToothChartPreview(props: ProductToothChartPreviewProps) {
  if (!props.defaultToothChartEnabled) {
    return null
  }
  return <ProductToothChartPreviewInner {...props} />
}

function ProductToothChartPreviewInner({
  retentionEnabled,
  extractionsEnabled,
  linkedRetentionOptionIds,
  retentionCatalog,
  productExtractions,
  allExtractions,
  isExtractionsLoading = false,
  fillAvailable = false,
  defaultToothChart = [],
  onDefaultToothChartChange,
  showAllowSelectOnlyImplant = false,
  allowSelectOnlyImplant = false,
  onAllowSelectOnlyImplantChange,
}: ProductToothChartPreviewProps) {
  const [maxillarySelectedTeeth, setMaxillarySelectedTeeth] = useState<number[]>([])
  const [mandibularSelectedTeeth, setMandibularSelectedTeeth] = useState<number[]>([])
  const [maxillaryRetention, setMaxillaryRetention] =
    useState<ArchRetentionState>(EMPTY_ARCH_RETENTION)
  const [mandibularRetention, setMandibularRetention] =
    useState<ArchRetentionState>(EMPTY_ARCH_RETENTION)
  const [maxillaryToothExtractionMap, setMaxillaryToothExtractionMap] = useState<
    Record<number, string>
  >({})
  const [mandibularToothExtractionMap, setMandibularToothExtractionMap] = useState<
    Record<number, string>
  >({})
  const [maxillaryClaspTeeth, setMaxillaryClaspTeeth] = useState<number[]>([])
  const [mandibularClaspTeeth, setMandibularClaspTeeth] = useState<number[]>([])
  /** Teeth explicitly cleared to TIM (teeth-in-mouth) — overrides catalog default extraction. */
  const [maxillaryTimOverrideTeeth, setMaxillaryTimOverrideTeeth] = useState<number[]>([])
  const [mandibularTimOverrideTeeth, setMandibularTimOverrideTeeth] = useState<number[]>([])
  const [retentionPopoverState, setRetentionPopoverState] = useState<ToothPopoverState>({
    arch: null,
    toothNumber: null,
  })
  const [toothStatusPopoverState, setToothStatusPopoverState] = useState<ToothPopoverState>({
    arch: null,
    toothNumber: null,
  })

  const baseRetentionOptions = useMemo(
    () =>
      buildProductRetentionOptions({
        retentionEnabled,
        linkedRetentionOptionIds,
        retentionCatalog,
      }),
    [retentionEnabled, linkedRetentionOptionIds, retentionCatalog],
  )

  const retentionToothImagesApiIds = useMemo(
    () => collectRetentionToothImagesApiIds(baseRetentionOptions),
    [baseRetentionOptions],
  )

  const retentionToothImageQueries = useQueries({
    queries: retentionToothImagesApiIds.map((apiId) => ({
      queryKey: retentionOptionToothImagesKeys.list(apiId),
      queryFn: async () => {
        const res = await getGlobalRetentionOptionToothImages(apiId)
        return (res.data?.images ?? []) as RetentionToothImageRow[]
      },
      enabled: retentionEnabled && apiId > 0,
      staleTime: 60_000,
    })),
  })

  const retentionOptions = useMemo(() => {
    const imagesByApiId = new Map<number, RetentionToothImageRow[]>()
    retentionToothImagesApiIds.forEach((apiId, index) => {
      const rows = retentionToothImageQueries[index]?.data
      if (rows?.length) {
        imagesByApiId.set(apiId, rows)
      }
    })
    return enrichRetentionOptionsWithToothImages(baseRetentionOptions, imagesByApiId)
  }, [baseRetentionOptions, retentionToothImagesApiIds, retentionToothImageQueries])

  const resolvedExtractions = useMemo(
    () =>
      extractionsEnabled
        ? resolveActiveProductExtractions(productExtractions, allExtractions)
        : [],
    [extractionsEnabled, productExtractions, allExtractions],
  )

  const extractionToothImagesApiIds = useMemo(
    () => collectExtractionToothImagesApiIds(resolvedExtractions, allExtractions),
    [resolvedExtractions, allExtractions],
  )

  const extractionToothImageQueries = useQueries({
    queries: extractionToothImagesApiIds.map((apiId) => ({
      queryKey: extractionsKeys.globalToothImages(apiId),
      queryFn: async () => {
        const res = await ExtractionsApi.getGlobalExtractionToothImages(apiId)
        return (res.data?.images ?? []) as RetentionToothImageRow[]
      },
      enabled: extractionsEnabled && apiId > 0,
      staleTime: 60_000,
    })),
  })

  const toothImagesByExtractionId = useMemo(() => {
    const base = buildProductPreviewToothImages(resolvedExtractions)
    const imagesByApiId = new Map<number, RetentionToothImageRow[]>()
    extractionToothImagesApiIds.forEach((apiId, index) => {
      const rows = extractionToothImageQueries[index]?.data
      if (rows?.length) {
        imagesByApiId.set(apiId, rows)
      }
    })
    return mergeExtractionToothImages(
      base,
      imagesByApiId,
      resolvedExtractions,
      allExtractions,
    )
  }, [
    resolvedExtractions,
    extractionToothImagesApiIds,
    extractionToothImageQueries,
    allExtractions,
  ])

  const extractionImagesByCode = useMemo(
    () =>
      buildProductExtractionImagesByCode(resolvedExtractions, toothImagesByExtractionId),
    [resolvedExtractions, toothImagesByExtractionId],
  )

  /** Default tooth chart owns baseline display — do not overlay catalog default extraction stamps. */
  const getCatalogDefaultExtractionMap = useCallback((_arch: PreviewArch) => ({}), [])

  const getInteractiveExtractionMap = useCallback(
    (arch: PreviewArch) =>
      buildInteractiveToothExtractionMap(
        arch,
        getCatalogDefaultExtractionMap(arch),
        arch === "maxillary" ? maxillaryToothExtractionMap : mandibularToothExtractionMap,
        arch === "maxillary" ? maxillaryTimOverrideTeeth : mandibularTimOverrideTeeth,
      ),
    [
      getCatalogDefaultExtractionMap,
      maxillaryToothExtractionMap,
      mandibularToothExtractionMap,
      maxillaryTimOverrideTeeth,
      mandibularTimOverrideTeeth,
    ],
  )

  const toothStatusOptions = useMemo(
    () => buildToothStatusOptions(resolvedExtractions),
    [resolvedExtractions],
  )

  const isSingleDefaultOnly = useMemo(
    () => isSingleDefaultOnlyExtractionList(resolvedExtractions),
    [resolvedExtractions],
  )

  const isHydratingDefaultChart = useRef(false)
  const lastEmittedDefaultChartSig = useRef("")

  const catalogDefaultExtractionId = useMemo(
    () => resolveCatalogDefaultExtractionId(resolvedExtractions),
    [resolvedExtractions],
  )

  const catalogDefaultExtractionAssignment = useMemo(
    () => resolveCatalogDefaultExtractionAssignment(resolvedExtractions),
    [resolvedExtractions],
  )

  /** Clear retention/overlays and put the Def extraction back on the tooth. */
  const restoreCatalogDefaultExtractionOnTooth = useCallback(
    (
      setExtractionMap: Dispatch<SetStateAction<Record<number, string>>>,
      setTimOverride: Dispatch<SetStateAction<number[]>>,
      toothNumber: number,
    ) => {
      const assignment = catalogDefaultExtractionAssignment
      if (assignment.kind === "code") {
        setTimOverride((prev) => prev.filter((t) => t !== toothNumber))
        setExtractionMap((prev) => ({ ...prev, [toothNumber]: assignment.code }))
        return
      }
      if (assignment.kind === "tim") {
        setExtractionMap((prev) => {
          if (!(toothNumber in prev)) return prev
          const { [toothNumber]: _, ...rest } = prev
          return rest
        })
        setTimOverride((prev) =>
          prev.includes(toothNumber) ? prev : [...prev, toothNumber],
        )
        return
      }
      setExtractionMap((prev) => {
        if (!(toothNumber in prev)) return prev
        const { [toothNumber]: _, ...rest } = prev
        return rest
      })
      setTimOverride((prev) => prev.filter((t) => t !== toothNumber))
    },
    [catalogDefaultExtractionAssignment],
  )

  const defaultChartSignature = useMemo(
    () => defaultToothChartSignature(defaultToothChart),
    [defaultToothChart],
  )

  // --- Load-sequence guard ---------------------------------------------------
  // Reopening a saved product hydrates the chart from `defaultToothChart`, but
  // that parse needs the extraction catalog to resolve each saved extraction_id
  // back to its code (e.g. Missing teeth). If the catalog is still loading, the
  // parse silently drops those teeth and they render as "teeth in mouth" — and
  // the emit effect can then persist that wrong state. So we gate hydration/emit
  // behind a loader until the catalog has loaded, then settle for 2s to make
  // sure every dependency is in place before applying the saved selection.
  const [isChartReady, setIsChartReady] = useState(false)
  const [extractionsLoadCompleted, setExtractionsLoadCompleted] = useState(false)
  const hasEverBeenNotReady = useRef(false)
  const prevExtractionsLoading = useRef(isExtractionsLoading)

  useEffect(() => {
    if (prevExtractionsLoading.current && !isExtractionsLoading) {
      setExtractionsLoadCompleted(true)
    }
    prevExtractionsLoading.current = isExtractionsLoading
  }, [isExtractionsLoading])

  const extractionsCatalogReady =
    !extractionsEnabled ||
    (!isExtractionsLoading && (allExtractions.length > 0 || extractionsLoadCompleted))

  useEffect(() => {
    if (!extractionsCatalogReady) {
      hasEverBeenNotReady.current = true
      setIsChartReady(false)
      return
    }
    // Catalog was ready immediately (cached / new product) — no race to guard.
    if (!hasEverBeenNotReady.current) {
      setIsChartReady(true)
      return
    }
    const timer = setTimeout(() => setIsChartReady(true), 2000)
    return () => clearTimeout(timer)
  }, [extractionsCatalogReady])

  useEffect(() => {
    if (!isChartReady) return
    isHydratingDefaultChart.current = true
    lastEmittedDefaultChartSig.current = defaultChartSignature
    const parsed = parseDefaultToothChartToPreviewState(
      defaultToothChart,
      resolvedExtractions,
    )
    setMaxillarySelectedTeeth([])
    setMandibularSelectedTeeth([])
    setMaxillaryRetention(parsed.maxillaryRetention)
    setMandibularRetention(parsed.mandibularRetention)
    setMaxillaryToothExtractionMap(parsed.maxillaryToothExtractionMap)
    setMandibularToothExtractionMap(parsed.mandibularToothExtractionMap)
    setMaxillaryClaspTeeth(parsed.maxillaryClaspTeeth)
    setMandibularClaspTeeth(parsed.mandibularClaspTeeth)
    setMaxillaryTimOverrideTeeth(parsed.maxillaryTimOverrideTeeth)
    setMandibularTimOverrideTeeth(parsed.mandibularTimOverrideTeeth)
    setRetentionPopoverState({ arch: null, toothNumber: null })
    setToothStatusPopoverState({ arch: null, toothNumber: null })
    queueMicrotask(() => {
      isHydratingDefaultChart.current = false
    })
  }, [isChartReady, defaultChartSignature, resolvedExtractions, defaultToothChart])

  useEffect(() => {
    if (!isChartReady || !onDefaultToothChartChange || isHydratingDefaultChart.current) return
    const entries = buildDefaultToothChartFromPreviewState(
      {
        maxillaryRetention,
        mandibularRetention,
        maxillaryToothExtractionMap,
        mandibularToothExtractionMap,
        maxillaryClaspTeeth,
        mandibularClaspTeeth,
        maxillaryTimOverrideTeeth,
        mandibularTimOverrideTeeth,
      },
      resolvedExtractions,
      catalogDefaultExtractionId,
    )
    const sig = defaultToothChartSignature(entries)
    if (sig === lastEmittedDefaultChartSig.current) return
    lastEmittedDefaultChartSig.current = sig
    onDefaultToothChartChange(entries)
  }, [
    onDefaultToothChartChange,
    maxillaryRetention,
    mandibularRetention,
    maxillaryToothExtractionMap,
    mandibularToothExtractionMap,
    maxillaryClaspTeeth,
    mandibularClaspTeeth,
    maxillaryTimOverrideTeeth,
    mandibularTimOverrideTeeth,
    resolvedExtractions,
    catalogDefaultExtractionId,
    isChartReady,
  ])

  const useExtractionOnlyPopover = extractionsEnabled && !retentionEnabled
  const useCombinedPopover = retentionEnabled && extractionsEnabled
  const useRetentionPopover = retentionEnabled && (!extractionsEnabled || useCombinedPopover)

  const chartInteractive =
    (retentionEnabled && retentionOptions.length > 0) ||
    (extractionsEnabled && !isSingleDefaultOnly)

  const staticExtractionPopoverOptions = useMemo(
    () => buildProductExtractionPopoverOptions(resolvedExtractions, toothImagesByExtractionId),
    [resolvedExtractions, toothImagesByExtractionId],
  )

  const getExtractionPopoverOptionsForTooth = useCallback(
    (toothNumber: number) =>
      buildProductExtractionPopoverOptionsForTooth(
        resolvedExtractions,
        toothImagesByExtractionId,
        toothNumber,
      ),
    [resolvedExtractions, toothImagesByExtractionId],
  )

  const extractionsByCode = useMemo(() => {
    if (!extractionsEnabled) return {}
    const catalog = buildProductExtractionCatalog(
      resolvedExtractions,
      toothImagesByExtractionId,
    )
    const result: Record<
      string,
      {
        code: string
        name: string
        visibility_type: string
        color: string | null
        overlay?: string
      }
    > = {}
    for (const row of catalog) {
      if (String(row.status ?? "Active").trim().toLowerCase() === "inactive") continue
      if (!row.code) continue
      const hasImageCatalog =
        (row.images?.length ?? 0) > 0 ||
        (row.image_url != null && String(row.image_url).trim() !== "")
      result[row.code] = {
        code: row.code,
        name: row.name,
        visibility_type:
          row.visibility_type ??
          (hasImageCatalog || isTimExtractionRow(row) ? "Image" : "Color"),
        color: row.color ?? null,
        overlay: row.overlay,
      }
    }
    return result
  }, [extractionsEnabled, resolvedExtractions, toothImagesByExtractionId])

  const getChartToothExtractionMap = useCallback(
    (arch: PreviewArch) => {
      const retention =
        arch === "maxillary" ? maxillaryRetention : mandibularRetention
      return buildChartToothExtractionMap(
        getInteractiveExtractionMap(arch),
        retention.typesByTooth,
      )
    },
    [
      getInteractiveExtractionMap,
      maxillaryRetention,
      mandibularRetention,
    ],
  )
  const getMergedClaspTeeth = useCallback(
    (arch: PreviewArch) =>
      arch === "maxillary" ? maxillaryClaspTeeth : mandibularClaspTeeth,
    [maxillaryClaspTeeth, mandibularClaspTeeth],
  )

  /**
   * Always return the full linked retention catalog for each tooth.
   * Narrowing to the selected option hid Pontic/Prep/etc. when reopening the
   * popover on a tooth that already had Implant (or any other type) selected.
   * Chart image resolution uses `retentionOptionIdByTooth` separately.
   */
  const getRetentionOptionsForTooth = useCallback(
    (_arch: PreviewArch, _toothNumber: number, options: RetentionOptionItem[]) => options,
    [],
  )

  const getChartStatusTeeth = useCallback(
    (arch: PreviewArch) =>
      chartStatusTeethFromExtractionDisplay({
        toothExtractionMap: getChartToothExtractionMap(arch),
        extractionsByCode,
        extractionImagesByCode,
        claspTeeth: getMergedClaspTeeth(arch),
      }),
    [
      getChartToothExtractionMap,
      extractionsByCode,
      extractionImagesByCode,
      getMergedClaspTeeth,
    ],
  )

  const closePopovers = useCallback(() => {
    setRetentionPopoverState({ arch: null, toothNumber: null })
    setToothStatusPopoverState({ arch: null, toothNumber: null })
  }, [])

  const handleToothClick = useCallback(
    (arch: PreviewArch, toothNumber: number) => {
      if (!chartInteractive) return

      const setSelectedTeeth =
        arch === "maxillary" ? setMaxillarySelectedTeeth : setMandibularSelectedTeeth

      setSelectedTeeth((prev) =>
        prev.includes(toothNumber) ? prev : [...prev, toothNumber],
      )

      if (useRetentionPopover) {
        setRetentionPopoverState({ arch, toothNumber })
        setToothStatusPopoverState({ arch: null, toothNumber: null })
        return
      }

      if (useExtractionOnlyPopover && toothStatusOptions.length > 0) {
        setToothStatusPopoverState({ arch, toothNumber })
        setRetentionPopoverState({ arch: null, toothNumber: null })
      }
    },
    [
      chartInteractive,
      useRetentionPopover,
      useExtractionOnlyPopover,
      toothStatusOptions.length,
    ],
  )

  const handleSelectRetentionOption = useCallback(
    (
      arch: PreviewArch,
      toothNumber: number,
      optionId: number,
      type: RetentionChartType,
    ) => {
      const setRetention =
        arch === "maxillary" ? setMaxillaryRetention : setMandibularRetention
      const setExt =
        arch === "maxillary" ? setMaxillaryToothExtractionMap : setMandibularToothExtractionMap
      const setTimOverride =
        arch === "maxillary" ? setMaxillaryTimOverrideTeeth : setMandibularTimOverrideTeeth

      setRetention((prev) => {
        const { types, ids } = applyProductRetentionSelection(
          prev.typesByTooth,
          prev.optionIdByTooth,
          toothNumber,
          optionId,
          type,
        )
        return { typesByTooth: types, optionIdByTooth: ids }
      })

      // Slip parity: retention clears any user extraction override on this tooth.
      setExt((prev) => {
        if (!(toothNumber in prev)) return prev
        const { [toothNumber]: _removed, ...rest } = prev
        return rest
      })
      setTimOverride((prev) => prev.filter((t) => t !== toothNumber))

      closePopovers()
    },
    [closePopovers],
  )

  const handleToothDeselect = useCallback(
    (arch: PreviewArch, toothNumber: number) => {
      const setSelectedTeeth =
        arch === "maxillary" ? setMaxillarySelectedTeeth : setMandibularSelectedTeeth
      const setRetention =
        arch === "maxillary" ? setMaxillaryRetention : setMandibularRetention
      const setExtractionMap =
        arch === "maxillary" ? setMaxillaryToothExtractionMap : setMandibularToothExtractionMap
      const setClaspTeeth = arch === "maxillary" ? setMaxillaryClaspTeeth : setMandibularClaspTeeth
      const setTimOverride =
        arch === "maxillary" ? setMaxillaryTimOverrideTeeth : setMandibularTimOverrideTeeth

      setSelectedTeeth((prev) => prev.filter((t) => t !== toothNumber))
      setRetention((prev) => clearRetentionOnTooth(prev, toothNumber))
      setClaspTeeth((prev) => prev.filter((t) => t !== toothNumber))
      // Product default chart: Remove always restores Def extraction (never leave blank).
      restoreCatalogDefaultExtractionOnTooth(setExtractionMap, setTimOverride, toothNumber)
      closePopovers()
    },
    [closePopovers, restoreCatalogDefaultExtractionOnTooth],
  )

  const handleExtractionToggle = useCallback(
    (arch: PreviewArch, toothNumber: number, extractionCode: string) => {
      const displayMap = getInteractiveExtractionMap(arch)

      if (isOverlayExtractionCode(extractionCode, resolvedExtractions)) {
        const setClaspTeeth = arch === "maxillary" ? setMaxillaryClaspTeeth : setMandibularClaspTeeth
        setClaspTeeth((prev) => {
          if (prev.includes(toothNumber)) {
            return prev.filter((t) => t !== toothNumber)
          }
          if (!toothHasTimBaseExtraction(toothNumber, displayMap, resolvedExtractions)) {
            return prev
          }
          const maxTeeth = getMaxTeethForCode(extractionCode, resolvedExtractions)
          if (maxTeeth !== null && prev.length >= maxTeeth) {
            return prev
          }
          return [...prev, toothNumber]
        })
        closePopovers()
        return
      }

      const setExtractionMap =
        arch === "maxillary" ? setMaxillaryToothExtractionMap : setMandibularToothExtractionMap
      const setClaspTeeth = arch === "maxillary" ? setMaxillaryClaspTeeth : setMandibularClaspTeeth
      const setRetention =
        arch === "maxillary" ? setMaxillaryRetention : setMandibularRetention
      const setTimOverride =
        arch === "maxillary" ? setMaxillaryTimOverrideTeeth : setMandibularTimOverrideTeeth

      const displayedCode = displayMap[toothNumber]

      if (displayedCode === extractionCode) {
        setClaspTeeth((c) => c.filter((t) => t !== toothNumber))
        // Clearing an extraction returns the tooth to catalog Def (Missing, TIM, etc.).
        restoreCatalogDefaultExtractionOnTooth(setExtractionMap, setTimOverride, toothNumber)
        closePopovers()
        return
      }

      setExtractionMap((prev) => {
        const maxTeeth = getMaxTeethForCode(extractionCode, resolvedExtractions)
        const currentCount = Object.values({ ...displayMap, ...prev }).filter(
          (code) => code === extractionCode,
        ).length
        if (maxTeeth !== null && currentCount >= maxTeeth && displayedCode !== extractionCode) {
          return prev
        }

        setClaspTeeth((c) => c.filter((t) => t !== toothNumber))
        setRetention((ret) => clearRetentionOnTooth(ret, toothNumber))
        setTimOverride((tim) => tim.filter((t) => t !== toothNumber))
        return { ...prev, [toothNumber]: extractionCode }
      })

      closePopovers()
    },
    [
      closePopovers,
      getInteractiveExtractionMap,
      resolvedExtractions,
      restoreCatalogDefaultExtractionOnTooth,
    ],
  )

  const handleCombinedSelectExtraction = useCallback(
    (arch: PreviewArch, toothNumber: number, extractionCode: string) => {
      const retention =
        arch === "maxillary" ? maxillaryRetention : mandibularRetention
      if (retention.typesByTooth[toothNumber]?.length) {
        const setRetention =
          arch === "maxillary" ? setMaxillaryRetention : setMandibularRetention
        setRetention((prev) => clearRetentionOnTooth(prev, toothNumber))
      }
      handleExtractionToggle(arch, toothNumber, extractionCode)
    },
    [handleExtractionToggle, maxillaryRetention, mandibularRetention],
  )

  const handleSelectToothStatus = useCallback(
    (arch: PreviewArch, toothNumber: number, code: string) => {
      const setRetention =
        arch === "maxillary" ? setMaxillaryRetention : setMandibularRetention
      setRetention((prev) => clearRetentionOnTooth(prev, toothNumber))
      handleExtractionToggle(arch, toothNumber, code)
    },
    [handleExtractionToggle],
  )

  // Pontic is always shown in product default-chart popovers (hardcoded in product SVG
  // charts). Slip / case-design still gates Pontic behind Prep/Implant abutments.
  const sharedCatalogProps = {
    className: "w-full",
    disabled: !chartInteractive,
  }

  const helperText = (() => {
    const defaultExtraction = resolvedExtractions.find((row) => row.is_default === "Yes")
    const defaultLabel = defaultExtraction?.name ?? "the default extraction"

    if (isSingleDefaultOnly && defaultExtraction) {
      return `Configure each tooth below. Unselected teeth use ${defaultLabel} (from the Def column).`
    }
    if (isSingleDefaultOnly) {
      return "Configure each tooth below. Unselected teeth use the extraction marked Def."
    }
    if (!chartInteractive) {
      return "Enable retention or extractions to configure the default tooth chart."
    }
    if (useCombinedPopover) {
      return "Click teeth to set default retention or extraction for all 32 teeth (saved with the product)."
    }
    if (useExtractionOnlyPopover) {
      return "Click teeth to set the default extraction status for each tooth."
    }
    return "Click teeth to set the default retention option for each tooth."
  })()

  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200 bg-muted/10 p-3 flex flex-col min-h-[320px]",
        fillAvailable && "xl:min-h-[420px]",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-gray-900">Default tooth chart</h4>
          <p className="text-xs text-muted-foreground mt-1">{helperText}</p>
        </div>
        {showAllowSelectOnlyImplant ? (
          <label className="flex items-start gap-1.5 shrink-0 cursor-pointer max-w-[11rem]">
            <input
              type="checkbox"
              checked={allowSelectOnlyImplant}
              onChange={(e) => onAllowSelectOnlyImplantChange?.(e.target.checked)}
              className="accent-[#1162a8] mt-0.5 shrink-0 w-4 h-4"
            />
            <span className="text-xs leading-snug text-gray-900">
              Allow user to select only implant
            </span>
          </label>
        ) : null}
      </div>

      <div className="space-y-3 overflow-y-auto overflow-x-hidden flex-1 min-h-0 pr-1">
        {!isChartReady ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-muted-foreground min-h-[240px]">
            <Loader2 className="h-8 w-8 animate-spin text-[#1162a8]" />
            <p className="text-xs">Loading saved tooth chart…</p>
          </div>
        ) : (
          <>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
            Upper (1–16)
          </p>
          <ProductMaxillaryTeethSVG
            {...sharedCatalogProps}
            extractionsByCode={extractionsByCode}
            extractionImagesByCode={extractionImagesByCode}
            selectedTeeth={maxillarySelectedTeeth}
            retentionTypesByTooth={retentionEnabled ? maxillaryRetention.typesByTooth : {}}
            retentionOptionIdByTooth={
              retentionEnabled ? maxillaryRetention.optionIdByTooth : undefined
            }
            retentionOptions={retentionEnabled ? retentionOptions : undefined}
            getRetentionOptionsForTooth={(toothNumber) =>
              getRetentionOptionsForTooth("maxillary", toothNumber, retentionOptions)
            }
            toothExtractionMap={getChartToothExtractionMap("maxillary")}
            claspTeeth={getMergedClaspTeeth("maxillary")}
            missingTeeth={getChartStatusTeeth("maxillary").missingTeeth}
            willExtractTeeth={getChartStatusTeeth("maxillary").willExtractTeeth}
            showRetentionPopover={
              useRetentionPopover && retentionPopoverState.arch === "maxillary"
            }
            retentionPopoverTooth={
              retentionPopoverState.arch === "maxillary" ? retentionPopoverState.toothNumber : null
            }
            onSelectRetentionOption={
              useRetentionPopover
                ? (toothNumber, optionId, type) =>
                    handleSelectRetentionOption("maxillary", toothNumber, optionId, type)
                : undefined
            }
            retentionPopoverExtractionOptions={
              useCombinedPopover ? staticExtractionPopoverOptions : undefined
            }
            getRetentionPopoverExtractionOptionsForTooth={
              useCombinedPopover ? getExtractionPopoverOptionsForTooth : undefined
            }
            onSelectExtractionStatus={
              useCombinedPopover
                ? (toothNumber, code) =>
                    handleCombinedSelectExtraction("maxillary", toothNumber, code)
                : undefined
            }
            showToothStatusPopover={
              useExtractionOnlyPopover &&
              toothStatusPopoverState.arch === "maxillary" &&
              toothStatusOptions.length > 0
            }
            toothStatusPopoverTooth={
              toothStatusPopoverState.arch === "maxillary"
                ? toothStatusPopoverState.toothNumber
                : null
            }
            toothStatusOptions={toothStatusOptions}
            toothStatusByTooth={getChartToothExtractionMap("maxillary")}
            onSelectToothStatus={(toothNumber, code) =>
              handleSelectToothStatus("maxillary", toothNumber, code)
            }
            onRemoveToothStatus={(toothNumber) => handleToothDeselect("maxillary", toothNumber)}
            onCloseToothStatusPopover={closePopovers}
            onClosePopover={closePopovers}
            onDeselectTooth={(toothNumber) => handleToothDeselect("maxillary", toothNumber)}
            onToothClick={(toothNumber) => handleToothClick("maxillary", toothNumber)}
            hideSelectionIndicators={useExtractionOnlyPopover || isSingleDefaultOnly}
          />
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
            Lower (17–32)
          </p>
          <ProductMandibularTeethSVG
            {...sharedCatalogProps}
            extractionsByCode={extractionsByCode}
            extractionImagesByCode={extractionImagesByCode}
            selectedTeeth={mandibularSelectedTeeth}
            retentionTypesByTooth={retentionEnabled ? mandibularRetention.typesByTooth : {}}
            retentionOptionIdByTooth={
              retentionEnabled ? mandibularRetention.optionIdByTooth : undefined
            }
            retentionOptions={retentionEnabled ? retentionOptions : undefined}
            getRetentionOptionsForTooth={(toothNumber) =>
              getRetentionOptionsForTooth("mandibular", toothNumber, retentionOptions)
            }
            toothExtractionMap={getChartToothExtractionMap("mandibular")}
            claspTeeth={getMergedClaspTeeth("mandibular")}
            missingTeeth={getChartStatusTeeth("mandibular").missingTeeth}
            willExtractTeeth={getChartStatusTeeth("mandibular").willExtractTeeth}
            showRetentionPopover={
              useRetentionPopover && retentionPopoverState.arch === "mandibular"
            }
            retentionPopoverTooth={
              retentionPopoverState.arch === "mandibular" ? retentionPopoverState.toothNumber : null
            }
            onSelectRetentionOption={
              useRetentionPopover
                ? (toothNumber, optionId, type) =>
                    handleSelectRetentionOption("mandibular", toothNumber, optionId, type)
                : undefined
            }
            retentionPopoverExtractionOptions={
              useCombinedPopover ? staticExtractionPopoverOptions : undefined
            }
            getRetentionPopoverExtractionOptionsForTooth={
              useCombinedPopover ? getExtractionPopoverOptionsForTooth : undefined
            }
            onSelectExtractionStatus={
              useCombinedPopover
                ? (toothNumber, code) =>
                    handleCombinedSelectExtraction("mandibular", toothNumber, code)
                : undefined
            }
            showToothStatusPopover={
              useExtractionOnlyPopover &&
              toothStatusPopoverState.arch === "mandibular" &&
              toothStatusOptions.length > 0
            }
            toothStatusPopoverTooth={
              toothStatusPopoverState.arch === "mandibular"
                ? toothStatusPopoverState.toothNumber
                : null
            }
            toothStatusOptions={toothStatusOptions}
            toothStatusByTooth={getChartToothExtractionMap("mandibular")}
            onSelectToothStatus={(toothNumber, code) =>
              handleSelectToothStatus("mandibular", toothNumber, code)
            }
            onRemoveToothStatus={(toothNumber) => handleToothDeselect("mandibular", toothNumber)}
            onCloseToothStatusPopover={closePopovers}
            onClosePopover={closePopovers}
            onDeselectTooth={(toothNumber) => handleToothDeselect("mandibular", toothNumber)}
            onToothClick={(toothNumber) => handleToothClick("mandibular", toothNumber)}
            hideSelectionIndicators={useExtractionOnlyPopover || isSingleDefaultOnly}
          />
        </div>
          </>
        )}
      </div>
    </div>
  )
}
