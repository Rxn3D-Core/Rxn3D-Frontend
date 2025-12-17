import { ApiService } from './api-service'

export interface OnboardingStatus {
  id: number
  name: string
  type: 'lab' | 'office'
  status: string
  onboarding_completed: boolean
  onboarding_completed_at: string | null
  onboarding_completed_by: number | null
  business_hours_setup_completed: boolean
  business_hours_setup_completed_at: string | null
  business_hours_setup_completed_by: number | null
}

export interface OnboardingStatusResponse {
  message: string
  data: OnboardingStatus
}

export interface BusinessHoursSetupStatusResponse {
  message: string
  data: {
    id: number
    name: string
    type: 'lab' | 'office'
    business_hours_setup_completed: boolean
    business_hours_setup_completed_at: string | null
    business_hours_setup_completed_by: number | null
  }
}

export class OnboardingApiService {
  /**
   * Get onboarding status for a customer
   */
  static async getOnboardingStatus(customerId: number): Promise<OnboardingStatusResponse> {
    return ApiService.get<OnboardingStatusResponse>(`/business-hours/setup-status/${customerId}`)
  }

  /**
   * Mark business hours setup as completed
   */
  static async markBusinessHoursSetupCompleted(customerId: number): Promise<BusinessHoursSetupStatusResponse> {
    return ApiService.post<BusinessHoursSetupStatusResponse>('/business-hours/setup-completed', {
      customer_id: customerId
    })
  }

  /**
   * Check if onboarding is complete for a customer
   * This combines both onboarding completion and business hours setup
   */
  static async isOnboardingComplete(customerId: number): Promise<boolean> {
    try {
      const response = await this.getOnboardingStatus(customerId)
      return response.data.onboarding_completed && response.data.business_hours_setup_completed
    } catch (error) {
      console.error('Error checking onboarding status:', error)
      return false
    }
  }
}
