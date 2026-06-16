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

interface DeleteProductConfirmModalProps {
  open: boolean;
  productName?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation shown before removing a product from the slip.
 * Removing a product discards the configuration entered for it.
 */
export function DeleteProductConfirmModal({
  open,
  productName,
  onCancel,
  onConfirm,
}: DeleteProductConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogOverlay className="fixed inset-0 z-[100000] bg-black/50 backdrop-blur-sm" />
      <DialogContent className="sm:max-w-[425px] p-6 rounded-lg shadow-lg" style={{ zIndex: 100001 }}>
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold text-gray-900">Remove product?</DialogTitle>
          <DialogDescription className="text-gray-500 mt-2">
            {productName ? (
              <>
                <span className="font-semibold text-gray-700">{productName}</span> and the details
                you&apos;ve entered for it will be removed from this slip. This can&apos;t be undone.
              </>
            ) : (
              <>This product and the details you&apos;ve entered for it will be removed from this slip. This can&apos;t be undone.</>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-4 mt-6">
          <Button variant="outline" onClick={onCancel} className="px-6 py-2 rounded-lg bg-transparent">
            Cancel
          </Button>
          <Button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg">
            Remove
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
