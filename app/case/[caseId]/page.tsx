"use client";

import { useSearchParams } from "next/navigation";
import { DriverQrLanding } from "@/components/driver-qr-landing";

export default function CaseScanPage({ params }: { params: { caseId: string } }) {
  const searchParams = useSearchParams();
  const slipsParam = searchParams.get("slips") ?? "";

  const caseId = Number(params.caseId);
  const slipIds = slipsParam
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (!caseId || slipIds.length === 0) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <h1 className="text-xl font-semibold mb-2">Invalid slip QR code</h1>
        <p className="text-muted-foreground">
          This link is missing case or slip information. Please scan the QR code on the printed slip
          again, or use the Scan Code button in the Rxn3D app.
        </p>
      </div>
    );
  }

  return <DriverQrLanding caseId={caseId} slipIds={slipIds} />;
}
