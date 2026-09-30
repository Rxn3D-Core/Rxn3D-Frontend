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

  const isoDates = queries
    .map((q) => extractDatePart(q.data?.delivery_date))
    .filter(Boolean)
    .sort();

  const latestIso = isoDates.length > 0 ? isoDates[isoDates.length - 1] : null;
  const isLoading =
    uniqueIds.length > 0 && queries.some((q) => q.isLoading) && !latestIso;

  return {
    isoDate: latestIso,
    displayDate: latestIso ? formatEstimatedDueDate(latestIso) : null,
    isLoading,
  };
}
