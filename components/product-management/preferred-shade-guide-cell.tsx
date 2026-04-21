"use client"

import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PreferredShadeGuideCellProps = {
  hasExplicitPreference: boolean | undefined
  brandId: number
  brandStatus: string
  preferredBrandId: number | null
  onSetPreferred: () => Promise<void>
  isUpdating: boolean
  disabledNoCustomer?: boolean
}

/**
 * Put `group/pref-row` on the parent {@link TableRow}. Non-preferred active rows show "—"
 * until the row is hovered; then the orange action appears. Touch devices always show the action.
 */
export function PreferredShadeGuideCell({
  hasExplicitPreference,
  brandId,
  brandStatus,
  preferredBrandId,
  onSetPreferred,
  isUpdating,
  disabledNoCustomer,
}: PreferredShadeGuideCellProps) {
  const { t } = useTranslation()

  if (disabledNoCustomer) {
    return <span className="text-xs text-gray-400">—</span>
  }

  if (hasExplicitPreference === undefined) {
    return <span className="inline-block h-8 w-32 rounded bg-gray-100 animate-pulse" aria-hidden />
  }

  const isPreferredRow = hasExplicitPreference && preferredBrandId === brandId
  const canSetPreferred = brandStatus === "Active" && !isPreferredRow

  if (isPreferredRow) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap",
          "bg-green-50 text-green-800 border border-green-200",
        )}
      >
        {t("Preferred shade guide", "Preferred shade guide")}
      </span>
    )
  }

  if (!canSetPreferred) {
    return <span className="text-xs text-gray-400">—</span>
  }

  return (
    <div className="flex min-h-[36px] items-center">
      <span
        className={cn(
          "text-xs text-gray-400",
          !isUpdating && "[@media(hover:hover)]:group-hover/pref-row:hidden",
          !isUpdating && "[@media(hover:none)]:hidden",
          isUpdating && "hidden",
        )}
      >
        —
      </span>
      <div
        className={cn(
          "hidden shrink-0",
          !isUpdating && "[@media(hover:hover)]:group-hover/pref-row:block",
          !isUpdating && "[@media(hover:none)]:block",
          isUpdating && "block",
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUpdating}
          onClick={() => void onSetPreferred()}
          className={cn(
            "rounded-full border-2 border-[#E85D04] bg-[#FFF8F3] text-gray-900",
            "hover:bg-orange-50/90 text-xs font-medium h-auto py-1.5 px-3 whitespace-nowrap shadow-sm",
            isUpdating && "opacity-70 pointer-events-none",
          )}
        >
          {t("Set as preferred shade guide", "Set as preferred shade guide")}
        </Button>
      </div>
    </div>
  )
}
