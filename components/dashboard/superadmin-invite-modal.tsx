"use client"

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { InvitationForm } from "@/components/invitation-form"
import { Building2, FlaskConical } from "lucide-react"

type InviteEntityType = "Office" | "Lab"

interface SuperAdminInviteModalProps {
  type: InviteEntityType
  isOpen: boolean
  onClose: () => void
}

const COPY: Record<InviteEntityType, { title: string; nameLabel: string; description: string }> = {
  Office: {
    title: "Invite New Practice",
    nameLabel: "Practice Name",
    description: "Enter the practice name and email. We'll send them an invitation to register on RXN3D.",
  },
  Lab: {
    title: "Invite New Lab",
    nameLabel: "Lab Name",
    description: "Enter the lab name and email. We'll send them an invitation to register on RXN3D.",
  },
}

/**
 * Super Admin invites a brand-new Practice or Lab by name + email. There is no "search existing"
 * step here (that connect flow is for lab/office admins, see DashboardInviteModal).
 */
export function SuperAdminInviteModal({ type, isOpen, onClose }: SuperAdminInviteModalProps) {
  const { title, nameLabel, description } = COPY[type]
  const Icon = type === "Lab" ? FlaskConical : Building2

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl">
        {/* min-w-0 on both children: DialogContent is a grid, and without it the form's min-content width
            stretches the column past the dialog's max width and the right edge gets clipped. */}
        <div className="min-w-0 bg-[#1162a8] p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Icon className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold mb-2">{title}</DialogTitle>
          <DialogDescription className="text-blue-100">{description}</DialogDescription>
        </div>

        <div className="min-w-0 p-8 bg-white">
          <InvitationForm
            type={type}
            nameLabel={nameLabel}
            submitLabel="Send Invite"
            onSuccess={onClose}
            onCancel={onClose}
            actionsAlign="end"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
