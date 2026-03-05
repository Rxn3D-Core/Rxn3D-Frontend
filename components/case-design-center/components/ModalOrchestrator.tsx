"use client";

import { useEffect, useRef } from "react";
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
import { stageOptions } from "../constants";

interface ModalOrchestratorProps {
  // Impression
  showImpressionModal: boolean;
  setShowImpressionModal: (v: boolean) => void;
  currentImpressionArch: Arch;
  currentImpressionProductId: string;
  currentImpressionToothNumber: number | null;
  /** Impressions from get product response (used for modal options and display text) */
  impressionOptions: ImpressionOptionForModal[];
  selectedImpressions: Record<string, number>;
  setSelectedImpressions: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >;
  onImpressionConfirm: (displayText: string) => void;
  // Add-ons
  showAddOnsModal: boolean;
  setShowAddOnsModal: (v: boolean) => void;
  currentAddOnsArch: Arch;
  currentAddOnsProductId: string;
  currentAddOnsToothNumber: number | null;
  onAddOnsConfirm: (addOns: { addon_id: number; qty: number; category: string; subcategory: string; name: string; price: number }[]) => void;
  // Attachment
  showAttachModal: boolean;
  setShowAttachModal: (v: boolean) => void;
  // Rush
  showRushModal: boolean;
  setShowRushModal: (v: boolean) => void;
  currentRushArch: Arch;
  currentRushProductId: string;
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
  currentStageOptions: { name: string; letter: string }[] | null;
  handleStageSelect: (stageName: string) => void;
  onStageConfirm: (stageName: string) => void;
}

/** When only 1 stage is available, auto-selects it and closes — skipping the modal entirely. */
function AutoSelectSingleStage({
  stages,
  onAutoSelect,
  onClose,
  children,
}: {
  stages: { name: string; letter: string }[];
  onAutoSelect: (stageName: string) => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const didAutoSelect = useRef(false);
  useEffect(() => {
    if (stages.length === 1 && !didAutoSelect.current) {
      didAutoSelect.current = true;
      onAutoSelect(stages[0].name);
    }
  }, [stages, onAutoSelect]);

  // Don't render the modal when auto-selecting
  if (stages.length === 1) return null;
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
  selectedImpressions,
  setSelectedImpressions,
  onImpressionConfirm,
  // Add-ons
  showAddOnsModal,
  setShowAddOnsModal,
  currentAddOnsArch,
  currentAddOnsProductId,
  currentAddOnsToothNumber,
  onAddOnsConfirm,
  // Attachment
  showAttachModal,
  setShowAttachModal,
  // Rush
  showRushModal,
  setShowRushModal,
  currentRushArch,
  currentRushProductId,
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
}: ModalOrchestratorProps) {
  return (
    <>
      {/* Impression Selection Modal */}
      <ImpressionSelectionModal
        isOpen={showImpressionModal}
        onClose={() => {
          // Build display text from currently selected impressions for this product/arch
          const prefix = `${currentImpressionProductId}_${currentImpressionArch}_`;
          const entries = Object.entries(selectedImpressions).filter(
            ([key, qty]) => key.startsWith(prefix) && qty > 0
          );
          if (entries.length > 0) {
            const displayText = entries
              .map(([key, qty]) => {
                const identifier = key.replace(prefix, "");
                const impression = impressionOptions.find((i) => i.value === identifier);
                return `${qty}x ${impression?.name || identifier}`;
              })
              .join(", ");
            onImpressionConfirm(displayText);
          }
          setShowImpressionModal(false);
        }}
        impressions={impressionOptions}
        selectedImpressions={selectedImpressions}
        onUpdateQuantity={(key, qty) => {
          setSelectedImpressions((prev) => ({ ...prev, [key]: qty }));
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
      />

      {/* Add-Ons Modal */}
      <AddOnsModal
        isOpen={showAddOnsModal}
        onClose={() => setShowAddOnsModal(false)}
        onAddAddOns={(addOns) => {
          onAddOnsConfirm(addOns);
        }}
        labId={0}
        productId={currentAddOnsProductId}
        arch={currentAddOnsArch}
      />

      {/* Stage Selection Modal — auto-selects when only 1 stage is available */}
      {isStageModalOpen && (
        <AutoSelectSingleStage
          stages={currentStageOptions || stageOptions}
          onAutoSelect={(stageName) => {
            handleStageSelect(stageName);
            onStageConfirm(stageName);
          }}
          onClose={() => setIsStageModalOpen(false)}
        >
          <StageSelectionModal
            stages={currentStageOptions || stageOptions}
            selectedStage={selectedStages[currentStageProductId]}
            onSelect={(stageName) => {
              handleStageSelect(stageName);
              onStageConfirm(stageName);
            }}
            onClose={() => setIsStageModalOpen(false)}
          />
        </AutoSelectSingleStage>
      )}

      {/* File Attachment Modal */}
      <Dialog open={showAttachModal} onOpenChange={setShowAttachModal}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-hidden flex flex-col p-0">
          <FileAttachmentModalContent
            setShowAttachModal={setShowAttachModal}
            isCaseSubmitted={false}
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
      />
    </>
  );
}
