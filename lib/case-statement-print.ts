function asPositiveInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number.parseInt(value, 10)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
  }
  return null
}

function getObjectValue(record: unknown, key: string): unknown {
  if (!record || typeof record !== "object") return undefined
  return (record as Record<string, unknown>)[key]
}

export function resolveCaseStatementBillingId(value: unknown): number | null {
  const directCandidates = [
    getObjectValue(value, "billingId"),
    getObjectValue(value, "billing_id"),
    getObjectValue(value, "invoiceId"),
    getObjectValue(value, "invoice_id"),
  ]

  for (const candidate of directCandidates) {
    const resolved = asPositiveInteger(candidate)
    if (resolved != null) return resolved
  }

  const nestedCandidates = [
    getObjectValue(value, "billing"),
    getObjectValue(value, "invoice"),
    getObjectValue(value, "billing_invoice"),
    getObjectValue(value, "slip_billing"),
  ]

  for (const candidate of nestedCandidates) {
    const resolved = asPositiveInteger(getObjectValue(candidate, "id"))
    if (resolved != null) return resolved
  }

  return null
}

export function findBillingInvoiceIdFromSearchResults(
  invoices: Array<{
    id: number
    slip?: {
      slip_number?: string | null
      case?: {
        case_number?: string | null
        patient_name?: string | null
      } | null
    } | null
  }>,
  slip: {
    slipNumber?: string | null
    caseNumber?: string | null
    patient?: string | null
  },
): number | null {
  const slipNumber = slip.slipNumber?.trim().toLowerCase()
  const caseNumber = slip.caseNumber?.trim().toLowerCase()
  const patient = slip.patient?.trim().toLowerCase()

  const bySlipNumber =
    slipNumber != null
      ? invoices.find((invoice) => invoice.slip?.slip_number?.trim().toLowerCase() === slipNumber)
      : undefined
  if (bySlipNumber) return bySlipNumber.id

  const byCaseNumber =
    caseNumber != null
      ? invoices.find((invoice) => invoice.slip?.case?.case_number?.trim().toLowerCase() === caseNumber)
      : undefined
  if (byCaseNumber) return byCaseNumber.id

  const byPatient =
    patient != null
      ? invoices.find((invoice) => invoice.slip?.case?.patient_name?.trim().toLowerCase() === patient)
      : undefined
  if (byPatient) return byPatient.id

  return invoices[0]?.id ?? null
}
