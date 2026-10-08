"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ChangeProductConfirmModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  /** Edit / add-stage: keep existing values for fields the new product still has. */
  preserveFields?: boolean;
}

/**
 * Shown when the user clicks "Back to Products" from the Case Design Center.
 * Create warns that configuration will be lost. Edit keeps values for fields
 * that still exist on the newly selected product.
 */
export function ChangeProductConfirmModal({
  open,
  onCancel,
  onConfirm,
  preserveFields = false,
}: ChangeProductConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogOverlay className="fixed inset-0 z-[100000] bg-black/50 backdrop-blur-sm" />
      <DialogContent className="sm:max-w-[425px] p-6 rounded-lg shadow-lg" style={{ zIndex: 100001 }}>
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold text-gray-900">Change product?</DialogTitle>
          <DialogDescription className="text-gray-500 mt-2">
            {preserveFields
              ? "If you select a different product, fields that also exist on the new product keep their values. Fields the new product does not have will be hidden."
              : "If you go back and select a different product, the details you've already filled in for this product will be lost. Choosing the same product keeps your configuration."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-4 mt-6">
          <Button variant="outline" onClick={onCancel} className="px-6 py-2 rounded-lg bg-transparent">
            Keep Editing
          </Button>
          <Button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg">
            Back to Products
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
