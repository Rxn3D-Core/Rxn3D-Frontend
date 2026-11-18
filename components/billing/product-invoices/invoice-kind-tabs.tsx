"use client"

import { useTranslation } from "react-i18next"

export type ChargeInvoiceKind = "stage" | "product"

/** RXN-90: switches Charge Management between stage (slip) invoices and product invoices. */
export function InvoiceKindTabs({ value, onChange }: { value: ChargeInvoiceKind; onChange: (kind: ChargeInvoiceKind) => void }) {
  const { t } = useTranslation()
  const kinds: ChargeInvoiceKind[] = ["stage", "product"]
  return (
    <div
      role="tablist"
      aria-label={t("productInvoicing.kindTabs.label")}
      className="mb-4 inline-flex rounded-lg border-[1.5px] border-gray-200 bg-gray-50 p-1"
      data-testid="charge-invoice-kind-tabs"
    >
      {kinds.map((kind) => {
        const active = value === kind
        return (
          <button
            key={kind}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(kind)}
            data-testid={`charge-invoice-kind-${kind}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
              active ? "bg-[#1162A8] text-white shadow-sm" : "text-gray-600 hover:bg-white hover:text-gray-900"
            }`}
          >
            {t(`productInvoicing.kindTabs.${kind}`)}
          </button>
        )
      })}
    </div>
  )
}
