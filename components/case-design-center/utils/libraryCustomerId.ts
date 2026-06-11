import { isOfficeCustomerContext } from "@/lib/role-utils";

/**
 * customer_id for library product/category APIs only (not slip listing).
 * Products belong to labs: office profiles pass the selected lab id; lab profiles pass their customerId.
 * For slip listing (`/slip/listing/*`), use `resolveListingCustomerId` from `@/lib/customer-scope`.
 */
export function resolveLibraryCustomerId(
  selectedLabId?: number | null
): number | undefined {
  if (typeof window === "undefined") return undefined;

  if (isOfficeCustomerContext()) {
    if (selectedLabId != null && Number.isFinite(selectedLabId)) {
      return selectedLabId;
    }
    const raw = localStorage.getItem("selectedLabId");
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  const raw = localStorage.getItem("customerId");
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}
