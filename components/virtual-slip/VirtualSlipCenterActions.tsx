"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CenterActionIcons } from "@/components/case-design-center/components/CenterActionIcons";
import AddOnsModal, { type AddOnsProduct } from "@/components/add-ons-modal";
import RushRequestModal from "@/components/rush-request-modal";
import type { RushArchSlot } from "@/components/case-design-center/utils/rushModalContext";
import type { VirtualSlipRushArchSlot } from "@/lib/virtual-slip-rush-slots";
import { SlipNotesModal } from "@/components/virtual-slip/SlipNotesModal";
import { useSlipCreation } from "@/contexts/slip-creation-context";
import { useToast } from "@/components/ui/use-toast";
import type { CaseNoteStageSeed } from "@/lib/api/slip-notes";
import type { SlipProductArchKey } from "@/lib/virtual-slip-view-model";
import type { CaseSchedule, BusinessHour } from "@/lib/api-business-settings";

export interface VirtualSlipCenterActionsProps {
  slipId: number;
  caseId?: number | null;
  slipNumber?: string;
  caseNumber?: string;
  patientName?: string;
  stageLabel?: string;
  deliveryDateDisplay?: string;
  deliveryTimeDisplay?: string;
  notesRefreshKey?: number;
  stageSeeds?: CaseNoteStageSeed[];
  productName?: string;
  productStage?: string;
  deliveryDateIso?: string;
  slipIsRush?: boolean;
  rushArchSlots?: VirtualSlipRushArchSlot[];
  addonArchSlots?: RushArchSlot[];
  addonProducts?: AddOnsProduct[];
  onNotesChanged?: (summaryText: string) => void;
  onAddonsChanged?: () => void;
  onRushChanged?: () => void;
  hasMaxillary?: boolean;
  hasMandibular?: boolean;
  visibleArches?: SlipProductArchKey[];
  showEditSlip?: boolean;
  onAttachments?: () => void;
  openNotesModal?: boolean;
  onOpenNotesModalChange?: (open: boolean) => void;
  openRushModal?: boolean;
  onOpenRushModalChange?: (open: boolean) => void;
  onDriverHistory?: () => void;
  onCallLog?: () => void;
  onSendBackToOffice?: () => void;
  onHold?: () => void;
  onCancel?: () => void;
  canPutOnHold?: boolean;
  /** When true, edit slip, add-ons, and rush icons are hidden. */
  caseOnHold?: boolean;
  /** Lab-only: rush changes delivery date on an existing slip. */
  allowRush?: boolean;
  rushCaseSchedule?: CaseSchedule | null;
  labBusinessHours?: BusinessHour[] | null;
}

