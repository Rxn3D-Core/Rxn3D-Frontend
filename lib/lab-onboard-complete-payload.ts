import type { BusinessHour, CaseSchedulePayload, CaseScheduleSettings } from "@/types/business-settings"

/** Request body for `POST /v1/labs/onboard-complete` (see LAB_COMPLETE_ONBOARDING_API.md). */
export interface LabOnboardCompleteBody {
  customer_id: number
  customer_type: "lab"
  office_invitations?: { name: string; email: string }[]
  business_hours: BusinessHour[]
  case_schedule: CaseSchedulePayload
  clone_full_global_catalog?: boolean
}

/**
 * Builds payload from business-settings state (same rules as submitBusinessSettings for lab).
 */
export function buildLabOnboardCompleteBody(
  customerId: number,
  officeInvitations: { name: string; email: string }[],
  workingDays: Record<string, boolean>,
  businessHours: Record<string, { fromTime: string; toTime: string }>,
  caseSchedule: CaseScheduleSettings,
): LabOnboardCompleteBody {
  const business_hours: BusinessHour[] = Object.entries(workingDays).map(([day, isOpen]) => {
    const dayHours = businessHours[day]
    if (isOpen && dayHours) {
      return {
        day,
        is_open: true,
        open_time: dayHours.fromTime,
        close_time: dayHours.toTime,
      }
    }
    return { day, is_open: false }
  })

  const case_schedule: CaseSchedulePayload = {
    default_pickup_time: caseSchedule.defaultPickupTime,
    default_delivery_time: caseSchedule.defaultDeliveryTime,
    enable_rush_cases: caseSchedule.enableRush,
    rush_type: caseSchedule.turnaroundType,
  }
  if (caseSchedule.turnaroundType === "fixed") {
    case_schedule.fixed_turnaround_days = caseSchedule.fixedTurnaroundDays
    case_schedule.fixed_rush_fee_percentage = caseSchedule.fixedRushFeePercent
  }

  return {
    customer_id: customerId,
    customer_type: "lab",
    ...(officeInvitations.length > 0 ? { office_invitations: officeInvitations } : {}),
    business_hours,
    case_schedule,
    clone_full_global_catalog: true,
  }
}
