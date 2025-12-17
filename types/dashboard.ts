export interface DashboardStats {
  totalRevenue: number
  revenueChange: number
  newCases: number
  casesChange: number
  averageCaseValue: number
  averageCaseValueChange: number
  onTimeDelivery: number
  onTimeDeliveryChange: number
}

export interface RevenueData {
  months: string[]
  revenue: number[]
}

export interface SalesData {
  channels: string[]
  sales: number[]
}

export interface AnalyticsData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string[]
    borderColor?: string
    fill?: boolean
  }[]
}
