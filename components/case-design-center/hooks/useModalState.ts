"use client";

import { useState } from "react";
import type { Arch } from "../types";
import { mockImpressions } from "../constants";

export function useModalState() {
  // Impression modal state
  const [showImpressionModal, setShowImpressionModal] = useState(false);
  const [currentImpressionArch, setCurrentImpressionArch] = useState<Arch>("maxillary");
  const [currentImpressionProductId, setCurrentImpressionProductId] = useState("");
  const [selectedImpressions, setSelectedImpressions] = useState<Record<string, number>>({});

  // Add-ons modal state
  const [showAddOnsModal, setShowAddOnsModal] = useState(false);
  const [currentAddOnsArch, setCurrentAddOnsArch] = useState<Arch>("maxillary");
  const [currentAddOnsProductId, setCurrentAddOnsProductId] = useState("");
  const [currentAddOnsToothNumber, setCurrentAddOnsToothNumber] = useState<number | null>(null);

  // File attachment modal state
  const [showAttachModal, setShowAttachModal] = useState(false);

  // Rush request modal state
  const [showRushModal, setShowRushModal] = useState(false);
  const [currentRushArch, setCurrentRushArch] = useState<Arch>("maxillary");
  const [currentRushProductId, setCurrentRushProductId] = useState("");
  const [rushedProducts, setRushedProducts] = useState<Record<string, any>>({});

  // Stage modal state
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [currentStageProductId, setCurrentStageProductId] = useState<string>("");
  const [currentStageArch, setCurrentStageArch] = useState<Arch>("maxillary");
  const [currentStageToothNumber, setCurrentStageToothNumber] = useState<number | null>(null);
  const [selectedStages, setSelectedStages] = useState<Record<string, string>>({
    fixed_45: "Finish",
    fixed_19: "Finish",
  });

  const [currentImpressionToothNumber, setCurrentImpressionToothNumber] = useState<number | null>(null);

  const handleOpenImpressionModal = (arch: Arch, productId: string, toothNumber?: number) => {
    setCurrentImpressionArch(arch);
    setCurrentImpressionProductId(productId);
    setCurrentImpressionToothNumber(toothNumber ?? null);
    setShowImpressionModal(true);
  };

  const handleOpenAddOnsModal = (arch: Arch, productId: string, toothNumber?: number) => {
    setCurrentAddOnsArch(arch);
    setCurrentAddOnsProductId(productId);
    setCurrentAddOnsToothNumber(toothNumber ?? null);
    setShowAddOnsModal(true);
  };

  const handleOpenRushModal = (arch: Arch, productId: string) => {
    setCurrentRushArch(arch);
    setCurrentRushProductId(productId);
    setShowRushModal(true);
  };

  const handleRushConfirm = (rushData: any) => {
    const key = `${currentRushArch}_${currentRushProductId}`;
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
    setCurrentStageProductId(productId);
    setCurrentStageArch(arch ?? "maxillary");
    setCurrentStageToothNumber(toothNumber ?? null);
    setIsStageModalOpen(true);
  };

  const handleStageSelect = (stageName: string) => {
    setSelectedStages((prev) => ({ ...prev, [currentStageProductId]: stageName }));
    setIsStageModalOpen(false);
  };

  /** Migrate a selectedStages entry from one key to another (e.g. when the min tooth of a Fixed Restoration group changes). */
  const migrateStageKey = (oldKey: string, newKey: string) => {
    setSelectedStages((prev) => {
      const value = prev[oldKey];
      if (value === undefined || oldKey === newKey) return prev;
      const { [oldKey]: _, ...rest } = prev;
      return { ...rest, [newKey]: value };
    });
  };

  const getImpressionDisplayText = (productId: string, arch: Arch) => {
    const entries = Object.entries(selectedImpressions).filter(
      ([key, qty]) => key.startsWith(`${productId}_${arch}_`) && qty > 0
    );
    if (entries.length === 0) return "";
    return entries
      .map(([key, qty]) => {
        const identifier = key.replace(`${productId}_${arch}_`, "");
        const impression = mockImpressions.find((i) => i.value === identifier);
        return `${qty}x ${impression?.name || identifier}`;
      })
      .join(", ");
  };

  return {
    // Impression
    showImpressionModal,
    setShowImpressionModal,
    currentImpressionArch,
    currentImpressionProductId,
    currentImpressionToothNumber,
    selectedImpressions,
    setSelectedImpressions,
    handleOpenImpressionModal,
    getImpressionDisplayText,
    // Add-ons
    showAddOnsModal,
    setShowAddOnsModal,
    currentAddOnsArch,
    currentAddOnsProductId,
    currentAddOnsToothNumber,
    handleOpenAddOnsModal,
    // Attachment
    showAttachModal,
    setShowAttachModal,
    // Rush
    showRushModal,
    setShowRushModal,
    currentRushArch,
    currentRushProductId,
    rushedProducts,
    handleOpenRushModal,
    handleRushConfirm,
    handleRemoveRush,
    // Stage
    isStageModalOpen,
    setIsStageModalOpen,
    currentStageProductId,
    currentStageArch,
    currentStageToothNumber,
    selectedStages,
    handleOpenStageModal,
    handleStageSelect,
    migrateStageKey,
  };
}
