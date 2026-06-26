"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import CancelSlipCreationModal from "@/components/cancel-slip-creation-modal"
import { SubmitSlipButton } from "@/components/submit-slip-button"

interface SlipCreationStepFooterProps {
  /** Footer mode: "navigation" for step pages, "submit" for final case-design step */
  mode: "navigation" | "submit"

  // Navigation mode props
  /** Whether to show the Previous button (navigation mode) */
  showPrevious?: boolean
  /** Handler for Previous button click */
  onPrevious?: () => void

  // Submit mode props
  /** Whether the form is currently submitting */
  isSubmitting?: boolean
  /** Whether the confirm details checkbox is checked */
  confirmDetailsChecked?: boolean
  /** Function to check if accordion/products are complete */
  isAccordionComplete?: () => boolean
  /** Human-readable label of the first incomplete required field */
  incompleteFieldLabel?: string | null
  /** When true, a tooth-status required field has a validation error — hides the acknowledgement label */
  hasToothStatusValidation?: boolean
  /** Handler for submit action */
  onSubmit?: () => void
  /** Handler for confirm details checkbox change */
  onConfirmDetailsChange?: (checked: boolean) => void
  /** Handler for submit popover change */
  onShowSubmitPopoverChange?: (show: boolean) => void

  // Shared props
  /** Custom handler for cancel slip - if not provided, shows CancelSlipCreationModal */
  onCancelSlip?: () => void
}

export function SlipCreationStepFooter({
  mode,
  showPrevious = true,
  onPrevious,
  isSubmitting = false,
  confirmDetailsChecked = false,
  isAccordionComplete,
  incompleteFieldLabel,
  hasToothStatusValidation = false,
  onSubmit,
  onConfirmDetailsChange,
  onShowSubmitPopoverChange,
  onCancelSlip,
}: SlipCreationStepFooterProps) {
  const router = useRouter()
  const [showCancelModal, setShowCancelModal] = useState(false)

  const handleCancelSlip = () => {
    if (onCancelSlip) {
      onCancelSlip()
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

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious()
    } else {
      router.back()
    }
  }

  return (
    <>
      <div
        className="bg-white flex-shrink-0 z-50"
        style={{
          minHeight: "72px",
          background: "#FFFFFF",
          borderTop: "1px solid #e5e7eb",
          boxShadow: "0 -4px 16px rgba(0, 0, 0, 0.12)",
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          width: "100%",
          zIndex: 9999,
        }}
      >
        <div className="flex justify-between items-center h-full min-h-[72px] px-6 py-3 relative">
          <div className="flex justify-between items-center w-full">
            {/* Cancel Slip button - always on left */}
            <Button
              onClick={handleCancelSlip}
              style={{
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                padding: "10px 16px",
                gap: "8px",
                minWidth: "120px",
                height: "40px",
                border: "none",
                borderRadius: "5px",
                fontFamily: "Verdana",
                fontStyle: "normal",
                fontWeight: 600,
                fontSize: "16px",
                lineHeight: "20px",
                letterSpacing: "-0.02em",
                color: "#fff",
                background: "radial-gradient(ellipse at center, #CF0202 0%, #910202 100%)",
                whiteSpace: "nowrap",
              }}
              className="hover:opacity-80"
            >
              Cancel Slip
            </Button>

            {/* Right side content */}
            <div className="flex items-center gap-3">
              {mode === "navigation" && showPrevious && (
                <Button
                  onClick={handlePrevious}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "10px 16px",
                    gap: "8px",
                    minWidth: "120px",
                    height: "40px",
                    background: "#1162A8",
                    borderRadius: "5px",
                    border: "none",
                    fontFamily: "Verdana",
                    fontStyle: "normal",
                    fontWeight: 600,
                    fontSize: "16px",
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

              {mode === "submit" && isAccordionComplete?.() && !hasToothStatusValidation && (
                <div 
                  className="static sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-y-1/2 sm:-translate-x-1/2 flex items-center justify-center z-10 w-full sm:w-auto mt-2 sm:mt-0"
                >
                  <SubmitSlipButton
                    isSubmitting={isSubmitting}
                    onClick={(e) => {
                      e.preventDefault()
                      onShowSubmitPopoverChange?.(false)
                      onSubmit?.()
                    }}
                  />
                </div>
              )}
            </div>
          </div>
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
