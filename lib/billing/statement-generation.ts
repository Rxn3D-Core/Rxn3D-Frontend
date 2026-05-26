import type { BillingInvoice } from "@/lib/redux/api/billingApi"

export interface StatementGenerationGroup {
  office_id: number
  billing_ids: number[]
}

export interface StatementGenerationGroupingResult {
  groups: StatementGenerationGroup[]
  missingOfficeBillingIds: number[]
}

export function groupBillingInvoicesForStatementGeneration(
  invoices: BillingInvoice[],
): StatementGenerationGroupingResult {
  const grouped = new Map<number, Set<number>>()
  const missingOfficeBillingIds: number[] = []

  invoices.forEach((invoice) => {
    const officeId = invoice.office?.id

    if (officeId == null) {
      missingOfficeBillingIds.push(invoice.id)
      return
    }

    const billingIds = grouped.get(officeId) ?? new Set<number>()
    billingIds.add(invoice.id)
    grouped.set(officeId, billingIds)
  })

  const groups = Array.from(grouped.entries()).map(([office_id, billingIds]) => ({
    office_id,
    billing_ids: Array.from(billingIds),
  }))

  return { groups, missingOfficeBillingIds }
}
