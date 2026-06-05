import type { RushArchSlot } from "@/components/case-design-center/utils/rushModalContext";
import { resolveSlipCatalogProductId } from "@/lib/slip-product-addon-catalog";
import type { VirtualSlipRushArchSlot } from "./virtual-slip-rush-slots";
import type { VirtualSlipVM } from "./virtual-slip-view-model";

/** Map virtual-slip product slots to add-ons modal columns (slip creation parity). */
export function virtualSlipSlotsToAddonArchSlots(
  slots: VirtualSlipRushArchSlot[],
  arches: VirtualSlipVM["arches"]
): RushArchSlot[] {
  return slots.map((slot) => {
    const archVm = arches[slot.arch];
    const product = archVm?.products.find((p) => {
      const api = (p.apiProduct ?? {}) as Record<string, unknown>;
      const catalogId = resolveSlipCatalogProductId(api);
      const cardId = Number(api?.id ?? catalogId) || catalogId;
      return cardId === slot.cardId;
    });
    const api = (product?.apiProduct ?? {}) as Record<string, unknown>;
    const apiProductId = resolveSlipCatalogProductId(api);
    return {
      arch: slot.arch,
      archLabel: slot.archLabel,
      productName: slot.productName,
      apiProductId,
      cardId: slot.cardId,
      repTooth: slot.repTooth,
      isFixed: product?.isFixed ?? true,
      rushKey: slot.rushKey,
      actualDeliveryDate: slot.actualDeliveryDate,
      workDaysToDeliver: slot.workDaysToDeliver,
      stageName: slot.stageName,
      toothNumbersLabel: slot.toothNumbersLabel ?? "",
    };
  });
}
