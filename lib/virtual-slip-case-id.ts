/** Resolve cases.id from GET /v1/slip/slip/{id}/details payload. */
export function resolveVirtualSlipCaseId(details: unknown): number | null {
  if (!details || typeof details !== "object") return null
  const raw = details as Record<string, unknown>
  const caseObj =
    raw.case && typeof raw.case === "object"
      ? (raw.case as Record<string, unknown>)
      : {}

  const candidates = [raw.case_id, caseObj.id, caseObj.case_id]
  for (const value of candidates) {
    const id = typeof value === "number" ? value : Number(value)
    if (Number.isFinite(id) && id > 0) return id
  }
  return null
}
