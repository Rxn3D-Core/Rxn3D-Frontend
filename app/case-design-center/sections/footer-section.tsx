"use client"

import { Button } from "@/components/ui/button"
import { SlipCreationFooter } from "@/components/slip-creation-footer"
import { SubmitSlipButton } from "@/components/submit-slip-button"

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
        position: "sticky",
        bottom: 0,
        width: "100%",
        zIndex: 9999,
      }}
    >
      <div className="flex justify-between items-center h-full min-h-[72px] px-6 py-3 relative">
        <div className="flex justify-between items-center w-full">
          {/* Cancel Slip button - always on left */}
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

          {/* Center / Right content */}
          <div className="flex items-center gap-3">
            {isAccordionComplete() && (
              <div 
                className="static sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-y-1/2 sm:-translate-x-1/2 flex items-center justify-center z-10 w-full sm:w-auto mt-2 sm:mt-0"
              >
                <SubmitSlipButton
                  isSubmitting={isSubmitting}
                  onClick={(e) => {
                    e.preventDefault()
                    onShowSubmitPopoverChange(false)
                    onSubmit()
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


