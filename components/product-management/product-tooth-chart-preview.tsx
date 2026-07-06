"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useQueries } from "@tanstack/react-query"
import type { ToothStatusOption } from "@/components/tooth-status-popover"
import { ProductMaxillaryTeethSVG } from "@/components/product-management/product-tooth-chart/product-maxillary-teeth-svg"
import { ProductMandibularTeethSVG } from "@/components/product-management/product-tooth-chart/product-mandibular-teeth-svg"
import {
  isOverlayExtractionCode,
  isSingleDefaultOnlyExtractionList,
  isTimExtractionRow,
  shouldAutoSelectArchForDefaultExtraction,
  toothHasTimBaseExtraction,
} from "@/components/case-design-center/utils/extractionHelpers"
import {
  getChartTeethForArch,
} from "@/components/case-design-center/utils/retentionChartImage"
import type { RetentionChartType } from "@/components/case-design-center/utils/retentionOptionChartType"
import type { Extraction } from "@/lib/schemas"
import { chartStatusTeethFromExtractionDisplay } from "@/lib/virtual-slip-extraction-display"
import {
  applyProductRetentionSelection,
  buildChartToothExtractionMap,
  buildInteractiveToothExtractionMap,
  buildProductConfigChartPreview,
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
  fillAvailable?: boolean
  /** When false the preview is hidden — used with the Default tooth chart switch. */
  defaultToothChartEnabled?: boolean
  /** All 32 teeth with retention_option_id and/or extraction_id for API payload. */
  defaultToothChart?: ProductDefaultToothChartEntry[]
  onDefaultToothChartChange?: (entries: ProductDefaultToothChartEntry[]) => void
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
  fillAvailable = false,
  defaultToothChart = [],
  onDefaultToothChartChange,
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

  const configPreview = useMemo(
    () =>
      buildProductConfigChartPreview({
        retentionEnabled,
        extractionsEnabled,
        linkedRetentionOptionIds,
        retentionCatalog,
        productExtractions,
        allExtractions,
        toothImagesByExtractionId,
      }),
    [
      retentionEnabled,
      extractionsEnabled,
      linkedRetentionOptionIds,
      retentionCatalog,
      productExtractions,
      allExtractions,
      toothImagesByExtractionId,
    ],
  )

  const extractionImagesByCode = useMemo(() => {
    const base = buildProductExtractionImagesByCode(
      resolvedExtractions,
      toothImagesByExtractionId,
    )
    const merged = { ...base }
    for (const arch of [configPreview.maxillary, configPreview.mandibular]) {
      for (const [code, byTooth] of Object.entries(arch.extractionImagesByCode)) {
        merged[code] = { ...(merged[code] ?? {}), ...byTooth }
      }
    }
    return merged
  }, [resolvedExtractions, toothImagesByExtractionId, configPreview])

  const getCatalogDefaultExtractionMap = useCallback(
    (arch: PreviewArch) =>
      arch === "maxillary"
        ? configPreview.maxillary.toothExtractionMap
        : configPreview.mandibular.toothExtractionMap,
    [configPreview.maxillary.toothExtractionMap, configPreview.mandibular.toothExtractionMap],
  )

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

  const previewConfigKey = useMemo(() => {
    const extKey = resolvedExtractions
      .map((row) => `${row.extraction_id}:${row.is_default ?? "No"}:${row.max_teeth ?? ""}`)
      .join("|")
    const retKey = [...linkedRetentionOptionIds].sort((a, b) => a - b).join(",")
    return `${retentionEnabled}:${extractionsEnabled}:${extKey}:${retKey}`
  }, [resolvedExtractions, linkedRetentionOptionIds, retentionEnabled, extractionsEnabled])

  const hasAutoSelectedDefaultArch = useRef(false)
  const isHydratingDefaultChart = useRef(false)
  const lastEmittedDefaultChartSig = useRef("")

  const catalogDefaultExtractionId = useMemo(
    () => resolveCatalogDefaultExtractionId(resolvedExtractions),
    [resolvedExtractions],
  )

  const defaultChartSignature = useMemo(
    () => defaultToothChartSignature(defaultToothChart),
    [defaultToothChart],
  )

  useEffect(() => {
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
  }, [defaultChartSignature, resolvedExtractions, defaultToothChart])

  useEffect(() => {
    if (!onDefaultToothChartChange || isHydratingDefaultChart.current) return
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
  ])

  useEffect(() => {
    hasAutoSelectedDefaultArch.current = false
  }, [previewConfigKey])

  useEffect(() => {
    if (!extractionsEnabled || isSingleDefaultOnly) return
    if (retentionEnabled) return
    if (!shouldAutoSelectArchForDefaultExtraction(resolvedExtractions)) return
    if (hasAutoSelectedDefaultArch.current) return
    hasAutoSelectedDefaultArch.current = true
    setMaxillarySelectedTeeth(getChartTeethForArch("maxillary"))
    setMandibularSelectedTeeth(getChartTeethForArch("mandibular"))
  }, [extractionsEnabled, isSingleDefaultOnly, retentionEnabled, resolvedExtractions, previewConfigKey])

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

  const extractionsByCode = useMemo(
    () => ({
      ...configPreview.maxillary.extractionsByCode,
      ...configPreview.mandibular.extractionsByCode,
    }),
    [configPreview.maxillary.extractionsByCode, configPreview.mandibular.extractionsByCode],
  )

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
      arch === "maxillary"
        ? [...new Set([...configPreview.maxillary.claspTeeth, ...maxillaryClaspTeeth])]
        : [...new Set([...configPreview.mandibular.claspTeeth, ...mandibularClaspTeeth])],
    [
      configPreview.maxillary.claspTeeth,
      configPreview.mandibular.claspTeeth,
      maxillaryClaspTeeth,
      mandibularClaspTeeth,
    ],
  )

  const getRetentionOptionsForTooth = useCallback(
    (arch: PreviewArch, toothNumber: number, options: RetentionOptionItem[]) => {
      const optionId =
        arch === "maxillary"
          ? maxillaryRetention.optionIdByTooth[toothNumber]
          : mandibularRetention.optionIdByTooth[toothNumber]
      if (optionId) {
        const match = options.find((opt) => Number(opt.id) === Number(optionId))
        if (match) return [match]
      }
      return options
    },
    [maxillaryRetention.optionIdByTooth, mandibularRetention.optionIdByTooth],
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
      setExtractionMap((prev) => {
        const { [toothNumber]: _, ...rest } = prev
        return rest
      })
      setTimOverride((prev) => prev.filter((t) => t !== toothNumber))
      setClaspTeeth((prev) => prev.filter((t) => t !== toothNumber))
      closePopovers()
    },
    [closePopovers],
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

      setExtractionMap((prev) => {
        if (displayedCode === extractionCode) {
          setClaspTeeth((c) => c.filter((t) => t !== toothNumber))
          if (prev[toothNumber] === extractionCode) {
            const { [toothNumber]: _, ...rest } = prev
            return rest
          }
          setTimOverride((tim) =>
            tim.includes(toothNumber) ? tim : [...tim, toothNumber],
          )
          return prev
        }

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
    [closePopovers, getInteractiveExtractionMap, resolvedExtractions],
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

  const canSelectMaxillaryPontic = useCallback(
    (toothNumber: number) =>
      Object.entries(maxillaryRetention.typesByTooth).some(
        ([tooth, types]) =>
          Number(tooth) !== toothNumber && (types.includes("Prep") || types.includes("Implant")),
      ),
    [maxillaryRetention.typesByTooth],
  )

  const canSelectMandibularPontic = useCallback(
    (toothNumber: number) =>
      Object.entries(mandibularRetention.typesByTooth).some(
        ([tooth, types]) =>
          Number(tooth) !== toothNumber && (types.includes("Prep") || types.includes("Implant")),
      ),
    [mandibularRetention.typesByTooth],
  )

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
      <div className="mb-3">
        <h4 className="text-sm font-medium text-gray-900">Default tooth chart</h4>
        <p className="text-xs text-muted-foreground mt-1">{helperText}</p>
      </div>

      <div className="space-y-3 overflow-y-auto overflow-x-hidden flex-1 min-h-0 pr-1">
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
            canSelectPontic={canSelectMaxillaryPontic}
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
            canSelectPontic={canSelectMandibularPontic}
            hideSelectionIndicators={useExtractionOnlyPopover || isSingleDefaultOnly}
          />
        </div>
      </div>
    </div>
  )
}
