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
import { hasDisplayValue } from "@/lib/virtual-slip-display";
import type { SlipProductArchKey } from "@/lib/virtual-slip-view-model";

const noop = () => {};

interface VirtualSlipNotesProps {
  notes: string;
  relatedSlips: string[];
  /** Numeric slip id for Slip Note API. */
  slipId: number;
  slipNumber?: string;
  caseNumber?: string;
  patientName?: string;
  /** Product label for rush modal (lab listing uses slip product name). */
  productName?: string;
  productStage?: string;
  /** Standard delivery as `yyyy-MM-dd` for rush modal (not display-formatted due date). */
  deliveryDateIso?: string;
  /** Slip already has rush — enables Remove Rush in modal. */
  slipIsRush?: boolean;
  /** One column per product; only arches with products (slip-creation parity). */
  rushArchSlots?: VirtualSlipRushArchSlot[];
  /** Per-product add-on columns (product-details catalogs per slot). */
  addonArchSlots?: RushArchSlot[];
  /** Selected products with optional pre-loaded `addons` from slip details. */
  addonProducts?: AddOnsProduct[];
  onNotesChanged?: (summaryText: string) => void;
  onAddonsChanged?: () => void;
  onRushChanged?: () => void;
  /** Arches with products on this slip — upper-only shows maxillary only (slip creation parity). */
  hasMaxillary?: boolean;
  hasMandibular?: boolean;
  visibleArches?: SlipProductArchKey[];
  /** When true, opens the slip notes modal (e.g. FAB Edit Slip). */
  openNotesModal?: boolean;
  onOpenNotesModalChange?: (open: boolean) => void;
  /** When true, opens the rush modal (e.g. FAB Rush case). */
  openRushModal?: boolean;
  onOpenRushModalChange?: (open: boolean) => void;
}

/** Case summary notes + slip notes modal (edit icon) + jump-to-slip + related slip chips. */
export function VirtualSlipNotes({
  notes,
  relatedSlips,
  slipId,
  slipNumber,
  caseNumber,
  patientName,
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
  openNotesModal,
  onOpenNotesModalChange,
  openRushModal,
  onOpenRushModalChange,
}: VirtualSlipNotesProps) {
  const productArches =
    visibleArches ??
    ([
      ...(hasMaxillary ? (["maxillary"] as const) : []),
      ...(hasMandibular ? (["mandibular"] as const) : []),
    ] as SlipProductArchKey[]);
  const router = useRouter();
  const { toast } = useToast();
  const { requestSlipRush, cancelSlipRush } = useSlipCreation();
  const [displayNotes, setDisplayNotes] = useState(notes);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [addonsModalOpen, setAddonsModalOpen] = useState(false);
  const [rushModalOpen, setRushModalOpen] = useState(false);
  const [rushSubmitting, setRushSubmitting] = useState(false);

  useEffect(() => {
    setDisplayNotes(notes);
  }, [notes]);

  useEffect(() => {
    if (openNotesModal) setNotesModalOpen(true);
  }, [openNotesModal]);

  useEffect(() => {
    if (openRushModal) setRushModalOpen(true);
  }, [openRushModal]);

  const summaryNotes = displayNotes;

  const handleNotesChanged = (summaryText: string) => {
    setDisplayNotes(summaryText);
    onNotesChanged?.(summaryText);
  };

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
    <div className="px-6 pb-6">
      <div className="flex items-center justify-center py-2">
        <CenterActionIcons
          visible
          onEdit={slipId ? () => setNotesModalOpen(true) : noop}
          onAddProduct={
            slipId > 0 && productArches.length > 0
              ? () => setAddonsModalOpen(true)
              : undefined
          }
          onRush={
            slipId > 0 && rushArchSlots.length > 0 && !rushSubmitting
              ? () => setRushModalOpen(true)
              : undefined
          }
          onAttach={noop}
          onPhoto={noop}
          hasPhotos
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

      {slipId > 0 && rushModalOpen && rushArchSlots.length > 0 && (
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
            price: 0,
          }}
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
          slipNumber={slipNumber}
          patientName={patientName}
          caseNumber={caseNumber}
          onNotesChanged={handleNotesChanged}
        />
      )}

      {hasDisplayValue(summaryNotes) && (
        <div className="relative mt-4 rounded-[7.7px] border-[0.74px] border-[#4C4D55] px-[15px] pb-[5px] pt-[18px]">
          <span className="absolute -top-[12px] left-1/2 -translate-x-1/2 bg-white px-[10px] font-sans text-[20px] leading-none text-[#4C4D55]">
            Case summary notes
          </span>
          <p className="min-h-[60px] whitespace-pre-wrap font-sans text-[18px] leading-[22px] text-[#4C4D55]">
            {summaryNotes.trim()}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-[15px]">
        <button
          type="button"
          onClick={() => slipNumber && router.push(`/virtual-slip-v2/${slipNumber}`)}
          className="rounded-[10px] border-[0.5px] border-[#4C4D55] px-[10px] py-[5px] font-sans text-[15.4px] tracking-[-0.02em] text-[#4C4D55]"
        >
          Jump to slip
        </button>

        {relatedSlips.length > 0 && (
          <div className="flex flex-wrap items-center gap-[15px]">
            <span className="font-sans text-[15.4px] tracking-[-0.02em] text-[#4C4D55]">
              Related slip:
            </span>
            {relatedSlips.map((s) => (
              <span
                key={s}
                className="rounded-[10px] bg-white px-[10px] py-[5px] font-sans text-[15.4px] tracking-[-0.02em] text-[#4C4D55] shadow-[0px_2px_4px_rgba(0,0,0,0.25)]"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
