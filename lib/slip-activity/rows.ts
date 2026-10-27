import { buildVirtualSlipPath } from "@/lib/virtual-slip-routes"
import type { SlipActivityEvent } from "@/types/slip-activity"

export interface SlipActivityRow {
  id: number
  actionAt: string
  slipNumber: string
  slipHref: string
  /** Blank when absent. */
  patientName: string
  /** Blank when absent. */
  officeName: string
  fromStatus: string
  toStatus: string
  /** Blank when the actor no longer resolves. */
  userName: string
}

export function toSlipActivityRow(event: SlipActivityEvent): SlipActivityRow {
  return {
    id: event.id,
    actionAt: event.action_at,
    slipNumber: event.slip.slip_number,
    slipHref: buildVirtualSlipPath(event.slip.case_id, event.slip.id),
    patientName: event.patient_name?.trim() ?? "",
    officeName: event.office?.name?.trim() ?? "",
    fromStatus: event.from_status.name,
    toStatus: event.to_status.name,
    userName: event.actor?.name?.trim() ?? "",
  }
}
