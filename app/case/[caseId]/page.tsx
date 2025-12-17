"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSlipContext } from "../../lab-case-management/SlipContext";
import DriverHistoryModal from "../../../components/driver-case-history-modal";

export default function CaseScanPage({ params }: { params: { caseId: string } }) {
  const { scanQrCode, loading } = useSlipContext();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(true);

  useEffect(() => {
    const caseId = Number(params.caseId);
    const slipsParam = searchParams.get("slips");
    if (!caseId || !slipsParam) {
      setError("Missing case or slip information in URL.");
      return;
    }
    const slipIds = slipsParam.split(",").map(Number).filter(Boolean);
    if (!slipIds.length) {
      setError("No slip IDs provided.");
      return;
    }
    scanQrCode(caseId, slipIds)
      .then(res => {
        setResult(res);
        if (res && !res.success) setError(res.message || "Scan failed");
      })
      .catch(() => setError("Failed to scan QR code."));
  }, [params.caseId, searchParams, scanQrCode]);

  if (loading) return <div className="p-8 text-lg">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!result || !result.data || !result.data[0]) return null;

  // Map API data to modal props
  const d = result.data[0];
  return (
    <DriverHistoryModal
      open={modalOpen}
      onClose={() => setModalOpen(false)}
      office={d.location || "-"}
      code={d.customer_code || "-"}
      patient={d.patient_name || "-"}
      pan={d.casepan_number || "-"}
      caseNo={d.case_number || "-"}
      slipHistories={[
        {
          slipNumber: d.slip_number || "-",
          stage: d.current_driver_location || "-",
          deliveryDate: "-", // No delivery date in response
          isRush: false // No rush info in response
        }
      ]}
      timeline={[]}
    />
  );
}
