import type { Arch, ImpressionOptionForModal, ProductImpression } from "../types";

/** One selected impression line on an arch (slip-level, shared by all products on that jaw). */
export interface ArchImpressionEntry {
  impression_id: number;
  code: string;
  name: string;
  qty: number;
}

/** Slip-level impression state: one list per jaw. */
export interface SlipImpressionSelections {
  maxillary: ArchImpressionEntry[];
  mandibular: ArchImpressionEntry[];
}

const IMPRESSION_KEY_RE = /^([^_]+)_(maxillary|mandibular)_(.+)$/;

export function emptyImpressionSelections(): SlipImpressionSelections {
  return { maxillary: [], mandibular: [] };
}

export function isSlipImpressionSelections(
  value: unknown
): value is SlipImpressionSelections {
  if (value == null || typeof value !== "object") return false;
  const v = value as SlipImpressionSelections;
  return Array.isArray(v.maxillary) && Array.isArray(v.mandibular);
}

export function archHasImpressionSelections(
  selections: SlipImpressionSelections,
  arch: Arch
): boolean {
  return (selections[arch]?.length ?? 0) > 0;
}

export function normalizeImpressionCode(
  option: ImpressionOptionForModal | string
): string {
  if (typeof option === "string") return option.trim();
  const code = option.code ?? option.value;
  if (code != null && String(code).trim() !== "") return String(code).trim();
  const name = option.name?.trim();
  return name ?? "";
}

export function entryMatchesOption(
  entry: ArchImpressionEntry,
  option: ImpressionOptionForModal
): boolean {
  const code = normalizeImpressionCode(option);
  const label = (option.name ?? "").trim();
  return (
    entry.code === code ||
    (!!option.value && entry.code === option.value) ||
    (!!label && entry.name === label) ||
    (!!label && entry.name.toLowerCase() === label.toLowerCase())
  );
}

export function getArchImpressionQty(
  selections: SlipImpressionSelections,
  arch: Arch,
  code: string
): number {
  const entry = selections[arch].find((e) => e.code === code);
  return entry?.qty ?? 0;
}

/** Match stored arch lines to a modal option (catalog codes can differ after product reload). */
export function getArchImpressionQtyForOption(
  selections: SlipImpressionSelections,
  arch: Arch,
  option: ImpressionOptionForModal
): number {
  const code = normalizeImpressionCode(option);
  const direct = selections[arch].find((e) => e.code === code);
  if (direct) return direct.qty;
  const entry = selections[arch].find((e) => entryMatchesOption(e, option));
  return entry?.qty ?? 0;
}

export function modalOptionFromEntry(
  entry: ArchImpressionEntry
): ImpressionOptionForModal {
  const label = (entry.name || entry.code || "Impression").trim();
  return {
    id: entry.impression_id,
    name: label,
    code: entry.code,
    value: entry.code,
    label,
  };
}

/** Catalog options plus any selected codes missing from the latest product response. */
export function mergeCatalogWithArchSelections(
  catalog: ImpressionOptionForModal[],
  archEntries: ArchImpressionEntry[]
): ImpressionOptionForModal[] {
  const byCode = new Map<string, ImpressionOptionForModal>();
  for (const opt of catalog) {
    const code = normalizeImpressionCode(opt);
    if (code) byCode.set(code, opt);
  }
  for (const entry of archEntries) {
    if (entry.qty <= 0) continue;
    const code = entry.code?.trim();
    if (!code || byCode.has(code)) continue;
    byCode.set(code, modalOptionFromEntry(entry));
  }
  return [...byCode.values()];
}

/** After product API reload, align ids/names/codes without dropping selections. */
export function reconcileArchSelectionsWithCatalog(
  selections: SlipImpressionSelections,
  arch: Arch,
  catalog: ImpressionOptionForModal[]
): SlipImpressionSelections {
  if (!catalog.length) return selections;
  const list = selections[arch];
  if (!list.length) return selections;

  let changed = false;
  const next = list.map((entry) => {
    const match = catalog.find(
      (o) =>
        entryMatchesOption(entry, o) ||
        normalizeImpressionCode(o) === entry.code
    );
    if (!match) return entry;
    const code = normalizeImpressionCode(match);
    const name = (match.name ?? entry.name ?? code).trim();
    const impression_id = match.id ?? entry.impression_id;
    if (
      entry.code === code &&
      entry.name === name &&
      entry.impression_id === impression_id
    ) {
      return entry;
    }
    changed = true;
    return { ...entry, code, name, impression_id };
  });

  if (!changed) return selections;
  return { ...selections, [arch]: next };
}

