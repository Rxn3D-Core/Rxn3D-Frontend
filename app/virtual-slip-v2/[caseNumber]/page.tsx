"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Pause, Play, X } from "lucide-react";
import { useSlipCreation } from "@/contexts/slip-creation-context";
import { isSlipCaseCancelled, isSlipCaseOnHold } from "@/lib/slip-case-status";
import { catalogAddonsFromProductPayload } from "@/lib/slip-product-addon-catalog";
import { virtualSlipSlotsToAddonArchSlots } from "@/lib/virtual-slip-addon-slots";
import { buildVirtualSlipRushArchSlots } from "@/lib/virtual-slip-rush-slots";
import { postSlipReadyToSend } from "@/lib/api/slip-ready-to-send";
import {
  SLIP_HOLD_REQUIRES_IN_LAB_MESSAGE,
  slipCanHold,
  slipCanReadyToSend,
  slipCanSendBackToOffice,
  slipIsInLab,
  slipIsInOffice,
  slipPickupDropoffAction,
  slipPickupDropoffLabel,
  slipShowsPickupDropoff,
} from "@/lib/slip-location";
import { fetchNewStageEligibility } from "@/lib/api/slip-new-stage-eligibility";
import { buildVirtualSlipVM } from "@/lib/virtual-slip-view-model";
import { resolveSlipDeliveryDates } from "@/lib/virtual-slip-rush-dates";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { VirtualSlipHeader } from "@/components/virtual-slip/VirtualSlipHeader";
import { VirtualSlipArch } from "@/components/virtual-slip/VirtualSlipArch";
import type { AddOnsProduct } from "@/components/add-ons-modal";
import { VirtualSlipNotes } from "@/components/virtual-slip/VirtualSlipNotes";
import { VirtualSlipCenterActions } from "@/components/virtual-slip/VirtualSlipCenterActions";
import DriverHistoryModal from "@/components/driver-history-modal";
import ReadyToSendModal from "@/components/ready-to-send-modal";
import { SlipDriverHistoryViewModal } from "@/components/slip-driver-history-view-modal";
import { buildPickupDeliveryEntryFromSlip } from "@/lib/virtual-slip-pickup-entry";
import FileAttachmentModalContent from "@/components/file-attachment-modal-content";
import CaseActionModal from "@/components/CaseActionModal";
import SendCaseBackToOfficeModal from "@/components/send-case-back-to-office-modal";
import { resolveCaseStatementBillingId } from "@/lib/case-statement-print";
import { useGenerateVirtualStatementMutation } from "@/lib/redux/api/billingApi";
import { resolveVirtualSlipCaseId } from "@/lib/virtual-slip-case-id";
import { collectStageSeedsFromVirtualSlip } from "@/lib/api/slip-notes";
import { useCaseSlipNotes } from "@/hooks/use-case-slip-notes";
import { resolveSlipCancelDetail, resolveSlipHoldDetail } from "@/lib/slip-hold-info";
import { VirtualSlipHoldBanner } from "@/components/virtual-slip/VirtualSlipHoldBanner";

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
  const [generateVirtualStatement] = useGenerateVirtualStatementMutation();
  const {
    fetchVirtualSlipDetails,
    virtualSlipDetails,
    holdSlip,
    resumeSlip,
    cancelSlip,
    sendBackToOfficeSlip,
  } = useSlipCreation();
  const [loading, setLoading] = useState(true);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachViewerOpen, setAttachViewerOpen] = useState(false);
  const [pickupDropoffOpen, setPickupDropoffOpen] = useState(false);
  const [driverHistoryViewOpen, setDriverHistoryViewOpen] = useState(false);
  const [fabNotesOpen, setFabNotesOpen] = useState(false);
  const [fabRushOpen, setFabRushOpen] = useState(false);
  const [readyToSendOpen, setReadyToSendOpen] = useState(false);
  const [readyToSendSubmitting, setReadyToSendSubmitting] = useState(false);
  const [caseStatusModal, setCaseStatusModal] = useState<CaseStatusModal>(null);
  const [caseStatusSubmitting, setCaseStatusSubmitting] = useState(false);
  const [sendBackToOfficeOpen, setSendBackToOfficeOpen] = useState(false);
  const [sendBackToOfficeSubmitting, setSendBackToOfficeSubmitting] =
    useState(false);
  const [addStageEligible, setAddStageEligible] = useState(false);
  const [notesRefreshKey, setNotesRefreshKey] = useState(0);

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

  const caseId = useMemo(
    () => resolveVirtualSlipCaseId(virtualSlipDetails),
    [virtualSlipDetails]
  );

  const stageSeeds = useMemo(
    () => collectStageSeedsFromVirtualSlip(virtualSlipDetails),
    [virtualSlipDetails]
  );

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

  const handleNotesChanged = (_summaryText?: string) => {
    if (slipId && !isNaN(slipId)) {
      void fetchVirtualSlipDetails(slipId);
    }
    setNotesRefreshKey((key) => key + 1);
  };

  const goToCaseList = () => {
    const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    const route = role === "lab_admin" ? "/lab-case-management" : "/office-case-management";
    router.push(route);
  };

  const handlePrintInvoice = useCallback(() => {
    void (async () => {
      const billingId = resolveCaseStatementBillingId(virtualSlipDetails);
      if (billingId == null) {
        toast({
          title: "Statement not available",
          description: "No billing invoice was found for this case yet.",
          variant: "destructive",
        });
        return;
      }

      try {
        const result = await generateVirtualStatement(billingId).unwrap();
        const html = result?.data?.html;
        const printUrl = result?.data?.print_url;

        if (printUrl) {
          window.open(printUrl, "_blank", "width=1200,height=900");
          return;
        }

        if (!html) {
          toast({
            title: "Statement unavailable",
            description: "The server did not return a statement for this case.",
            variant: "destructive",
          });
          return;
        }

        const win = window.open("about:blank", "_blank", "width=1200,height=900");
        if (!win) {
          toast({
            title: "Pop-up blocked",
            description: "Please allow pop-ups for this site and try again.",
            variant: "destructive",
          });
          return;
        }

        const printHtml = html.includes("</body>")
          ? html.replace(
              "</body>",
              "<script>window.onload=function(){window.print();window.onafterprint=function(){window.close()};}<\/script></body>"
            )
          : `${html}<script>window.onload=function(){window.print();window.onafterprint=function(){window.close()};}<\/script>`;
        win.document.open();
        win.document.write(printHtml);
        win.document.close();
        win.focus();
      } catch {
        toast({
          title: "Failed to load statement",
          description: "Could not retrieve the statement from the server. Please try again.",
          variant: "destructive",
        });
      }
    })();
  }, [generateVirtualStatement, toast, virtualSlipDetails]);

  const handleConfirmReadyToSend = async (signature?: string) => {
    if (!slipId || isNaN(slipId)) return;
    setReadyToSendSubmitting(true);
    try {
      const res = await postSlipReadyToSend(slipId, signature);
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
  const caseCancelled = isSlipCaseCancelled(vm.header.status);

  const { notes: caseNotes } = useCaseSlipNotes(caseId, {
    refreshKey: notesRefreshKey,
    enabled: (caseOnHold || caseCancelled) && caseId != null,
  });

  const holdDetail = useMemo(() => {
    if (!caseOnHold) return null;
    return resolveSlipHoldDetail(caseNotes, slipId, virtualSlipDetails);
  }, [caseOnHold, caseNotes, slipId, virtualSlipDetails]);

  const cancelDetail = useMemo(() => {
    if (!caseCancelled) return null;
    return resolveSlipCancelDetail(caseNotes, slipId);
  }, [caseCancelled, caseNotes, slipId]);

  /** Either blocked state (hold or cancelled) overlays + disables the slip body. */
  const caseBlocked = caseOnHold || caseCancelled;

  const slipLocationRef = useMemo(
    () => ({
      locationId: vm.header.locationId,
      location: vm.header.location,
    }),
    [vm.header.locationId, vm.header.location]
  );

  const canPutOnHold = slipCanHold(slipLocationRef);
  const canSendBackToOffice = slipCanSendBackToOffice(slipLocationRef);
  const showAddStageFab = slipIsInOffice(slipLocationRef) && addStageEligible;
  const slipInOffice = slipIsInOffice(slipLocationRef);
  const slipInLab = slipIsInLab(slipLocationRef);

  const handleAddStage = useCallback(() => {
    router.push(`/add-new-stage?sourceSlipId=${slipId}`);
  }, [router, slipId]);

  const handlePrint = useCallback(() => {
    const printRoute = buildVirtualSlipPrintRoute(slipId);
    if (!printRoute) return;
    router.push(printRoute);
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
      setNotesRefreshKey((key) => key + 1);
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

  const handleConfirmSendBackToOffice = async (reason: string) => {
    if (!slipId || isNaN(slipId) || !reason.trim()) return;

    setSendBackToOfficeSubmitting(true);
    try {
      const res = await sendBackToOfficeSlip(slipId, reason.trim());
      toast({
        title: "Case sent back to office",
        description:
          res?.message ?? "The case was returned to the office successfully.",
        duration: 3000,
      });
      setSendBackToOfficeOpen(false);
      await fetchVirtualSlipDetails(slipId);
    } catch (err) {
      toast({
        title: "Unable to send case back",
        description:
          err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setSendBackToOfficeSubmitting(false);
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

  const pickupDropoffAction = slipPickupDropoffAction(slipLocationRef);
  const showReadyToSendFab = slipCanReadyToSend(slipLocationRef);
  const showPickupDropoffFab = slipShowsPickupDropoff(slipLocationRef);

  return (
    <div className="flex min-h-full flex-col bg-white">
      <VirtualSlipHeader
        header={vm.header}
        onPrint={() => window.print()}
        onPrintInvoice={handlePrintInvoice}
        onBackToCaseList={goToCaseList}
      />

      {/* Content region below the header. */}
      <div className="flex flex-1 flex-col">

      {/* Arches — two columns: MAXILLARY | MANDIBULAR. CASE DESIGN CENTER title is
          absolutely centered over the arch row. When the case is on hold this
          section gets a yellow overlay + floating hold banner; the overlay is
          scoped to just this section so it stops above the action icons/notes. */}
      <div className="relative flex-1">
        {caseBlocked ? (
          <>
            {/* Status overlay over the stage-information area — disables and
                tints it (yellow on hold, red on cancelled; faded, not blurred). */}
            <div
              className={`absolute inset-0 z-20 ${
                caseCancelled ? "bg-[#FEE2E2]/70" : "bg-[#FBEFC9]/70"
              }`}
              aria-hidden
            />
            {/* Full-width floating status banner sits above the overlay.
                Cancelled is read-only — no resume/cancel actions. */}
            <div className="absolute inset-x-0 top-0 z-30">
              <VirtualSlipHoldBanner
                variant={caseCancelled ? "cancelled" : "hold"}
                holdDetail={
                  (caseCancelled ? cancelDetail : holdDetail) ?? {
                    authorName: "Unknown",
                    heldAt: "",
                    reason: "No reason provided",
                  }
                }
                onResume={
                  caseCancelled ? undefined : () => setCaseStatusModal("resume")
                }
                onCancel={
                  caseCancelled || slipInOffice
                    ? undefined
                    : () => setCaseStatusModal("cancel")
                }
              />
            </div>
          </>
        ) : null}
        {/* Column headers */}
        <div className="relative flex gap-[120px] px-6 pt-4">
          <div className="min-w-0 flex-1 text-center font-sans text-[20px] font-bold leading-[21px] tracking-[-0.02em] text-[#4C4D55]">
            {hasMaxillary ? "MAXILLARY" : null}
          </div>
          <div className="min-w-0 flex-1 text-center font-sans text-[20px] font-bold leading-[21px] tracking-[-0.02em] text-[#4C4D55]">
            {hasMandibular ? "MANDIBULAR" : null}
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 top-4 flex justify-center"
            aria-hidden
          >
            <span className="whitespace-nowrap font-sans text-[20px] font-bold leading-[21px] tracking-[-0.02em] text-[#4C4D55]">
              CASE DESIGN CENTER
            </span>
          </div>
        </div>
        {/* Column content */}
        <div className="flex gap-[120px] px-6 pb-4 pt-3">
          <div className="min-w-0 flex-1">
            {maxillary ? <VirtualSlipArch data={maxillary} /> : null}
          </div>
          <div className="min-w-0 flex-1">
            {mandibular ? <VirtualSlipArch data={mandibular} /> : null}
          </div>
        </div>
      </div>

      <div className="flex justify-center px-6 py-2">
        <VirtualSlipCenterActions
          slipId={slipId}
          caseId={caseId}
          slipNumber={vm.header.slipNumber}
          caseNumber={vm.header.caseNumber}
          patientName={vm.header.patientName}
          stageLabel={stageSeeds[0]?.label}
          deliveryDateDisplay={slipDeliveryDates.dueDate}
          deliveryTimeDisplay={vm.header.deliveryTime}
          notesRefreshKey={notesRefreshKey}
          stageSeeds={stageSeeds}
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
          showEditSlip={slipInLab && !caseCancelled}
          onAttachments={() => setShowAttachModal(true)}
          onDriverHistory={() => setDriverHistoryViewOpen(true)}
          onHold={
            caseBlocked || slipInOffice ? undefined : () => setCaseStatusModal("hold")
          }
          canPutOnHold={canPutOnHold}
          onCancel={
            caseCancelled || slipInOffice ? undefined : () => setCaseStatusModal("cancel")
          }
          onSendBackToOffice={
            canSendBackToOffice && !caseCancelled
              ? () => setSendBackToOfficeOpen(true)
              : undefined
          }
          openNotesModal={fabNotesOpen}
          onOpenNotesModalChange={setFabNotesOpen}
          openRushModal={fabRushOpen}
          onOpenRushModalChange={setFabRushOpen}
        />
      </div>

      <VirtualSlipNotes
        caseId={caseId}
        slipId={slipId}
        stageSeeds={stageSeeds}
        notesRefreshKey={notesRefreshKey}
        relatedSlips={vm.relatedSlips}
        slipNumber={vm.header.slipNumber}
        onOpenNotesModal={() => setFabNotesOpen(true)}
        pickupDropoffAction={showPickupDropoffFab ? pickupDropoffAction : null}
        pickupDropoffLabel={slipPickupDropoffLabel(pickupDropoffAction)}
        onPickupDropoff={() => setPickupDropoffOpen(true)}
        showReadyToSend={showReadyToSendFab}
        onReadyToSend={() => setReadyToSendOpen(true)}
        showAddStage={showAddStageFab}
        onAddStage={handleAddStage}
        disableFooterAction={caseBlocked}
      />
      </div>

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

      <SendCaseBackToOfficeModal
        open={sendBackToOfficeOpen}
        onClose={() => {
          if (!sendBackToOfficeSubmitting) setSendBackToOfficeOpen(false);
        }}
        onConfirm={handleConfirmSendBackToOffice}
        loading={sendBackToOfficeSubmitting}
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

      <ReadyToSendModal
        open={readyToSendOpen}
        onClose={() => {
          if (!readyToSendSubmitting) setReadyToSendOpen(false);
        }}
        onConfirm={handleConfirmReadyToSend}
        submitting={readyToSendSubmitting}
        slipId={slipId}
        office={vm.header.officeName}
        patientName={vm.header.patientName}
        slipNumber={vm.header.slipNumber}
        location={vm.header.location}
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
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
