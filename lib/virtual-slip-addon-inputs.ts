/**
 * Build the add-ons and rush modal inputs from a virtual-slip details payload,
 * exactly as the virtual slip page does. Shared so the slip listing's add-ons
 * and rush popups use the same per-product catalog, arch slots, and
 * previously-selected/rushed state as the virtual slip.
 */

import { buildVirtualSlipVM } from "@/lib/virtual-slip-view-model";
import { resolveSlipDeliveryDates } from "@/lib/virtual-slip-rush-dates";
import {
  buildVirtualSlipRushArchSlots,
  type VirtualSlipRushArchSlot,
} from "@/lib/virtual-slip-rush-slots";
import { virtualSlipSlotsToAddonArchSlots } from "@/lib/virtual-slip-addon-slots";
import { catalogAddonsFromProductPayload } from "@/lib/slip-product-addon-catalog";
import type { RushArchSlot } from "@/components/case-design-center/utils/rushModalContext";
import type { AddOnsProduct } from "@/components/add-ons-modal";

export type VirtualSlipAddonInputs = {
  addonArchSlots: RushArchSlot[];
  addonProducts: AddOnsProduct[];
  /** Rush modal columns (per arch/product), same as the virtual slip. */
  rushArchSlots: VirtualSlipRushArchSlot[];
  /** Standard (non-rush) delivery date ISO — feeds the rush modal product. */
  deliveryDateIso: string;
  /** Whether the slip is currently rushed. */
  slipIsRush: boolean;
};

export function buildVirtualSlipAddonInputs(
  virtualSlipDetails: unknown
): VirtualSlipAddonInputs {
  const vm = buildVirtualSlipVM(virtualSlipDetails);

  const products = Array.isArray(
    (virtualSlipDetails as { products?: unknown[] } | null)?.products
  )
    ? (virtualSlipDetails as { products: unknown[] }).products
    : [];

  const slipDeliveryDates = resolveSlipDeliveryDates(virtualSlipDetails, products);
  const rushArchSlots = buildVirtualSlipRushArchSlots(
    vm.arches,
    slipDeliveryDates.standardDateIso
  );
  const addonArchSlots = virtualSlipSlotsToAddonArchSlots(rushArchSlots, vm.arches);

  const seen = new Set<number>();
  const addonProducts: AddOnsProduct[] = [];
  for (const slot of addonArchSlots) {
    const pid = slot.apiProductId;
    if (!pid || seen.has(pid)) continue;
    seen.add(pid);
    const archVm = vm.arches[slot.arch];
    const card = archVm?.products.find((p) => {
      const api = (p.apiProduct ?? {}) as Record<string, unknown>;
      const nested = (api?.product ?? {}) as Record<string, unknown>;
      const cardId = Number(api?.id ?? nested?.id ?? 0);
      return cardId === slot.cardId;
    });
    const api = (card?.apiProduct ?? {}) as Record<string, unknown>;
    const nested = (api?.product ?? {}) as Record<string, unknown>;
    const catalogAddons = catalogAddonsFromProductPayload(nested?.addons);
    addonProducts.push({
      id: pid,
      name: slot.productName ?? (nested?.name as string | undefined) ?? "Product",
      addons: catalogAddons ?? undefined,
    });
  }

  return {
    addonArchSlots,
    addonProducts,
    rushArchSlots,
    deliveryDateIso: slipDeliveryDates.standardDateIso,
    slipIsRush: slipDeliveryDates.isRush,
  };
}
