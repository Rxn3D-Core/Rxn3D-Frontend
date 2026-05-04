/**
 * When a product defines exactly one active extraction and marks it as default,
 * there is no meaningful choice — the UI can hide extraction boxes and ignore tooth clicks.
 */
function isActiveExtractionRow(e: {
  status?: string;
  name?: string | null;
  code?: string | null;
}): boolean {
  if (String(e.status ?? "Active").trim().toLowerCase() === "inactive") return false;
  if (e.name == null || e.code == null) return false;
  if (String(e.name).trim() === "" || String(e.code).trim() === "") return false;
  return true;
}

export function isSingleDefaultOnlyExtractionList(
  extractions:
    | ReadonlyArray<{ status?: string; name?: string | null; code?: string | null; is_default?: string }>
    | undefined
    | null
): boolean {
  const active = (extractions ?? []).filter(isActiveExtractionRow);
  if (active.length !== 1) return false;
  return String(active[0].is_default ?? "").trim().toLowerCase() === "yes";
}
