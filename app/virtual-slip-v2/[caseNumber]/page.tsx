"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSlipCreation } from "@/contexts/slip-creation-context";
import { virtualSlipSlotsToAddonArchSlots } from "@/lib/virtual-slip-addon-slots";
import { buildVirtualSlipRushArchSlots } from "@/lib/virtual-slip-rush-slots";
import { buildVirtualSlipVM, isoDateFromApiTimestamp } from "@/lib/virtual-slip-view-model";
import { VirtualSlipHeader } from "@/components/virtual-slip/VirtualSlipHeader";
import { VirtualSlipArch } from "@/components/virtual-slip/VirtualSlipArch";
import type { AddOnsProduct } from "@/components/add-ons-modal";
import { VirtualSlipNotes } from "@/components/virtual-slip/VirtualSlipNotes";
import { FloatingActions } from "@/components/case-design-center/components/FloatingActions";
import FileAttachmentModalContent from "@/components/file-attachment-modal-content";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Redesigned, view-only virtual slip page.
 * Renders slip details directly from the API via a flat view model — it does
 * NOT reuse the editable CaseDesignCenter/MaxillaryPanel engine.
 */
export default function VirtualSlipV2Page() {
  const params = useParams();
  const router = useRouter();
  const slipId = Number(params.caseNumber);

  const { fetchVirtualSlipDetails, virtualSlipDetails, fetchSlipAttachments } = useSlipCreation();
  const [loading, setLoading] = useState(true);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachViewerOpen, setAttachViewerOpen] = useState(false);
  const [attachedPhotoCount, setAttachedPhotoCount] = useState(0);
  const [attachedStlCount, setAttachedStlCount] = useState(0);

  useEffect(() => {
    if (!slipId || isNaN(slipId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchVirtualSlipDetails(slipId).finally(() => setLoading(false));
  }, [slipId]);

  const vm = useMemo(() => buildVirtualSlipVM(virtualSlipDetails), [virtualSlipDetails]);

  const rushDeliveryDateIso = useMemo(
    () =>
      isoDateFromApiTimestamp(
        (virtualSlipDetails as { delivery?: { delivery_date?: string } } | null)?.delivery
          ?.delivery_date
      ),
    [virtualSlipDetails]
  );

  const rushArchSlots = useMemo(
    () => buildVirtualSlipRushArchSlots(vm.arches, rushDeliveryDateIso),
    [vm.arches, rushDeliveryDateIso]
  );

  const addonArchSlots = useMemo(
    () => virtualSlipSlotsToAddonArchSlots(rushArchSlots, vm.arches),
    [rushArchSlots, vm.arches]
  );

  /** Pre-load add-ons from slip product payload when present (avoids extra product-details fetch). */
  const addonProducts = useMemo((): AddOnsProduct[] => {
    const seen = new Set<number>();
    const out: AddOnsProduct[] = [];
    for (const slot of addonArchSlots) {
      const pid = slot.apiProductId;
      if (!pid || seen.has(pid)) continue;
      seen.add(pid);
      const archVm = vm.arches[slot.arch];
      const card = archVm?.products.find((p) => {
        const api = p.apiProduct ?? {};
        const cardId = Number(api?.id ?? api?.product?.id ?? 0);
        return cardId === slot.cardId;
      });
      const api = card?.apiProduct ?? {};
      const nested = api?.product ?? {};
      const rawAddons = nested?.addons ?? api?.addons;
      out.push({
        id: pid,
        name: slot.productName ?? nested?.name ?? "Product",
        addons: Array.isArray(rawAddons) ? rawAddons : undefined,
      });
    }
    return out;
  }, [addonArchSlots, vm.arches]);

  const refreshAttachmentIndicators = useCallback(async () => {
    if (!slipId || isNaN(slipId)) return;
    const data = await fetchSlipAttachments(slipId, { archived: false, per_page: 100 });
    const photoCount = data.filter((a) => a.is_image).length;
    const stlCount = data.filter((a) => a.is_stl).length;
    setAttachedPhotoCount(photoCount);
    setAttachedStlCount(stlCount);
  }, [slipId, fetchSlipAttachments]);

  useEffect(() => {
    void refreshAttachmentIndicators();
  }, [refreshAttachmentIndicators]);

  const handleNotesChanged = (_summaryText?: string) => {
    if (slipId && !isNaN(slipId)) {
      void fetchVirtualSlipDetails(slipId);
    }
  };

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
  const { hasMaxillary, hasMandibular, visibleArches } = vm.productArchVisibility;
  const singleArchLayout = hasMaxillary !== hasMandibular;

  const primaryRushSlot = rushArchSlots[0];

  return (
    <div className="flex min-h-full flex-col bg-white">
      <VirtualSlipHeader header={vm.header} />

      {/* Arches */}
      <div className="flex-1">
        {/* Title row — only show arch labels that have products (slip creation parity) */}
        <div className="flex items-center gap-8 px-6 py-4 font-sans text-[20px] font-bold leading-[21px] tracking-[-0.02em] text-[#4C4D55]">
          {hasMaxillary ? (
            <span className="flex-1 text-center font-bold text-[20px] leading-[21px]">MAXILLARY</span>
          ) : (
            <span className="flex-1" aria-hidden />
          )}
          <span
            className={
              singleArchLayout
                ? "flex-1 text-center font-bold text-[20px] leading-[21px]"
                : "shrink-0 text-center font-bold text-[20px] leading-[21px]"
            }
          >
            CASE DESIGN CENTER
          </span>
          {hasMandibular ? (
            <span className="flex-1 text-center font-bold text-[20px] leading-[21px]">MANDIBULAR</span>
          ) : (
            <span className="flex-1" aria-hidden />
          )}
        </div>
        <div
          className={`flex gap-8 px-6 pb-4 ${singleArchLayout ? "justify-center" : ""}`}
        >
          {maxillary ? (
            <div className={singleArchLayout ? "w-full max-w-[720px] min-w-0 flex-1" : "min-w-0 flex-1"}>
              <VirtualSlipArch data={maxillary} />
            </div>
          ) : null}
          {mandibular ? (
            <div className={singleArchLayout ? "w-full max-w-[720px] min-w-0 flex-1" : "min-w-0 flex-1"}>
              <VirtualSlipArch data={mandibular} />
            </div>
          ) : null}
        </div>
      </div>

      <VirtualSlipNotes
        notes={vm.notes}
        relatedSlips={vm.relatedSlips}
        slipId={slipId}
        slipNumber={vm.header.slipNumber}
        caseNumber={vm.header.caseNumber}
        patientName={vm.header.patientName}
        onNotesChanged={handleNotesChanged}
        rushArchSlots={rushArchSlots}
        addonArchSlots={addonArchSlots}
        addonProducts={addonProducts}
        deliveryDateIso={rushDeliveryDateIso}
        productName={primaryRushSlot?.productName ?? "Case"}
        productStage={primaryRushSlot?.stageName ?? "Unknown Stage"}
        onAddonsChanged={() => {
          if (slipId && !isNaN(slipId)) void fetchVirtualSlipDetails(slipId);
        }}
        onRushChanged={() => {
          if (slipId && !isNaN(slipId)) void fetchVirtualSlipDetails(slipId);
        }}
        hasMaxillary={hasMaxillary}
        hasMandibular={hasMandibular}
        visibleArches={visibleArches}
      />

      <FloatingActions
        onPrint={() => window.print()}
        onBackToCaseList={goToCaseList}
        onPickupDropoff={() => {}}
        onAttachments={() => setShowAttachModal(true)}
        hasImageAttachment={attachedPhotoCount > 0}
        hasStlAttachment={attachedStlCount > 0}
      />

      <Dialog open={showAttachModal} onOpenChange={setShowAttachModal}>
        <DialogContent
          className={`${attachViewerOpen ? "max-w-[1700px]" : "max-w-[1100px]"} w-[95vw] h-[80vh] max-h-[800px] overflow-hidden flex flex-col p-0 transition-all duration-300`}
        >
          <DialogTitle className="sr-only">Slip attachments</DialogTitle>
          <FileAttachmentModalContent
            setShowAttachModal={setShowAttachModal}
            isCaseSubmitted={false}
            slipId={slipId}
            doctorName={vm.header.doctorName}
            patientName={vm.header.patientName}
            onViewerToggle={setAttachViewerOpen}
            onFileCountsChange={(photoCount, stlCount) => {
              setAttachedPhotoCount(photoCount);
              setAttachedStlCount(stlCount);
            }}
            onAttachmentsUploaded={() => {
              void refreshAttachmentIndicators();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
