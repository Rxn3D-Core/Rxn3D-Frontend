import { buildVirtualSlipPath } from "@/lib/virtual-slip-routes"
import type { SlipActivityEvent } from "@/types/slip-activity"

export interface SlipActivityRow {
  id: number
  actionAt: string
  /** ISO 8601, or "" when the backend does not send it. */
  slipCreatedAt: string
  slipNumber: string
  slipHref: string
  /** Blank when absent. */
  patientName: string
  /** Blank when absent. */
  officeName: string
  /** Short office code for the table; blank when the office has none. */
  officeCode: string
  fromStatus: string
  toStatus: string
  /** Blank when the actor no longer resolves. */
  userName: string
  /** Digital impression names joined by ", "; blank when none or absent (older backend). */
  digitalImpressions: string
  /** Short tags for the table, one per impression; falls back to the names on an older backend. */
  digitalImpressionTags: string[]
  /** Full names, same order as the tags when the backend sends codes. */
  digitalImpressionNames: string[]
}

export function toSlipActivityRow(event: SlipActivityEvent): SlipActivityRow {
  return {
    id: event.id,
    actionAt: event.action_at,
    slipCreatedAt: event.slip_created_at ?? "",
    slipNumber: event.slip.slip_number,
    slipHref: buildVirtualSlipPath(event.slip.case_id, event.slip.id),
    patientName: event.patient_name?.trim() ?? "",
    officeName: event.office?.name?.trim() ?? "",
    officeCode: event.office?.code?.trim() ?? "",
    fromStatus: event.from_status.name,
    toStatus: event.to_status.name,
    userName: event.actor?.name?.trim() ?? "",
    digitalImpressions: Array.isArray(event.digital_impressions)
      ? event.digital_impressions.filter((name) => typeof name === "string" && name.trim() !== "").join(", ")
      : "",
    digitalImpressionNames: cleanList(event.digital_impressions),
    digitalImpressionTags: cleanList(event.digital_impression_codes).length
      ? cleanList(event.digital_impression_codes)
      : cleanList(event.digital_impressions),
  }
}

function cleanList(list: unknown): string[] {
  return Array.isArray(list) ? list.filter((v): v is string => typeof v === "string" && v.trim() !== "") : []
}
