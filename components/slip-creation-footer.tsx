"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import CancelSlipCreationModal from "@/components/cancel-slip-creation-modal"
import { useState } from "react"

interface SlipCreationFooterProps {
  /** Whether to show the Previous button */
  showPrevious?: boolean
  /** Custom handler for Previous button click (defaults to router.back()) */
  onPrevious?: () => void
  /** Custom handler for Cancel button click (defaults to showing cancel modal) */
  onCancel?: () => void
}

export function SlipCreationFooter({
  showPrevious = false,
  onPrevious,
  onCancel,
}: SlipCreationFooterProps) {
  const router = useRouter()
  const [showCancelModal, setShowCancelModal] = useState(false)

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious()
    } else {
      router.back()
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      setShowCancelModal(true)
    }
  }

  const handleCancelConfirm = () => {
    setShowCancelModal(false)
    setTimeout(() => {
      router.replace("/dashboard")
    }, 100)
  }

  return (
    <>
      {/* Footer - Consistent across all pages */}
      <div
        className="bg-white flex-shrink-0 sticky bottom-0 left-0 right-0 z-10"
        style={{
          height: "50px",
          background: "#FFFFFF",
        }}
      >
        <div className={`flex justify-end items-center ${showPrevious ? 'gap-2' : ''} h-full px-4`}>
          {showPrevious && (
            <Button
              onClick={handlePrevious}
              variant="outline"
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                padding: "8px 12px",
                gap: "8px",
                minWidth: "100px",
                height: "24px",
                background: "#1162A8",
                borderRadius: "5px",
                border: "none",
                fontFamily: "Verdana",
                fontStyle: "normal",
                fontWeight: 700,
                fontSize: "11px",
                lineHeight: "20px",
                letterSpacing: "-0.02em",
                color: "#FFFFFF",
                whiteSpace: "nowrap",
              }}
              className="hover:opacity-90"
            >
              Previous
            </Button>
          )}
          <Button
            onClick={handleCancel}
            variant="outline"
            style={{
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              padding: "8px 12px",
              gap: "8px",
              minWidth: "100px",
              height: "24px",
              border: "2px solid #9BA5B7",
              borderRadius: "5px",
              fontFamily: "Verdana",
              fontStyle: "normal",
              fontWeight: 700,
              fontSize: "11px",
              lineHeight: "20px",
              letterSpacing: "-0.02em",
              color: "#9BA5B7",
              background: "transparent",
              whiteSpace: "nowrap",
            }}
            className="hover:opacity-80"
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Cancel Slip Creation Modal */}
      {showCancelModal && (
        <CancelSlipCreationModal
          open={showCancelModal}
          onCancel={() => setShowCancelModal(false)}
          onConfirm={handleCancelConfirm}
        />
      )}
    </>
  )
}
