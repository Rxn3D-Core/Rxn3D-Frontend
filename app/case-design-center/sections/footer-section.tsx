"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, Loader2, TriangleAlert } from "lucide-react"
import { SlipCreationFooter } from "@/components/slip-creation-footer"

interface FooterSectionProps {
  showProductDetails: boolean
  isSubmitting: boolean
  confirmDetailsChecked: boolean
  showSubmitPopover: boolean
  isAccordionComplete: () => boolean
  onCancel: () => void
  onPreview: () => void
  onShowCancelModal: () => void
  onSubmit: () => void
  onConfirmDetailsChange: (checked: boolean) => void
  onShowSubmitPopoverChange: (show: boolean) => void
  hidePreviousButton?: boolean
  hasProductAccordions?: boolean
}

export function FooterSection({
  showProductDetails,
  isSubmitting,
  confirmDetailsChecked,
  showSubmitPopover,
  isAccordionComplete,
  onCancel,
  onPreview,
  onShowCancelModal,
  onSubmit,
  onConfirmDetailsChange,
  onShowSubmitPopoverChange,
  hidePreviousButton = false,
  hasProductAccordions = false,
}: FooterSectionProps) {
  // When not showing product details, use SlipCreationFooter component
  if (!showProductDetails) {
    return (
      <SlipCreationFooter 
        showPrevious={!hidePreviousButton}
        onPrevious={onCancel}
      />
    )
  }

  // When showing product details, use the complex footer with Submit functionality
  return (
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
        {/* Teeth selection page footer: Cancel Slip on left, Submit and Popover on right */}
        <div className="flex justify-between items-center w-full">
            {/* Cancel Slip button on left */}
            <Button
              onClick={onShowCancelModal}
              style={{
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                padding: "10px 16px",
                gap: "8px",
                minWidth: "120px",
                height: "36px",
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
            
            {/* Warning, Checkbox, and Submit button on right */}
            {isAccordionComplete() && (
              <div className="flex items-center gap-2">
                {/* Popover (checkbox with warning and submit button) */}
                <div
                  className="flex items-center gap-3"
                  style={{
                    padding: "12px 18px",
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
                    htmlFor="confirm-details-footer"
                    className="cursor-pointer whitespace-nowrap"
                    style={{
                      fontFamily: "Arial",
                      fontStyle: "normal",
                      fontWeight: 400,
                      fontSize: "16px",
                      lineHeight: "22px",
                      color: "#000000",
                    }}
                  >
                    By clicking this box you acknowledge all information is correct.
                  </label>
                  <Checkbox
                    id="confirm-details-footer"
                    checked={confirmDetailsChecked}
                    onCheckedChange={(checked) => {
                      onConfirmDetailsChange(checked === true)
                      // Hide popover when checkbox is checked
                      if (checked === true) {
                        onShowSubmitPopoverChange(false)
                      }
                    }}
                    className="flex-shrink-0 h-5 w-5"
                    style={{
                      borderColor: "#1162a8",
                      backgroundColor: confirmDetailsChecked ? "#1162a8" : "transparent",
                    }}
                  />
                  {/* Submit Case button - Only show when checkbox is checked */}
                  {confirmDetailsChecked && (
                    <Button
                      onClick={(e) => {
                        e.preventDefault()
                        onShowSubmitPopoverChange(false)
                        onSubmit()
                      }}
                      disabled={isSubmitting}
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: "10px 14px",
                        gap: "8px",
                        minWidth: "120px",
                        height: "36px",
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
                            height: "18px",
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
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}


