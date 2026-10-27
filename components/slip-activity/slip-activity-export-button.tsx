"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { slipActivityExportFilename } from "@/lib/slip-activity/query-params"
import { fetchSlipActivityExport } from "@/services/slip-activity-service"
import type { SlipActivityExportFormat, SlipActivityFilters } from "@/types/slip-activity"

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function SlipActivityExportButtons({ filters, disabled }: { filters: SlipActivityFilters; disabled?: boolean }) {
  const { t } = useTranslation()
  const [pending, setPending] = useState<SlipActivityExportFormat | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (format: SlipActivityExportFormat) => {
    setPending(format)
    setError(null)
    try {
      const blob = await fetchSlipActivityExport(filters, format)
      saveBlob(blob, slipActivityExportFilename(filters, format))
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t("slipActivity.export.error", "Export failed. Please try again."))
    } finally {
      setPending(null)
    }
  }

  const button = (format: SlipActivityExportFormat, label: string) => (
    <Button
      type="button"
      variant="outline"
      data-testid={`slip-activity-export-${format}`}
      disabled={disabled || pending !== null}
      onClick={() => run(format)}
      className="h-10 disabled:opacity-40"
    >
      {pending === format ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="mr-2 h-4 w-4" aria-hidden="true" />
      )}
      {label}
    </Button>
  )

  return (
    <div className="flex shrink-0 flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {button("csv", t("slipActivity.export.csv", "Export CSV"))}
        {button("xlsx", t("slipActivity.export.xlsx", "Export Excel"))}
      </div>
      {error && (
        <p role="alert" data-testid="slip-activity-export-error" className="max-w-md text-sm text-[#CF0202]">
          {error}
        </p>
      )}
    </div>
  )
}
