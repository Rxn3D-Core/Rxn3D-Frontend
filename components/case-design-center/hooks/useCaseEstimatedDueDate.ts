import { useQueries } from "@tanstack/react-query";
import { ProductApi } from "@/lib/api-service";
import { deliveryEstimateDay } from "@/lib/timezone";
import { useViewerTimeZone } from "@/lib/timezone/use-viewer-time-zone";
import { formatEstimatedDueDate } from "./useProductEstimatedDueDate";

/**
 * Fetches delivery dates for each product id and returns the latest calendar due date.
 * Used by the slip header (case-level estimate).
 * Also surfaces the effective pickup cutoff (case pan override or lab default) for the
 * product that owns the latest due date, and the lab's zone (RXN-123; null from an older backend).
 * The due day is `delivery_at` in the viewer's zone when the backend sends it.
 */
export function useCaseEstimatedDueDate(
  productIds: Array<number | null | undefined>,
  labId?: number | null
) {
  const uniqueIds = Array.from(
    new Set(
      productIds.filter((id): id is number => typeof id === "number" && id > 0)
    )
  );

  const viewerTimeZone = useViewerTimeZone();
  const queries = useQueries({
    queries: uniqueIds.map((productId) => ({
      queryKey: ["product-estimated-due-date", productId, 0, 0, labId ?? 0],
      queryFn: () =>
        ProductApi.calculateDelivery(productId, undefined, undefined, undefined, labId),
      staleTime: 5 * 60 * 1000,
      retry: 1,
    })),
  });

  const datedResults = queries
    .map((q) => ({
      iso: deliveryEstimateDay(q.data, viewerTimeZone) ?? "",
      cutoff: q.data?.effective_pickup_cutoff_time ?? null,
      timezone: q.data?.timezone ?? null,
    }))
    .filter((row) => row.iso)
    .sort((a, b) => a.iso.localeCompare(b.iso));

  const latest = datedResults.length > 0 ? datedResults[datedResults.length - 1] : null;
  const latestIso = latest?.iso ?? null;
  const isLoading =
    uniqueIds.length > 0 && queries.some((q) => q.isLoading) && !latestIso;

  return {
    isoDate: latestIso,
    displayDate: latestIso ? formatEstimatedDueDate(latestIso) : null,
    isLoading,
    effectivePickupCutoffTime: latest?.cutoff ?? null,
    labTimeZone: latest?.timezone ?? null,
  };
}
