import { apiClient } from "@/lib/api/client"
import { normalizeInvoicingMode } from "@/lib/product-invoicing"
import type { InvoicingMode, InvoicingSettings } from "@/types/product-invoicing"

/** RXN-90. The lab is the caller's active profile (`lab.side` middleware), never a request field. */
function toSettings(data: Partial<InvoicingSettings> | null | undefined): InvoicingSettings {
  return {
    invoicing_mode: normalizeInvoicingMode(data?.invoicing_mode),
    options: data?.options ?? ["stage", "product"],
    can_edit: data?.can_edit === true,
    applies_to: data?.applies_to ?? "new_cases",
    updated_at: data?.updated_at ?? null,
    updated_by: data?.updated_by ?? null,
  }
}

/** GET /v1/slip-settings/invoicing */
export async function getInvoicingSettings(): Promise<InvoicingSettings> {
  const response = await apiClient.get<InvoicingSettings>("/slip-settings/invoicing")
  return toSettings(response.data)
}

/** PUT /v1/slip-settings/invoicing (lab admins only; the API answers 403 for anyone else). */
export async function saveInvoicingSettings(mode: InvoicingMode): Promise<InvoicingSettings> {
  const response = await apiClient.put<InvoicingSettings>("/slip-settings/invoicing", { invoicing_mode: mode })
  return toSettings(response.data)
}
