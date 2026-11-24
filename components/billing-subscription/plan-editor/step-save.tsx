"use client"

import { useTranslation } from "react-i18next"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import type { SaveMode } from "@/lib/api/billing-config-plans"
import type { ScheduleInput } from "@/lib/billing/plan-editor"
import { SchedulePicker } from "./schedule-picker"

const MODES: SaveMode[] = ["publish_now", "schedule", "draft"]

export function StepSave({
  mode,
  onModeChange,
  schedule,
  onScheduleChange,
  showScheduleErrors,
}: {
  mode: SaveMode
  onModeChange: (mode: SaveMode) => void
  schedule: ScheduleInput
  onScheduleChange: (value: ScheduleInput) => void
  showScheduleErrors: boolean
}) {
  const { t } = useTranslation()
  return (
    <section className="space-y-2" data-testid="plan-editor-save-options">
      <p className="text-sm font-semibold">{t("planEditor.save.question")}</p>
      <RadioGroup value={mode} onValueChange={(value) => onModeChange(value as SaveMode)} className="space-y-2">
        {MODES.map((option) => (
          <div
            key={option}
            className={cn(
              "rounded-lg border-[1.5px] px-3 py-2.5 transition-colors duration-200",
              mode === option ? "border-[#1162A8] bg-[#1162A8]/5" : "border-[#E5E7EB]",
            )}
          >
            <label className="flex cursor-pointer items-start gap-2.5">
              <RadioGroupItem value={option} className="mt-0.5" data-testid={`plan-editor-save-mode-${option}`} />
              <span>
                <span className="block text-sm font-medium">{t(`planEditor.save.modes.${option}.title`)}</span>
                <span className="block text-xs text-muted-foreground">{t(`planEditor.save.modes.${option}.hint`)}</span>
              </span>
            </label>
            {option === "schedule" && mode === "schedule" ? (
              <div className="mt-2.5 pl-0 sm:pl-6">
                <SchedulePicker value={schedule} onChange={onScheduleChange} showErrors={showScheduleErrors} />
              </div>
            ) : null}
          </div>
        ))}
      </RadioGroup>
    </section>
  )
}
