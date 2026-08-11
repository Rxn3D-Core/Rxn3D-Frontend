"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { jsPDF } from "jspdf"
import { Check, ChevronLeft, Download, Loader2, Plus, Printer, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CUSTOM_LABEL_ID,
  PAPER_OPTIONS,
  ROLL_SIZES,
  SHEET_TEMPLATES,
  autoColsRows,
  cellOrigin,
  formatSizeLabel,
  getPaper,
  getTemplate,
  labelFitsPage,
  rollGeometry,
  sheetGeometry,
  type MediaId,
} from "@/lib/driver-labels/label-layout"
import {
  generateDriverLabelPdf,
  printPdfDoc,
  type DriverLabelSlip,
} from "@/lib/driver-labels/generate-driver-label-pdf"

type PrintMode = "sheet" | "roll"

interface DriverLabelSheetModalProps {
  isOpen: boolean
  onClose: () => void
  slips: DriverLabelSlip[]
  loading?: boolean
}

const FRAME_W = 340 // px width of the sheet-preview frame

const chunk = <T,>(arr: T[], size: number): T[][] => {
  if (size <= 0) return [arr]
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export default function DriverLabelSheetModal({
  isOpen,
  onClose,
  slips,
  loading = false,
}: DriverLabelSheetModalProps) {
  const [mode, setMode] = useState<PrintMode>("sheet")
  const [paperId, setPaperId] = useState<MediaId>("letter")
  const [labelPresetId, setLabelPresetId] = useState<string>("4x2.5")
  const [customW, setCustomW] = useState("4")
  const [customH, setCustomH] = useState("2.5")
  const [forcedCols, setForcedCols] = useState<string>("auto")

  const [pages, setPages] = useState<(number | null)[][]>([[]])
  const [activePage, setActivePage] = useState(0)

  const [step, setStep] = useState<"layout" | "preview">("layout")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const previewDoc = useRef<jsPDF | null>(null)

  const paper = getPaper(paperId)
  const isCustom = labelPresetId === CUSTOM_LABEL_ID

  const { w, h } = useMemo(() => {
    if (isCustom) {
      return { w: Number.parseFloat(customW) || 0, h: Number.parseFloat(customH) || 0 }
    }
    if (mode === "roll") {
      const r = ROLL_SIZES.find((s) => s.id === labelPresetId)
      return { w: r?.widthIn ?? 0, h: r?.heightIn ?? 0 }
    }
    const t = getTemplate(labelPresetId)
    return { w: t?.widthIn ?? 0, h: t?.heightIn ?? 0 }
  }, [isCustom, mode, labelPresetId, customW, customH])

  const dimsValid = w > 0 && h > 0

  const geo = useMemo(() => {
    if (!dimsValid) return null
    if (mode === "roll") return rollGeometry(w, h)
    if (isCustom) {
      const { cols, rows } = autoColsRows(paper, w, h, forcedCols === "auto" ? undefined : Number(forcedCols))
      return sheetGeometry(paper, w, h, cols, rows)
    }
    const t = getTemplate(labelPresetId)
    return sheetGeometry(paper, w, h, t?.cols ?? 2, t?.rows ?? 1)
  }, [dimsValid, mode, isCustom, paper, w, h, forcedCols, labelPresetId])

  const fits = geo ? labelFitsPage(geo) : false
  const cellsPerPage = geo?.cellsPerPage ?? 0

  const slipById = useMemo(() => {
    const m = new Map<number, DriverLabelSlip>()
    for (const s of slips) m.set(s.slip_id, s)
    return m
  }, [slips])
  const slipsKey = useMemo(() => slips.map((s) => s.slip_id).join(","), [slips])

  // Reset placement whenever the target, size, or slip set changes.
  useEffect(() => {
    setPages([Array(Math.max(cellsPerPage, 0)).fill(null)])
    setActivePage(0)
    setStep("layout")
  }, [isOpen, mode, paperId, labelPresetId, customW, customH, forcedCols, slipsKey, cellsPerPage])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const placedIds = useMemo(() => {
    const s = new Set<number>()
    for (const page of pages) for (const id of page) if (id != null) s.add(id)
    return s
  }, [pages])
  const unplaced = useMemo(() => slips.filter((s) => !placedIds.has(s.slip_id)), [slips, placedIds])
  const placedCount = placedIds.size
  const total = slips.length
  const allPlaced = total > 0 && placedCount === total

  const swapPreview = (doc: jsPDF | null, url: string | null) => {
    setPreviewUrl((prev) => {
      if (prev && prev !== url) URL.revokeObjectURL(prev)
      return url
    })
    previewDoc.current = doc
  }

  const buildRollPayload = (): (DriverLabelSlip | null)[][] => slips.map((s) => [s])
  const buildSheetPayload = (): (DriverLabelSlip | null)[][] =>
    pages.map((row) => row.map((id) => (id == null ? null : slipById.get(id) ?? null)))

  const generateFromPayload = async (payload: (DriverLabelSlip | null)[][]) => {
    if (!geo) return
    setGenerating(true)
    try {
      const doc = await generateDriverLabelPdf(payload, geo)
      swapPreview(doc, doc.output("bloburl") as unknown as string)
      setStep("preview")
    } catch (err) {
      console.error("Failed to generate driver labels PDF", err)
      alert("Failed to generate the labels PDF.")
    } finally {
      setGenerating(false)
    }
  }

  // Auto-fill every slip in order across as many pages as needed, then generate.
  const handleRegularPrint = async () => {
    if (!geo || total === 0) return
    const nextPages = chunk(slips.map((s) => s.slip_id), cellsPerPage).map((ids) => {
      const row: (number | null)[] = Array(cellsPerPage).fill(null)
      ids.forEach((id, i) => (row[i] = id))
      return row
    })
    const filled = nextPages.length ? nextPages : [Array(cellsPerPage).fill(null)]
    setPages(filled)
    await generateFromPayload(
      filled.map((row) => row.map((id) => (id == null ? null : slipById.get(id) ?? null)))
    )
  }

  const handleGeneratePrint = async () => {
    await generateFromPayload(mode === "roll" ? buildRollPayload() : buildSheetPayload())
  }

  const toggleCell = (pageIdx: number, cellIdx: number) => {
    setPages((prev) => {
      const next = prev.map((p) => [...p])
      if (next[pageIdx][cellIdx] != null) {
        next[pageIdx][cellIdx] = null
      } else {
        const placed = new Set<number>()
        for (const page of next) for (const id of page) if (id != null) placed.add(id)
        const nextSlip = slips.find((s) => !placed.has(s.slip_id))
        if (!nextSlip) return prev
        next[pageIdx][cellIdx] = nextSlip.slip_id
      }
      return next
    })
  }

  const fillCurrentPage = () => {
    setPages((prev) => {
      const next = prev.map((p) => [...p])
      const placed = new Set<number>()
      for (const page of next) for (const id of page) if (id != null) placed.add(id)
      const queue = slips.filter((s) => !placed.has(s.slip_id))
      const page = next[activePage] ?? []
      for (let i = 0; i < page.length && queue.length; i++) {
        if (page[i] == null) page[i] = queue.shift()!.slip_id
      }
      return next
    })
  }

  const addPage = () => {
    setPages((prev) => [...prev, Array(cellsPerPage).fill(null)])
    setActivePage(pages.length)
  }

  const handleDownload = () => previewDoc.current?.save(`driver-labels-${Date.now()}.pdf`)

  const handlePrint = async () => {
    if (!geo) return
    setGenerating(true)
    try {
      const doc = await generateDriverLabelPdf(
        mode === "roll" ? buildRollPayload() : buildSheetPayload(),
        geo
      )
      printPdfDoc(doc)
    } catch (err) {
      console.error("Failed to print driver labels", err)
      alert("Failed to print the labels.")
    } finally {
      setGenerating(false)
    }
  }

  const changeMode = (m: PrintMode) => {
    setMode(m)
    setLabelPresetId(m === "roll" ? ROLL_SIZES[0].id : SHEET_TEMPLATES[0].id)
  }

  const gridText = geo
    ? geo.isRoll
      ? `Continuous roll · ${formatSizeLabel(w, h)} per label`
      : `${geo.cols} × ${geo.rows} = ${geo.cellsPerPage} per sheet`
    : ""

  const currentPageCells = pages[activePage] ?? []
  const scale = geo ? FRAME_W / geo.pageWidthIn : 1
  const frameH = geo ? FRAME_W * (geo.pageHeightIn / geo.pageWidthIn) : 0

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[940px] w-[96vw] max-h-[93vh] overflow-hidden p-0 rounded-2xl">
        <DialogTitle className="sr-only">Print Driver Labels</DialogTitle>
        {step === "preview" ? (
          <div className="flex h-[82vh] flex-col">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setStep("layout")}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <h2 className="text-lg font-semibold text-gray-900">Print preview</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
                <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={handlePrint} disabled={generating}>
                  {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                  Print
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100">
              {previewUrl ? (
                <iframe title="Driver labels preview" src={previewUrl} className="h-full w-full border-0" />
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex max-h-[93vh] flex-col">
            {/* Top bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Print Driver Labels</h2>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                  {mode === "roll"
                    ? `${total} label${total === 1 ? "" : "s"}`
                    : `Available slips : ${placedCount} / ${total}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {mode === "sheet" && (
                  <>
                    <Button variant="outline" onClick={handleRegularPrint} disabled={!geo || !fits || total === 0 || generating}>
                      <Printer className="mr-2 h-4 w-4" /> Regular print
                    </Button>
                    <Button variant="outline" onClick={fillCurrentPage} disabled={!geo || !fits || unplaced.length === 0}>
                      <Check className="mr-2 h-4 w-4" /> Check all
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Config row */}
            <div className="flex flex-wrap items-end gap-4 border-b bg-gray-50 px-5 py-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">Target</span>
                <div className="flex overflow-hidden rounded-md border">
                  {(["sheet", "roll"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => changeMode(m)}
                      className={`px-3 py-1.5 text-sm capitalize ${mode === m ? "bg-blue-600 text-white" : "bg-white text-gray-700"}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {mode === "sheet" && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-500">Paper</span>
                  <Select value={paperId} onValueChange={(v) => setPaperId(v as MediaId)}>
                    <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAPER_OPTIONS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">Label size</span>
                <Select value={labelPresetId} onValueChange={setLabelPresetId}>
                  <SelectTrigger className="h-9 w-[230px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {mode === "sheet"
                      ? SHEET_TEMPLATES.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {formatSizeLabel(t.widthIn, t.heightIn)} · {t.cols * t.rows}/sheet
                            {t.code ? ` · ${t.code}` : ""}
                          </SelectItem>
                        ))
                      : ROLL_SIZES.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {formatSizeLabel(r.widthIn, r.heightIn)}
                          </SelectItem>
                        ))}
                    <SelectItem value={CUSTOM_LABEL_ID}>Custom…</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isCustom && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-500">Size (in)</span>
                  <div className="flex items-center gap-1">
                    <Input type="number" min={0.5} step={0.05} value={customW} onChange={(e) => setCustomW(e.target.value)} className="h-9 w-16" />
                    <span className="text-gray-400">×</span>
                    <Input type="number" min={0.5} step={0.05} value={customH} onChange={(e) => setCustomH(e.target.value)} className="h-9 w-16" />
                  </div>
                </div>
              )}

              {isCustom && mode === "sheet" && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-500">Columns</span>
                  <Select value={forcedCols} onValueChange={setForcedCols}>
                    <SelectTrigger className="h-9 w-[110px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      {[1, 2, 3, 4].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} column{n === 1 ? "" : "s"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="ml-auto pb-1 text-sm font-medium text-gray-600">{gridText}</div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {!dimsValid ? (
                <p className="py-10 text-center text-sm text-gray-500">Enter a valid label size to continue.</p>
              ) : !fits ? (
                <p className="py-10 text-center text-sm text-red-500">
                  This grid doesn’t fit the selected paper. Pick a smaller label, fewer columns, or a bigger sheet.
                </p>
              ) : mode === "roll" ? (
                <div className="mx-auto max-w-xl">
                  <p className="mb-3 text-sm text-gray-600">
                    All {total} label{total === 1 ? "" : "s"} print continuously, one per feed.
                  </p>
                  <ol className="divide-y rounded-lg border">
                    {slips.map((s, i) => (
                      <li key={s.slip_id} className="flex items-center gap-3 px-3 py-2 text-sm">
                        <span className="w-6 text-gray-400">{i + 1}.</span>
                        <span className="font-medium text-gray-900">{s.pt_name || "—"}</span>
                        <span className="ml-auto text-gray-500">{s.slip_number || `#${s.slip_id}`}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <>
                  {/* Layers */}
                  <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                    {pages.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActivePage(i)}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                          i === activePage ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {i === activePage ? `Current Layer ${i + 1}` : `Layer ${i + 1}`}
                      </button>
                    ))}
                  </div>

                  {/* Live sheet preview + interactive placement */}
                  <div
                    className="relative mx-auto rounded-md border border-gray-300 bg-white shadow-sm"
                    style={{ width: FRAME_W, height: frameH }}
                  >
                    {geo &&
                      currentPageCells.map((id, cellIdx) => {
                        const { x, y } = cellOrigin(geo, cellIdx)
                        const s = id != null ? slipById.get(id) : undefined
                        return (
                          <button
                            key={cellIdx}
                            type="button"
                            onClick={() => toggleCell(activePage, cellIdx)}
                            style={{
                              position: "absolute",
                              left: x * scale,
                              top: y * scale,
                              width: geo.labelWidthIn * scale,
                              height: geo.labelHeightIn * scale,
                            }}
                            className={`flex flex-col items-center justify-center overflow-hidden rounded-[3px] border p-1 text-center transition-colors ${
                              s ? "border-blue-500 bg-blue-50" : "border-dashed border-gray-300 bg-white hover:border-gray-400"
                            }`}
                          >
                            <span className="absolute left-1 top-0.5 text-[10px] font-semibold text-gray-400">{cellIdx + 1}</span>
                            {s ? (
                              <>
                                <span className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500">
                                  <Check className="h-2 w-2 text-white" />
                                </span>
                                <span className="max-w-full truncate text-[11px] font-semibold leading-tight text-gray-900">
                                  {s.pt_name || "—"}
                                </span>
                                <span className="max-w-full truncate text-[10px] leading-tight text-gray-500">
                                  {s.slip_number || `#${s.slip_id}`}
                                </span>
                              </>
                            ) : (
                              <span className="text-lg font-light text-gray-300">{cellIdx + 1}</span>
                            )}
                          </button>
                        )
                      })}
                  </div>

                  {unplaced.length > 0 && (
                    <p className="mt-4 text-center text-xs text-gray-500">
                      {unplaced.length} slip{unplaced.length === 1 ? "" : "s"} still to place — click cells, use “Check all”, or add a page.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t px-5 py-3">
              <Button variant="outline" onClick={onClose}>Close</Button>
              {mode === "sheet" && !allPlaced && fits && (
                <Button variant="outline" onClick={addPage} disabled={unplaced.length === 0}>
                  <Plus className="mr-2 h-4 w-4" /> Add Page
                </Button>
              )}
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleGeneratePrint}
                disabled={generating || !fits || total === 0 || (mode === "sheet" && !allPlaced) || loading}
              >
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Generate Print
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
