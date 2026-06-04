"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Pause, Play, X } from "lucide-react";
import { useSlipCreation } from "@/contexts/slip-creation-context";
import { isSlipCaseOnHold } from "@/lib/slip-case-status";
import { PatientHeader } from "@/components/case-design-center/components/PatientHeader";
import { CaseDesignCenter } from "@/components/case-design-center/components/CaseDesignCenter";
import type { SlipCreationResponse } from "@/services/slip-creation-service";
import type { AddedProduct, VirtualSlipInitialState } from "@/components/case-design-center/types";
import {
  buildAddedProducts,
  buildVirtualSlipInitialState,
  determineInitialArch,
} from "@/lib/virtual-slip-transformer";
import { FloatingActions } from "@/components/case-design-center/components/FloatingActions";
import DriverHistoryModal from "@/components/driver-history-modal";
import { SlipDriverHistoryViewModal } from "@/components/slip-driver-history-view-modal";
import { buildPickupDeliveryEntryFromSlip } from "@/lib/virtual-slip-pickup-entry";
import { postSlipReadyToSend } from "@/lib/api/slip-ready-to-send";
import {
  SLIP_HOLD_REQUIRES_IN_LAB_MESSAGE,
  slipCanHold,
  slipCanReadyToSend,
  slipPickupDropoffAction,
  slipPickupDropoffLabel,
  slipShowsPickupDropoff,
} from "@/lib/slip-location";
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
import { useRouter } from "next/navigation";
import CaseActionModal from "@/components/CaseActionModal";
import ChangeDateModal from "@/components/change-date-modal";

type CaseStatusModal = "hold" | "resume" | "cancel" | null;

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

/** Extract the products array from the API response — handles both flat and nested shapes. */
function extractProducts(details: any): unknown[] {
  if (!details) return [];
  // Try direct products array first (most likely)
  if (Array.isArray(details.products)) return details.products;
  // Try nested under slips[0]
  if (Array.isArray(details.slips?.[0]?.products)) return details.slips[0].products;
  return [];
}

