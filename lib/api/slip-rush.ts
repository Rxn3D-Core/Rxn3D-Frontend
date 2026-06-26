/**
 * Slip rush API — remove active rush from an existing slip.
 *
 * DELETE /slip/{slipId}/rush (base URL already includes /v1 when configured)
 * - No request body
 * - 400 when slip has no active rush or slip is Finished/Cancelled
 * - Returns full slip details in `data` (SlipDetailResource)
 */

import { buildApiUrl } from "@/lib/api/client";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/** Remove rush from slip; returns updated slip detail payload. */
export async function removeSlipRush(slipId: number): Promise<unknown> {
  const res = await fetch(buildApiUrl(`/slip/${slipId}/rush`), {
    method: "DELETE",
    headers: getAuthHeaders(),
  })

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
    throw new Error("Unauthorized")
  }

  const json = await res.json().catch(() => ({}))
  if (!res.ok || json?.success === false) {
    throw new Error(
      json?.message ||
        (res.status === 400
          ? "This slip has no active rush to remove"
          : `Failed to remove rush (${res.status})`)
    )
  }

  return json.data ?? null
}
