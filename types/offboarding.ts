/** Contract: Linear RXN-48 comment "Contract (2/3)". Envelope: { success, message, data }. */

export type OffboardingBlocker = "last_admin" | "no_eligible_target" | "already_offboarded"

export interface OffboardingSlip {
  slip_id: number
  slip_number: string
  status: string
  location: string | null
}

export interface OffboardingTransferableCase {
  case_id: number
  case_number: string
  patient_name: string | null
  lab: { id: number; name: string } | null
  slips: OffboardingSlip[]
}

export interface OffboardingStayingCase {
  case_id: number
  case_number: string
  patient_name: string | null
  reason: "late_stage" | "mixed"
  slips: OffboardingSlip[]
}

export interface OffboardingTarget {
  user_id: number
  name: string
  role: string
}

export interface OffboardingPreview {
  customer: { id: number; name: string; type: "office" | "lab" | string }
  member: { user_id: number; name: string; role: string; membership_status: string }
  is_self: boolean
  requires_transfer: boolean
  can_offboard: boolean
  blockers: OffboardingBlocker[]
  transferable_cases: OffboardingTransferableCase[]
  staying_cases: OffboardingStayingCase[]
  staying_counts: { late_stage: number; mixed: number; closed: number }
  eligible_targets: OffboardingTarget[]
}

export interface OffboardPayload {
  default_target_doctor_id?: number
  transfers?: Array<{ case_id: number; target_doctor_id: number }>
  reason?: string
}

export interface OffboardResult {
  customer_id: number
  user_id: number
  membership_status: string
  offboarded_at: string
  offboarded_by: number
  transferred: Array<{ case_id: number; case_number: string; from_doctor_id: number; to_doctor_id: number }>
  staying_counts: { late_stage: number; mixed: number; closed: number }
}
