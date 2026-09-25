/**
 * Resolve paper-slip print IDs from listing rows.
 * Always use the slip's own `id` as slip_ids — never caseId in the slip_ids
 * slot (that prints a different slip or fails). Office "print whole case"
 * belongs on case_ids via a dedicated call, not the per-row listing actions.
 */

export function resolveListingPaperSlipId(row: {
  id?: number | null;
}): number | null {
  const id = row?.id;
  return typeof id === "number" && !Number.isNaN(id) && id > 0 ? id : null;
}

export function resolveListingPaperSlipIds(
  rows: Array<{ id?: number | null }>,
): number[] {
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const row of rows) {
    const id = resolveListingPaperSlipId(row);
    if (id == null || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/** Slip id plus case id, in listing order, for v5 bulk print. */
export function resolveListingPaperSlipJobs(
  rows: Array<{ id?: number | null; caseId?: number }>,
): Array<{ slipId: number; caseId?: number }> {
  const jobs: Array<{ slipId: number; caseId?: number }> = [];
  const seen = new Set<number>();
  for (const row of rows) {
    const slipId = resolveListingPaperSlipId(row);
    if (slipId == null || seen.has(slipId)) continue;
    seen.add(slipId);
    jobs.push({ slipId, caseId: row.caseId });
  }
  return jobs;
}
