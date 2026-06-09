/** App route for virtual slip v2 (`/virtual-slip-v2/[caseNumber]`). */
export function buildVirtualSlipV2Path(slipId: number | string): string {
  return `/virtual-slip-v2/${slipId}`;
}
