"use client";

import { useCallback, useState, type SetStateAction } from "react";
import type { Arch, ArchImpressionSelections } from "../types";
import { mockImpressions } from "../constants";

const IMPRESSION_KEY_RE = /^([^_]+)_(maxillary|mandibular)_(.+)$/;

function deriveArchImpressionSelections(
  selectedImpressions: Record<string, number>
): ArchImpressionSelections {
  const next: ArchImpressionSelections = {
    maxillary: [],
    mandibular: [],
  };
  const byArchCode = {
    maxillary: new Map<string, number>(),
    mandibular: new Map<string, number>(),
  };

  for (const [key, qty] of Object.entries(selectedImpressions)) {
    if (qty <= 0) continue;
    const match = key.match(IMPRESSION_KEY_RE);
    if (!match) continue;
    const arch = match[2] as Arch;
    const code = match[3];
    const prev = byArchCode[arch].get(code) ?? 0;
    byArchCode[arch].set(code, Math.max(prev, qty));
  }

  for (const arch of ["maxillary", "mandibular"] as const) {
    next[arch] = [...byArchCode[arch].entries()].map(([id, qty]) => ({
      id,
      name: mockImpressions.find((i) => i.value === id)?.name || id,
      qty,
    }));
  }

  return next;
}

export function useModalState() {
  // Impression modal state
  const [showImpressionModal, setShowImpressionModal] = useState(false);
  const [currentImpressionArch, setCurrentImpressionArch] = useState<Arch>("maxillary");
  const [currentImpressionProductId, setCurrentImpressionProductId] = useState("");
  const [selectedImpressions, setSelectedImpressionsState] = useState<Record<string, number>>({});
  const [selectedImpressionsByArch, setSelectedImpressionsByArch] = useState<ArchImpressionSelections>({
    maxillary: [],
    mandibular: [],
  });

  const setSelectedImpressions = useCallback(
    (updater: SetStateAction<Record<string, number>>) => {
      setSelectedImpressionsState((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (p: Record<string, number>) => Record<string, number>)(prev)
            : updater;
        setSelectedImpressionsByArch(deriveArchImpressionSelections(next));
        return next;
      });
    },
    []
  );

  // Add-ons modal state
  const [showAddOnsModal, setShowAddOnsModal] = useState(false);
  const [currentAddOnsArch, setCurrentAddOnsArch] = useState<Arch>("maxillary");
  const [currentAddOnsProductId, setCurrentAddOnsProductId] = useState("");
  const [currentAddOnsToothNumber, setCurrentAddOnsToothNumber] = useState<number | null>(null);

  // File attachment modal state
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachedPhotoCount, setAttachedPhotoCount] = useState(0);
  const [attachedStlCount, setAttachedStlCount] = useState(0);

  // Rush request modal state
  const [showRushModal, setShowRushModal] = useState(false);
  const [currentRushArch, setCurrentRushArch] = useState<Arch>("maxillary");
  const [currentRushProductId, setCurrentRushProductId] = useState("");
  const [currentRushMaxProductId, setCurrentRushMaxProductId] = useState("");
  const [currentRushMandProductId, setCurrentRushMandProductId] = useState("");
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

  // Tracks product+arch combos where user chose "Submit, no opposing needed"
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
    void productId;
    const entries = selectedImpressionsByArch[arch];
    return entries
      .map(({ name, qty }) => {
        return `${qty}x ${name}`;
      })
      .join(", ");
  };

  return {
    // Impression
    showImpressionModal,
    setShowImpressionModal,
    currentImpressionArch,
    setCurrentImpressionArch,
    currentImpressionProductId,
    setCurrentImpressionProductId,
    currentImpressionToothNumber,
    setCurrentImpressionToothNumber,
    selectedImpressions,
    selectedImpressionsByArch,
    setSelectedImpressions,
    handleOpenImpressionModal,
    getImpressionDisplayText,
    noOpposingNeeded,
    setNoOpposingNeeded,
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
    attachedPhotoCount,
    setAttachedPhotoCount,
    attachedStlCount,
    setAttachedStlCount,
    // Rush
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
    // Stage
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
