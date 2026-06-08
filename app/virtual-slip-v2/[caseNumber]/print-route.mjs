import { buildPaperSlipPrintRoute } from "../../lab-case-management/paper-slip-print-route.mjs";

export function buildVirtualSlipPrintRoute(slipId) {
  return buildPaperSlipPrintRoute({
    customerType: "lab",
    ids: [slipId],
  });
}
