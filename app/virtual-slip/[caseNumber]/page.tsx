"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { useSlipCreation } from "@/contexts/slip-creation-context";
import { PatientHeader } from "@/components/case-design-center/components/PatientHeader";
import { CaseDesignCenter } from "@/components/case-design-center/components/CaseDesignCenter";
import type { SlipCreationResponse } from "@/services/slip-creation-service";

/**
 * Maps the /v1/slip/slip/{id}/details response (single slip object)
 * into the SlipCreationResponse["data"] shape that PatientHeader expects.
 *
 * API response shape (virtualSlipDetails):
 *   data.id, data.slip_number, data.status
 *   data.case.case_number, data.case.patient_name, data.case.doctor.name
 *   data.casepan.number
 *   data.delivery.pickup_date, delivery_date, delivery_time
 *   data.location.name
 */
function toPatientHeaderData(d: any): SlipCreationResponse["data"] | null {
  if (!d) return null;
  return {
    id: d.id ?? 0,
    case_number: d.case?.case_number ?? "",
    patient_name: d.case?.patient_name ?? "",
    gender: d.case?.gender ?? "",
    age: d.case?.age ?? undefined,
    case_status: d.case?.case_status ?? d.status ?? "",
    slips: [
      {
        id: d.id ?? 0,
        slip_number: d.slip_number ?? "",
        status: d.status ?? "",
        location: d.location ?? null,
        casepan: d.casepan ?? null,
        delivery: d.delivery ?? null,
      },
    ],
  } as SlipCreationResponse["data"];
}

export default function VirtualSlipPage() {
  const params = useParams();
  const slipId = Number(params.caseNumber);

  const { fetchVirtualSlipDetails, virtualSlipDetails } = useSlipCreation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slipId || isNaN(slipId)) return;
    fetchVirtualSlipDetails(slipId).finally(() => setLoading(false));
  }, [slipId]);

  const doctorName = virtualSlipDetails?.case?.doctor?.name ?? null;
  const slipResponseData = toPatientHeaderData(virtualSlipDetails);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Page header: practice logo + HMCi3 logo */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#d9d9d9] bg-white">
        <div className="flex items-center gap-3">
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
          doctorName={doctorName}
          patientName={slipResponseData?.patient_name ?? null}
          gender={slipResponseData?.gender ?? null}
          age={slipResponseData?.age ?? null}
          caseSubmitted
          slipHeaderLoading={false}
          slipResponseData={slipResponseData}
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
