"use client"

import { useTranslation } from "react-i18next"

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  checked: "bg-blue-50 text-[#1162A8] border-blue-200",
  billed: "bg-indigo-50 text-indigo-800 border-indigo-200",
  paid: "bg-green-50 text-[#119933] border-green-200",
  overdue: "bg-red-50 text-[#CF0202] border-red-200",
}

export function ProductInvoiceStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const key = (status ?? "").toLowerCase()
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[key] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}
      data-testid="product-invoice-status"
      data-status={key}
    >
      {t(`productInvoicing.status.${key}`, { defaultValue: status })}
    </span>
  )
}
