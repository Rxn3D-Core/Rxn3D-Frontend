"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Play, X } from "lucide-react";
import { VirtualSlipPauseIcon } from "@/components/virtual-slip/VirtualSlipPauseIcon";
import { useSlipCreation } from "@/contexts/slip-creation-context";
import { isSlipCaseCancelled, isSlipCaseOnHold } from "@/lib/slip-case-status";
import { catalogAddonsFromProductPayload } from "@/lib/slip-product-addon-catalog";
import { virtualSlipSlotsToAddonArchSlots } from "@/lib/virtual-slip-addon-slots";
import { buildVirtualSlipRushArchSlots } from "@/lib/virtual-slip-rush-slots";
import { postSlipReadyToSend } from "@/lib/api/slip-ready-to-send";
import { useSignatureRequirementSettings } from "@/hooks/use-signature-requirement-settings";
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
import {
  buildVirtualSlipVM,
  collectPendingLabRecommendationImplants,
  isEditableVirtualSlipImplant,
  isPendingLabRecommendationImplant,
  type ImplantVM,
  type ProductVM,
} from "@/lib/virtual-slip-view-model";
import { resolveSlipDeliveryDates } from "@/lib/virtual-slip-rush-dates";
import { useToast } from "@/components/ui/use-toast";
import { VirtualSlipHeader } from "@/components/virtual-slip/VirtualSlipHeader";
import { VirtualSlipArch } from "@/components/virtual-slip/VirtualSlipArch";
import type { AddOnsProduct } from "@/components/add-ons-modal";
import { VirtualSlipNotes } from "@/components/virtual-slip/VirtualSlipNotes";
import { VirtualSlipCenterActions } from "@/components/virtual-slip/VirtualSlipCenterActions";
import { VirtualSlipToolbarRow } from "@/components/virtual-slip/VirtualSlipToolbarRow";
import DriverHistoryModal from "@/components/driver-history-modal";
import ReadyToSendModal from "@/components/ready-to-send-modal";
import ChangeDateModal from "@/components/change-date-modal";
import { SlipDriverHistoryViewModal } from "@/components/slip-driver-history-view-modal";
import { buildPickupDeliveryEntryFromSlip } from "@/lib/virtual-slip-pickup-entry";
import SlipAttachmentBrowserDialog from "@/components/slip-attachment-browser-dialog";
import CaseActionModal from "@/components/CaseActionModal";
import SendCaseBackToOfficeModal from "@/components/send-case-back-to-office-modal";
import { resolveCaseStatementBillingId } from "@/lib/case-statement-print";
import { useGenerateVirtualStatementMutation } from "@/lib/redux/api/billingApi";
import { resolveVirtualSlipCaseId } from "@/lib/virtual-slip-case-id";
import { collectStageSeedsFromVirtualSlip } from "@/lib/api/slip-notes";
import { useCaseSlipNotes } from "@/hooks/use-case-slip-notes";
import { resolveSlipCancelDetail, resolveSlipHoldDetail } from "@/lib/slip-hold-info";
import { VirtualSlipHoldBanner } from "@/components/virtual-slip/VirtualSlipHoldBanner";
import {
  canSubmitSlipRush,
  getStoredSlipUserRole,
  isLabSlipUserRole,
} from "@/lib/slip-user-role";
import { isOfficeCustomerContext } from "@/lib/role-utils";
import { usePaperSlipInPagePrintV2 } from "@/hooks/use-paper-slip-in-page-print-v2";
import { consumeSlipAutoPrint } from "@/lib/paper-slip-auto-print";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { usePermissionCapabilities } from "@/hooks/use-permission-capabilities";
import { useBusinessSettingsQuery } from "@/hooks/use-business-settings";
import { resolveLabIdFromSlipDetails } from "@/lib/add-stage/preload-state";
import { resolveLibraryCustomerId } from "@/components/case-design-center/utils/libraryCustomerId";
import { LabImplantSelectionModal } from "@/components/virtual-slip/LabImplantSelectionModal";
import { isPlaceholderDeliveryTime } from "@/utils/time-utils";

type CaseStatusModal = "hold" | "resume" | "cancel" | null;

