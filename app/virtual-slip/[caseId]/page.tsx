import { LegacyVirtualSlipRedirect } from "@/components/virtual-slip/LegacyVirtualSlipRedirect";

/**
 * Legacy single-segment route (`/virtual-slip/{slipId}`).
 * The first segment is the slip id historically; resolve case id and redirect
 * to `/virtual-slip/{caseId}/{slipId}`.
 */
export default function LegacyVirtualSlipSingleSegmentPage({
  params,
}: {
  params: { caseId: string };
}) {
  return <LegacyVirtualSlipRedirect slipIdParam={params.caseId} />;
}
