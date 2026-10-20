"use client"

import { useState, type ReactNode } from "react"
import { CircleX, Loader2, Trash2 } from "lucide-react"
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
import { useCancelUserInvitation, useDeleteUserInvitation } from "@/hooks/use-user-invitations"

interface InvitationActionProps {
  /** Numeric invitation id (the cancel / delete endpoints are addressed by id, not token). */
  invitationId?: number
  name: string
  email?: string
}

interface ConfirmIconButtonProps {
  icon: ReactNode
  isPending: boolean
  ariaLabel: string
  title: string
  /** Tailwind hover classes that tint the icon for this action. */
  hoverClass: string
  invitationId?: number
  failTitle: string
  failMessage: string
  confirmTitle: string
  confirmDescription: ReactNode
  keepLabel: string
  confirmLabel: string
  onConfirm: (invitationId: number) => void
}

/** Icon button on a pending invitation row: asks for confirmation, then runs the action. */
function ConfirmIconButton({
  icon,
  isPending,
  ariaLabel,
  title,
  hoverClass,
  invitationId,
  failTitle,
  failMessage,
  confirmTitle,
  confirmDescription,
  keepLabel,
  confirmLabel,
  onConfirm,
}: ConfirmIconButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { toast } = useToast()

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!invitationId) {
      toast({ title: failTitle, description: failMessage, variant: "destructive" })
      return
    }
    setConfirmOpen(true)
  }

  return (
    <>
      <button
        type="button"
        className={`p-1.5 sm:p-2 text-[#a19d9d] rounded-full transition-all disabled:opacity-60 disabled:pointer-events-none ${hoverClass}`}
        disabled={isPending}
        onClick={handleClick}
        aria-label={ariaLabel}
        title={title}
      >
        {isPending ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : icon}
      </button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{keepLabel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (invitationId) onConfirm(invitationId)
              }}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

const who = (name: string, email?: string) => `${name}${email ? ` (${email})` : ""}`

/** Cancel: the invitation stays on record as "Cancelled" and its link stops working. */
export function CancelUserInvitationButton({ invitationId, name, email }: InvitationActionProps) {
  const cancelInvitation = useCancelUserInvitation()

  return (
    <ConfirmIconButton
      icon={<CircleX className="h-3 w-3 sm:h-4 sm:w-4" />}
      isPending={cancelInvitation.isPending}
      ariaLabel={`Cancel invitation for ${name}`}
      title="Cancel Invitation"
      hoverClass="hover:text-orange-500 hover:bg-orange-50"
      invitationId={invitationId}
      failTitle="Cancel Failed"
      failMessage="This invitation cannot be cancelled right now. Please refresh the page and try again."
      confirmTitle="Cancel this invitation?"
      confirmDescription={`The invitation for ${who(name, email)} will be cancelled and its link will stop working. It stays on record as cancelled, and you can send a new invitation later.`}
      keepLabel="Keep invitation"
      confirmLabel="Cancel invitation"
      onConfirm={(id) => cancelInvitation.mutate({ id, name })}
    />
  )
}

/** Delete: the invitation is removed for good (its link no longer exists). */
export function DeleteUserInvitationButton({ invitationId, name, email }: InvitationActionProps) {
  const deleteInvitation = useDeleteUserInvitation()

  return (
    <ConfirmIconButton
      icon={<Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />}
      isPending={deleteInvitation.isPending}
      ariaLabel={`Delete invitation for ${name}`}
      title="Delete Invitation"
      hoverClass="hover:text-red-500 hover:bg-red-50"
      invitationId={invitationId}
      failTitle="Delete Failed"
      failMessage="This invitation cannot be deleted right now. Please refresh the page and try again."
      confirmTitle="Delete this invitation?"
      confirmDescription={`The invitation for ${who(name, email)} will be permanently deleted and its link will stop working. This cannot be undone.`}
      keepLabel="Keep invitation"
      confirmLabel="Delete invitation"
      onConfirm={(id) => deleteInvitation.mutate({ id, name })}
    />
  )
}
