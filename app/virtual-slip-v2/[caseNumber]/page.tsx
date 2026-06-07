"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Pause, Play, X } from "lucide-react";
import { useSlipCreation } from "@/contexts/slip-creation-context";
import { isSlipCaseOnHold } from "@/lib/slip-case-status";
import { catalogAddonsFromProductPayload } from "@/lib/slip-product-addon-catalog";
import { virtualSlipSlotsToAddonArchSlots } from "@/lib/virtual-slip-addon-slots";
import { buildVirtualSlipRushArchSlots } from "@/lib/virtual-slip-rush-slots";
import { postSlipReadyToSend } from "@/lib/api/slip-ready-to-send";
import {
  SLIP_HOLD_REQUIRES_IN_LAB_MESSAGE,
  slipCanHold,
  slipCanReadyToSend,
  slipIsInLab,
  slipIsInOffice,
  slipPickupDropoffAction,
  slipPickupDropoffLabel,
  slipShowsPickupDropoff,
} from "@/lib/slip-location";
import { fetchNewStageEligibility } from "@/lib/api/slip-new-stage-eligibility";
import { buildVirtualSlipVM } from "@/lib/virtual-slip-view-model";
import { resolveSlipDeliveryDates } from "@/lib/virtual-slip-rush-dates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { VirtualSlipHeader } from "@/components/virtual-slip/VirtualSlipHeader";
import { VirtualSlipArch } from "@/components/virtual-slip/VirtualSlipArch";
import type { AddOnsProduct } from "@/components/add-ons-modal";
import { VirtualSlipNotes } from "@/components/virtual-slip/VirtualSlipNotes";
import { FloatingActions } from "@/components/case-design-center/components/FloatingActions";
import DriverHistoryModal from "@/components/driver-history-modal";
import { SlipDriverHistoryViewModal } from "@/components/slip-driver-history-view-modal";
import { buildPickupDeliveryEntryFromSlip } from "@/lib/virtual-slip-pickup-entry";
import FileAttachmentModalContent from "@/components/file-attachment-modal-content";
import CaseActionModal from "@/components/CaseActionModal";
import ChangeDateModal from "@/components/change-date-modal";

type CaseStatusModal = "hold" | "resume" | "cancel" | null;

/**
 * Redesigned, view-only virtual slip page.
 * Renders slip details directly from the API via a flat view model — it does
 * NOT reuse the editable CaseDesignCenter/MaxillaryPanel engine.
 */
