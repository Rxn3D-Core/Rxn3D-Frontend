"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Info, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { useInvoicingSettings, useSaveInvoicingSettings } from "@/hooks/use-invoicing-settings"
import { INVOICING_MODES } from "@/lib/product-invoicing"
import type { InvoicingMode } from "@/types/product-invoicing"

interface InvoicingTabProps {
  customerId: number | null
}

/** RXN-90: lab profile "Invoicing" tab. Lab admins edit; everyone else sees the saved mode read-only. */
export default function InvoicingTab({ customerId }: InvoicingTabProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const settingsQuery = useInvoicingSettings(customerId)
  const saveMutation = useSaveInvoicingSettings(customerId)
  const saved = settingsQuery.data?.invoicing_mode ?? "stage"
  const canEdit = settingsQuery.data?.can_edit === true
  const [selected, setSelected] = useState<InvoicingMode>(saved)

  useEffect(() => {
    setSelected(saved)
  }, [saved])

  const isDirty = selected !== saved
  const saving = saveMutation.isPending

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync(selected)
      toast({ title: t("productInvoicing.settings.savedTitle"), description: t("productInvoicing.settings.savedBody") })
    } catch (error) {
      toast({
        title: t("productInvoicing.settings.saveFailed"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      })
    }
  }

  const updatedBy = settingsQuery.data?.updated_by
  const updatedByName = updatedBy ? [updatedBy.first_name, updatedBy.last_name].filter(Boolean).join(" ") : ""
  const updatedAt = settingsQuery.data?.updated_at ? new Date(settingsQuery.data.updated_at) : null

  return (
    <div className="px-4 sm:px-6 py-4 bg-gray-50" data-testid="invoicing-settings">
      <div className="bg-white rounded-lg border">
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-semibold">{t("productInvoicing.settings.title")}</h3>
          <p className="mt-1 text-sm text-gray-600">{t("productInvoicing.settings.subtitle")}</p>

          {settingsQuery.isLoading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-gray-500" data-testid="invoicing-settings-loading">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("productInvoicing.common.loading")}
            </div>
          ) : settingsQuery.isError ? (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#CF0202]" data-testid="invoicing-settings-error">
              <p className="text-sm">{t("productInvoicing.settings.loadFailed")}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => void settingsQuery.refetch()}>
                {t("productInvoicing.common.retry")}
              </Button>
            </div>
          ) : (
            <>
              <RadioGroup
                value={selected}
                onValueChange={(value) => setSelected(value as InvoicingMode)}
                disabled={!canEdit || saving}
                className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3"
                aria-label={t("productInvoicing.settings.title")}
              >
                {INVOICING_MODES.map((mode) => (
                  <label
                    key={mode}
                    htmlFor={`invoicing-mode-${mode}`}
                    data-testid={`invoicing-settings-mode-${mode}`}
                    className={`block rounded-lg border-[1.5px] p-4 transition-colors duration-200 ${
                      selected === mode ? "border-[#1162A8] bg-blue-50/40" : "border-gray-200"
                    } ${canEdit ? "cursor-pointer hover:border-[#1162A8]" : "cursor-not-allowed opacity-70"}`}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value={mode} id={`invoicing-mode-${mode}`} className="mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{t(`productInvoicing.settings.mode.${mode}.label`)}</p>
                        <p className="mt-1 text-xs text-gray-600">{t(`productInvoicing.settings.mode.${mode}.description`)}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </RadioGroup>

              <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900" data-testid="invoicing-settings-applies-note">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p className="text-sm">{t("productInvoicing.settings.appliesToNewCases")}</p>
              </div>

              {!canEdit && (
                <p className="mt-3 text-sm text-gray-600" data-testid="invoicing-settings-readonly">
                  {t("productInvoicing.settings.adminOnly")}
                </p>
              )}

              {updatedAt && !Number.isNaN(updatedAt.getTime()) && (
                <p className="mt-3 text-xs text-gray-500" data-testid="invoicing-settings-updated">
                  {updatedByName
                    ? t("productInvoicing.settings.updatedBy", { name: updatedByName, date: updatedAt.toLocaleString() })
                    : t("productInvoicing.settings.updatedAt", { date: updatedAt.toLocaleString() })}
                </p>
              )}

              {canEdit && (
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setSelected(saved)}
                    disabled={!isDirty || saving}
                    data-testid="invoicing-settings-reset"
                  >
                    {t("productInvoicing.common.cancel")}
                  </Button>
                  <Button
                    onClick={() => void handleSave()}
                    disabled={!isDirty || saving}
                    data-testid="invoicing-settings-save"
                  >
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("productInvoicing.common.save")}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
