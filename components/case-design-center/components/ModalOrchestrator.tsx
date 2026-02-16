"use client";

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
import type { Arch } from "../types";
import { stageOptions, mockImpressions } from "../constants";

interface ModalOrchestratorProps {
  // Impression
  showImpressionModal: boolean;
  setShowImpressionModal: (v: boolean) => void;
  currentImpressionArch: Arch;
  currentImpressionProductId: string;
  selectedImpressions: Record<string, number>;
  setSelectedImpressions: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >;
  // Add-ons
  showAddOnsModal: boolean;
  setShowAddOnsModal: (v: boolean) => void;
  currentAddOnsArch: Arch;
  currentAddOnsProductId: string;
  // Attachment
  showAttachModal: boolean;
  setShowAttachModal: (v: boolean) => void;
  // Rush
  showRushModal: boolean;
  setShowRushModal: (v: boolean) => void;
  currentRushArch: Arch;
  currentRushProductId: string;
  handleRushConfirm: (rushData: any) => void;
  // Stage
  isStageModalOpen: boolean;
  setIsStageModalOpen: (v: boolean) => void;
  selectedStages: Record<string, string>;
  currentStageProductId: string;
  handleStageSelect: (stageName: string) => void;
}

export function ModalOrchestrator({
  // Impression
  showImpressionModal,
  setShowImpressionModal,
  currentImpressionArch,
  currentImpressionProductId,
  selectedImpressions,
  setSelectedImpressions,
  // Add-ons
  showAddOnsModal,
  setShowAddOnsModal,
  currentAddOnsArch,
  currentAddOnsProductId,
  // Attachment
  showAttachModal,
  setShowAttachModal,
  // Rush
  showRushModal,
  setShowRushModal,
  currentRushArch,
  currentRushProductId,
  handleRushConfirm,
  // Stage
  isStageModalOpen,
  setIsStageModalOpen,
  selectedStages,
  currentStageProductId,
  handleStageSelect,
}: ModalOrchestratorProps) {
  return (
    <>
      {/* Impression Selection Modal */}
      <ImpressionSelectionModal
        isOpen={showImpressionModal}
        onClose={() => setShowImpressionModal(false)}
        impressions={mockImpressions}
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
          console.log("Add-ons added:", addOns);
        }}
        labId={0}
        productId={currentAddOnsProductId}
        arch={currentAddOnsArch}
      />

      {/* Stage Selection Modal */}
      {isStageModalOpen && (
        <StageSelectionModal
          stages={stageOptions}
          selectedStage={selectedStages[currentStageProductId]}
          onSelect={handleStageSelect}
          onClose={() => setIsStageModalOpen(false)}
        />
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
