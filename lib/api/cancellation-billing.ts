import { buildApiUrl } from "@/lib/api/client"
import { apiErrorMessage } from "@/lib/product-invoicing"
import type { CancellationBillingData, CancellationDecisionInput } from "@/types/product-invoicing"

/**
 * RXN-90 cancellation billing (product-mode cases only), under the slip group.
 * Kept on plain fetch so callers can tell "not a product-mode case" (422 `not_product_mode`,
 * or 404 on an older API) apart from real failures.
 */
export class CancellationBillingError extends Error {
  status: number
  code: string | null
  fieldErrors: Record<string, string[]> | null

  constructor(message: string, status: number, code: string | null, fieldErrors: Record<string, string[]> | null) {
    super(message)
    this.name = "CancellationBillingError"
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

function authHeaders(): HeadersInit {
  const token = typeof window === "undefined" ? null : localStorage.getItem("token")
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function request(slipId: number, init: RequestInit): Promise<CancellationBillingData> {
  const res = await fetch(buildApiUrl(`/slip/${slipId}/cancellation-billing`), { ...init, headers: authHeaders() })
  const body = await res.json().catch(() => null)
  if (!res.ok || body?.success === false || body?.status === false) {
    // Validation 422s use `{ status:false, message, data:{ field:[...] } }`; business rules use `{ success:false, error, errors? }`.
    const bag = body?.errors ?? (res.status === 422 && body?.status === false ? body?.data : null)
    throw new CancellationBillingError(
      apiErrorMessage(body, `Request failed (${res.status})`),
      res.status,
      typeof body?.error === "string" ? body.error : null,
      bag && typeof bag === "object" && !Array.isArray(bag) ? bag : null,
    )
  }
  return body?.data as CancellationBillingData
}

/** GET /v1/slip/{slipId}/cancellation-billing */
export function getCancellationBilling(slipId: number): Promise<CancellationBillingData> {
  return request(slipId, { method: "GET" })
}

/** PUT /v1/slip/{slipId}/cancellation-billing */
export function saveCancellationBilling(
  slipId: number,
  decisions: CancellationDecisionInput[],
): Promise<CancellationBillingData> {
  return request(slipId, { method: "PUT", body: JSON.stringify({ decisions }) })
}

/** True when the slip's case is not billed per product (stage mode, or an API without RXN-90). */
export function isNotProductModeError(error: unknown): boolean {
  if (!(error instanceof CancellationBillingError)) return false
  return error.code === "not_product_mode" || error.status === 404 || error.status === 405
}
