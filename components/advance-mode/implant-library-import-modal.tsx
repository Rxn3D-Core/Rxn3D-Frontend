"use client"

import { useCallback, useRef, useState } from "react"
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  IMPLANT_LIBRARY_CSV_HEADERS,
  implantLibraryCsvTemplateRow,
  parseImplantLibraryCsv,
  type ImplantLibraryCsvParseResult,
} from "@/lib/implant-library-csv-import"
import { useImportImplantsCsv } from "@/lib/api/advance-mode-query"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const PREVIEW_MAX = 25
const MAX_UPLOAD_BYTES = 5120 * 1024

export interface ImplantLibraryImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImplantLibraryImportModal({ open, onOpenChange }: ImplantLibraryImportModalProps) {
  const { toast } = useToast()
  const importMutation = useImportImplantsCsv()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<ImplantLibraryCsvParseResult | null>(null)
  const [readError, setReadError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setFileName(null)
    setFile(null)
    setParseResult(null)
    setReadError(null)
    if (inputRef.current) inputRef.current.value = ""
  }, [])

  const handleClose = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const processFile = useCallback(async (f: File) => {
    setReadError(null)
    setParseResult(null)
    const lower = f.name.toLowerCase()
    if (!lower.endsWith(".csv") && !lower.endsWith(".txt")) {
      setReadError("Please choose a .csv or .txt file.")
      return
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setReadError(`File must be ${MAX_UPLOAD_BYTES / 1024} KB or smaller.`)
      return
    }
    setFileName(f.name)
    setFile(f)
    try {
      const text = await f.text()
      setParseResult(parseImplantLibraryCsv(text))
    } catch {
      setReadError("Could not read the file. Try saving as UTF-8 CSV.")
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) void processFile(f)
  }

  const canImport = Boolean(file) && parseResult?.ok === true && !importMutation.isPending

  const handleImport = async () => {
    if (!file || !parseResult?.ok) return
    try {
      const res = await importMutation.mutateAsync(file)
      const d = res.data
      const parts: string[] = []
      if (d?.created_implants != null) parts.push(`Created: ${d.created_implants}`)
      if (d?.updated_implants != null) parts.push(`Updated: ${d.updated_implants}`)
      if (d?.platforms_created != null) parts.push(`Platforms: ${d.platforms_created}`)
      if (d?.sizes_created != null) parts.push(`Sizes: ${d.sizes_created}`)
      toast({
        title: res.message || "Import completed",
        description: parts.length > 0 ? parts.join(" · ") : undefined,
      })
      reset()
      onOpenChange(false)
    } catch (err) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton
        className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="flex-shrink-0 border-b px-6 py-4 pr-14 text-left">
          <DialogTitle className="text-lg">Import implants from CSV</DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Row 1 must be the header (exact order: brand, system, platform, diameter_mm, length_mm, display_label):{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">{implantLibraryCsvTemplateRow()}</code>
            . Preview and checks run in the browser; then the same file is sent to the server for import (superadmin
            only).
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="hidden"
              onChange={handleInputChange}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-gray-700"
              onClick={() => {
                const blob = new Blob([`${implantLibraryCsvTemplateRow()}\n`], {
                  type: "text/csv;charset=utf-8",
                })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = "IMPLANT_LIBRARY_template.csv"
                a.click()
                URL.revokeObjectURL(url)
              }}
            >
              <Download className="h-4 w-4" />
              Template (header only)
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Select CSV
            </Button>
            {fileName && (
              <span className="flex items-center gap-1 text-sm text-gray-700">
                <FileSpreadsheet className="h-4 w-4 text-gray-500" />
                {fileName}
              </span>
            )}
          </div>

          {readError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {readError}
            </div>
          )}

          {parseResult && parseResult.headerErrors.length > 0 && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <p className="font-medium">Header row does not match the required template</p>
              <ul className="list-inside list-disc space-y-1 text-amber-900">
                {parseResult.headerErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {parseResult && parseResult.headerErrors.length === 0 && parseResult.fileWarnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <ul className="list-inside list-disc space-y-1">
                {parseResult.fileWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {parseResult && parseResult.headerErrors.length === 0 && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <SummaryTile label="Rows to import" value={String(parseResult.totalDataRows)} />
                <SummaryTile
                  label="Valid rows"
                  value={String(parseResult.validRowCount)}
                  highlight={parseResult.invalidRowCount === 0 ? "good" : "neutral"}
                />
                <SummaryTile
                  label="Invalid rows"
                  value={String(parseResult.invalidRowCount)}
                  highlight={parseResult.invalidRowCount > 0 ? "bad" : "good"}
                />
                <SummaryTile label="Unique brands" value={String(parseResult.uniqueBrands)} />
                <SummaryTile label="Unique systems" value={String(parseResult.uniqueSystems)} />
                <SummaryTile label="Unique platforms" value={String(parseResult.uniquePlatforms)} />
              </div>
              <p className="text-xs text-gray-500">
                Brand, system, and platform counts are from <span className="font-medium">valid rows only</span>.
              </p>

              {parseResult.invalidRowCount > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-sm text-red-900">
                  Fix invalid rows in your spreadsheet, then upload again. Import stays disabled until every row
                  passes the checks above.
                </div>
              )}

              <div className="min-h-0 flex-1 space-y-2">
                <p className="text-sm font-medium text-gray-800">
                  Preview (first {Math.min(PREVIEW_MAX, parseResult.rows.length)} of {parseResult.rows.length})
                </p>
                <ScrollArea className="h-[min(320px,40vh)] rounded-md border">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-14">Line</TableHead>
                        {IMPLANT_LIBRARY_CSV_HEADERS.map((h) => (
                          <TableHead key={h} className="whitespace-nowrap capitalize">
                            {h.replace(/_/g, " ")}
                          </TableHead>
                        ))}
                        <TableHead className="w-24">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parseResult.rows.slice(0, PREVIEW_MAX).map((r) => (
                        <TableRow key={r.lineNumber} className={cn(!r.isValid && "bg-red-50/60")}>
                          <TableCell className="font-mono text-gray-600">{r.lineNumber}</TableCell>
                          {IMPLANT_LIBRARY_CSV_HEADERS.map((h) => (
                            <TableCell key={h} className="max-w-[140px] truncate" title={r.values[h]}>
                              {r.values[h] || "—"}
                            </TableCell>
                          ))}
                          <TableCell>
                            {r.isValid ? (
                              <span className="inline-flex items-center gap-0.5 text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" /> OK
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-red-700" title={r.errors.join("; ")}>
                                <AlertCircle className="h-3.5 w-3.5" /> Error
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                {parseResult.rows.length > PREVIEW_MAX && (
                  <p className="text-xs text-gray-500">
                    Showing first {PREVIEW_MAX} rows only. Full file has {parseResult.rows.length} data rows.
                  </p>
                )}
                {parseResult.rows.some((r) => !r.isValid) && (
                  <div className="max-h-28 overflow-y-auto rounded border border-red-100 bg-red-50/50 p-2 text-xs text-red-900">
                    <p className="mb-1 font-medium">Row errors</p>
                    <ul className="space-y-1">
                      {parseResult.rows
                        .filter((r) => !r.isValid)
                        .slice(0, 20)
                        .map((r) => (
                          <li key={r.lineNumber}>
                            <span className="font-mono">Line {r.lineNumber}:</span> {r.errors.join("; ")}
                          </li>
                        ))}
                    </ul>
                    {parseResult.invalidRowCount > 20 && (
                      <p className="mt-1 text-red-800">…and {parseResult.invalidRowCount - 20} more invalid rows.</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-t bg-gray-50/80 px-6 py-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => reset()} disabled={!fileName && !readError}>
            Clear file
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => handleClose(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              className="bg-[#1162a8] hover:bg-[#0f5490]"
              disabled={!canImport}
              onClick={() => void handleImport()}
            >
              {importMutation.isPending ? "Importing…" : "Import"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SummaryTile({
  label,
  value,
  highlight = "neutral",
}: {
  label: string
  value: string
  highlight?: "good" | "bad" | "neutral"
}) {
  const border =
    highlight === "good"
      ? "border-emerald-200 bg-emerald-50/80"
      : highlight === "bad"
        ? "border-red-200 bg-red-50/80"
        : "border-gray-200 bg-white"
  return (
    <div className={cn("rounded-lg border px-3 py-2", border)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-gray-900">{value}</p>
    </div>
  )
}
