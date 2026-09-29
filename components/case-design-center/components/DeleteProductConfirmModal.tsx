"use client";

import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteProductConfirmModalProps {
  open: boolean;
  productName?: string;
  arch?: "maxillary" | "mandibular";
  toothDisplay?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const ARCH_LABEL: Record<"maxillary" | "mandibular", string> = {
  maxillary: "Maxillary (Upper)",
  mandibular: "Mandibular (Lower)",
};

/**
 * Confirmation shown before removing a product from the slip.
 * Removing a product discards the configuration entered for it on that arch only.
 */
export function DeleteProductConfirmModal({
  open,
  productName,
  arch,
  toothDisplay,
  onCancel,
  onConfirm,
}: DeleteProductConfirmModalProps) {
  const archLabel = arch ? ARCH_LABEL[arch] : undefined;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogOverlay className="fixed inset-0 z-[100000] bg-black/50 backdrop-blur-sm" />
      <DialogContent className="sm:max-w-[420px] p-6 rounded-xl shadow-lg" style={{ zIndex: 100001 }}>
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#FDECEC]">
            <Trash2 className="h-6 w-6 text-[#CF0202]" />
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900">Remove product</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {archLabel
              ? "This product and its details will be removed from this arch only."
              : "This product and its details will be removed from the slip."}
          </DialogDescription>
        </DialogHeader>

        {(productName || archLabel) && (
          <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center">
            {productName && <p className="text-[15px] font-semibold text-gray-900">{productName}</p>}
            {(archLabel || toothDisplay) && (
              <p className="mt-0.5 text-[13px] text-gray-500">
                {archLabel}
                {archLabel && toothDisplay ? " · " : ""}
                {toothDisplay}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" onClick={onCancel} className="min-w-[120px] rounded-lg">
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} className="min-w-[120px] rounded-lg">
            Remove
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
