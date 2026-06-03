"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSlipCreation } from "@/contexts/slip-creation-context";
import { buildVirtualSlipVM } from "@/lib/virtual-slip-view-model";
import { VirtualSlipHeader } from "@/components/virtual-slip/VirtualSlipHeader";
import { VirtualSlipArch } from "@/components/virtual-slip/VirtualSlipArch";
import { VirtualSlipNotes } from "@/components/virtual-slip/VirtualSlipNotes";
import { FloatingActions } from "@/components/case-design-center/components/FloatingActions";

/**
 * Redesigned, view-only virtual slip page.
 * Renders slip details directly from the API via a flat view model — it does
 * NOT reuse the editable CaseDesignCenter/MaxillaryPanel engine.
 */
export default function VirtualSlipV2Page() {
  const params = useParams();
  const router = useRouter();
  const slipId = Number(params.caseNumber);

  const { fetchVirtualSlipDetails, virtualSlipDetails } = useSlipCreation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slipId || isNaN(slipId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchVirtualSlipDetails(slipId).finally(() => setLoading(false));
  }, [slipId]);

  const vm = useMemo(() => buildVirtualSlipVM(virtualSlipDetails), [virtualSlipDetails]);

  const goToCaseList = () => {
    const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    const route = role === "lab_admin" ? "/lab-case-management" : "/office-case-management";
    router.push(route);
  };

  if (loading) {
    return (
      <div className="min-h-full animate-pulse space-y-4 p-6">
        <div className="h-[110px] rounded bg-gray-100" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-[260px] rounded bg-gray-100" />
          <div className="h-[260px] rounded bg-gray-100" />
        </div>
        <div className="h-[120px] rounded bg-gray-100" />
      </div>
    );
  }

  const { maxillary, mandibular } = vm.arches;

  return (
    <div className="flex min-h-full flex-col bg-white">
      <VirtualSlipHeader header={vm.header} />

      {/* Arches */}
      <div className="flex-1">
        {/* Title row: MAXILLARY · CASE DESIGN CENTER · MANDIBULAR, aligned on one line */}
        <div className="flex items-center gap-8 px-6 py-4 font-sans text-[20px] font-bold leading-[21px] tracking-[-0.02em] text-[#4C4D55]">
          <span className="flex-1 text-center font-bold text-[20px] leading-[21px]">MAXILLARY</span>
          <span className="shrink-0 text-center font-bold text-[20px] leading-[21px]">CASE DESIGN CENTER</span>
          <span className="flex-1 text-center font-bold text-[20px] leading-[21px]">MANDIBULAR</span>
        </div>
        <div className="flex gap-8 px-6 pb-4">
          {maxillary ? <VirtualSlipArch data={maxillary} /> : <div className="flex-1" />}
          {mandibular ? <VirtualSlipArch data={mandibular} /> : <div className="flex-1" />}
        </div>
      </div>

      <VirtualSlipNotes
        notes={vm.notes}
        relatedSlips={vm.relatedSlips}
        slipNumber={vm.header.slipNumber}
      />

      {/* Floating actions — visual; reuse existing component with stub handlers */}
      <FloatingActions
        onPrint={() => window.print()}
        onBackToCaseList={goToCaseList}
        onPickupDropoff={() => {}}
      />
    </div>
  );
}
