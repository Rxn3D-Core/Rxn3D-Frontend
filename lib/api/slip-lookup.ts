import { apiClient } from "@/lib/api/client"
import { resolveListingCustomerId } from "@/lib/customer-scope"

type LabSlipListingRow = {
  id?: number
  slip_number?: string
  number?: string
}

type OfficeCaseListingRow = {
  slips?: Array<{ id: number; slip_number?: string }>
}

function normalizeSlipNumber(value: string): string {
  return value.trim().toLowerCase()
}

function resolveUserRole(): string | null {
  if (typeof window === "undefined") return null

  const stored = localStorage.getItem("role")
  if (stored) return stored

  try {
    const userStr = localStorage.getItem("user")
    const user = userStr ? JSON.parse(userStr) : null
    const roles = user?.roles
    if (Array.isArray(roles) && roles.length > 0) {
      return String(roles[0])
    }
  } catch {
    /* ignore */
  }

  return null
}

function isLabListingRole(role: string | null): boolean {
  return role === "lab_admin" || role === "lab_user"
}

function unwrapLabListingRows(payload: unknown): LabSlipListingRow[] {
  const root = payload as
    | LabSlipListingRow[]
    | { data?: LabSlipListingRow[] | { data?: LabSlipListingRow[] } }
    | null

  if (Array.isArray(root)) return root
  if (Array.isArray(root?.data)) return root.data
  if (root?.data && typeof root.data === "object" && Array.isArray(root.data.data)) {
    return root.data.data
  }
  return []
}

function unwrapOfficeListingCases(payload: unknown): OfficeCaseListingRow[] {
  const root = payload as
    | OfficeCaseListingRow[]
    | { data?: OfficeCaseListingRow[] | { data?: OfficeCaseListingRow[] } }
    | null

  if (Array.isArray(root)) return root
  if (Array.isArray(root?.data)) return root.data
  if (root?.data && typeof root.data === "object" && Array.isArray(root.data.data)) {
    return root.data.data
  }
  return []
}

function findExactSlipIdInLabRows(
  rows: LabSlipListingRow[],
  normalized: string
): number | null {
  for (const row of rows) {
    const slipNumber = (row.slip_number ?? row.number)?.trim().toLowerCase()
    if (slipNumber === normalized && typeof row.id === "number") {
      return row.id
    }
  }
  return null
}

function findExactSlipIdInOfficeCases(
  cases: OfficeCaseListingRow[],
  normalized: string
): number | null {
  for (const caseRow of cases) {
    if (!Array.isArray(caseRow.slips)) continue
    for (const slip of caseRow.slips) {
      const slipNumber = slip.slip_number?.trim().toLowerCase()
      if (slipNumber === normalized && typeof slip.id === "number") {
        return slip.id
      }
    }
  }
  return null
}

async function searchLabListing(
  customerId: number,
  slipNumber: string
): Promise<number | null> {
  const response = await apiClient.get<unknown>("/slip/listing/lab", {
    params: {
      customer_id: customerId,
      q: slipNumber,
      page: 1,
      per_page: 25,
    },
  })

  return findExactSlipIdInLabRows(
    unwrapLabListingRows(response.data),
    normalizeSlipNumber(slipNumber)
  )
}

async function searchOfficeListing(
  customerId: number,
  slipNumber: string
): Promise<number | null> {
  const response = await apiClient.get<unknown>("/slip/listing/office", {
    params: {
      customer_id: customerId,
      q: slipNumber,
      page: 1,
      per_page: 25,
    },
  })

  return findExactSlipIdInOfficeCases(
    unwrapOfficeListingCases(response.data),
    normalizeSlipNumber(slipNumber)
  )
}

/**
 * Resolve a display slip number to slip id via slip listing search (all cases for tenant).
 * Returns null when no exact match is found.
 */
export async function lookupSlipIdByNumber(
  slipNumber: string
): Promise<number | null> {
  const trimmed = slipNumber.trim()
  if (!trimmed) return null

  const customerId = resolveListingCustomerId()
  if (!customerId) return null

  const role = resolveUserRole()
  const listingKinds = isLabListingRole(role)
    ? (["lab"] as const)
    : (["office", "lab"] as const)

  for (const kind of listingKinds) {
    const slipId =
      kind === "lab"
        ? await searchLabListing(customerId, trimmed)
        : await searchOfficeListing(customerId, trimmed)
    if (slipId) return slipId
  }

  return null
}
