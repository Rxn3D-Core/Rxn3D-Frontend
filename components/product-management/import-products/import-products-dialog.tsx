"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { useLanguage } from "@/contexts/language-context"
import { useImportCatalog, useStartImport } from "@/hooks/use-lab-product-import"
import { readImportError, setSelected, type ReimportProduct } from "@/lib/lab-product-import"
import type { ImportCatalogFilters, LabProductImport } from "@/types/lab-product-import"
import { ImportCatalogStep } from "./import-catalog-step"
import { ImportRunStep } from "./import-run-step"

interface ImportProductsDialogProps {
  customerId: number
  run: LabProductImport | null
  onLeaveRun: () => void
  onClose: () => void
}

const KNOWN_ERRORS = [
  "onboarding_incomplete",
  "library_clone_in_progress",
  "import_in_progress",
  "invalid_products",
  "forbidden",
]

export function ImportProductsDialog({ customerId, run, onLeaveRun, onClose }: ImportProductsDialogProps) {
  const { t } = useTranslation()
  const { currentLanguage } = useLanguage()
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<ImportCatalogFilters>({ import_state: "all" })
  const [page, setPage] = useState(1)
  const [selected, setSelection] = useState<Set<number>>(new Set())
  const [reimport, setReimport] = useState<ReimportProduct[] | null>(null)
  const [startError, setStartError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => ((current.q ?? "") === search ? current : { ...current, q: search }))
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => setPage(1), [filters])

  const catalog = useImportCatalog(customerId, filters, page, currentLanguage || "en", !run)
  const start = useStartImport(customerId)
  const needsUpgrade = readImportError(catalog.error).code === "plan_scope_half"

  const submit = (confirmIds: number[]) => {
    setStartError(null)
    start.mutate(
      { productIds: [...selected], confirmIds },
      {
        onSuccess: () => {
          setSelection(new Set())
          setReimport(null)
        },
        onError: (error) => {
          const { code, body } = readImportError(error)
          // The API names the already imported products; the user confirms and we send again.
          if (code === "reimport_confirmation_required") {
            setReimport((current) => [...(current ?? []), ...(body?.data?.products ?? [])])
            return
          }
          setReimport(null)
          if (code === "invalid_products") {
            setSelection((current) => setSelected(current, body?.data?.product_ids ?? [], false))
          }
          if (code === "invalid_products" || code === "import_in_progress") {
            void catalog.refetch()
          }
          setStartError(
            code && KNOWN_ERRORS.includes(code)
              ? t(`productImport.errors.${code}`)
              : t("productImport.errors.generic"),
          )
        },
      },
    )
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="flex w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-lg p-0 h-[90dvh] max-h-[90dvh]"
        showCloseButton
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
          <ImportRunStep run={run} onImportMore={onLeaveRun} onClose={onClose} />
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
              <Button variant="outline" onClick={() => setReimport(null)} disabled={start.isPending}>
                {t("productImport.back")}
              </Button>
              <Button
                className="bg-[#1162a8] hover:bg-[#0d4d87] text-white"
                onClick={() => submit(reimport.map((product) => product.id))}
                disabled={start.isPending}
                data-testid="product-import-confirm-submit"
              >
                {start.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("productImport.confirmButton")}
              </Button>
            </div>
          </>
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
            submitting={start.isPending}
            onSubmit={() => submit([])}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
