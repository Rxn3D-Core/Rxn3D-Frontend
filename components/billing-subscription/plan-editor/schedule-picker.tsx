"use client"

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { canonicalTimeZone, formatInZone, localToUtcIso, validateSchedule, type ScheduleInput } from "@/lib/billing/plan-editor"

function timeZones(current: string): string[] {
  let zones: string[] = []
  try {
    zones = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone") ?? []
  } catch {
    zones = []
  }
  zones = Array.from(new Set(zones.map(canonicalTimeZone))).sort()
  if (!zones.includes("UTC")) zones = ["UTC", ...zones]
  if (current && !zones.includes(current)) zones = [current, ...zones]
  return zones
}

const fieldClass =
  "h-10 w-full rounded-lg border-[1.5px] border-[#D0D5DD] bg-white px-3 text-sm text-[#101828] outline-none transition-colors duration-200 focus:border-[#1162A8]"

export function SchedulePicker({
  value,
  onChange,
  showErrors,
}: {
  value: ScheduleInput
  onChange: (value: ScheduleInput) => void
  showErrors: boolean
}) {
  const { t } = useTranslation()
  const zones = useMemo(() => timeZones(value.timeZone), [value.timeZone])
  const utcIso = localToUtcIso(value.date, value.time, value.timeZone)
  const error = validateSchedule(value)

  return (
    <div className="space-y-2" data-testid="plan-editor-schedule-picker">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_minmax(0,1.4fr)]">
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>{t("planEditor.schedule.date")}</span>
          <input
            type="date"
            value={value.date}
            onChange={(e) => onChange({ ...value, date: e.target.value })}
            className={fieldClass}
            data-testid="plan-editor-schedule-date"
          />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>{t("planEditor.schedule.time")}</span>
          <input
            type="time"
            value={value.time}
            onChange={(e) => onChange({ ...value, time: e.target.value })}
            className={fieldClass}
            data-testid="plan-editor-schedule-time"
          />
        </label>
        <label className="min-w-0 space-y-1 text-xs text-muted-foreground">
          <span>{t("planEditor.schedule.timezone")}</span>
          <select
            value={value.timeZone}
            onChange={(e) => onChange({ ...value, timeZone: e.target.value })}
            className={fieldClass}
            data-testid="plan-editor-schedule-timezone"
          >
            {zones.map((zone) => (
              <option key={zone} value={zone}>{zone}</option>
            ))}
          </select>
        </label>
      </div>
      {utcIso ? (
        <p className="text-xs text-muted-foreground" data-testid="plan-editor-schedule-utc">
          {t("planEditor.schedule.utcEquivalent", {
            local: formatInZone(utcIso, value.timeZone),
            utc: formatInZone(utcIso, "UTC"),
          })}
        </p>
      ) : null}
      {showErrors && error ? (
        <p className="text-xs text-[#CF0202]" data-testid="plan-editor-schedule-error">{t(`planEditor.schedule.errors.${error}`)}</p>
      ) : null}
    </div>
  )
}
