"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { InvitationForm } from "@/components/invitation-form"
import { UserPlus, PlusCircle } from "lucide-react"
import { INVITE_ONBOARDING_MODALS_ENABLED } from "@/lib/invite-onboarding-modals"

interface DashboardDoctorInviteModalProps {
  doctorsCount: number
  isOpen: boolean
  onClose: () => void
}

export function DashboardDoctorInviteModal({
  doctorsCount,
  isOpen,
  onClose,
}: DashboardDoctorInviteModalProps) {
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!INVITE_ONBOARDING_MODALS_ENABLED && isOpen) {
      onClose()
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!INVITE_ONBOARDING_MODALS_ENABLED) {
      return
    }

    if (isOpen) {
      const hasSeen = localStorage.getItem("has_seen_doctor_invite_modal")
      if (!hasSeen && doctorsCount === 0) {
        setShowModal(true)
      }
    }
  }, [isOpen, doctorsCount])

  const handleClose = () => {
    setShowModal(false)
    localStorage.setItem("has_seen_doctor_invite_modal", "true")
    onClose()
  }

  const handleSuccess = () => {
    setShowModal(false)
    localStorage.setItem("has_seen_doctor_invite_modal", "true")
    onClose()
  }

  if (!INVITE_ONBOARDING_MODALS_ENABLED) {
    return null
  }

  return (
    <Dialog open={showModal} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[90vh]">
        <div className="bg-[#1162a8] p-5 sm:p-6 text-white text-center shrink-0">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 backdrop-blur-sm">
            <UserPlus className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold mb-2">Add Your First Doctor</DialogTitle>
          <DialogDescription className="text-sm text-blue-100">
            Your practice needs at least one doctor to manage clinical cases and approvals.
          </DialogDescription>
        </div>

        <div className="p-5 sm:p-8 bg-white flex-1 min-h-0 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <PlusCircle className="w-4 h-4 mr-2 text-[#1162a8] shrink-0" />
              Enter doctor details to send invitation
            </h3>
            <InvitationForm type="Doctor" onSuccess={handleSuccess} />
          </div>

          <div className="text-center pt-4 border-t border-gray-100">
            <button
              onClick={handleClose}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Maybe later, I'll add them from the team settings
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
