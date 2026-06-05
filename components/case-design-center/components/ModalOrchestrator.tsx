"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ImpressionSelectionModal } from "@/components/impression-selection-modal";
import AddOnsModal from "@/components/add-ons-modal";
import FileAttachmentModalContent from "@/components/file-attachment-modal-content";
import RushRequestModal from "@/components/rush-request-modal";
import {
  getRushFromStore,
  rushSlotsShareProduct,
  type RushArchSlot,
} from "../utils/rushModalContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StageSelectionModal } from "./StageSelectionModal";
import type { Arch, ImpressionOptionForModal, ProductApiData } from "../types";
import type { AddOnsConfirmMeta, AddOnsProduct } from "@/components/add-ons-modal";
import type { RushArchSlot } from "../utils/rushModalContext";
import { getResolvedStageName } from "../utils/categoryHelpers";
import type { NewStageEligibilityStageRef } from "@/lib/api/slip-new-stage-eligibility";
import { getDualModalArches } from "../utils/impressionFieldSync";
import {
  buildImpressionDisplayText,
  removeArchImpression,
  setArchImpressionQty,
  type SlipImpressionSelections,
} from "../utils/impressionStorage";

interface ModalOrchestratorProps {
  // Impression
  showImpressionModal: boolean;
  setShowImpressionModal: (v: boolean) => void;
  currentImpressionArch: Arch;
  currentImpressionProductId: string;
  currentImpressionToothNumber: number | null;
  /** Impressions from get product response (used for modal options and display text) */
  impressionOptions: ImpressionOptionForModal[];
  /** Whether the current product has opposite_impression = "Yes" — triggers split layout */
  currentImpressionOppositeImpression?: "Yes" | "No";
  /** Second grid options when dual-arch (defaults to primary list if omitted) */
  oppositeImpressions?: ImpressionOptionForModal[];
  selectedImpressions: SlipImpressionSelections;
  setSelectedImpressions: React.Dispatch<
    React.SetStateAction<SlipImpressionSelections>
  >;
  onImpressionConfirm: (displayText: string, targetArch?: Arch) => void;
  /** Called when user confirms with no impressions selected — clears the completed state */
  onImpressionClear?: (targetArch?: Arch) => void;
  /** Called when user clicks "Submit, no opposing needed" */
  onSubmitNoOpposing?: () => void;
  /** When true, hides the 'Skip Opposing' button (both arches have their own products) */
  hideSkipOpposing?: boolean;
  /** Optional title above maxillary/mandibular sections inside the impression dialog */
  impressionModalHeading?: string;
  /** Dual impression modal: main product arch row first, opposing row second */
  dualImpressionPrimaryArch?: "maxillary" | "mandibular";
  // Add-ons
  showAddOnsModal: boolean;
  setShowAddOnsModal: (v: boolean) => void;
  currentAddOnsArch: Arch;
  currentAddOnsProductId: string;
  currentAddOnsToothNumber: number | null;
  onAddOnsConfirm: (
    addOns: { addon_id: number; qty: number; category: string; subcategory: string; name: string; price: number }[],
    /** When the add-ons modal shows both arches, each arch is committed separately */
    confirmArch?: Arch,
    meta?: AddOnsConfirmMeta
  ) => void;
  /** Products available in the case — shown as tabs in add-ons modal */
  addOnsProducts?: AddOnsProduct[];
  /** Which arch columns to display in add-ons modal */
  addOnsVisibleArches?: ("maxillary" | "mandibular")[];
  /** One column per product card (same as rush modal slots). */
  addOnArchSlots?: RushArchSlot[];
  // Attachment
  showAttachModal: boolean;
  setShowAttachModal: (v: boolean) => void;
  /** Available stages derived from product API data — shown as accordion sections */
  attachmentStages?: string[];
  onAttachFileCountsChange?: (photoCount: number, stlCount: number) => void;
  // Rush
  showRushModal: boolean;
  setShowRushModal: (v: boolean) => void;
  currentRushArch: Arch;
  currentRushProductId: string;
  currentRushMaxProductId: string;
  currentRushMandProductId: string;
  handleRushConfirm: (rushData: any) => void;
  rushedProducts: Record<string, any>;
  handleRemoveRush: (arch: Arch, productId: string) => void;
  rushArchSlots?: RushArchSlot[];
  rushCaseSchedule?: import("@/lib/api-business-settings").CaseSchedule | null;
  labBusinessHours?: import("@/lib/api-business-settings").BusinessHour[] | null;
  // Stage
  isStageModalOpen: boolean;
  setIsStageModalOpen: (v: boolean) => void;
  selectedStages: Record<string, string>;
  currentStageProductId: string;
  currentStageArch: Arch;
  currentStageToothNumber: number | null;
  currentStageOptions: { name: string; letter: string; is_default?: string }[] | null;
  /** Product for the current stage step — used to resolve skip/auto when options are empty */
  currentStageProduct?: ProductApiData | null;
  handleStageSelect: (stageName: string) => void;
  onStageConfirm: (stageName: string) => void;
  /** Prior slips/stages for this arch (add-new-stage). */
  stageHistory?: NewStageEligibilityStageRef[];
  /** When true (virtual slip / read-only view), all modals are suppressed */
  caseSubmitted?: boolean;
}

