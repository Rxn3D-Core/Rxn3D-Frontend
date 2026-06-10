/**
 * Attach active lab/office profile (`customer_id`) to API URLs so backend permission middleware
 * resolves the correct profile. See docs/permissions/README.md
 */

export function getActiveCustomerId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("customerId")
}

export function appendCustomerIdQuery(
  endpoint: string,
  customerId?: string | number | null,
): string {
  if (endpoint.includes("customer_id=")) return endpoint

  const id =
    customerId != null && customerId !== ""
      ? String(customerId)
      : getActiveCustomerId()

  if (!id) return endpoint

  const separator = endpoint.includes("?") ? "&" : "?"
  return `${endpoint}${separator}customer_id=${encodeURIComponent(id)}`
}