export default function VirtualSlipV2Page() {
  const params = useParams();
  const router = useRouter();
  const slipId = Number(params.caseNumber);

  const { toast } = useToast();
  const {
    fetchVirtualSlipDetails,
    virtualSlipDetails,
    fetchSlipAttachments,
    holdSlip,
    resumeSlip,
    cancelSlip,
  } = useSlipCreation();
  const [loading, setLoading] = useState(true);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachViewerOpen, setAttachViewerOpen] = useState(false);
  const [attachedPhotoCount, setAttachedPhotoCount] = useState(0);
  const [attachedStlCount, setAttachedStlCount] = useState(0);
  const [pickupDropoffOpen, setPickupDropoffOpen] = useState(false);
  const [driverHistoryViewOpen, setDriverHistoryViewOpen] = useState(false);
  const [fabNotesOpen, setFabNotesOpen] = useState(false);
  const [fabRushOpen, setFabRushOpen] = useState(false);
  const [readyToSendOpen, setReadyToSendOpen] = useState(false);
  const [readyToSendSubmitting, setReadyToSendSubmitting] = useState(false);
  const [caseStatusModal, setCaseStatusModal] = useState<CaseStatusModal>(null);
  const [caseStatusSubmitting, setCaseStatusSubmitting] = useState(false);
  const [changeDueDateOpen, setChangeDueDateOpen] = useState(false);
  const [addStageEligible, setAddStageEligible] = useState(false);

  useEffect(() => {
    if (!slipId || isNaN(slipId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchVirtualSlipDetails(slipId).finally(() => setLoading(false));
  }, [slipId, fetchVirtualSlipDetails]);

  const slipLocationRefForEligibility = useMemo(() => {
    const vmEarly = buildVirtualSlipVM(virtualSlipDetails);
    return {
      locationId: vmEarly.header.locationId,
      location: vmEarly.header.location,
    };
  }, [virtualSlipDetails]);

  useEffect(() => {
    if (!slipId || isNaN(slipId)) {
      setAddStageEligible(false);
      return;
    }
    if (!slipIsInOffice(slipLocationRefForEligibility)) {
      setAddStageEligible(false);
      return;
    }
    let cancelled = false;
    fetchNewStageEligibility(slipId)
      .then((res) => {
        if (!cancelled) setAddStageEligible(Boolean(res.data?.eligible));
      })
      .catch(() => {
        if (!cancelled) setAddStageEligible(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slipId, slipLocationRefForEligibility]);

  const vm = useMemo(() => buildVirtualSlipVM(virtualSlipDetails), [virtualSlipDetails]);

  const slipDeliveryDates = useMemo(
    () =>
      resolveSlipDeliveryDates(
        virtualSlipDetails,
        Array.isArray((virtualSlipDetails as { products?: unknown[] } | null)?.products)
          ? (virtualSlipDetails as { products: unknown[] }).products
          : []
      ),
    [virtualSlipDetails]
  );

  const rushArchSlots = useMemo(
    () => buildVirtualSlipRushArchSlots(vm.arches, slipDeliveryDates.standardDateIso),
    [vm.arches, slipDeliveryDates.standardDateIso]
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
      const catalogAddons = catalogAddonsFromProductPayload(nested?.addons);
      out.push({
        id: pid,
        name: slot.productName ?? nested?.name ?? "Product",
        addons: catalogAddons,
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

  const handleConfirmReadyToSend = async () => {
    if (!slipId || isNaN(slipId)) return;
    setReadyToSendSubmitting(true);
    try {
      const res = await postSlipReadyToSend(slipId);
      if (res?.success) {
        toast({
          title: "Success",
          description: res.message || "Slip marked as ready to send.",
          duration: 3000,
        });
        setReadyToSendOpen(false);
        await fetchVirtualSlipDetails(slipId);
      } else {
        toast({
          title: "Error",
          description: res?.message ?? "Could not mark slip as ready to send.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Could not mark slip as ready to send.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setReadyToSendSubmitting(false);
    }
  };

  const closePickupDropoff = () => {
    setPickupDropoffOpen(false);
    if (slipId && !isNaN(slipId)) {
      void fetchVirtualSlipDetails(slipId);
    }
  };

  const caseOnHold = isSlipCaseOnHold(vm.header.status);

  const slipLocationRef = useMemo(
    () => ({
      locationId: vm.header.locationId,
      location: vm.header.location,
    }),
    [vm.header.locationId, vm.header.location]
  );

  const canPutOnHold = slipCanHold(slipLocationRef);
  const showAddStageFab = slipIsInOffice(slipLocationRef) && addStageEligible;
  const slipInOffice = slipIsInOffice(slipLocationRef);
  const slipInLab = slipIsInLab(slipLocationRef);

  const handleAddStage = useCallback(() => {
    router.push(`/add-new-stage?sourceSlipId=${slipId}`);
  }, [router, slipId]);

  const submitCaseStatusAction = async (
    action: Exclude<CaseStatusModal, null>,
    reason: string
  ) => {
    if (!slipId || isNaN(slipId)) return;
    if (action === "hold" && !canPutOnHold) {
      toast({
        title: "Cannot put on hold",
        description: SLIP_HOLD_REQUIRES_IN_LAB_MESSAGE,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    if (action === "resume" && !caseOnHold) {
      toast({
        title: "Cannot resume case",
        description: "Resume is only available when the case is on hold.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    setCaseStatusSubmitting(true);
    try {
      const fn =
        action === "hold"
          ? holdSlip
          : action === "resume"
            ? resumeSlip
            : cancelSlip;
      const res = await fn(slipId, reason);
      toast({
        title: "Success",
        description:
          res?.message ??
          (action === "hold"
            ? "Case has been put on hold."
            : action === "resume"
              ? "Case has been resumed."
              : "Case has been cancelled."),
        duration: 3000,
      });
      setCaseStatusModal(null);
      await fetchVirtualSlipDetails(slipId);
      if (action === "cancel") {
        goToCaseList();
      }
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error
            ? err.message
            : action === "hold"
              ? "Could not put case on hold."
              : action === "resume"
                ? "Could not resume case."
                : "Could not cancel case.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setCaseStatusSubmitting(false);
    }
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

  const primaryRushSlot = rushArchSlots[0];

  const changeDueDateDeliveryIso = slipDeliveryDates.isRush
    ? slipDeliveryDates.rushDateIso || slipDeliveryDates.standardDateIso
    : slipDeliveryDates.standardDateIso;

  const changeDueDateTimeRaw =
    (virtualSlipDetails as { delivery?: { delivery_time?: string } } | null)
      ?.delivery?.delivery_time ?? "";

  const pickupDropoffAction = slipPickupDropoffAction(slipLocationRef);
  const showReadyToSendFab = slipCanReadyToSend(slipLocationRef);
  const showPickupDropoffFab = slipShowsPickupDropoff(slipLocationRef);

  return (
    <div className="flex min-h-full flex-col bg-white">
      <VirtualSlipHeader header={vm.header} />

      {/* Arches — three columns: MAXILLARY | CASE DESIGN CENTER (gap) | MANDIBULAR.
          The header row and the content row share the exact same 3-column grid, so
          every column header stays aligned with its column at any screen width. */}
      <div className="flex-1">
        {/* Column headers */}
        <div className="flex gap-8 px-6 pt-4">
          <div className="min-w-0 flex-1 text-center font-sans text-[20px] font-bold leading-[21px] tracking-[-0.02em] text-[#4C4D55]">
            {hasMaxillary ? "MAXILLARY" : null}
          </div>
          <div className="w-[240px] shrink-0 whitespace-nowrap text-center font-sans text-[20px] font-bold leading-[21px] tracking-[-0.02em] text-[#4C4D55]">
            CASE DESIGN CENTER
          </div>
          <div className="min-w-0 flex-1 text-center font-sans text-[20px] font-bold leading-[21px] tracking-[-0.02em] text-[#4C4D55]">
            {hasMandibular ? "MANDIBULAR" : null}
          </div>
        </div>
        {/* Column content */}
        <div className="flex px-6 pb-4 pt-3">
          <div className="min-w-0 flex-1">
            {maxillary ? <VirtualSlipArch data={maxillary} /> : null}
          </div>
          {/* Case Design Center column — gap between the two arches */}
          <div className="w-[240px] shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            {mandibular ? <VirtualSlipArch data={mandibular} /> : null}
          </div>
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
        deliveryDateIso={slipDeliveryDates.standardDateIso}
        slipIsRush={slipDeliveryDates.isRush}
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
        openNotesModal={fabNotesOpen}
        onOpenNotesModalChange={setFabNotesOpen}
        openRushModal={fabRushOpen}
        onOpenRushModalChange={setFabRushOpen}
      />

      <FloatingActions
        showEditSlip={slipInLab}
        onEditSlip={
          slipInLab ? () => router.push(`/edit-slip?slipId=${slipId}`) : undefined
        }
        onPrint={() => window.print()}
        onBackToCaseList={goToCaseList}
        onPickupDropoff={() => setPickupDropoffOpen(true)}
        onDriverHistory={() => setDriverHistoryViewOpen(true)}
        showPickupDropoff={showPickupDropoffFab}
        showDriverHistoryFab
        pickupDropoffLabel={slipPickupDropoffLabel(pickupDropoffAction)}
        pickupDropoffAction={pickupDropoffAction}
        showReadyToSend={showReadyToSendFab}
        onReadyToSend={() => setReadyToSendOpen(true)}
        onRush={() => setFabRushOpen(true)}
        onAttachments={() => setShowAttachModal(true)}
        hasImageAttachment={attachedPhotoCount > 0}
        hasStlAttachment={attachedStlCount > 0}
        onResume={
          caseOnHold ? () => setCaseStatusModal("resume") : undefined
        }
        onHold={
          caseOnHold || slipInOffice ? undefined : () => setCaseStatusModal("hold")
        }
        canPutOnHold={canPutOnHold}
        onCancel={
          caseOnHold || slipInOffice ? undefined : () => setCaseStatusModal("cancel")
        }
        onChangeDueDate={
          slipInOffice ? undefined : () => setChangeDueDateOpen(true)
        }
        hasNextStage={showAddStageFab}
        onAddStage={showAddStageFab ? handleAddStage : undefined}
      />

      <ChangeDateModal
        open={changeDueDateOpen}
        onClose={() => setChangeDueDateOpen(false)}
        patient={vm.header.patientName}
        stage={primaryRushSlot?.stageName ?? vm.header.location}
        currentDate={new Date().toLocaleDateString()}
        deliveryDate={changeDueDateDeliveryIso}
        deliveryTime={vm.header.deliveryTime}
        deliveryTimeRaw={changeDueDateTimeRaw}
        slipId={slipId}
        onSaved={() => {
          if (slipId && !isNaN(slipId)) void fetchVirtualSlipDetails(slipId);
        }}
      />

      <DriverHistoryModal
        isOpen={pickupDropoffOpen}
        onClose={closePickupDropoff}
        slip={virtualSlipDetails}
        singleSlipMode
      />

      <SlipDriverHistoryViewModal
        open={driverHistoryViewOpen}
        onClose={() => setDriverHistoryViewOpen(false)}
        slipId={slipId}
        office={vm.header.officeName}
        code={
          buildPickupDeliveryEntryFromSlip(virtualSlipDetails)?.customer_code ??
          vm.header.officeName
        }
        patient={vm.header.patientName}
        pan={vm.header.panNumber}
        caseNo={vm.header.caseNumber}
        stage={primaryRushSlot?.stageName ?? vm.header.location}
        deliveryDate={vm.header.dueDate}
        isRush={vm.header.isRush}
      />

      <CaseActionModal
        open={caseStatusModal === "hold"}
        onClose={() => {
          if (!caseStatusSubmitting) setCaseStatusModal(null);
        }}
        onSubmit={(reason) => void submitCaseStatusAction("hold", reason)}
        actionType="hold"
        title="Put Case On Hold"
        description="You are putting this case on hold. The delivery date will be recalculated when the case is resumed."
        icon={<Pause />}
        iconBgColor="#FFF3DF"
        iconColor="#FFB400"
        buttonText={caseStatusSubmitting ? "Saving…" : "Put case on hold"}
        buttonColor="warning"
        reasonPlaceholder="Please provide a reason for putting case on hold."
      />

      <CaseActionModal
        open={caseStatusModal === "resume"}
        onClose={() => {
          if (!caseStatusSubmitting) setCaseStatusModal(null);
        }}
        onSubmit={(reason) => void submitCaseStatusAction("resume", reason)}
        actionType="resume"
        title="Resume Case"
        description="You are resuming a case that was previously on hold. The delivery date will be updated from today's date."
        icon={<Play />}
        iconBgColor="#EAF7EA"
        iconColor="#43A047"
        buttonText={caseStatusSubmitting ? "Saving…" : "Resume Case"}
        buttonColor="success"
        reasonPlaceholder="Please provide a reason for resuming case."
      />

      <CaseActionModal
        open={caseStatusModal === "cancel"}
        onClose={() => {
          if (!caseStatusSubmitting) setCaseStatusModal(null);
        }}
        onSubmit={(reason) => void submitCaseStatusAction("cancel", reason)}
        actionType="cancel"
        title="Cancel Case"
        description="You are cancelling this case. This action cannot be undone and will mark the case as inactive."
        icon={<X />}
        iconBgColor="#fdecec"
        iconColor="#D32F2F"
        buttonText={caseStatusSubmitting ? "Cancelling…" : "Cancel Case"}
        buttonColor="error"
        reasonPlaceholder="Please provide a reason for case cancellation."
        warning="This action cannot be undone and will archive the case."
      />

      <Dialog
        open={readyToSendOpen}
        onOpenChange={(open) => {
          if (!open) setReadyToSendOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ready to send</DialogTitle>
            <DialogDescription>
              {vm.header.patientName
                ? `Confirm "${vm.header.patientName}" is ready to send?`
                : "Confirm this slip is ready to send?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              type="button"
              onClick={() => setReadyToSendOpen(false)}
              disabled={readyToSendSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#0E66B2] text-white hover:bg-[#0c5a9f]"
              onClick={handleConfirmReadyToSend}
              disabled={readyToSendSubmitting}
            >
              {readyToSendSubmitting ? "Confirming…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
