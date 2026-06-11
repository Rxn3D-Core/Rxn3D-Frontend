"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { InvitationForm } from "@/components/invitation-form"
import { CustomerSearchBox } from "@/components/CustomerSearchBox"
import { Building2, Search, PlusCircle } from "lucide-react"

type InviteEntityType = "Office" | "Lab"

interface DashboardInviteModalProps {
  type: InviteEntityType
  title: string
  description: string
  searchPlaceholder?: string
  isOpen: boolean
  onClose: () => void
  forceOpen?: boolean
}

export function DashboardInviteModal({
  type,
  title,
  description,
  searchPlaceholder = "Search by name, city or email...",
  isOpen,
  onClose,
  forceOpen = false,
}: DashboardInviteModalProps) {
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
    const storageKey = `has_seen_${type.toLowerCase()}_invite_modal`
    const hasSeen = localStorage.getItem(storageKey)
    if (!hasSeen) {
      setShowModal(true)
    }
  }, [forceOpen, isOpen, type])

  const handleClose = () => {
    setShowModal(false)
    localStorage.setItem(`has_seen_${type.toLowerCase()}_invite_modal`, "true")
    onClose()
  }

  const handleSuccess = () => {
    setShowModal(false)
    localStorage.setItem(`has_seen_${type.toLowerCase()}_invite_modal`, "true")
    onClose()
  }

  return (
    <Dialog open={showModal} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-[#1162a8] p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold mb-2">{title}</DialogTitle>
          <DialogDescription className="text-blue-100">{description}</DialogDescription>
        </div>

        <div className="p-8 bg-white max-h-[70vh] overflow-y-auto">
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <Search className="w-4 h-4 mr-2 text-[#1162a8]" />
              Search for existing {type === "Lab" ? "labs" : "practices"}
            </h3>
            <CustomerSearchBox
              type={type}
              placeholder={searchPlaceholder}
              onSelect={() => {}}
              onInviteSuccess={handleSuccess}
            />
            <p className="mt-2 text-xs text-gray-500">
              Try searching for {type === "Lab" ? "labs" : "practices"} already on the platform to connect instantly.
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
              Enter {type === "Lab" ? "lab" : "practice"} details
            </h3>
            <InvitationForm
              type={type}
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
