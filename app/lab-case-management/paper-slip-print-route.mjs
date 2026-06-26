function normalizeIds(ids) {
  const seen = new Set();
  const result = [];

  for (const id of ids ?? []) {
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }

  return result;
}

export function buildPaperSlipPrintRoute({ customerType, ids }) {
  const normalizedIds = normalizeIds(ids);
  if (normalizedIds.length === 0) return null;

  const params = new URLSearchParams();
  if (customerType === "office") {
    params.set("case_ids", normalizedIds.join(","));
  } else {
    params.set("slip_ids", normalizedIds.join(","));
  }

  return `/paper-slip/print?${params.toString()}`;
}
