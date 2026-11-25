import { ApiService } from "@/lib/api-service"

type CustomerUpdateResponse = {
  message?: string
  data?: { id: number; timezone?: string | null }
}

export const TIMEZONE_NOT_AVAILABLE_MESSAGE = "Timezone selection is not available yet."

/**
 * First `timezone` field error of a 422 body. The backend validation envelope is
 * `{status: false, message, data: {timezone: [...]}}`; `errors.timezone` (Laravel default) is read too.
 */
export function timezoneFieldError(body: unknown): string | null {
  if (!body || typeof body !== "object") return null
  const root = body as { data?: { timezone?: unknown }; errors?: { timezone?: unknown } }
  for (const list of [root.data?.timezone, root.errors?.timezone]) {
    if (Array.isArray(list) && typeof list[0] === "string" && list[0]) return list[0]
  }
  return null
}

/**
 * Saves a lab's or office's zone through `PUT /customers/{id}` (RXN-123 contract §1).
 * Throws with the `timezone` field error on 422 (invalid zone, or the `customer_timezone` beta gate).
 * A backend without B1 ignores the field and returns no `timezone`; that is reported as an error
 * so the screen does not claim a change that was not stored.
 */
export async function updateCustomerTimezone(customerId: number, timezone: string): Promise<string> {
  let response: CustomerUpdateResponse
  try {
    response = await ApiService.put<CustomerUpdateResponse>(`/customers/${customerId}`, { timezone })
  } catch (error: unknown) {
    const fieldError = timezoneFieldError((error as { body?: unknown } | null)?.body)
    throw fieldError ? new Error(fieldError) : error
  }
  const saved = response?.data?.timezone
  if (typeof saved !== "string" || saved === "") {
    throw new Error(TIMEZONE_NOT_AVAILABLE_MESSAGE)
  }
  return saved
}
