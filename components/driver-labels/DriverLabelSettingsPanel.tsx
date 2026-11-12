"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DEFAULT_DRIVER_LABEL_PRINT_SETTINGS,
  DRIVER_LABEL_LOCKED_FIELDS,
  DRIVER_LABEL_OPTIONAL_FIELDS,
  type DriverLabelOptionalKey,
  type DriverLabelPrintSettings,
} from "@/lib/driver-labels/label-print-settings"

interface DriverLabelSettingsPanelProps {
  draft: DriverLabelPrintSettings
  onChange: (next: DriverLabelPrintSettings) => void
  onReset: () => void
  onApply: () => void
  /** Not a lab admin: the panel shows the lab-wide setting but cannot change or save it. */
  readOnly?: boolean
  loading?: boolean
  saving?: boolean
  saveError?: string | null
  loadError?: boolean
}

export function DriverLabelSettingsPanel({
  draft,
  onChange,
  onReset,
  onApply,
  readOnly = false,
  loading = false,
  saving = false,
  saveError = null,
  loadError = false,
}: DriverLabelSettingsPanelProps) {
  // Editing needs a lab admin and a successful load (otherwise we would overwrite unseen values).
  const locked = readOnly || loading || loadError
  const setOptional = (key: DriverLabelOptionalKey, checked: boolean) => {
    onChange({ ...draft, [key]: checked })
  }

  return (
    <aside data-testid="driver-label-settings-panel" className="flex h-full w-full max-w-[340px] flex-col border-l border-[#e8eaee] bg-white">
      <div className="border-b border-[#e8eaee] px-4 py-3">
        <h3 className="text-[15px] font-semibold text-[#17191F]">Driver label settings</h3>
        <p className="mt-1 text-[12px] leading-4 text-[#6b7280]">
          Choose which optional details appear. Lab name, patient and office always print.
        </p>
        <p className="mt-1 text-[12px] leading-4 text-[#6b7280]">
          This setting is shared by everyone in your lab.
        </p>
        {readOnly && !loading && !loadError ? (
          <p className="mt-1 text-[12px] leading-4 text-amber-700" data-testid="driver-label-settings-readonly">
            Only lab admins can change these settings.
          </p>
        ) : null}
        {loadError ? (
          <p className="mt-1 text-[12px] leading-4 text-red-600">
            Settings could not be loaded, so they cannot be changed now. Close and reopen to retry.
          </p>
        ) : null}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <div className="space-y-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-[#6b7280]">
            Apply to
          </span>
          <Select disabled={locked} value={draft.scope} onValueChange={() => onChange({ ...draft, scope: "all" })}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All label sizes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
            Always shown
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DRIVER_LABEL_LOCKED_FIELDS.map((label) => (
              <div
                key={label}
                className="flex items-center justify-between gap-1 rounded-md border border-[#e5e7eb] bg-[#f9fafb] px-2 py-1.5"
              >
                <span className="text-[11px] font-medium text-[#4b5563]">{label}</span>
                <span className="rounded bg-[#e5e7eb] px-1.5 py-0.5 text-[9px] font-semibold uppercase text-[#6b7280]">
                  Locked
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
            Optional details
          </div>
          <ul className="space-y-2.5">
            {DRIVER_LABEL_OPTIONAL_FIELDS.map((field) => {
              const { key, label } = field
              const hint = "hint" in field ? field.hint : undefined
              return (
                <li key={key} className="flex items-start gap-2.5">
                  <Checkbox
                    id={`driver-opt-${key}`}
                    className="mt-0.5"
                    checked={draft[key]}
                    disabled={locked}
                    onCheckedChange={(v) => setOptional(key, v === true)}
                  />
                  <div>
                    <label
                      htmlFor={`driver-opt-${key}`}
                      className="cursor-pointer text-[13px] text-[#17191F]"
                    >
                      {label}
                    </label>
                    {hint ? (
                      <p className="text-[11px] leading-4 text-[#6b7280]" data-testid={`driver-opt-${key}-hint`}>
                        {hint}
                      </p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
            Display
          </div>
          <ul className="space-y-3">
            {(
              [
                ["compactAbbreviations", "Use compact field abbreviations"],
                ["showDividers", "Show dividers"],
                ["uppercaseStatus", "Uppercase status"],
              ] as const
            ).map(([key, label]) => (
              <li key={key} className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-[#17191F]">{label}</span>
                <Switch
                  checked={draft[key]}
                  disabled={locked}
                  onCheckedChange={(v) => onChange({ ...draft, [key]: v })}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {saveError ? (
        <p className="border-t border-[#e8eaee] px-4 py-2 text-[12px] text-red-600" role="alert" data-testid="driver-label-settings-save-error">
          Settings were not saved: {saveError}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-2 border-t border-[#e8eaee] px-4 py-3">
        <Button
          type="button"
          variant="outline"
          className="border-[#c4b5fd] text-[#6d28d9] hover:bg-[#f5f3ff]"
          onClick={onReset}
          disabled={locked || saving}
        >
          Reset defaults
        </Button>
        <Button
          type="button"
          className="bg-blue-600 text-white hover:bg-blue-700"
          onClick={onApply}
          disabled={locked || saving}
          data-testid="driver-label-settings-apply"
        >
          {saving ? "Saving..." : "Apply settings"}
        </Button>
      </div>
    </aside>
  )
}

export { DEFAULT_DRIVER_LABEL_PRINT_SETTINGS }
