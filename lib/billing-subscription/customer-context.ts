type BillingCustomerUser = {
  customer_id?: number | null
  customers?: Array<{
    id: number
  }> | null
} | null | undefined

type BillingCustomerStorage = Pick<Storage, "getItem"> | null | undefined

export function getStoredBillingCustomerId(storage?: Pick<Storage, "getItem"> | null): number | null {
  if (!storage) return null
  const storedCustomerId = storage.getItem("customerId")
  if (!storedCustomerId) return null

  const parsed = Number.parseInt(storedCustomerId, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function getStoredSelectedLabId(storage?: BillingCustomerStorage): number | null {
  if (!storage) return null
  const selectedLabId = storage.getItem("selectedLabId")
  if (!selectedLabId) return null

  const parsed = Number.parseInt(selectedLabId, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function getStoredRoles(storage?: BillingCustomerStorage): string[] {
  if (!storage) return []
  const rawRole = storage.getItem("role")
  if (!rawRole) return []

  try {
    const parsed = JSON.parse(rawRole)
    if (Array.isArray(parsed)) {
      return parsed.filter((role): role is string => typeof role === "string")
    }
  } catch {
    // Stored role can be a plain string; ignore JSON parse failure.
  }

  return [rawRole]
}

export function resolveBillingCustomerId(
  user: BillingCustomerUser,
  storage?: Pick<Storage, "getItem"> | null
): number | null {
  const storedCustomerId = getStoredBillingCustomerId(storage)
  if (storedCustomerId) return storedCustomerId
  if (user?.customers && user.customers.length > 0) return user.customers[0].id
  if (user?.customer_id) return user.customer_id
  return null
}

export function resolveUsageCustomerId(
  user: BillingCustomerUser,
  storage?: BillingCustomerStorage
): number | null {
  const roles = getStoredRoles(storage)
  const shouldUseSelectedLab =
    roles.includes("office_admin") || roles.includes("office_user") || roles.includes("doctor")

  if (shouldUseSelectedLab) {
    const selectedLabId = getStoredSelectedLabId(storage)
    if (selectedLabId) return selectedLabId
  }

  return resolveBillingCustomerId(user, storage)
}
