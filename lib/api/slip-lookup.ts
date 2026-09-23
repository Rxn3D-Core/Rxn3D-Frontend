import { apiClient } from "@/lib/api/client"
import { resolveListingCustomerId } from "@/lib/customer-scope"

type LabMatchField = "slip_number" | "case_number" | "casepan_number"

type LabSlipListingRow = {
  id?: number
  slip_number?: string
  case?: { case_number?: string }
  casepan?: { number?: string }
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
  return role === "lab_admin" || role === "lab_user" || role === "lab_driver"
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

function findSlipIdInLabRows(
  rows: LabSlipListingRow[],
  normalized: string,
  fields: LabMatchField[]
): number | null {
  for (const row of rows) {
    if (typeof row.id !== "number") continue
    for (const field of fields) {
      const value =
        field === "slip_number"
          ? row.slip_number
          : field === "case_number"
            ? row.case?.case_number
            : row.casepan?.number
      if (value?.trim().toLowerCase() === normalized) {
        return row.id
      }
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
  query: string,
  searchBy: LabMatchField[],
  status?: string
): Promise<LabSlipListingRow[]> {
  const response = await apiClient.get<unknown>("/slip/listing/lab", {
    params: {
      customer_id: customerId,
      q: query,
      // Custom query serializer joins arrays with "," which the backend splits back.
      search_by: searchBy,
      ...(status ? { status } : {}),
      page: 1,
      per_page: 25,
    },
  })

  return unwrapLabListingRows(response.data)
}

/**
 * Lab lookup for the jump-to-slip box:
 *  1. slip # / case # across all statuses
 *  2. fallback: case pan # within In-Progress cases only
 */
async function lookupSlipIdInLab(
  customerId: number,
  trimmed: string
): Promise<number | null> {
  const normalized = normalizeSlipNumber(trimmed)

  const primaryRows = await searchLabListing(customerId, trimmed, [
    "slip_number",
    "case_number",
  ])
  const primaryId = findSlipIdInLabRows(primaryRows, normalized, [
    "slip_number",
    "case_number",
  ])
  if (primaryId) return primaryId

  const panRows = await searchLabListing(
    customerId,
    trimmed,
    ["casepan_number"],
    "In Progress"
  )
  return findSlipIdInLabRows(panRows, normalized, ["casepan_number"])
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
 * Resolve a display slip / case / case pan number to a slip id via listing search.
 *
 * Lab users: slip # and case # match across all statuses; a case pan # only
 * resolves within In-Progress cases. Office users keep the existing slip-number
 * lookup (office listing has no case pan search).
 *
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
  if (isLabListingRole(role)) {
    return lookupSlipIdInLab(customerId, trimmed)
  }

  const officeSlipId = await searchOfficeListing(customerId, trimmed)
  if (officeSlipId) return officeSlipId

  return lookupSlipIdInLab(customerId, trimmed)
}
