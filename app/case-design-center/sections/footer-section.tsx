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
        minHeight: "50px",
        background: "#FFFFFF",
        boxShadow: "0 -2px 8px rgba(0, 0, 0, 0.1)",
        position: "sticky",
        bottom: 0,
        width: "100%",
        zIndex: 9999,
      }}
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center h-full px-2 sm:px-4 py-1.5 gap-1.5 sm:gap-2 relative">
        {/* Row 1 on mobile: Cancel Slip left, Submit right */}
        <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
          <Button
            onClick={onShowCancelModal}
            style={{
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              padding: "8px 12px",
              gap: "8px",
              height: "24px",
              border: "2px solid #EF4444",
              borderRadius: "5px",
              fontFamily: "Verdana",
              fontStyle: "normal",
              fontWeight: 700,
              fontSize: "11px",
              lineHeight: "20px",
              letterSpacing: "-0.02em",
              color: "#fff",
              background: "#EF4444",
              whiteSpace: "nowrap",
            }}
            className="hover:opacity-80 flex-shrink-0"
          >
            Cancel Slip
          </Button>

          {/* Submit Case button - on mobile shows next to Cancel, on desktop shows at end */}
          {isAccordionComplete() && confirmDetailsChecked && (
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
                padding: "8px 12px",
                gap: "8px",
                height: "24px",
                background: isSubmitting ? "#9BA5B7" : "#1162A8",
                borderRadius: "5px",
                border: "none",
                fontFamily: "Verdana",
                fontStyle: "normal",
                fontWeight: 700,
                fontSize: "11px",
                lineHeight: "20px",
                letterSpacing: "-0.02em",
                color: "#FFFFFF",
                opacity: isSubmitting ? 0.5 : 1,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}
              className="hover:opacity-90 disabled:opacity-50 flex-shrink-0"
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

        {/* Row 2 on mobile: Acknowledgement checkbox (full width) */}
        {isAccordionComplete() && (
          <div
            className="flex items-center gap-1 sm:gap-1.5 w-full sm:w-auto sm:flex-1 sm:justify-end"
            style={{
              padding: "4px 6px",
              border: "1px solid #fbbf24",
              borderRadius: "5px",
              backgroundColor: confirmDetailsChecked ? "#fef3c7" : "transparent",
              transition: "background-color 0.2s ease",
            }}
          >
            <TriangleAlert
              className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0"
              style={{ color: "#fbbf24" }}
            />
            <label
              htmlFor="confirm-details-footer"
              className="text-[10px] sm:text-xs cursor-pointer leading-tight flex-1 sm:flex-initial"
              style={{
                fontFamily: "Arial",
                fontStyle: "normal",
                fontWeight: 400,
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
              className="flex-shrink-0 h-4 w-4"
              style={{
                borderColor: "#1162a8",
                backgroundColor: confirmDetailsChecked ? "#1162a8" : "transparent",
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}


