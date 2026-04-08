"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { useSlipCreation } from "@/contexts/slip-creation-context";
import { PatientHeader } from "@/components/case-design-center/components/PatientHeader";
import { CaseDesignCenter } from "@/components/case-design-center/components/CaseDesignCenter";

export default function VirtualSlipPage() {
  const params = useParams();
  const slipId = Number(params.caseNumber);

  const { fetchVirtualSlipDetails, virtualSlipDetails } = useSlipCreation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slipId || isNaN(slipId)) return;
    fetchVirtualSlipDetails(slipId).finally(() => setLoading(false));
  }, [slipId]);

  const slip = virtualSlipDetails?.slips?.[0] ?? null;

  const doctorImageUrl = slip?.doctor?.image ?? null;
  const doctorName = slip?.doctor
    ? `${slip.doctor.first_name ?? ""} ${slip.doctor.last_name ?? ""}`.trim()
    : null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Page header: practice logo + HMCi3 logo */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#d9d9d9] bg-white">
        <div className="flex items-center gap-3">
          {/* Practice logo — falls back gracefully if not available */}
          <div className="w-[140px] h-[50px] relative">
            <Image
              src="/images/practice-logo.png"
              alt="Practice logo"
              fill
              className="object-contain object-left"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Image
            src="/images/hmci3-logo.png"
            alt="HMCi3"
            width={120}
            height={50}
            className="object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      </div>

      {/* Patient header — submitted/read-only mode */}
      {loading ? (
        <div className="px-6 py-4 animate-pulse">
          <div className="h-[110px] bg-gray-100 rounded" />
        </div>
      ) : (
        <PatientHeader
          doctorImageUrl={doctorImageUrl}
          doctorName={doctorName}
          patientName={virtualSlipDetails?.patient_name ?? null}
          gender={virtualSlipDetails?.gender ?? null}
          age={virtualSlipDetails?.age ?? null}
          caseSubmitted
          slipHeaderLoading={false}
          slipResponseData={virtualSlipDetails}
        />
      )}

      {/* Case Design Center — read-only */}
      <div className="flex-1 overflow-auto">
        {!loading && (
          <CaseDesignCenter
            caseSubmitted
            right1Brand=""
            setRight1Brand={() => {}}
            right1Platform=""
            setRight1Platform={() => {}}
            right2Brand=""
            setRight2Brand={() => {}}
            right2Platform=""
            setRight2Platform={() => {}}
          />
        )}
      </div>
    </div>
  );
}