export function buildImpressionDisplayText(
  selections: SlipImpressionSelections,
  arch: Arch
): string {
  return selections[arch]
    .filter((e) => e.qty > 0 && (e.name?.trim() || e.code?.trim()))
    .map((e) => `${e.qty}x ${(e.name?.trim() || e.code).trim()}`)
    .join(", ");
}

/** Map arch entries to code → qty for per-product submit snapshots. */
export function archEntriesToCodeQtyMap(
  entries: ArchImpressionEntry[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of entries) {
    if (e.qty > 0) out[e.code] = e.qty;
  }
  return out;
}

export function entryFromModalOption(
  option: ImpressionOptionForModal,
  qty: number
): ArchImpressionEntry {
  const code = option.code ?? option.value ?? option.name;
  return {
    impression_id: option.id,
    code,
    name: option.name ?? code,
    qty,
  };
}

export function setArchImpressionQty(
  selections: SlipImpressionSelections,
  arch: Arch,
  option: ImpressionOptionForModal,
  qty: number
): SlipImpressionSelections {
  const code = option.code ?? option.value ?? option.name;
  const list = selections[arch].filter((e) => e.code !== code);
  if (qty > 0) {
    list.push(entryFromModalOption(option, qty));
  }
  return { ...selections, [arch]: list };
}

export function removeArchImpression(
  selections: SlipImpressionSelections,
  arch: Arch,
  code: string
): SlipImpressionSelections {
  return {
    ...selections,
    [arch]: selections[arch].filter((e) => e.code !== code),
  };
}

/** Copy selections from one jaw to the other when the target jaw is still empty (fixed cross-arch mirror). */
export function mirrorImpressionArch(
  selections: SlipImpressionSelections,
  sourceArch: Arch,
  targetArch: Arch
): SlipImpressionSelections | null {
  if (sourceArch === targetArch) return null;
  if (selections[sourceArch].length === 0) return null;
  if (selections[targetArch].length > 0) return null;
  return {
    ...selections,
    [targetArch]: selections[sourceArch].map((e) => ({ ...e })),
  };
}

export function getDualModalArches(
  oppositeImpression: "Yes" | "No" | undefined,
  currentArch: Arch
): Arch[] {
  if (oppositeImpression === "Yes") {
    return ["maxillary", "mandibular"];
  }
  return [currentArch];
}

/** Touch id for modal UI (per arch + code, no product id). */
export function impressionTouchKey(arch: Arch, code: string): string {
  return `${arch}:${code}`;
}

/** Hydrate virtual slips / legacy flat keys into arch lists. */
export function migrateLegacyFlatImpressions(
  flat: Record<string, number>
): SlipImpressionSelections {
  const next = emptyImpressionSelections();
  const byArchCode = {
    maxillary: new Map<string, ArchImpressionEntry>(),
    mandibular: new Map<string, ArchImpressionEntry>(),
  };

  for (const [key, qty] of Object.entries(flat)) {
    if (qty <= 0) continue;
    const match = key.match(IMPRESSION_KEY_RE);
    if (!match) continue;
    const arch = match[2] as Arch;
    const code = match[3];
    const prev = byArchCode[arch].get(code);
    const mergedQty = Math.max(prev?.qty ?? 0, qty);
    byArchCode[arch].set(code, {
      impression_id: prev?.impression_id ?? 0,
      code,
      name: prev?.name ?? code,
      qty: mergedQty,
    });
  }

  for (const arch of ["maxillary", "mandibular"] as const) {
    next[arch] = [...byArchCode[arch].values()];
  }
  return next;
}

/** Resolve impression_id for submit from a product catalog. */
export function resolveImpressionIdForProduct(
  code: string,
  productImpressions: ProductImpression[] | undefined,
  fallbackEntry: ArchImpressionEntry
): number {
  const imp = productImpressions?.find((i) => i.code === code);
  return imp?.impression_id ?? imp?.id ?? fallbackEntry.impression_id ?? 0;
}
