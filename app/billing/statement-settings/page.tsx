"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard"
import { useSaveStatementSettings, useStatementSettings } from "@/hooks/use-statement-settings"
import {
  DEFAULT_LAB_STATEMENT_SETTINGS,
  STATEMENT_PAYMENT_TERMS,
  type LabStatementSettings,
  type StatementToggleKey,
} from "@/lib/statement-settings"

const NO_TERM = "none"

/** Section titles and the toggles in each, in the order they appear on the statement. */
const SECTIONS: { id: string; title: string; titleKey: string; toggles: { key: StatementToggleKey; label: string }[] }[] = [
  {
    id: "statement",
    title: "Statement details",
    titleKey: "statementSettings.sections.statement",
    toggles: [
      { key: "show_statement_number", label: "Statement number" },
      { key: "show_statement_date", label: "Statement date" },
      { key: "show_due_date", label: "Due date" },
      { key: "show_payment_terms", label: "Payment terms" },
    ],
  },
  {
    id: "lab",
    title: "Lab details",
    titleKey: "statementSettings.sections.lab",
    toggles: [
      { key: "show_lab_logo", label: "Lab logo" },
      { key: "show_lab_address", label: "Lab address" },
      { key: "show_lab_phone", label: "Lab phone" },
      { key: "show_lab_email", label: "Lab email" },
    ],
  },
  {
    id: "recipient",
    title: "Recipient (office) details",
    titleKey: "statementSettings.sections.recipient",
    toggles: [
      { key: "show_recipient_name", label: "Recipient name" },
      { key: "show_recipient_address", label: "Recipient address" },
      { key: "show_recipient_email", label: "Recipient email" },
      { key: "show_recipient_phone", label: "Recipient phone" },
    ],
  },
]

export default function StatementSettingsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const query = useStatementSettings()
  const save = useSaveStatementSettings()
  const [draft, setDraft] = useState<LabStatementSettings>(DEFAULT_LAB_STATEMENT_SETTINGS)

  useEffect(() => {
    if (query.data) setDraft(query.data.settings)
  }, [query.data])

  const canEdit = query.data?.canEdit === true
  // Never edit before a successful load: saving would overwrite values we have not seen.
  const locked = !canEdit || query.isLoading || query.isError || save.isPending
  const dirty = query.data ? JSON.stringify(draft) !== JSON.stringify(query.data.settings) : false

  const { dialog: unsavedDialog } = useUnsavedChangesGuard(dirty, {
    title: t("statementSettings.unsaved.title", "You have unsaved changes"),
    description: t("statementSettings.unsaved.description", "Your changes to the statement settings have not been saved. If you leave this page they will be lost."),
    stay: t("statementSettings.unsaved.stay", "Stay on page"),
    leave: t("statementSettings.unsaved.leave", "Leave without saving"),
  })

  const onSave = () => {
    save.mutate(draft, {
      onSuccess: () =>
        toast({ title: t("statementSettings.saved", "Statement settings saved"), description: t("statementSettings.savedHint", "New statements use these settings. Existing statements do not change.") }),
      onError: (error: unknown) =>
        toast({
          title: t("statementSettings.saveError", "Could not save statement settings"),
          description: error instanceof Error ? error.message : undefined,
          variant: "destructive",
        }),
    })
  }

  return (
    <main data-testid="statement-settings-page" className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5">
      <header>
        <h1 className="text-xl font-semibold text-gray-900">{t("statementSettings.title", "Statements settings")}</h1>
        <p className="text-sm text-gray-600">
          {t(
            "statementSettings.subtitle",
            "Choose what shows on the statements your lab sends and set the payment terms. New statements use these settings; existing statements keep what they had. Hiding a detail changes how the statement looks only, not the amount or the payment link.",
          )}
        </p>
      </header>

      {query.isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-gray-600" data-testid="statement-settings-loading">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> {t("statementSettings.loading", "Loading statement settings...")}
        </div>
      ) : null}
      {query.isError ? (
        <p role="alert" data-testid="statement-settings-load-error" className="text-sm text-[#CF0202]">
          {t("statementSettings.loadError", "Could not load the statement settings.")}{" "}
          <button type="button" className="underline" onClick={() => query.refetch()}>
            {t("statementSettings.retry", "Try again")}
          </button>
        </p>
      ) : null}
      {query.data && !canEdit ? (
        <p data-testid="statement-settings-read-only" className="rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700">
          {t("statementSettings.readOnly", "Only a lab admin can change these settings.")}
        </p>
      ) : null}

      <section className="rounded-lg border border-[#e8eaee] bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">{t("statementSettings.terms.title", "Payment terms")}</h2>
        <p className="mb-3 text-xs text-gray-600">
          {t("statementSettings.terms.hint", "The due date of a new statement is its creation date plus the term. You can still pick another date when you generate a statement. With no term, the due date is 30 days out.")}
        </p>
        <Select
          value={draft.paymentTermsDays === null ? NO_TERM : String(draft.paymentTermsDays)}
          disabled={locked}
          onValueChange={(value) =>
            setDraft((current) => ({
              ...current,
              paymentTermsDays: value === NO_TERM ? null : (Number(value) as LabStatementSettings["paymentTermsDays"]),
            }))
          }
        >
          <SelectTrigger className="w-56" aria-label={t("statementSettings.terms.title", "Payment terms")} data-testid="statement-settings-terms">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_TERM}>{t("statementSettings.terms.none", "Not set (30 days)")}</SelectItem>
            {STATEMENT_PAYMENT_TERMS.map((days) => (
              <SelectItem key={days} value={String(days)}>{`Net ${days}`}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {SECTIONS.map((section) => (
        <section key={section.id} className="rounded-lg border border-[#e8eaee] bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">{t(section.titleKey, section.title)}</h2>
          <ul className="divide-y divide-[#f0f1f4]">
            {section.toggles.map(({ key, label }) => (
              <li key={key} className="flex items-center justify-between py-2">
                <label htmlFor={`statement-setting-${key}`} className="text-sm text-gray-800">
                  {t(`statementSettings.toggles.${key}`, label)}
                </label>
                <Switch
                  id={`statement-setting-${key}`}
                  data-testid={`statement-setting-${key}`}
                  checked={draft.toggles[key]}
                  disabled={locked}
                  onCheckedChange={(checked) =>
                    setDraft((current) => ({ ...current, toggles: { ...current.toggles, [key]: checked } }))
                  }
                />
              </li>
            ))}
          </ul>
          {section.id === "recipient" ? (
            <p className="mt-2 text-xs text-gray-500">
              {t("statementSettings.recipientNote", "If the recipient name and email are both hidden, the office name still shows. The office code always shows.")}
            </p>
          ) : null}
        </section>
      ))}

      {canEdit ? (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={locked || !dirty}
            onClick={() => query.data && setDraft(query.data.settings)}
          >
            {t("statementSettings.discard", "Discard changes")}
          </Button>
          <Button data-testid="statement-settings-save" disabled={locked || !dirty} onClick={onSave}>
            {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {t("statementSettings.save", "Save")}
          </Button>
        </div>
      ) : null}
      {unsavedDialog}
    </main>
  )
}
