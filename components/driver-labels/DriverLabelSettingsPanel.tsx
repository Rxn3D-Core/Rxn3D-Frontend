"use client"

import { useEffect, useRef, useState } from "react"
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
import { LOGO_ACCEPT, LOGO_FORMAT_HINT, validateLogoFile } from "@/lib/logo-upload"
import { fetchActiveLogoDataUrl } from "@/lib/api/driver-label-settings"
import { prepareLabelLogo } from "@/lib/driver-labels/logo-outline"
import {
  DEFAULT_DRIVER_LABEL_PRINT_SETTINGS,
  DRIVER_LABEL_LOCKED_FIELDS,
  DRIVER_LABEL_OPTIONAL_FIELDS,
  type DriverLabelOptionalKey,
  type DriverLabelDesign,
  type DriverLabelLogoSource,
  type DriverLabelPrintSettings,
} from "@/lib/driver-labels/label-print-settings"

/** RXN-65: logo URLs from the API (lab profile logo, uploaded driver label logo, the one the saved choice prints). */
export interface DriverLabelLogoInfo {
  currentUrl: string | null
  customUrl: string | null
  activeUrl: string | null
}

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
  /** RXN-68: the chosen roll size prints the v3 design (fixed captions, logo applies, no compact switch). */
  v3Active?: boolean
  logo?: DriverLabelLogoInfo
  logoBusy?: boolean
  logoError?: string | null
  onUploadLogo?: (file: File) => void
  onRemoveLogo?: () => void
}

const NO_LOGO: DriverLabelLogoInfo = { currentUrl: null, customUrl: null, activeUrl: null }

const DESIGNS: { id: DriverLabelDesign; title: string; text: string }[] = [
  { id: "classic", title: "Classic", text: "Lab name, patient and office stacked on the left." },
  { id: "centered", title: "Centered", text: "Logo or lab name centred, details in two columns." },
]

