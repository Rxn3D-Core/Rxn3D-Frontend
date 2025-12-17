"use client"

import { AlertTriangle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  description?: string
  itemName?: string
  itemCount?: number
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  isCustomNo?: boolean
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  itemCount,
  confirmText,
  cancelText,
  isLoading = false,
  isCustomNo = false,
}: DeleteConfirmationModalProps) {
  const { t } = useTranslation()

  const getTitle = () => {
    if (title) return title
    return t("Are you sure?")
  }

  const getDescription = () => {
    if (description) return description
    
    if (itemCount && itemCount > 1) {
      return t("This action cannot be undone. This will permanently delete {{count}} items and remove your data from our servers.", { 
        count: itemCount 
      })
    }
    
    return t("This action cannot be undone. This will permanently delete your {{itemType}} and remove your data from our servers.", { 
      itemType: itemName || "item" 
    })
  }

  const getConfirmText = () => {
    if (confirmText) return confirmText
    return t("Yes, I'm sure")
  }

  const getCancelText = () => {
    if (cancelText) return cancelText
    return t("No, cancel")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
          </div>
          <div className="flex-1">
            <DialogHeader className="text-left p-0">
              <DialogTitle className="text-base font-medium">
                {getTitle()}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-2">
              <p className="text-sm text-gray-600">
                {getDescription()}
              </p>
              {isCustomNo && (
                <div className="mt-2 p-2 rounded bg-yellow-50 text-yellow-800 text-sm border border-yellow-200">
                  {t("This record is not custom and cannot be deleted.")}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button 
                variant="outline" 
                onClick={onClose}
                disabled={isLoading}
              >
                {getCancelText()}
              </Button>
              <Button 
                variant="destructive" 
                onClick={onConfirm}
                disabled={isLoading || isCustomNo}
              >
                {getConfirmText()}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
