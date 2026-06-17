import { useQuery } from '@tanstack/react-query'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

interface DashboardKpi {
  total_revenue: number
  revenue_change_pct: number
  outstanding_balance: number
  balance_change_pct: number
  total_cases: number
  cases_change_pct: number
  on_time_delivery_rate: number
  delivery_change_pct: number
}

interface DashboardStatus {
  rush_cases: number
  on_hold_cases: number
  due_today: number
  new_stage_notes: number
  late_cases: number
}

export interface DashboardStats {
  kpi: DashboardKpi
  status: DashboardStatus
}

async function fetchDashboardStats(labId: number): Promise<DashboardStats> {
  const token = localStorage.getItem('token')
  if (!token) throw new Error('No authentication token found')

  const response = await fetch(`${API_BASE_URL}/dashboard/stats?lab_id=${labId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (response.status === 401) {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) throw new Error(`Failed to fetch dashboard stats: ${response.status}`)

  const json = await response.json()
  return json.data as DashboardStats
}

export function useDashboardStats(labId?: number) {
  return useQuery({
    queryKey: ['dashboard-stats', labId],
    queryFn: () => fetchDashboardStats(labId!),
    enabled: !!labId,
    staleTime: 5 * 60 * 1000,
  })
}