/** When no stages are configured, auto-complete and close — never show a blocking error. */
function AutoSkipEmptyStages({
  isOpen,
  onSkip,
  onClose,
}: {
  isOpen: boolean;
  onSkip: () => void;
  onClose: () => void;
}) {
  const didSkipRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      didSkipRef.current = false;
      return;
    }
    if (didSkipRef.current) return;
    didSkipRef.current = true;
    onSkip();
    onClose();
  }, [isOpen, onSkip, onClose]);

  return null;
}

/** When only 1 stage is available or a default stage exists, auto-selects it and closes — skipping the modal entirely. */
function AutoSelectSingleStage({
  stages,
  hasExistingSelection,
  onAutoSelect,
  onClose,
  children,
}: {
  stages: { name: string; letter: string; is_default?: string }[];
  hasExistingSelection: boolean;
  onAutoSelect: (stageName: string) => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const didAutoSelect = useRef(false);
  const defaultStage = stages.find((s) => s.is_default === "Yes");
  // Only auto-select when the user hasn't already picked a stage (first-time auto-open)
  const shouldAutoSelect = !hasExistingSelection && (stages.length === 1 || !!defaultStage);

  useEffect(() => {
    if (!didAutoSelect.current && shouldAutoSelect) {
      if (stages.length === 1) {
        didAutoSelect.current = true;
        onAutoSelect(stages[0].name);
      } else if (defaultStage) {
        didAutoSelect.current = true;
        onAutoSelect(defaultStage.name);
      }
    }
  }, [stages, defaultStage, onAutoSelect, shouldAutoSelect]);

  // Don't render the modal when auto-selecting
  if (shouldAutoSelect) return null;
  return <>{children}</>;
}

export function ModalOrchestrator({
  // Impression
  showImpressionModal,
  setShowImpressionModal,
  currentImpressionArch,
  currentImpressionProductId,
  currentImpressionToothNumber,
  impressionOptions,
  currentImpressionOppositeImpression,
  oppositeImpressions,
  selectedImpressions,
  setSelectedImpressions,
  onImpressionConfirm,
  onImpressionClear,
  onSubmitNoOpposing,
  hideSkipOpposing,
  impressionModalHeading,
  dualImpressionPrimaryArch,
  // Add-ons
  showAddOnsModal,
  setShowAddOnsModal,
  currentAddOnsArch,
  currentAddOnsProductId,
  currentAddOnsToothNumber,
  onAddOnsConfirm,
  addOnsProducts,
  addOnsVisibleArches,
  addOnArchSlots = [],
  // Attachment
  showAttachModal,
  setShowAttachModal,
  attachmentStages,
  onAttachFileCountsChange,
  // Rush
  showRushModal,
  setShowRushModal,
  currentRushArch,
  currentRushProductId,
  currentRushMaxProductId,
  currentRushMandProductId,
  handleRushConfirm,
  rushedProducts,
  handleRemoveRush,
  rushArchSlots = [],
  rushCaseSchedule = null,
  labBusinessHours = null,
  // Stage
  isStageModalOpen,
  setIsStageModalOpen,
  selectedStages,
  currentStageProductId,
  currentStageArch,
  currentStageToothNumber,
  currentStageOptions,
  currentStageProduct = null,
  handleStageSelect,
  onStageConfirm,
  stageHistory,
  caseSubmitted = false,
}: ModalOrchestratorProps) {
  const [attachViewerOpen, setAttachViewerOpen] = useState(false)
  const handleViewerToggle = useCallback((isOpen: boolean) => setAttachViewerOpen(isOpen), [])
  /** Arches the user edited in this modal session — avoids clearing an arch that was never touched on close. */
  const touchedArchesRef = useRef<Set<Arch>>(new Set());
  const impressionCloseInFlightRef = useRef(false);

  useEffect(() => {
    if (!showImpressionModal) {
      impressionCloseInFlightRef.current = false;
      return;
    }
    const touched = new Set<Arch>();
    if (selectedImpressions.maxillary.length > 0) touched.add("maxillary");
    if (selectedImpressions.mandibular.length > 0) touched.add("mandibular");
    touchedArchesRef.current = touched;
  }, [showImpressionModal, selectedImpressions]);

  const markArchTouched = (arch: Arch) => {
    touchedArchesRef.current.add(arch);
  };

  const impressionLookupForCommit = [
    ...impressionOptions,
    ...(oppositeImpressions ?? []).filter(
      (o) => !impressionOptions.some((i) => i.value === o.value)
    ),
  ];

  const resolveImpressionLabel = (identifier: string) => {
    const impression = impressionLookupForCommit.find(
      (i) =>
        i.value === identifier ||
        i.name === identifier ||
        i.code === identifier
    );
    return impression?.name || identifier;
  };

  const commitImpressionForArch = (archToProcess: Arch) => {
    const entries = selectedImpressions[archToProcess] ?? [];
    if (entries.length > 0) {
      const displayText = entries
        .map((entry) => `${entry.qty}x ${entry.name || resolveImpressionLabel(entry.code)}`)
        .join(", ");
      onImpressionConfirm(displayText, archToProcess);
    } else if (touchedArchesRef.current.has(archToProcess)) {
      onImpressionClear?.(archToProcess);
    }
  };

  const commitImpressionSelections = useCallback(() => {
    const arches = getDualModalArches(
      currentImpressionOppositeImpression,
      currentImpressionArch
    );
    for (const archToProcess of arches) {
      commitImpressionForArch(archToProcess);
    }
  }, [
    currentImpressionOppositeImpression,
    currentImpressionArch,
    selectedImpressions,
    currentImpressionProductId,
    onImpressionConfirm,
    onImpressionClear,
  ]);

  const handleImpressionModalClose = useCallback(() => {
    if (impressionCloseInFlightRef.current) return;
    impressionCloseInFlightRef.current = true;
    try {
      commitImpressionSelections();
    } finally {
      setShowImpressionModal(false);
      impressionCloseInFlightRef.current = false;
    }
  }, [commitImpressionSelections, setShowImpressionModal]);

  // In read-only (virtual slip) mode, suppress all modals
  if (caseSubmitted) return null;

  return (
    <>
      {/* Impression Selection Modal */}
      <ImpressionSelectionModal
        isOpen={showImpressionModal}
        onClose={handleImpressionModalClose}
        onSaveArchSelection={commitImpressionForArch}
        impressions={impressionOptions}
        oppositeImpression={currentImpressionOppositeImpression}
        oppositeImpressions={oppositeImpressions}
        selectedImpressions={selectedImpressions}
        onSetArchQty={(arch, option, qty) => {
          markArchTouched(arch);
          setSelectedImpressions((prev) => setArchImpressionQty(prev, arch, option, qty));
        }}
        onRemoveArchImpression={(arch, code) => {
          markArchTouched(arch);
          setSelectedImpressions((prev) => removeArchImpression(prev, arch, code));
        }}
        productId={currentImpressionProductId}
        arch={currentImpressionArch}
        onSubmitNoOpposing={() => {
          const displayText = buildImpressionDisplayText(
            selectedImpressions,
            currentImpressionArch
          );
          if (displayText) {
            onImpressionConfirm(displayText, currentImpressionArch);
          }
          onSubmitNoOpposing?.();
          impressionCloseInFlightRef.current = true;
          setShowImpressionModal(false);
        }}
        hideSkipOpposing={hideSkipOpposing}
        modalHeading={impressionModalHeading}
        dualImpressionPrimaryArch={dualImpressionPrimaryArch}
      />

      {/* Add-Ons Modal */}
      <AddOnsModal
        isOpen={showAddOnsModal}
        onClose={() => setShowAddOnsModal(false)}
        onAddAddOns={(addOns, confirmArch, meta) => {
          onAddOnsConfirm(addOns, confirmArch, meta);
        }}
        labId={0}
        productId={currentAddOnsProductId}
        arch={currentAddOnsArch}
        products={addOnsProducts}
        visibleArches={addOnArchSlots.length > 0 ? undefined : addOnsVisibleArches}
        archSlots={addOnArchSlots}
      />

      {/* Stage Selection Modal — auto-selects when only 1 stage is available */}
      {isStageModalOpen && currentStageOptions && currentStageOptions.length > 0 && (
        <AutoSelectSingleStage
          stages={currentStageOptions}
          hasExistingSelection={!!(currentStageProductId && selectedStages[currentStageProductId])}
          onAutoSelect={(stageName) => {
            handleStageSelect(stageName);
            onStageConfirm(stageName);
          }}
          onClose={() => setIsStageModalOpen(false)}
        >
          <StageSelectionModal
            stages={currentStageOptions}
            selectedStage={selectedStages[currentStageProductId]}
            stageHistory={stageHistory}
            onSelect={(stageName) => {
              handleStageSelect(stageName);
              onStageConfirm(stageName);
            }}
            onClose={() => setIsStageModalOpen(false)}
          />
        </AutoSelectSingleStage>
      )}

      {/* No stages configured — skip selection and advance the field chain */}
      {isStageModalOpen && (!currentStageOptions || currentStageOptions.length === 0) && (
        <AutoSkipEmptyStages
          isOpen={isStageModalOpen}
          onSkip={() => {
            const stageName = getResolvedStageName(currentStageProduct);
            if (stageName) {
              handleStageSelect(stageName);
              onStageConfirm(stageName);
            }
          }}
          onClose={() => setIsStageModalOpen(false)}
        />
      )}


      {/* File Attachment Modal */}
      <Dialog open={showAttachModal} onOpenChange={setShowAttachModal}>
        <DialogContent className={`${attachViewerOpen ? "max-w-[1700px]" : "max-w-[1100px]"} w-[95vw] h-[80vh] max-h-[800px] overflow-hidden flex flex-col p-0 transition-all duration-300`}>
          <DialogTitle className="sr-only">File Attachments</DialogTitle>
          <FileAttachmentModalContent
            setShowAttachModal={setShowAttachModal}
            isCaseSubmitted={false}
            availableStages={attachmentStages}
            onViewerToggle={handleViewerToggle}
            onFileCountsChange={onAttachFileCountsChange}
          />
        </DialogContent>
      </Dialog>

      {/* Rush Request Modal */}
      {(() => {
        const maxSlot = rushArchSlots.find((s) => s.arch === "maxillary");
        const mandSlot = rushArchSlots.find((s) => s.arch === "mandibular");
        const maxRushEntry = maxSlot
          ? getRushFromStore(
              rushedProducts,
              "maxillary",
              maxSlot.cardId,
              maxSlot.repTooth,
              maxSlot.isFixed
            )
          : currentRushMaxProductId
            ? rushedProducts[`maxillary_${currentRushMaxProductId}`]
            : null;
        const mandRushEntry = mandSlot
          ? getRushFromStore(
              rushedProducts,
              "mandibular",
              mandSlot.cardId,
              mandSlot.repTooth,
              mandSlot.isFixed
            )
          : currentRushMandProductId
            ? rushedProducts[`mandibular_${currentRushMandProductId}`]
            : null;
        const primarySlot = maxSlot ?? mandSlot;
        const primaryRushKey =
          (currentRushArch === "maxillary" ? maxSlot?.rushKey : mandSlot?.rushKey) ??
          currentRushProductId;
        const primaryEntry = primaryRushKey ? rushedProducts[primaryRushKey] : null;

        return (
          <RushRequestModal
            isOpen={showRushModal}
            onClose={() => setShowRushModal(false)}
            onConfirm={handleRushConfirm}
            isRushed={!!primaryEntry}
            existingRushDate={primaryEntry?.targetDate as string | undefined}
            onRemoveRush={() =>
              primaryRushKey && handleRemoveRush(currentRushArch, primaryRushKey)
            }
            maxRushed={!!maxRushEntry}
            maxExistingRushDate={maxRushEntry?.targetDate as string | undefined}
            mandRushed={!!mandRushEntry}
            mandExistingRushDate={mandRushEntry?.targetDate as string | undefined}
            onRemoveMaxRush={
              maxSlot
                ? () => handleRemoveRush("maxillary", maxSlot.rushKey)
                : currentRushMaxProductId
                  ? () => handleRemoveRush("maxillary", currentRushMaxProductId)
                  : undefined
            }
            onRemoveMandRush={
              mandSlot
                ? () => handleRemoveRush("mandibular", mandSlot.rushKey)
                : currentRushMandProductId
                  ? () => handleRemoveRush("mandibular", currentRushMandProductId)
                  : undefined
            }
            hasMaxillary={!!maxSlot || !!currentRushMaxProductId}
            hasMandibular={!!mandSlot || !!currentRushMandProductId}
            archSlots={rushArchSlots.map((s) => {
              const entry = getRushFromStore(
                rushedProducts,
                s.arch,
                s.cardId,
                s.repTooth,
                s.isFixed
              );
              return {
                arch: s.arch,
                archLabel: s.archLabel,
                productName: s.productName,
                rushKey: s.rushKey,
                cardId: s.cardId,
                repTooth: s.repTooth,
                actualDeliveryDate: s.actualDeliveryDate,
                workDaysToDeliver: s.workDaysToDeliver,
                stageName: s.stageName,
                toothNumbersLabel: s.toothNumbersLabel,
                isRushed: !!entry,
                existingRushDate: entry?.targetDate as string | undefined,
              };
            })}
            onRemoveRushByKey={(rushKey, arch) => handleRemoveRush(arch, rushKey)}
            mirrorRushAcrossArches={rushSlotsShareProduct(rushArchSlots)}
            rushCaseSchedule={rushCaseSchedule}
            labBusinessHours={labBusinessHours}
            product={{
              name: primarySlot?.productName ?? "Product",
              stage: "",
              deliveryDate: "",
              price: 100,
            }}
            products={rushArchSlots.length > 0 ? undefined : addOnsProducts}
          />
        );
      })()}
    </>
  );
}
