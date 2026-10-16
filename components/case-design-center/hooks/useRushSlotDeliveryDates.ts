import { useQueries } from "@tanstack/react-query";
import { ProductApi } from "@/lib/api-service";
import type { RushArchSlot } from "../utils/rushModalContext";

function extractDatePart(value: string | null | undefined): string {
  if (!value) return "";
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return m ? m[1] : "";
}

/**
 * Fetches backend delivery dates for each rush slot via the lab delivery-date API.
 * Returns a map of `rushKey → delivery_date (yyyy-MM-dd)`.
 * Only requires apiProductId > 0; apiStageId is included when available.
 */
export function useRushSlotDeliveryDates(slots: RushArchSlot[]): {
  dates: Record<string, string>;
  isLoading: boolean;
} {
  const results = useQueries({
    queries: slots.map((slot) => ({
      queryKey: [
        "rush-slot-delivery-date",
        slot.apiProductId,
        slot.apiStageId ?? 0,
        slot.apiVariationId ?? 0,
      ],
      queryFn: () =>
        ProductApi.calculateDelivery(
          slot.apiProductId,
          slot.apiStageId,
          slot.apiVariationId
        ),
      enabled: slot.apiProductId > 0,
      staleTime: 5 * 60 * 1000,
      retry: 1,
    })),
  });

  const dates: Record<string, string> = {};
  for (let i = 0; i < slots.length; i++) {
    const date = extractDatePart(results[i]?.data?.delivery_date);
    if (date) {
      dates[slots[i].rushKey] = date;
    }
  }

  const enabledCount = slots.filter((s) => s.apiProductId > 0).length;
  const isLoading =
    enabledCount > 0 &&
    results.some((q) => q.isLoading) &&
    Object.keys(dates).length === 0;

  return { dates, isLoading };
}
