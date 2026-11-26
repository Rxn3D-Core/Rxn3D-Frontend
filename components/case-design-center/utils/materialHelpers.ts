import type { AddedProduct, Arch, ProductApiData } from "../types";
import type { FieldStep } from "../hooks/useToothFieldProgress";
import { isNoToothChartProduct } from "./noToothChartProduct.ts";
import {
  resolveAddedCardProductData,
  resolveCardFieldValue,
} from "./resolveAddedCardProduct.ts";

export type MaterialOption = { material_id: number; name: string; is_default?: string };

type MaterialProduct = Pick<ProductApiData, "has_material" | "materials"> | null | undefined;

/** Materials a slip can pick: Material is on and the material is linked and Active. */
export function getSelectableMaterials(product: MaterialProduct): MaterialOption[] {
  if (!product || product.has_material !== "Yes") return [];
  return (product.materials ?? [])
    .filter((m) => (m.status ?? "Active") === "Active")
    .map((m) => ({
      material_id: Number(m.material_id ?? m.id ?? 0),
      name: m.name ?? "",
      is_default: m.is_default,
    }))
    .filter((m) => m.material_id > 0);
}

/** Stored field value: JSON `{ material_id, name }`, or a plain material name. */
export function parseMaterialFieldValue(raw: string | undefined): {
  material_id?: number;
  name: string;
} {
  const text = raw?.trim() ?? "";
  if (!text) return { name: "" };
  try {
    const parsed = JSON.parse(text);
    const id = Number(parsed.material_id ?? parsed.id ?? 0);
    return { ...(id > 0 ? { material_id: id } : {}), name: String(parsed.name ?? "") };
  } catch {
    return { name: text };
  }
}

export function serializeMaterialFieldValue(material: MaterialOption): string {
  return JSON.stringify({ material_id: material.material_id, name: material.name });
}

/**
 * The material in effect for a product: the stored choice when the product offers it,
 * otherwise the default material, otherwise the only one. A stored material the product
 * does not offer (left over from another product) is never used.
 */
export function resolveSelectedMaterial(
  product: MaterialProduct,
  raw: string | undefined
): MaterialOption | undefined {
  const options = getSelectableMaterials(product);
  const stored = parseMaterialFieldValue(raw);
  const chosen = options.find((m) =>
    stored.material_id ? m.material_id === stored.material_id : m.name === stored.name
  );
  return (
    chosen ??
    options.find((m) => m.is_default === "Yes") ??
    (options.length === 1 ? options[0] : undefined)
  );
}

/** True when any product card on the arch needs a material and none is chosen. */
export function isArchMaterialMissing({
  arch,
  allArchTeeth,
  activeTeeth,
  addedProducts,
  card0Product,
  getToothProduct,
  getToothProductCard,
  getFieldValue,
}: {
  arch: Arch;
  allArchTeeth: readonly number[];
  /** Teeth that carry a product line: retention teeth plus selected teeth. */
  activeTeeth: readonly number[];
  addedProducts: readonly AddedProduct[];
  /** Card 0 product when it has no tooth chart (it never owns active teeth). */
  card0Product: ProductApiData | null;
  getToothProduct: (arch: Arch, toothNumber: number) => ProductApiData | null;
  getToothProductCard: (arch: Arch, toothNumber: number) => number;
  getFieldValue: (arch: Arch, toothNumber: number, step: FieldStep) => string;
}): boolean {
  const active = new Set(activeTeeth);
  const cardIds = new Set<number>(
    allArchTeeth.filter((tn) => active.has(tn)).map((tn) => getToothProductCard(arch, tn))
  );
  const stubFor = (cardId: number) =>
    cardId === 0
      ? card0Product
      : addedProducts.find((ap) => ap.arch === arch && ap.id === cardId)?.product ?? null;
  const noChartCardIds = [
    0,
    ...addedProducts.filter((ap) => ap.arch === arch).map((ap) => ap.id),
  ].filter((id) => !cardIds.has(id) && isNoToothChartProduct(stubFor(id)));

  return [...cardIds, ...noChartCardIds].some((cardId) => {
    const owned = allArchTeeth.filter(
      (tn) =>
        getToothProductCard(arch, tn) === cardId && (active.has(tn) || getToothProduct(arch, tn))
    );
    const teeth = owned.filter((tn) => active.has(tn));
    const cardTeeth = teeth.length > 0 ? teeth : [cardId === 0 ? owned[0] ?? -0 : -cardId];
    const product = resolveAddedCardProductData(
      arch,
      cardId,
      cardTeeth,
      getToothProduct,
      stubFor(cardId)
    );
    if (getSelectableMaterials(product).length === 0) return false;
    const raw = resolveCardFieldValue(
      arch,
      cardId,
      owned,
      cardTeeth[0],
      "material",
      getFieldValue
    );
    return !resolveSelectedMaterial(product, raw);
  });
}
