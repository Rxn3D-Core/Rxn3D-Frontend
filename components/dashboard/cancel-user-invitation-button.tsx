"use client"

import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { useCancelUserInvitation } from "@/hooks/use-user-invitations"

interface CancelUserInvitationButtonProps {
  /** Numeric invitation id (the cancel endpoint is addressed by id, not token). */
  invitationId?: number
  name: string
  email?: string
}

/** Trash icon on a pending user invitation row: asks for confirmation, then cancels the invitation. */
export function CancelUserInvitationButton({ invitationId, name, email }: CancelUserInvitationButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { toast } = useToast()
  const cancelInvitation = useCancelUserInvitation()

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!invitationId) {
      toast({
        title: "Cancel Failed",
        description: "This invitation cannot be cancelled right now. Please refresh the page and try again.",
        variant: "destructive",
      })
      return
    }
    setConfirmOpen(true)
  }

  return (
    <>
      <button
        type="button"
        className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-red-500 hover:bg-red-50 rounded-full transition-all disabled:opacity-60 disabled:pointer-events-none"
        disabled={cancelInvitation.isPending}
        onClick={handleClick}
        aria-label={`Cancel invitation for ${name}`}
        title="Cancel Invitation"
      >
        {cancelInvitation.isPending ? (
          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
        ) : (
          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
        )}
      </button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              The invitation for {name}
              {email ? ` (${email})` : ""} will be cancelled and its link will stop working. You can send a new
              invitation later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep invitation</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (invitationId) cancelInvitation.mutate({ id: invitationId, name })
              }}
            >
              Cancel invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
