import { LegacyVirtualSlipRedirect } from "@/components/virtual-slip/LegacyVirtualSlipRedirect";

/**
 * Legacy v2 single-segment route (`/virtual-slip-v2/{slipId}`).
 * Resolves case id and redirects to `/virtual-slip/{caseId}/{slipId}`.
 */
export default function LegacyVirtualSlipV2Page({
  params,
}: {
  params: { caseNumber: string };
}) {
  return <LegacyVirtualSlipRedirect slipIdParam={params.caseNumber} />;
}
