import { useQuery } from "@tanstack/react-query";
import { ProductApi } from "@/lib/api-service";

function extractDatePart(value: string | null | undefined): string {
  if (!value) return "";
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return m ? m[1] : "";
}

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
 * Returns the calendar due date as yyyy-MM-dd when available.
 */
export function useProductEstimatedDueDate(
  productId: number | null | undefined,
  stageId?: number | null,
  variationId?: number | null
) {
  const enabled = typeof productId === "number" && productId > 0;

  const query = useQuery({
    queryKey: [
      "product-estimated-due-date",
      productId ?? 0,
      stageId ?? 0,
      variationId ?? 0,
    ],
    queryFn: () =>
      ProductApi.calculateDelivery(
        productId as number,
        stageId && stageId > 0 ? stageId : undefined,
        variationId && variationId > 0 ? variationId : undefined
      ),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const iso = extractDatePart(query.data?.delivery_date);
  return {
    isoDate: iso || null,
    displayDate: iso ? formatEstimatedDueDate(iso) : null,
    isLoading: enabled && query.isLoading,
    isError: query.isError,
  };
}
