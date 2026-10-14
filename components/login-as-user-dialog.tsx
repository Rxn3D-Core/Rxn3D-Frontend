"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

type LoginAsUserDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetName: string
  onConfirm: (reason: string) => Promise<boolean>
}

export function LoginAsUserDialog({
  open,
  onOpenChange,
  targetName,
  onConfirm,
}: LoginAsUserDialogProps) {
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    const trimmed = reason.trim()
    if (trimmed.length < 3) {
      setError("Enter a short reason (at least 3 characters).")
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const ok = await onConfirm(trimmed)
      if (ok) {
        setReason("")
        onOpenChange(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting) return
        onOpenChange(next)
        if (!next) {
          setReason("")
          setError(null)
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Login as user</DialogTitle>
          <DialogDescription>
            Start a 30-minute support session as <strong>{targetName}</strong>. Your actions will use
            their permissions. Provide a reason for the audit log.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="impersonation-reason">Reason</Label>
          <Textarea
            id="impersonation-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer reported missing slip on case list"
            maxLength={500}
            rows={3}
            disabled={submitting}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Starting..." : "Login as user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
