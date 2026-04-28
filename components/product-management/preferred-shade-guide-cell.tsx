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
 *
 * Uses fixed height + opacity (no hidden/block swap) so row size does not change on hover —
 * avoids layout jitter when the pointer sits between two table rows on narrow viewports.
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
          "border border-green-200 bg-green-50 text-green-800",
        )}
      >
        {t("Preferred shade guide", "Preferred shade guide")}
      </span>
    )
  }

  if (!canSetPreferred) {
    return <span className="text-xs text-gray-400">—</span>
  }

  const buttonLabel = t("Set as preferred shade guide", "Set as preferred shade guide")

  return (
    <div className="relative isolate h-11 w-full max-w-[min(20rem,92vw)] min-w-[11rem]">
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 z-0 flex items-center text-xs text-gray-400 transition-opacity duration-150 ease-out",
          !isUpdating && "[@media(hover:none)]:hidden",
          !isUpdating && "[@media(hover:hover)]:opacity-100 [@media(hover:hover)]:pointer-events-none",
          !isUpdating && "[@media(hover:hover)]:group-hover/pref-row:opacity-0",
          isUpdating && "hidden",
        )}
      >
        —
      </span>
      <div
        className={cn(
          "absolute inset-0 z-[1] flex items-center justify-start transition-opacity duration-150 ease-out",
          !isUpdating && "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:pointer-events-none",
          !isUpdating && "[@media(hover:hover)]:group-hover/pref-row:opacity-100 [@media(hover:hover)]:group-hover/pref-row:pointer-events-auto",
          !isUpdating && "[@media(hover:none)]:opacity-100",
          !isUpdating && "[@media(hover:none)]:pointer-events-auto",
          isUpdating && "opacity-100",
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUpdating}
          onClick={() => void onSetPreferred()}
          className={cn(
            "h-auto whitespace-normal rounded-full border-2 border-[#E85D04] bg-[#FFF8F3] px-3 py-1.5 text-left text-xs font-medium leading-snug text-gray-900 shadow-sm",
            "hover:bg-orange-50/90 sm:max-w-none sm:text-xs sm:leading-normal",
            isUpdating && "pointer-events-none opacity-70",
          )}
        >
          {buttonLabel}
        </Button>
      </div>
    </div>
  )
}