/**
 * Redesigned, view-only virtual slip page.
 * Renders slip details directly from the API via a flat view model — it does
 * NOT reuse the editable CaseDesignCenter/MaxillaryPanel engine.
 */
export default function VirtualSlipV2Page() {
  const params = useParams();
  const router = useRouter();
  const routeCaseId = Number(params.caseId);
  const slipId = Number(params.slipId);

  const { toast } = useToast();
  const { canEditSlip, canCancelCase, canDeleteCase } = usePermissionCapabilities();
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
  const [pickupDropoffOpen, setPickupDropoffOpen] = useState(false);
  const [driverHistoryViewOpen, setDriverHistoryViewOpen] = useState(false);
  const [fabNotesOpen, setFabNotesOpen] = useState(false);
  const [fabRushOpen, setFabRushOpen] = useState(false);
  const [readyToSendOpen, setReadyToSendOpen] = useState(false);
  const [readyToSendSubmitting, setReadyToSendSubmitting] = useState(false);
  const { readyToSendRequired } = useSignatureRequirementSettings(readyToSendOpen);
  const [caseStatusModal, setCaseStatusModal] = useState<CaseStatusModal>(null);
  const [caseStatusSubmitting, setCaseStatusSubmitting] = useState(false);
  const [actionModalScope, setActionModalScope] = useState<"case" | "arch">("case");
  const [actionModalArch, setActionModalArch] = useState<"Upper" | "Lower" | undefined>(
    undefined
  );
  const [sendBackToOfficeOpen, setSendBackToOfficeOpen] = useState(false);
  const [sendBackToOfficeSubmitting, setSendBackToOfficeSubmitting] =
    useState(false);
  const [changeDateOpen, setChangeDateOpen] = useState(false);
  const [labImplantModalOpen, setLabImplantModalOpen] = useState(false);
  const [labImplantModalTargets, setLabImplantModalTargets] = useState<ImplantVM[]>([]);
  const [addStageEligible, setAddStageEligible] = useState(false);
  const [notesRefreshKey, setNotesRefreshKey] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const labCustomerId = useMemo(
    () => resolveLibraryCustomerId(resolveLabIdFromSlipDetails(virtualSlipDetails)),
    [virtualSlipDetails]
  );
  const { data: businessSettings } = useBusinessSettingsQuery(labCustomerId);
  const rushCaseSchedule = businessSettings?.case_schedule ?? null;
  const labBusinessHours = businessSettings?.business_hours ?? null;

  useEffect(() => {
    setUserRole(getStoredSlipUserRole());
  }, []);

  const canRunLabDriverActions = isLabSlipUserRole(userRole);
  // Office profiles can see rush status on the slip but must not submit/remove
  // rush here — only during slip creation. Match office listing `allowRush={false}`.
  const canRushFromVirtualSlip =
    canSubmitSlipRush(userRole) && !isOfficeCustomerContext();

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
        if (cancelled) return;
        const products = res.data?.products ?? [];
        setAddStageEligible(
          Boolean(res.data?.eligible) || products.some((p) => p.eligible)
        );
      })
      .catch(() => {
        if (!cancelled) setAddStageEligible(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slipId, slipLocationRefForEligibility]);

  const vm = useMemo(
    () =>
      buildVirtualSlipVM(virtualSlipDetails, {
        defaultDeliveryTime: rushCaseSchedule?.default_delivery_time,
      }),
    [virtualSlipDetails, rushCaseSchedule?.default_delivery_time]
  );

  const pendingLabImplants = useMemo(
    () => collectPendingLabRecommendationImplants(vm),
    [vm]
  );
  const hasPendingLabImplants = pendingLabImplants.length > 0;

  const openLabImplantModal = (implants: ImplantVM[]) => {
    if (implants.length === 0) return;
    setLabImplantModalTargets(implants);
    setLabImplantModalOpen(true);
  };

  const openSelectLabImplantsForProduct = (product: ProductVM) => {
    openLabImplantModal(product.implants.filter(isPendingLabRecommendationImplant));
  };

  const openEditLabImplantsForProduct = (product: ProductVM) => {
    openLabImplantModal(product.implants.filter(isEditableVirtualSlipImplant));
  };

  const caseId = useMemo(
    () => resolveVirtualSlipCaseId(virtualSlipDetails),
    [virtualSlipDetails]
  );

  // Keep the URL case segment aligned with the loaded slip when bookmarks/links
  // used a wrong case id (or an outdated one).
  useEffect(() => {
    if (!caseId || !slipId || Number.isNaN(slipId)) return;
    if (routeCaseId === caseId) return;
    router.replace(`/virtual-slip/${caseId}/${slipId}`);
  }, [caseId, routeCaseId, router, slipId]);

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
    const route = isLabSlipUserRole(getStoredSlipUserRole())
      ? "/lab-case-management"
      : "/office-case-management";
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

  // Hold/cancel is recorded on the slip's own status (holdSlip/cancelSlip act on
  // the slip) — case_status may lag or aggregate other slips, so check slipStatus.
  // slipStatus already falls back to case_status when the slip status is empty.
  const caseOnHold = isSlipCaseOnHold(vm.header.slipStatus);
  const caseCancelled = isSlipCaseCancelled(vm.header.slipStatus);

  const archesOnHold = useMemo(() => {
    const labels: Array<"Upper" | "Lower"> = [];
    if (vm.arches.maxillary?.products?.some((p) => p.status === "On hold")) {
      labels.push("Upper");
    }
    if (vm.arches.mandibular?.products?.some((p) => p.status === "On hold")) {
      labels.push("Lower");
    }
    return labels;
  }, [vm.arches.maxillary?.products, vm.arches.mandibular?.products]);

  const archesCancelled = useMemo(() => {
    const labels: Array<"Upper" | "Lower"> = [];
    if (vm.arches.maxillary?.products?.some((p) => p.status === "cancelled")) {
      labels.push("Upper");
    }
    if (vm.arches.mandibular?.products?.some((p) => p.status === "cancelled")) {
      labels.push("Lower");
    }
    return labels;
  }, [vm.arches.maxillary?.products, vm.arches.mandibular?.products]);

  const upperOnHold = archesOnHold.includes("Upper");
  const lowerOnHold = archesOnHold.includes("Lower");
  const upperCancelled = !caseCancelled && archesCancelled.includes("Upper");
  const lowerCancelled = !caseCancelled && archesCancelled.includes("Lower");
  const archOnlyOnHold = !caseOnHold && archesOnHold.length > 0;

  const openCaseStatusModal = useCallback(
    (
      action: Exclude<CaseStatusModal, null>,
      options?: { scope?: "case" | "arch"; arch?: "Upper" | "Lower" }
    ) => {
      setActionModalScope(options?.scope ?? "case");
      setActionModalArch(options?.arch);
      setCaseStatusModal(action);
    },
    []
  );

  const closeCaseStatusModal = useCallback(() => {
    if (caseStatusSubmitting) return;
    setCaseStatusModal(null);
    setActionModalScope("case");
    setActionModalArch(undefined);
  }, [caseStatusSubmitting]);

  const upperHoldStage = useMemo(() => {
    return vm.arches.maxillary?.products?.find((p) => p.status === "On hold")?.stage ?? null;
  }, [vm.arches.maxillary?.products]);

  const lowerHoldStage = useMemo(() => {
    return vm.arches.mandibular?.products?.find((p) => p.status === "On hold")?.stage ?? null;
  }, [vm.arches.mandibular?.products]);

  const { notes: caseNotes } = useCaseSlipNotes(caseId, {
    refreshKey: notesRefreshKey,
    enabled: (caseOnHold || caseCancelled || archOnlyOnHold) && caseId != null,
  });

  const holdDetail = useMemo(() => {
    if (!caseOnHold && !archOnlyOnHold) return null;
    return resolveSlipHoldDetail(caseNotes, slipId, virtualSlipDetails);
  }, [caseOnHold, archOnlyOnHold, caseNotes, slipId, virtualSlipDetails]);

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

  const { print: printPaperSlip, portal: paperSlipPortal, isPrinting } = usePaperSlipInPagePrintV2();
  const handlePrint = useCallback(() => {
    if (!slipId || isNaN(slipId)) return;
    printPaperSlip([slipId], []);
  }, [slipId, printPaperSlip]);

  // A freshly created slip is marked by the submit flow; consuming the flag
  // auto-opens the paper slip print window once — reloads never re-trigger it.
  useEffect(() => {
    if (!slipId || isNaN(slipId)) return;
    if (consumeSlipAutoPrint(slipId)) {
      printPaperSlip([slipId], []);
    }
  }, [slipId, printPaperSlip]);

  const submitCaseStatusAction = async (
    action: Exclude<CaseStatusModal, null>,
    reason: string,
    options?: import("@/lib/api/slip-case-actions").SlipCaseActionOptions
  ) => {
    if (!slipId || isNaN(slipId)) return;
    const scope = options?.scope ?? "case";
    if (action === "hold" && !canPutOnHold) {
      toast({
        title: "Cannot put on hold",
        description: SLIP_HOLD_REQUIRES_IN_LAB_MESSAGE,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    if (action === "resume" && scope === "case" && !caseOnHold) {
      toast({
        title: "Cannot resume case",
        description: "Resume is only available when the case is on hold.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    const scopeLabel =
      scope === "arch" ? options?.arch ?? "Arch" : "Case";
    const successTitle =
      action === "hold"
        ? `${scopeLabel} put on hold`
        : action === "resume"
          ? `${scopeLabel} resumed`
          : `${scopeLabel} cancelled`;
    const errorTitle =
      action === "hold"
        ? `Unable to put ${scopeLabel.toLowerCase()} on hold`
        : action === "resume"
          ? `Unable to resume ${scopeLabel.toLowerCase()}`
          : `Unable to cancel ${scopeLabel.toLowerCase()}`;
    const fallbackSuccess =
      action === "hold"
        ? `The ${scopeLabel.toLowerCase()} has been put on hold.`
        : action === "resume"
          ? `The ${scopeLabel.toLowerCase()} has been resumed.`
          : `The ${scopeLabel.toLowerCase()} has been cancelled.`;
    const fallbackError =
      action === "hold"
        ? `Could not put ${scopeLabel.toLowerCase()} on hold.`
        : action === "resume"
          ? `Could not resume ${scopeLabel.toLowerCase()}.`
          : `Could not cancel ${scopeLabel.toLowerCase()}.`;

    setCaseStatusSubmitting(true);
    try {
      const fn =
        action === "hold"
          ? holdSlip
          : action === "resume"
            ? resumeSlip
            : cancelSlip;
      const res = await fn(slipId, reason, options);
      toast({
        title: successTitle,
        description: res?.message ?? fallbackSuccess,
        duration: 3000,
      });
      setCaseStatusModal(null);
      setActionModalScope("case");
      setActionModalArch(undefined);
      await fetchVirtualSlipDetails(slipId);
      setNotesRefreshKey((key) => key + 1);
    } catch (err) {
      toast({
        title: errorTitle,
        description: err instanceof Error ? err.message : fallbackError,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setCaseStatusSubmitting(false);
    }
  };

  const handleConfirmSendBackToOffice = async (reason: string) => {
    if (!slipId || isNaN(slipId) || !reason.trim()) return;
    if (hasPendingLabImplants) {
      toast({
        title: "Implant details required",
        description:
          "Complete lab implant recommendations before sending this case to the next location.",
        variant: "destructive",
      });
      setSendBackToOfficeOpen(false);
      openLabImplantModal(pendingLabImplants);
      return;
    }

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

  const { hasMaxillary, hasMandibular, visibleArches } = vm.productArchVisibility;

  const availableActionArches = useMemo(() => {
    const arches: Array<"Upper" | "Lower"> = [];
    if (hasMaxillary) arches.push("Upper");
    if (hasMandibular) arches.push("Lower");
    return arches.length > 0 ? arches : (["Upper", "Lower"] as Array<"Upper" | "Lower">);
  }, [hasMaxillary, hasMandibular]);

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

  const primaryRushSlot = rushArchSlots[0];

  const pickupDropoffAction = slipPickupDropoffAction(slipLocationRef);
  const showReadyToSendFab = slipCanReadyToSend(slipLocationRef);
  const showPickupDropoffFab = slipShowsPickupDropoff(slipLocationRef);

  return (
    <div className="flex min-h-full flex-col bg-white">
      <VirtualSlipHeader
        header={vm.header}
        onPrint={handlePrint}
        onPrintInvoice={handlePrintInvoice}
        locationAction={{
          pickupDropoffAction:
            canRunLabDriverActions && showPickupDropoffFab ? pickupDropoffAction : null,
          pickupDropoffLabel: slipPickupDropoffLabel(pickupDropoffAction),
          onPickupDropoff:
            canRunLabDriverActions ? () => setPickupDropoffOpen(true) : undefined,
          showReadyToSend: canRunLabDriverActions && showReadyToSendFab,
          onReadyToSend:
            canRunLabDriverActions
              ? () => {
                  if (hasPendingLabImplants) {
                    toast({
                      title: "Implant details required",
                      description:
                        "Complete lab implant recommendations before marking ready to send.",
                      variant: "destructive",
                    });
                    openLabImplantModal(pendingLabImplants);
                    return;
                  }
                  setReadyToSendOpen(true);
                }
              : undefined,
          showAddStage: showAddStageFab,
          onAddStage: handleAddStage,
          disabled: caseBlocked,
        }}
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
                  caseCancelled ? undefined : () => openCaseStatusModal("resume")
                }
                onCancel={
                  caseCancelled || slipInOffice || !canCancelCase
                    ? undefined
                    : () => openCaseStatusModal("cancel")
                }
              />
            </div>
          </>
        ) : null}
        {canRunLabDriverActions && slipInLab && hasPendingLabImplants ? (
          <div className="relative z-10 mx-6 mt-3 flex items-center justify-between gap-3 rounded-md border border-[#f3d48a] bg-[#fff8e8] px-4 py-3">
            <p className="text-sm text-[#4C4D55]">
              Lab recommendation requested. Select implant details before sending this case.
            </p>
            <button
              type="button"
              className="shrink-0 rounded-md bg-[#1162a8] px-3 py-1.5 text-sm font-medium text-white"
              onClick={() => openLabImplantModal(pendingLabImplants)}
            >
              Select implant
            </button>
          </div>
        ) : null}
        {/* Column headers */}
        <div className="relative flex gap-[120px] px-6 pt-1">
          <div className="min-w-0 flex-1 text-center font-sans text-[20px] font-bold leading-[21px] tracking-[-0.02em] text-[#4C4D55]">
            {hasMaxillary ? "MAXILLARY" : null}
          </div>
          <div className="min-w-0 flex-1 text-center font-sans text-[20px] font-bold leading-[21px] tracking-[-0.02em] text-[#4C4D55]">
            {hasMandibular ? "MANDIBULAR" : null}
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 flex justify-center"
            aria-hidden
          >
            <span className="whitespace-nowrap font-sans text-[20px] font-bold leading-[21px] tracking-[-0.02em] text-[#4C4D55]">
              CASE DESIGN CENTER
            </span>
          </div>
        </div>
        {/* Column content — per-arch hold (cream/blue) or cancelled (pink) per Figma. */}
        <div className="flex gap-[120px] px-6 pb-1 pt-1">
          <div className="min-w-0 flex-1">
            {maxillary ? (
              <VirtualSlipArch
                data={maxillary}
                statusBanner={
                  !caseBlocked && upperCancelled
                    ? {
                        variant: "cancelled",
                        label: "Upper",
                        otherArchLabel: hasMandibular && !lowerCancelled ? "Lower" : null,
                      }
                    : !caseBlocked && upperOnHold
                      ? {
                          variant: "hold",
                          label: "Upper",
                          stage: upperHoldStage,
                          reason: holdDetail?.reason,
                          onResume: () =>
                            openCaseStatusModal("resume", {
                              scope: "arch",
                              arch: "Upper",
                            }),
                          onCancel:
                            slipInOffice || !canCancelCase
                              ? undefined
                              : () =>
                                  openCaseStatusModal("cancel", {
                                    scope: "arch",
                                    arch: "Upper",
                                  }),
                        }
                      : null
                }
                onSelectLabImplants={
                  canRunLabDriverActions ? openSelectLabImplantsForProduct : undefined
                }
                onEditLabImplants={
                  canRunLabDriverActions ? openEditLabImplantsForProduct : undefined
                }
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            {mandibular ? (
              <VirtualSlipArch
                data={mandibular}
                statusBanner={
                  !caseBlocked && lowerCancelled
                    ? {
                        variant: "cancelled",
                        label: "Lower",
                        otherArchLabel: hasMaxillary && !upperCancelled ? "Upper" : null,
                      }
                    : !caseBlocked && lowerOnHold
                      ? {
                          variant: "hold",
                          label: "Lower",
                          stage: lowerHoldStage,
                          reason: holdDetail?.reason,
                          onResume: () =>
                            openCaseStatusModal("resume", {
                              scope: "arch",
                              arch: "Lower",
                            }),
                          onCancel:
                            slipInOffice || !canCancelCase
                              ? undefined
                              : () =>
                                  openCaseStatusModal("cancel", {
                                    scope: "arch",
                                    arch: "Lower",
                                  }),
                        }
                      : null
                }
                onSelectLabImplants={
                  canRunLabDriverActions ? openSelectLabImplantsForProduct : undefined
                }
                onEditLabImplants={
                  canRunLabDriverActions ? openEditLabImplantsForProduct : undefined
                }
              />
            ) : null}
          </div>
        </div>
      </div>

      <VirtualSlipToolbarRow
        caseId={caseId}
        relatedSlips={vm.relatedSlips}
        notesRefreshKey={notesRefreshKey}
        onBackToCaseList={goToCaseList}
      >
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
          showEditSlip={slipInLab && !caseCancelled && canEditSlip}
          caseOnHold={caseOnHold}
          rushCaseSchedule={rushCaseSchedule}
          labBusinessHours={labBusinessHours}
          onAttachments={() => setShowAttachModal(true)}
          onDriverHistory={() => setDriverHistoryViewOpen(true)}
          onChangeDate={
            canRunLabDriverActions && !caseBlocked
              ? () => setChangeDateOpen(true)
              : undefined
          }
          onHold={
            caseBlocked || slipInOffice
              ? undefined
              : () => openCaseStatusModal("hold")
          }
          canPutOnHold={canPutOnHold}
          onCancel={
            caseBlocked || slipInOffice || !canCancelCase
              ? undefined
              : () => openCaseStatusModal("cancel")
          }
          onSendBackToOffice={
            canRunLabDriverActions && canSendBackToOffice && !caseCancelled
              ? () => {
                  if (hasPendingLabImplants) {
                    toast({
                      title: "Implant details required",
                      description:
                        "Complete lab implant recommendations before sending this case to the next location.",
                      variant: "destructive",
                    });
                    openLabImplantModal(pendingLabImplants);
                    return;
                  }
                  setSendBackToOfficeOpen(true);
                }
              : undefined
          }
          allowRush={canRushFromVirtualSlip}
          openNotesModal={fabNotesOpen}
          onOpenNotesModalChange={setFabNotesOpen}
          openRushModal={fabRushOpen}
          onOpenRushModalChange={setFabRushOpen}
        />
      </VirtualSlipToolbarRow>

      <VirtualSlipNotes
        caseId={caseId}
        slipId={slipId}
        stageSeeds={stageSeeds}
        notesRefreshKey={notesRefreshKey}
        onOpenNotesModal={() => setFabNotesOpen(true)}
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
        caseId={caseId ?? undefined}
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

      <ChangeDateModal
        open={changeDateOpen}
        onClose={() => setChangeDateOpen(false)}
        patient={vm.header.patientName}
        stage={primaryRushSlot?.stageName ?? stageSeeds[0]?.label ?? "Unknown Stage"}
        currentDate={slipDeliveryDates.dueDate}
        deliveryDate={slipDeliveryDates.standardDateIso}
        deliveryTime={vm.header.deliveryTime}
        deliveryTimeRaw={
          (() => {
            if (!virtualSlipDetails || typeof virtualSlipDetails !== "object") return undefined;
            const d = (virtualSlipDetails as Record<string, unknown>).delivery as Record<string, unknown> | undefined;
            const raw = typeof d?.delivery_time === "string" ? d.delivery_time : undefined;
            if (!raw || isPlaceholderDeliveryTime(raw)) return undefined;
            return raw;
          })()
        }
        slipId={slipId}
        onSaved={() => {
          if (slipId && !isNaN(slipId)) void fetchVirtualSlipDetails(slipId);
        }}
      />

      <CaseActionModal
        open={caseStatusModal === "hold"}
        onClose={closeCaseStatusModal}
        onSubmitAction={(payload) =>
          void submitCaseStatusAction("hold", payload.reason, {
            scope: payload.scope,
            arch: payload.arch,
          })
        }
        actionType="hold"
        title="Hold"
        description="Choose whether to hold the whole case or one arch (Upper/Lower)."
        icon={<VirtualSlipPauseIcon className="h-7 w-7" />}
        iconBgColor="#FFF3DF"
        iconColor="#FFB400"
        buttonText={caseStatusSubmitting ? "Saving…" : "Put on hold"}
        buttonColor="warning"
        reasonPlaceholder="Please provide a reason for hold."
        enableScopePicker
        availableArches={availableActionArches}
        initialScope={actionModalScope}
        initialArch={actionModalArch}
        lockScopeSelection={actionModalScope === "arch" && !!actionModalArch}
      />

      <CaseActionModal
        open={caseStatusModal === "resume"}
        onClose={closeCaseStatusModal}
        onSubmitAction={(payload) =>
          void submitCaseStatusAction("resume", payload.reason, {
            scope: payload.scope,
            arch: payload.arch,
          })
        }
        actionType="resume"
        title="Resume"
        description={
          actionModalScope === "arch" && actionModalArch
            ? `You are resuming the ${actionModalArch} arch.`
            : "Resume the case or an arch that was previously put on hold."
        }
        icon={<Play />}
        iconBgColor="#EAF7EA"
        iconColor="#43A047"
        buttonText={caseStatusSubmitting ? "Saving…" : "Resume"}
        buttonColor="success"
        reasonPlaceholder="Please provide a reason for resume."
        enableScopePicker
        availableArches={availableActionArches}
        initialScope={actionModalScope}
        initialArch={actionModalArch}
        lockScopeSelection={actionModalScope === "arch" && !!actionModalArch}
      />

      <CaseActionModal
        open={caseStatusModal === "cancel"}
        onClose={closeCaseStatusModal}
        onSubmitAction={(payload) =>
          void submitCaseStatusAction("cancel", payload.reason, {
            scope: payload.scope,
            arch: payload.arch,
          })
        }
        actionType="cancel"
        title="Cancel"
        description={
          actionModalScope === "arch" && actionModalArch
            ? `You are cancelling the ${actionModalArch} arch. The other arch stays active.`
            : "Choose case or arch. Cancelling one arch does not cancel the case."
        }
        icon={<X />}
        iconBgColor="#fdecec"
        iconColor="#D32F2F"
        buttonText={caseStatusSubmitting ? "Cancelling…" : "Cancel"}
        buttonColor="error"
        reasonPlaceholder="Please provide a reason for cancellation."
        warning="Case cancel stops all arches. Arch cancel leaves the other arch active."
        enableScopePicker
        availableArches={availableActionArches}
        initialScope={actionModalScope}
        initialArch={actionModalArch}
        lockScopeSelection={actionModalScope === "arch" && !!actionModalArch}
      />

      <LabImplantSelectionModal
        open={labImplantModalOpen}
        slipId={slipId}
        implants={labImplantModalTargets}
        labCustomerId={labCustomerId}
        onClose={() => {
          setLabImplantModalOpen(false);
          setLabImplantModalTargets([]);
        }}
        onSaved={() => {
          if (slipId && !isNaN(slipId)) void fetchVirtualSlipDetails(slipId);
        }}
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
        signatureRequired={readyToSendRequired}
      />

      {paperSlipPortal}
      <LoadingOverlay isLoading={isPrinting} title="Preparing Paper Slip" message="Please wait while we prepare your paper slip for printing…" />

      <SlipAttachmentBrowserDialog
        open={showAttachModal}
        onClose={() => setShowAttachModal(false)}
        caseId={caseId ?? undefined}
        slipId={slipId}
        doctorName={vm.header.doctorName}
        patientName={vm.header.patientName}
        isCaseSubmitted={false}
      />
    </div>
  );
}
