import { useQuery } from "@tanstack/react-query";
import { ProductApi } from "@/lib/api-service";
import { deliveryEstimateDay } from "@/lib/timezone";
import { useViewerTimeZone } from "@/lib/timezone/use-viewer-time-zone";

/** Format yyyy-MM-dd as a short locale date (e.g. Oct 5, 2026). */
export function formatEstimatedDueDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Fetches the lab delivery-date API for a product (+ optional stage/variation).
 * Returns the calendar due date as yyyy-MM-dd when available: the day of `delivery_at` in the
 * viewer's zone (RXN-123), or the lab's `delivery_date` from an older backend.
 */
export function useProductEstimatedDueDate(
  productId: number | null | undefined,
  stageId?: number | null,
  variationId?: number | null,
  labId?: number | null
) {
  const enabled = typeof productId === "number" && productId > 0;
  const viewerTimeZone = useViewerTimeZone();

  const query = useQuery({
    queryKey: [
      "product-estimated-due-date",
      productId ?? 0,
      stageId ?? 0,
      variationId ?? 0,
      labId ?? 0,
    ],
    queryFn: () =>
      ProductApi.calculateDelivery(
        productId as number,
        stageId && stageId > 0 ? stageId : undefined,
        variationId && variationId > 0 ? variationId : undefined,
        undefined,
        labId
      ),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const iso = deliveryEstimateDay(query.data, viewerTimeZone);
  return {
    isoDate: iso || null,
    displayDate: iso ? formatEstimatedDueDate(iso) : null,
    isLoading: enabled && query.isLoading,
    isError: query.isError,
  };
}
