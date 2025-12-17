"use client"

import { useOnboardingStatus } from "@/hooks/use-onboarding-status"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, AlertCircle } from "lucide-react"

export function OnboardingStatusDisplay() {
  const { onboardingStatus, isOnboardingComplete, isLoading, error } = useOnboardingStatus()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 animate-spin" />
            <span>Loading onboarding status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>Error: {error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!onboardingStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-gray-500">
            <AlertCircle className="h-4 w-4" />
            <span>No onboarding data available</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding Status</CardTitle>
        <CardDescription>
          Current onboarding progress for {onboardingStatus.name} ({onboardingStatus.type})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {onboardingStatus.onboarding_completed ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <Clock className="h-5 w-5 text-yellow-600" />
            )}
            <span className="font-medium">Initial Onboarding</span>
          </div>
          <Badge variant={onboardingStatus.onboarding_completed ? "default" : "secondary"}>
            {onboardingStatus.onboarding_completed ? "Completed" : "Pending"}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {onboardingStatus.business_hours_setup_completed ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <Clock className="h-5 w-5 text-yellow-600" />
            )}
            <span className="font-medium">Business Hours Setup</span>
          </div>
          <Badge variant={onboardingStatus.business_hours_setup_completed ? "default" : "secondary"}>
            {onboardingStatus.business_hours_setup_completed ? "Completed" : "Pending"}
          </Badge>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="font-medium">Overall Status</span>
            <Badge variant={isOnboardingComplete ? "default" : "destructive"}>
              {isOnboardingComplete ? "Complete" : "Incomplete"}
            </Badge>
          </div>
        </div>

        {onboardingStatus.onboarding_completed_at && (
          <div className="text-sm text-gray-500">
            Onboarding completed: {new Date(onboardingStatus.onboarding_completed_at).toLocaleDateString()}
          </div>
        )}

        {onboardingStatus.business_hours_setup_completed_at && (
          <div className="text-sm text-gray-500">
            Business hours setup completed: {new Date(onboardingStatus.business_hours_setup_completed_at).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
