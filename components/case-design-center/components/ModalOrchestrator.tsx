"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ImpressionSelectionModal } from "@/components/impression-selection-modal";
import AddOnsModal from "@/components/add-ons-modal";
import FileAttachmentModalContent from "@/components/file-attachment-modal-content";
import RushRequestModal from "@/components/rush-request-modal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StageSelectionModal } from "./StageSelectionModal";
import type { Arch, ImpressionOptionForModal } from "../types";
import type { AddOnsProduct } from "@/components/add-ons-modal";

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
  selectedImpressions: Record<string, number>;
  setSelectedImpressions: React.Dispatch<
    React.SetStateAction<Record<string, number>>
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
    confirmArch?: Arch
  ) => void;
  /** Products available in the case — shown as tabs in add-ons modal */
  addOnsProducts?: AddOnsProduct[];
  /** Which arch columns to display in add-ons modal */
  addOnsVisibleArches?: ("maxillary" | "mandibular")[];
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
  // Stage
  isStageModalOpen: boolean;
  setIsStageModalOpen: (v: boolean) => void;
  selectedStages: Record<string, string>;
  currentStageProductId: string;
  currentStageArch: Arch;
  currentStageToothNumber: number | null;
  currentStageOptions: { name: string; letter: string; is_default?: string }[] | null;
  handleStageSelect: (stageName: string) => void;
  onStageConfirm: (stageName: string) => void;
  /** When true (virtual slip / read-only view), all modals are suppressed */
  caseSubmitted?: boolean;
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
  // Stage
  isStageModalOpen,
  setIsStageModalOpen,
  selectedStages,
  currentStageProductId,
  currentStageArch,
  currentStageToothNumber,
  currentStageOptions,
  handleStageSelect,
  onStageConfirm,
  caseSubmitted = false,
}: ModalOrchestratorProps) {
  const router = useRouter();
  const [attachViewerOpen, setAttachViewerOpen] = useState(false)
  const handleViewerToggle = useCallback((isOpen: boolean) => setAttachViewerOpen(isOpen), [])

  const impressionLookupForCommit = [
    ...impressionOptions,
    ...(oppositeImpressions ?? []).filter(
      (o) => !impressionOptions.some((i) => i.value === o.value)
    ),
  ];

  const commitImpressionSelections = () => {
    const arches: Arch[] =
      currentImpressionOppositeImpression === "Yes"
        ? [
            currentImpressionArch,
            (currentImpressionArch === "maxillary" ? "mandibular" : "maxillary") as Arch,
          ]
        : [currentImpressionArch];

    for (const archToProcess of [...new Set(arches)]) {
      const prefix = `${currentImpressionProductId}_${archToProcess}_`;
      const entries = Object.entries(selectedImpressions).filter(
        ([key, qty]) => key.startsWith(prefix) && qty > 0
      );
      if (entries.length > 0) {
        const displayText = entries
          .map(([key, qty]) => {
            const identifier = key.replace(prefix, "");
            const impression = impressionLookupForCommit.find((i) => i.value === identifier);
            return `${qty}x ${impression?.name || identifier}`;
          })
          .join(", ");
        onImpressionConfirm(displayText, archToProcess);
      } else {
        onImpressionClear?.(archToProcess);
      }
    }
  };

  // In read-only (virtual slip) mode, suppress all modals
  if (caseSubmitted) return null;

  return (
    <>
      {/* Impression Selection Modal */}
      <ImpressionSelectionModal
        isOpen={showImpressionModal}
        onClose={() => {
          commitImpressionSelections();
          setShowImpressionModal(false);
        }}
        impressions={impressionOptions}
        oppositeImpression={currentImpressionOppositeImpression}
        oppositeImpressions={oppositeImpressions}
        selectedImpressions={selectedImpressions}
        onUpdateQuantity={(key, qty) => {
          setSelectedImpressions((prev) => {
            const next = { ...prev };
            if (qty === 0) delete next[key];
            else next[key] = qty;
            return next;
          });
        }}
        onRemoveImpression={(key) => {
          setSelectedImpressions((prev) => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
          });
        }}
        productId={currentImpressionProductId}
        arch={currentImpressionArch}
        onSubmitNoOpposing={() => {
          // Build display text from main arch selections, then close
          const prefix = `${currentImpressionProductId}_${currentImpressionArch}_`;
          const entries = Object.entries(selectedImpressions).filter(
            ([key, qty]) => key.startsWith(prefix) && qty > 0
          );
          if (entries.length > 0) {
            const displayText = entries
              .map(([key, qty]) => {
                const identifier = key.replace(prefix, "");
                const impression = impressionLookupForCommit.find((i) => i.value === identifier);
                return `${qty}x ${impression?.name || identifier}`;
              })
              .join(", ");
            onImpressionConfirm(displayText, currentImpressionArch);
          }
          onSubmitNoOpposing?.();
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
        onAddAddOns={(addOns, confirmArch) => {
          onAddOnsConfirm(addOns, confirmArch);
        }}
        labId={0}
        productId={currentAddOnsProductId}
        arch={currentAddOnsArch}
        products={addOnsProducts}
        visibleArches={addOnsVisibleArches}
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
            onSelect={(stageName) => {
              handleStageSelect(stageName);
              onStageConfirm(stageName);
            }}
            onClose={() => setIsStageModalOpen(false)}
          />
        </AutoSelectSingleStage>
      )}

      {/* Stage not configured error dialog */}
      {isStageModalOpen && (!currentStageOptions || currentStageOptions.length === 0) && (
        <Dialog open onOpenChange={() => setIsStageModalOpen(false)}>
          <DialogContent className="max-w-[400px] w-[90vw]">
            <DialogHeader>
              <DialogTitle>Stage Not Configured</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600 py-2">
              Stage is not configured for this product. Please configure stages in Product Management.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsStageModalOpen(false)}
                className="px-4 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50 cursor-pointer"
              >
                OK
              </button>
              <button
                onClick={() => {
                  setIsStageModalOpen(false);
                  router.push("/lab-product-library/products");
                }}
                className="px-4 py-2 bg-[#1162A8] text-white text-sm rounded-md hover:bg-[#0d4a85] cursor-pointer"
              >
                Go to Product Management
              </button>
            </div>
          </DialogContent>
        </Dialog>
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
      <RushRequestModal
        isOpen={showRushModal}
        onClose={() => setShowRushModal(false)}
        onConfirm={handleRushConfirm}
        isRushed={!!rushedProducts[`${currentRushArch}_${currentRushProductId}`]}
        existingRushDate={rushedProducts[`${currentRushArch}_${currentRushProductId}`]?.targetDate}
        onRemoveRush={() => handleRemoveRush(currentRushArch, currentRushProductId)}
        maxRushed={!!currentRushMaxProductId && !!rushedProducts[`maxillary_${currentRushMaxProductId}`]}
        maxExistingRushDate={currentRushMaxProductId ? rushedProducts[`maxillary_${currentRushMaxProductId}`]?.targetDate : undefined}
        mandRushed={!!currentRushMandProductId && !!rushedProducts[`mandibular_${currentRushMandProductId}`]}
        mandExistingRushDate={currentRushMandProductId ? rushedProducts[`mandibular_${currentRushMandProductId}`]?.targetDate : undefined}
        onRemoveMaxRush={currentRushMaxProductId ? () => handleRemoveRush("maxillary", currentRushMaxProductId) : undefined}
        onRemoveMandRush={currentRushMandProductId ? () => handleRemoveRush("mandibular", currentRushMandProductId) : undefined}
        hasMaxillary={!!currentRushMaxProductId}
        hasMandibular={!!currentRushMandProductId}
        product={{
          name:
            currentRushProductId === "removable_1"
              ? "Metal Frame Acrylic"
              : "Full contour Zirconia",
          stage:
            currentRushProductId === "removable_1" ? "Bite Block" : "Finish",
          deliveryDate:
            currentRushProductId === "removable_1"
              ? "01/25/2025 at 4pm"
              : "02/10/2025 at 4pm",
          price: 100,
        }}
        products={addOnsProducts}
      />
    </>
  );
}
