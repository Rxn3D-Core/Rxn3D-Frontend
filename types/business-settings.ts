export interface BusinessHour {
    id?: number
    customer_id?: number
    customer_type?: string
    day: string
    is_open: boolean
    open_time?: string
    close_time?: string
    created_at?: string
    updated_at?: string
  }
  
  export interface CaseSchedulePayload {
    default_pickup_time: string
    default_delivery_time: string
    enable_rush_cases: boolean
    rush_type: "fixed" | "flexible"
    fixed_turnaround_days?: number
    fixed_rush_fee_percentage?: number
  }
  
  export interface BusinessSettingsPayload {
    customer_id: number
    customer_type: string
    business_hours: BusinessHour[]
    case_schedule?: CaseSchedulePayload
  }
  
  export interface BusinessSettingsResponse {
    message: string
    data: {
      business_hours: BusinessHour[]
      case_schedule: CaseSchedulePayload | null
    }
  }
  
  export interface CaseScheduleSettings {
    defaultPickupTime: string
    defaultDeliveryTime: string
    enableRush: boolean
    turnaroundType: "fixed" | "flexible"
    rushFeeType: "fixed" | "flexible"
    fixedTurnaroundDays: number
    fixedRushFeePercent: number
  }
  