/** Center-column action icons + modals for virtual slip v2 (CASE DESIGN CENTER). */
export function VirtualSlipCenterActions({
  slipId,
  caseId,
  slipNumber,
  caseNumber,
  patientName,
  stageLabel = "",
  deliveryDateDisplay = "",
  deliveryTimeDisplay = "",
  notesRefreshKey = 0,
  stageSeeds = [],
  productName = "Case",
  productStage = "Unknown Stage",
  deliveryDateIso = "",
  slipIsRush = false,
  rushArchSlots = [],
  addonArchSlots = [],
  addonProducts = [],
  onNotesChanged,
  onAddonsChanged,
  onRushChanged,
  hasMaxillary = true,
  hasMandibular = true,
  visibleArches,
  showEditSlip = false,
  onAttachments,
  openNotesModal,
  onOpenNotesModalChange,
  openRushModal,
  onOpenRushModalChange,
  onDriverHistory,
  onCallLog,
  onSendBackToOffice,
  onHold,
  onCancel,
  canPutOnHold = true,
  caseOnHold = false,
  allowRush = true,
  rushCaseSchedule = null,
  labBusinessHours = null,
}: VirtualSlipCenterActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { requestSlipRush, cancelSlipRush } = useSlipCreation();
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [addonsModalOpen, setAddonsModalOpen] = useState(false);
  const [rushModalOpen, setRushModalOpen] = useState(false);
  const [rushSubmitting, setRushSubmitting] = useState(false);

  const productArches =
    visibleArches ??
    ([
      ...(hasMaxillary ? (["maxillary"] as const) : []),
      ...(hasMandibular ? (["mandibular"] as const) : []),
    ] as SlipProductArchKey[]);

  useEffect(() => {
    if (openNotesModal) setNotesModalOpen(true);
  }, [openNotesModal]);

  useEffect(() => {
    if (allowRush && openRushModal) setRushModalOpen(true);
  }, [allowRush, openRushModal]);

  const handleRemoveRush = async () => {
    if (!slipId || slipId <= 0) return;
    setRushSubmitting(true);
    try {
      await cancelSlipRush(slipId);
      toast({
        title: "Rush removed",
        description: "The rush request was cancelled.",
        duration: 3000,
      });
      setRushModalOpen(false);
      onRushChanged?.();
    } catch (error) {
      toast({
        title: "Unable to remove rush",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRushSubmitting(false);
    }
  };

  const handleConfirmRush = async (rushData: { targetDate?: string | null }) => {
    if (!slipId || slipId <= 0) return;
    if (!rushData?.targetDate) {
      toast({
        title: "Rush date required",
        description: "Please select a target delivery date first.",
        variant: "destructive",
      });
      return;
    }

    setRushSubmitting(true);
    try {
      await requestSlipRush(slipId, {
        requested_delivery_date: rushData.targetDate,
      });
      toast({
        title: "Rush case updated",
        description: "The rush request was submitted successfully.",
        duration: 3000,
      });
      setRushModalOpen(false);
      onRushChanged?.();
    } catch (error) {
      toast({
        title: "Unable to rush case",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRushSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-center">
        <CenterActionIcons
          visible
          showFullIconRow
          virtualSlipIconSizing
          onEditGeneral={
            showEditSlip && slipId > 0 && !caseOnHold
              ? () => router.push(`/edit-slip?slipId=${slipId}`)
              : undefined
          }
          onStickyNote={slipId > 0 ? () => setNotesModalOpen(true) : undefined}
          onAddProduct={
            slipId > 0 && productArches.length > 0 && !caseOnHold
              ? () => setAddonsModalOpen(true)
              : undefined
          }
          onRush={
            allowRush &&
            slipId > 0 &&
            rushArchSlots.length > 0 &&
            !rushSubmitting &&
            !caseOnHold
              ? () => setRushModalOpen(true)
              : undefined
          }
          onAttach={onAttachments}
          onDriverHistory={onDriverHistory}
          onCallLog={onCallLog}
          onSendBackToOffice={onSendBackToOffice}
          onHold={onHold}
          onCancel={onCancel}
          canPutOnHold={canPutOnHold}
        />
      </div>

      {slipId > 0 && addonsModalOpen && productArches.length > 0 && (
        <AddOnsModal
          isOpen
          onClose={() => setAddonsModalOpen(false)}
          onAddAddOns={() => {}}
          labId={0}
          productId=""
          arch={productArches[0] ?? "maxillary"}
          visibleArches={productArches}
          archSlots={addonArchSlots}
          products={addonProducts}
          slipId={slipId}
          onSlipAddonsSaved={() => {
            onAddonsChanged?.();
            setAddonsModalOpen(false);
          }}
        />
      )}

      {allowRush && slipId > 0 && rushModalOpen && rushArchSlots.length > 0 && (
        <RushRequestModal
          isOpen
          onClose={() => {
            setRushModalOpen(false);
            onOpenRushModalChange?.(false);
          }}
          onConfirm={handleConfirmRush}
          isRushed={slipIsRush || rushArchSlots.some((s) => s.isRushed)}
          existingRushDate={
            rushArchSlots.find((s) => s.existingRushDate)?.existingRushDate
          }
          onRemoveRush={handleRemoveRush}
          onRemoveRushByKey={() => {
            void handleRemoveRush();
          }}
          maxRushed={rushArchSlots.some((s) => s.arch === "maxillary" && s.isRushed)}
          maxExistingRushDate={
            rushArchSlots.find((s) => s.arch === "maxillary")?.existingRushDate
          }
          mandRushed={rushArchSlots.some((s) => s.arch === "mandibular" && s.isRushed)}
          mandExistingRushDate={
            rushArchSlots.find((s) => s.arch === "mandibular")?.existingRushDate
          }
          onRemoveMaxRush={
            rushArchSlots.some((s) => s.arch === "maxillary" && s.isRushed)
              ? handleRemoveRush
              : undefined
          }
          onRemoveMandRush={
            rushArchSlots.some((s) => s.arch === "mandibular" && s.isRushed)
              ? handleRemoveRush
              : undefined
          }
          archSlots={rushArchSlots}
          hasMaxillary={
            rushArchSlots.length > 0
              ? rushArchSlots.some((s) => s.arch === "maxillary")
              : hasMaxillary
          }
          hasMandibular={
            rushArchSlots.length > 0
              ? rushArchSlots.some((s) => s.arch === "mandibular")
              : hasMandibular
          }
          product={{
            name: rushArchSlots[0]?.productName ?? productName,
            stage: rushArchSlots[0]?.stageName ?? productStage,
            deliveryDate: deliveryDateIso,
            price: rushArchSlots.reduce((sum, s) => sum + (s.price ?? 0), 0),
          }}
          rushCaseSchedule={rushCaseSchedule}
          labBusinessHours={labBusinessHours}
        />
      )}

      {slipId > 0 && (
        <SlipNotesModal
          isOpen={notesModalOpen}
          onClose={() => {
            setNotesModalOpen(false);
            onOpenNotesModalChange?.(false);
          }}
          slipId={slipId}
          caseId={caseId}
          slipNumber={slipNumber}
          patientName={patientName}
          caseNumber={caseNumber}
          stageLabel={stageLabel || productStage}
          deliveryDateDisplay={deliveryDateDisplay}
          deliveryTimeDisplay={deliveryTimeDisplay}
          isRush={slipIsRush}
          notesRefreshKey={notesRefreshKey}
          stageSeeds={stageSeeds}
          onNotesChanged={onNotesChanged}
        />
      )}
    </>
  );
}
