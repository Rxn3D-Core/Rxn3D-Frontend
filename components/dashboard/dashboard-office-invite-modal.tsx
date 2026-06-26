"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { InvitationForm } from "@/components/invitation-form"
import { CustomerSearchBox } from "@/components/CustomerSearchBox"
import { Building2, Search, PlusCircle } from "lucide-react"

interface DashboardOfficeInviteModalProps {
  practicesCount: number
  invitationsCount: number
  isOpen: boolean
  onClose: () => void
  forceOpen?: boolean
}

export function DashboardOfficeInviteModal({
  practicesCount,
  invitationsCount,
  isOpen,
  onClose,
  forceOpen = false,
}: DashboardOfficeInviteModalProps) {
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setShowModal(false)
      return
    }

    if (forceOpen) {
      setShowModal(true)
      return
    }

    // Show modal if it's open and user hasn't seen it in this session (or as per rules)
    const hasSeen = localStorage.getItem("has_seen_office_invite_modal")
    if (!hasSeen && practicesCount === 0 && invitationsCount === 0) {
      setShowModal(true)
    }
  }, [forceOpen, isOpen, practicesCount, invitationsCount])

  const handleClose = () => {
    setShowModal(false)
    localStorage.setItem("has_seen_office_invite_modal", "true")
    onClose()
  }

  const handleSuccess = () => {
    setShowModal(false)
    localStorage.setItem("has_seen_office_invite_modal", "true")
    onClose()
  }

  const handleCustomerSelect = (customer: any) => {
    // If a customer is selected from search, we can either automatically invite them
    // or fill the form. CustomerSearchBox already has an invite button inside it.
    // We just need to handle the case where they might click the row.
  }

  return (
    <Dialog open={showModal} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-[#1162a8] p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold mb-2">
            {forceOpen ? "Invite Your Practice" : "Invite Your First Practice"}
          </DialogTitle>
          <DialogDescription className="text-blue-100">
            Connect with dental practices to start receiving cases and managing your digital workflow.
          </DialogDescription>
        </div>
        
        <div className="p-8 bg-white max-h-[70vh] overflow-y-auto">
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <Search className="w-4 h-4 mr-2 text-[#1162a8]" />
              Search for existing practices
            </h3>
            <CustomerSearchBox 
              type="Office" 
              placeholder="Search by name, city or email..." 
              onSelect={handleCustomerSelect}
              onInviteSuccess={handleSuccess}
            />
            <p className="mt-2 text-xs text-gray-500">
              Try searching for practices already on the platform to connect instantly.
            </p>
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-100"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">Or invite manually</span>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <PlusCircle className="w-4 h-4 mr-2 text-[#1162a8]" />
              Enter practice details
            </h3>
            <InvitationForm
              type="Office"
              onSuccess={handleSuccess}
              onCancel={handleClose}
              actionsAlign="end"
            />
          </div>
          
          <div className="text-center pt-4 border-t border-gray-100">
            <button 
              onClick={handleClose}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Maybe later, take me to dashboard
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
