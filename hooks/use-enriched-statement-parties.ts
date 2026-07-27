"use client"

import { useMemo } from "react"
import { useGetCustomerByIdQuery } from "@/lib/redux/api/customersApi"
import type { StatementParty, StatementRecord } from "@/lib/redux/api/billingApi"
import {
  mergeStatementPartyWithProfile,
  statementPartyNeedsLocationEnrichment,
} from "@/lib/statement-edit-utils"

function resolvePartyCustomerId(
  party: StatementParty | null | undefined,
  fallbackId: number | null | undefined,
): number | undefined {
  const id = party?.id ?? fallbackId
  return id != null && id > 0 ? id : undefined
}

/**
 * When statement `office` / `lab` lack city/state, fetch customer profiles and merge
 * address parts for on-screen statement previews.
 */
export function useEnrichedStatementParties(statement: StatementRecord | null | undefined): {
  office: StatementParty | null
  lab: StatementParty | null
} {
  const officeId = resolvePartyCustomerId(statement?.office, statement?.office_id)
  const labId = resolvePartyCustomerId(statement?.lab, statement?.lab_id)

  const needsOfficeEnrichment = statementPartyNeedsLocationEnrichment(statement?.office)
  const needsLabEnrichment = statementPartyNeedsLocationEnrichment(statement?.lab)

  const { data: officeProfile } = useGetCustomerByIdQuery(officeId ?? 0, {
    skip: officeId == null || !needsOfficeEnrichment,
  })
  const { data: labProfile } = useGetCustomerByIdQuery(labId ?? 0, {
    skip: labId == null || !needsLabEnrichment,
  })

  return useMemo(
    () => ({
      office: mergeStatementPartyWithProfile(statement?.office, officeProfile),
      lab: mergeStatementPartyWithProfile(statement?.lab, labProfile),
    }),
    [statement?.office, statement?.lab, officeProfile, labProfile],
  )
}
