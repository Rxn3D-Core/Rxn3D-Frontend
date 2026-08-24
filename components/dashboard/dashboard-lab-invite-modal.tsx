"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { InvitationForm } from "@/components/invitation-form"
import { CustomerSearchBox } from "@/components/CustomerSearchBox"
import { Microscope, Search, PlusCircle } from "lucide-react"

interface DashboardLabInviteModalProps {
  labsCount: number
  invitationsCount: number
  isOpen: boolean
  onClose: () => void
}

export function DashboardLabInviteModal({
  labsCount,
  invitationsCount,
  isOpen,
  onClose,
}: DashboardLabInviteModalProps) {
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const hasExistingLabs = labsCount > 0 || invitationsCount > 0
    if (hasExistingLabs) {
      setShowModal(false)
      return
    }
    if (isOpen) {
      const hasSeen = localStorage.getItem("has_seen_lab_invite_modal")
      if (!hasSeen) {
        setShowModal(true)
      }
    }
  }, [isOpen, labsCount, invitationsCount])

  const handleClose = () => {
    setShowModal(false)
    localStorage.setItem("has_seen_lab_invite_modal", "true")
    onClose()
  }

  const handleSuccess = () => {
    setShowModal(false)
    localStorage.setItem("has_seen_lab_invite_modal", "true")
    onClose()
  }

  const handleCustomerSelect = (customer: any) => {
    // Selection handled by CustomerSearchBox
  }

  return (
    <Dialog open={showModal} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-[#1162a8] p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Microscope className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold mb-2">Connect Your First Lab</DialogTitle>
          <DialogDescription className="text-blue-100">
            Link with laboratories to start sending cases and collaborating on digital designs.
          </DialogDescription>
        </div>
        
        <div className="p-8 bg-white max-h-[70vh] overflow-y-auto">
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <Search className="w-4 h-4 mr-2 text-[#1162a8]" />
              Search for existing laboratories
            </h3>
            <CustomerSearchBox 
              type="Lab" 
              placeholder="Search by lab name, city or email..." 
              onSelect={handleCustomerSelect}
              onInviteSuccess={handleSuccess}
            />
            <p className="mt-2 text-xs text-gray-500">
              Find labs already on the platform to establish an instant connection.
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
              Enter laboratory details
            </h3>
            <InvitationForm type="Lab" onSuccess={handleSuccess} />
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