/** Shows what the saved logo looks like once converted for printing (the same conversion the label uses). */
function OutlinePreview({ activeUrl, outline }: { activeUrl: string; outline: boolean }) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    setSrc(null)
    setFailed(false)
    fetchActiveLogoDataUrl()
      .then((data) => prepareLabelLogo(data, outline))
      .then((prepared) => {
        if (cancelled) return
        if (prepared) setSrc(prepared.dataUrl)
        else setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [activeUrl, outline])
  if (failed) {
    return <p className="text-[11px] text-amber-700">Preview unavailable. The label will print the lab name.</p>
  }
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="Logo as printed" className="max-h-12 max-w-full" data-testid="driver-label-logo-print-preview" /> : null
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
  v3Active = false,
  logo = NO_LOGO,
  logoBusy = false,
  logoError = null,
  onUploadLogo,
  onRemoveLogo,
}: DriverLabelSettingsPanelProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  // Editing needs a lab admin and a successful load (otherwise we would overwrite unseen values).
  const locked = readOnly || loading || loadError
  const setOptional = (key: DriverLabelOptionalKey, checked: boolean) => {
    onChange({ ...draft, [key]: checked })
  }

  const setSource = (source: DriverLabelLogoSource) => onChange({ ...draft, logoSource: source })
  const handleFile = (file: File | undefined) => {
    if (!file) return
    const error = validateLogoFile(file)
    setFileError(error)
    if (!error) onUploadLogo?.(file)
    if (fileInput.current) fileInput.current.value = ""
  }
  const logoLocked = locked || logoBusy
  // The converted preview reads the saved logo, so it is only shown when the draft choice equals what is saved.
  const savedChoiceShown = draft.logoSource !== "none" && logo.activeUrl !== null &&
    ((draft.logoSource === "current" && logo.activeUrl === logo.currentUrl) ||
      (draft.logoSource === "custom" && logo.activeUrl === logo.customUrl))

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
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
            Label design
          </div>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Label design">
            {DESIGNS.map((d) => (
              <label
                key={d.id}
                data-testid={`driver-label-design-${d.id}`}
                className={`cursor-pointer rounded-md border p-2 text-left ${
                  draft.labelDesign === d.id ? "border-blue-500 bg-blue-50" : "border-[#e5e7eb] bg-white"
                } ${locked ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name="driver-label-design"
                  className="sr-only"
                  checked={draft.labelDesign === d.id}
                  disabled={locked}
                  onChange={() => onChange({ ...draft, labelDesign: d.id })}
                />
                <span className="block text-[13px] font-medium text-[#17191F]">{d.title}</span>
                <span className="block text-[11px] leading-4 text-[#6b7280]">{d.text}</span>
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] leading-4 text-[#6b7280]">
            {v3Active
              ? "This size prints the v3 design, so the choice above applies to other sizes. Product and Status are not part of v3."
              : "The switches below apply to both designs."}
          </p>
        </div>

        <div data-testid="driver-label-logo-section">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">Logo</div>
            <div className="space-y-2" role="radiogroup" aria-label="Logo on the label">
              <label className="flex items-start gap-2 text-[13px] text-[#17191F]">
                <input
                  type="radio"
                  name="driver-label-logo-source"
                  className="mt-1"
                  checked={draft.logoSource === "current"}
                  disabled={logoLocked}
                  onChange={() => setSource("current")}
                  data-testid="driver-label-logo-current"
                />
                <span>
                  Use current logo
                  {logo.currentUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo.currentUrl} alt="Current lab logo" className="mt-1 max-h-12 max-w-full rounded border border-[#e5e7eb] bg-white p-1" />
                  ) : (
                    <span className="block text-[11px] text-amber-700">No logo on file. The lab name prints instead.</span>
                  )}
                </span>
              </label>
              <label className="flex items-start gap-2 text-[13px] text-[#17191F]">
                <input
                  type="radio"
                  name="driver-label-logo-source"
                  className="mt-1"
                  checked={draft.logoSource === "custom"}
                  disabled={logoLocked || !logo.customUrl}
                  onChange={() => setSource("custom")}
                  data-testid="driver-label-logo-custom"
                />
                <span>
                  Use an uploaded logo
                  {logo.customUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo.customUrl} alt="Uploaded driver label logo" className="mt-1 max-h-12 max-w-full rounded border border-[#e5e7eb] bg-white p-1" />
                  ) : (
                    <span className="block text-[11px] text-[#6b7280]">Upload a file below first.</span>
                  )}
                </span>
              </label>
              <label className="flex items-start gap-2 text-[13px] text-[#17191F]">
                <input
                  type="radio"
                  name="driver-label-logo-source"
                  className="mt-1"
                  checked={draft.logoSource === "none"}
                  disabled={logoLocked}
                  onChange={() => setSource("none")}
                  data-testid="driver-label-logo-none"
                />
                <span>No logo (print the lab name)</span>
              </label>
            </div>

            {!readOnly ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  ref={fileInput}
                  type="file"
                  accept={LOGO_ACCEPT}
                  className="hidden"
                  data-testid="driver-label-logo-file"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={logoLocked}
                  onClick={() => fileInput.current?.click()}
                  data-testid="driver-label-logo-upload"
                >
                  {logoBusy ? "Working..." : logo.customUrl ? "Upload a new logo" : "Upload a logo"}
                </Button>
                {logo.customUrl ? (
                  <Button type="button" variant="ghost" size="sm" disabled={logoLocked} onClick={onRemoveLogo} data-testid="driver-label-logo-remove">
                    Remove uploaded logo
                  </Button>
                ) : null}
              </div>
            ) : null}
            <p className="mt-1.5 text-[11px] leading-4 text-[#6b7280]">
              {LOGO_FORMAT_HINT}, up to 1 MB. Uploading is saved at once; the logo choice is saved with Apply settings.
            </p>
            {fileError || logoError ? (
              <p className="mt-1 text-[12px] text-red-600" role="alert" data-testid="driver-label-logo-error">
                {fileError || logoError}
              </p>
            ) : null}

            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[13px] text-[#17191F]">Convert to outline</span>
              <Switch
                checked={draft.logoOutline}
                disabled={locked}
                onCheckedChange={(v) => onChange({ ...draft, logoOutline: v })}
                data-testid="driver-label-logo-outline"
              />
            </div>
            <p className="mt-1 text-[11px] leading-4 text-[#6b7280]">
              Turn off when your file is already an outline drawing.
            </p>
            {savedChoiceShown && logo.activeUrl ? (
              <div className="mt-2 rounded border border-dashed border-[#d1d5db] p-2">
                <div className="mb-1 text-[11px] text-[#6b7280]">Printed logo (saved choice)</div>
                <OutlinePreview activeUrl={logo.activeUrl} outline={draft.logoOutline} />
              </div>
            ) : null}
        </div>

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
            Office
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-[#17191F]">Show office full name</span>
            <Switch
              checked={draft.officeDisplay === "name"}
              disabled={locked}
              onCheckedChange={(v) => onChange({ ...draft, officeDisplay: v ? "name" : "code" })}
              data-testid="driver-label-office-display"
            />
          </div>
          <p className="mt-1 text-[11px] leading-4 text-[#6b7280]">
            Off prints the office code.
          </p>
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
            )
              .filter(([key]) => !(v3Active && key === "compactAbbreviations"))
              .map(([key, label]) => (
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
