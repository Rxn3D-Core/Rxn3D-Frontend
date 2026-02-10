"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, TriangleAlert } from "lucide-react"
import CancelSlipCreationModal from "@/components/cancel-slip-creation-modal"

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
                border: "2px solid #EF4444",
                borderRadius: "5px",
                fontFamily: "Verdana",
                fontStyle: "normal",
                fontWeight: 700,
                fontSize: "14px",
                lineHeight: "20px",
                letterSpacing: "-0.02em",
                color: "#fff",
                background: "#EF4444",
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
                    fontWeight: 700,
                    fontSize: "14px",
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

              {mode === "submit" && isAccordionComplete?.() && (
                <>
                  {/* Confirmation checkbox with warning */}
                  <div
                    className="flex items-center gap-3"
                    style={{
                      padding: "10px 16px",
                      border: "1px solid #fbbf24",
                      borderRadius: "8px",
                      backgroundColor: confirmDetailsChecked ? "#fef3c7" : "transparent",
                      transition: "background-color 0.2s ease",
                    }}
                  >
                    <TriangleAlert
                      className="h-6 w-6 flex-shrink-0"
                      style={{ color: "#fbbf24" }}
                    />
                    <label
                      htmlFor="confirm-details-step-footer"
                      className="cursor-pointer whitespace-nowrap"
                      style={{
                        fontFamily: "Arial",
                        fontStyle: "normal",
                        fontWeight: 400,
                        fontSize: "15px",
                        lineHeight: "22px",
                        color: "#000000",
                      }}
                    >
                      By clicking this box you acknowledge all information is correct.
                    </label>
                    <Checkbox
                      id="confirm-details-step-footer"
                      checked={confirmDetailsChecked}
                      onCheckedChange={(checked) => {
                        onConfirmDetailsChange?.(checked === true)
                        if (checked === true) {
                          onShowSubmitPopoverChange?.(false)
                        }
                      }}
                      className="flex-shrink-0 h-5 w-5"
                      style={{
                        borderColor: "#1162a8",
                        backgroundColor: confirmDetailsChecked ? "#1162a8" : "transparent",
                      }}
                    />
                  </div>

                  {/* Submit Case button - Only show when checkbox is checked */}
                  {confirmDetailsChecked && (
                    <Button
                      onClick={(e) => {
                        e.preventDefault()
                        onShowSubmitPopoverChange?.(false)
                        onSubmit?.()
                      }}
                      disabled={isSubmitting}
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: "10px 16px",
                        gap: "8px",
                        minWidth: "120px",
                        height: "40px",
                        background: isSubmitting ? "#9BA5B7" : "#1162A8",
                        borderRadius: "5px",
                        border: "none",
                        fontFamily: "Verdana",
                        fontStyle: "normal",
                        fontWeight: 700,
                        fontSize: "14px",
                        lineHeight: "20px",
                        letterSpacing: "-0.02em",
                        color: "#FFFFFF",
                        opacity: isSubmitting ? 0.5 : 1,
                        cursor: isSubmitting ? "not-allowed" : "pointer",
                        whiteSpace: "nowrap",
                      }}
                      className="hover:opacity-90 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2
                            style={{
                              width: "18px",
                              height: "18px",
                              flex: "none",
                              order: 0,
                              flexGrow: 0,
                            }}
                            className="animate-spin"
                          />
                          <span
                            style={{
                              flex: "none",
                              order: 1,
                              flexGrow: 0,
                            }}
                          >
                            Submitting...
                          </span>
                        </>
                      ) : (
                        <span
                          style={{
                            height: "20px",
                            display: "flex",
                            alignItems: "center",
                            flex: "none",
                            order: 1,
                            flexGrow: 0,
                          }}
                        >
                          Submit Case
                        </span>
                      )}
                    </Button>
                  )}
                </>
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
