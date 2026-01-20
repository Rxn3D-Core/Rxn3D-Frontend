"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, Loader2, TriangleAlert } from "lucide-react"

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
  return (
    <div 
      className="bg-white flex-shrink-0 z-50"
      style={{
        height: "59.94px",
        background: "#FFFFFF",
        boxShadow: "0 -2px 8px rgba(0, 0, 0, 0.1)",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        zIndex: 9999,
      }}
    >
      <div className="flex justify-between items-center h-full px-6 relative">
        {!showProductDetails ? (
          // Regular footer with Previous and Cancel buttons on right
          <div className="flex justify-end w-full gap-3">
            {!hidePreviousButton && (
              <Button
                onClick={onCancel}
                variant="outline"
                style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "12px 16px",
                  gap: "10px",
                  minWidth: "111px",
                  height: "27px",
                  background: "#1162A8",
                  borderRadius: "6px",
                  border: "none",
                  fontFamily: "Verdana",
                  fontStyle: "normal",
                  fontWeight: 700,
                  fontSize: "12px",
                  lineHeight: "22px",
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
              onClick={onCancel}
              variant="outline"
              style={{
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                padding: "12px 16px",
                gap: "10px",
                minWidth: "111px",
                height: "27px",
                border: "2px solid #9BA5B7",
                borderRadius: "6px",
                fontFamily: "Verdana",
                fontStyle: "normal",
                fontWeight: 700,
                fontSize: "12px",
                lineHeight: "22px",
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
        ) : (
          // Teeth selection page footer: Preview on left, Cancel and Submit on right
          <div className="flex justify-between items-center w-full">
            {/* Preview button on left - Show if there are product accordions */}
            <div>
              {hasProductAccordions ? (
                <Button
                  onClick={onPreview}
                  variant="outline"
                  style={{
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "12px 16px",
                    gap: "10px",
                    minWidth: "111px",
                    height: "34px",
                    border: "2px solid #9BA5B7",
                    borderRadius: "6px",
                    fontFamily: "Verdana",
                    fontStyle: "normal",
                    fontWeight: 700,
                    fontSize: "12px",
                    lineHeight: "22px",
                    letterSpacing: "-0.02em",
                    color: "#9BA5B7",
                    background: "transparent",
                    whiteSpace: "nowrap",
                  }}
                  className="hover:opacity-80"
                >
                  <Eye 
                    style={{
                      width: "24px",
                      height: "24px",
                      flex: "none",
                      order: 0,
                      flexGrow: 0,
                    }}
                  />
                  <span
                    style={{
                      height: "22px",
                      display: "flex",
                      alignItems: "center",
                      flex: "none",
                      order: 1,
                      flexGrow: 0,
                    }}
                  >
                    Preview
                  </span>
                </Button>
              ) : (
                <div style={{ width: "111px" }}></div>
              )}
            </div>
            
            {/* Cancel and Submit buttons on right */}
            <div className="flex items-center gap-3">
              <Button
                onClick={onShowCancelModal}
                variant="outline"
                style={{
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "12px 16px",
                  gap: "10px",
                  minWidth: "111px",
                  height: "27px",
                  border: "2px solid #9BA5B7",
                  borderRadius: "6px",
                  fontFamily: "Verdana",
                  fontStyle: "normal",
                  fontWeight: 700,
                  fontSize: "12px",
                  lineHeight: "22px",
                  letterSpacing: "-0.02em",
                  color: "#9BA5B7",
                  background: "transparent",
                  whiteSpace: "nowrap",
                }}
                className="hover:opacity-80"
              >
                Cancel
              </Button>
              {/* Submit Case button with tooltip - Show if accordion is complete */}
              {isAccordionComplete() ? (
              <div className="relative">
                <Button
                  onClick={(e) => {
                    e.preventDefault()
                    if (!confirmDetailsChecked) {
                      onShowSubmitPopoverChange(true)
                    } else {
                      onShowSubmitPopoverChange(false)
                      onSubmit()
                    }
                  }}
                  disabled={isSubmitting}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "12px 16px",
                    gap: "10px",
                    minWidth: "111px",
                    height: "27px",
                    background: isSubmitting ? "#9BA5B7" : "#1162A8",
                    borderRadius: "6px",
                    border: "none",
                    fontFamily: "Verdana",
                    fontStyle: "normal",
                    fontWeight: 700,
                    fontSize: "12px",
                    lineHeight: "22px",
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
                          width: "24px",
                          height: "24px",
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
                        height: "22px",
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
                
                {/* Tooltip - shown when submit is clicked, stays visible until submit is clicked again */}
                {showSubmitPopover && (
                  <div className="absolute bottom-full right-0 mb-2 z-50">
                    <div className={`relative rounded-lg px-4 py-3 shadow-lg ${
                      confirmDetailsChecked 
                        ? "bg-orange-100 border border-orange-200" 
                        : "bg-white border border-gray-200"
                    }`}>
                      <div className={`absolute -bottom-2 right-6 w-4 h-4 transform rotate-45 ${
                        confirmDetailsChecked 
                          ? "bg-orange-100 border-r border-b border-orange-200" 
                          : "bg-white border-r border-b border-gray-200"
                      }`}></div>
                      <div className="flex items-center gap-3 whitespace-nowrap">
                        <label
                          htmlFor="confirm-details-tooltip"
                          className={`text-sm cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                            confirmDetailsChecked ? "text-orange-800" : "text-gray-700"
                          }`}
                        >
                          <TriangleAlert 
                            className="h-6 w-6 flex-shrink-0" 
                            style={{ color: "#fbbf24" }}
                          />
                          By clicking this box you acknowledge all information is correct.
                        </label>
                        <Checkbox
                          id="confirm-details-tooltip"
                          checked={confirmDetailsChecked}
                          onCheckedChange={(checked) => {
                            onConfirmDetailsChange(checked === true)
                          }}
                          className="flex-shrink-0"
                          style={{
                            borderColor: "#1162a8",
                            backgroundColor: confirmDetailsChecked ? "#1162a8" : "transparent",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


