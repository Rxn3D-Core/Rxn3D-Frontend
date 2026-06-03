import type { RushArchSlot } from "@/components/case-design-center/utils/rushModalContext";
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
      const api = p.apiProduct ?? {};
      const cardId = Number(api?.id ?? api?.product?.id ?? 0);
      return cardId === slot.cardId;
    });
    const api = product?.apiProduct ?? {};
    const apiProductId = Number(api?.product?.id ?? api?.product_id ?? 0);
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
