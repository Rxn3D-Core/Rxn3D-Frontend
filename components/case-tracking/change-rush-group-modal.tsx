"use client"

import { AlertTriangle } from "lucide-react"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { useCaseTracking } from "@/contexts/case-tracking-context"

interface ChangeRushGroupModalProps {
  isOpen: boolean
  onClose: () => void
  casePanId?: number
  casePanName?: string
  prefix?: string
  onConfirm?: () => void
}

export function ChangeRushGroupModal({
  isOpen,
  onClose,
  casePanId,
  casePanName,
  prefix,
  onConfirm
}: ChangeRushGroupModalProps) {
  const { t } = useTranslation()
  const { setRushGroup } = useCaseTracking()

  const handleContinue = async () => {
    if (casePanId) {
      await setRushGroup(casePanId, true)
    }
    if (onConfirm) {
      onConfirm()
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0">
        <div className="p-8 flex flex-col items-center text-center">
          {/* Warning Icon */}
          <div className="mb-6">
            <div className="w-24 h-24 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertTriangle className="h-16 w-16 text-yellow-600" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-semibold mb-4">
            {t("caseTracking.changeRushGroup", "Change Rush Group")}
          </h2>

          {/* Message */}
          <p className="text-gray-600 mb-8 text-lg">
            "{casePanName || "Regular Case"} - {prefix || "R"}" {t("caseTracking.willReplaceCurrentRushGroup", "will replace your current Rush group. Do you want to continue?")}
          </p>

          {/* Buttons */}
          <div className="flex gap-4 w-full">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 text-base"
            >
              {t("caseTracking.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleContinue}
              className="flex-1 h-12 text-base bg-[#1162a8] hover:bg-[#0f5490]"
            >
              {t("caseTracking.continue", "Continue")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
