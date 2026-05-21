"use client";

import { useCallback, useState, type SetStateAction } from "react";
import type { Arch } from "../types";
import {
  buildImpressionDisplayText,
  emptyImpressionSelections,
  type SlipImpressionSelections,
} from "../utils/impressionStorage";

export function useModalState() {
  const [showImpressionModal, setShowImpressionModal] = useState(false);
  const [currentImpressionArch, setCurrentImpressionArch] = useState<Arch>("maxillary");
  const [currentImpressionProductId, setCurrentImpressionProductId] = useState("");
  const [selectedImpressions, setSelectedImpressions] = useState<SlipImpressionSelections>(
    emptyImpressionSelections
  );

  const [showAddOnsModal, setShowAddOnsModal] = useState(false);
  const [currentAddOnsArch, setCurrentAddOnsArch] = useState<Arch>("maxillary");
  const [currentAddOnsProductId, setCurrentAddOnsProductId] = useState("");
  const [currentAddOnsToothNumber, setCurrentAddOnsToothNumber] = useState<number | null>(null);

  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachedPhotoCount, setAttachedPhotoCount] = useState(0);
  const [attachedStlCount, setAttachedStlCount] = useState(0);

  const [showRushModal, setShowRushModal] = useState(false);
  const [currentRushArch, setCurrentRushArch] = useState<Arch>("maxillary");
  const [currentRushProductId, setCurrentRushProductId] = useState("");
  const [currentRushMaxProductId, setCurrentRushMaxProductId] = useState("");
  const [currentRushMandProductId, setCurrentRushMandProductId] = useState("");
  const [rushedProducts, setRushedProducts] = useState<Record<string, any>>({});

  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [currentStageProductId, setCurrentStageProductId] = useState<string>("");
  const [currentStageArch, setCurrentStageArch] = useState<Arch>("maxillary");
  const [currentStageToothNumber, setCurrentStageToothNumber] = useState<number | null>(null);
  const [selectedStages, setSelectedStages] = useState<Record<string, string>>({
    fixed_45: "Finish",
    fixed_19: "Finish",
  });

  const [currentImpressionToothNumber, setCurrentImpressionToothNumber] = useState<number | null>(null);
  const [noOpposingNeeded, setNoOpposingNeeded] = useState<Record<string, boolean>>({});

  const closeAllModals = () => {
    setShowImpressionModal(false);
    setIsStageModalOpen(false);
    setShowAddOnsModal(false);
    setShowRushModal(false);
    setShowAttachModal(false);
  };

  const handleOpenImpressionModal = (arch: Arch, productId: string, toothNumber?: number) => {
    closeAllModals();
    setCurrentImpressionArch(arch);
    setCurrentImpressionProductId(productId);
    setCurrentImpressionToothNumber(toothNumber ?? null);
    setShowImpressionModal(true);
  };

  const handleOpenAddOnsModal = (arch: Arch, productId: string, toothNumber?: number) => {
    closeAllModals();
    setCurrentAddOnsArch(arch);
    setCurrentAddOnsProductId(productId);
    setCurrentAddOnsToothNumber(toothNumber ?? null);
    setShowAddOnsModal(true);
  };

  const handleOpenRushModal = (arch: Arch, productId: string, maxProductId?: string, mandProductId?: string) => {
    closeAllModals();
    setCurrentRushArch(arch);
    setCurrentRushProductId(productId);
    setCurrentRushMaxProductId(maxProductId ?? "");
    setCurrentRushMandProductId(mandProductId ?? "");
    setShowRushModal(true);
  };

  const handleRushConfirm = (rushData: any) => {
    const arch: Arch = rushData.arch ?? currentRushArch;
    const productId = arch === "maxillary"
      ? (currentRushMaxProductId || currentRushProductId)
      : (currentRushMandProductId || currentRushProductId);
    const key = `${arch}_${productId}`;
    setRushedProducts((prev) => ({ ...prev, [key]: rushData }));
  };

  const handleRemoveRush = (arch: Arch, productId: string) => {
    const key = `${arch}_${productId}`;
    setRushedProducts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleOpenStageModal = (productId: string, arch?: Arch, toothNumber?: number) => {
    closeAllModals();
    setCurrentStageProductId(productId);
    setCurrentStageArch(arch ?? "maxillary");
    setCurrentStageToothNumber(toothNumber ?? null);
    setIsStageModalOpen(true);
  };

  const handleStageSelect = (stageName: string) => {
    setSelectedStages((prev) => ({ ...prev, [currentStageProductId]: stageName }));
    setIsStageModalOpen(false);
  };

  const migrateStageKey = (oldKey: string, newKey: string) => {
    setSelectedStages((prev) => {
      const value = prev[oldKey];
      if (value === undefined || oldKey === newKey) return prev;
      const { [oldKey]: _, ...rest } = prev;
      return { ...rest, [newKey]: value };
    });
  };

  const setSelectedImpressionsUpdater = useCallback(
    (updater: SetStateAction<SlipImpressionSelections>) => {
      setSelectedImpressions(updater);
    },
    []
  );

  const getImpressionDisplayText = useCallback(
    (productId: string, arch: Arch) => {
      void productId;
      return buildImpressionDisplayText(selectedImpressions, arch);
    },
    [selectedImpressions]
  );

  return {
    showImpressionModal,
    setShowImpressionModal,
    currentImpressionArch,
    setCurrentImpressionArch,
    currentImpressionProductId,
    setCurrentImpressionProductId,
    currentImpressionToothNumber,
    setCurrentImpressionToothNumber,
    selectedImpressions,
    setSelectedImpressions: setSelectedImpressionsUpdater,
    handleOpenImpressionModal,
    getImpressionDisplayText,
    noOpposingNeeded,
    setNoOpposingNeeded,
    showAddOnsModal,
    setShowAddOnsModal,
    currentAddOnsArch,
    currentAddOnsProductId,
    currentAddOnsToothNumber,
    handleOpenAddOnsModal,
    showAttachModal,
    setShowAttachModal,
    attachedPhotoCount,
    setAttachedPhotoCount,
    attachedStlCount,
    setAttachedStlCount,
    showRushModal,
    setShowRushModal,
    currentRushArch,
    currentRushProductId,
    currentRushMaxProductId,
    currentRushMandProductId,
    rushedProducts,
    handleOpenRushModal,
    handleRushConfirm,
    handleRemoveRush,
    isStageModalOpen,
    setIsStageModalOpen,
    currentStageProductId,
    currentStageArch,
    currentStageToothNumber,
    selectedStages,
    setSelectedStages,
    handleOpenStageModal,
    handleStageSelect,
    migrateStageKey,
  };
}
