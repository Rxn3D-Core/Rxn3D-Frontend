"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { useLanguage } from "@/contexts/language-context"
import { IMPORT_QUERY_KEY, useImportCatalog } from "@/hooks/use-lab-product-import"
import { readImportError, runImportInBatches, setSelected, type ReimportProduct } from "@/lib/lab-product-import"
import { labProductImportService } from "@/services/lab-product-import-service"
import type { ImportCatalogFilters, ImportRun } from "@/types/lab-product-import"
import { ImportCatalogStep } from "./import-catalog-step"
import { ImportProductDetailStep } from "./import-product-detail-step"
import { ImportRunStep } from "./import-run-step"

interface ImportProductsDialogProps {
  customerId: number
  onImported: () => void
  onClose: () => void
}

const KNOWN_ERRORS = [
  "onboarding_incomplete",
  "library_clone_in_progress",
  "import_in_progress",
  "invalid_products",
  "forbidden",
]

export function ImportProductsDialog({ customerId, onImported, onClose }: ImportProductsDialogProps) {
  const { t } = useTranslation()
  const { currentLanguage } = useLanguage()
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<ImportCatalogFilters>({ import_state: "all" })
  const [page, setPage] = useState(1)
  const [selected, setSelection] = useState<Set<number>>(new Set())
  const [reimport, setReimport] = useState<ReimportProduct[] | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [run, setRun] = useState<ImportRun | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [viewing, setViewing] = useState<number | null>(null)
  const queryClient = useQueryClient()
  // Closing mid-run would hide which products were imported.
  const importing = run?.status === "processing"

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => ((current.q ?? "") === search ? current : { ...current, q: search }))
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => setPage(1), [filters])

  const catalog = useImportCatalog(customerId, filters, page, currentLanguage || "en", !run)
  const needsUpgrade = readImportError(catalog.error).code === "plan_scope_half"

  const errorText = (error: unknown) => {
    const { code } = readImportError(error)
    return code && KNOWN_ERRORS.includes(code)
      ? t(`productImport.errors.${code}`)
      : t("productImport.errors.generic")
  }

  const startImport = async (confirmIds: number[]) => {
    setReimport(null)
    setViewing(null)
    setRunError(null)
    const { run: finished, error } = await runImportInBatches({
      ids: [...selected],
      confirmIds,
      send: (ids, confirmed) => labProductImportService.start(customerId, ids, confirmed),
      onProgress: setRun,
    })
    void queryClient.invalidateQueries({ queryKey: [IMPORT_QUERY_KEY] })
    if (finished.imported_count > 0) onImported()
    if (!error) {
      setSelection(new Set())
      return
    }
    const { code, body } = readImportError(error)
    if (code === "invalid_products") {
      setSelection((current) => setSelected(current, body?.data?.product_ids ?? [], false))
    }
    // Nothing was imported: stay on the list and say why.
    if (finished.items.length === 0 && code && KNOWN_ERRORS.includes(code)) {
      setRun(null)
      setStartError(errorText(error))
      return
    }
    setSelection(new Set())
    setRunError(errorText(error))
  }

  /** Asks for confirmation first when any selected product is already in the library. */
  const submit = async () => {
    setStartError(null)
    setChecking(true)
    try {
      const { imported } = await labProductImportService.catalogIds(customerId, { import_state: "imported" })
      const again = imported.filter((product) => selected.has(product.id))
      if (again.length > 0) setReimport(again)
      else void startImport([])
    } catch (error) {
      setStartError(errorText(error))
    } finally {
      setChecking(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && !importing && onClose()}>
      <DialogContent
        className="flex w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-lg p-0 h-[90dvh] max-h-[90dvh]"
        showCloseButton={!importing}
        data-testid="product-import-dialog"
      >
        <div className="border-b border-gray-200 px-4 sm:px-6 py-4 pr-12">
          <DialogTitle className="text-lg">
            {reimport ? t("productImport.confirmTitle") : t("productImport.title")}
          </DialogTitle>
          <DialogDescription className="sr-only sm:not-sr-only sm:mt-1">
            {reimport ? t("productImport.confirmText") : t("productImport.description")}
          </DialogDescription>
        </div>

        {run ? (
          <ImportRunStep run={run} error={runError} onImportMore={() => setRun(null)} onClose={onClose} />
        ) : needsUpgrade ? (
          <div className="flex-1 overflow-auto px-4 sm:px-6 py-8 text-center" data-testid="product-import-upgrade">
            <h3 className="font-medium text-gray-900">{t("productImport.upgradeTitle")}</h3>
            <p className="mt-2 text-sm text-gray-600">{t("productImport.upgradeText")}</p>
          </div>
        ) : reimport ? (
          <>
            <div className="flex-1 overflow-auto px-4 sm:px-6 py-4" data-testid="product-import-confirm">
              <p className="rounded-lg border border-[#FF9900] bg-orange-50 px-3 py-2 text-sm text-gray-800">
                {t("productImport.confirmWarning", { number: reimport.length })}
              </p>
              <ul className="mt-3 divide-y divide-gray-100 text-sm text-gray-900">
                {reimport.map((product) => (
                  <li key={product.id} className="py-2 break-words">
                    {product.name}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-4 sm:px-6 py-3">
              <Button variant="outline" onClick={() => setReimport(null)}>
                {t("productImport.back")}
              </Button>
              <Button
                className="bg-[#1162a8] hover:bg-[#0d4d87] text-white"
                onClick={() => startImport(reimport.map((product) => product.id))}
                data-testid="product-import-confirm-submit"
              >
                {t("productImport.confirmButton")}
              </Button>
            </div>
          </>
        ) : viewing !== null ? (
          <ImportProductDetailStep
            customerId={customerId}
            productId={viewing}
            lang={currentLanguage || "en"}
            selected={selected.has(viewing)}
            onToggle={() => setSelection((current) => setSelected(current, [viewing], !current.has(viewing)))}
            onBack={() => setViewing(null)}
          />
        ) : (
          <ImportCatalogStep
            customerId={customerId}
            lang={currentLanguage || "en"}
            catalog={catalog}
            search={search}
            onSearchChange={setSearch}
            filters={filters}
            onFiltersChange={setFilters}
            page={page}
            onPageChange={setPage}
            selected={selected}
            onSelectionChange={setSelection}
            error={startError}
            submitting={checking}
            onSubmit={submit}
            onView={setViewing}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
