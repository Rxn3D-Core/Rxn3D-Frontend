import type { ProductApiData, ProductAddon, Arch } from "../types";
import type { FieldStep } from "../hooks/useToothFieldProgress";

export type StoredAddonEntry = {
  addon_id?: number;
  qty?: number;
  quantity?: number;
  name?: string;
  addOn?: string;
  label?: string;
};

function isActiveAddon(addon: ProductAddon): boolean {
  return String(addon.status ?? "Active").trim().toLowerCase() !== "inactive";
}

/** Same default-qty rules as the add-ons modal when seeding from product config. */
export function getDefaultSeedQtyFromProductAddon(a: {
  id?: number;
  addon_id?: number;
  status?: string;
  is_default?: string;
  quantity?: number;
}): number | null {
  const addonId = a.addon_id ?? a.id;
  if (!addonId) return null;
  const status = String(a.status ?? "Active").trim().toLowerCase();
  if (status === "inactive") return null;
  const isDef = String(a.is_default ?? "").trim().toLowerCase() === "yes";
  const qRaw = a.quantity;
  const q =
    typeof qRaw === "number"
      ? qRaw
      : qRaw != null && String(qRaw).trim() !== ""
        ? Number(qRaw)
        : NaN;
  if (isDef) {
    if (Number.isFinite(q) && q > 0) return Math.max(1, Math.floor(q));
    return 1;
  }
  if (Number.isFinite(q) && q > 0) return Math.max(1, Math.floor(q));
  return null;
}

function addonEntryName(entry: StoredAddonEntry): string {
  return (entry.name ?? entry.addOn ?? entry.label ?? "").trim();
}

function addonEntryQty(entry: StoredAddonEntry): number {
  const q = entry.qty ?? entry.quantity ?? 0;
  return q > 0 ? q : 0;
}

function lookupAddonName(
  addonId: number,
  productAddons: ProductAddon[] | undefined
): string {
  const match = (productAddons ?? []).find(
    (a) => a.addon_id === addonId || a.id === addonId
  );
  return match?.name?.trim() ?? "";
}

export function formatAddonDisplayLabel(name: string, qty: number): string {
  return `${qty}x ${name}`;
}

/** Build the comma-separated add-ons label from structured or store entries. */
export function buildAddonDisplayFromEntries(
  entries: Array<{ addon_id: number; qty: number; name?: string }>
): string {
  return entries
    .filter((e) => e.qty > 0 && e.name)
    .map((e) => formatAddonDisplayLabel(e.name!, e.qty))
    .join(", ");
}

export function getDefaultAddonDisplayFromProduct(
  product: Pick<ProductApiData, "addons"> | null | undefined
): string {
  const entries: Array<{ addon_id: number; qty: number; name: string }> = [];
  for (const a of product?.addons ?? []) {
    const addonId = a.addon_id ?? a.id;
    const qty = getDefaultSeedQtyFromProductAddon(a);
    if (!addonId || qty == null || qty <= 0) continue;
    const name = a.name?.trim();
    if (!name) continue;
    entries.push({ addon_id: addonId, qty, name });
  }
  return buildAddonDisplayFromEntries(entries);
}

export function structuredAddonsToDisplay(
  structured: Array<{ addon_id: number; qty: number }> | undefined,
  productAddons: ProductAddon[] | undefined
): string {
  if (!structured?.length) return "";
  const entries = structured
    .filter((e) => e.qty > 0)
    .map((e) => ({
      addon_id: e.addon_id,
      qty: e.qty,
      name: lookupAddonName(e.addon_id, productAddons),
    }))
    .filter((e) => e.name);
  return buildAddonDisplayFromEntries(entries);
}

export function storeAddonsToDisplay(
  storeAddons: StoredAddonEntry[] | undefined,
  productAddons: ProductAddon[] | undefined
): string {
  if (!storeAddons?.length) return "";
  const entries = storeAddons
    .map((entry) => {
      const addonId = entry.addon_id;
      const qty = addonEntryQty(entry);
      if (!addonId || qty <= 0) return null;
      const name = addonEntryName(entry) || lookupAddonName(addonId, productAddons);
      if (!name) return null;
      return { addon_id: addonId, qty, name };
    })
    .filter((e): e is { addon_id: number; qty: number; name: string } => e != null);
  return buildAddonDisplayFromEntries(entries);
}

export interface ResolveRemovableAddonDisplayParams {
  fieldValue?: string | null;
  structuredAddons?: Array<{ addon_id: number; qty: number }>;
  storeAddons?: StoredAddonEntry[];
  product?: Pick<ProductApiData, "addons"> | null;
}

/**
 * Resolve the add-ons label shown in product fields. Prefers saved field progress,
 * then modal store selections, structured tooth selections, then product defaults.
 */
