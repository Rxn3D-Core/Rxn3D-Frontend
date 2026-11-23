"use client"

import { X } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { UsingProduct } from "@/lib/product-library/item-usage"

export type WarningActionType = "delete" | "deactivate"

interface WarningActionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  type: WarningActionType
  itemName: string
  /** Products that use the item (RXN-89). Empty: plain "Are you sure" confirmation. No count is shown. */
  products?: UsingProduct[]
  /** Link target for a product row in the "Show products" list */
  productHref?: (productId: number) => string
  isLoading?: boolean
}

export function WarningActionModal({
  isOpen,
  onClose,
  onConfirm,
  type,
  itemName,
  products = [],
  productHref,
  isLoading = false,
}: WarningActionModalProps) {
  const { t } = useTranslation()
  const [showProducts, setShowProducts] = useState(false)
  const confirmInFlightRef = useRef(false)
  const hasProducts = products.length > 0

  const title =
    type === "delete"
      ? t("productLibrary.usageWarning.confirmDeletion", "Confirm Deletion")
      : t("productLibrary.usageWarning.confirmDeactivation", "Confirm Deactivation")

  const handleClose = () => {
    if (isLoading || confirmInFlightRef.current) return
    setShowProducts(false)
    onClose()
  }

  const handleConfirm = async () => {
    if (isLoading || confirmInFlightRef.current) return
    confirmInFlightRef.current = true
    try {
      await onConfirm()
      setShowProducts(false)
    } finally {
      confirmInFlightRef.current = false
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      <DialogContent
        className="flex flex-col items-start p-0 pb-[15px] w-[calc(100vw-32px)] sm:w-[700px] max-w-[700px] bg-white border border-[#CF0202] rounded-[18px] gap-0 [&>button]:hidden"
        style={{ boxShadow: "9px 7px 21.5px rgba(0, 0, 0, 0.25)" }}
      >
        {/* Header — Disable item */}
        <div className="flex flex-row justify-between items-center px-4 sm:px-[40px] py-[10px] w-full h-[70px] flex-none self-stretch">
          {/* Title */}
          <span
            className="font-bold text-[20px] leading-[22px] tracking-[-0.02em] text-[#000000]"
            style={{ fontFamily: "Verdana, sans-serif" }}
          >
            {title}
          </span>
          {/* Close */}
          <button
            onClick={handleClose}
            className="w-[24px] h-[24px] flex items-center justify-center text-[#000000] hover:opacity-60 transition-opacity"
          >
            <X className="w-[12px] h-[12px]" strokeWidth={2} />
          </button>
        </div>

        {/* Body — Disable item message */}
        <div className="flex flex-col items-center py-[20px] gap-[17px] w-full flex-none self-stretch">
          {/* Warning icon + message row */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-[16px] px-4 sm:px-[40px] w-full">
            {/* Warning triangle — 95x82 */}
            <div className="flex-shrink-0 w-[95px] h-[82px] flex items-center justify-center">
              <svg width="95" height="82" viewBox="0 0 95 82" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M47.5 0L95 82H0L47.5 0Z" fill="#EDBA29" />
                <rect x="43.4" y="21" width="8.2" height="38" rx="4.1" fill="#000000" />
                <circle cx="47.5" cy="67.5" r="5" fill="#000000" />
              </svg>
            </div>

            {/* Message text */}
            <div className="flex-1 flex flex-col min-w-0 w-full">
              {hasProducts ? (
                <p
                  className="text-[18px] leading-[30px] text-[#000000]"
                  style={{ fontFamily: "Verdana, sans-serif" }}
                >
                  {type === "delete"
                    ? t(
                        "productLibrary.usageWarning.usedInDelete",
                        "This {{itemName}} is currently used in these products. Deleting it will mark these products as incomplete.",
                        { itemName },
                      )
                    : t(
                        "productLibrary.usageWarning.usedInDisable",
                        "This {{itemName}} is currently used in these products. Disabling it will mark these products as incomplete.",
                        { itemName },
                      )}
                </p>
              ) : (
                <p
                  className="text-[18px] leading-[30px] text-[#000000]"
                  style={{ fontFamily: "Verdana, sans-serif" }}
                >
                  {type === "delete"
                    ? t("productLibrary.usageWarning.areYouSureDelete", "Are you sure you want to delete")
                    : t("productLibrary.usageWarning.areYouSureDeactivate", "Are you sure you want to deactivate")}{" "}
                  <strong>{itemName}</strong>?
                </p>
              )}

              {/* Show products link */}
              {hasProducts && (
                <button
                  type="button"
                  data-testid="usage-warning-toggle-products"
                  aria-expanded={showProducts}
                  className="text-[#1162A8] text-[16px] leading-[22px] tracking-[-0.02em] font-medium hover:underline mt-[8px] text-left"
                  style={{ fontFamily: "Verdana, sans-serif" }}
                  onClick={() => setShowProducts(!showProducts)}
                >
                  {showProducts
                    ? t("productLibrary.usageWarning.hideProducts", "Hide products")
                    : t("productLibrary.usageWarning.showProducts", "Show products")}
                </button>
              )}

              {/* Product list: name, linking to the product */}
              {showProducts && hasProducts && (
                <ul
                  data-testid="usage-warning-product-list"
                  className="mt-[8px] max-h-[160px] overflow-y-auto space-y-1 text-[14px] text-[#000000] bg-gray-50 rounded-[6px] p-3"
                  style={{ fontFamily: "Verdana, sans-serif" }}
                >
                  {products.map((product) => (
                    <li key={product.id} className="truncate">
                      {productHref ? (
                        <a
                          href={productHref(product.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1162A8] hover:underline"
                        >
                          {product.name}
                        </a>
                      ) : (
                        product.name
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Buttons row */}
          <div className="flex flex-row justify-center items-center gap-[10px] mt-[8px] px-4 w-full sm:w-auto">
            {/* Cancel button */}
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex flex-row justify-center items-center px-[16px] py-[12px] gap-[10px] flex-1 sm:flex-none sm:w-[194px] h-[48px] border-2 border-[#9BA5B7] rounded-[6px] bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <span
                className="text-[16px] leading-[22px] tracking-[-0.02em] text-[#9BA5B7]"
                style={{ fontFamily: "Verdana, sans-serif" }}
              >
                {t("Cancel", "Cancel")}
              </span>
            </button>

            {/* Continue anyway button */}
            <button
              type="button"
              data-testid="usage-warning-continue"
              onClick={() => void handleConfirm()}
              disabled={isLoading}
              className="flex flex-row justify-center items-center px-[16px] py-[12px] gap-[10px] flex-1 sm:flex-none sm:w-[194px] h-[48px] bg-[#CF0202] rounded-[6px] hover:bg-[#B91C1C] transition-colors disabled:opacity-50"
            >
              <span
                className="text-[16px] leading-[22px] tracking-[-0.02em] text-white"
                style={{ fontFamily: "Verdana, sans-serif" }}
              >
                {isLoading
                  ? t("productLibrary.usageWarning.processing", "Processing...")
                  : t("productLibrary.usageWarning.continueAnyway", "Continue anyway")}
              </span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
