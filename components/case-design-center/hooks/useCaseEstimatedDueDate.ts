import { useQueries } from "@tanstack/react-query";
import { ProductApi } from "@/lib/api-service";
import { formatEstimatedDueDate } from "./useProductEstimatedDueDate";

function extractDatePart(value: string | null | undefined): string {
  if (!value) return "";
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return m ? m[1] : "";
}

/**
 * Fetches delivery dates for each product id and returns the latest calendar due date.
 * Used by the slip header (case-level estimate).
 * Also surfaces the effective pickup cutoff (case pan override or lab default) for the
 * product that owns the latest due date.
 */
export function useCaseEstimatedDueDate(productIds: Array<number | null | undefined>) {
  const uniqueIds = Array.from(
    new Set(
      productIds.filter((id): id is number => typeof id === "number" && id > 0)
    )
  );

  const queries = useQueries({
    queries: uniqueIds.map((productId) => ({
      queryKey: ["product-estimated-due-date", productId, 0, 0],
      queryFn: () => ProductApi.calculateDelivery(productId),
      staleTime: 5 * 60 * 1000,
      retry: 1,
    })),
  });

  const datedResults = queries
    .map((q) => ({
      iso: extractDatePart(q.data?.delivery_date),
      cutoff: q.data?.effective_pickup_cutoff_time ?? null,
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
  };
}
