import type { ArchVM, VirtualSlipVM } from "./virtual-slip-view-model";

/** Rush modal column data for virtual slip (compatible with `RushArchSlotView`). */
export interface VirtualSlipRushArchSlot {
  arch: "maxillary" | "mandibular";
  archLabel: string;
  productName: string;
  rushKey: string;
  cardId: number;
  repTooth: number;
  actualDeliveryDate: string;
  workDaysToDeliver: number;
  stageName?: string;
  toothNumbersLabel?: string;
  isRushed?: boolean;
  existingRushDate?: string;
  price?: number;
  /** Standard (non-rush) delivery date from the existing rush record. */
  normalDeliveryDate?: string;
  /** Days saved as recorded on the existing rush record. */
  existingDaysSaved?: number;
  /** Rush fee percentage from the existing rush record. */
  existingRushFeePercentage?: number;
  /** Rush fee amount (price × percentage) from the existing rush record. */
  existingRushFee?: number;
}

function parseTeeth(value: unknown): number[] {
  if (!value) return [];
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
  }
  if (Array.isArray(value)) {
    return value
      .map((v: unknown) =>
        typeof v === "number"
          ? v
          : parseInt(
              String(
                (v as { tooth_number?: number; tooth_num?: number; number?: number })
                  ?.tooth_number ??
                  (v as { tooth_num?: number })?.tooth_num ??
                  (v as { number?: number })?.number ??
                  v
              ),
              10
            )
      )
      .filter((n) => !isNaN(n));
  }
  return [];
}

function isoDateFromApiTimestamp(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  return m ? m[1] : "";
}

function teethForRushRep(p: ArchVM["products"][number]): number[] {
  const api = p.apiProduct ?? {};
  const fromApi = parseTeeth(api?.teeth_selection ?? api?.teeth);
  if (fromApi.length > 0) return fromApi;
  if (p.teethLabel.startsWith("#")) {
    const numbersPart = p.teethLabel.replace(/^#'s\s+/, "").replace(/^#/, "");
    return numbersPart
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
  }
  return [];
}

/**
 * Rush modal columns for virtual slip: one slot per product, only on arches that
 * have products (same visibility rules as slip creation / case design center).
 */
export function buildVirtualSlipRushArchSlots(
  arches: VirtualSlipVM["arches"],
  deliveryDateIso: string
): VirtualSlipRushArchSlot[] {
  const slots: VirtualSlipRushArchSlot[] = [];
  const deliveryIso = deliveryDateIso || "";

  for (const archKey of ["maxillary", "mandibular"] as const) {
    const archVm = arches[archKey];
    if (!archVm?.products?.length) continue;

    const archLabel = archKey === "maxillary" ? "Upper" : "Lower";

    for (const p of archVm.products) {
      const api = p.apiProduct ?? {};
      const catalogId = Number(api?.product?.id ?? api?.product_id ?? 0);
      const cardId = Number(api?.id ?? catalogId) || catalogId;
      const teeth = teethForRushRep(p);
      const repTooth = teeth.length > 0 ? Math.min(...teeth) : 0;
      const rush = api?.rush ?? {};
      const existingIso = isoDateFromApiTimestamp(
        rush?.requested_rush_date ??
          rush?.requested_delivery_date ??
          api?.requested_rush_date
      );

      const normalDeliveryIso = isoDateFromApiTimestamp(
        rush?.normal_delivery_date ?? rush?.non_rush_delivery_date
      );
      const daysSaved =
        rush?.days_saved != null ? Number(rush.days_saved) : undefined;
      const feePercentage =
        rush?.fixed_rush_fee_percentage != null
          ? Number(rush.fixed_rush_fee_percentage)
          : undefined;
      const unitPrice = Number(api?.price ?? api?.product?.price ?? 0) || 0;
      const rushFee =
        feePercentage != null
          ? Math.round(unitPrice * (feePercentage / 100) * 100) / 100
          : undefined;

      slots.push({
        arch: archKey,
        archLabel,
        productName: p.productName || p.title || "Product",
        rushKey: `virtual_${archKey}_${cardId}`,
        cardId,
        repTooth,
        actualDeliveryDate: deliveryIso,
        workDaysToDeliver:
          Number(api?.stage?.work_days ?? api?.work_days_to_deliver) || 0,
        stageName: p.stage || undefined,
        toothNumbersLabel: p.teethLabel || undefined,
        isRushed: Boolean(rush?.is_rush ?? api?.is_rush),
        existingRushDate: existingIso || undefined,
        price: unitPrice,
        normalDeliveryDate: normalDeliveryIso || undefined,
        existingDaysSaved: daysSaved,
        existingRushFeePercentage: feePercentage,
        existingRushFee: rushFee,
      });
    }
  }

  return slots;
}