export function resolveRemovableAddonDisplay(
  params: ResolveRemovableAddonDisplayParams
): string {
  const { fieldValue, structuredAddons, storeAddons, product } = params;
  if (hasVisibleAddonDisplay(fieldValue)) return (fieldValue ?? "").trim();

  const fromStore = storeAddonsToDisplay(storeAddons, product?.addons);
  if (hasVisibleAddonDisplay(fromStore)) return fromStore;

  const fromStructured = structuredAddonsToDisplay(structuredAddons, product?.addons);
  if (hasVisibleAddonDisplay(fromStructured)) return fromStructured;

  const fromDefaults = getDefaultAddonDisplayFromProduct(product);
  if (hasVisibleAddonDisplay(fromDefaults)) return fromDefaults;

  return "";
}

export function shouldShowRemovableAddonField(
  product: Pick<ProductApiData, "has_addon" | "addons"> | null | undefined,
  params: Omit<ResolveRemovableAddonDisplayParams, "product">
): boolean {
  if (!productSupportsAddons(product)) return false;
  return hasVisibleAddonDisplay(
    resolveRemovableAddonDisplay({ ...params, product })
  );
}

/** True when the product can offer add-ons (API flag or active catalog entries). */
export function productSupportsAddons(
  product: Pick<ProductApiData, "has_addon" | "addons"> | null | undefined
): boolean {
  if (!product) return false;
  if (product.has_addon === "No") return false;
  if (product.has_addon === "Yes") return true;
  return (product.addons ?? []).some(
    (a) => isActiveAddon(a) && (a.addon_id != null || a.id != null)
  );
}

/**
 * Parses the stored add-ons label string (comma-separated, from CaseDesignCenter) into
 * rows we should show in the UI. Omits empty selections such as "0 selected".
 */
export function parseAddonDisplayItems(addonsVal: string | undefined | null): string[] {
  const raw = (addonsVal ?? "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => {
      if (!s) return false;
      const lower = s.toLowerCase();
      if (lower === "0 selected") return false;
      return true;
    });
}

export function hasVisibleAddonDisplay(addonsVal: string | undefined | null): boolean {
  return parseAddonDisplayItems(addonsVal).length > 0;
}

function uniqueAddonLookupKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/** Collect structured addon selections stored on rep, virtual, or any card tooth. */
export function collectStructuredAddonsForCard(
  arch: Arch,
  cardId: number,
  cardTeeth: readonly number[],
  repTooth: number,
  selectedAddonsByTooth: Record<string, Array<{ addon_id: number; qty: number }>> | undefined
): Array<{ addon_id: number; qty: number }> | undefined {
  if (!selectedAddonsByTooth) return undefined;
  const virtualTooth = cardId === 0 ? -0 : -cardId;
  const keys = uniqueAddonLookupKeys([
    `${arch}_${repTooth}`,
    `${arch}_${virtualTooth}`,
    ...cardTeeth.map((tn) => `${arch}_${tn}`),
  ]);
  for (const key of keys) {
    const items = selectedAddonsByTooth[key];
    if (items?.length) return items;
  }
  return undefined;
}

/** Read saved add-on label from rep tooth, virtual slot, or any tooth on the card. */
export function resolveCardAddonFieldValue(
  arch: Arch,
  cardId: number,
  cardTeeth: readonly number[],
  repTooth: number,
  getFieldValue: (arch: Arch, toothNumber: number, step: FieldStep) => string
): string {
  const virtualTooth = cardId === 0 ? -0 : -cardId;
  const ordered: number[] = [repTooth, virtualTooth, ...cardTeeth];
  const seen = new Set<string>();
  for (const tn of ordered) {
    const sig = Object.is(tn, -0) ? "-0" : String(tn);
    if (seen.has(sig)) continue;
    seen.add(sig);
    const val = getFieldValue(arch, tn, "addons")?.trim();
    if (val) return val;
  }
  return "";
}

export interface RemovableAddonFieldContextParams {
  arch: Arch;
  cardId: number;
  cardTeeth: readonly number[];
  repTooth: number;
  product: Pick<ProductApiData, "id" | "has_addon" | "addons"> | null | undefined;
  getFieldValue: (arch: Arch, toothNumber: number, step: FieldStep) => string;
  selectedAddonsByTooth?: Record<string, Array<{ addon_id: number; qty: number }>>;
  productAddOns?: Record<string, { maxillary?: StoredAddonEntry[]; mandibular?: StoredAddonEntry[] }>;
}

export function buildRemovableAddonFieldContext(params: RemovableAddonFieldContextParams) {
  const {
    arch,
    cardId,
    cardTeeth,
    repTooth,
    product,
    getFieldValue,
    selectedAddonsByTooth,
    productAddOns,
  } = params;
  const fieldValue = resolveCardAddonFieldValue(arch, cardId, cardTeeth, repTooth, getFieldValue);
  const structuredAddons = collectStructuredAddonsForCard(
    arch,
    cardId,
    cardTeeth,
    repTooth,
    selectedAddonsByTooth
  );
  const storeAddons = product?.id
    ? productAddOns?.[product.id.toString()]?.[arch]
    : undefined;
  const display = resolveRemovableAddonDisplay({
    fieldValue,
    structuredAddons,
    storeAddons,
    product,
  });
  const show =
    productSupportsAddons(product) && hasVisibleAddonDisplay(display);
  return { fieldValue, structuredAddons, storeAddons, display, show };
}
