"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

const SEND_BACK_ICON = "/icons/virtual-slip-center/send-back-to-office.svg"

interface SendCaseBackToOfficeModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void | Promise<void>
  loading?: boolean
}

export default function SendCaseBackToOfficeModal({
  open,
  onClose,
  onConfirm,
  loading = false,
}: SendCaseBackToOfficeModalProps) {
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (!open) {
      setReason("")
    }
  }, [open])

  const handleConfirm = () => {
    const trimmed = reason.trim()
    if (trimmed) {
      void onConfirm(trimmed)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !loading) onClose()
      }}
    >
      <DialogContent className="max-w-lg gap-0 rounded-[20px] border border-[#E5E7EB] p-0 shadow-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Send back to office</DialogTitle>
          <DialogDescription>
            You are about to send case back to the office.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col px-8 pb-8 pt-8">
          <div className="mb-6 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SEND_BACK_ICON}
              alt=""
              width={48}
              height={52}
              className="h-[52px] w-12 shrink-0"
              aria-hidden
            />
            <h2 className="text-xl font-bold text-[#111827]">
              Send back to office
            </h2>
          </div>

          <p className="mb-5 text-sm leading-relaxed text-[#374151]">
            You are about to send case back to the office.
          </p>

          <Textarea
            placeholder="Enter the reason for sending the case back"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
            rows={5}
            className="mb-8 min-h-[140px] resize-none rounded-lg border-[#D1D5DB] text-sm shadow-none focus-visible:ring-[#1162A8]"
          />

          <div className="flex justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="min-w-[120px] rounded-lg border-[#D1D5DB] bg-white text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!reason.trim() || loading}
              className="min-w-[120px] rounded-lg bg-[#D32F2F] text-sm font-medium text-white hover:bg-[#B71C1C] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Send back"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