export default function VirtualSlipPage() {
  const params = useParams();
  const router = useRouter();
  const slipId = Number(params.caseNumber);

  const { toast } = useToast();
  const {
    fetchVirtualSlipDetails,
    virtualSlipDetails,
    holdSlip,
    resumeSlip,
    cancelSlip,
  } = useSlipCreation();
  const [loading, setLoading] = useState(true);
  const [pickupDropoffOpen, setPickupDropoffOpen] = useState(false);
  const [driverHistoryViewOpen, setDriverHistoryViewOpen] = useState(false);
  const [readyToSendOpen, setReadyToSendOpen] = useState(false);
  const [readyToSendSubmitting, setReadyToSendSubmitting] = useState(false);
  const [caseStatusModal, setCaseStatusModal] = useState<CaseStatusModal>(null);
  const [caseStatusSubmitting, setCaseStatusSubmitting] = useState(false);
  const [changeDueDateOpen, setChangeDueDateOpen] = useState(false);

  const slipVm = useMemo(
    () => buildVirtualSlipVM(virtualSlipDetails),
    [virtualSlipDetails]
  );

  useEffect(() => {
    if (!slipId || isNaN(slipId)) return;
    fetchVirtualSlipDetails(slipId).finally(() => setLoading(false));
  }, [slipId]);

  const doctorName = virtualSlipDetails?.case?.doctor?.name ?? null;
  const slipResponseData = toPatientHeaderData(virtualSlipDetails);

  // ── Case Design Center read-only data ──────────────────────────────────────
  const apiProducts = useMemo(
    () => extractProducts(virtualSlipDetails),
    [virtualSlipDetails]
  );

  const slipDeliveryDates = useMemo(
    () => resolveSlipDeliveryDates(virtualSlipDetails, apiProducts),
    [virtualSlipDetails, apiProducts]
  );

  const addedProducts: AddedProduct[] = useMemo(
    () => buildAddedProducts(apiProducts),
    [apiProducts]
  );

  const initialSlipState: VirtualSlipInitialState = useMemo(
    () => buildVirtualSlipInitialState(apiProducts),
    [apiProducts]
  );

  const initialArch = useMemo(
    () => determineInitialArch(apiProducts),
    [apiProducts]
  );

  const labImageUrl: string | null =
    virtualSlipDetails?.lab?.image ??
    virtualSlipDetails?.case?.lab?.image ??
    null;
  const labName: string =
    virtualSlipDetails?.lab?.name ??
    virtualSlipDetails?.case?.lab?.name ??
    "Lab";

  const goToCaseList = () => {
    const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    const route = role === "lab_admin" ? "/lab-case-management" : "/office-case-management";
    router.push(route);
  };

  const slipLocationRef = useMemo(
    () => ({
      locationId: slipVm.header.locationId,
      location: slipVm.header.location,
    }),
    [slipVm.header.locationId, slipVm.header.location]
  );

  const canPutOnHold = slipCanHold(slipLocationRef);
  const caseOnHold = isSlipCaseOnHold(slipVm.header.status);

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
          err instanceof Error ? err.message : "Could not update case status.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setCaseStatusSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Page header: lab logo + HMCi3 logo */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#d9d9d9] bg-white">
        <div className="flex items-center gap-3">
          <div className="w-[140px] h-[50px] relative">
            {labImageUrl ? (
              <Image
                src={labImageUrl}
                alt={labName}
                fill
                className="object-contain object-left"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <Image
                src="/images/practice-logo.png"
                alt="Practice logo"
                fill
                className="object-contain object-left"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            )}
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
          createdByName={virtualSlipDetails?.created_by?.name ?? null}
          createdByImageUrl={virtualSlipDetails?.created_by?.image ?? null}
        />
      )}

      {/* Case Design Center — read-only with product data from API */}
      <div className="flex-1 overflow-auto">
        {!loading && (
          <CaseDesignCenter
            caseSubmitted
            addedProducts={addedProducts}
            initialSlipState={initialSlipState}
            initialArch={initialArch}
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

      {/* Floating action buttons — bottom right, same as case design center */}
      <FloatingActions
        onPrint={() => window.print()}
        onPickupDropoff={() => setPickupDropoffOpen(true)}
        onDriverHistory={() => setDriverHistoryViewOpen(true)}
        showPickupDropoff={slipShowsPickupDropoff(slipLocationRef)}
        showDriverHistoryFab
        pickupDropoffLabel={slipPickupDropoffLabel(
          slipPickupDropoffAction(slipLocationRef)
        )}
        pickupDropoffAction={slipPickupDropoffAction(slipLocationRef)}
        showReadyToSend={slipCanReadyToSend(slipLocationRef)}
        onReadyToSend={() => setReadyToSendOpen(true)}
        onBackToCaseList={goToCaseList}
        onResume={
          caseOnHold ? () => setCaseStatusModal("resume") : undefined
        }
        onHold={
          caseOnHold ? undefined : () => setCaseStatusModal("hold")
        }
        canPutOnHold={canPutOnHold}
        onCancel={
          caseOnHold ? undefined : () => setCaseStatusModal("cancel")
        }
        onChangeDueDate={() => setChangeDueDateOpen(true)}
      />

      <ChangeDateModal
        open={changeDueDateOpen}
        onClose={() => setChangeDueDateOpen(false)}
        patient={slipVm.header.patientName}
        stage={slipVm.header.location}
        currentDate={new Date().toLocaleDateString()}
        deliveryDate={
          slipDeliveryDates.isRush
            ? slipDeliveryDates.rushDateIso || slipDeliveryDates.standardDateIso
            : slipDeliveryDates.standardDateIso
        }
        deliveryTime={slipVm.header.deliveryTime}
        deliveryTimeRaw={
          (virtualSlipDetails as { delivery?: { delivery_time?: string } } | null)
            ?.delivery?.delivery_time ?? ""
        }
        slipId={slipId}
        onSaved={() => {
          if (slipId && !isNaN(slipId)) void fetchVirtualSlipDetails(slipId);
        }}
      />

      <DriverHistoryModal
        isOpen={pickupDropoffOpen}
        onClose={() => {
          setPickupDropoffOpen(false);
          if (slipId && !isNaN(slipId)) void fetchVirtualSlipDetails(slipId);
        }}
        slip={virtualSlipDetails}
        singleSlipMode
      />

      <SlipDriverHistoryViewModal
        open={driverHistoryViewOpen}
        onClose={() => setDriverHistoryViewOpen(false)}
        slipId={slipId}
        office={slipVm.header.officeName}
        code={
          buildPickupDeliveryEntryFromSlip(virtualSlipDetails)?.customer_code ??
          slipVm.header.officeName
        }
        patient={slipVm.header.patientName}
        pan={slipVm.header.panNumber}
        caseNo={slipVm.header.caseNumber}
        stage={slipVm.header.location}
        deliveryDate={slipVm.header.dueDate}
        isRush={slipVm.header.isRush}
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
              {slipVm.header.patientName
                ? `Confirm "${slipVm.header.patientName}" is ready to send?`
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
              disabled={readyToSendSubmitting}
              onClick={async () => {
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
                      description:
                        res?.message ?? "Could not mark slip as ready to send.",
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
              }}
            >
              {readyToSendSubmitting ? "Confirming…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
