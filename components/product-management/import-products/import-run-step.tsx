"use client"

import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { importProgressPercent } from "@/lib/lab-product-import"
import type { ImportRun } from "@/types/lab-product-import"

interface ImportRunStepProps {
  run: ImportRun
  /** Why the run stopped early. */
  error: string | null
  onImportMore: () => void
  onClose: () => void
}

/** Progress of a running import, then what happened to each product. */
export function ImportRunStep({ run, error, onImportMore, onClose }: ImportRunStepProps) {
  const { t } = useTranslation()
  const active = run.status === "processing"

  return (
    <>
      <div className="min-h-0 flex-1 overflow-auto px-4 sm:px-6 py-4" data-testid="product-import-run">
        <div aria-live="polite">
          <p className="flex items-center gap-2 text-sm font-medium text-gray-900" data-testid="product-import-status">
            {active && <Loader2 className="h-4 w-4 animate-spin text-[#1162a8]" />}
            {active
              ? t("productImport.importingCount", { done: run.items.length, total: run.total })
              : t("productImport.summary", { imported: run.imported_count, failed: run.failed_count })}
          </p>
        </div>
        {active && (
          <>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={importProgressPercent(run)}
            >
              <div
                className="h-full bg-[#1162a8] transition-all"
                style={{ width: `${importProgressPercent(run)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-600">{t("productImport.keepOpen")}</p>
          </>
        )}
        {run.status === "failed" && (
          <p className="mt-2 text-sm text-[#CF0202]" role="alert">
            {error} {t("productImport.stopped", { done: run.items.length, total: run.total })}
          </p>
        )}

        <ul className="mt-3 divide-y divide-gray-100">
          {run.items.map((item) => (
            <li key={item.global_product_id} className="py-2" data-testid="product-import-result">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 break-words text-sm text-gray-900">
                  {item.name || `#${item.global_product_id}`}
                </span>
                <span
                  className={`flex-none rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                    item.status === "imported"
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {item.status === "imported" ? t("productImport.imported") : t("productImport.failed")}
                </span>
              </div>
              {item.error && <p className="mt-1 text-xs text-[#CF0202]">{item.error}</p>}
              {item.warnings.length > 0 && (
                <ul className="mt-1 list-disc pl-4 text-xs text-amber-700">
                  {item.warnings.map((warning, index) => (
                    <li key={index} className="break-words text-xs">
                      {warning}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>

        {!active && run.imported_count > 0 && (
          <p className="mt-3 text-xs text-gray-600">{t("productImport.inactiveNote")}</p>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-gray-200 px-4 sm:px-6 py-3">
        {!active && (
          <Button variant="outline" onClick={onImportMore} data-testid="product-import-more">
            {t("productImport.importMore")}
          </Button>
        )}
        {!active && (
          <Button className="bg-[#1162a8] hover:bg-[#0d4d87] text-white" onClick={onClose} data-testid="product-import-close">
            {t("productImport.close")}
          </Button>
        )}
      </div>
    </>
  )
}
