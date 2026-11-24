"use client"

import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { PlanForm } from "@/lib/billing/plan-editor"

const CARD_COLOURS = ["#EAF2FB", "#E9F8EE", "#FFF6DB", "#FDECEC", "#F3F4F6"]

export function StepBasics({
  form,
  onChange,
  errors,
}: {
  form: PlanForm
  onChange: (patch: Partial<PlanForm>) => void
  errors: Record<string, string>
}) {
  const { t } = useTranslation()
  const err = (field: string) => (errors[field] ? t(errors[field], { defaultValue: errors[field] }) : undefined)

  return (
    <div className="space-y-3" data-testid="plan-editor-panel-basics">
      <Input
        label={t("planEditor.basics.name")}
        value={form.name}
        onChange={(e) => onChange({ name: e.target.value })}
        validationState={err("name") ? "error" : "default"}
        errorMessage={err("name")}
        data-testid="plan-editor-name"
      />
      <div className="space-y-1">
        <div className={cn("rounded-md border border-input px-3 pb-2 pt-2", err("description") && "border-[#CF0202]")}>
          <span className="px-1 text-xs text-muted-foreground">{t("planEditor.basics.description")}</span>
          <Textarea
            value={form.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder={t("planEditor.basics.descriptionPlaceholder")}
            className="mt-1 min-h-[80px] border-0 p-0 focus-visible:ring-0"
            data-testid="plan-editor-description"
          />
        </div>
        {err("description") ? <p className="text-xs text-[#CF0202]">{err("description")}</p> : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label={t("planEditor.basics.badge")}
          placeholder={t("planEditor.basics.badgePlaceholder")}
          value={form.badge_label}
          onChange={(e) => onChange({ badge_label: e.target.value })}
          validationState={err("badge_label") ? "error" : "default"}
          errorMessage={err("badge_label")}
          data-testid="plan-editor-badge"
        />
        <Input
          label={t("planEditor.basics.displayOrder")}
          inputMode="numeric"
          value={form.display_order}
          onChange={(e) => onChange({ display_order: e.target.value })}
          validationState={err("display_order") ? "error" : "default"}
          errorMessage={err("display_order") ?? undefined}
          data-testid="plan-editor-display-order"
        />
      </div>
      <p className="text-xs text-muted-foreground">{t("planEditor.basics.displayOrderHint")}</p>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{t("planEditor.basics.cardColour")}</p>
        <div className="flex flex-wrap items-center gap-2">
          {CARD_COLOURS.map((colour) => (
            <button
              key={colour}
              type="button"
              aria-label={colour}
              aria-pressed={form.preview_bg_color.toLowerCase() === colour.toLowerCase()}
              onClick={() => onChange({ preview_bg_color: colour })}
              className={cn(
                "h-8 w-8 rounded-full border border-[#D0D5DD] transition-shadow duration-200",
                form.preview_bg_color.toLowerCase() === colour.toLowerCase() && "ring-2 ring-[#1162A8] ring-offset-1",
              )}
              style={{ backgroundColor: colour }}
            />
          ))}
          <button
            type="button"
            onClick={() => onChange({ preview_bg_color: "" })}
            className="text-xs font-medium text-[#1162A8] hover:underline"
          >
            {t("planEditor.basics.noColour")}
          </button>
        </div>
      </div>
    </div>
  )
}
